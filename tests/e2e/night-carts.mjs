// End-to-end check: Myeongdong's night food carts. In the game's day the
// street is clear; from sunset they're out with their lamps lit, and at a
// cart's counter you can look at (and buy) its food.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/night-carts.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const label = async () => [await mk('action'), ...((await mk('choices')) || [])].join('|');
const until = async (f, ms = 15000, what = '') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await f(); if (v) return v; await wait(150); } throw new Error('timed out ' + what + ' ' + await label()); };
// The game's day is three hours from midnight UTC: night is 2:00-3:00 UTC.
const DAY = Date.UTC(2026, 10, 11, 1, 0), NIGHT = Date.UTC(2026, 10, 11, 2, 40);
let ok = false;
try {
  await page.clock.setFixedTime(DAY);
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Cart');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  // Down the shopping street from Toegye-ro, looking north.
  await mk('place', -1559.5, -455); await mk('face', Math.PI - 0.15);
  await wait(3000);
  const day = await mk('nightCarts');
  if (day[0]?.shown) throw new Error('carts out in the day');
  if (shotDir) await page.screenshot({ path: `${shotDir}/carts-day.png` });
  await page.clock.setFixedTime(NIGHT);
  const night = await until(async () => { const s = await mk('nightCarts'); return s[0]?.shown && s; }, 20000, 'carts out at night');
  console.log('carts:', night[0].spots.length);
  await wait(2500);
  if (shotDir) await page.screenshot({ path: `${shotDir}/carts-night.png` });
  // At the first cart's counter.
  const [x, z, ry] = night[0].spots[0];
  await mk('place', x + Math.sin(ry) * 1.3, z + Math.cos(ry) * 1.3); await mk('face', ry + Math.PI);
  await until(async () => (await label()).includes('👀'), 10000, 'look at its food');
  console.log('action:', await label());
  if (shotDir) { await mk('place', x + Math.sin(ry) * 3.2 + Math.cos(ry) * 1.2, z + Math.cos(ry) * 3.2 - Math.sin(ry) * 1.2); await mk('face', ry + Math.PI - 0.3); await wait(1500); await page.screenshot({ path: `${shotDir}/carts-close.png` }); }
  if (errors.length) throw new Error(errors.join('\n'));
  ok = true;
} catch (e) {
  console.error(e.message);
} finally {
  await browser.close();
  console.log(ok ? 'OK' : 'FAILED');
  process.exit(ok ? 0 : 1);
}
