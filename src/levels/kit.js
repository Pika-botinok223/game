// Shared level props: signs, beacons, consoles, vents, pipes, glass.
import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { makeTextTexture } from '../render/ProcTextures.js';
import { Entity } from '../entities/Entity.js';
import { Prop } from '../entities/Prop.js';

/** Flat text sign. rotY: 0 faces +Z. */
export function sign(game, text, x, y, z, w, h, rotY = 0, o = {}) {
  const lines = Array.isArray(text) ? text : [text];
  const tex = makeTextTexture(lines, { w: o.pw || 512, h: Math.round((o.pw || 512) * h / w), bg: o.bg || '#0f1a24', fg: o.fg || '#ffb22e', font: o.font || `bold ${Math.round((o.pw || 512) / 9)}px "Courier New", monospace`, border: o.border === undefined ? o.fg || '#ffb22e' : o.border });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: true }));
  m.position.set(x, y, z); m.rotation.y = rotY;
  game.levelRoot.add(m);
  return m;
}

/** Rotating emergency beacon with a red light. */
export class Beacon extends Entity {
  constructor(game, x, y, z, color = 0xff2200, speed = 3, intensity = 7) {
    super(game);
    this.color = color;
    this.group = new THREE.Group(); this.group.position.set(x, y, z);
    this.group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0x222222 })));
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3a1a }));
    this.dome.position.y = 0.05; this.group.add(this.dome);
    game.levelRoot.add(this.group);
    this.spot = game.lights.add({ pos: new THREE.Vector3(x, y - 0.3, z), color, intensity, distance: 11 });
    this.base = intensity; this.speed = speed; this.t = Math.random() * 6; this.on = true;
  }
  update(dt) {
    this.t += dt * this.speed;
    const k = this.on ? Math.max(0, Math.sin(this.t)) ** 2 : 0;
    this.spot.intensity = this.base * (0.1 + 0.9 * k);
    this.dome.material.color.setRGB(0.2 + 0.8 * k, 0.03 + 0.1 * k, 0.02);
  }
}

export function consoleDesk(game, x, z, rotY = 0, y = 0) {
  const m = assets.model('computer_console');
  m.position.set(x, y, z); m.rotation.y = rotY;
  game.levelRoot.add(m);
  return m;
}

/** Glass pane: see-through, solid for the player, doesn't block sight. */
export function glass(b, x0, y0, z0, x1, y1, z1, o = {}) {
  const w = Math.abs(x1 - x0) || 0.06, h = Math.abs(y1 - y0), d = Math.abs(z1 - z0) || 0.06;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), assets.material('glass_dirty', { transparent: true, opacity: o.opacity || 0.35, color: o.color || 0xaaddff, roughness: 0.1, metalness: 0.2 }));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  b.game.levelRoot.add(m);
  b.box(x0, y0, z0, x1, y1, z1, null, { visible: false, sight: false, surface: 'metal' });
  return m;
}

/** Decorative cylinder (pipes, silos, tanks) - optionally solid. axis: 'x'|'y'|'z' */
export function cylinder(b, x, y, z, r, len, axis = 'y', tex = 'metal_wall', o = {}) {
  const geo = new THREE.CylinderGeometry(r, r, len, o.seg || 20, 1, !!o.open);
  const m = new THREE.Mesh(geo, assets.material(tex, { metalness: 0.5, roughness: 0.55, color: o.color !== undefined ? o.color : 0xffffff, ...(o.mat || {}) }));
  m.position.set(x, y, z);
  if (axis === 'x') m.rotation.z = Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2;
  b.game.levelRoot.add(m);
  if (o.collide) {
    const hx = axis === 'x' ? len / 2 : r, hy = axis === 'y' ? len / 2 : r, hz = axis === 'z' ? len / 2 : r;
    b.box(x - hx, y - hy, z - hz, x + hx, y + hy, z + hz, null, { visible: false, surface: 'metal' });
  }
  return m;
}

/** Ceiling pipe bundle along an axis (visual only). */
export function pipeRun(b, x0, y, z0, x1, z1, n = 3, spacing = 0.28, r = 0.1, tex = 'rust_metal') {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * spacing;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), assets.material(tex, { metalness: 0.6, color: i % 2 ? 0xffffff : 0x9aa7b0 }));
    if (alongX) { m.rotation.z = Math.PI / 2; m.position.set((x0 + x1) / 2, y, z0 + off); } else { m.rotation.x = Math.PI / 2; m.position.set(x0 + off, y, (z0 + z1) / 2); }
    b.game.levelRoot.add(m);
  }
}

/** Floor vent grate that can burst open (visual). */
export class Vent extends Entity {
  constructor(game, x, y, z, size = 1.0) {
    super(game);
    this.pos = new THREE.Vector3(x, y, z);
    this.group = new THREE.Group(); this.group.position.set(x, y + 0.02, z);
    this.hole = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.55, size * 0.6, 0.04, 14), assets.material('cell_flesh', { emissive: 0x33ff66, emissiveIntensity: 0.35, color: 0xcc7799 }));
    this.grate = new THREE.Mesh(new THREE.BoxGeometry(size, 0.05, size), assets.material('gen_grate', { transparent: true, side: THREE.DoubleSide }));
    this.grate.position.y = 0.04;
    this.group.add(this.hole, this.grate);
    this.burst = false; this.vel = new THREE.Vector3(); this.spin = new THREE.Vector3();
    game.levelRoot.add(this.group);
  }
  /** blast the grate off and spawn a crawler or spitter via callback */
  open() {
    if (this.burst) return;
    this.burst = true;
    this.vel.set((Math.random() - 0.5) * 2, 7, (Math.random() - 0.5) * 2);
    this.spin.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.game.audio.playAt('metal_impact_2', this.pos, 1);
    this.game.sparks(this.pos, 12);
    for (let i = 0; i < 10; i++) this.game.smoke.emit({ pos: this.pos, vel: { x: (Math.random() - 0.5) * 2, y: 1 + Math.random() * 2, z: (Math.random() - 0.5) * 2 }, life: 1.5, size0: 0.4, size1: 1.4, color0: [0.4, 0.38, 0.35], color1: [0.15, 0.15, 0.15], alpha: 0.5 });
  }
  update(dt) {
    if (!this.burst || this.grate.position.y < -5) return;
    this.vel.y -= 18 * dt;
    this.grate.position.addScaledVector(this.vel, dt);
    this.grate.rotation.x += this.spin.x * dt; this.grate.rotation.z += this.spin.z * dt;
    if (this.grate.position.y < 0.0 && this.vel.y < 0) { this.vel.y *= -0.3; this.vel.x *= 0.5; this.vel.z *= 0.5; this.spin.multiplyScalar(0.5); if (Math.abs(this.vel.y) < 0.5) this.grate.position.y = -10; }
  }
}

/** Standard small supply cluster. */
export function supplies(game, Pickup, x, y, z, kind = 'medkit') { return new Pickup(game, kind, x, y, z); }

export function crateStack(game, x, z, nx = 1, nz = 1, ny = 1, type = 'crate', y0 = 0, gap = 0.02) {
  const out = [];
  for (let k = 0; k < ny; k++) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    out.push(game.add(new Prop(game, type, x + i * (0.9 + gap), y0 + 0.01 + k * (0.9 + gap), z + j * (0.9 + gap))));
  }
  return out;
}
