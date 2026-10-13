import { Entity } from './Entity.js';

/** Axis-aligned volume. Fires onEnter once (or every entry if !once). */
export class Trigger extends Entity {
  constructor(game, min, max, o = {}) {
    super(game);
    this.min = min; this.max = max;
    this.once = o.once !== false;
    this.onEnter = o.onEnter || null;
    this.onExit = o.onExit || null;
    this.inside = false;
    this.fired = false;
    this.enabled = o.enabled !== false;
  }
  contains(p) {
    return p.x >= this.min[0] && p.x <= this.max[0] && p.y + 0.9 >= this.min[1] && p.y <= this.max[1] && p.z >= this.min[2] && p.z <= this.max[2];
  }
  update() {
    if (!this.enabled) return;
    const now = this.contains(this.game.player.pos);
    if (now && !this.inside && !(this.once && this.fired)) { this.fired = true; if (this.onEnter) this.onEnter(this); }
    if (!now && this.inside && this.onExit) this.onExit(this);
    this.inside = now;
  }
}

/** Continuous damage volume (acid pit, etc.). */
export class HazardZone extends Entity {
  constructor(game, min, max, dps = 15) {
    super(game);
    this.min = min; this.max = max; this.dps = dps; this.t = 0;
  }
  update(dt) {
    const p = this.game.player;
    if (p.pos.x >= this.min[0] && p.pos.x <= this.max[0] && p.pos.y <= this.max[1] && p.pos.y + 1 >= this.min[1] && p.pos.z >= this.min[2] && p.pos.z <= this.max[2]) {
      this.t -= dt;
      if (this.t <= 0) { this.t = 0.4; p.damage(this.dps * 0.4, null, 'acid'); this.game.audio.play('acid_hit', { vol: 0.5 }); }
    }
  }
}
