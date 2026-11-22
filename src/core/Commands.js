// Source-style console command registry + every built-in command.
// A command is { name, aliases, help, usage, cheat, handler(args, ctx) }.
// ctx = { game, console, raw, print(text), error(text), ok(text) }  (ok = amber "cheat confirmation" colour)
import { REVISION } from 'three';
import { Settings } from './Settings.js';
import { CHAPTERS } from '../story/lines.js';
import { Crawler } from '../entities/Crawler.js';
import { Spitter } from '../entities/Spitter.js';
import { Prop } from '../entities/Prop.js';
import pkg from '../../package.json';

export const CHEAT_REFUSAL = (name) => `Can't use cheat command '${name}' in multiplayer, unless the server has sv_cheats set to 1.`;

export class CommandRegistry {
  constructor() { this.map = new Map(); this.commands = []; }

  register(def) {
    const cmd = { aliases: [], help: '', usage: '', cheat: false, ...def };
    this.commands.push(cmd);
    this.map.set(cmd.name.toLowerCase(), cmd);
    for (const a of cmd.aliases) this.map.set(a.toLowerCase(), cmd);
    return cmd;
  }
  find(name) { return this.map.get(String(name).toLowerCase()) || null; }
  /** every typed name (commands and aliases), sorted */
  names() { return [...this.map.keys()].sort(); }
  complete(prefix) { const p = prefix.toLowerCase(); return this.names().filter((n) => n.startsWith(p)); }

  /** Run one console line. Returns true when a command ran. */
  execute(line, ctx) {
    const text = line.trim();
    if (!text) return false;
    const m = text.match(/^(\S+)\s*(.*)$/);
    const name = m[1].toLowerCase();
    const raw = m[2];
    const args = raw ? raw.split(/\s+/) : [];
    const cmd = this.find(name);
    if (!cmd) { ctx.error(`Unknown command "${name}"`); return false; }
    if (cmd.cheat && !ctx.game.svCheats) { ctx.error(CHEAT_REFUSAL(name)); return false; }
    try {
      cmd.handler(args, { ...ctx, raw });
    } catch (e) {
      console.error(e);
      ctx.error(`${name}: ${e && e.message ? e.message : e}`);
    }
    return true;
  }
}

// ---------------------------------------------------------------------------------------------- helpers
const flag = (v) => (v === undefined ? null : /^(1|on|true|yes)$/i.test(v) ? true : /^(0|off|false|no)$/i.test(v) ? false : null);
const ONOFF = (b) => (b ? 'ON' : 'OFF');
const inGame = (game) => game.state === 'playing' || game.state === 'paused' || game.state === 'dead';

const MAPS = { inbound: 1, core: 2, containment: 3, pad39: 4, pad_39: 4, pad: 4 };

/** floor height / free position about 3 m in front of the player (stops short of walls). */
function frontSpot(game, dist = 3) {
  const p = game.player;
  const dx = -Math.sin(p.yaw), dz = -Math.cos(p.yaw);
  let d = dist;
  const hit = game.statics.raycast(p.pos.x, p.pos.y + 1.0, p.pos.z, dx, 0, dz, dist + 0.4, true);
  if (hit) d = Math.max(0.8, hit.t - 0.5);
  const x = p.pos.x + dx * d, z = p.pos.z + dz * d;
  const fl = game.statics.raycast(x, p.pos.y + 1.2, z, 0, -1, 0, 6);
  const y = fl ? p.pos.y + 1.2 - fl.t : p.pos.y;
  return { x, y, z, yaw: Math.atan2(-dx, -dz) };
}

const SPAWNS = {
  crawler: (g, s) => g.add(new Crawler(g, s.x, s.y + 0.05, s.z, { aggro: true })),
  spitter: (g, s) => g.add(new Spitter(g, s.x, s.y, s.z, { yaw: s.yaw })),
  crate: (g, s) => g.add(new Prop(g, 'crate', s.x, s.y + 0.02, s.z)),
  barrel: (g, s) => g.add(new Prop(g, 'barrel', s.x, s.y + 0.02, s.z)),
  barrel_explosive: (g, s) => g.add(new Prop(g, 'barrel_explosive', s.x, s.y + 0.02, s.z)),
};
const SPAWN_ALIAS = { explosive_barrel: 'barrel_explosive', barrel_exp: 'barrel_explosive', crate_wood: 'crate' };

