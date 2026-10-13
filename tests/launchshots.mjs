// dev helper: drive chapter 4 to the launch and capture frames at given seconds after pressing LAUNCH.
//   node tests/launchshots.mjs <outDir> [comma separated seconds]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const OUT = process.argv[2];
const TIMES = (process.argv[3] || '3,8,12,16,20,26,32,38,46,56,66,76,86').split(',').map(Number);
const srv = spawn('npx', ['vite', 'preview', '--port', '4181', '--strictPort', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await page.goto('http://127.0.0.1:4181/?chapter=4&test&god&ups=6');
// complete objectives until the LAUNCH button was pressed
let t0 = null;
for (let i = 0; i < 400 && t0 === null; i++) {
  await page.waitForTimeout(500);
  t0 = await page.evaluate(() => {
    const g = window.__game.game; const o = window.__game.objective;
    if (o && o.includes('LAUNCH')) { window.__game.completeObjective(); g.ups = 1; g.dtStep = 0.1; return g.time; }
    window.__game.completeObjective(); return null;
  });
}
console.log('launch pressed at', t0);
import fs from 'node:fs';
for (const t of TIMES) {
  await page.waitForFunction((target) => window.__game.game.time >= target, t0 + t, { timeout: 900000, polling: 300 });
  const url = await page.evaluate(() => {
    const g = window.__game.game; g.frozenDebug = true;
    g.renderer.render(performance.now() / 1000);
    return g.canvas.toDataURL('image/png');
  });
  fs.writeFileSync(`${OUT}/L_${String(t).padStart(3, '0')}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('shot', t, JSON.stringify(await page.evaluate(() => ({ st: window.__game.state, err: window.__game.lastError, errs: window.__game.errors }))));
  await page.evaluate(() => { window.__game.game.frozenDebug = false; });
}
await browser.close();
try { process.kill(-srv.pid); } catch (e) { /* ignore */ }
