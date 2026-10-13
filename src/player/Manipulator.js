import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { Viewmodel } from './Viewmodel.js';

const RANGE = 11, HOLD_DIST = 2.3, PUNT_SPEED = 26;

/** M-7 Field Manipulator: LMB punt, RMB grab / hold / drop. */
export class Manipulator {
  constructor(game, player) {
    this.game = game; this.player = player;
    this.name = 'manipulator';
    this.label = 'M-7 FIELD MANIPULATOR';
    const vm = player.viewmodel;
    this.rig = new THREE.Group();
    this.gun = assets.model('manipulator', { procedural: true });
    this.gun.position.set(0.17, -0.17, -0.38);
    this.gun.scale.setScalar(0.95);
    this.gun.rotation.y = Math.PI;       // barrel points -Z (away from camera)
    this.armR = Viewmodel.arm(); this.armR.position.set(0.2, -0.26, -0.1); this.armR.rotation.set(0.1, 0, 0);
    this.armL = Viewmodel.arm(); this.armL.position.set(-0.04, -0.27, -0.2); this.armL.rotation.set(0.0, -0.45, 0);
    this.rig.add(this.gun, this.armR, this.armL);
    vm.attach('manipulator', this.rig);
    this.orb = this.gun.getObjectByName('orb');
    this.held = null;
    this.target = null;
    this.cool = 0;
    this.holdDist = HOLD_DIST;
    this.glow = 0;
    // beam
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.beam.visible = false;
    game.scene.add(this.beam);
    this.loopSnd = null;
    this._muzzle = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
  }

  attachScene(scene) { if (this.beam.parent !== scene) scene.add(this.beam); }

  deploy() { this.player.viewmodel.show('manipulator', true); this.player.viewmodel.raiseTarget = 1; this.player.viewmodel.raise = 0; this.attachScene(this.game.scene); }
  holster() { this.release(); this.player.viewmodel.show('manipulator', false); this.beam.visible = false; this.game.hud.setCrosshair('normal'); }

  /** find the prop under the crosshair (aim-assisted). */
  pick(range = RANGE) {
    const g = this.game, p = this.player;
    const o = p.eyePos, d = p.forward;
    let best = null, bestScore = 1e9;
    for (const pr of g.physics.props) {
      if (!pr.alive || pr === this.held) continue;
      const c = pr.body.position;
      const dx = c.x - o.x, dy = c.y - o.y, dz = c.z - o.z;
      const t = dx * d.x + dy * d.y + dz * d.z;
      if (t < 0.3 || t > range) continue;
      const perp = Math.hypot(dx - d.x * t, dy - d.y * t, dz - d.z * t);
      const tol = pr.radius * 1.15 + 0.12 + t * 0.012;
      if (perp > tol) continue;
      const score = perp / tol + t * 0.02;
      if (score >= bestScore) continue;
      const wall = g.statics.raycast(o.x, o.y, o.z, dx / Math.hypot(dx, dy, dz), dy / Math.hypot(dx, dy, dz), dz / Math.hypot(dx, dy, dz), Math.hypot(dx, dy, dz) - pr.radius * 0.8, true);
      if (wall) continue;
      best = pr; bestScore = score;
    }
    return best;
  }

  grab(pr) {
    this.held = pr;
    pr.held = true;
    this.player.holdingProp = pr;
    pr.body.wakeUp();
    pr.body.linearDamping = 0.6; pr.body.angularDamping = 0.9;
    this.holdDist = THREE.MathUtils.clamp(pr.body.position.distanceTo({ x: this.player.eyePos.x, y: this.player.eyePos.y, z: this.player.eyePos.z }), 1.5 + pr.radius, 3.2);
    this.game.audio.play('manipulator_grab', { vol: 0.8 });
    this.loopSnd = this.game.audio.loop('suit_charge_loop', { vol: 0.12, pitch: 0.8 });
    this.glow = 1;
  }

  release(drop = true) {
    const pr = this.held;
    if (!pr) return;
    pr.held = false;
    pr.body.linearDamping = 0.04; pr.body.angularDamping = 0.25;
    pr.body.wakeUp();
    this.held = null;
    this.player.holdingProp = null;
    if (this.loopSnd) { this.loopSnd.stop(0.1); this.loopSnd = null; }
    this.beam.visible = false;
    if (drop) this.game.audio.play('manipulator_drop', { vol: 0.7 });
    if (pr.onReleased) pr.onReleased();
  }

