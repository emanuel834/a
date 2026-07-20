import * as THREE from 'three';
import { moveAABB, GRAVITY } from '../engine/physics.js';
import { hasLOS } from '../engine/raycast.js';

const box = (w, h, d, color, emissive = 0x000000) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: emissive ? 1 : 0 }));

/* ----- aparência voxel de cada espécie ----- */

function buildSmiler() {
  const g = new THREE.Group();
  const body = box(0.7, 1.7, 0.7, 0x0a0a10);
  body.position.y = 0.85;
  g.add(body);
  const eyeL = box(0.14, 0.14, 0.06, 0xffffff, 0xffffff);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.16, 1.42, -0.36);
  eyeR.position.set(0.16, 1.42, -0.36);
  const smile = box(0.5, 0.09, 0.06, 0xffffff, 0xffffff);
  smile.position.set(0, 1.12, -0.36);
  const smile2 = box(0.34, 0.08, 0.06, 0xffffff, 0xffffff);
  smile2.position.set(0, 1.05, -0.37);
  g.add(eyeL, eyeR, smile, smile2);
  return g;
}

function buildHound() {
  const g = new THREE.Group();
  const body = box(0.6, 0.55, 1.3, 0x1c1418);
  body.position.set(0, 0.55, 0);
  const head = box(0.45, 0.4, 0.5, 0x241a20);
  head.position.set(0, 0.75, -0.8);
  const eyeL = box(0.09, 0.09, 0.05, 0xff3020, 0xff3020);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.12, 0.82, -1.06);
  eyeR.position.set(0.12, 0.82, -1.06);
  g.add(body, head, eyeL, eyeR);
  for (const [lx, lz] of [[-0.2, -0.45], [0.2, -0.45], [-0.2, 0.45], [0.2, 0.45]]) {
    const leg = box(0.16, 0.32, 0.16, 0x14100e);
    leg.position.set(lx, 0.16, lz);
    leg.userData.leg = true;
    g.add(leg);
  }
  return g;
}

function buildHumanoid(skin, suit, eyes) {
  const g = new THREE.Group();
  const torso = box(0.62, 0.75, 0.34, suit);
  torso.position.y = 1.05;
  const head = box(0.42, 0.42, 0.42, skin);
  head.position.y = 1.66;
  g.add(torso, head);
  if (eyes) {
    const eL = box(0.09, 0.09, 0.05, eyes, eyes);
    const eR = eL.clone();
    eL.position.set(-0.11, 1.72, -0.22);
    eR.position.set(0.11, 1.72, -0.22);
    g.add(eL, eR);
  }
  for (const s of [-1, 1]) {
    const arm = box(0.16, 0.62, 0.16, skin);
    arm.position.set(s * 0.42, 1.06, 0);
    arm.userData.arm = true;
    const legM = box(0.2, 0.68, 0.2, suit);
    legM.position.set(s * 0.16, 0.34, 0);
    legM.userData.leg = true;
    g.add(arm, legM);
  }
  return g;
}

function buildBoss() {
  const g = buildHumanoid(0x14090c, 0x1e0a10, 0xff2010);
  g.scale.set(2.1, 2.1, 2.1);
  const crown = box(0.6, 0.16, 0.6, 0x3a0a10, 0x80101a);
  crown.position.y = 1.95;
  g.add(crown);
  return g;
}

/* ----- atributos por espécie ----- */

