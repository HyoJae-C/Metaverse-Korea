import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isKimchi, kimchiScore, kimchiPrice, kimchiJar, KimchiSales, SELL_PER_DAY, KIMCHI_PRICE } from '../src/core/kimchi-market.js';
import { Bag, cleanEntry } from '../src/core/bag.js';
import { MT, BOSS_LINES } from '../src/ui/market-text.js';
import { KT } from '../src/ui/kimchi-text.js';
import { hillHeightRel } from '../src/core/hill-ground.js';

const LANGS = ['en', 'ko', 'ja', 'zh', 'es', 'id', 'vi', 'hi', 'fr', 'th', 'ar'];
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('a jar keeps its score in the bag and across a reload', () => {
  const store = mem();
  const bag = new Bag(store);
  bag.add(kimchiJar(93, 'Homemade kimchi'));
  bag.add({ kind: 'gift', sips: 1, name: 'Tote', icon: '👜' });
  const again = new Bag(store).list();
  assert.equal(again[0].g, 'kimchi');
  assert.equal(again[0].q, 93);
  assert.ok(isKimchi(again[0]));
  assert.ok(!isKimchi(again[1]));
  assert.equal(again[1].g, undefined); // a shop bag stays a plain shop bag
});

test('old jars (made before the score was kept) still count, as a bronze', () => {
  const old = cleanEntry({ kind: 'gift', sips: 1, name: 'Homemade kimchi', icon: '🫙' });
  assert.ok(isKimchi(old));
  assert.equal(kimchiPrice(old), KIMCHI_PRICE.bronze);
});

test('the better the kimchi, the more coins', () => {
  assert.equal(kimchiPrice(kimchiJar(95)), KIMCHI_PRICE.gold);
  assert.equal(kimchiPrice(kimchiJar(80)), KIMCHI_PRICE.silver);
  assert.equal(kimchiPrice(kimchiJar(60)), KIMCHI_PRICE.bronze);
  assert.equal(kimchiPrice(kimchiJar(10)), KIMCHI_PRICE.none);
  assert.ok(KIMCHI_PRICE.gold > KIMCHI_PRICE.silver && KIMCHI_PRICE.silver > KIMCHI_PRICE.bronze && KIMCHI_PRICE.bronze > KIMCHI_PRICE.none);
  assert.equal(kimchiScore({ q: 140 }), 100);
});

test('only a few jars a day, then the limit resets the next day', () => {
  const store = mem();
  let now = new Date(2026, 10, 5, 12);
  const sales = new KimchiSales(store, () => now);
  const bag = new Bag(mem());
  for (let i = 0; i < SELL_PER_DAY + 2; i++) bag.add(kimchiJar(95));
  let coins = 0;
  for (let i = 0; i < SELL_PER_DAY; i++) coins += sales.sell(bag, 0);
  assert.equal(coins, SELL_PER_DAY * KIMCHI_PRICE.gold);
  assert.equal(sales.left(), 0);
  assert.equal(sales.sell(bag, 0), 0); // limit reached: the jar stays in the bag
  assert.equal(bag.size, 2);
  assert.equal(new KimchiSales(store, () => now).left(), 0); // saved on the device
  now = new Date(2026, 10, 6, 9);
  assert.equal(sales.left(), SELL_PER_DAY);
  assert.equal(sales.sell(bag, 0), KIMCHI_PRICE.gold);
});

test('nothing but kimchi can be sold', () => {
  const sales = new KimchiSales(mem());
  const bag = new Bag(mem());
  bag.add({ kind: 'gift', sips: 1, name: 'Tote', icon: '👜' });
  bag.add({ kind: 'gift', sips: 1, name: 'Fake', icon: '🫙', g: 'tote' });
  assert.equal(sales.sell(bag, 0), 0);
  assert.equal(sales.sell(bag, 1), 0);
  assert.equal(sales.sell(bag, 5), 0);
  assert.equal(bag.size, 2);
  assert.equal(sales.left(), SELL_PER_DAY);
});

test('market text in every language; the boss speaks Korean with romanization', () => {
  for (const [k, v] of Object.entries(MT)) for (const l of LANGS) assert.ok(v[l], `${k}.${l}`);
  for (const l of LANGS) assert.ok(KT.canSell[l], `canSell.${l}`);
  for (const line of Object.values(BOSS_LINES)) assert.equal(line.length, 3);
});

