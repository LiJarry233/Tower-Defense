import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { camera, bullets } from "./main";
import { Bullet } from "./bullet";
import { PLAYER_BASE_DAMAGE, PLAYER_BASE_COOLDOWN } from "./config";

export class Player {
  model = new THREE.Group();
  private cooldown = 0;
  private raycaster = new THREE.Raycaster();
  private groundY = 0;
  private shootDir = new THREE.Vector3();
  private mixer: THREE.AnimationMixer | null = null;

  constructor() {
    const loader = new FBXLoader();
    loader.load("/models/character/Gunplay.fbx", (fbx) => {
      fbx.scale.set(5, 5, 5);
      fbx.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          m.castShadow = true;
        }
      });

      // 动画
      this.mixer = new THREE.AnimationMixer(fbx);
      if (fbx.animations.length > 0) {
        const action = this.mixer.clipAction(fbx.animations[0]);
        action.play();
        console.log("Player anim playing:", fbx.animations[0].name, "duration:", fbx.animations[0].duration);
      } else {
        console.log("Player model loaded (no animations)");
      }

      this.model.add(fbx);
      console.log("Player model loaded");
    }, undefined, (err) => {
      console.error("Player load error:", err);
    });
  }

  update(dt: number) {
    this.cooldown -= dt;
    if (this.mixer) this.mixer.update(dt);

    const mouse = new THREE.Vector2(
      ((window as any)._mx ?? 0) / window.innerWidth * 2 - 1,
      -((window as any)._my ?? 0) / window.innerHeight * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.groundY);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(groundPlane, hit)) return;

    const target = hit.clone();
    target.y = this.model.position.y;
    this.model.lookAt(target);
    this.shootDir.copy(hit).sub(this.model.position).normalize();
  }

  tryShoot(): boolean {
    if (this.cooldown > 0) return false;
    this.cooldown = PLAYER_BASE_COOLDOWN;
    const count = 1;
    for (let i = 0; i < count; i++) {
      let dir = this.shootDir.clone();
      if (count > 1) {
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (count - 1) * 0.5) * 0.06);
      }
      const o = this.model.position.clone().add(new THREE.Vector3(0, 1.5, 0));
      bullets.push(new Bullet(o, dir, 40, PLAYER_BASE_DAMAGE, 0xffdd00, 0xff8800));
    }
    return true;
  }
}

window.addEventListener("mousemove", (e) => {
  (window as any)._mx = e.clientX;
  (window as any)._my = e.clientY;
});
window.addEventListener("click", (e) => {
  if (e.button === 0) {
    import("./main").then((m) => m.player.tryShoot());
  }
});
