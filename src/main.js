import { Game } from './Game.js';
import { assets } from './core/Assets.js';
import { hasProcTexture } from './render/ProcTextures.js';
import { PROC_MODELS } from './render/ProcModels.js';

const game = new Game();
window.__game = {
  game,
  assets, hasProcTexture, PROC_MODELS,
  get chapter() { return game.chapter; },
  get state() { return game.state; },
  get health() { return game.player.health; },
  get suit() { return game.player.suit; },
  get objective() { return game.objective ? game.objective.text : null; },
  get errors() { return game._errCount || 0; },
  get lastError() { return window.__lastError || null; },
  get playerPos() { const p = game.player.pos; return { x: p.x, y: p.y, z: p.z }; },
  get entities() { return game.entities.length; },
  // cheats / console state (tests/cheats.mjs)
  get god() { return game.godMode; },
  get noclip() { return game.player.noclip; },
  get svCheats() { return game.svCheats; },
  get cheats() { return { god: game.godMode, noclip: game.player.noclip, ...game.cheats }; },
  get weapons() { return { wrench: !!game.player.has.wrench, manipulator: !!game.player.has.manipulator }; },
  get enemiesAlive() { return game.enemies.filter((e) => !e.isDead).length; },
  get timescale() { return game.timescale; },
  get gravity() { return game.gravityUnits; },
  get consoleOpen() { return game.console.open; },
  get locked() { return game.input.locked; },
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
