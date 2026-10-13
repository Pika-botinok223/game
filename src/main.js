import { Game } from './Game.js';

const game = new Game();
window.__game = {
  game,
  get chapter() { return game.chapter; },
  get state() { return game.state; },
  get health() { return game.player.health; },
  get suit() { return game.player.suit; },
  get objective() { return game.objective ? game.objective.text : null; },
  get errors() { return game._errCount || 0; },
  get lastError() { return window.__lastError || null; },
  get playerPos() { const p = game.player.pos; return { x: p.x, y: p.y, z: p.z }; },
  get entities() { return game.entities.length; },
  skipTo(n) { return game.startChapter(n); },
  completeObjective() {
    const o = game.objective;
    if (o && o.skip) { o.skip(); return true; }
    return false;
  },
  setGod(v) { game.godMode = !!v; },
  teleport(x, y, z) { game.player.pos.x = x; game.player.pos.y = y; game.player.pos.z = z; },
  look(yaw, pitch) { game.player.yaw = yaw; game.player.pitch = pitch; },
};
game.boot().catch((e) => { console.error('boot failed', e); window.__bootError = String(e && e.stack || e); });
