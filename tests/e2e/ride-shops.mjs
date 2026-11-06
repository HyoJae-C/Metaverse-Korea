// End-to-end check: in every ride shop, buy a skin, an upgrade and a ride
// by clicking the panel's buttons (a click used to crash with
// "Cannot read properties of undefined (reading 'toast')").
//   npx vite --port 5179 &
//   node tests/e2e/ride-shops.mjs http://localhost:5179/
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:5179/';
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Rider');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.coins(5000));
const fail = (m) => { console.error('FAIL', m); process.exitCode = 1; };
for (const [store, shop, special] of [['pedal-lab', 'pedal', null], ['bike-research-lab', 'lab', 'tune'], ['ride-with-me', 'rwm', 'kit'], ['hangeul-mihak', 'hangul', null]]) {
  await page.evaluate((i) => __mk.enter(i), store);
  await page.waitForTimeout(1500);
  await page.evaluate((s) => __mk.bikeShop(s), shop);
  const before = await page.evaluate(() => __mk.coins());
  // A skin (the shop's first locked pattern).
  const tabs = page.locator('#lp-panel .ride-tab');
  if (!special) await tabs.first().click(); else await tabs.nth(1).click();
  await page.locator('#lp-panel .skin-pat', { hasText: '·' }).first().click();
  // Its own upgrade tab, then a ride.
  if (special) { await tabs.first().click(); await page.locator('#lp-panel .bike-btns .chip').first().click(); }
  await page.locator('#lp-panel .ride-tab', { hasText: /Board|보드/ }).click();
  await page.locator('#lp-panel .bike-btns .chip').first().click();
  const after = await page.evaluate(() => __mk.coins());
  if (!(after < before)) fail(`${shop}: nothing was bought`);
  await page.evaluate(() => { document.getElementById('lp-panel').hidden = true; __mk.leave(); });
  await page.waitForTimeout(1200);
}
if (errors.length) fail(errors.join('\n'));
console.log(process.exitCode ? 'ride shops: FAILED' : 'ride shops: ok');
await browser.close();
