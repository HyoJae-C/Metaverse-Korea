// End-to-end check: the Tteok and Bibimbap Making Classes. Enter each room,
// run the class panel to the end, and the dish lands in the bag.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/cook-classes.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: S ? 2 : 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2ecook' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');

for (const [store, panel, g] of [['tteok-class', 'tteok', 'tteok'], ['bibimbap-class', 'bibimbap', 'bibimbap']]) {
  await page.evaluate((id) => __mk.enter(id), store);
  await page.waitForTimeout(1500);
  if (S) await page.screenshot({ path: `${S}/${panel}-room.png` });
  await page.evaluate((k) => __mk.panel(k).show(), panel);
  const root = `#${panel}-panel`;
  await page.waitForSelector(root + ':not([hidden])', { timeout: 20000 });
  await page.click(root + ' .order-actions .primary');
  for (let i = 0; i < 6; i++) {
    // Each step: do what it asks (the first + on each shelf tile, the first picks,
    // a press on the bar, the first option, every tick), then go on.
    await page.evaluate((r) => {
      const el = document.querySelector(r);
      el.querySelectorAll('.kimchi-ing .ctl button:last-child').forEach((b) => b.click());
      [...el.querySelectorAll('.kimbap-fill button')].slice(0, 5).forEach((b) => b.click());
      el.querySelectorAll('.kimchi-body > .chip').forEach((b) => b.click());
    }, root);
    const hasMeter = await page.isVisible(root + ' .kimchi-meter');
    if (hasMeter) {
      for (let k = 0; k < 3 && await page.isVisible(root + ' .order-actions .primary:not([disabled])') && !(await page.isVisible(root + ' .kimchi-verdict')); k++) {
        await page.waitForTimeout(400);
        await page.click(root + ' .order-actions .primary');
      }
    } else if (!(await page.isVisible(root + ' .kimchi-verdict'))) {
      await page.click(root + ' .order-actions button:not([disabled])');
    }
    await page.waitForSelector(root + ' .kimchi-verdict', { timeout: 5000 });
    if (S && i === 1) await page.screenshot({ path: `${S}/${panel}-step.png` });
    await page.click(root + ' .order-actions .primary');
  }
  await page.waitForSelector(root + ' .grill-result', { timeout: 5000 });
  if (S) await page.screenshot({ path: `${S}/${panel}-result.png` });
  const inBag = await page.evaluate((x) => JSON.parse(localStorage.getItem('mk.bag') || '{}').items?.some((e) => e.g === x), g);
  assert(inBag, `${g} in the bag`);
  console.log(panel, 'done, in bag:', inBag);
  await page.click(root + ' .sheet-x');
}
assert(!errors.length, 'page errors: ' + errors.join(' | '));
await browser.close();
