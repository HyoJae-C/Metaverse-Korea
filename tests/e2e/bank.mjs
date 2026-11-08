// End-to-end check: Seoul Bank. A player walks up to the teller: with no
// server (debug) the bank isn't open to them, so it says "coming soon".
// Then, with the status stubbed open (as an operator would see it), the
// transfer form shows and refuses a bad name or amount before asking.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/bank.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=bank' + Date.now());
  await page.click('#next-btn');
  await page.fill('#nickname', 'Banker');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.evaluate(() => __mk.enter('seoul-bank'));
  await page.waitForFunction(() => !!__mk.clerkAt(), null, { timeout: 20000 });
  const [cx, cz] = await page.evaluate(() => __mk.clerkAt());
  await page.evaluate(([x, z]) => __mk.place(x, z + 1.8), [cx, cz]);
  await page.waitForFunction(() => (__mk.action() || '').includes('🏦'), null, { timeout: 10000 });
  if (shotDir) await page.screenshot({ path: `${shotDir}/bank-inside.png` });
  await page.evaluate(() => __mk.act());
  await page.waitForFunction(() => (__mk.bankOpen() || '').includes('Coming soon'), null, { timeout: 10000 });
  if (shotDir) await page.screenshot({ path: `${shotDir}/bank-soon.png` });
  await page.click('#bank-panel .sheet-x');

  await page.evaluate(() => __mk.bankStub(true));
  await page.evaluate(() => __mk.openBank());
  await page.waitForSelector('#bank-panel .bank-go', { timeout: 10000 });
  await page.click('#bank-panel .bank-go');
  await page.waitForFunction(() => document.querySelector('#bank-panel .bank-err')?.textContent.includes('name'), null, { timeout: 5000 });
  await page.fill('#bank-panel .bank-name', 'Someone');
  await page.fill('#bank-panel .bank-amount', '10');
  await page.click('#bank-panel .bank-go');
  await page.waitForFunction(() => document.querySelector('#bank-panel .bank-err')?.textContent.includes('between'), null, { timeout: 5000 });
  if (shotDir) await page.screenshot({ path: `${shotDir}/bank-form.png` });
  await page.evaluate(() => __mk.leave());
  await page.waitForFunction(() => document.querySelector('#bank-panel')?.hidden, null, { timeout: 5000 });
  ok = !errors.length;
} catch (e) {
  console.error(e);
} finally {
  console.log(errors.length ? errors : 'no page errors');
  await browser.close();
}
console.log(ok ? 'bank e2e: ok' : 'bank e2e: FAILED');
process.exit(ok ? 0 : 1);
