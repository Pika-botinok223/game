// Headless smoke test for Ave Maria.
//   npm test            -> build, serve with vite preview, load menu + each chapter, assert no errors / non-black frames, save screenshots
//   npm test -- --play  -> additionally drives every chapter to its end via window.__game.completeObjective()
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PLAY = process.argv.includes('--play');
const onlyArg = process.argv.find((a) => a.startsWith('--chapters='));
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',').map(Number) : [1, 2, 3, 4];
const SHOTS = process.env.SHOT_DIR || '/tmp/claude-0/-home-user-game/06b3a84b-215d-572e-bf1a-8625b9bc74bb/scratchpad/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const PORT = 4173;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let failures = 0;
const check = (cond, msg) => { if (cond) console.log('  ok   ' + msg); else { failures++; console.log('  FAIL ' + msg); } };

console.log('building...');
if (!process.argv.includes('--no-build')) execSync('npx vite build', { cwd: root, stdio: 'ignore' });
const srv = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));

const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

async function litPixels(page, buf) {
  const b64 = buf.toString('base64');
  return page.evaluate(async (b64) => {
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas'); c.width = 160; c.height = 90;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 160, 90);
    const d = ctx.getImageData(0, 0, 160, 90).data;
    let lit = 0, sum = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; sum += l; if (l > 24) lit++; }
    return { lit: lit / (d.length / 4), mean: sum / (d.length / 4) };
  }, b64);
}

async function openPage(query, vp = { width: 1280, height: 720 }) {
  const page = await browser.newPage({ viewport: vp });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${PORT}/${query}`);
  return { page, errors };
}

try {
  // ---- main menu
  {
    console.log('main menu');
    const { page, errors } = await openPage('');
    await page.waitForFunction(() => window.__game && window.__game.state === 'menu', null, { timeout: 60000 });
    await page.waitForTimeout(3500);
    const shot = await page.screenshot({ path: path.join(SHOTS, 'menu.png') });
    const px = await litPixels(page, shot);
    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
    check((await page.evaluate(() => window.__game.errors)) === 0, 'no frame errors');
    check(px.lit > 0.15, `menu renders (${(px.lit * 100).toFixed(0)}% lit pixels)`);
    check(await page.evaluate(() => !!document.querySelector('.menu-item')), 'menu items present');
    await page.close();
  }
  // ---- chapters
  for (let n = 1; n <= 4; n++) {
    if (!ONLY.includes(n)) continue;
    console.log('chapter ' + n);
    const { page, errors } = await openPage('?chapter=' + n + (PLAY ? '&test&god' : ''), PLAY ? { width: 800, height: 450 } : undefined);
    await page.waitForFunction(() => window.__game && window.__game.state === 'playing', null, { timeout: 60000 });
    await page.waitForTimeout(5000);
    const shot = await page.screenshot({ path: path.join(SHOTS, `chapter${n}.png`) });
    const px = await litPixels(page, shot);
    const info = await page.evaluate(() => ({ chapter: window.__game.chapter, health: window.__game.health, errs: window.__game.errors, last: window.__game.lastError }));
    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
    check(info.errs === 0, 'no frame errors' + (info.last ? ': ' + info.last.slice(0, 200) : ''));
    check(info.chapter === n && info.health > 0, `chapter ${info.chapter} started, health ${Math.round(info.health)}`);
    check(px.lit > 0.08 && px.mean > 4, `canvas renders non-black (${(px.lit * 100).toFixed(0)}% lit, mean ${px.mean.toFixed(0)})`);
    if (PLAY) {
      const t0 = Date.now();
      const seen = [];
      const limit = n === 4 ? 420000 : 240000;
      let credits = false;
      while (Date.now() - t0 < limit) {
        const r = await page.evaluate(() => { const g = window.__game; const o = g.objective; const ok = g.completeObjective(); return { chapter: g.chapter, o, ok, state: g.state, credits: !!document.querySelector('.credits'), health: g.health }; });
        if (r.ok && r.o && seen[seen.length - 1] !== r.o) seen.push(r.o);
        if (r.state === 'dead') { await page.evaluate(() => window.__game.setGod(true)); }
        if (r.chapter !== n && r.state !== 'loading') break;
        if (n === 4 && r.credits) { credits = true; break; }
        await page.waitForTimeout(600);
      }
      const end = await page.evaluate(() => ({ chapter: window.__game.chapter, errs: window.__game.errors, last: window.__game.lastError }));
      console.log('  objectives: ' + seen.join(' > '));
      if (n < 4) check(end.chapter === n + 1, `chapter ${n} completed -> chapter ${end.chapter}`);
      else { check(credits, 'launch sequence reached the credits'); await page.screenshot({ path: path.join(SHOTS, 'credits.png') }); }
      check(end.errs === 0, 'no frame errors during playthrough' + (end.last ? ': ' + end.last.slice(0, 200) : ''));
      check(errors.length === 0, 'no page errors during playthrough' + (errors.length ? ': ' + errors[0] : ''));
    }
    await page.close();
  }
} finally {
  await browser.close();
  srv.kill();
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
