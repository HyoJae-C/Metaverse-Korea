// End-to-end check: buy a jacket at Seongsu's Gaeul Vintage, then sell it
// back to the clerk for 10% (browser-only wallet, as in ?debug).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/resale.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 2 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2eresale' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.coins(500000));
await page.evaluate(() => __mk.enter('gaeul-vintage'));
await page.waitForTimeout(1500);
await page.evaluate(() => __mk.product(0));
await page.waitForSelector('#product-adopt:not([hidden])');
await page.click('#product-adopt');
const items = await page.evaluate(() => __mk.items());
console.log('bought:', items, 'coins', await page.evaluate(() => __mk.coins()));
assert(items.includes('outfit-jacket-cocoa') && (await page.evaluate(() => __mk.coins())) === 430000, 'bought the ₩70,000 jacket');
await page.click('#product-close');
await page.evaluate(() => __mk.toClerk());
await page.waitForTimeout(500);
console.log('action:', await page.evaluate(() => __mk.action()));
await page.evaluate(() => __mk.act());
await page.waitForSelector('#resale-panel:not([hidden])');
console.log('panel:', (await page.textContent('#resale-panel')).replace(/\s+/g, ' '));
if (S) await page.screenshot({ path: S + '/resale.png' });
await page.click('#resale-panel .fish-row .chip');
await page.waitForFunction(() => !__mk.items().includes('outfit-jacket-cocoa'), null, { timeout: 5000 }).catch(() => {});
console.log('after:', (await page.textContent('#resale-panel')).replace(/\s+/g, ' '), 'coins', await page.evaluate(() => __mk.coins()), 'items', await page.evaluate(() => __mk.items()));
if (S) await page.screenshot({ path: S + '/sold.png' });
assert((await page.evaluate(() => __mk.coins())) === 437000 && !(await page.evaluate(() => __mk.items())).includes('outfit-jacket-cocoa'), 'sold for 10% (₩7,000)');
assert((await page.evaluate(() => __mk.look())).model === 'basic', 'took the jacket off first');
assert(!errors.length, 'no page errors');
console.log('errors', errors);
await browser.close();
