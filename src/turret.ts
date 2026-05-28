import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { scene } from "./main";
import { Bullet } from "./bullet";
import { NORMAL_TURRET_DAMAGE, NORMAL_TURRET_CD, AOE_TURRET_DAMAGE, AOE_TURRET_CD } from "./config";

const gltfLoader = new GLTFLoader();

export type TurretType = 0 | 1;
const MODELS: Record<TurretType, string> = {
  0: "/models/towers/tower1/tower1.1.glb",
  1: "/models/towers/tower2/tower2.glb",
};

export class Turret {
  model = new THREE.Group();
  type: TurretType;
  private cooldown = 0;
  private targetPos = new THREE.Vector3();
  private built = false;

  constructor(type: TurretType, pos: THREE.Vector3) {
    this.type = type;
    this.model.position.copy(pos);

    // 加载模型
    gltfLoader.load(MODELS[type], (gltf) => {
      gltf.scene.scale.setScalar(1.5);
      gltf.scene.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) { (c as THREE.Mesh).castShadow = true; (c as THREE.Mesh).receiveShadow = true; }
      });
      this.model.add(gltf.scene);
      this.built = true;
    });

    scene.add(this.model);
  }

  update(dt: number, enemies: import("./enemy").Enemy[]) {
    if (!this.built) return;
    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    let nearest: import("./enemy").Enemy | null = null;
    let nearestDist = 60;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = this.model.position.distanceTo(e.model.position);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }
    if (!nearest) return;

    this.targetPos.copy(nearest.model.position);
    this.targetPos.y = this.model.position.y;
    this.model.lookAt(this.targetPos);

    const cd = this.type === 0 ? NORMAL_TURRET_CD : AOE_TURRET_CD;
    const dmg = this.type === 0 ? NORMAL_TURRET_DAMAGE : AOE_TURRET_DAMAGE;
    this.cooldown = cd;

    const dir = nearest.model.position.clone().sub(this.model.position).normalize();
    const origin = this.model.position.clone().add(new THREE.Vector3(0, 2, 0));
    const isAOE = this.type === 1;
    import("./main").then((m) => {
      m.bullets.push(new Bullet(origin, dir, 50, dmg, isAOE ? 0xff6600 : 0x00ccff, isAOE ? 0xff3300 : 0x004488, isAOE));
    });
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
