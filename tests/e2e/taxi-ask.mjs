// End-to-end check: a taxi picked on the map asks "Spend ₩…?" and goes on
// OK, every time (not only the first ride, when the taxi code downloads).
// The map closes on the pick, so the question can't play that tap again.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/taxi-ask.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2etaxi' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.coins(100000));
const where = () => page.evaluate(() => { const p = __mk.me ? __mk.me() : null; return p; });

// Tap an empty spot of the map in taxi mode (offset from the middle, where I am).
async function taxiTap(dx) {
  await page.click('#map-btn');
  await page.waitForSelector('#map-panel:not([hidden])');
  await page.click('#map-taxi');
  const box = await page.locator('#map-panel .map-canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2 + 40);
}
const rideShowing = () => page.evaluate(() => !document.getElementById('taxi-ride').hidden);
for (let n = 1; n <= 2; n++) {
  const before = await page.evaluate(() => __mk.coins());
  await taxiTap(n === 1 ? 60 : -60);
  // (the first time, the taxi code downloads first)
  await page.waitForSelector('.spend-ask:not([hidden]), #taxi-ride:not([hidden])', { timeout: 15000 }).catch(() => {});
  const asked = await page.isVisible('.spend-ask:not([hidden])');
  if (asked) {
    if (S) await page.screenshot({ path: `${S}/ride${n}-ask.png` });
    await page.click('.spend-ask:not([hidden]) .primary');
  }
  await page.waitForTimeout(500);
  const riding = await rideShowing();
  const after = await page.evaluate(() => __mk.coins());
  console.log(`ride ${n}: asked=${asked} riding=${riding} paid=${before - after}`);
  assert(riding && after < before, `taxi ride ${n} goes and is paid`);
  await page.waitForTimeout(6500); // (the ride is 5.6 s)
  assert(!(await rideShowing()), `ride ${n} arrived`);
}
// "No" keeps the money and no ride.
{
  const before = await page.evaluate(() => __mk.coins());
  await taxiTap(80);
  await page.waitForSelector('.spend-ask:not([hidden])', { timeout: 3000 });
  await page.click('.spend-ask:not([hidden]) .chip');
  await page.waitForTimeout(500);
  assert(!(await rideShowing()) && (await page.evaluate(() => __mk.coins())) === before, 'no: no ride, money kept');
}
assert(!errors.length, 'no page errors ' + errors.join(' | '));
await browser.close();
