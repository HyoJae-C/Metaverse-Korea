// End-to-end check of Potato Market (감자마켓) by Dongmyo, with a stand-in for
// the server (supabase/034_player_market.sql) inside the page: buy a jacket
// at Monoroom, walk to the market, buy Mina's cap from her stall (sellers go
// on the striped stalls first, then on mats), put the jacket out, then take
// it back.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/potato-market.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 2 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2epotato' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.coins(500000));
await page.evaluate(() => __mk.enter('monoroom'));
await page.waitForTimeout(1500);
await page.evaluate(() => __mk.product(2));
await page.waitForSelector('#product-adopt:not([hidden])');
await page.click('#product-adopt');
await page.waitForTimeout(500);
await page.evaluate(() => __mk.leave());
await page.waitForTimeout(1000);
assert((await page.evaluate(() => __mk.items())).includes('outfit-jacket-black'), 'bought the jacket');

// The stand-in server: one mat of Mina's, then whatever I put out.
await page.evaluate(() => {
  const w = __mk.wallet;
  const L = [{ id: 1, seller: 'mina', name: 'Mina', item: 'acc-cap-red', list: 25000, price: 9000, status: 'open' }];
  const ok = (data) => Promise.resolve({ data });
  w.s = { uid: 'me', u: 1, unit: 'krw', base: w.coins, ver: 1, ads: 0, adsDay: '', queue: [] };
  w.client = { rpc(fn, a = {}) {
    if (fn === 'market_info') return ok({ min_pct: 10, max_pct: 100, fee_pct: 5, days: 3, open_max: 6, min_hours: 24, unit: 'krw' });
    if (fn === 'market_browse') {
      const sellers = [...new Set(L.filter((l) => l.status === 'open').map((l) => l.seller))];
      return ok(L.filter((l) => l.status === 'open').map((l) => ({ id: l.id, item: l.item, list: l.list, price: l.price, mat: sellers.indexOf(l.seller) + 1, name: l.name, mine: l.seller === 'me' })));
    }
    if (fn === 'market_mine') return ok(L.filter((l) => l.seller === 'me' && l.status !== 'back').map((l) => ({ ...l, expired: false })));
    if (fn === 'market_list') {
      const id = L.length + 1;
      L.push({ id, seller: 'me', name: 'Tester', item: a.p_item, list: 70000, price: a.p_price, status: 'open', ref: a.p_ref, paid: 70000 });
      return ok({ status: 'ok', id });
    }
    if (fn === 'market_cancel') {
      const l = L.find((x) => x.id === a.p_id);
      l.status = 'back';
      return ok({ status: 'ok', item: l.item, ref: l.ref, paid: l.paid });
    }
    if (fn === 'market_buy') {
      const l = L.find((x) => x.id === a.p_id);
      if (l.status !== 'open') return ok({ status: 'gone' });
      l.status = 'sold';
      w.s.base -= l.price; w.s.ver++;
      return ok({ status: 'ok', coins: w.s.base, ver: w.s.ver, n: -l.price, item: l.item, list: l.list, op: a.p_op });
    }
    return ok(null);
  } };
});

await page.evaluate(() => __mk.goto(-853, -775, Math.PI));
await page.waitForFunction(() => __mk.action()?.includes('🥔') || __mk.action()?.includes('🧺'), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
console.log('action:', await page.evaluate(() => __mk.action()));
// The first stall on the west edge (src/data/dongmyo.js, its front 1.7 m east).
await page.evaluate(() => __mk.goto(-871.3, -757, Math.PI));
await page.waitForTimeout(800);
console.log('by the stall:', await page.evaluate(() => __mk.action()));
assert((await page.evaluate(() => __mk.action())).includes('Mina\'s stall'), 'beside Mina\'s stall');
if (S) await page.screenshot({ path: S + '/potato-stall.png' });
await page.evaluate(() => __mk.act());
await page.waitForSelector('.potato-panel:not([hidden]) .fish-row button.chip', { timeout: 8000 });
console.log('panel:', (await page.textContent('.potato-panel')).replace(/\s+/g, ' '));
if (S) await page.screenshot({ path: S + '/potato-panel.png' });
await page.click('.potato-panel .fish-row button.chip');
await page.waitForFunction(() => __mk.items().includes('acc-cap-red'), null, { timeout: 8000 }).catch(() => {});
assert((await page.evaluate(() => __mk.items())).includes('acc-cap-red'), 'bought Mina\'s cap');
assert((await page.evaluate(() => __mk.coins())) === 430000 - 9000, 'paid ₩9,000');

// My mat: put the jacket out for ₩35,000.
await page.click('.potato-panel .chips button:nth-child(2)');
await page.waitForSelector('.potato-panel input.potato-price');
console.log('my mat:', (await page.textContent('.potato-panel')).replace(/\s+/g, ' '));
await page.fill('.potato-panel .fish-row:has-text("jacket") input.potato-price, .potato-panel .fish-row:has-text("재킷") input.potato-price', '35000');
await page.click('.potato-panel .fish-row:has-text("jacket") button.potato-go, .potato-panel .fish-row:has-text("재킷") button.potato-go');
await page.waitForFunction(() => !__mk.items().includes('outfit-jacket-black'), null, { timeout: 8000 }).catch(() => {});
console.log('listed:', (await page.textContent('.potato-panel')).replace(/\s+/g, ' '));
assert(!(await page.evaluate(() => __mk.items())).includes('outfit-jacket-black'), 'the jacket left the closet for the mat');
assert((await page.textContent('.potato-panel')).includes('33,250') || (await page.textContent('.potato-panel')).includes('33250'), 'I would get ₩33,250 (less 5%)');
if (S) {
  await page.evaluate(() => __mk.potatoMarket.close());
  await page.evaluate(() => __mk.cam({ yaw: 2.6, dist: 9, pitch: 0.6 }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: S + '/potato-mats.png' });
  await page.evaluate(() => __mk.act());
  await page.waitForTimeout(800);
  await page.click('.potato-panel .chips button:nth-child(2)');
}
await page.waitForSelector('.potato-panel .fish-row button.chip:not(.potato-go)');
await page.click('.potato-panel .fish-row button.chip:not(.potato-go)');
await page.waitForFunction(() => __mk.items().includes('outfit-jacket-black'), null, { timeout: 8000 }).catch(() => {});
assert((await page.evaluate(() => __mk.items())).includes('outfit-jacket-black'), 'took the jacket back');
assert(!errors.length, 'no page errors');
console.log('errors', errors);
await browser.close();
