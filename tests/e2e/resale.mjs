// End-to-end check: buying clothes puts them in the bag (not on you), and
// Second Fashion's clerk buys them back for half.
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
await page.evaluate(() => __mk.coins(500));
await page.evaluate(() => __mk.enter('second-fashion'));
await page.waitForTimeout(1500);
const look0 = await page.evaluate(() => __mk.look());
await page.evaluate(() => __mk.product(0));
await page.waitForSelector('#product-adopt:not([hidden])');
console.log('button before:', await page.textContent('#product-adopt'));
await page.click('#product-adopt');
console.log('toast:', await page.textContent('#toast'));
console.log('button after:', await page.textContent('#product-adopt'));
const look1 = await page.evaluate(() => __mk.look());
console.log('model same after buy:', look0.model === look1.model, look1.model, 'coins', await page.evaluate(() => __mk.coins()), 'items', await page.evaluate(() => __mk.items()));
if (S) await page.screenshot({ path: S + '/bought.png' });
assert(look0.model === look1.model && (await page.evaluate(() => __mk.items())).includes('outfit-shirt-denim'), 'bought into the bag, not worn');
await page.click('#product-close');
await page.evaluate(() => __mk.toClerk());
await page.waitForTimeout(500);
console.log('action:', await page.evaluate(() => __mk.action()));
await page.evaluate(() => __mk.act());
await page.waitForSelector('#resale-panel:not([hidden])');
if (S) await page.screenshot({ path: S + '/resale.png' });
await page.click('#resale-panel .fish-row .chip');
console.log('toast:', await page.textContent('#toast'), 'coins', await page.evaluate(() => __mk.coins()), 'items', await page.evaluate(() => __mk.items()));
if (S) await page.screenshot({ path: S + '/sold.png' });
assert((await page.evaluate(() => __mk.coins())) === 475 && !(await page.evaluate(() => __mk.items())).length, 'sold for half');
assert(!errors.length, 'no page errors');
console.log('errors', errors);
await browser.close();
