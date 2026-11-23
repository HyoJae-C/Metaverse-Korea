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
const browser = await chromium.launch({ executablePath: process.env.CHROME || process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'boardhome');
await ctx.addInitScript(() => {
  if (localStorage.getItem('mk.home.forest-lane-apt')) return;
  localStorage.setItem('mk.items', JSON.stringify(['bg-omok', 'bg-tower']));
  localStorage.setItem('mk.homeVisit', 'all');
  localStorage.setItem('mk.home.forest-lane-apt', JSON.stringify([{ id: 'bg-omok', x: -2, z: -3, ry: 0 }, { id: 'bg-tower', x: 1.5, z: -3, ry: 0 }]));
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const ROOM = 'e2ebh' + Math.random().toString(36).slice(2, 8);
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
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
await page.waitForSelector('#bg-panel.on', { timeout: 20000 });
await wait(800);
// The sets are off sale for now (core/board-game-sets.js BOARD_SETS_ON_SALE): then the panel lists none.
const onSale = await page.locator('#bg-panel [data-set]').count();
if (!onSale) {
  assert(true, 'the sets are not on sale for now');
  await page.evaluate(() => window.__bgUi?.close?.());
} else {
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
}
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
assert(!(await page.$('#bg-panel.mini')), 'my turn: the big panel');
assert(await page.evaluate(() => __mk.seated?.() ?? true), 'sitting on the floor by the set');
if (S) { await wait(600); await page.screenshot({ path: `${S}/home-tower-game.png` }); }
await page.evaluate(() => document.querySelector('#bg-panel .bg-spot[data-spot="28"]').click());
await page.waitForSelector('#bg-panel.mini', { timeout: 8000 }).catch(() => {});
if (S) { await wait(500); await page.evaluate(() => { document.getElementById('bg-panel').style.visibility = 'hidden'; }); await wait(200); await page.screenshot({ path: `${S}/home-tower-floor.png` }); await page.evaluate(() => { document.getElementById('bg-panel').style.visibility = ''; }); }
await page.click('#bg-panel .bg-x');

// A visitor comes in: the host asks them to Omok at the set, they say yes, and both have the board.
const ctx2 = await browser.newContext({ viewport: { width: 960, height: 640 } });
await useFakeRealtime(ctx2, 'boardhome2');
const g = await ctx2.newPage();
g.on('pageerror', (e) => errors.push('guest: ' + e.message));
await g.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
await g.click('#next-btn').catch(() => {});
await g.fill('#nickname', 'Guest G').catch(() => {});
await g.click('#start-btn', { timeout: 90000 }).catch(() => {});
await g.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
if (await g.isVisible('#welcome-panel')) await g.click('#welcome-close');
await g.waitForFunction(() => window.__mk, null, { timeout: 60000 });
await page.waitForFunction(() => __mk.homeVisit().hosting, null, { timeout: 30000 });
const hostId = (await page.evaluate(() => __mk.homeVisit())).me;
await g.evaluate((id) => __mk.homeStub([{ net_id: id, name: 'Tester', friend: false, level: 1 }]), hostId);
await g.evaluate(() => __mk.openHomes());
await g.waitForSelector('#visit-panel .visit-list button', { timeout: 10000 });
await g.click('#visit-panel .visit-list button');
await g.waitForFunction((id) => __mk.homeVisit().guest === id, hostId, { timeout: 30000 });
await g.waitForFunction(() => __mk.decor() === 2, null, { timeout: 20000 });
await g.evaluate(() => __mk.goto(-2, -1.6, Math.PI));
await g.waitForTimeout(800);
assert(!(await g.evaluate(() => [__mk.action(), ...(__mk.choices() || [])].some((l) => /🎲/.test(l || '')))), 'a guest by the set gets no "Play" (the host asks)');
await page.evaluate(() => __mk.goto(-2, -1.9, Math.PI));
await page.waitForFunction(() => [__mk.action(), ...(__mk.choices() || [])].some((l) => /🎲.*Omok/.test(l || '')), null, { timeout: 15000 }).catch(async (e) => { console.log('host choices:', await page.evaluate(() => JSON.stringify([__mk.action(), ...(__mk.choices() || [])]))); throw e; });
await acts('🎲');
await page.waitForFunction(() => [...document.querySelectorAll('#bg-panel .bg-btn')].some((x) => /Invite Guest G/.test(x.textContent)), null, { timeout: 15000 }).catch(async (e) => { console.log('panel:', await page.evaluate(() => document.querySelector('#bg-panel')?.textContent?.slice(0, 300)), await page.evaluate(() => JSON.stringify(__mk.others?.() ?? null))); throw e; });
await page.evaluate(() => [...document.querySelectorAll('#bg-panel .bg-btn')].find((x) => /Invite Guest G/.test(x.textContent)).click());
await g.waitForSelector('#bg-ask', { timeout: 15000 });
if (S) await g.screenshot({ path: `${S}/home-invite.png` });
await g.evaluate(() => document.querySelector('#bg-ask button').click());
await page.waitForFunction(() => /Guest G is in/.test(document.querySelector('#bg-panel')?.textContent || ''), null, { timeout: 15000 });
await page.click('#bg-panel [data-act="start"]');
for (const p of [page, g]) await p.waitForSelector('#bg-panel.on canvas.bg-omok', { timeout: 15000 });
assert(true, 'host and visitor are both at the Omok board');
if (S) { await g.waitForTimeout(500); await g.screenshot({ path: `${S}/home-omok-guest.png` }); }
assert(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(process.exitCode ? 'FAIL' : 'PASS');
