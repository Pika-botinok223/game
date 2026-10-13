import * as THREE from 'three';
import { Entity } from './Entity.js';
import { Animator } from './Animator.js';
import { assets } from '../core/Assets.js';

/** Simple speaking figure: idles, turns its head/body to follow the player. Optionally talkable with E. */
export class NPC extends Entity {
  constructor(game, kind, x, y, z, o = {}) {
    super(game);
    this.kind = kind;
    this.pos = new THREE.Vector3(x, y, z);
    this.model = assets.model(kind === 'brooks' ? 'npc_guard' : kind === 'overseer' ? 'npc_overseer' : 'npc_scientist');
    this.group = new THREE.Group();
    this.group.add(this.model);
    this.group.position.copy(this.pos);
    this.yaw = o.yaw || 0;
    this.group.rotation.y = this.yaw;
    this.parts = this.model.userData || {};
    this.anim = new Animator(this.model);
    this.anim.play(/idle|stand/);
    this.follow = o.follow !== false;
    this.t = Math.random() * 10;
    this.usable = !!o.onUse;
    this.onUseCb = o.onUse || null;
    this.prompt = o.prompt || 'TALK';
    this.useRange = 2.4;
    this.vanishWhenWatched = !!o.vanish;
    this.sitting = !!o.sitting;
    game.levelRoot.add(this.group);
  }
  usePos() { return { x: this.pos.x, y: this.pos.y + 1.4, z: this.pos.z }; }
  canUse() { return !!this.onUseCb; }
  onUse() { if (this.onUseCb) this.onUseCb(this); }
  setOnUse(fn) { this.onUseCb = fn; this.usable = !!fn; }

  update(dt) {
    this.t += dt;
    const p = this.game.player;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (this.follow && dist < 9) {
      const target = Math.atan2(dx, dz);
      let dy = target - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * 2.5);
      this.group.rotation.y = this.yaw;
    }
    const pt = this.parts;
    if (pt.armL && !this.anim.active) {
      const talk = this.talking ? 1 : 0;
      pt.armL.rotation.x = Math.sin(this.t * 1.2) * 0.04 + (talk ? Math.sin(this.t * 5) * 0.25 - 0.4 : 0);
      pt.armR.rotation.x = Math.sin(this.t * 1.1 + 1) * 0.04;
      if (pt.head) { pt.head.rotation.x = Math.sin(this.t * 0.7) * 0.03; }
      this.model.position.y = Math.sin(this.t * 1.5) * 0.004;
    }
    this.anim.update(dt);
    if (this.vanishWhenWatched) {
      // G-Man style: disappears once the player has been looking at him for a while, or gets near
      const toN = new THREE.Vector3(this.pos.x - p.eyePos.x, 0, this.pos.z - p.eyePos.z);
      const d = toN.length();
      toN.normalize();
      const f = p.forward;
      const dot = f.x * toN.x + f.z * toN.z;
      this.watch = (this.watch || 0) + (dot > 0.93 ? dt : 0);
      if (this.watch > 3.0 || d < 6) { this.alive = false; this.group.parent && this.group.parent.remove(this.group); }
    }
  }
}
