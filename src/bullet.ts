import * as THREE from "three";
import { scene } from "./main";

export class Bullet {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  isAOE: boolean;
  dead = false;
  private life = 3.0;

  constructor(origin: THREE.Vector3, dir: THREE.Vector3, speed: number, dmg: number, color: number, emissive: number, aoe = false) {
    const geo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
    geo.rotateX(Math.PI / 2); // 横放
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 2,
      roughness: 0.3,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(origin);
    this.velocity = dir.normalize().multiplyScalar(speed);
    this.damage = dmg;
    this.isAOE = aoe;
    scene.add(this.mesh);
  }

  update(dt: number) {
    this.life -= dt;
    if (this.life <= 0) { this.dispose(); return; }
    this.mesh.position.addScaledVector(this.velocity, dt);
  }

  dispose() {
    this.dead = true;
    scene.remove(this.mesh);
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.geometry.dispose();
  }
}