  update(dt, input) {
    const g = this.game, p = this.player;
    this.cool -= dt;
    this.attachScene(g.scene);
    const o = p.eyePos, d = p.forward;
    // muzzle approx world position
    const right = this._tmp.set(1, 0, 0).applyQuaternion(g.camera.quaternion);
    this._muzzle.set(o.x + d.x * 0.7 + right.x * 0.18, o.y + d.y * 0.7 - 0.12 + right.y * 0.18, o.z + d.z * 0.7 + right.z * 0.18);

    if (input) {
      if (input.wasPressed('Mouse1')) {
        if (this.held) this.release();
        else {
          const t = this.pick();
          if (t && t.grabbable !== false) this.grab(t);
          else { g.audio.play('manipulator_dryfire', { vol: 0.6 }); this.cool = 0.25; }
        }
      }
      if (input.wasPressed('Mouse0') && this.cool <= 0) this.punt();
      if (input.wasPressed('KeyE') && this.held) { /* use key does not drop */ }
    }

    // hold
    if (this.held) {
      const pr = this.held;
      const target = this._tmp.set(o.x + d.x * this.holdDist, o.y + d.y * this.holdDist - 0.1, o.z + d.z * this.holdDist);
      const b = pr.body;
      const dx = target.x - b.position.x, dy = target.y - b.position.y, dz = target.z - b.position.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 5.5 || !pr.alive) { this.release(); }
      else {
        const k = 14;
        let vx = dx * k, vy = dy * k, vz = dz * k;
        const sp = Math.hypot(vx, vy, vz);
        const cap = 22;
        if (sp > cap) { vx *= cap / sp; vy *= cap / sp; vz *= cap / sp; }
        b.velocity.set(vx, vy, vz);
        b.angularVelocity.scale(0.85, b.angularVelocity);
        b.wakeUp();
        // beam
        this.beam.visible = true;
        const a = this._muzzle, c = b.position;
        const len = Math.hypot(c.x - a.x, c.y - a.y, c.z - a.z);
        this.beam.position.set((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
        this.beam.scale.set(1, len, 1);
        this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z).normalize());
        this.beam.material.opacity = 0.35 + 0.25 * Math.sin(g.time * 40);
        if (Math.random() < 0.5) g.fx.emit({ pos: { x: a.x + (c.x - a.x) * Math.random(), y: a.y + (c.y - a.y) * Math.random(), z: a.z + (c.z - a.z) * Math.random() }, life: 0.25, size0: 0.08, size1: 0.0, color0: [1, 0.7, 0.3], alpha: 0.9, spread: 0.1 });
      }
    } else {
      this.beam.visible = false;
    }
    // crosshair feedback
    if (!this.held && input) {
      const t = this.pick();
      this.target = t;
      g.hud.setCrosshair(t ? 'grab' : 'normal');
    } else if (this.held) g.hud.setCrosshair('hold');

    // orb glow
    this.glow = Math.max(this.held ? 1 : 0, this.glow - dt * 3);
    if (this.orb) { const s = 1 + this.glow * 0.8 + Math.sin(g.time * 8) * 0.1 * (this.held ? 1 : 0.3); this.orb.scale.setScalar(s); }
  }

  punt() {
    const g = this.game, p = this.player;
    const o = p.eyePos, d = p.forward;
    this.cool = 0.55;
    p.viewmodel.kick = 1;
    g.audio.play('manipulator_punt', { vol: 0.9 });
    g.fx.emit({ pos: this._muzzle, life: 0.2, size0: 0.4, size1: 0.1, color0: [1, 0.7, 0.3], alpha: 0.9 });
    p.shake(0.015, 0.12);
    let target = this.held;
    if (target) this.release(false);
    else target = this.pick(RANGE + 4);
    if (target && target.grabbable !== false) {
      const b = target.body;
      b.wakeUp();
      const m = Math.max(1, b.mass);
      const sp = PUNT_SPEED * Math.min(1, 0.35 + 22 / (m + 14));
      // aim at the crosshair's far point so punts land where you look
      b.velocity.set(d.x * sp, d.y * sp + 1.5, d.z * sp);
      b.angularVelocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      target.thrownAt = g.time;
      target.thrownSpeed = sp;
      return;
    }
    // no prop: shove enemies in a short cone
    let hit = false;
    for (const e of g.damageables()) {
      if (!e.alive || !e.shove) continue;
      const c = e.hitCenter();
      const dx = c.x - o.x, dy = c.y - o.y, dz = c.z - o.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 6) continue;
      const dot = (dx * d.x + dy * d.y + dz * d.z) / dist;
      if (dot < 0.85) continue;
      if (!g.statics.lineOfSight(o, c)) continue;
      e.shove(d, 12 / (0.6 + dist * 0.3));
      e.takeDamage(8, { type: 'punt', from: o });
      hit = true;
    }
    if (!hit) g.audio.play('manipulator_dryfire', { vol: 0.4 });
  }
}
