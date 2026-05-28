import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { scene } from "./main";
import { MELEE_HP, MELEE_SPEED, MELEE_DAMAGE, MELEE_ATTACK_INTERVAL, MELEE_GOLD,
         RANGED_HP, RANGED_SPEED, RANGED_DAMAGE, RANGED_ATTACK_INTERVAL, RANGED_GOLD,
         TANK_HP, TANK_SPEED, TANK_DAMAGE, TANK_ATTACK_INTERVAL, TANK_GOLD,
         BOSS_HP, BOSS_SPEED, BOSS_DAMAGE, BOSS_ATTACK_INTERVAL } from "./config";
import { Game } from "./gamestate";
import { playSound } from "./audio";

export type EnemyType = "melee" | "ranged" | "tank" | "boss";

interface TypeCfg {
  hp: number; speed: number; damage: number; cd: number; gold: number; range: number; scale: number;
  models: { walk: string; attack: string; death: string };
  movement: "stopgo" | "continuous";
  stepDist: number;
}

const CFG: Record<EnemyType, TypeCfg> = {
  melee: {
    hp: MELEE_HP, speed: MELEE_SPEED, damage: MELEE_DAMAGE, cd: MELEE_ATTACK_INTERVAL, gold: MELEE_GOLD,
    range: 5, scale: 5, movement: "stopgo", stepDist: 4.5,
    models: {
      walk: "/models/monsters/monster1/Zombie Running.fbx",
      attack: "/models/monsters/monster1/Zombie Punching.fbx",
      death: "/models/monsters/monster1/Zombie Death.fbx",
    },
  },
  ranged: {
    hp: RANGED_HP, speed: RANGED_SPEED, damage: RANGED_DAMAGE, cd: RANGED_ATTACK_INTERVAL, gold: RANGED_GOLD,
    range: 30, scale: 5, movement: "continuous", stepDist: 0,
    models: {
      walk: "/models/monsters/monster2/Walking.fbx",
      attack: "/models/monsters/monster2/Shooting Arrow.fbx",
      death: "/models/monsters/monster2/Standing React Death Backward.fbx",
    },
  },
  tank: {
    hp: TANK_HP, speed: TANK_SPEED, damage: TANK_DAMAGE, cd: TANK_ATTACK_INTERVAL, gold: TANK_GOLD,
    range: 5, scale: 0.05, movement: "stopgo", stepDist: 3,
    models: {
      walk: "/models/monsters/monster3/Walking.fbx",
      attack: "/models/monsters/monster3/Attack.fbx",
      death: "/models/monsters/monster3/Death.fbx",
    },
  },
  boss: {
    hp: BOSS_HP, speed: BOSS_SPEED, damage: BOSS_DAMAGE, cd: BOSS_ATTACK_INTERVAL, gold: 0,
    range: 30, scale: 10, movement: "continuous", stepDist: 0,
    models: {
      walk: "/models/Boss/Run Forward.fbx",
      attack: "/models/Boss/Magic Attack.fbx",
      death: "/models/Boss/Falling Forward Death.fbx",
    },
  },
};

const cache = new Map<string, { group: THREE.Group; clips: THREE.AnimationClip[] }>();
const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();

function loadOne(path: string, cb: (group: THREE.Group) => void) {
  if (cache.has(path)) {
    const c = cache.get(path)!;
    const clone = cloneSkinned(c.group) as THREE.Group;
    clone.animations = c.clips;
    cb(clone);
    return;
  }
  const onLoad = (g: THREE.Group) => {
    cache.set(path, { group: g, clips: g.animations.slice() });
    const clone = cloneSkinned(g) as THREE.Group;
    clone.animations = g.animations;
    cb(clone);
  };
  if (path.endsWith(".glb")) { gltfLoader.load(path, (gltf) => onLoad(gltf.scene)); }
  else { fbxLoader.load(path, onLoad); }
}

