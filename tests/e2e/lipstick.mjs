// End-to-end check: lipsticks and perfume sit in the bag's Wardrobe tab, not
// in the bag's slots; putting a lipstick on from there changes the lips,
// uses one, and the colour stays after the last use.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/lipstick.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  try {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('mk.lang', 'ko');
    localStorage.setItem('mk.bag', JSON.stringify({ items: [{ kind: 'umbrella' }], vanity: [{ kind: 'lipstick', c: 'mint', sips: 2 }, { kind: 'lipstick', c: 'scarlet', sips: 5 }] }));
  } catch { /* ignore */ }
});
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const lip = () => page.evaluate(() => JSON.parse(localStorage.getItem('mk.look') || '{}').lip || null);
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Lips');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  const kinds = await mk('bagKinds');
  if (kinds.join() !== 'umbrella') throw new Error('bag slots: ' + kinds);
  await mk('bagTab', 'closet');
  const cells = () => page.$$eval('#bag-panel .bag-vanity-grid .bag-slot:not(.empty)', (b) => b.map((x) => x.getAttribute('aria-label') + ':' + x.querySelector('small')?.textContent));
  console.log('wardrobe:', (await cells()).join(', '));
  if ((await cells()).length !== 2) throw new Error('lipsticks not in the wardrobe');
  await page.click('#bag-panel .bag-vanity-grid .bag-slot >> nth=0');
  await page.click('#bag-panel .bag-actions .chip.on');
  if (await lip() !== 'mint') throw new Error('lip after 1st: ' + await lip());
  if (shotDir) await page.screenshot({ path: `${shotDir}/wardrobe-lipstick.png` });
  await page.click('#bag-panel .bag-actions .chip.on'); // (still picked) the last use
  const left = await cells();
  console.log('after last use:', left.join(', '));
  if (left.length !== 1 || await lip() !== 'mint') throw new Error('after last: ' + left + ' ' + await lip());
  // A lip shop: the mirror tries colours on for free; buying puts a lipstick
  // (5 uses) in the wardrobe and the face goes back until you put it on.
  await page.click('#bag-panel .sheet-x');
  await mk('enter', 'lip-green');
  await page.waitForTimeout(1500);
  await mk('openBeauty', 'lips');
  await page.click('#beauty-panel .beauty-opt.swatch >> nth=2');
  const buy = await page.textContent('#beauty-panel .order-actions .primary');
  console.log('mirror:', await page.textContent('#beauty-panel .beauty-price'), '|', buy);
  if (!buy.replace(/\D/g, '').endsWith('11000')) throw new Error('buy button: ' + buy);
  if (shotDir) await page.screenshot({ path: `${shotDir}/mirror.png` });
  const before = await page.evaluate(() => window.__mk.wallet.coins);
  await page.click('#beauty-panel .order-actions .primary');
  const after = await page.evaluate(() => window.__mk.wallet.coins);
  if (before - after !== 11000) throw new Error(`paid ${before - after}`);
  if (await lip() !== 'mint') throw new Error('mirror changed the lips for good: ' + await lip());
  await mk('bagTab', 'closet');
  console.log('after buying:', (await cells()).join(', '));
  if ((await cells()).length !== 2) throw new Error('bought lipstick not in the wardrobe');
  await page.reload();
  await page.waitForLoadState('load');
  if (await lip() !== 'mint') throw new Error('colour lost after reload');
  if (errors.length) throw new Error(errors.join('\n'));
  ok = true;
  console.log('lipstick OK');
} catch (e) {
  console.error('FAIL', e.message);
  if (shotDir) await page.screenshot({ path: `${shotDir}/lipstick-fail.png` });
} finally {
  await browser.close();
  process.exit(ok ? 0 : 1);
}
