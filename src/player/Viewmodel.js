import * as THREE from 'three';
import { assets } from '../core/Assets.js';

/** First-person weapon rig rendered in its own scene so it never clips into walls. */
export class Viewmodel {
  constructor(game) {
    this.game = game;
    this.cam = game.renderer.viewCamera;
    game.renderer.viewScene.add(this.cam);
    this.root = new THREE.Group();
    this.cam.add(this.root);
    this.bob = new THREE.Group();
    this.root.add(this.bob);
    this.sway = new THREE.Vector2();
    this.raise = 0;            // 0 = lowered, 1 = ready
    this.raiseTarget = 0;
    this.kick = 0;
    this.visible = true;
    this.slots = {};
    this.t = 0;
  }

  /** Build an arm+glove group (HEV-orange sleeve, dark glove). */
  static arm(side = 1) {
    const g = new THREE.Group();
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.42), new THREE.MeshStandardMaterial({ color: 0xc8641a, roughness: 0.6, metalness: 0.2 }));
    sleeve.position.z = 0.2;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.095, 0.05), new THREE.MeshStandardMaterial({ color: 0x1e2226, roughness: 0.5, metalness: 0.5 }));
    band.position.z = 0.0;
    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.07, 0.11), new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.8 }));
    glove.position.z = -0.08;
    g.add(sleeve, band, glove);
    return g;
  }

  attach(name, group) { this.slots[name] = group; group.visible = false; this.bob.add(group); }
  show(name, on) { if (this.slots[name]) this.slots[name].visible = on; }

  update(dt, player, speed) {
    this.t += dt;
    const g = this.game;
    this.raise += (this.raiseTarget - this.raise) * Math.min(1, dt * 10);
    // sway toward -mouse velocity
    const mx = player.mouseDX || 0, my = player.mouseDY || 0;
    this.sway.x += (-mx * 0.0006 - this.sway.x) * Math.min(1, dt * 8);
    this.sway.y += (my * 0.0006 - this.sway.y) * Math.min(1, dt * 8);
    this.sway.x = THREE.MathUtils.clamp(this.sway.x, -0.04, 0.04);
    this.sway.y = THREE.MathUtils.clamp(this.sway.y, -0.04, 0.04);
    const ph = player.bobPhase, amt = player.bobAmt;
    this.kick *= Math.max(0, 1 - 9 * dt);
    this.bob.position.set(
      this.sway.x + Math.sin(ph) * 0.012 * amt,
      this.sway.y + Math.sin(ph * 2) * 0.01 * amt - (1 - this.raise) * 0.35 + Math.sin(this.t * 1.3) * 0.002,
      this.kick * 0.06,
    );
    this.bob.rotation.set(this.kick * 0.1 - (1 - this.raise) * 0.5, this.sway.x * 2, 0);
  }
}
