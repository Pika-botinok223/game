import * as THREE from 'three';
import { Enemy, steer } from './Enemy.js';
import { Animator } from './Animator.js';
import { moveBody } from '../physics/Collision.js';
import { assets } from '../core/Assets.js';

/** Small fast Cell creature: chases, then leaps at you. Weak to the wrench. */
export class Crawler extends Enemy {
  constructor(game, x, y, z, o = {}) {
    super(game);
    this.hp = o.hp || 30;
    this.body = { pos: { x, y, z }, vel: { x: 0, y: 0, z: 0 }, r: 0.22, height: 0.42, step: 0.28, onGround: false, groundBox: null };
    this.pos = this.body.pos;
    this.hitRadius = 0.32;
    this.state = o.aggro ? 'chase' : 'idle';
    this.aggro = o.aggroRange || 15;
    this.speed = 4.2 + Math.random() * 0.8;
    this.cool = 0.5 + Math.random() * 0.8;
    this.t = 0; this.stagger = 0; this.hitDone = false; this.legT = Math.random() * 6; this.idleT = 1 + Math.random() * 4;
    this.group = new THREE.Group();
    this.model = assets.model('crawler');
    this.group.add(this.model);
    this.legs = this.model.userData.legs || [];
    this.jaw = this.model.getObjectByName('jaw');
    this.anim = new Animator(this.model);
    this.group.position.set(x, y, z);
    this.group.rotation.y = Math.random() * 6.28;
    game.levelRoot.add(this.group);
    this.yaw = this.group.rotation.y;
    this.center = new THREE.Vector3(x, y + 0.25, z);
  }

  shove(dir, power) {
    const l = Math.hypot(dir.x, dir.z) || 1;
    this.body.vel.x = dir.x / l * power * 2.2; this.body.vel.z = dir.z / l * power * 2.2; this.body.vel.y = 3;
    this.body.onGround = false;
    this.stagger = 0.5;
    if (this.state === 'windup' || this.state === 'leap') this.state = 'recover';
  }

  takeDamage(n, info = {}) {
    if (this.isDead) return;
    this.hp -= n;
    if (this.state === 'idle') this.state = 'chase';
    if (this.hp <= 0) return this.die(info);
    this.stagger = 0.25;
    if (info.dir) { this.body.vel.x += info.dir.x * 3; this.body.vel.z += info.dir.z * 3; }
  }

  die(info) {
    this.isDead = true;
    const g = this.game;
    g.audio.playAt('crawler_die', this.pos, 1);
    g.splat(this.center, 14);
    this.state = 'dead';
    this.removeT = 3.5;
    this.body.vel.y = 3;
    if (this.anim.active) this.anim.play(/death|die/, { loop: false });
    if (info && info.type === 'explosion') { this.body.vel.x += (Math.random() - 0.5) * 6; this.body.vel.z += (Math.random() - 0.5) * 6; this.body.vel.y = 6; }
  }

