import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Player } from "./player";
import { Hud, MainMenu, ArchiveScreen, LevelSelect, PauseOverlay, ResultOverlay, TurretShop } from "./ui";
import { Enemy, EnemyType } from "./enemy";
import { Turret, TurretType } from "./turret";
import { Game } from "./gamestate";
import { LEVELS } from "./config";
import { spawnHitSpark, spawnExplosion } from "./vfx";
import { saveGame, loadGame } from "./save";
import { WALL_MAX_HP } from "./config";
import { preloadSounds, playSound, startBGM } from "./audio";

// ── Renderer ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

// ── Scene ──
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x332211);
scene.fog = new THREE.Fog(0x332211, 100, 400);

// ── Camera ──
export const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 600);
camera.position.set(0, 22, -55);
camera.lookAt(0, 12, 30);

// ── Lights ──
scene.add(new THREE.AmbientLight(0x665544, 0.4));
const sun = new THREE.DirectionalLight(0xffe8cc, 1.2);
sun.position.set(40, 60, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
scene.add(sun);

// ── Ground ──
const groundGeo = new THREE.PlaneGeometry(600, 600);
const groundTex = new THREE.TextureLoader().load("/ground-unity/windswept-wasteland_albedo.png");
groundTex.wrapS = THREE.RepeatWrapping;
groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(30, 30);
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Wall ──
const wallGroup = new THREE.Group();
wallGroup.position.set(0, 8, -30);
scene.add(wallGroup);

const gltfLoader = new GLTFLoader();
gltfLoader.load("/models/wall.glb", (gltf) => {
  gltf.scene.scale.set(40, 40, 40);
  gltf.scene.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const m = c as THREE.Mesh;
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  wallGroup.add(gltf.scene);
  console.log("Wall loaded");
});

// ── Turret Markers (white glow dots) ──
const markerGeo = new THREE.SphereGeometry(0.6, 16, 16);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const markerPositions = [new THREE.Vector3(-12, 12, -30), new THREE.Vector3(12, 12, -30)];
const markerMeshes: THREE.Mesh[] = [];
const turretSlots: (Turret | null)[] = [null, null];

markerPositions.forEach((p) => {
  const m = new THREE.Mesh(markerGeo, markerMat);
  m.position.copy(p);
  m.userData.isMarker = true;
  m.userData.slotIndex = markerMeshes.length;
  scene.add(m);
  markerMeshes.push(m);
});

let shopTarget: { slotIndex: number; pos: THREE.Vector3 } | null = null;

function placeTurret(slot: number, pos: THREE.Vector3, type: TurretType) {
  if (turretSlots[slot]) turretSlots[slot]!.dispose();
  turretSlots[slot] = new Turret(type, pos.clone());
  markerMeshes[slot].visible = false;
}

const turretShop = new TurretShop(
  () => {
    if (Game.gold < 500 || !shopTarget) return;
    Game.gold -= 500;
    playSound("equipment", false, 0.5);
    placeTurret(shopTarget.slotIndex, shopTarget.pos, 0);
    turretShop.hide(); Game.state = "playing"; shopTarget = null;
  },
  () => {
    if (Game.gold < 1000 || !shopTarget) return;
    Game.gold -= 1000;
    playSound("equipment", false, 0.5);
    placeTurret(shopTarget.slotIndex, shopTarget.pos, 1);
    turretShop.hide(); Game.state = "playing"; shopTarget = null;
  },
  () => { turretShop.hide(); Game.state = "playing"; shopTarget = null; },
);

const turretRaycaster = new THREE.Raycaster();
window.addEventListener("click", (e) => {
  if (e.button !== 0 || Game.state !== "playing") return;
  const mouse = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1,
  );
  turretRaycaster.setFromCamera(mouse, camera);
  const hits = turretRaycaster.intersectObjects(markerMeshes);
  if (hits.length > 0) {
    const obj = hits[0].object;
    if (obj.userData.isMarker) {
      shopTarget = { slotIndex: obj.userData.slotIndex, pos: obj.position.clone() };
      Game.state = "paused";
      turretShop.show();
    }
  }
});