const GIVE = ['wrench', 'manipulator', 'medkit', 'battery', 'health', 'suit'];

/** Build the registry with every command bound to `game`. */
export function createRegistry(game) {
  const R = new CommandRegistry();
  const cvar = (ctx, name, value) => ctx.print(`"${name}" = "${value}"`);

  // ---------------------------------------------------------------------------- non-cheat commands
  R.register({
    name: 'help', aliases: ['cmdlist'], help: 'Lists commands. "help <command>" shows one.', usage: 'help [command]',
    handler: (a, ctx) => {
      if (a[0]) {
        const c = R.find(a[0]);
        if (!c) return ctx.error(`help: no such command "${a[0]}"`);
        ctx.print(`${c.name}${c.aliases.length ? ' (' + c.aliases.join(', ') + ')' : ''}${c.cheat ? '  [cheat]' : ''} - ${c.help}`);
        if (c.usage) ctx.print(`usage: ${c.usage}`);
        return;
      }
      ctx.print('Commands ([cheat] needs sv_cheats 1):');
      for (const c of [...R.commands].sort((x, y) => x.name.localeCompare(y.name))) {
        ctx.print(`  ${c.name.padEnd(14)} ${c.cheat ? '[cheat] ' : ''}${c.help}`);
      }
    },
  });

  R.register({
    name: 'sv_cheats', help: 'Allow cheat commands (0 or 1). Setting 0 turns every active cheat off.', usage: 'sv_cheats <0|1>',
    handler: (a, ctx) => {
      const v = flag(a[0]);
      if (v === null) return cvar(ctx, 'sv_cheats', game.svCheats ? 1 : 0);
      game.svCheats = v;
      if (!v) game.disableAllCheats();
      ctx.ok(`sv_cheats ${v ? 1 : 0}${v ? ' - cheats enabled' : ' - cheats disabled'}`);
    },
  });
  R.register({ name: 'clear', help: 'Clears the console.', handler: (a, ctx) => ctx.console.clear() });
  R.register({ name: 'echo', help: 'Prints text.', usage: 'echo <text>', handler: (a, ctx) => ctx.print(ctx.raw) });
  R.register({
    name: 'fov', help: 'Field of view (60-110). Saved.', usage: 'fov <60-110>',
    handler: (a, ctx) => {
      if (a[0] === undefined) return cvar(ctx, 'fov', Settings.get('fov'));
      const n = parseFloat(a[0]);
      if (!(n >= 60 && n <= 110)) return ctx.error('fov: value must be between 60 and 110');
      Settings.set('fov', Math.round(n));
      ctx.print(`"fov" = "${Math.round(n)}"`);
    },
  });
  R.register({
    name: 'sensitivity', help: 'Mouse sensitivity multiplier (0.05-10).', usage: 'sensitivity <n>',
    handler: (a, ctx) => {
      if (a[0] === undefined) return cvar(ctx, 'sensitivity', Settings.get('sensitivity'));
      const n = parseFloat(a[0]);
      if (!(n >= 0.05 && n <= 10)) return ctx.error('sensitivity: value must be between 0.05 and 10');
      Settings.set('sensitivity', n);
      ctx.print(`"sensitivity" = "${n}"`);
    },
  });
  R.register({
    name: 'volume', help: 'Master volume (0-1).', usage: 'volume <0-1>',
    handler: (a, ctx) => {
      if (a[0] === undefined) return cvar(ctx, 'volume', Settings.get('master'));
      const n = parseFloat(a[0]);
      if (!(n >= 0 && n <= 1)) return ctx.error('volume: value must be between 0 and 1');
      Settings.set('master', n);
      ctx.print(`"volume" = "${n}"`);
    },
  });
  R.register({
    name: 'cl_showfps', help: 'Show an FPS counter (0 or 1).', usage: 'cl_showfps <0|1>',
    handler: (a, ctx) => {
      const v = flag(a[0]);
      if (v === null) return cvar(ctx, 'cl_showfps', game.showFps ? 1 : 0);
      game.setShowFps(v); ctx.print(`"cl_showfps" = "${v ? 1 : 0}"`);
    },
  });
  R.register({
    name: 'r_postfx', help: 'Bloom / vignette / grain (0 or 1).', usage: 'r_postfx <0|1>',
    handler: (a, ctx) => {
      const v = flag(a[0]);
      if (v === null) return cvar(ctx, 'r_postfx', Settings.get('effects') ? 1 : 0);
      Settings.set('effects', v); ctx.print(`"r_postfx" = "${v ? 1 : 0}"`);
    },
  });
  R.register({
    name: 'subtitles', help: 'Subtitles on or off (0 or 1).', usage: 'subtitles <0|1>',
    handler: (a, ctx) => {
      const v = flag(a[0]);
      if (v === null) return cvar(ctx, 'subtitles', Settings.get('subtitles') ? 1 : 0);
      Settings.set('subtitles', v); ctx.print(`"subtitles" = "${v ? 1 : 0}"`);
    },
  });
  R.register({
    name: 'chapter', aliases: ['map'], help: 'Load a chapter (1-4 or inbound|core|containment|pad39).', usage: 'chapter <1-4|inbound|core|containment|pad39>',
    handler: (a, ctx) => {
      if (!a[0]) { CHAPTERS.forEach((c) => ctx.print(`  ${c.num}  ${c.title}`)); return; }
      const key = a[0].toLowerCase();
      const n = /^\d+$/.test(key) ? parseInt(key, 10) : MAPS[key];
      if (!(n >= 1 && n <= 4)) return ctx.error(`chapter: unknown chapter "${a[0]}" (use 1-4, inbound, core, containment or pad39)`);
      ctx.print(`Loading chapter ${n}: ${CHAPTERS[n - 1].title}...`);
      ctx.console.close({ relock: false });
      game.startChapter(n);
    },
  });
  R.register({
    name: 'quit', aliases: ['exit'], help: 'Quits the desktop app (returns to the main menu in a browser).',
    handler: (a, ctx) => {
      if (window.avemaria && window.avemaria.quit) { window.avemaria.quit(); return; }
      ctx.print('Returning to the main menu...');
      ctx.console.close({ relock: false });
      if (game.state !== 'menu') game.toMenu();
    },
  });
  R.register({ name: 'version', help: 'Prints the game version.', handler: (a, ctx) => ctx.print(`Ave Maria v${pkg.version} (three.js r${REVISION}, cannon-es)`) });
  R.register({
    name: 'status', help: 'Chapter, health, suit, position and active cheats.',
    handler: (a, ctx) => {
      const p = game.player;
      if (!inGame(game)) ctx.print('chapter: none (menu)');
      else {
        ctx.print(`chapter: ${game.chapter} - ${CHAPTERS[game.chapter - 1] ? CHAPTERS[game.chapter - 1].title : '?'}`);
        ctx.print(`health: ${Math.ceil(p.health)}   suit: ${Math.ceil(p.suit)}`);
        ctx.print(`position: ${p.pos.x.toFixed(2)} ${p.pos.y.toFixed(2)} ${p.pos.z.toFixed(2)}`);
      }
      const act = game.activeCheats();
      ctx.print(`sv_cheats: ${game.svCheats ? 1 : 0}   cheats on: ${act.length ? act.join(', ') : 'none'}`);
    },
  });

  // ---------------------------------------------------------------------------- cheat commands
  const needGame = (ctx, name) => { if (inGame(game)) return true; ctx.error(`${name}: not in a game`); return false; };
  const toggle = (name, label, get, set) => R.register({
    name, cheat: true, help: label.help, usage: name,
    handler: (a, ctx) => {
      if (label.needGame && !needGame(ctx, name)) return;
      const v = flag(a[0]);
      const next = v === null ? !get() : v;
      set(next);
      ctx.ok(`${label.text} ${ONOFF(next)}`);
    },
  });

  toggle('god', { help: 'Toggle god mode (take no damage).', text: 'godmode' }, () => game.godMode, (v) => { game.godMode = v; });
  toggle('buddha', { help: 'Take damage, but health never drops below 1.', text: 'buddha' }, () => game.cheats.buddha, (v) => { game.cheats.buddha = v; });
  toggle('noclip', { help: 'Fly through walls. WASD along view, Space up, Ctrl/C down, Shift fast.', text: 'noclip', needGame: true }, () => game.player.noclip, (v) => game.player.setNoclip(v));
  toggle('notarget', { help: 'Enemies ignore you.', text: 'notarget' }, () => game.cheats.notarget, (v) => { game.cheats.notarget = v; });
  toggle('infinite_suit', { help: 'The suit never drains.', text: 'infinite_suit' }, () => game.cheats.infinite_suit, (v) => { game.cheats.infinite_suit = v; if (v) game.player.suit = Math.max(game.player.suit, 100); });
  toggle('bighead', { help: 'Giant heads / creatures.', text: 'bighead' }, () => game.cheats.bighead, (v) => { game.cheats.bighead = v; game._applyBighead(); });
  toggle('superpunt', { help: 'Supercharged M-7: x4 punt, x2 range, grabs and flings enemies.', text: 'superpunt', needGame: true }, () => game.cheats.superpunt, (v) => {
    game.cheats.superpunt = v;
    const p = game.player;
    if (v && !p.has.manipulator) p.giveWeapon('manipulator', true);
    p.weapons.manipulator.setSuper(v);
  });

  R.register({
    name: 'impulse', cheat: true, help: 'impulse 101: all weapons, full health and suit.', usage: 'impulse 101',
    handler: (a, ctx) => {
      if (a[0] !== '101') return ctx.error(a[0] ? `Unknown impulse ${a[0]}` : 'usage: impulse 101');
      if (!needGame(ctx, 'impulse')) return;
      const p = game.player;
      p.hasSuit = true;
      game.hud.setVisible(true);
      p.health = p.maxHealth; p.suit = 100;
      p.giveWeapon('wrench', false);
      p.giveWeapon('manipulator', true);
      game.hud.setWeaponsAvailable(p.has);
      game.audio.play('pickup_item', { vol: 0.8, throttle: 0 });
      game.audio.play('suit_beep', { vol: 0.7, throttle: 0 });
      game.hud.pickupMessage('ALL WEAPONS');
      ctx.ok('impulse 101: all weapons, health 100, suit 100');
    },
  });
  R.register({
    name: 'give', cheat: true, help: `Give an item: ${GIVE.join(', ')}.`, usage: 'give <item>',
    handler: (a, ctx) => {
      const it = (a[0] || '').toLowerCase();
      if (!it) { ctx.print('give <item>, where item is one of: ' + GIVE.join(', ')); return; }
      if (!GIVE.includes(it)) return ctx.error(`give: unknown item "${a[0]}" (${GIVE.join(', ')})`);
      if (!needGame(ctx, 'give')) return;
      const p = game.player;
      switch (it) {
        case 'wrench': p.giveWeapon('wrench', true); game.hud.pickupMessage('HYDRAULIC WRENCH'); break;
        case 'manipulator': p.giveWeapon('manipulator', true); game.hud.pickupMessage('M-7 FIELD MANIPULATOR'); break;
        case 'medkit': p.heal(25); game.hud.pickupMessage('MEDKIT +25'); break;
        case 'battery': p.hasSuit = true; game.hud.setVisible(true); p.addSuit(25); game.hud.pickupMessage('SUIT BATTERY +25'); break;
        case 'health': p.health = p.maxHealth; game.hud.pickupMessage('HEALTH 100'); break;
        case 'suit': p.hasSuit = true; game.hud.setVisible(true); p.suit = 100; game.hud.pickupMessage('EVA SUIT 100'); break;
      }
      game.audio.play(it === 'wrench' || it === 'manipulator' || it === 'suit' ? 'suit_beep' : 'pickup_item', { vol: 0.8, throttle: 0 });
      ctx.ok(`Gave ${it}`);
    },
  });
  R.register({
    name: 'hurtme', cheat: true, help: 'Take n damage (default 10).', usage: 'hurtme <n>',
    handler: (a, ctx) => {
      if (!needGame(ctx, 'hurtme')) return;
      const n = a[0] === undefined ? 10 : parseFloat(a[0]);
      if (!(n > 0)) return ctx.error('hurtme: usage hurtme <damage>');
      game.player.damage(n, null, 'generic', true);
      ctx.ok(`Took ${n} damage (health ${Math.ceil(game.player.health)})`);
    },
  });
  R.register({
    name: 'kill', cheat: true, help: 'Commit suicide.',
    handler: (a, ctx) => {
      if (!needGame(ctx, 'kill')) return;
      game.player.damage(99999, null, 'fall', true);
    },
  });
  R.register({
    name: 'killall', cheat: true, help: 'Kill every enemy currently alive.',
    handler: (a, ctx) => {
      if (!needGame(ctx, 'killall')) return;
      const list = [...game.damageables()];
      for (const e of list) e.takeDamage(9999, { type: 'explosion', from: game.player.pos });
      ctx.ok(`Killed ${list.length} enem${list.length === 1 ? 'y' : 'ies'}`);
    },
  });
  R.register({
    name: 'ent_create', cheat: true, help: `Spawn an entity 3 m in front of you: ${Object.keys(SPAWNS).join(', ')}.`, usage: 'ent_create <crawler|spitter|crate|barrel|barrel_explosive>',
    handler: (a, ctx) => {
      let t = (a[0] || '').toLowerCase();
      t = SPAWN_ALIAS[t] || t;
      if (!t) { ctx.print('ent_create <type>, where type is one of: ' + Object.keys(SPAWNS).join(', ')); return; }
      if (!SPAWNS[t]) return ctx.error(`ent_create: unknown entity "${a[0]}" (${Object.keys(SPAWNS).join(', ')})`);
      if (!needGame(ctx, 'ent_create')) return;
      SPAWNS[t](game, frontSpot(game));
      ctx.ok(`Created ${t}`);
    },
  });
  R.register({
    name: 'host_timescale', cheat: true, help: 'Game-world speed: 0.1 (slow-mo) to 5 (fast-forward). 1 = normal.', usage: 'host_timescale <0.1-5>',
    handler: (a, ctx) => {
      if (a[0] === undefined) return cvar(ctx, 'host_timescale', game.timescale);
      const n = parseFloat(a[0]);
      if (!(n >= 0.1 && n <= 5)) return ctx.error('host_timescale: value must be between 0.1 and 5');
      game.timescale = n;
      ctx.ok(`host_timescale ${n}`);
    },
  });
  R.register({
    name: 'sv_gravity', cheat: true, help: 'World gravity in Source units (default 600).', usage: 'sv_gravity <n>',
    handler: (a, ctx) => {
      if (a[0] === undefined) return cvar(ctx, 'sv_gravity', game.gravityUnits);
      const n = parseFloat(a[0]);
      if (!(n >= -2000 && n <= 5000)) return ctx.error('sv_gravity: value must be between -2000 and 5000');
      game.gravityUnits = n; game.applyGravity();
      ctx.ok(`sv_gravity ${n}`);
    },
  });
  R.register({
    name: 'sv_lowgrav', cheat: true, help: 'Toggle low gravity (150) / normal (600).',
    handler: (a, ctx) => {
      game.gravityUnits = game.gravityUnits === 150 ? 600 : 150; game.applyGravity();
      ctx.ok(`sv_gravity ${game.gravityUnits}`);
    },
  });
  R.register({
    name: 'skip', aliases: [], cheat: true, help: 'Complete the current objective.',
    handler: (a, ctx) => {
      if (!needGame(ctx, 'skip')) return;
      if (game.completeObjective()) ctx.ok('Objective completed'); else ctx.error('No skippable objective right now');
    },
  });
  R.register({
    name: 'ent_fire', cheat: true, help: 'ent_fire objective complete - complete the current objective.', usage: 'ent_fire objective complete',
    handler: (a, ctx) => {
      if ((a[0] || '').toLowerCase() === 'objective' && (a[1] || '').toLowerCase() === 'complete') {
        if (!needGame(ctx, 'ent_fire')) return;
        if (game.completeObjective()) ctx.ok('Objective completed'); else ctx.error('No skippable objective right now');
      } else ctx.error('usage: ent_fire objective complete');
    },
  });
  return R;
}
