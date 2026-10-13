export class Entity {
  constructor(game) { this.game = game; this.alive = true; this.usable = false; }
  update(dt) {}
  dispose() {}
  /** remove from the game */
  kill() { this.alive = false; }
}
