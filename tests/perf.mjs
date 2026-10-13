import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const srv = spawn('npx', ['vite', 'preview', '--port', '4182', '--strictPort', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://127.0.0.1:4182/?chapter=4&test&god&ups=6');
let t0 = null;
for (let i = 0; i < 400 && t0 === null; i++) {
  await page.waitForTimeout(500);
  t0 = await page.evaluate(() => { const g = window.__game.game; const o = window.__game.objective; if (o && o.includes('LAUNCH')) { window.__game.completeObjective(); return g.time; } window.__game.completeObjective(); return null; });
}
console.log('pressed', t0);
await page.evaluate(() => { window.__game.game.ups = 4; window.__fr = 0; const f = () => { window.__fr++; requestAnimationFrame(f); }; f(); });
for (let round = 0; round < 8; round++) {
  const t1 = Date.now();
  const a = await page.evaluate(() => ({ t: window.__game.game.time, fr: window.__fr }));
  await page.waitForTimeout(4000);
  const b = await page.evaluate(() => ({ t: window.__game.game.time, fr: window.__fr }));
  console.log(JSON.stringify({ gameSecPerSec: ((b.t - a.t) / ((Date.now() - t1) / 1000)).toFixed(2), fps: ((b.fr - a.fr) / ((Date.now() - t1) / 1000)).toFixed(1), t: b.t.toFixed(1) }));
}
await browser.close(); try { process.kill(-srv.pid); } catch (e) {}
