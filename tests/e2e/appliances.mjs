// End-to-end check: home appliances (core/appliances.js, game/appliances.js).
// A home with a fridge, a washer and a microwave on a table, and a coffee in
// the bag. Walk up to the fridge: its doors open and the coffee goes in (out
// of the bag, kept on a shelf), walk away and the doors close. The washer and
// the microwave run when used.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/appliances.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'appliances');
await ctx.addInitScript(() => {
  if (localStorage.getItem('mk.home.forest-lane-apt')) return;
  localStorage.setItem('mk.items', JSON.stringify(['f-fridge', 'f-washer', 'f-microwave']));
  localStorage.setItem('mk.bag', JSON.stringify({ cap: 20, items: [{ kind: 'coffee', sips: 3, name: 'Iced Americano' }, { kind: 'umbrella' }] }));
  localStorage.setItem('mk.home.forest-lane-apt', JSON.stringify([{ id: 'f-fridge', x: -3, z: -4, ry: 0 }, { id: 'f-washer', x: -1.5, z: -4.1, ry: 0 }, { id: 'table', x: 2, z: -3.5, ry: 0 }, { id: 'f-microwave', x: 2, z: -3.5, ry: 0, y: 0.65 }]));
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2eap' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn').catch(() => {});
await page.fill('#nickname', 'Tester').catch(() => {});
await page.click('#start-btn', { timeout: 90000 }).catch(() => {});
await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
await page.evaluate(() => { __mk.homeStub?.(); __mk.enter('forest-lane-apt'); });
await page.waitForFunction(() => __mk.decor() === 4, null, { timeout: 30000 });
const wait = (ms) => page.waitForTimeout(ms);
const label = () => page.evaluate(() => document.getElementById('action-btn')?.textContent || '');
const store = (k) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), k);

await page.evaluate(() => { __mk.goto(-2.2, -2.4, Math.PI); __mk.cam?.({ yaw: 0.3, pitch: 0.2, dist: 4.5 }); });
await wait(800);
if (S) await page.screenshot({ path: `${S}/1-appliances-at-home.png` });
await page.evaluate(() => __mk.goto(-3, -2.9, Math.PI));
await wait(600);
assert((await label()).includes('🧊'), `by the fridge: "${await label()}"`);
await page.click('#action-btn');
await page.waitForSelector('.fridge-panel:not([hidden])', { timeout: 10000 });
await wait(800);
if (S) await page.screenshot({ path: `${S}/2-fridge-open.png` });
const put = page.locator('.fridge-panel .tank-row button', { hasText: '➕' });
assert(await put.count() === 1, 'only the coffee can go in (not the umbrella)');
await put.first().click();
await wait(400);
assert((await store('mk.fridge'))?.[0]?.name === 'Iced Americano' && (await store('mk.fridge'))[0].sips === 3, 'the coffee is in the fridge, sips kept');
assert(!(await store('mk.bag')).items.some((e) => e.kind === 'coffee'), 'and gone from the bag');
if (S) await page.screenshot({ path: `${S}/3-coffee-in-the-fridge.png` });
await page.evaluate(() => __mk.goto(1, 1, Math.PI));
await wait(900);
assert(await page.isHidden('.fridge-panel'), 'walked away: the fridge closes');

await page.evaluate(() => __mk.goto(-1.5, -3.1, Math.PI));
await wait(600);
assert((await label()).includes('🧺'), `by the washer: "${await label()}"`);
await page.click('#action-btn');
await wait(3500);
if (S) await page.screenshot({ path: `${S}/4-washer-spinning.png` });
await page.evaluate(() => __mk.goto(2, -2.4, Math.PI));
await wait(600);
assert((await label()).includes('♨️'), `by the microwave: "${await label()}"`);
await page.click('#action-btn');
await wait(2200);
if (S) await page.screenshot({ path: `${S}/5-microwave-on.png` });
assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
