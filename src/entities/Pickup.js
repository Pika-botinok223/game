import * as THREE from 'three';
import { Entity } from './Entity.js';
import { assets } from '../core/Assets.js';

const DEFS = {
  medkit:      { model: 'medkit',      scale: 1.3, label: 'MEDKIT' },
  battery:     { model: 'battery',     scale: 1.3, label: 'SUIT BATTERY' },
  wrench:      { model: 'wrench',      scale: 1.6, label: 'HYDRAULIC WRENCH', key: true },
  manipulator: { model: 'manipulator', scale: 1.4, label: 'M-7 FIELD MANIPULATOR', key: true },
  suit:        { model: 'locker',      scale: 0.0, label: 'EVA SUIT', key: true },
};

export class Pickup extends Entity {
  constructor(game, type, x, y, z, o = {}) {
    super(game);
    this.type = type;
    this.def = DEFS[type];
    this.pos = new THREE.Vector3(x, y, z);
    this.onTake = o.onTake || null;
    this.respawn = false;
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    if (this.def.scale > 0) {
      const m = assets.model(this.def.model, { procedural: type === 'manipulator' });
      m.scale.setScalar(this.def.scale);
      this.model = m;
      this.group.add(m);
    }
    if (this.def.key) {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.rotation.x = Math.PI / 2; halo.position.y = 0.05; this.halo = halo; this.group.add(halo);
      this.spot = game.lights.add({ pos: new THREE.Vector3(x, y + 0.6, z), color: 0xffaa44, intensity: 1.2, distance: 5 });
    }
    game.levelRoot.add(this.group);
    this.t = Math.random() * 6;
    this.range = o.range || 1.1;
  }

  update(dt) {
    this.t += dt;
    if (this.model) { this.model.rotation.y += dt * 1.6; this.group.position.y = this.pos.y + 0.18 + Math.sin(this.t * 2) * 0.05; }
    if (this.halo) { this.halo.scale.setScalar(1 + 0.1 * Math.sin(this.t * 3)); this.halo.material.opacity = 0.5 + 0.3 * Math.sin(this.t * 3); }
    const p = this.game.player;
    if (p.dead) return;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, dy = p.pos.y + 0.9 - this.pos.y;
    if (dx * dx + dz * dz < this.range * this.range && Math.abs(dy) < 1.8) this.tryTake(p);
  }

  tryTake(p) {
    const g = this.game;
    switch (this.type) {
      case 'medkit': if (p.health >= p.maxHealth) return; p.heal(25); g.hud.pickupMessage('MEDKIT +25'); break;
      case 'battery': if (p.suit >= 100) return; p.addSuit(25); g.hud.pickupMessage('SUIT BATTERY +25'); break;
      case 'wrench': p.giveWeapon('wrench'); g.hud.pickupMessage('HYDRAULIC WRENCH'); break;
      case 'manipulator': p.giveWeapon('manipulator'); g.hud.pickupMessage('M-7 FIELD MANIPULATOR'); break;
      case 'suit': break;
    }
    g.audio.play(this.def.key ? 'suit_beep' : 'pickup_item', { vol: 0.8 });
    if (this.onTake) this.onTake(this);
    this.alive = false;
    this.group.parent && this.group.parent.remove(this.group);
    if (this.spot) g.lights.remove(this.spot);
  }
}
