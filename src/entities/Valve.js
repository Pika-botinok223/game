import * as THREE from 'three';
import { Entity } from './Entity.js';
import { assets } from '../core/Assets.js';

/** Hold-E propellant valve. Faces +Z by default (rotY orients it). */
export class Valve extends Entity {
  constructor(game, o) {
    super(game);
    const { x, y, z, rotY = 0, duration = 2.6, onDone = null, label = 'VALVE' } = o;
    this.usable = true; this.holdUse = true;
    this.prompt = 'HOLD TO TURN VALVE';
    this.duration = duration; this.progress = 0; this.done = false; this.onDone = onDone;
    this.pos = new THREE.Vector3(x, y, z);
    this.group = new THREE.Group();
    this.group.position.set(x, y, z); this.group.rotation.y = rotY;
    // pipe stub the wheel is mounted on
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.8, 14), assets.material('rust_metal', { metalness: 0.6 }));
    pipe.position.set(0, 0, -0.25); pipe.rotation.x = Math.PI / 2; pipe.scale.set(1, 1, 1);
    this.group.add(pipe);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3), assets.material(null, { color: 0x30363c, metalness: 0.6, roughness: 0.5 }));
    body.position.set(0, 0, -0.05); this.group.add(body);
    this.model = assets.model('valve_wheel');
    this.model.scale.setScalar(1.35);
    this.model.position.set(0, -0.45, 0.05);
    this.group.add(this.model);
    this.wheel = this.model.getObjectByName('wheel') || this.model;
    // status lamp
    this.lampMat = new THREE.MeshBasicMaterial({ color: 0xff3322 });
    this.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), this.lampMat);
    this.lamp.position.set(0.3, 0.3, 0.1); this.group.add(this.lamp);
    game.levelRoot.add(this.group);
    this.spot = game.lights.add({ pos: new THREE.Vector3(x, y + 0.2, z).add(new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).multiplyScalar(0.7)), color: 0xff5533, intensity: 1.0, distance: 5 });
    this.snd = null; this.turning = false; this.useRange = 2.5;
  }
  usePos() { return this.pos; }
  canUse() { return !this.done; }
  onUse() {}
  onHold(dt) {
    if (this.done) return;
    this.progress += dt / this.duration;
    this.wheel.rotation.z -= dt * 3.2;
    this.turning = 0.15;
    if (!this.snd) this.snd = this.game.audio.play('valve_turn', { vol: 0.8, pos: this.pos, loop: true, throttle: 0 });
    if (this.progress >= 1) this.finish();
  }
  finish() {
    this.done = true; this.progress = 1;
    this.lampMat.color.setHex(0x33ff66);
    this.spot.color.setHex(0x33ff66);
    this.stopSnd();
    this.game.audio.playAt('button_press', this.pos, 1);
    this.game.audio.playAt('metal_impact_1', this.pos, 0.8);
    if (this.onDone) this.onDone(this);
  }
  stopSnd() { if (this.snd) { this.snd.stop(0.1); this.snd = null; } }
  update(dt) {
    if (this.turning > 0) { this.turning -= dt; if (this.turning <= 0) this.stopSnd(); }
    else if (!this.done && this.progress > 0) this.progress = Math.max(0, this.progress - dt * 0.5);
  }
  dispose() { this.stopSnd(); }
}
