import * as THREE from 'three';
import { Entity } from './Entity.js';
import { assets } from '../core/Assets.js';

/** Wall / console push button. Faces +Z by default; use `rotY` to orient. */
export class Button extends Entity {
  constructor(game, o) {
    super(game);
    const { x, y, z, rotY = 0, big = false, color = 0xff2222, prompt = 'PRESS', onPress = null, once = false } = o;
    this.usable = true;
    this.prompt = prompt;
    this.onPress = onPress;
    this.once = once;
    this.disabled = false;
    this.pos = new THREE.Vector3(x, y, z);
    this.group = new THREE.Group();
    this.group.position.set(x, y, z);
    this.group.rotation.y = rotY;
    const size = big ? 0.28 : 0.12;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(size * 1.35, size * 1.45, 0.06, 20), assets.material(null, { color: 0x20262b, metalness: 0.7, roughness: 0.4 }));
    base.rotation.x = Math.PI / 2; base.position.z = 0.03;
    this.capMat = assets.material(null, { color, emissive: color, emissiveIntensity: 1.0 });
    this.cap = new THREE.Mesh(new THREE.CylinderGeometry(size, size, 0.07, 20), this.capMat);
    this.cap.rotation.x = Math.PI / 2; this.cap.position.z = 0.08;
    this.group.add(base, this.cap);
    if (big) {
      const guard = new THREE.Mesh(new THREE.TorusGeometry(size * 1.5, 0.02, 6, 24), assets.material('hazard_stripes', {}));
      guard.position.z = 0.06; this.group.add(guard);
    }
    game.levelRoot.add(this.group);
    this.spot = game.lights.add({ pos: new THREE.Vector3(x, y, z).add(new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).multiplyScalar(0.6)), color, intensity: 0.6, distance: 3 });
    this.pressT = 0;
    this.useRange = o.range || 2.6;
  }
  usePos() { return this.pos; }
  canUse() { return !this.disabled; }
  setDisabled(d) { this.disabled = d; this.capMat.emissiveIntensity = d ? 0.1 : 1.0; this.spot.enabled = !d; }
  onUse() {
    if (this.disabled) { this.game.audio.play('button_denied'); return; }
    this.game.audio.playAt('button_press', this.pos, 1);
    this.pressT = 0.25;
    if (this.once) this.setDisabled(true);
    if (this.onPress) this.onPress(this);
  }
  update(dt) {
    if (this.pressT > 0) { this.pressT -= dt; this.cap.position.z = 0.08 - 0.05 * Math.min(1, this.pressT * 8); }
    else this.cap.position.z = 0.08;
    if (!this.disabled) this.capMat.emissiveIntensity = 0.8 + 0.3 * Math.sin(this.game.time * 3);
  }
}
