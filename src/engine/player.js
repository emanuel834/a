import * as THREE from 'three';
import { moveAABB, GRAVITY } from './physics.js';

const SIZE = { w: 0.6, h: 1.7 };
const EYE = 1.58;
const WALK = 4.4;
const RUN = 7.2;

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.pos = new THREE.Vector3(2, 2, 2); // pés
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;

    this.maxHp = 100;
    this.hp = 100;
    this.stamina = 100;
    this.sanity = 100;
    this.blocks = 0;
    this.water = 1;
    this.invuln = 0; // i-frames após dano
  }

  eyePos() {
    return new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z);
  }

  lookDir() {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      -Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
  }

  update(dt, input) {
    const look = input.consumeLook();
    this.yaw -= look.x;
    this.pitch = Math.max(-1.53, Math.min(1.53, this.pitch + look.y));

    // direção no plano a partir do yaw
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let mx = input.move.x, mz = input.move.z;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }

    const wantsRun = input.run && this.stamina > 0 && mz > 0.1;
    const speed = wantsRun ? RUN : WALK;
    if (wantsRun) this.stamina = Math.max(0, this.stamina - 22 * dt);
    else this.stamina = Math.min(100, this.stamina + 14 * dt);

    // frente = -z local
    const fx = -sin, fz = -cos;
    const rx = cos, rz = -sin;
    const tx = (fx * mz + rx * mx) * speed;
    const tz = (fz * mz + rz * mx) * speed;

    // aceleração horizontal com um pouco de inércia
    const accel = this.onGround ? 40 : 12;
    this.vel.x += (tx - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (tz - this.vel.z) * Math.min(1, accel * dt);

    if (input.jumpPressed && this.onGround) {
      this.vel.y = 7.6;
      this.onGround = false;
    }
    this.vel.y -= GRAVITY * dt;
    if (this.vel.y < -30) this.vel.y = -30;

    const res = moveAABB(this.world, this.pos, this.vel, dt, SIZE);
    this.onGround = res.onGround;

    if (this.invuln > 0) this.invuln -= dt;

    // câmera
    this.camera.position.set(this.pos.x, this.pos.y + EYE, this.pos.z);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(-this.pitch);
  }

  applyDamage(n, fromX, fromZ) {
    if (this.invuln > 0) return false;
    this.hp = Math.max(0, this.hp - n);
    this.invuln = 0.5;
    // knockback para longe do agressor
    if (fromX !== undefined) {
      const dx = this.pos.x - fromX, dz = this.pos.z - fromZ;
      const d = Math.hypot(dx, dz) || 1;
      this.vel.x += (dx / d) * 6;
      this.vel.z += (dz / d) * 6;
      this.vel.y += 2.5;
    }
    return true;
  }

  teleport(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
  }
}
