import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Receipts, resaleCoins, scanLedger, sellable, RESALE_PCT } from '../src/core/resale.js';
import { WEARABLES } from '../src/data/wearables.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;

test('a shop pays 25% of what you paid, rounded down like the server', () => {
  assert.equal(RESALE_PCT, 25);
  assert.equal(resaleCoins(60), 15);
  assert.equal(resaleCoins(45), 11);
  assert.equal(resaleCoins(140), 35);
  assert.equal(resaleCoins(0), 0);
  assert.equal(resaleCoins(60, 0), 0, 'the operator can stop it');
  assert.equal(resaleCoins(60, 20), 12);
  for (const it of Object.values(WEARABLES)) assert.ok(resaleCoins(it.price) < it.price);
  const sql = readFileSync(new URL('../supabase/034_player_market.sql', import.meta.url), 'utf8');
  assert.match(sql, /resell_pct set default 25/, 'the server pays the same 25%');
  assert.match(sql, /set resell_pct = 25 where id = 1 and resell_pct = 10/, 'and moves from 10% unless an operator changed it');
});

test('only clothes with a receipt can be sold: gifts and code items cannot', () => {
  const s = mem();
  const r = new Receipts(s);
  const hoodie = WEARABLES['outfit-hoodie-black'];
  r.record('outfit-hoodie-black', 60, 'op-1', { name: hoodie.name, at: { en: 'VINTAGE GARAGE' } });
  const owned = ['outfit-hoodie-black', 'pants-black', 'not-clothes'];
  const items = { ...WEARABLES, 'not-clothes': { emoji: '🧸', name: { en: 'Bear' } } };
  r.record('not-clothes', 10);
  assert.deepEqual(sellable(owned, items, r), [{ id: 'outfit-hoodie-black', paid: 60, coins: 15 }]);
  assert.deepEqual(new Receipts(s).get('outfit-hoodie-black'), { paid: 60, op: 'op-1', bn: 'Black hoodie · VINTAGE GARAGE', w: 1 }, 'kept on the device, with the purchase id and note');
  r.forget('outfit-hoodie-black');
  assert.equal(new Receipts(s).paid('outfit-hoodie-black'), 0, 'sold: the receipt goes');
});

test('clothes bought before receipts are found once in the budget book, never gifts for others', () => {
  const hoodie = WEARABLES['outfit-hoodie-black'], cap = WEARABLES['acc-cap-red'];
  const log = [
    { t: 1, n: -hoodie.price, note: { name: hoodie.name, at: { en: 'Shop' } } },
    { t: 2, n: -cap.price, note: { name: cap.name, at: { en: 'Gift' } } }, // bought for a friend
    { t: 3, n: 500, note: { k: 'ledger.welcome' } },
  ];
  const isGift = (note) => note?.at?.en === 'Gift';
  const owned = ['outfit-hoodie-black', 'acc-cap-red', 'pants-black'];
  assert.deepEqual(scanLedger(log, owned, WEARABLES, isGift), { 'outfit-hoodie-black': { paid: hoodie.price, op: null, bn: 'Black hoodie · Shop', w: 1 } });
  const s = mem(), r = new Receipts(s);
  assert.equal(r.scanOnce(log, owned, WEARABLES, isGift), 1);
  assert.equal(r.paid('outfit-hoodie-black'), hoodie.price);
  r.forget('outfit-hoodie-black');
  assert.equal(r.scanOnce(log, owned, WEARABLES, isGift), 0, 'only once');
  assert.equal(r.paid('outfit-hoodie-black'), 0);
});

test('receipts saved in coins (before won) are read as won', () => {
  const s = mem();
  s.setItem('mk.paid', JSON.stringify({ 'outfit-hoodie-black': { paid: 60, op: 'op-1', bn: 'x' } }));
  assert.equal(new Receipts(s).paid('outfit-hoodie-black'), 60000);
});

test('two shops buy clothes back: VINTAGE GARAGE in Hongdae and Gaeul Vintage in Itaewon', () => {
  const ids = stores.filter((s) => s.resale).map((s) => s.id).sort();
  assert.deepEqual(ids, ['gaeul-vintage', 'vintage-garage']);
  for (const id of ids) assert.equal(stores.find((s) => s.id === id).category, 'fashion');
  const [x, z] = stores.find((s) => s.id === 'gaeul-vintage').at;
  assert.ok(x > -1400 && x < -1300 && z > 300 && z < 400, 'Gaeul Vintage moved from Seongsu to Itaewon, by Golden Needle Tailor');
});
