// End-to-end check: Banpo Bridge's Moonlight Rainbow Fountain. Sets the
// page's clock to moments of the 19:30 KST show, stands on the open-air
// park's lawn looking at the bridge, and checks the sky turns to night
// and the jets load and draw. Saves screenshots if given a dir.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/rainbow-fountain.mjs http://localhost:4173/ [shot dir] [phone]
import { chromium, devices } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const phone = process.argv[4] === 'phone';
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const context = await browser.newContext(phone ? { ...devices['iPhone 13'], deviceScaleFactor: 1 } : { viewport: { width: 1100, height: 680 } });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 20000, what = '') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await f(); if (v) return v; await wait(150); } throw new Error('timed out ' + what); };
const START = Date.UTC(2026, 10, 9, 10, 30, 0); // 19:30 KST
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Rainbow');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.clock.setFixedTime(START - 20 * 60e3); // between shows: day, no jets
  await mk('enter', 'banpo-jamwon-hangang');
  await until(async () => (await mk('room')).id === 'banpo-jamwon-hangang');
  const st = () => page.evaluate(() => window.__mk.fountain());
  await mk('place', -18, 4); await mk('face', -Math.PI / 2); await mk('cam', { yaw: -Math.PI / 2, pitch: 0.05, dist: 7 });
  await wait(8000);
  let s = await st();
  if (s.mix !== 0 || s.visible) throw new Error('night or jets between shows: ' + JSON.stringify(s));
  if (shotDir) await page.screenshot({ path: `${shotDir}/0-day.png` });
  for (const [t, name] of [[-30, 'dusk'], [20, 'rise'], [90, 'wave'], [200, 'alternate'], [300, 'center'], [380, 'chase'], [1170, 'finale']]) {
    await page.clock.setFixedTime(START + t * 1000);
    await wait(t === -30 ? 2500 : 2000);
    s = await st();
    if (t > 0 && !(s.mix > 0.99 && s.jets && s.visible)) throw new Error(`no show at ${t}: ` + JSON.stringify(s));
    console.log(t, name, JSON.stringify(s));
    if (shotDir) await page.screenshot({ path: `${shotDir}/${String(t + 100).padStart(4, '0')}-${name}.png` });
  }
  await page.clock.setFixedTime(START + 1400 * 1000);
  await wait(1500);
  s = await st();
  if (s.mix !== 0 || s.visible) throw new Error('still on after the show: ' + JSON.stringify(s));
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('rainbow fountain ok');
} catch (e) {
  console.error('FAIL', e.message, errors);
} finally {
  await browser.close();
  process.exit(ok ? 0 : 1);
}
