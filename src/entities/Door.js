import * as THREE from 'three';
import { Entity } from './Entity.js';
import { assets } from '../core/Assets.js';

/**
 * Sliding blast door. (x,y,z) = bottom centre; w = width along `axis` ('x' door spans X, wall runs along X),
 * h = height, d = thickness. Slides upward. Optional auto-open.
 */
export class Door extends Entity {
  constructor(game, o) {
    super(game);
    const { x, y = 0, z, w = 2, h = 2.6, d = 0.3, axis = 'x', locked = false, auto = false, tex = 'metal_plate', speed = 2.2, silent = false } = o;
    this.w = w; this.h = h; this.d = d; this.axis = axis; this.base = { x, y, z };
    this.locked = locked; this.auto = auto; this.speed = speed; this.silent = silent;
    this.open = 0; this.target = 0; // 0..1
    const sx = axis === 'x' ? w : d, sz = axis === 'x' ? d : w;
    const geo = new THREE.BoxGeometry(sx, h, sz);
    const mat = assets.material(tex, { metalness: 0.5, roughness: 0.5 });
    this.mesh = new THREE.Mesh(geo, mat);
    // hazard stripes on the leading edge
    const strip = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.02, 0.25, sz + 0.02), assets.material('hazard_stripes', {}));
    strip.position.y = -h / 2 + 0.12;
    this.mesh.add(strip);
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    // indicator light
    this.ind = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: locked ? 0xff2a1a : 0x33ff66 }));
    this.ind.position.set(axis === 'x' ? w / 2 + 0.2 : d / 2 + 0.25, 1.5 - y, axis === 'x' ? d / 2 + 0.25 : w / 2 + 0.2);
    this.ind.position.set(axis === 'x' ? w / 2 + 0.25 : 0, 1.6, axis === 'x' ? 0 : w / 2 + 0.25);
    this.group.add(this.ind);
    this.group.position.set(x, y, z);
    this.mesh.position.y = h / 2;
    game.levelRoot.add(this.group);
    this.box = game.statics.add(x - sx / 2, y, z - sz / 2, x + sx / 2, y + h, z + sz / 2, { surface: 'metal' });
    this.body = game.physics.addStaticBox(x - sx / 2, y, z - sz / 2, x + sx / 2, y + h, z + sz / 2);
    this.pos = new THREE.Vector3(x, y + h / 2, z);
    this.onOpened = null;
    this.startY = y;
    this.snd = null;
  }

  setLocked(l) {
    this.locked = l;
    this.ind.material.color.setHex(l ? 0xff2a1a : 0x33ff66);
  }
  openDoor() {
    if (this.target === 1) return;
    this.target = 1;
    if (!this.silent) this.game.audio.playAt('door_open', this.pos, 0.9, { throttle: 0 });
  }
  closeDoor() {
    if (this.target === 0) return;
    this.target = 0;
    if (!this.silent) this.game.audio.playAt('door_close', this.pos, 0.9, { throttle: 0 });
  }
  get isOpen() { return this.open > 0.95; }

  update(dt) {
    if (this.auto && !this.locked) {
      const p = this.game.player.pos;
      const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
      if (d < 3.4) this.openDoor(); else if (d > 5 && !this.forceOpen) this.closeDoor();
    }
    if (this.open === this.target) return;
    const dir = Math.sign(this.target - this.open);
    this.open = Math.max(0, Math.min(1, this.open + dir * dt * this.speed / this.h));
    const lift = this.open * (this.h - 0.05);
    this.group.position.y = this.startY + lift;
    this.ind.position.y = 1.6 - lift;
    const b = this.box;
    // keep the collider where the panel is (it also stops moving once fully open)
    b.minY = this.startY + lift; b.maxY = this.startY + this.h + lift;
    b.enabled = this.open < 0.97;
    this.body.position.y = this.startY + this.h / 2 + lift;
    if (!b.enabled) this.body.position.y = -500;
    if (this.open === this.target && this.target === 1 && this.onOpened) { const f = this.onOpened; this.onOpened = null; f(); }
  }
}
