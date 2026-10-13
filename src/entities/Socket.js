import * as THREE from 'three';
import { Entity } from './Entity.js';
import { assets } from '../core/Assets.js';

/** Fuse-cell socket: release a fuse prop near it and it snaps in, firing onFilled. */
export class Socket extends Entity {
  constructor(game, x, y, z, rotY = 0, onFilled = null) {
    super(game);
    this.pos = new THREE.Vector3(x, y, z);
    this.filled = false; this.onFilled = onFilled;
    this.group = new THREE.Group();
    this.group.position.set(x, y, z); this.group.rotation.y = rotY;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.12), assets.material('metal_wall', { color: 0xbfc7cc, metalness: 0.5 }));
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 14), assets.material(null, { color: 0x080a0c }));
    hole.rotation.x = Math.PI / 2; hole.position.z = 0.08;
    this.lampMat = new THREE.MeshBasicMaterial({ color: 0xff3322 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), this.lampMat); lamp.position.set(0, 0.32, 0.08);
    this.group.add(plate, hole, lamp);
    game.levelRoot.add(this.group);
    this.spot = game.lights.add({ pos: new THREE.Vector3(x, y + 0.3, z).add(new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).multiplyScalar(0.5)), color: 0xff3322, intensity: 0.9, distance: 4 });
    // snap point slightly in front of the plate
    this.snap = new THREE.Vector3(x, y, z).add(new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)).multiplyScalar(0.2));
    this.rotY = rotY;
  }
  update() {
    if (this.filled) return;
    for (const p of this.game.physics.props) {
      if (p.type !== 'fuse' || !p.alive) continue;
      const d = p.body.position.distanceTo(this.snap);
      if (d < 0.95) { this.fill(p); break; }
    }
  }
  fill(prop) {
    this.filled = true;
    prop.removeFromWorld();
    const m = assets.model('fuse_cell');
    m.rotation.x = Math.PI / 2; m.position.set(0, 0.1, 0.2 + 0.0);
    // model base-origin -> lay it into the hole pointing out of the wall
    m.position.set(0, 0, 0.08); m.scale.setScalar(0.8);
    const holder = new THREE.Group(); holder.add(m); m.rotation.set(Math.PI / 2, 0, 0); m.position.set(0, 0, -0.1);
    this.group.add(holder);
    this.lampMat.color.setHex(0x33ff66);
    this.spot.color.setHex(0x33ff66);
    this.game.audio.playAt('button_press', this.pos, 1);
    this.game.audio.playAt('spark_1', this.pos, 1);
    this.game.sparks(this.snap, 14);
    if (this.onFilled) this.onFilled(this);
  }
}