// ── Player ──
export const player = new Player();
player.model.position.set(0, 12, -28);
scene.add(player.model);

// ── UI State Machine ──
export const hud = new Hud();
let activeSlot = 0;

// Screens
const mainMenu = new MainMenu(() => {
  mainMenu.hide();
  archive.show();
});

const archive = new ArchiveScreen();
archive.onSelect = (slot: number) => {
  activeSlot = slot;
  const data = loadGame(slot);
  if (data) {
    Game.gold = data.gold;
    Game.level = data.level;
  } else {
    Game.gold = 1500;
    Game.level = 1;
  }
  archive.hide();
  levelSelect.show();
};
archive.onBack = () => {
  archive.hide();
  mainMenu.show();
};

const levelSelect = new LevelSelect();
levelSelect.onLevel = (level: number) => {
  Game.level = level;
  levelSelect.hide();
  startWave(level, false);
  Game.state = "playing";
};
levelSelect.onBack = () => {
  levelSelect.hide();
  archive.show();
};

let pauseOverlay: PauseOverlay | null = null;
function showPause() {
  if (!pauseOverlay) {
    pauseOverlay = new PauseOverlay(
      () => { pauseOverlay!.hide(); Game.state = "playing"; },
      () => {
        pauseOverlay!.hide();
        clearEnemies();
        levelSelect.show();
      },
    );
  }
  pauseOverlay.show();
  Game.state = "paused";
}

let resultOverlay: ResultOverlay | null = null;
function showResult() {
  if (!resultOverlay) {
    resultOverlay = new ResultOverlay();
  }
  if (Game.state === "victory") {
    saveGame(activeSlot);
    resultOverlay.showVictory(Game.level,
      () => { // next level
        resultOverlay!.hide(); Game.level++; startWave(Game.level, false); Game.state = "playing";
      },
      () => { // exit
        resultOverlay!.hide(); clearEnemies(); levelSelect.show();
      },
    );
  } else {
    resultOverlay.showDefeat(
      () => { // retry
        resultOverlay!.hide();
        const data = loadGame(activeSlot);
        if (data) { Game.gold = data.gold; Game.wallHP = WALL_MAX_HP; }
        else Game.gold = 1500;
        enableMarkers();
        startWave(Game.level, true);
        Game.state = "playing";
      },
      () => { // exit
        resultOverlay!.hide(); clearEnemies(); levelSelect.show();
      },
    );
  }
}

// ── Bullets container ──
export const bullets: import("./bullet").Bullet[] = [];

// ── Camera Control ──
const keys: Record<string, boolean> = {};
window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

let camPivot = new THREE.Vector3(0, 12, 30);
let rightDrag = false, prevMX = 0, prevMY = 0;

window.addEventListener("mousedown", (e) => {
  if (e.button === 2) { rightDrag = true; prevMX = e.clientX; prevMY = e.clientY; }
});
window.addEventListener("mouseup", (e) => { if (e.button === 2) rightDrag = false; });
window.addEventListener("mousemove", (e) => {
  if (!rightDrag) return;
  const dx = e.clientX - prevMX, dy = e.clientY - prevMY;
  prevMX = e.clientX; prevMY = e.clientY;
  const dir = camera.position.clone().sub(camPivot);
  const r = dir.length();
  const theta = Math.atan2(dir.x, dir.z) - dx * 0.005;
  const phi = Math.max(0.1, Math.min(Math.PI * 0.45, Math.acos(dir.y / r) - dy * 0.005));
  dir.set(r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(theta));
  camera.position.copy(camPivot.clone().add(dir));
  camera.lookAt(camPivot);
});
window.addEventListener("wheel", (e) => {
  const dir = camera.position.clone().sub(camPivot);
  const dist = dir.length();
  dir.normalize().multiplyScalar(Math.max(5, Math.min(150, dist + e.deltaY * 0.25)));
  camera.position.copy(camPivot.clone().add(dir));
});
window.addEventListener("contextmenu", (e) => e.preventDefault());
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Wave Manager ──
const enemies: Enemy[] = [];
let waveRemaining: Record<string, number> = {};
let enemySpawnTimer = 0;
let spawnCount = 0;

