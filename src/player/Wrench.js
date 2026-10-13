import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { Viewmodel } from './Viewmodel.js';

/** Hydraulic wrench: melee. LMB swings. */
export class Wrench {
  constructor(game, player) {
    this.game = game; this.player = player;
    this.name = 'wrench';
    this.label = 'HYDRAULIC WRENCH';
    const vm = player.viewmodel;
    this.rig = new THREE.Group();
    const arm = Viewmodel.arm(); arm.position.set(0.0, 0, 0.0);
    this.hand = new THREE.Group();
    this.hand.position.set(0.24, -0.26, -0.38);
    this.hand.add(arm);
    // the wrench itself (always procedural for viewmodel control)
    const w = assets.model('wrench', { procedural: true });
    w.scale.setScalar(1.0);
    w.rotation.set(0, Math.PI / 2, 0);
    w.position.set(0, 0.0, -0.32);
    this.hand.add(w);
    this.rig.add(this.hand);
    vm.attach('wrench', this.rig);
    this.swing = -1;     // time in swing, <0 idle
    this.hitDone = false;
    this.cool = 0;
  }
  deploy() { this.player.viewmodel.show('wrench', true); this.player.viewmodel.raiseTarget = 1; this.player.viewmodel.raise = 0; this.swing = -1; }
  holster() { this.player.viewmodel.show('wrench', false); }

  update(dt, input) {
    this.cool -= dt;
    const SW = 0.42;
    if (input && this.swing < 0 && this.cool <= 0 && input.isDown('Mouse0')) {
      this.swing = 0; this.hitDone = false; this.cool = 0.5;
      this.game.audio.play('wrench_swing', { vol: 0.7, jitter: 0.15 });
    }
    if (this.swing >= 0) {
      this.swing += dt;
      if (!this.hitDone && this.swing > 0.16) { this.hitDone = true; this.strike(); }
      if (this.swing > SW) this.swing = -1;
    }
    // swing pose: windup up/back then arc down-left across the screen
    let rx = 0, ry = 0, rz = 0, px = 0, py = 0, pz = 0;
    if (this.swing >= 0) {
      const t = this.swing / SW;
      let k;
      if (t < 0.3) { k = t / 0.3; rx = 0.7 * k; rz = -0.5 * k; px = 0.1 * k; py = 0.1 * k; pz = 0.1 * k; }
      else if (t < 0.55) { k = (t - 0.3) / 0.25; const e = k * k; rx = 0.7 - 1.7 * e; rz = -0.5 + 0.9 * e; px = 0.1 - 0.3 * e; py = 0.1 - 0.15 * e; pz = 0.1 - 0.25 * e; }
      else { k = (t - 0.55) / 0.45; rx = -1.0 * (1 - k); rz = 0.4 * (1 - k); px = -0.2 * (1 - k); py = -0.05 * (1 - k); pz = -0.15 * (1 - k); }
    }
    this.hand.rotation.set(rx + 0.55, ry, rz + 0.1);
    this.hand.position.set(0.24 + px, -0.26 + py, -0.38 + pz);
  }

  strike() {
    const g = this.game, p = this.player;
    const o = p.eyePos, d = p.forward;
    let hitAny = false;
    // enemies / nests (anything with takeDamage and a position)
    let best = null, bestScore = 1e9;
    for (const e of g.damageables()) {
      if (!e.alive) continue;
      const c = e.hitCenter();
      const dx = c.x - o.x, dy = c.y - o.y, dz = c.z - o.z;
      const dist = Math.hypot(dx, dy, dz) - (e.hitRadius || 0.4);
      if (dist > 2.4) continue;
      const dot = (dx * d.x + dy * d.y + dz * d.z) / Math.max(0.001, Math.hypot(dx, dy, dz));
      if (dot < 0.72) continue;
      if (!g.statics.lineOfSight(o, c)) continue;
      const score = dist - dot;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best) {
      best.takeDamage(25, { type: 'melee', from: o, dir: d });
      g.audio.play(best.metal ? 'wrench_hit_metal' : 'wrench_hit_flesh', { vol: 0.9 });
      hitAny = true;
      g.player.viewmodel.kick = 1;
    }
    // world / props
    const hit = g.statics.raycast(o.x, o.y, o.z, d.x, d.y, d.z, 2.3);
    let prop = null, propT = 1e9;
    for (const pr of g.physics.props) {
      if (!pr.alive || pr === p.holdingProp) continue;
      const c = pr.body.position;
      const dx = c.x - o.x, dy = c.y - o.y, dz = c.z - o.z;
      const t = dx * d.x + dy * d.y + dz * d.z;
      if (t < 0 || t > 2.6) continue;
      const perp = Math.hypot(dx - d.x * t, dy - d.y * t, dz - d.z * t);
      if (perp < pr.radius + 0.1 && t < propT) { prop = pr; propT = t; }
    }
    if (prop && (!hit || propT < hit.t + 0.4)) {
      prop.body.wakeUp();
      prop.body.applyImpulse({ x: d.x * 14 * Math.min(1, prop.mass / 8 + 0.3), y: 1.5, z: d.z * 14 * Math.min(1, prop.mass / 8 + 0.3) }, prop.body.position);
      prop.takeDamage(25, { type: 'melee' });
      g.audio.play('wrench_hit_metal', { vol: 0.7 });
      hitAny = true;
      const hp = new THREE.Vector3(o.x + d.x * propT, o.y + d.y * propT, o.z + d.z * propT);
      g.sparks(hp, 6);
    } else if (hit) {
      const hp = { x: o.x + d.x * hit.t, y: o.y + d.y * hit.t, z: o.z + d.z * hit.t };
      g.audio.play(hit.box.surface === 'metal' ? 'wrench_hit_metal' : 'metal_impact_2', { vol: 0.7 });
      g.sparks(hp, 8);
      g.player.shake(0.01, 0.1);
      hitAny = true;
    }
    if (hitAny) g.player.viewmodel.kick = 1;
  }
}
