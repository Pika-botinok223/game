import * as THREE from 'three';
import { Entity } from './Entity.js';
import { assets } from '../core/Assets.js';

/** Wall-mounted health / suit charger. Hold E while looking at it. rotY orients the front (+Z local). */
export class Charger extends Entity {
  constructor(game, kind, x, y, z, rotY = 0) {
    super(game);
    this.kind = kind; // 'health' | 'suit'
    this.usable = true; this.holdUse = true;
    this.prompt = kind === 'health' ? 'HOLD TO USE HEALTH CHARGER' : 'HOLD TO USE SUIT CHARGER';
    this.capacity = this.max = kind === 'health' ? 60 : 75;
    this.pos = new THREE.Vector3(x, y, z);
    this.useRange = 2.6;
    const col = kind === 'health' ? 0x39e86a : 0x38b8ff;
    this.color = col;
    this.group = new THREE.Group();
    this.group.position.set(x, y, z); this.group.rotation.y = rotY;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.0, 0.12), assets.material('metal_wall', { color: 0xbfc7cc, metalness: 0.5 }));
    this.group.add(plate);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 14, 1, true), assets.material(null, { color: col, transparent: true, opacity: 0.35, emissive: col, emissiveIntensity: 0.8, side: THREE.DoubleSide }));
    tube.position.set(0, 0.05, 0.1); this.group.add(tube);
    this.fillMat = new THREE.MeshBasicMaterial({ color: col });
    this.fill = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.68, 12), this.fillMat);
    this.fill.position.set(0, 0.05, 0.1); this.group.add(this.fill);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(kind === 'health' ? 0.2 : 0.16, 0.06, 0.02), assets.material(null, { color: 0xffffff, emissive: col, emissiveIntensity: 1 }));
    cross.position.set(0, 0.42, 0.07); this.group.add(cross);
    if (kind === 'health') { const c2 = cross.clone(); c2.rotation.z = Math.PI / 2; this.group.add(c2); }
    game.levelRoot.add(this.group);
    this.spot = game.lights.add({ pos: new THREE.Vector3(x, y, z).add(new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).multiplyScalar(0.6)), color: col, intensity: 0.8, distance: 4 });
    this.snd = null; this.active = 0; this.acc = 0;
  }
  usePos() { return this.pos; }
  canUse() { return true; }
  onUse() { if (this.capacity <= 0) this.game.audio.play('button_denied', { vol: 0.7 }); }
  onHold(dt) {
    const p = this.game.player;
    if (this.capacity <= 0) return;
    const need = this.kind === 'health' ? p.maxHealth - p.health : 100 - p.suit;
    if (need <= 0) return;
    this.active = 0.12;
    this.acc += dt * 28;
    while (this.acc >= 1 && this.capacity > 0) {
      this.acc -= 1;
      const got = this.kind === 'health' ? p.heal(1) : p.addSuit(1);
      if (got <= 0) break;
      this.capacity -= 1;
    }
    if (!this.snd) this.snd = this.game.audio.play(this.kind === 'health' ? 'health_charge_loop' : 'suit_charge_loop', { vol: 0.5, loop: true, pos: this.pos, throttle: 0 });
    if (this.capacity <= 0) { this.game.audio.play('suit_beep', { vol: 0.5 }); this.fillMat.color.setHex(0x552222); this.spot.color.setHex(0xff3322); }
  }
  update(dt) {
    if (this.active > 0) { this.active -= dt; if (this.active <= 0 && this.snd) { this.snd.stop(0.15); this.snd = null; } }
    const f = Math.max(0.02, this.capacity / this.max);
    this.fill.scale.y = f; this.fill.position.y = 0.05 - 0.34 * (1 - f);
  }
  dispose() { if (this.snd) this.snd.stop(0.05); }
}
