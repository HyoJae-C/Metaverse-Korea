// End-to-end check: the same furniture more than once (Yozi 2026-11-24).
// Own two golden barrel cacti (mk.itemN) with one in the room: the catalogue
// shows 1/2, a tap puts the second one down (2/2), a third tap opens one to
// edit instead of placing a third. A layout with three is cut to the two I own.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/furniture-copies.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'furniture-copies');
await ctx.addInitScript(() => {
  if (localStorage.getItem('mk.home.forest-lane-apt')) return;
  localStorage.setItem('mk.items', JSON.stringify(['plant-barrel']));
  localStorage.setItem('mk.itemN', JSON.stringify({ 'plant-barrel': 1 }));
  localStorage.setItem('mk.home.forest-lane-apt', JSON.stringify([{ id: 'plant-barrel', x: -3, z: -4, ry: 0 }, { id: 'bed', x: 3, z: -4, ry: 0 }]));
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2efc' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn').catch(() => {});
await page.fill('#nickname', 'Tester').catch(() => {});
await page.click('#start-btn', { timeout: 90000 }).catch(() => {});
await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
await page.evaluate(() => { __mk.homeStub?.(); __mk.enter('forest-lane-apt'); });
await page.waitForFunction(() => __mk.decor() === 2, null, { timeout: 30000 });
const wait = (ms) => page.waitForTimeout(ms);
const cactus = '#decor-grid [data-id="plant-barrel"]';
const badge = () => page.locator(cactus + ' .decor-n').textContent();
const plants = () => page.evaluate(() => JSON.parse(localStorage.getItem('mk.home.forest-lane-apt')).filter((i) => i.id === 'plant-barrel').length);

await page.evaluate(() => __mk.goto(0, 0, Math.PI));
await page.click('#decor-btn');
await wait(400);
assert(await badge() === '1/2', `one of two out: "${await badge()}"`);
await page.click(cactus);
await wait(500);
assert(await plants() === 2, 'a tap puts the second cactus down');
assert(await badge() === '2/2' && await page.locator(cactus).evaluate((b) => b.classList.contains('placed')), 'both out: 2/2 and ticked');
if (S) await page.screenshot({ path: `${S}/1-two-cacti.png` });
await page.click(cactus);
await wait(400);
assert(await plants() === 2 && await page.isVisible('#piece-bar'), 'a third tap opens one to edit, no third cactus');
assert(await page.locator('#decor-grid [data-id="bed"] .decor-n').isHidden(), 'free pieces show no count');

// A layout with more than I own (another device, a made-up save): cut to two.
await page.evaluate(() => { localStorage.setItem('mk.home.forest-lane-apt', JSON.stringify([0, 1, 2].map((k) => ({ id: 'plant-barrel', x: -3 + k, z: -4, ry: 0 })))); __mk.leave?.(); });
await wait(500);
await page.evaluate(() => __mk.enter('forest-lane-apt'));
await wait(1500);
assert(await page.evaluate(() => __mk.decor()) === 2, `three in the save, two owned: ${await page.evaluate(() => __mk.decor())} shown`);
assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