export class Enemy {
  model = new THREE.Group();
  cfg: TypeCfg;
  hp: number; speed: number; damage: number; cd: number; gold: number; range: number;
  dead = false;
  private attackTimer = 0;
  private wallTarget = new THREE.Vector3(0, 8, -30);
  private models: Record<string, THREE.Group | null> = { walk: null, attack: null, death: null };
  private mixers: Record<string, THREE.AnimationMixer | null> = { walk: null, attack: null, death: null };
  private actions: Record<string, THREE.AnimationAction | null> = { walk: null, attack: null, death: null };
  private state: "walk" | "attack" | "dead" = "walk";
  private prevAnimTime = 0;

  constructor(type: EnemyType, pos: THREE.Vector3) {
    this.cfg = CFG[type];
    this.hp = this.cfg.hp; this.speed = this.cfg.speed; this.damage = this.cfg.damage;
    this.cd = this.cfg.cd; this.gold = this.cfg.gold; this.range = this.cfg.range;
    this.model.position.copy(pos);
    this.model.scale.setScalar(this.cfg.scale);
    this.model.visible = false;
    this.model.lookAt(this.wallTarget);

    const keys = ["walk", "attack", "death"] as const;
    let loaded = 0;
    for (const key of keys) {
      loadOne(this.cfg.models[key], (g) => {
        g.visible = false;
        this.model.add(g);
        this.models[key] = g;
        const mixer = new THREE.AnimationMixer(g);
        this.mixers[key] = mixer;
        if (g.animations.length > 0) {
          const action = mixer.clipAction(g.animations[0]);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
          this.actions[key] = action;
        }
        loaded++;
        if (loaded === 3) { this._switchTo("walk"); this.model.visible = true; }
      });
    }
    scene.add(this.model);
  }

  private _switchTo(key: string) {
    this.state = key as typeof this.state;
    for (const k of ["walk", "attack", "death"]) {
      const m = this.models[k];
      if (m) m.visible = (k === key);
      const action = this.actions[k];
      if (action) { if (k === key) { action.reset().play(); } else { action.stop(); } }
    }
    this.prevAnimTime = 0;
  }

  update(dt: number) {
    const active = this.mixers[this.state];
    if (active) active.update(dt);
    if (this.dead) return;

    const dist = this.model.position.distanceTo(this.wallTarget);

    if (dist > this.range) {
      if (this.state !== "walk") this._switchTo("walk");
      if (this.cfg.movement === "stopgo") {
        const action = this.actions["walk"];
        if (action) {
          const t = action.time;
          if (t < this.prevAnimTime) {
            const dir = this.wallTarget.clone().sub(this.model.position).normalize();
            dir.y = 0;
            this.model.position.addScaledVector(dir, this.cfg.stepDist);
            this.model.lookAt(this.wallTarget);
          }
          this.prevAnimTime = t;
        }
      } else {
        const dir = this.wallTarget.clone().sub(this.model.position).normalize();
        dir.y = 0;
        this.model.position.addScaledVector(dir, this.speed * dt);
        if (dir.length() > 0.01) this.model.lookAt(this.model.position.clone().add(dir));
      }
    } else {
      if (this.state !== "attack") this._switchTo("attack");
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = this.cfg.cd;
        Game.wallHP -= this.damage;
        if (Game.wallHP <= 0) { Game.wallHP = 0; Game.state = "defeat"; }
        const sound = (this.cfg.movement === "continuous" && this.cfg.range > 5) ? "far_attatchment" : "attatchment";
        playSound(sound, false, 0.3);
      }
    }
  }

  takeDamage(dmg: number) {
    this.hp -= dmg;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      Game.gold += this.gold;
      Game.kills++;
      playSound("normaldeath", false, 0.3);
      this._switchTo("death");
      setTimeout(() => this.dispose(), 800);
    }
  }

  dispose() {
    scene.remove(this.model);
    this.model.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        (c as THREE.Mesh).geometry.dispose();
        ((c as THREE.Mesh).material as THREE.Material).dispose();
      }
    });
  }
}