function clearEnemies() {
  for (const e of enemies) e.dispose();
  enemies.length = 0;
}

function enableMarkers() {
  for (const m of markerMeshes) m.visible = true;
  for (let i = 0; i < turretSlots.length; i++) {
    if (turretSlots[i]) { turretSlots[i]!.dispose(); turretSlots[i] = null; }
  }
}

function startWave(level: number, reset: boolean) {
  if (reset) {
    clearEnemies();
    enableMarkers();
    spawnCount = 0;
    waveRemaining = {};
    Game.kills = 0;
    Game.wallHP = WALL_MAX_HP;
  }
  const data = LEVELS[level - 1];
  waveRemaining = {
    melee: data.melee,
    ranged: data.ranged,
    tank: data.tank,
    boss: data.boss,
  };
  Game.totalEnemies = data.melee + data.ranged + data.tank + data.boss;
  Game.kills = 0;
  spawnCount = 0;
  enemySpawnTimer = 0;
  Game.wallHP = WALL_MAX_HP;
  Game.state = "playing";
}

function spawnEnemy(type: EnemyType, x: number, z: number) {
  enemies.push(new Enemy(type, new THREE.Vector3(x, 0, z)));
  spawnCount++;
}

// ── Game Loop ──
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  // WASD
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
  const ms = 30 * dt;
  if (keys["w"] || keys["arrowup"])    { camera.position.addScaledVector(fwd, ms); camPivot.addScaledVector(fwd, ms); }
  if (keys["s"] || keys["arrowdown"])  { camera.position.addScaledVector(fwd, -ms); camPivot.addScaledVector(fwd, -ms); }
  if (keys["a"] || keys["arrowleft"])  { camera.position.addScaledVector(right, -ms); camPivot.addScaledVector(right, -ms); }
  if (keys["d"] || keys["arrowright"]) { camera.position.addScaledVector(right, ms); camPivot.addScaledVector(right, ms); }
  camera.lookAt(camPivot);

  // P pause toggle
  if (keys["p"]) {
    keys["p"] = false;
    if (Game.state === "playing") showPause();
    else if (Game.state === "paused") { pauseOverlay?.hide(); Game.state = "playing"; }
  }

  // Only update game when playing
  if (Game.state !== "playing") {
    hud.update();
    renderer.render(scene, camera);
    return;
  }

  // Player update
  player.update(dt);

  // Enemy wave spawn
  if (spawnCount < Game.totalEnemies) {
    enemySpawnTimer -= dt;
    if (enemySpawnTimer <= 0) {
      enemySpawnTimer = 1.5;
      const available: EnemyType[] = [];
      for (const key of ["melee", "ranged", "tank", "boss"] as EnemyType[]) {
        if (waveRemaining[key] > 0) available.push(key);
      }
      if (available.length > 0) {
        const t = available[Math.floor(Math.random() * available.length)];
        waveRemaining[t]--;
        spawnEnemy(t, (Math.random() - 0.5) * 60, 40 + Math.random() * 30);
      }
    }
  }

  // Turrets update
  for (const t of turretSlots) { if (t) t.update(dt, enemies); }

  // Enemies update
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update(dt);
    if (enemies[i].dead) enemies.splice(i, 1);
  }

  // Bullets update + collision
  for (let b = bullets.length - 1; b >= 0; b--) {
    bullets[b].update(dt);
    if (bullets[b].dead) { bullets.splice(b, 1); continue; }

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dist = bullets[b].mesh.position.distanceTo(enemy.model.position);
      if (dist < 5) {
        const bullet = bullets[b];
        enemy.takeDamage(bullet.damage);
        spawnHitSpark(bullet.mesh.position.clone());
        if (bullet.isAOE) {
          spawnExplosion(bullet.mesh.position.clone());
          playSound("bomb", false, 0.5);
          for (const other of enemies) {
            if (other === enemy || other.dead) continue;
            if (other.model.position.distanceTo(enemy.model.position) < 10) {
              other.takeDamage(bullet.damage * 0.6);
            }
          }
        }
        bullet.dispose();
        bullets.splice(b, 1);
        break;
      }
    }
  }

  // Victory / Defeat check
  if (Game.wallHP <= 0) { Game.state = "defeat"; showResult(); saveGame(0); }
  else if (spawnCount >= Game.totalEnemies && enemies.length === 0) { Game.state = "victory"; showResult(); saveGame(0); }

  hud.update();

  renderer.render(scene, camera);
}

