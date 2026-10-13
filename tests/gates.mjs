// Real-input sanity check of the critical-path gates in chapters 2 and 4 (doors / pushing / buttons / valves / lift / hatch).
// Only look() (mouse-look stand-in) and a few teleports next to the valves are non-key input; walking and E are real key events.
//   node tests/gates.mjs [2|4]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ONLY = process.argv[2] ? [Number(process.argv[2])] : [2, 3, 4];
const PORT = 4185;
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
let failures = 0;
const check = (c, m) => { if (c) console.log('  ok   ' + m); else { failures++; console.log('  FAIL ' + m); } };

async function open(ch) {
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/?chapter=${ch}&test&god&ups=2`);
  await page.waitForFunction(() => window.__game && window.__game.state === 'playing', null, { timeout: 60000 });
  await page.evaluate(() => { window.__game.game.ups = 2; window.__game.game.dtStep = 0.05; });
  return page;
}
const pos = (page) => page.evaluate(() => window.__game.playerPos);
const waitObj = (page, re, ms = 60000) => page.waitForFunction((src) => new RegExp(src).test(window.__game.objective || ''), re.source, { timeout: ms, polling: 250 });
async function walkTo(page, x, z, { tol = 0.7, maxMs = 25000, face = null, slow = false } = {}) {
  const t0 = Date.now();
  if (slow) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  let p = await pos(page);
  while (Date.now() - t0 < maxMs) {
    p = await pos(page);
    const dx = x - p.x, dz = z - p.z;
    if (Math.hypot(dx, dz) < tol) break;
    const yaw = face !== null ? face : Math.atan2(-dx, -dz);
    await page.evaluate((y) => window.__game.look(y, 0), yaw);
    await page.waitForTimeout(100);
  }
  await page.keyboard.up('KeyW');
  if (slow) await page.keyboard.up('ShiftLeft');
  return pos(page);
}
const face = (page, x, y, z) => page.evaluate(([x, y, z]) => { const p = window.__game.game.player; p.yaw = Math.atan2(-(x - p.pos.x), -(z - p.pos.z)); p.pitch = Math.atan2(y - p.eyePos.y, Math.hypot(x - p.pos.x, z - p.pos.z)); }, [x, y, z]);

try {
  if (ONLY.includes(2)) {
    console.log('chapter 2 gates');
    const page = await open(2);
    await waitObj(page, /Push the sample cart/);
    // push the cart east with the real W key (cart at x=5.5,z=9.5; target zone x~20, z~8)
    await walkTo(page, 22, 8, { tol: 1.2, face: -Math.PI / 2, maxMs: 40000 });
    await waitObj(page, /control room/, 15000).catch(() => {});
    check(/control room/i.test(await page.evaluate(() => window.__game.objective || '')), 'pushed the cart into the sample zone by walking (objective advanced)');
    // back out through the chamber door, then to the control room door (auto) and in
    let p = await walkTo(page, 14, 8, { tol: 1 });
    p = await walkTo(page, 14, 16.5, { tol: 1 });
    p = await walkTo(page, 19, 16.5, { tol: 0.8, maxMs: 30000 });
    p = await walkTo(page, 22.5, 17.5, { tol: 1, maxMs: 30000 });
    check(p.x > 18 && p.z > 14, 'entered the control room through the automatic door: ' + JSON.stringify(p));
    await waitObj(page, /red button/, 15000).catch(() => {});
    await walkTo(page, 22.5, 16.4, { tol: 0.4 });
    await face(page, 22.5, 0.65, 15.23);
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyE');
    await waitObj(page, /wrench/, 90000).catch(() => {});
    check(/wrench/i.test(await page.evaluate(() => window.__game.objective || '')), 'red button pressed with E; breach ran; wrench objective active');
    p = await walkTo(page, 12.5, 16.5, { tol: 1, maxMs: 30000 });
    p = await walkTo(page, 12, 18.4, { tol: 0.9, maxMs: 15000 });
    await page.waitForTimeout(500);
    check(await page.evaluate(() => window.__game.game.player.has.wrench), 'picked up the wrench by walking to it');
    // combat gates: skip the wave kills (everything else is real input)
    for (let i = 0; i < 40 && !/north door/.test(await page.evaluate(() => window.__game.objective || '')); i++) { await page.evaluate(() => window.__game.completeObjective()); await page.waitForTimeout(500); }
    p = await walkTo(page, 8, 1.5, { tol: 0.8, maxMs: 30000 });
    p = await walkTo(page, 8, -8, { tol: 1, maxMs: 30000 });
    console.log('  exit:', JSON.stringify(p));
    await page.waitForFunction(() => window.__game.chapter === 3, null, { timeout: 30000 }).catch(() => {});
    check((await page.evaluate(() => window.__game.chapter)) === 3, 'walked out of the lab through the north door: chapter 3');
    check(page.errors.length === 0, 'no page errors');
    await page.close();
  }
  if (ONLY.includes(3)) {
    console.log('chapter 3 gates');
    const page = await open(3);
    const rmb = async () => { await page.mouse.down({ button: 'right' }); await page.waitForTimeout(150); await page.mouse.up({ button: 'right' }); await page.waitForTimeout(350); };
    let p = await walkTo(page, 0, -31.5, { tol: 0.8, maxMs: 40000 });
    console.log('  corridor end:', JSON.stringify(p));
    p = await walkTo(page, -8.9, -39.2, { tol: 0.4, maxMs: 40000 });
    console.log('  at bench:', JSON.stringify(p));
    await page.waitForTimeout(400);
    check(await page.evaluate(() => window.__game.game.player.has.manipulator), 'picked up the M-7 by walking to the workbench');
    // clear the barricade with real right-clicks: grab a crate, look sideways, drop it
    await waitObj(page, /Clear the barricade/, 30000);
    await walkTo(page, 8, -52, { tol: 1, maxMs: 40000 });
    for (let i = 0; i < 14 && /Clear the barricade/.test(await page.evaluate(() => window.__game.objective || '')); i++) {
      const c = await page.evaluate(() => { const l = window.__game.game.props.filter((q) => q.alive && q.type === 'crate' && q.body.position.z < -56.4 && Math.abs(q.body.position.x - 8) < 2.2 && q.body.position.y < 4).sort((a, b) => b.body.position.y - a.body.position.y); return l[0] ? { x: l[0].body.position.x, y: l[0].body.position.y, z: l[0].body.position.z } : null; });
      if (!c) break;
      await face(page, c.x, c.y, c.z);
      await page.waitForTimeout(150);
      await rmb();
      const held = await page.evaluate(() => !!window.__game.game.player.holdingProp);
      console.log('    grab attempt', i, JSON.stringify(c), 'held:', held);
      if (!held) continue;
      await page.evaluate(() => { const p = window.__game.game.player; p.yaw += Math.PI / 2; p.pitch = 0.1; });
      await page.waitForTimeout(900);
      await rmb();
      await page.evaluate(() => { const p = window.__game.game.player; p.yaw -= Math.PI / 2; });
    }
    await page.waitForFunction(() => !/Clear the barricade/.test(window.__game.objective || ''), null, { timeout: 20000, polling: 300 }).catch(() => {});
    if (/Clear the barricade/.test(await page.evaluate(() => window.__game.objective || ''))) console.log('    remaining:', JSON.stringify(await page.evaluate(() => window.__game.game.props.filter((q) => q.alive && Math.hypot(q.body.position.x - 8, q.body.position.z + 57.4) < 4).map((q) => [q.type, +q.body.position.x.toFixed(1), +q.body.position.y.toFixed(1), +q.body.position.z.toFixed(1)]))));
    check(!/Clear the barricade/.test(await page.evaluate(() => window.__game.objective || '')), 'barricade cleared with grab (right mouse) + drop');
    p = await walkTo(page, 8, -57, { tol: 0.8, maxMs: 20000 });
    p = await walkTo(page, 8, -66, { tol: 0.8, maxMs: 20000 });
    check(p.z < -60, 'walked through the cleared doorway into the crate room: ' + JSON.stringify(p));
    // crate puzzle feasibility: build a 3-crate staircase (what a player would make) and climb it with real jumps
    const built = await page.evaluate(() => {
      const g = window.__game.game;
      const cr = g.props.filter((q) => q.alive && q.type === 'crate' && q.body.position.z > -76 && q.body.position.z < -59).slice(0, 3);
      if (cr.length < 3) return false;
      const place = (c, x, y, z) => { c.body.position.set(x, y, z); c.body.velocity.set(0, 0, 0); c.body.angularVelocity.set(0, 0, 0); c.body.quaternion.set(0, 0, 0, 1); c.body.wakeUp(); };
      place(cr[0], 8, 0.46, -76.5); place(cr[1], 8, 1.4, -76.5); place(cr[2], 8, 0.46, -75.5);
      return true;
    });
    await page.waitForTimeout(2500);
    check(built, 'crate room has at least 3 loose crates for the stacking puzzle');
    await page.keyboard.down('Space');
    p = await walkTo(page, 8, -80, { tol: 0.5, maxMs: 20000, face: 0 });
    await page.keyboard.up('Space');
    console.log('  after climbing crates:', JSON.stringify(p));
    check(p.y > 2.2 && p.z < -77, 'climbed a 3-crate staircase onto the 2.4 m catwalk with real jumps');
    // catwalk (crate stacking) is a physics puzzle: skip it, then walk on real input
    for (let i = 0; i < 6 && !/fuse cell/.test(await page.evaluate(() => window.__game.objective || '')); i++) { await page.evaluate(() => window.__game.completeObjective()); await page.waitForTimeout(700); }
    p = await walkTo(page, 8, -85.5, { tol: 0.8, maxMs: 30000 });
    p = await walkTo(page, 8, -88.5, { tol: 0.6, maxMs: 30000 });
    p = await walkTo(page, 8, -90.6, { tol: 0.3, maxMs: 20000, slow: true });
    console.log('  after the stairs:', JSON.stringify(p));
    check(p.z < -89 && Math.abs(p.y) < 0.3, 'walked down the stairs into the pit room');
    // pull the fuse across the pit with a real right-click, carry it to the socket, drop it
    await face(page, 8, 1.1, -100.5);
    await page.waitForTimeout(200);
    await rmb();
    check(await page.evaluate(() => { const h = window.__game.game.player.holdingProp; return !!h && h.type === 'fuse'; }), 'grabbed the fuse cell across the pit with the M-7');
    p = await walkTo(page, 16.6, -87, { tol: 0.4, maxMs: 30000 });
    await page.evaluate(() => { const p = window.__game.game.player; p.yaw = -Math.PI / 2; p.pitch = 0.08; });
    await page.waitForTimeout(1500);
    console.log('    before drop:', JSON.stringify(await page.evaluate(() => { const g = window.__game.game; const f = g.props.find((q) => q.type === 'fuse'); const p = g.player; return { player: [p.pos.x, p.pos.z], held: !!p.holdingProp, fuse: f && [f.body.position.x, f.body.position.y, f.body.position.z], filled: g.entities.some((e) => e.filled === true) }; })));
    await rmb();
    await page.waitForTimeout(800);
    check(await page.evaluate(() => window.__game.game.entities.some((e) => e.filled === true)), 'fuse cell snapped into the socket');
    await waitObj(page, /powered door|nest/i, 15000).catch(() => {});
    p = await walkTo(page, 17, -90, { tol: 0.6 });
    p = await walkTo(page, 26, -90, { tol: 0.8, maxMs: 30000 });
    check(p.x > 21, 'walked through the powered door into the nest cavern: ' + JSON.stringify(p));
    check(page.errors.length === 0, 'no page errors');
    await page.close();
  }
  if (ONLY.includes(4)) {
    console.log('chapter 4 gates');
    const page = await open(4);
    await waitObj(page, /valves/);
    const valves = await page.evaluate(() => window.__game.game.entities.filter((e) => e.holdUse && e.defName).map((e) => ({ x: e.pos.x, z: e.pos.z, y: e.pos.y, rot: e.group.rotation.y })));
    let n = 0;
    for (const v of valves) {
      // stand 1.4 m in front of the valve, look at it, hold E
      await page.evaluate(([x, z]) => window.__game.teleport(x, 0.25, z), [v.x + Math.sin(v.rot) * 1.4, v.z + Math.cos(v.rot) * 1.4]);
      await face(page, v.x, v.y, v.z);
      await page.waitForTimeout(300);
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(7000);
      await page.keyboard.up('KeyE');
      n = await page.evaluate(() => window.__game.game.entities.filter((e) => e.holdUse && e.defName && e.done).length);
    }
    check(n === 3, `turned all 3 valves by holding E (${n}/3)`);
    await waitObj(page, /lift/, 30000);
    let p = await walkTo(page, 7.5, 8, { tol: 0.8, maxMs: 40000 });
    p = await walkTo(page, 7.5, 0, { tol: 0.6, maxMs: 20000 });
    p = await walkTo(page, 10, 0, { tol: 0.6, maxMs: 20000 });
    console.log('  on lift:', JSON.stringify(p));
    check(p.x > 8.4 && p.x < 11.7, 'walked onto the lift platform');
    await walkTo(page, 11.0, 0, { tol: 0.4 });
    await face(page, 11.5, 1.25, 0);
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyE');
    await page.waitForFunction(() => window.__game.playerPos.y > 36, null, { timeout: 150000, polling: 300 }).catch(() => {});
    p = await pos(page);
    check(p.y > 36, 'lift carried the player to the crew arm (y=' + p.y.toFixed(1) + ')');
    await waitObj(page, /Board/, 20000).catch(() => {});
    p = await walkTo(page, 2.4, 0, { tol: 0.5, maxMs: 30000 });
    console.log('  at hatch:', JSON.stringify(p));
    await waitObj(page, /LAUNCH/, 20000).catch(() => {});
    check(/LAUNCH/.test(await page.evaluate(() => window.__game.objective || '')), 'boarded the DX-90 by walking along the arm');
    p = await walkTo(page, 0.2, 0, { tol: 0.5, maxMs: 10000 });
    await face(page, -0.66, 38.0, 0);
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(3000);
    check(await page.evaluate(() => window.__game.game.player.frozen), 'LAUNCH button pressed with E started the launch sequence');
    check(page.errors.length === 0, 'no page errors');
    await page.close();
  }
} finally {
  await browser.close();
  try { process.kill(-srv.pid); } catch (e) { /* ignore */ }
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\ngate walkthrough: passed');
process.exit(failures ? 1 : 0);
