// dev helper: node tests/probe.mjs "<query>" [seconds]  -> prints game state every 2s (uses vite preview on dist/)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const query = process.argv[2] || '?chapter=1&test';
const secs = parseInt(process.argv[3] || '24', 10);
const srv = spawn('npx', ['vite', 'preview', '--port', '4180', '--strictPort', '--host', '127.0.0.1'], { cwd: process.cwd(), stdio: 'ignore', detached: true });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: parseInt(process.env.VW || '800', 10), height: parseInt(process.env.VH || '450', 10) } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await page.goto('http://127.0.0.1:4180/' + query);
for (let i = 0; i < secs / 2; i++) {
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => {
    const g = window.__game.game;
    return { st: g.state, t: +g.time.toFixed(1), dt: +g.dt.toFixed(3), obj: window.__game.objective, ent: g.entities.length, waiters: g.scheduler.waiters.length, dq: g.dialogue.queue.length, cur: !!g.dialogue.current };
  });
  console.log(JSON.stringify(r));
  if (process.env.SHOTDIR) await page.screenshot({ path: `${process.env.SHOTDIR}/probe_${String(i).padStart(2, '0')}.png` });
  if (process.env.SLOWAT) await page.evaluate((k) => { const o = window.__game.objective; if (o && o.includes(k)) window.__game.game.ups = 2; }, process.env.SLOWAT);
  if (process.env.COMPLETE) { try { console.log('complete ->', await page.evaluate(() => { try { return window.__game.completeObjective(); } catch (e) { return 'THROW ' + e.stack; } })); } catch (e) { console.log(e.message); } }
}
await browser.close();
try { process.kill(-srv.pid); } catch (e) { /* ignore */ }
