// End-to-end check: the bag's Wardrobe tab is a grid like the bag, with
// chips per kind (tops, bottoms, hats, ...) and a sort chip; picking a piece
// shows Wear, and wearing it ticks its cell.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/closet.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('mk.lang', 'ko'); } catch { /* ignore */ } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Closet');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  for (const id of ['outfit-rogue', 'pants-indigo', 'shoes-pink', 'acc-cap-red', 'acc-scarf', 'acc-beanie-grey', 'acc-tote-river', 'outfit-hoodie-black', 'acc-glasses']) await mk('giveItem', id);
  await mk('bagTab', 'closet');
  const cells = () => page.$$eval('#bag-panel .bag-closet-grid .bag-slot:not(.empty)', (b) => b.map((x) => x.getAttribute('aria-label')));
  const all = await cells();
  if (all.length !== 9) throw new Error('cells: ' + all.join(','));
  if (await page.$('#bag-panel .item-row')) throw new Error('still a list');
  const tabs = await page.$$eval('#bag-panel .bag-tabs .chip', (b) => b.map((x) => x.textContent));
  console.log('tabs:', tabs.join(' | '));
  const kinds = await page.$$eval('#bag-panel .closet-kinds .chip', (b) => b.map((x) => x.textContent));
  console.log('kinds:', kinds.join(' | '));
  if (kinds.length !== 7) throw new Error('kinds: ' + kinds.join(','));
  if (shotDir) await page.screenshot({ path: `${shotDir}/closet-all.png` });
  // Hats only: the cap and the beanie.
  await page.click('#bag-panel .closet-kinds .chip:has-text("모자")');
  const hats = await cells();
  if (hats.length !== 2) throw new Error('hats: ' + hats.join(','));
  // Sort by name, then price.
  await page.click('#bag-panel .closet-kinds .chip:has-text("전체")');
  await page.click('#bag-panel .closet-sort');
  const byName = await cells();
  if (byName.join() !== [...byName].sort((a, b) => a.localeCompare(b)).join()) throw new Error('name order: ' + byName);
  await page.click('#bag-panel .closet-sort');
  console.log('by price:', (await cells()).join(', '));
  // Pick the cap and wear it: its cell gets a tick.
  await page.click('#bag-panel .bag-slot[aria-label="빨간 캡모자"]');
  await page.click('#bag-panel .bag-actions .chip');
  if (!(await page.$('#bag-panel .bag-slot.worn[aria-label="빨간 캡모자"]'))) throw new Error('cap not ticked');
  await page.click('#bag-panel .bag-slot[aria-label="빨간 캡모자"]');
  if (shotDir) await page.screenshot({ path: `${shotDir}/closet-worn.png` });
  await page.click('#bag-panel .bag-tabs .chip >> nth=0');
  if (!(await page.$('#bag-panel .bag-grid:not(.bag-closet-grid)'))) throw new Error('items tab has no slots');
  if (errors.length) throw new Error(errors.join('\n'));
  ok = true;
  console.log('closet OK');
} catch (e) {
  console.error('FAIL', e.message);
  if (shotDir) await page.screenshot({ path: `${shotDir}/closet-fail.png` });
} finally {
  await browser.close();
  process.exit(ok ? 0 : 1);
}
