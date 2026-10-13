import * as THREE from 'three';
import { Enemy } from './Enemy.js';
import { Entity } from './Entity.js';
import { Animator } from './Animator.js';
import { moveBody } from '../physics/Collision.js';
import { assets } from '../core/Assets.js';

/** Acid glob projectile. */
export class AcidGlob extends Entity {
  constructor(game, from, vel, dmg = 12) {
    super(game);
    this.pos = from.clone(); this.vel = vel.clone(); this.dmg = dmg; this.life = 4;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: 0xb6ff4a }));
    this.mesh.position.copy(this.pos);
    game.levelRoot.add(this.mesh);
    this.spot = game.lights.add({ pos: this.pos.clone(), color: 0x88ff33, intensity: 0.7, distance: 4 });
  }
  update(dt) {
    const g = this.game;
    this.life -= dt;
    this.vel.y -= 5 * dt;
    const step = this.vel.clone().multiplyScalar(dt);
    const len = step.length();
    let hitStatic = null;
    if (len > 0) {
      const dir = step.clone().divideScalar(len);
      hitStatic = g.statics.raycast(this.pos.x, this.pos.y, this.pos.z, dir.x, dir.y, dir.z, len + 0.1);
    }
    this.pos.add(step);
    this.mesh.position.copy(this.pos);
    this.spot.pos.copy(this.pos);
    g.fx.emit({ pos: this.pos, life: 0.3, size0: 0.18, size1: 0.02, color0: [0.6, 1, 0.2], alpha: 0.8 });
    const p = g.player;
    const c = p.center;
    if (!p.dead && Math.hypot(c.x - this.pos.x, c.y - this.pos.y, c.z - this.pos.z) < 0.6 + (p.crouched ? 0 : 0.2)) {
      p.damage(this.dmg, this.pos);
      this.splash(true);
    } else if (hitStatic || this.life <= 0 || this.pos.y < -2) this.splash(false);
  }
  splash() {
    this.game.audio.playAt('acid_hit', this.pos, 0.9);
    this.game.splat(this.pos, 10, true);
    this.alive = false;
    this.mesh.parent && this.mesh.parent.remove(this.mesh);
    this.game.lights.remove(this.spot);
  }
}

/** Stationary (or slow) acid-spitting Cell polyp. */
export class Spitter extends Enemy {
  constructor(game, x, y, z, o = {}) {
    super(game);
    this.hp = o.hp || 60;
    this.pos = new THREE.Vector3(x, y, z);
    this.mobile = !!o.mobile;
    this.range = o.range || 24;
    this.fireDelay = o.fireDelay || 2.6;
    this.hitRadius = 0.55;
    this.cool = 1.5 + Math.random();
    this.charge = 0;
    this.group = new THREE.Group();
    this.model = assets.model('spitter');
    this.group.add(this.model);
    this.neck = this.model.userData.neck || null;
    this.sac = this.model.userData.sac || null;
    this.anim = new Animator(this.model);
    this.group.position.copy(this.pos);
    game.levelRoot.add(this.group);
    this.center = new THREE.Vector3(x, y + 1.0, z);
    this.body = { pos: { x, y, z }, vel: { x: 0, y: 0, z: 0 }, r: 0.4, height: 1.0, step: 0.2, onGround: false };
    this.awake = false;
    this.t = Math.random() * 10;
    this.yaw = o.yaw || 0;
  }
  shove() {}
  takeDamage(n, info = {}) {
    if (this.isDead) return;
    this.hp -= n; this.awake = true;
    this.game.audio.playAt('wrench_hit_flesh', this.pos, 0.5, { pitch: 0.7 });
    if (this.hp <= 0) this.die(info);
  }
  die() {
    this.isDead = true;
    this.game.audio.playAt('spitter_die', this.pos, 1);
    this.game.splat(this.center, 26);
    this.removeT = 2.5;
  }
  update(dt) {
    const g = this.game, p = g.player;
    this.t += dt;
    if (this.isDead) {
      this.removeT -= dt;
      this.group.scale.y = Math.max(0.05, this.removeT / 2.5);
      this.group.position.y = this.pos.y;
      if (this.removeT <= 0) { this.alive = false; this.group.parent && this.group.parent.remove(this.group); }
      return;
    }
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const head = new THREE.Vector3(this.pos.x, this.pos.y + 1.2, this.pos.z);
    const c = p.center;
    const los = dist < this.range && !p.dead && g.statics.lineOfSight(head, c);
    if (los) this.awake = true;
    const targetYaw = Math.atan2(dx, dz);
    if (this.awake) {
      let dy = targetYaw - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * 5);
    } else this.yaw += Math.sin(this.t * 0.4) * dt * 0.2;
    this.group.rotation.y = this.yaw;
    if (this.neck) { this.neck.rotation.x = Math.sin(this.t * 1.6) * 0.06 - (this.charge > 0 ? 0.25 * this.charge : 0); this.neck.rotation.z = Math.sin(this.t * 1.1) * 0.05; }
    // slow creep to keep distance
    if (this.mobile && los) {
      const want = dist > 12 ? 1 : dist < 7 ? -1 : 0;
      this.body.vel.x = Math.sin(this.yaw) * want * 1.3; this.body.vel.z = Math.cos(this.yaw) * want * 1.3;
      this.body.vel.y -= 20 * dt;
      moveBody(this.body, dt, g.statics, {});
      this.pos.set(this.body.pos.x, this.body.pos.y, this.body.pos.z);
      this.group.position.copy(this.pos);
      this.center.set(this.pos.x, this.pos.y + 1.0, this.pos.z);
    }
    this.cool -= dt;
    if (los) {
      if (this.cool <= 0 && this.charge === 0) { this.charge = 0.001; g.audio.playAt('crawler_idle', this.pos, 0.8, { pitch: 0.6 }); }
    }
    if (this.charge > 0) {
      this.charge += dt / 0.55;
      if (this.sac) this.sac.scale.setScalar(1 + this.charge * 0.7);
      if (this.charge >= 1) {
        this.charge = 0; this.cool = this.fireDelay * (0.8 + Math.random() * 0.5);
        if (this.sac) this.sac.scale.setScalar(1);
        this.fire(head, c, dist);
      }
    }
  }
  fire(head, c, dist) {
    const g = this.game, p = g.player;
    const speed = 13;
    const flight = dist / speed;
    const lead = 0.55;
    const tx = c.x + p.vel.x * flight * lead, tz = c.z + p.vel.z * flight * lead, ty = c.y + 0.1;
    const dir = new THREE.Vector3(tx - head.x, ty - head.y + 0.5 * 5 * flight * flight * 0.5, tz - head.z);
    dir.normalize().multiplyScalar(speed);
    const origin = new THREE.Vector3(head.x + Math.sin(this.yaw) * 0.4, head.y, head.z + Math.cos(this.yaw) * 0.4);
    g.add(new AcidGlob(g, origin, dir, 12));
    g.audio.playAt('spitter_spit', this.pos, 1);
  }
}