  update(dt) {
    const g = this.game, b = this.body, p = g.player;
    this.t += dt;
    if (this.isDead) {
      this.removeT -= dt;
      b.vel.y -= 20 * dt;
      b.vel.x *= 0.9; b.vel.z *= 0.9;
      moveBody(b, dt, g.statics, {});
      this.group.rotation.z += (Math.PI - this.group.rotation.z) * Math.min(1, dt * 8);
      this.group.position.set(b.pos.x, b.pos.y + (this.group.rotation.z > 1.5 ? 0.15 : 0), b.pos.z);
      for (const l of this.legs) l.rotation.z += (0.9 - l.rotation.z) * dt * 4;
      if (this.removeT < 1) this.group.scale.setScalar(Math.max(0.01, this.removeT));
      this.anim.update(dt);
      if (this.removeT <= 0) { this.alive = false; this.group.parent && this.group.parent.remove(this.group); }
      return;
    }
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z;
    const dist = Math.hypot(dx, dz);
    const eye = { x: b.pos.x, y: b.pos.y + 0.3, z: b.pos.z };
    const target = p.center;
    this.cool -= dt;
    if (this.stagger > 0) this.stagger -= dt;

    switch (this.state) {
      case 'idle': {
        this.idleT -= dt;
        if (this.idleT <= 0) { this.idleT = 3 + Math.random() * 5; if (dist < 22) g.audio.playAt('crawler_idle', this.pos, 0.6); }
        if (dist < this.aggro && !p.dead && g.statics.lineOfSight(eye, target)) { this.state = 'chase'; g.audio.playAt('crawler_idle', this.pos, 0.9); }
        b.vel.x *= 0.8; b.vel.z *= 0.8;
        break;
      }
      case 'chase': {
        if (this.stagger > 0 || p.dead) { b.vel.x *= 0.9; b.vel.z *= 0.9; break; }
        let [sx, sz] = steer(g, b.pos, dx, dz);
        // slight weave so groups don't line up
        const w = Math.sin(this.t * 4 + this.speed * 7) * 0.25;
        const nx = sx - sz * w, nz = sz + sx * w;
        const l = Math.hypot(nx, nz) || 1;
        const sp = this.speed;
        b.vel.x += ((nx / l) * sp - b.vel.x) * Math.min(1, dt * 9);
        b.vel.z += ((nz / l) * sp - b.vel.z) * Math.min(1, dt * 9);
        this.yaw = Math.atan2(b.vel.x, b.vel.z);
        if (dist < 3.4 && dist > 0.8 && this.cool <= 0 && b.onGround && g.statics.lineOfSight(eye, target)) {
          this.state = 'windup'; this.t0 = this.t;
          g.audio.playAt('crawler_attack', this.pos, 1);
        }
        break;
      }
      case 'windup': {
        b.vel.x *= 0.7; b.vel.z *= 0.7;
        this.yaw = Math.atan2(dx, dz);
        if (this.t - this.t0 > 0.3) {
          const l = Math.hypot(dx, dz) || 1;
          const s = Math.min(8.5, 4 + dist * 1.6);
          b.vel.x = dx / l * s; b.vel.z = dz / l * s; b.vel.y = 4.4;
          b.onGround = false; this.state = 'leap'; this.t0 = this.t; this.hitDone = false;
        }
        break;
      }
      case 'leap': {
        if (!this.hitDone) {
          const c = p.center;
          if (Math.hypot(c.x - b.pos.x, c.z - b.pos.z) < 0.75 && b.pos.y < p.pos.y + 1.7 && b.pos.y + 0.4 > p.pos.y) {
            this.hitDone = true;
            p.damage(8, b.pos);
            g.audio.playAt('wrench_hit_flesh', this.pos, 0.6, { pitch: 1.4 });
            b.vel.x *= -0.25; b.vel.z *= -0.25; b.vel.y = 2.5;
          }
        }
        if (b.onGround && this.t - this.t0 > 0.1) { this.state = 'recover'; this.t0 = this.t; this.cool = 1.1 + Math.random() * 0.8; }
        break;
      }
      case 'recover':
        b.vel.x *= 0.85; b.vel.z *= 0.85;
        if (this.t - this.t0 > 0.45 && b.onGround) this.state = 'chase';
        break;
    }
    // separation
    for (const o of g.enemies) {
      if (o === this || o.isDead || !(o instanceof Crawler)) continue;
      const ox = b.pos.x - o.pos.x, oz = b.pos.z - o.pos.z, d = Math.hypot(ox, oz);
      if (d < 0.55 && d > 0.001) { b.vel.x += ox / d * 2.5 * dt * 10; b.vel.z += oz / d * 2.5 * dt * 10; }
    }
    b.vel.y -= 20 * dt;
    moveBody(b, dt, g.statics, { dynamic: g.physics.colliders });
    // kill plane
    if (b.pos.y < -40) { this.hp = 0; this.die({}); }

    // visuals
    this.group.position.set(b.pos.x, b.pos.y, b.pos.z);
    let dyaw = this.yaw - this.group.rotation.y;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2; while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    this.group.rotation.y += dyaw * Math.min(1, dt * 14);
    const spd = Math.hypot(b.vel.x, b.vel.z);
    this.legT += dt * (4 + spd * 3.2);
    for (let i = 0; i < this.legs.length; i++) this.legs[i].rotation.y = Math.sin(this.legT + i * 1.7) * 0.5 * Math.min(1, spd / 3);
    if (this.jaw) this.jaw.rotation.x = this.state === 'windup' || this.state === 'leap' ? -0.6 : 0;
    const squash = this.state === 'windup' ? 0.7 : 1;
    this.model.scale.y += (squash - this.model.scale.y) * Math.min(1, dt * 20);
    this.model.rotation.x = this.state === 'leap' ? -0.4 : 0;
    this.center.set(b.pos.x, b.pos.y + 0.25, b.pos.z);
    if (this.anim.active) { this.anim.play(spd > 0.5 ? /run|walk|move/ : /idle/); this.anim.update(dt); }
  }
}
