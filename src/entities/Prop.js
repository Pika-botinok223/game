import * as THREE from 'three';
import { Entity } from './Entity.js';
import { assets } from '../core/Assets.js';

const PRESETS = {
  crate:        { model: 'crate',            hx: 0.45, hy: 0.45, hz: 0.45, mass: 14, hp: 9999 },
  crate_metal:  { model: 'crate',            hx: 0.45, hy: 0.45, hz: 0.45, mass: 22, hp: 9999, modelOpts: { metal: true } },
  crate_small:  { model: 'crate',            hx: 0.3,  hy: 0.3,  hz: 0.3,  mass: 6,  hp: 9999, modelOpts: { size: 0.6 } },
  barrel:       { model: 'barrel',           hx: 0.3,  hy: 0.45, hz: 0.3,  mass: 9,  hp: 9999 },
  barrel_explosive: { model: 'barrel_explosive', hx: 0.3, hy: 0.45, hz: 0.3, mass: 9, hp: 20, explosive: true },
  cart:         { model: 'cart',             hx: 0.78, hy: 0.4,  hz: 0.46, cy: 0.4, mass: 55, hp: 9999, grabbable: false, pushFactor: 0.65 },
  fuse:         { model: 'fuse_cell',        hx: 0.12, hy: 0.2,  hz: 0.12, mass: 2,  hp: 9999 },
  pipe:         { model: 'pipe_straight',    hx: 0.13, hy: 1.0,  hz: 0.13, mass: 10, hp: 9999 },
  locker:       { model: 'locker',           hx: 0.25, hy: 0.95, hz: 0.25, mass: 30, hp: 9999, grabbable: false },
  chair:        { model: 'chair',            hx: 0.28, hy: 0.45, hz: 0.28, mass: 5,  hp: 9999 },
};

export class Prop extends Entity {
  constructor(game, type, x, y, z, o = {}) {
    super(game);
    const P = Object.assign({}, PRESETS[type] || PRESETS.crate, o);
    this.type = type;
    this.hx = P.hx; this.hy = P.hy; this.hz = P.hz;
    this.mass = P.mass;
    this.radius = Math.max(P.hx, P.hy, P.hz) * 1.05;
    this.hp = P.hp;
    this.explosive = !!P.explosive;
    this.pushable = P.pushable !== false;
    this.grabbable = P.grabbable;
    this.pushFactor = P.pushFactor;
    this.held = false;
    this.start = { x, y, z };
    this.name = o.name || type;
    this.lastImpactSound = 0;
    const cy = P.cy !== undefined ? P.cy : P.hy;
    this.cy = cy;
    this.body = game.physics.addDynamicBox({ x, y: y + cy, z, hx: P.hx, hy: P.hy, hz: P.hz, mass: P.mass, rotY: o.rotY || 0 });
    this.pivot = new THREE.Group();
    this.model = assets.model(P.model, P.modelOpts || {});
    this.model.position.y = -cy;
    this.pivot.add(this.model);
    this.pivot.position.copy(this.body.position);
    game.levelRoot.add(this.pivot);
    game.physics.props.push(this);
    game.props = game.physics.props;
    this.body.addEventListener('collide', (e) => this._onCollide(e));
    this.hitCool = new Map();
    this.exploding = false;
  }

  get position() { return this.body.position; }

  _onCollide(e) {
    if (!this.alive) return;
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
    const now = this.game.time;
    if (v > 2.5 && now - this.lastImpactSound > 0.12) {
      this.lastImpactSound = now;
      const key = this.type.startsWith('crate') ? 'metal_impact_1' : this.game.audio.variant('metal_impact', 3);
      this.game.audio.playAt(key, this.body.position, Math.min(1, v / 9), { pitch: this.type.startsWith('crate') ? 0.7 : 1, throttle: 60 });
    }
    if (this.explosive && !this.exploding) {
      const recentlyThrown = this.thrownAt !== undefined && now - this.thrownAt < 5;
      if (v > (recentlyThrown ? 7 : 13)) this.detonate(0.04);
    }
  }

  takeDamage(n, info = {}) {
    if (this.explosive && n > 0) {
      this.hp -= n;
      if (this.hp <= 0) this.detonate(info.type === 'explosion' ? 0.12 + Math.random() * 0.2 : 0.02);
    }
  }

  detonate(delay = 0) {
    if (this.exploding) return;
    this.exploding = true;
    this.fuseT = delay;
  }

  /** hurt anything the prop is flying into */
  _impactDamage(dt) {
    const b = this.body;
    const sp = Math.hypot(b.velocity.x, b.velocity.y, b.velocity.z);
    if (sp < 7 || this.held) return;
    const g = this.game;
    for (const e of g.damageables()) {
      if (!e.alive) continue;
      const c = e.hitCenter();
      const d = Math.hypot(c.x - b.position.x, c.y - b.position.y, c.z - b.position.z);
      if (d > this.radius + (e.hitRadius || 0.4)) continue;
      const last = this.hitCool.get(e) || -9;
      if (g.time - last < 0.5) continue;
      this.hitCool.set(e, g.time);
      const dmg = Math.min(70, sp * 2.4 * Math.min(1.5, 0.5 + this.mass / 20));
      if (this.explosive && this.thrownAt !== undefined && g.time - this.thrownAt < 5) { this.detonate(0); return; }
      e.takeDamage(dmg, { type: 'prop', from: b.position });
      g.audio.playAt('metal_impact_2', b.position, 0.8);
      b.velocity.x *= 0.55; b.velocity.z *= 0.55;
      if (e.shove) e.shove({ x: b.velocity.x, y: 0, z: b.velocity.z }, 0.3);
    }
  }

  update(dt) {
    const b = this.body;
    if (this.exploding) {
      this.fuseT -= dt;
      if (this.fuseT <= 0) { this.alive = false; this._remove(); this.game.explode(this.pivot.position, 5.5, 110, this); return; }
    }
    this.pivot.position.copy(b.position);
    this.pivot.quaternion.copy(b.quaternion);
    if (b.position.y < -25) this.respawn();
    this._impactDamage(dt);
    if (this.update2) this.update2(dt);
  }

  respawn() {
    const s = this.start;
    this.body.position.set(s.x, s.y + this.cy + 0.2, s.z);
    this.body.velocity.set(0, 0, 0); this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.set(0, 0, 0, 1);
  }

  _remove() {
    const g = this.game;
    if (this.held && g.player.weapons.manipulator.held === this) g.player.weapons.manipulator.release(false);
    g.physics.removeBody(this.body);
    const i = g.physics.props.indexOf(this); if (i >= 0) g.physics.props.splice(i, 1);
    this.pivot.parent && this.pivot.parent.remove(this.pivot);
  }
  /** Remove silently (used for fuse snapping etc.) */
  removeFromWorld() { this.alive = false; this._remove(); }
  dispose() { /* level root teardown removes meshes; bodies are dropped with the physics world */ }
}
