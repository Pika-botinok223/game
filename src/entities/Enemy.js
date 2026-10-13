import * as THREE from 'three';
import { Entity } from './Entity.js';

/** Shared base for Crawler / Spitter / Nest. */
export class Enemy extends Entity {
  constructor(game) {
    super(game);
    this.isDead = false;
    this.hp = 30;
    this.hitRadius = 0.4;
    this.metal = false;
    this.removeT = 0;
    game.enemies.push(this);
  }
  hitCenter() { return this.center || this.pos; }
  takeDamage() {}
  playerDist() { const p = this.game.player.pos, c = this.pos; return Math.hypot(p.x - c.x, p.z - c.z); }
  dispose() { const i = this.game.enemies.indexOf(this); if (i >= 0) this.game.enemies.splice(i, 1); }
}

export function steer(game, pos, dx, dz, dist = 1.1, y = 0.25) {
  // returns an adjusted unit direction that avoids walls directly ahead
  const probe = (ax, az) => { const hit = game.statics.raycast(pos.x, pos.y + y, pos.z, ax, 0, az, dist); return hit ? hit.t : dist; };
  const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
  const f = probe(dx, dz);
  if (f >= dist) return [dx, dz];
  const ca = Math.cos(0.7), sa = Math.sin(0.7);
  const lx = dx * ca - dz * sa, lz = dx * sa + dz * ca;
  const rx = dx * ca + dz * sa, rz = -dx * sa + dz * ca;
  const l = probe(lx, lz), r = probe(rx, rz);
  if (l > r) return [lx, lz];
  return [rx, rz];
}
