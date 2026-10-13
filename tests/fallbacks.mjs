// Verifies that EVERY asset key from PLAN.md section 6 has a procedural fallback (page loaded with ?noassets).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const KEYS = {
  textures: 'concrete_wall concrete_floor metal_floor metal_wall metal_plate tile_white tile_floor hazard_stripes ceiling_panel rust_metal asphalt sand_ground cell_flesh crate_wood crate_metal glass_dirty sky_night logo_avemaria'.split(' '),
  models: 'crate barrel barrel_explosive cart computer_console chair desk locker pipe_straight valve_wheel fuse_cell medkit battery wrench manipulator npc_scientist npc_guard npc_overseer crawler spitter'.split(' '),
  sfx: [],
  music: 'menu_theme inbound_ambient breach_action combat_loop pad39_finale credits_theme'.split(' '),
};
const n4 = (b) => [1, 2, 3, 4].map((i) => `${b}_${i}`);
KEYS.sfx = [...n4('footstep_concrete'), ...n4('footstep_metal'), 'jump_land', 'wrench_swing', 'wrench_hit_flesh', 'wrench_hit_metal', 'manipulator_punt', 'manipulator_grab', 'manipulator_drop', 'manipulator_dryfire', 'door_open', 'door_close', 'button_press', 'button_denied', 'alarm_loop', 'explosion_1', 'explosion_2', 'glass_break', 'metal_impact_1', 'metal_impact_2', 'metal_impact_3', 'crawler_idle', 'crawler_attack', 'crawler_die', 'spitter_spit', 'spitter_die', 'acid_hit', 'player_hurt_1', 'player_hurt_2', 'player_hurt_3', 'suit_beep', 'suit_charge_loop', 'health_charge_loop', 'pickup_item', 'valve_turn', 'tram_loop', 'tram_brake', 'elevator_loop', 'rumble_loop', 'rocket_launch_loop', 'stage_separation', 'pa_chime', 'ui_hover', 'ui_click', 'fluorescent_hum_loop', 'spark_1'];
const srv = spawn('npx', ['vite', 'preview', '--port', '4183', '--strictPort', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:4183/?noassets');
await page.waitForFunction(() => window.__game && window.__game.state === 'menu', null, { timeout: 60000 });
const res = await page.evaluate((KEYS) => {
  const g = window.__game, out = { missing: [], hasManifest: g.assets.hasManifest };
  for (const k of KEYS.textures) if (!g.hasProcTexture(k)) out.missing.push('texture:' + k);
  for (const k of KEYS.models) { if (!g.PROC_MODELS[k]) out.missing.push('model:' + k); else { try { g.assets.model(k); } catch (e) { out.missing.push('model-throws:' + k); } } }
  g.game.audio.resume();
  for (const k of [...KEYS.sfx, ...KEYS.music]) { let b = null; try { b = g.assets.audioBuffer(k); } catch (e) { /* */ } if (!b) out.missing.push('audio:' + k); }
  return out;
}, KEYS);
console.log(JSON.stringify(res));
console.log(res.missing.length === 0 ? 'all keys have fallbacks' : 'MISSING ' + res.missing.join(', '));
console.log('page errors:', errors.length ? errors[0] : 'none');
await browser.close();
try { process.kill(-srv.pid); } catch (e) { /* ignore */ }
process.exit(res.missing.length || errors.length ? 1 : 0);
