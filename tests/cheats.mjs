// Developer console + cheats, driven with REAL key input in headless Chromium.
//   node tests/cheats.mjs          (needs `npm run build` first; npm test does that via smoke.mjs)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 4185;
const SHOTS = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-game/06b3a84b-215d-572e-bf1a-8625b9bc74bb/scratchpad/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
let failures = 0;
const check = (c, m) => { if (c) console.log('  ok   ' + m); else { failures++; console.log('  FAIL ' + m); } };
const errors = [];

async function open(query, vp = { width: 640, height: 360 }) {
  const page = await browser.newPage({ viewport: vp });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${PORT}/${query}`);
  await page.waitForFunction(() => window.__game && window.__game.state === 'playing', null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  return page;
}
const g = (page, expr) => page.evaluate((e) => { const G = window.__game; return new Function('G', 'return ' + e)(G); }, expr);
const run = async (page, text) => { await page.keyboard.type(text); await page.keyboard.press('Enter'); await page.waitForTimeout(80); };
const lastLines = (page, n = 3) => page.evaluate((n) => [...document.querySelectorAll('.devcon-line')].slice(-n).map((e) => e.textContent), n);
const toggle = async (page) => { await page.keyboard.press('Backquote'); await page.waitForTimeout(250); };
const hold = async (page, key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(100); };

try {
  // ------------------------------------------------------------ chapter 1: refusal, sv_cheats, god, impulse 101
  console.log('chapter 1: console basics');
  {
    const page = await open('?chapter=1');
    check(!(await g(page, 'G.consoleOpen')), 'console closed at start');
    await toggle(page);
    check(await g(page, 'G.consoleOpen'), 'Backquote opens the console');
    const banner = await lastLines(page, 1);
    check(/Ave Maria developer console/.test(banner[0]), 'welcome banner printed');
    await run(page, 'god');
    let l = await lastLines(page, 1);
    check(/Can't use cheat command 'god' in multiplayer, unless the server has sv_cheats set to 1\./.test(l[0]), 'god refused while sv_cheats 0');
    check((await g(page, 'G.god')) === false, 'god mode still off');
    await run(page, 'sv_cheats 1');
    await run(page, 'god');
    l = await lastLines(page, 1);
    check(/godmode ON/.test(l[0]), 'prints "godmode ON"');
    check((await g(page, 'G.god')) === true, 'window.__game reports god mode on');
    check((await page.evaluate(() => document.querySelector('.cheat-line').textContent)).includes('GOD'), 'HUD cheat line shows GOD');
    check(!(await g(page, 'G.weapons.manipulator')), 'no manipulator before impulse 101');
    await run(page, 'impulse 101');
    const w = await g(page, 'G.weapons');
    check(w.wrench && w.manipulator, 'impulse 101 gives both weapons in chapter 1');
    check((await g(page, 'G.health')) === 100 && (await g(page, 'G.suit')) === 100, 'impulse 101 fills health and suit');
    // Esc closes the console only
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check(!(await g(page, 'G.consoleOpen')) && (await g(page, 'G.state')) === 'playing', 'Esc closes the console without pausing');
    // history persisted
    const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('avemaria.console.history.v1') || '[]'));
    check(hist.includes('impulse 101') && hist.length <= 30, 'command history saved to localStorage');
    // Up arrow recalls the last command, Tab completes
    await toggle(page);
    await page.keyboard.press('ArrowUp');
    check((await page.evaluate(() => document.querySelector('.devcon-input').value)) === 'impulse 101', 'ArrowUp recalls history');
    await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace');
    await page.keyboard.type('host_time');
    check((await page.evaluate(() => document.querySelectorAll('.devcon-suggest-item').length)) >= 1, 'suggestion list shows while typing');
    await page.keyboard.press('Tab');
    check((await page.evaluate(() => document.querySelector('.devcon-input').value)) === 'host_timescale ', 'Tab autocompletes the command name');
    await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace');
    await toggle(page);
    await page.close();
  }

  // ------------------------------------------------------------ chapter 2: typing w, noclip, timescale
  console.log('chapter 2: typing, noclip, timescale');
  {
    const page = await open('?chapter=2');
    const p0 = await g(page, 'G.playerPos');
    await toggle(page);
    await page.keyboard.down('w'); await page.waitForTimeout(900); await page.keyboard.up('w');
    await page.keyboard.type('www');
    const p1 = await g(page, 'G.playerPos');
    check(Math.hypot(p1.x - p0.x, p1.z - p0.z) < 0.05, `typing "w" in the console does not move the player (moved ${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(3)})`);
    await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace');
    await run(page, 'sv_cheats 1');
    await run(page, 'noclip');
    check((await lastLines(page, 1))[0] === 'noclip ON' && (await g(page, 'G.noclip')), 'noclip ON');
    await run(page, 'host_timescale 0.5');
    check((await g(page, 'G.timescale')) === 0.5, 'host_timescale 0.5');
    await run(page, 'host_timescale 1');
    await toggle(page);
    check(!(await g(page, 'G.consoleOpen')), 'console closed with Backquote');
    const a = await g(page, 'G.playerPos');
    await hold(page, 'KeyW', 1000);
    const b = await g(page, 'G.playerPos');
    const moved = Math.hypot(b.x - a.x, b.z - a.z);
    check(moved > 1, `noclip: holding W moves the player (${moved.toFixed(1)} m)`);
    await hold(page, 'Space', 1000);
    const c = await g(page, 'G.playerPos');
    check(c.y > b.y + 1.5 && c.y > 1.5, `noclip: Space rises above the floor (y ${b.y.toFixed(2)} -> ${c.y.toFixed(2)})`);
    await page.waitForTimeout(500);
    const c2 = await g(page, 'G.playerPos');
    check(Math.abs(c2.y - c.y) < 0.05, 'noclip: no gravity while flying');
    // off again: safe restore
    await toggle(page); await run(page, 'noclip'); await toggle(page);
    check(!(await g(page, 'G.noclip')), 'noclip OFF');
    await page.waitForTimeout(1500);
    const d = await g(page, 'G.playerPos');
    check(d.y < c.y - 1, `gravity returns after noclip OFF (y ${d.y.toFixed(2)})`);
    check((await g(page, 'G.state')) === 'playing' && (await g(page, 'G.health')) > 0, 'still alive and playing');
    check((await g(page, 'G.errors')) === 0, 'no frame errors');
    await page.close();
  }

  // ------------------------------------------------------------ chapter 3: killall, chapter switch, screenshot
  console.log('chapter 3: killall + chapter 2 + screenshot');
  {
    const page = await open('?chapter=3', { width: 1280, height: 720 });
    const before = await g(page, 'G.enemiesAlive');
    console.log('  (enemies alive before killall: ' + before + ')');
    check(before > 0, 'chapter 3 has live enemies');
    await toggle(page);
    await run(page, 'killall');
    check(/Can't use cheat command 'killall'/.test((await lastLines(page, 1))[0]), 'killall refused without sv_cheats');
    await run(page, 'sv_cheats 1');
    await run(page, 'killall');
    check((await g(page, 'G.enemiesAlive')) === 0, 'killall: no enemies remain');
    await run(page, 'ent_create crawler');
    check((await g(page, 'G.enemiesAlive')) === 1, 'ent_create crawler spawns an enemy');
    await run(page, 'notarget');
    await run(page, 'sv_gravity 150');
    check((await g(page, 'G.gravity')) === 150, 'sv_gravity 150');
    await run(page, 'fov 100'); await run(page, 'fov 500');
    await run(page, 'status');
    await run(page, 'bogus_cmd');
    await run(page, 'help');
    await page.waitForTimeout(500);
    await page.screenshot({ path: SHOTS + '/console.png' });
    await run(page, 'sv_cheats 0');
    check((await g(page, 'G.gravity')) === 600 && !(await g(page, 'G.cheats.notarget')) && !(await g(page, 'G.god')), 'sv_cheats 0 turns every cheat off');
    await run(page, 'sv_cheats 1');
    await run(page, 'chapter 2');
    await page.waitForFunction(() => window.__game.chapter === 2 && window.__game.state === 'playing', null, { timeout: 60000 });
    check(true, 'chapter 2 loaded from the console');
    check(!(await g(page, 'G.consoleOpen')), 'console closed after chapter command');
    await page.close();
  }

  // ------------------------------------------------------------ menu: console + Konami
  console.log('main menu: console + Konami code');
  {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/`);
    await page.waitForFunction(() => window.__game && window.__game.state === 'menu', null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    await toggle(page);
    check(await g(page, 'G.consoleOpen'), 'console opens in the main menu');
    await run(page, 'version');
    check(/Ave Maria v/.test((await lastLines(page, 1))[0]), 'version prints');
    await toggle(page);
    check((await g(page, 'G.svCheats')) === false, 'sv_cheats 0 on the menu');
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']) await page.keyboard.press(k);
    await page.waitForTimeout(300);
    check((await g(page, 'G.svCheats')) === true, 'Konami code sets sv_cheats 1');
    check(/DEVELOPER MODE UNLOCKED/.test(await page.evaluate(() => document.querySelector('.dev-toast').textContent)), 'Konami toast shown');
    check(await page.evaluate(() => localStorage.getItem('avemaria.devunlock.v1') === '1'), 'chapter unlock persisted');
    // options toggle: console off => backtick does nothing in game (but works on the menu)
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('avemaria.settings.v1') || '{}'); s.devConsole = false; localStorage.setItem('avemaria.settings.v1', JSON.stringify(s)); });
    await page.close();
    const p2 = await browser.newPage({ viewport: { width: 640, height: 360 } });
    p2.on('pageerror', (e) => errors.push(e.message));
    await p2.goto(`http://127.0.0.1:${PORT}/?chapter=2`);
    await p2.evaluate(() => { const s = JSON.parse(localStorage.getItem('avemaria.settings.v1') || '{}'); s.devConsole = false; localStorage.setItem('avemaria.settings.v1', JSON.stringify(s)); });
    await p2.reload();
    await p2.waitForFunction(() => window.__game && window.__game.state === 'playing', null, { timeout: 60000 });
    await p2.waitForTimeout(1000);
    await toggle(p2);
    check(!(await g(p2, 'G.consoleOpen')), 'Developer console OFF: backtick does nothing in game');
    await p2.close();
  }
  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
} finally {
  await browser.close();
  try { process.kill(-srv.pid); } catch (e) { srv.kill(); }
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll cheat checks passed');
process.exit(failures ? 1 : 0);
