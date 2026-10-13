// dev helper: node tests/shots.mjs "<query>" steps.json   (steps: [{js, wait, out}])
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [,, query = '', stepsFile] = process.argv;
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const srv = spawn('npx', ['vite', '--port', '5198', '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
await page.goto('http://localhost:5198/' + query);
await page.waitForTimeout(5000);
for (const st of steps) {
  if (st.js) { try { const r = await page.evaluate(st.js); if (r !== undefined) console.log('EVAL', JSON.stringify(r)); } catch (e) { console.log('EVALERR', e.message); } }
  await page.waitForTimeout(st.wait || 1500);
  if (st.out) await page.screenshot({ path: st.out });
}
console.log(await page.evaluate(() => JSON.stringify({ state: window.__game.state, err: window.__game.lastError, errs: window.__game.errors, obj: window.__game.objective, pos: window.__game.playerPos })));
await browser.close(); srv.kill(); try { process.kill(-srv.pid); } catch (e) {}
