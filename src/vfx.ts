import * as THREE from "three";
import { scene } from "./main";

// 爆炸特效 — 橙色膨胀球
export function spawnExplosion(pos: THREE.Vector3) {
  const geo = new THREE.SphereGeometry(1, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  scene.add(mesh);

  const start = performance.now();
  const anim = () => {
    const elapsed = (performance.now() - start) / 1000;
    const s = 1 + elapsed * 15;
    mesh.scale.setScalar(s);
    mat.opacity = Math.max(0, 0.8 - elapsed * 1.2);
    if (elapsed > 0.8) { scene.remove(mesh); geo.dispose(); mat.dispose(); return; }
    requestAnimationFrame(anim);
  };
  anim();
}

// 命中火花 — 黄色星形粒子
export function spawnHitSpark(pos: THREE.Vector3) {
  const count = 8;
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.15, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.5) * 2;
    mesh.position.y += (Math.random() - 0.5) * 2;
    mesh.position.z += (Math.random() - 0.5) * 2;
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      Math.random() * 6,
      (Math.random() - 0.5) * 8,
    );
    scene.add(mesh);

    const start = performance.now();
    const anim = () => {
      const dt = Math.min((performance.now() - start) / 1000, 0.05);
      const elapsed = (performance.now() - start) / 1000;
      mesh.position.addScaledVector(vel, dt);
      mesh.position.y -= 3 * dt;
      if (elapsed > 0.5) { scene.remove(mesh); geo.dispose(); mat.dispose(); return; }
      requestAnimationFrame(anim);
    };
    anim();
  }
}

// 消散 — 缩放消失（用于敌人死亡）
export function spawnDissipate(model: THREE.Group, cb: () => void) {
  const orig = model.scale.clone();
  const start = performance.now();
  const anim = () => {
    const elapsed = (performance.now() - start) / 1000;
    const s = Math.max(0, 1 - elapsed / 0.6);
    model.scale.copy(orig).multiplyScalar(s);
    if (elapsed > 0.6) { cb(); return; }
    requestAnimationFrame(anim);
  };
  anim();
}
