// End-to-end check: the stamp note is a 2×2 page of stamps you turn with
// Previous / Next or a swipe, not one long scrolling list.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/stamp-note.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true });
await ctx.addInitScript(() => { try { localStorage.setItem('mk.lang', 'ko'); } catch { /* ignore */ } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Stamps');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.evaluate(() => document.getElementById('stamp-btn').click());
  await page.waitForSelector('#stamp-panel:not([hidden]) .stamp-page');
  const state = () => page.evaluate(() => ({
    cells: document.querySelectorAll('#stamp-panel .stamp-page .stamp-cell:not(.stamp-blank)').length,
    num: document.querySelector('#stamp-panel .stamp-nav span').textContent,
    cols: getComputedStyle(document.querySelector('#stamp-panel .stamp-page')).gridTemplateColumns.split(' ').length,
  }));
  const a = await state();
  console.log('page 1:', JSON.stringify(a));
  if (a.cells !== 4 || a.cols !== 2 || !a.num.startsWith('1 / ')) throw new Error('first page: ' + JSON.stringify(a));
  if (shotDir) await page.screenshot({ path: `${shotDir}/stamp-page-1.png` });
  await page.click('#stamp-panel .stamp-nav .chip:has-text("다음")');
  const b = await state();
  if (!b.num.startsWith('2 / ')) throw new Error('next: ' + JSON.stringify(b));
  // Swipe right to go back to page 1.
  const box = await page.locator('#stamp-panel .stamp-page').boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 40, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 40, y, { steps: 6 });
  await page.mouse.up();
  const c = await state();
  if (!c.num.startsWith('1 / ')) throw new Error('swipe back: ' + JSON.stringify(c));
  // Swipe left to the last page.
  const pages = +a.num.split('/ ')[1];
  for (let i = 1; i < pages; i++) {
    await page.mouse.move(box.x + box.width - 40, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, y, { steps: 6 });
    await page.mouse.up();
  }
  const d = await state();
  console.log('last:', JSON.stringify(d));
  if (d.num !== `${pages} / ${pages}` || d.cells < 1 || d.cells > 4) throw new Error('last page: ' + JSON.stringify(d));
  if (!(await page.isDisabled('#stamp-panel .stamp-nav .chip:has-text("다음")'))) throw new Error('next not disabled on the last page');
  if (shotDir) await page.screenshot({ path: `${shotDir}/stamp-page-last.png` });
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('stamp note pages ok');
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
