import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { Viewmodel } from './Viewmodel.js';

const RANGE = 11, HOLD_DIST = 2.3, PUNT_SPEED = 26, SUPER_FORCE = 4, SUPER_RANGE = 2, SUPER_MAX_SPEED = 60;

/** M-7 Field Manipulator: LMB punt, RMB grab / hold / drop. */
export class Manipulator {
  constructor(game, player) {
    this.game = game; this.player = player;
    this.name = 'manipulator';
    this.label = 'M-7 FIELD MANIPULATOR';
    const vm = player.viewmodel;
    this.rig = new THREE.Group();
    this.gun = assets.model('manipulator', { procedural: true });
    this.gun.position.set(0.19, -0.19, -0.5);
    this.gun.scale.setScalar(0.62);
    this.armR = Viewmodel.arm(); this.armR.position.set(0.18, -0.27, -0.12); this.armR.rotation.set(0.15, 0, 0);
    this.armL = Viewmodel.arm(); this.armL.position.set(-0.04, -0.27, -0.2); this.armL.rotation.set(0.0, -0.45, 0);
    this.rig.add(this.gun, this.armR, this.armL);
    vm.attach('manipulator', this.rig);
    this.orb = this.gun.getObjectByName('orb');
    this.held = null;
    this.heldEnemy = null;
    this.superOn = false;
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

  get range() { return RANGE * (this.superOn ? SUPER_RANGE : 1); }

  /** cheat: supercharged M-7 (blue/white viewmodel, x4 punt, x2 range, grabs enemies). */
  setSuper(on) {
    on = !!on;
    if (on === this.superOn) return;
    this.superOn = on;
    if (!on) { this.releaseEnemy(); }
    if (on && !this._origMats) {
      this._origMats = [];
      this.gun.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        this._origMats.push([o, o.material]);
        o.material = o.material.clone();
        if (o.material.emissive) o.material.userData._e = [o.material.emissive.getHex(), o.material.emissiveIntensity];
      });
      const orb = this.orb;
      this.superGlow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      (orb && orb.parent ? orb.parent : this.gun).add(this.superGlow);
      if (orb) this.superGlow.position.copy(orb.position);
    }
    if (this.superGlow) this.superGlow.visible = on;
    for (const [o] of this._origMats || []) {
      const m = o.material;
      if (m.emissive && m.userData._e) { m.emissive.setHex(on ? 0x2f78ff : m.userData._e[0]); m.emissiveIntensity = on ? 1.0 : m.userData._e[1]; }
      if (on && m.color) { m.userData._c = m.userData._c || m.color.clone(); m.color.lerp(new THREE.Color(0xcfe6ff), 0.45); }
      else if (!on && m.userData._c) m.color.copy(m.userData._c);
    }
    this.beam.material.color.setHex(on ? 0x8fd0ff : 0xffb04a);
  }

  attachScene(scene) { if (this.beam.parent !== scene) scene.add(this.beam); }

  deploy() { this.player.viewmodel.show('manipulator', true); this.player.viewmodel.raiseTarget = 1; this.player.viewmodel.raise = 0; this.attachScene(this.game.scene); }
  holster() { this.release(); this.releaseEnemy(); this.player.viewmodel.show('manipulator', false); this.beam.visible = false; this.game.hud.setCrosshair('normal'); }

  /** find the prop under the crosshair (aim-assisted). */
  pick(range = this.range) {
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
    this.stuckT = 0; this.lastSep = undefined;
  }

  /** cheat only: the nearest enemy under the crosshair (alive, with a body we can carry). */
  pickEnemy(range = this.range) {
    const g = this.game, p = this.player, o = p.eyePos, d = p.forward;
    let best = null, bestScore = 1e9;
    for (const e of g.damageables()) {
      const c = e.hitCenter();
      const dx = c.x - o.x, dy = c.y - o.y, dz = c.z - o.z;
      const t = dx * d.x + dy * d.y + dz * d.z;
      if (t < 0.3 || t > range) continue;
      const perp = Math.hypot(dx - d.x * t, dy - d.y * t, dz - d.z * t);
      const tol = (e.hitRadius || 0.4) * 1.2 + 0.3 + t * 0.04;
      if (perp > tol) continue;
      if (!g.statics.lineOfSight(o, c)) continue;
      const score = perp / tol + t * 0.02;
      if (score < bestScore) { best = e; bestScore = score; }
    }
    return best;
  }
  releaseEnemy(fling = null) {
    const e = this.heldEnemy;
    if (!e) return;
    this.heldEnemy = null; e.held = false;
    if (this.loopSnd) { this.loopSnd.stop(0.1); this.loopSnd = null; }
    this.beam.visible = false;
    if (fling && e.fling) e.fling(fling.dir, fling.speed);
    else { e.body.vel.x = e.body.vel.y = e.body.vel.z = 0; e.stagger = 0.6; }
  }
  /** rooted enemies (Spitters / Nests) cannot be carried: a super punt obliterates them. */
  _superSmash(e) {
    const g = this.game;
    g.splat(e.hitCenter(), 24);
    e.takeDamage(9999, { type: 'explosion', from: this.player.eyePos });
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
      if (input.wasPressed('Mouse2') || input.wasPressed('Mouse1')) {
        if (this.held) this.release();
        else if (this.heldEnemy) this.releaseEnemy();
        else {
          const t = this.pick();
          const en = this.superOn ? this.pickEnemy() : null;
          if (t && t.grabbable !== false) this.grab(t);
          else if (en && en.body && en.fling) this.grabEnemy(en);
          else { g.audio.play('manipulator_dryfire', { vol: 0.6 }); this.cool = 0.25; }
        }
      }
      if (input.wasPressed('Mouse0') && this.cool <= 0) this.punt();
      if (input.wasPressed('KeyE') && this.held) { /* use key does not drop */ }
    }

    // carry a grabbed enemy (cheat)
    if (this.heldEnemy) {
      const e = this.heldEnemy;
      if (e.isDead || !e.alive) this.releaseEnemy();
      else {
        const tx = o.x + d.x * 2.6, ty = o.y + d.y * 2.6 - 0.2, tz = o.z + d.z * 2.6;
        e.body.pos.x += (tx - e.body.pos.x) * Math.min(1, dt * 14);
        e.body.pos.y += (ty - e.body.pos.y) * Math.min(1, dt * 14);
        e.body.pos.z += (tz - e.body.pos.z) * Math.min(1, dt * 14);
        e.body.vel.x = e.body.vel.y = e.body.vel.z = 0;
        this.beam.visible = true;
        const a = this._muzzle, c = e.body.pos;
        const len = Math.hypot(c.x - a.x, c.y - a.y, c.z - a.z);
        this.beam.position.set((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2);
        this.beam.scale.set(1, Math.max(0.01, len), 1);
        this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z).normalize());
        this.beam.material.opacity = 0.35 + 0.25 * Math.sin(g.time * 40);
        this.glow = 1;
      }
    }
    // hold
    if (this.held) {
      const pr = this.held;
      const target = this._tmp.set(o.x + d.x * this.holdDist, o.y + d.y * this.holdDist - 0.1, o.z + d.z * this.holdDist);
      const b = pr.body;
      const dx = target.x - b.position.x, dy = target.y - b.position.y, dz = target.z - b.position.z;
      const dist = Math.hypot(dx, dy, dz);
      // drop the prop only when it is far away AND not closing in (stuck behind geometry), or absurdly far
      if (dist > 5.5 && dist > (this.lastSep === undefined ? 1e9 : this.lastSep) - 6 * dt) this.stuckT = (this.stuckT || 0) + dt; else this.stuckT = 0;
      this.lastSep = dist;
      if (this.stuckT > 0.7 || dist > 30 || !pr.alive) { this.release(); }
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
    if (!this.held && !this.heldEnemy && input) {
      const t = this.pick() || (this.superOn ? this.pickEnemy() : null);
      this.target = t;
      g.hud.setCrosshair(t ? 'grab' : 'normal');
    } else if (this.held || this.heldEnemy) g.hud.setCrosshair('hold');

    // orb glow
    if (this.superGlow && this.superOn) { this.superGlow.scale.setScalar(1 + 0.25 * Math.sin(g.time * 9) + this.glow * 0.8); this.superGlow.material.opacity = 0.45 + 0.25 * Math.sin(g.time * 13); }
    this.glow = Math.max(this.held || this.heldEnemy ? 1 : 0, this.glow - dt * 3);
    if (this.orb) { const s = 1 + this.glow * 0.8 + Math.sin(g.time * 8) * 0.1 * (this.held ? 1 : 0.3); this.orb.scale.setScalar(s); }
  }

  grabEnemy(e) {
    this.heldEnemy = e; e.held = true;
    this.game.audio.play('manipulator_grab', { vol: 0.8, pitch: 1.2 });
    this.loopSnd = this.game.audio.loop('suit_charge_loop', { vol: 0.12, pitch: 1.1 });
    this.glow = 1;
  }

  punt() {
    const g = this.game, p = this.player;
    const o = p.eyePos, d = p.forward;
    this.cool = 0.55;
    p.viewmodel.kick = 1;
    g.audio.play('manipulator_punt', { vol: 0.9 });
    g.fx.emit({ pos: this._muzzle, life: 0.2, size0: 0.4, size1: 0.1, color0: [1, 0.7, 0.3], alpha: 0.9 });
    p.shake(0.015, 0.12);
    const sup = this.superOn;
    if (this.heldEnemy) { this.releaseEnemy({ dir: d, speed: Math.min(SUPER_MAX_SPEED, PUNT_SPEED * SUPER_FORCE) }); return; }
    let target = this.held;
    if (target) this.release(false);
    else target = this.pick(this.range + 4);
    if (target && target.grabbable !== false) {
      const b = target.body;
      b.wakeUp();
      const m = Math.max(1, b.mass);
      const sp = Math.min(sup ? SUPER_MAX_SPEED : 1e9, PUNT_SPEED * (sup ? SUPER_FORCE : 1) * Math.min(1, 0.35 + 22 / (m + 14)));
      // aim at the crosshair's far point so punts land where you look
      b.velocity.set(d.x * sp, d.y * sp + 1.5, d.z * sp);
      b.angularVelocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      target.thrownAt = g.time;
      target.thrownSpeed = sp;
      return;
    }
    // no prop: shove enemies in a short cone
    let hit = false;
    if (sup) {
      const en = this.pickEnemy(this.range);
      if (en) {
        if (en.fling && en.body) en.fling(d, Math.min(SUPER_MAX_SPEED, PUNT_SPEED * SUPER_FORCE));
        else this._superSmash(en);
        return;
      }
    }
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
