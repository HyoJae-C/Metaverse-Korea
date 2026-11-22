// End-to-end check: rocking chairs. Two players in the woodwork furniture
// shop (gyeol-wood); one sits in the sample rocking chair and taps Rock:
// the chair and the player tip back and forth, and the other player sees the
// chair rock too. Getting up stops it. Realtime runs on the fake server.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/rocking-chair.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const ROOM = 'e2e' + Math.random().toString(36).slice(2, 10);
const browsers = [], errors = [];
const launch = () => chromium.launch({ executablePath: process.env.CHROME || process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function join(name) {
  const browser = await launch();
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 900, height: 640 } });
  await useFakeRealtime(ctx, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', '');
  await page.type('#nickname', name);
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible', timeout: 90000 });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
  return page;
}

// The rocking chair's tip in this page's scene (radians), and the player's rig.
const tipOf = (p) => p.evaluate(() => __mk.rockTip());
let ok = false, step = 'joining';
try {
  const a = await join('Rocker A');
  const b = await join('Watcher B');
  step = 'both in the woodwork shop';
  for (const p of [a, b]) await p.evaluate(() => __mk.enter('gyeol-wood'));
  for (const p of [a, b]) await p.waitForFunction(() => __mk.rockTip() != null, null, { timeout: 30000 });
  step = 'A sits in the rocking chair';
  await a.evaluate(() => __mk.sitNear(0, 0, 'rock'));
  await a.waitForFunction(() => /🪑/.test(__mk.action() || ''), null, { timeout: 10000 });
  if (!(await a.evaluate(() => __mk.seated()))) throw new Error('not seated');
  await b.evaluate(() => { const s = __mk.rockSeat(); __mk.goto(s[0] + 1.6, s[1] + 1.6, Math.PI * 1.25); });
  step = 'A rocks';
  await a.evaluate(() => __mk.act());
  await a.waitForFunction(() => Math.abs(__mk.rockTip()[0]) > 0.06, null, { timeout: 8000 });
  const t1 = await tipOf(a);
  if (Math.abs(t1[0] - t1[1]) > 1e-6) throw new Error('the player and the chair tip apart: ' + t1);
  if (shotDir) { await a.evaluate(() => __mk.cam({ dist: 4, pitch: 0.25, yaw: __mk.camYaw() + 1.4 })); await a.waitForTimeout(300); await a.screenshot({ path: shotDir + '/rock-a.png' }); }
  step = 'B sees the chair rock';
  await b.waitForFunction(() => Math.abs(__mk.rockTip()[0]) > 0.06, null, { timeout: 15000 });
  if (shotDir) await b.screenshot({ path: shotDir + '/rock-b.png' });
  step = 'A stops and gets up';
  await a.evaluate(() => __mk.stand());
  await a.waitForFunction(() => __mk.rockTip()[0] === 0, null, { timeout: 3000 });
  await b.waitForFunction(() => __mk.rockTip()[0] === 0, null, { timeout: 15000 });
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('rocking chair: ok, tipped', t1[0].toFixed(3));
} catch (e) {
  console.error('FAILED at', step, '-', e.message, errors);
} finally {
  for (const br of browsers) await br.close();
  process.exit(ok ? 0 : 1);
}