// ── Upgrade UI (U key) ──
let upgradeOpen = false;
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "u" && Game.state === "playing") {
    upgradeOpen = !upgradeOpen;
    toggleUpgradeUI();
  }
});

function toggleUpgradeUI() {
  const id = "upgrade-panel";
  let panel = document.getElementById(id);
  if (upgradeOpen) {
    if (!panel) {
      panel = document.createElement("div");
      panel.id = id;
      panel.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:12px;padding:25px;z-index:20;color:#fff;font:16px monospace";
      panel.style.backgroundImage = "url(/UI/kenney_ui-pack/PNG/Grey/Default/button_rectangle_depth_flat.png)";
      panel.style.backgroundSize = "100% 100%";
      const cost = 200 + (Game.playerLevel - 1) * 300;
      panel.innerHTML = `<div style="font-size:22px;color:#ffcc44">主角升级 Lv.${Game.playerLevel}</div>
        <div style="color:#ccc">伤害: ${Game.playerDamage} +100</div>
        <div style="color:#ccc">冷却: ${Game.playerCD.toFixed(1)}s -0.1s</div>
        <div style="color:#ffcc00">费用: ${cost} 金币</div>`;
      const buyBtn = document.createElement("div");
      buyBtn.textContent = "升级";
      buyBtn.style.cssText = "width:180px;height:40px;display:flex;justify-content:center;align-items:center;font-size:18px;color:#88ff88;font-weight:bold;cursor:pointer";
      buyBtn.style.backgroundImage = "url(/UI/kenney_ui-pack/PNG/Grey/Double/button_rectangle_depth_gradient.png)";
      buyBtn.style.backgroundSize = "100% 100%";
      buyBtn.onclick = () => {
        const c = 200 + (Game.playerLevel - 1) * 300;
        if (Game.gold >= c) {
          Game.gold -= c;
          Game.playerLevel++;
          Game.playerDamage += 100;
          Game.playerCD = Math.max(0.1, Game.playerCD - 0.1);
          playSound("leve_up", false, 0.5);
          toggleUpgradeUI();
          toggleUpgradeUI(); // re-open with updated values
        }
      };
      panel.appendChild(buyBtn);
      const backBtn = document.createElement("div");
      backBtn.textContent = "返回";
      backBtn.style.cssText = "width:180px;height:35px;display:flex;justify-content:center;align-items:center;font-size:16px;color:#ff8888;cursor:pointer";
      backBtn.style.backgroundImage = "url(/UI/kenney_ui-pack/PNG/Grey/Default/button_rectangle_depth_gradient.png)";
      backBtn.style.backgroundSize = "100% 100%";
      backBtn.onclick = () => { upgradeOpen = false; toggleUpgradeUI(); };
      panel.appendChild(backBtn);
      document.body.appendChild(panel);
    } else {
      panel.style.display = "flex";
    }
  } else if (panel) {
    panel.remove();
  }
}

// Audio init on first click
let _audioInit = false;
window.addEventListener("click", () => {
  if (!_audioInit) { _audioInit = true; preloadSounds().then(() => startBGM()); }
}, { once: true });

console.log("Tower Defense — Phase 1 — Ready");
animate();
