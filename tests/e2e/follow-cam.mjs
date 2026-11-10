// End-to-end check: the camera eases round behind you while you walk
// (game/follow-cam.js), waits after a drag, and stays put with its Settings
// switch off.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/follow-cam.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 } })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const gap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
// Walk right (D) for ms; how far the camera ended up from behind the character.
async function walkRight(ms) {
  await mk('face', 0); // facing away from the camera: camera yaw = pi
  await wait(400);
  const y0 = await mk('camYaw');
  await page.keyboard.down('KeyD');
  await wait(ms);
  await page.keyboard.up('KeyD');
  return { turned: gap(await mk('camYaw'), y0) };
}
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Follow');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await mk('place', 0, 6); // Seongsu, an open stretch of road
  if (shotDir) { await mk('face', 0); await wait(600); await page.screenshot({ path: `${shotDir}/0-start.png` }); }
  // On: walking right for a while, the camera swings round behind (a quarter turn).
  const on = await walkRight(4000);
  console.log('follow on: camera turned', on.turned.toFixed(2), 'rad');
  if (shotDir) await page.screenshot({ path: `${shotDir}/1-after-walk.png` });
  if (on.turned < 0.9) throw new Error('camera did not follow: ' + on.turned);
  // Off (the Settings switch): it stays put.
  await page.evaluate(() => document.getElementById('follow-btn').click());
  const off = await walkRight(2500);
  console.log('follow off: camera turned', off.turned.toFixed(2), 'rad');
  if (off.turned > 0.05) throw new Error('camera turned with follow off: ' + off.turned);
  await page.evaluate(() => document.getElementById('follow-btn').click()); // (back on for the next visit)
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
} catch (e) {
  console.error('FAIL', e.message);
} finally {
  await browser.close();
}
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
