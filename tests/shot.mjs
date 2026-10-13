// quick screenshot helper: node tests/shot.mjs "<query>" <out.png> [waitMs] [js-to-eval]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const [,, query = '', out = '/tmp/x.png', wait = '4000', evalJs = ''] = process.argv;
const srv = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0, 300)); });
await page.goto('http://localhost:5199/' + query);
await page.waitForTimeout(parseInt(wait, 10));
if (evalJs) { const r = await page.evaluate(evalJs); console.log('EVAL', JSON.stringify(r)); await page.waitForTimeout(1500); }
await page.screenshot({ path: out });
console.log(await page.evaluate(() => JSON.stringify({ state: window.__game && window.__game.state, err: window.__game && window.__game.lastError, boot: window.__bootError })));
await browser.close(); srv.kill();
