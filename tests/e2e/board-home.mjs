// End-to-end check: board game sets for the home (core/board-game-sets.js,
// game/board-games.js). At the board game café the games panel sells the
// sets: buy the croc toy through the shop's own "Spend …?" sheet. At home a
// set stands in the room: walk up to it, the action asks people to a game,
// and a game against the computer starts in the panel.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/board-home.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'boardhome');
await ctx.addInitScript(() => {
  if (localStorage.getItem('mk.home.forest-lane-apt')) return;
  localStorage.setItem('mk.items', JSON.stringify(['bg-omok', 'bg-tower']));
  localStorage.setItem('mk.home.forest-lane-apt', JSON.stringify([{ id: 'bg-omok', x: -2, z: -3, ry: 0 }, { id: 'bg-tower', x: 1.5, z: -3, ry: 0 }]));
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2ebh' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn').catch(() => {});
await page.fill('#nickname', 'Tester').catch(() => {});
await page.click('#start-btn', { timeout: 90000 }).catch(() => {});
await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
const wait = (ms) => page.waitForTimeout(ms);

// The café: the panel lists the sets; buy the croc.
await page.evaluate(() => __mk.enter('dice-and-tea'));
await page.waitForFunction(() => __mk.room()?.id === 'dice-and-tea', null, { timeout: 30000 });
await page.evaluate(() => __mk.place(-5.15, 2.4)); // behind a free chair at the café's third table
const acts = (re) => page.evaluate((src) => { const r = new RegExp(src); const i = (__mk.choices() || []).findIndex((l) => r.test(l)); if (i >= 0) __mk.pick(i); else __mk.act(); }, re);
await page.waitForFunction(() => [__mk.action(), ...(__mk.choices() || [])].some((l) => /Board games/.test(l || '')), null, { timeout: 15000 });
await acts('Board games');
await page.waitForSelector('#bg-panel.on [data-set="croc"]', { timeout: 20000 });
assert(await page.locator('#bg-panel [data-set]').count() === 8, 'eight sets on sale in the panel');
assert(/✓/.test(await page.textContent('#bg-panel [data-set="omok"]')), 'the one I own is ticked');
if (S) await page.screenshot({ path: `${S}/home-sets-on-sale.png` });
await page.click('#bg-panel [data-set="croc"]');
await page.waitForSelector('#product-panel:not([hidden])', { timeout: 10000 });
if (S) { await wait(400); await page.screenshot({ path: `${S}/home-set-buy-sheet.png` }); }
const buy = await page.evaluate(() => [...document.querySelectorAll('#product-panel button')].filter((b) => !b.hidden && b.offsetParent && /40,000/.test(b.textContent)).map((b) => b.id)[0]);
assert(!!buy, 'the croc toy costs 40,000');
await page.click('#' + buy);
await page.click('.spend-ask:not([hidden]) .primary', { timeout: 5000 }).catch(() => {});
await page.waitForFunction(() => __mk.owns('bg-croc'), null, { timeout: 8000 }).catch(() => {});
assert(await page.evaluate(() => __mk.owns('bg-croc')), 'bought: the croc set is mine');
if (!(await page.isHidden('#product-panel'))) await page.keyboard.press('Escape');

// Home: by the tower set, start a game.
await page.evaluate(() => { __mk.homeStub?.(); __mk.enter('forest-lane-apt'); });
await page.waitForFunction(() => __mk.decor() === 2, null, { timeout: 30000 });
await page.evaluate(() => { __mk.goto(1.5, -1.9, Math.PI); __mk.cam?.({ yaw: 0.3, pitch: 0.25, dist: 4.5 }); });
await wait(900);
await page.waitForFunction(() => [__mk.action(), ...(__mk.choices() || [])].some((l) => /🎲/.test(l || '')), null, { timeout: 15000 }).catch(() => {});
const all = await page.evaluate(() => [__mk.action(), ...(__mk.choices() || [])]);
assert(all.some((l) => /🎲.*Block Tower/.test(l || '')), `by the tower set: ${JSON.stringify(all)}`);
if (S) await page.screenshot({ path: `${S}/home-set-in-the-room.png` });
await acts('🎲');
await page.waitForSelector('#bg-panel.on [data-act="start"]', { timeout: 20000 });
await page.click('#bg-panel [data-act="start"]');
await page.waitForSelector('#bg-panel canvas.bg-toy3d', { timeout: 15000 });
assert(!(await page.$('#bg-panel.mini')), 'at home the game is in the big panel');
if (S) { await wait(600); await page.screenshot({ path: `${S}/home-tower-game.png` }); }
await page.click('#bg-panel .bg-x');
assert(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(process.exitCode ? 'FAIL' : 'PASS');