test('Itaewon: restaurants north-west, bars and clubs east along Itaewon-ro, the market north-west too', () => {
  const R = new URL('../public/regions/another-seoul/', import.meta.url);
  const region = JSON.parse(readFileSync(new URL('region.json', R)));
  const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
  const stores = JSON.parse(readFileSync(new URL('stores.json', R))).stores;
  const local = (s) => [s.at[0] - ox, s.at[1] - oz];
  // (Gyeongnidan-gil, up the hill past Noksapyeong-daero, has its own few: tests/gyeongnidan.test.mjs)
  const hill = JSON.parse(readFileSync(new URL('districts/itaewon.json', R))).meta.hill;
  const upHill = (x, z) => hillHeightRel(hill, x - hill.at[0], z - hill.at[1]) > 0;
  const inItaewon = stores.filter((s) => { const [x, z] = local(s); return x > -330 && x < 340 && z > -190 && z < 250 && !upHill(x, z); });
  for (const s of inItaewon.filter((s) => s.category === 'club' || s.category === 'bar')) {
    const [x, z] = local(s);
    assert.ok(x > 0 && z < 0, `${s.id} east, on Itaewon-ro's north side`);
  }
  const food = inItaewon.filter((s) => s.category === 'restaurant' && !s.id.match(/jeon|hotteok|gukbap|kalguksu/));
  // (Its Chinese, Japanese and Western kitchens moved to Seongsu, Euljiro and
  // Sinchon so each gu's share of restaurants is closer to the real one.)
  assert.equal(food.length, 7);
  for (const s of food) { const [x, z] = local(s); assert.ok(x < 0 && z < 0, `${s.id} north-west`); }
  // Every shop is north of Itaewon-ro (Yozi 2026-11-11: the south side isn't needed).
  const itRo = JSON.parse(readFileSync(new URL('districts/itaewon.json', R))).roads.find((r) => r.n?.en === 'Itaewon-ro').p;
  const roadZ = (x) => { const i = itRo.findIndex((q, k) => k && (itRo[k - 1][0] - x) * (q[0] - x) <= 0); const [a, b] = [itRo[i - 1], itRo[i]]; return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]); };
  for (const s of inItaewon.filter((s) => !['museum', 'memorial'].includes(s.category))) { const [x, z] = local(s); assert.ok(z < roadZ(x), `${s.id} north of Itaewon-ro`); }
  const buyer = stores.find((s) => s.workshop === 'kimchi-buy');
  const [bx, bz] = local(buyer);
  assert.ok(bx < 0 && bz < 0, 'the market is north-west (north of Itaewon-ro, like all its shops)');
});

test('japchae and kimbap sell too, sharing the daily limit with kimchi', async () => {
  const { DISHES, dishOf, isHomemade } = await import('../src/core/kimchi-market.js');
  const { JT } = await import('../src/ui/japchae-text.js');
  const { BT } = await import('../src/ui/kimbap-text.js');
  const store = mem();
  const bag = new Bag(store);
  bag.add({ kind: 'gift', sips: 1, name: 'Homemade japchae', icon: '🍝', g: 'japchae', q: 95 });
  bag.add({ kind: 'gift', sips: 1, name: 'Homemade kimbap', icon: '🍙', g: 'kimbap', q: 60 });
  bag.add(kimchiJar(80));
  bag.add({ kind: 'gift', sips: 1, name: 'Homemade kimbap', icon: '🍙', g: 'kimbap', q: 99 });
  const list = new Bag(store).list(); // kept across a reload
  assert.deepEqual(list.map(dishOf), ['japchae', 'kimbap', 'kimchi', 'kimbap']);
  assert.ok(list.every(isHomemade));
  assert.equal(kimchiPrice(list[0]), DISHES.japchae.price.gold);
  assert.equal(kimchiPrice(list[1]), DISHES.kimbap.price.bronze);
  const sales = new KimchiSales(mem());
  let coins = 0;
  for (let i = 0; i < SELL_PER_DAY; i++) coins += sales.sell(bag, 0);
  assert.equal(coins, DISHES.japchae.price.gold + DISHES.kimbap.price.bronze + KIMCHI_PRICE.silver);
  assert.equal(sales.sell(bag, 0), 0); // the fourth dish waits for tomorrow
  assert.equal(bag.size, 1);
  for (const d of Object.values(DISHES)) assert.ok(d.price.gold > d.price.silver && d.price.silver > d.price.bronze && d.price.bronze > d.price.none);
  for (const l of LANGS) { assert.ok(JT.canSell[l], `japchae canSell.${l}`); assert.ok(BT.canSell[l], `kimbap canSell.${l}`); }
});
