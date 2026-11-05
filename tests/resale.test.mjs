import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Receipts, resaleCoins, scanLedger, sellable, RESALE_RATE } from '../src/core/resale.js';
import { WEARABLES } from '../src/data/wearables.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const stores = JSON.parse(readFileSync(new URL('../public/regions/seongsu/stores.json', import.meta.url))).stores;

test('a shop pays less than you paid, so buying to sell never makes coins', () => {
  assert.ok(RESALE_RATE < 1);
  assert.equal(resaleCoins(60), 30);
  assert.equal(resaleCoins(25), 12);
  assert.equal(resaleCoins(1), 1);
  assert.equal(resaleCoins(0), 0);
  for (const it of Object.values(WEARABLES)) assert.ok(resaleCoins(it.price) < it.price || it.price <= 1);
});

test('only clothes with a receipt can be sold: gifts and code items cannot', () => {
  const s = mem();
  const r = new Receipts(s);
  r.record('outfit-hoodie-black', 60);
  const owned = ['outfit-hoodie-black', 'pants-black', 'not-clothes'];
  const items = { ...WEARABLES, 'not-clothes': { emoji: '🧸', name: { en: 'Bear' } } };
  r.record('not-clothes', 10);
  assert.deepEqual(sellable(owned, items, r), [{ id: 'outfit-hoodie-black', paid: 60, coins: 30 }]);
  assert.equal(new Receipts(s).paid('outfit-hoodie-black'), 60, 'kept on the device');
  r.forget('outfit-hoodie-black');
  assert.equal(new Receipts(s).paid('outfit-hoodie-black'), 0, 'sold: the receipt goes');
});

test('clothes bought before receipts are found once in the budget book, never gifts for others', () => {
  const hoodie = WEARABLES['outfit-hoodie-black'], cap = WEARABLES['acc-cap-red'], jeans = WEARABLES['pants-black'];
  const log = [
    { t: 1, n: -hoodie.price, note: { name: hoodie.name, at: { en: 'Shop' } } },
    { t: 2, n: -cap.price, note: { name: cap.name, at: { en: 'Gift' } } }, // bought for a friend
    { t: 3, n: 500, note: { k: 'ledger.welcome' } },
  ];
  const isGift = (note) => note?.at?.en === 'Gift';
  const owned = ['outfit-hoodie-black', 'acc-cap-red', 'pants-black'];
  assert.deepEqual(scanLedger(log, owned, WEARABLES, isGift), { 'outfit-hoodie-black': hoodie.price });
  assert.ok(jeans); // owned with no budget book line (a gift or a code): not sellable
  const s = mem(), r = new Receipts(s);
  assert.equal(r.scanOnce(log, owned, WEARABLES, isGift), 1);
  assert.equal(r.paid('outfit-hoodie-black'), hoodie.price);
  r.forget('outfit-hoodie-black');
  assert.equal(r.scanOnce(log, owned, WEARABLES, isGift), 0, 'only once');
  assert.equal(r.paid('outfit-hoodie-black'), 0);
});

test('Hongdae Vintage Garage and Seongsu Second Fashion buy clothes back', () => {
  const vg = stores.find((s) => s.id === 'vintage-garage'), sf = stores.find((s) => s.id === 'second-fashion');
  assert.ok(vg?.resale && sf?.resale);
  assert.equal(vg.name.ko, '빈티지 창고');
  assert.equal(sf.name.ko, '세컨드패션');
  const info = (d) => stores.find((s) => s.id === 'info-' + d).at;
  const near = (a, b, m) => Math.hypot(a[0] - b[0], a[1] - b[1]) < m;
  assert.ok(near(vg.at, info('hongdae'), 100), 'Vintage Garage is in Hongdae');
  assert.ok(sf.at[0] > -260 && sf.at[0] < 260 && sf.at[1] > -110 && sf.at[1] < 410, 'Second Fashion is in Seongsu');
  assert.equal(stores.filter((s) => s.resale).length, 2);
  for (const p of sf.products) assert.ok(WEARABLES[p.item], `${p.id} sells a real item`);
});
