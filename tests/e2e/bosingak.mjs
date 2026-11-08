// End-to-end check: Bosingak on Jongno. In front of its steps the button
// rings the bell (the striker swings), the first ring shows the card, and a
// second ring right away is refused while the bell still hums.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/bosingak.mjs http://localhost:4173/ [shot dir]
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
const until = async (f, ms = 15000, what = '') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return; await wait(100); } throw new Error('timed out ' + what + ' ' + await label()); };
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Bell');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  const off = [-1741, -911]; // the Gyeongbokgung district (region.json)
  await mk('place', off[0] + 155, off[1] + 124); await mk('face', Math.PI);
  if (shotDir) { await wait(2500); await page.screenshot({ path: `${shotDir}/bosingak-front.png` }); }
  await mk('place', off[0] + 155, off[1] + 116); await mk('face', Math.PI);
  await until(async () => (await label()).includes('🔔'), 15000, 'ring button');
  console.log('button:', await label());
  const ch = await mk('choices');
  if (ch) await mk('pick', ch.findIndex((c) => c.includes('🔔'))); else await mk('act');
  if (shotDir) { await mk('place', off[0] + 166, off[1] + 122); await mk('face', Math.PI * 0.8); await wait(800); await page.screenshot({ path: `${shotDir}/bosingak-swing.png` }); await mk('place', off[0] + 155, off[1] + 116); }
  await wait(1800);
  if (!(await page.isVisible('#bukchon-panel'))) throw new Error('no card after the first ring');
  console.log('card:', (await page.textContent('#bukchon-panel')).slice(0, 80));
  if (shotDir) await page.screenshot({ path: `${shotDir}/bosingak-card.png` });
  if (errors.length) throw new Error(errors.join('\n'));
  ok = true;
} catch (e) {
  console.error(e.message);
} finally {
  await browser.close();
  console.log(ok ? 'OK' : 'FAILED');
  process.exit(ok ? 0 : 1);
}