export const ENEMY_TYPES = {
  smiler: {
    build: buildSmiler,
    hp: 4, speed: 1.5, chaseSpeed: 2.6, damage: 12,
    aggroRange: 12, attackRange: 1.5, attackCooldown: 1.1,
    size: { w: 0.6, h: 1.7 }, eyeH: 1.4, needsLOS: true,
    growl: 'smiler', score: 1,
  },
  hound: {
    build: buildHound,
    hp: 5, speed: 2.2, chaseSpeed: 5.2, damage: 9,
    aggroRange: 17, attackRange: 1.6, attackCooldown: 0.9,
    size: { w: 0.6, h: 0.9 }, eyeH: 0.7, needsLOS: false,
    growl: 'hound', score: 1,
  },
  skinstealer: {
    build: () => buildHumanoid(0xd8c890, 0xb8a878, 0x000000),
    hp: 8, speed: 0, chaseSpeed: 3.4, damage: 16,
    aggroRange: 5.5, attackRange: 1.6, attackCooldown: 1.0,
    size: { w: 0.6, h: 1.9 }, eyeH: 1.6, needsLOS: false,
    ambush: true, growl: 'skin', score: 2,
  },
  faceling: {
    build: () => buildHumanoid(0xb8b0a8, 0x3a3e46, 0x000000),
    hp: 14, speed: 1.8, chaseSpeed: 3.0, damage: 15,
    aggroRange: 15, attackRange: 1.7, attackCooldown: 1.2,
    size: { w: 0.6, h: 1.9 }, eyeH: 1.6, needsLOS: false,
    growl: 'faceling', score: 2,
  },
  boss: {
    build: buildBoss,
    hp: 120, speed: 2.0, chaseSpeed: 3.2, damage: 24,
    aggroRange: 60, attackRange: 2.6, attackCooldown: 1.4,
    size: { w: 1.2, h: 3.6 }, eyeH: 3.2, needsLOS: false,
    boss: true, growl: 'boss', score: 10,
  },
};

let nextId = 1;

export class Enemy {
  constructor(type, x, y, z) {
    this.id = nextId++;
    this.type = type;
    this.cfg = ENEMY_TYPES[type];
    this.hp = this.cfg.hp;
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.mesh = this.cfg.build();
    this.mesh.position.copy(this.pos);
    this.state = this.cfg.ambush ? 'ambush' : 'wander';
    this.stateTime = 0;
    this.attackCd = 0;
    this.wanderDir = Math.random() * Math.PI * 2;
    this.hitFlash = 0;
    this.dead = false;
    // chefe
    this.chargeCd = 5;
    this.charging = 0;
    this.chargeDir = new THREE.Vector3();
    this.summonedAt = [false, false];
    this.growlCd = 2 + Math.random() * 4;
    this.animT = Math.random() * 10;
  }

  distTo(p) { return this.pos.distanceTo(p); }

