// End-to-end check: the bowling alley, the climbing gym and the PC방.
// Each room opens with people in it; the station's action opens its game.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/activities.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2eact' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (n) => { if (S) await page.screenshot({ path: `${S}/${n}.png` }); };

for (const [id, kind, panel] of [['strike-lane-bowling', 'bowling', 'bowling-panel'], ['boulder-bloc', 'climbing', 'climb-panel']]) {
  await page.evaluate((i) => __mk.enter(i), id);
  await page.waitForTimeout(1500);
  await shot(kind + '-room');
  const st = await page.evaluate((k) => __mk.interior?.()?.stations?.[k] ?? null, kind);
  const lane = kind === 'bowling' ? (await page.evaluate(() => __mk.bowlLanes()))?.[0] : null;
  const spot = st?.[0] || lane || [-6, -5.2];
  await page.evaluate(([x, z]) => __mk.place(x, z), Array.isArray(spot) ? spot : [spot.x, spot.z]);
  await page.waitForTimeout(400);
  const act = await page.evaluate(() => __mk.action());
  assert(/Bowl|Climb/.test(act || ''), `${kind}: action "${act}"`);
  await page.evaluate(() => __mk.act());
  await page.waitForSelector(`#${panel}:not([hidden])`);
  await page.click(`#${panel} .order-actions .primary`);
  await page.waitForTimeout(400);
  for (let k = 0; k < 4; k++) { await page.click(`#${panel} .karaoke-pad`); await page.waitForTimeout(500); }
  await shot(kind + '-game');
  await page.click(`#${panel} .sheet-x`);
}
await page.evaluate(() => __mk.enter('level-up-pc'));
await page.waitForTimeout(1500);
await shot('pcbang-room');
console.log('errors:', errors);
assert(!errors.length, 'no page errors');
await browser.close();
