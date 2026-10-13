// Regression test: chapter 1 must be walkable with REAL key input. No completeObjective / teleport / skipTo.
// The ride is fast-forwarded with ?ups (harmless), then we hold W (turning with look()) to leave the tram,
// cross the platform, take the suit, talk to Brooks and reach the end of the chapter.
//   node tests/tram_exit.mjs            (add --full to continue through locker / suit / Brooks / lab corridor)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const FULL = process.argv.includes('--full');
const PORT = 4184;
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let failures = 0;
const check = (c, m) => { if (c) console.log('  ok   ' + m); else { failures++; console.log('  FAIL ' + m); } };

const pos = () => page.evaluate(() => window.__game.playerPos);
const obj = () => page.evaluate(() => window.__game.objective);
const waitObj = (re, ms = 120000) => page.waitForFunction((src) => new RegExp(src).test(window.__game.objective || ''), re.source, { timeout: ms, polling: 250 });

/** walk towards (x,z) holding W with real key events; the view is turned with look(). */
async function walkTo(x, z, { crouch = false, tol = 0.6, maxMs = 15000 } = {}) {
  const t0 = Date.now();
  await page.keyboard.down('KeyW');
  if (crouch) await page.keyboard.down('KeyC');
  let p = await pos();
  while (Date.now() - t0 < maxMs) {
    p = await pos();
    const dx = x - p.x, dz = z - p.z;
    if (Math.hypot(dx, dz) < tol) break;
    // forward = (-sin yaw, -cos yaw)  =>  yaw = atan2(-dx, -dz)
    await page.evaluate(([yaw]) => window.__game.look(yaw, 0), [Math.atan2(-dx, -dz)]);
    await page.waitForTimeout(120);
  }
  await page.keyboard.up('KeyW');
  if (crouch) await page.keyboard.up('KeyC');
  return pos();
}

try {
  await page.goto(`http://127.0.0.1:${PORT}/?chapter=1&test&god&ups=30`);
  await page.waitForFunction(() => window.__game && window.__game.state === 'playing', null, { timeout: 60000 });
  console.log('riding the tram (fast-forward)...');
  await waitObj(/Exit the tram/, 300000);
  await page.evaluate(() => { window.__game.game.ups = 1; window.__game.game.dtStep = 1 / 30; }); // one update per frame from here on (no multi-step fast-forward)
  await page.waitForTimeout(2500); // door animation
  const start = await pos();
  console.log('  arrived, player at', JSON.stringify(start));
  check(start.z < 1.3, 'player starts inside the tram volume');
  const outside = await walkTo(0, 4.5, { tol: 0.8, maxMs: 20000 });
  console.log('  after walking:', JSON.stringify(outside));
  check(outside.z > 2.0, 'player left the tram and stands on the platform (z > 2)');
  check(Math.abs(outside.y) < 0.2, 'platform is flush with the tram floor (y ~ 0)');
  await waitObj(/locker|Find your/, 10000).catch(() => {});
  check(/locker/i.test((await obj()) || ''), 'objective advanced to the locker room');

  if (FULL) {
    // cross the crate row with a real jump (Space held), via a waypoint clear of the canopy pillars
    await page.keyboard.down('Space');
    let p = await walkTo(-6.5, 5, { tol: 0.9, maxMs: 30000 });
    await page.keyboard.up('Space');
    p = await walkTo(-8, 9.8, { tol: 0.9, maxMs: 30000 });
    console.log('  at locker-room door:', JSON.stringify(p));
    check(p.z > 8.4 && p.x < -4, 'got past the crate row to the locker-room door: ' + JSON.stringify(p));
    p = await walkTo(-6, 13, { tol: 0.9 });
    p = await walkTo(-6, 22, { tol: 1.0, maxMs: 30000 });
    console.log('  at locker 13:', JSON.stringify(p));
    await page.evaluate(() => window.__game.look(0, 0)); // face +z? (yaw 0 faces -z) ; turn to the locker:
    await page.evaluate(() => window.__game.look(Math.PI, 0));
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(600);
    check(await page.evaluate(() => window.__game.game.player.hasSuit && window.__game.suit > 0), 'took the EVA suit with the E key');
    // to Brooks through the low doorway (crouch) at x=4, z=16
    p = await walkTo(2, 16, { tol: 0.7 });
    p = await walkTo(6.5, 16, { crouch: true, tol: 0.7, maxMs: 12000 });
    console.log('  after low doorway:', JSON.stringify(p));
    check(p.x > 4.5, 'passed the low doorway into the lobby while crouching');
    p = await walkTo(13.5, 16.2, { tol: 1.2 });
    await page.evaluate(() => { const g = window.__game.game; const b = g.entities.find((e) => e.kind === 'brooks'); const p = g.player.pos; g.player.yaw = Math.atan2(-(b.pos.x - p.x), -(b.pos.z - p.z)); g.player.pitch = 0; });
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => /Proceed to Lab/.test(window.__game.objective || ''), null, { timeout: 120000, polling: 300 }).catch(() => {});
    check(/Lab C-4/.test((await obj()) || ''), 'Brooks talked, lab door unlocked, objective is Lab C-4');
    await page.evaluate(() => { window.__game.game.ups = 4; window.__game.game.dtStep = 0.05; });
    p = await walkTo(29, 17, { tol: 1.0, maxMs: 20000 });
    p = await walkTo(35, 17, { tol: 1.0, maxMs: 20000 });
    console.log('  in lab corridor:', JSON.stringify(p));
    await page.waitForFunction(() => window.__game.chapter === 2, null, { timeout: 60000 }).catch(() => {});
    check((await page.evaluate(() => window.__game.chapter)) === 2, 'walked into Lab C-4 corridor: chapter 2 started');
  }
  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
} finally {
  await browser.close();
  try { process.kill(-srv.pid); } catch (e) { /* ignore */ }
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\ntram exit regression: passed');
process.exit(failures ? 1 : 0);