  // ctx: { world, player, dt, onAttack(dmg), inDark(x,z), sfx, summon() }
  update(ctx) {
    const { world, player, dt } = ctx;
    const cfg = this.cfg;
    this.stateTime += dt;
    this.animT += dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const pdist = this.distTo(player.pos);
    const seesPlayer = pdist < cfg.aggroRange &&
      (!cfg.needsLOS || hasLOS(world,
        this.pos.x, this.pos.y + cfg.eyeH, this.pos.z,
        player.pos.x, player.pos.y + 1.5, player.pos.z));

    // sanidade baixa atrai monstros de mais longe
    const aggroBoost = player.sanity < 35 ? 1.6 : 1;

    let targetSpeed = 0;
    let dirX = 0, dirZ = 0;

    switch (this.state) {
      case 'ambush':
        // finge estar inerte; acorda quando o jogador chega perto ou o ataca
        if (pdist < cfg.aggroRange * aggroBoost || this.hp < cfg.hp) {
          this.state = 'chase';
          ctx.sfx?.growl(cfg.growl);
        }
        break;
      case 'wander':
        if (seesPlayer || (pdist < cfg.aggroRange * aggroBoost && !cfg.needsLOS)) {
          this.state = 'chase';
          ctx.sfx?.growl(cfg.growl);
          break;
        }
        if (this.stateTime > 2.5) { this.stateTime = 0; this.wanderDir = Math.random() * Math.PI * 2; }
        dirX = Math.cos(this.wanderDir); dirZ = Math.sin(this.wanderDir);
        targetSpeed = cfg.speed * 0.6;
        break;
      case 'chase': {
        // Sorridentes ao alcance de luz desaceleram (eles pertencem ao escuro)
        let sp = cfg.chaseSpeed;
        if (this.type === 'smiler' && ctx.inDark && !ctx.inDark(this.pos.x, this.pos.z)) sp *= 0.55;
        if (player.sanity < 35) sp *= 1.15;
        const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        dirX = dx / d; dirZ = dz / d;
        targetSpeed = sp;
        if (pdist > cfg.aggroRange * 2.2 && !cfg.boss) { this.state = 'wander'; this.stateTime = 0; }
        if (pdist < cfg.attackRange && this.attackCd <= 0) {
          this.attackCd = cfg.attackCooldown;
          ctx.onAttack(cfg.damage, this);
        }
        if (this.growlCd <= 0) { ctx.sfx?.growl(cfg.growl); this.growlCd = 4 + Math.random() * 5; }
        this.growlCd -= dt;
        break;
      }
    }

    // ---- lógica do chefe ----
    if (cfg.boss) {
      this.chargeCd -= dt;
      if (this.charging > 0) {
        this.charging -= dt;
        dirX = this.chargeDir.x; dirZ = this.chargeDir.z;
        targetSpeed = cfg.chaseSpeed * 3.4;
        if (pdist < cfg.attackRange && this.attackCd <= 0) {
          this.attackCd = cfg.attackCooldown;
          ctx.onAttack(cfg.damage * 1.4, this);
          this.charging = 0;
        }
      } else if (this.chargeCd <= 0 && pdist < 30 && pdist > 4) {
        this.chargeCd = 4.5 + Math.random() * 2.5;
        this.charging = 1.3;
        const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        this.chargeDir.set(dx / d, 0, dz / d);
        ctx.sfx?.growl('bosscharge');
      }
      const frac = this.hp / cfg.hp;
      if (frac < 0.66 && !this.summonedAt[0]) { this.summonedAt[0] = true; ctx.summon?.(2); }
      if (frac < 0.33 && !this.summonedAt[1]) { this.summonedAt[1] = true; ctx.summon?.(3); }
    }

    // ---- movimento com desvio simples de paredes ----
    if (targetSpeed > 0) {
      this.vel.x += (dirX * targetSpeed - this.vel.x) * Math.min(1, 10 * dt);
      this.vel.z += (dirZ * targetSpeed - this.vel.z) * Math.min(1, 10 * dt);
    } else {
      this.vel.x *= Math.max(0, 1 - 8 * dt);
      this.vel.z *= Math.max(0, 1 - 8 * dt);
    }
    this.vel.y -= GRAVITY * dt;
    if (this.vel.y < -30) this.vel.y = -30;

    const res = moveAABB(world, this.pos, this.vel, dt, cfg.size);
    if (res.hitWall && res.onGround && targetSpeed > 0) {
      // tenta pular obstáculos de 1 bloco
      this.vel.y = 7.5;
      if (this.state === 'wander') this.wanderDir = Math.random() * Math.PI * 2;
    }

    // ---- visual ----
    this.mesh.position.copy(this.pos);
    if (targetSpeed > 0.1 || this.state === 'chase') {
      this.mesh.rotation.y = Math.atan2(-(dirX || 0.001), -(dirZ || 0.001));
    }
    const speedNow = Math.hypot(this.vel.x, this.vel.z);
    const swing = Math.sin(this.animT * (4 + speedNow * 1.5)) * Math.min(0.5, speedNow * 0.18);
    for (const part of this.mesh.children) {
      if (part.userData.leg) part.rotation.x = swing * (part.position.x < 0 ? 1 : -1);
      if (part.userData.arm) part.rotation.x = swing * (part.position.x < 0 ? -1 : 1);
    }
    const flash = this.hitFlash > 0;
    this.mesh.traverse((o) => {
      if (o.isMesh && o.material && o.material.emissive !== undefined && !o.userData._glow) {
        if (o.userData._baseEmissive === undefined) {
          o.userData._baseEmissive = o.material.emissive.getHex();
          if (o.userData._baseEmissive !== 0) o.userData._glow = true;
        }
        if (!o.userData._glow) o.material.emissive.setHex(flash ? 0xa03030 : 0x000000);
      }
    });
  }

  takeDamage(n, fromPos) {
    this.hp -= n;
    this.hitFlash = 0.15;
    if (this.state === 'ambush' || this.state === 'wander') this.state = 'chase';
    if (fromPos) {
      const dx = this.pos.x - fromPos.x, dz = this.pos.z - fromPos.z;
      const d = Math.hypot(dx, dz) || 1;
      const kb = this.cfg.boss ? 1.2 : 5;
      this.vel.x += (dx / d) * kb;
      this.vel.z += (dz / d) * kb;
    }
    if (this.hp <= 0) this.dead = true;
    return this.dead;
  }
}
