// Wallpaper and flooring (core/home-finish.js): three Euljiro shops, three
// wallpapers and three floors each, every one an item with a price (its
// purchase is the server receipt), a pattern for each, and a choice that
// only takes what you own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FINISHES, FINISH_KEY, cleanFinish, readFinish, writeFinish } from '../src/core/home-finish.js';
import { FINISH_ART_IDS } from '../src/core/home-finish-art.js';
import { ITEMS } from '../src/core/inventory.js';
import { finishMsg, parseVisitMsg } from '../src/game/home-visits.js';

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
const SHOPS = ['hanok-jimulpo', 'eulji-retro-wall', 'saebyeok-interior'];

test('three shops, three wallpapers, three floors and two doors each, every finish sold once with a price', () => {
  const shops = stores.filter((s) => SHOPS.includes(s.id));
  assert.equal(shops.length, 3);
  for (const s of shops) {
    assert.equal(s.district, 'euljiro', s.id);
    const kinds = s.products.map((p) => FINISHES.find((f) => f.id === p.furniture)?.kind);
    assert.deepEqual(kinds.sort(), ['door', 'door', 'floor', 'floor', 'floor', 'wall', 'wall', 'wall'], s.id);
  }
  const sold = shops.flatMap((s) => s.products);
  assert.equal(sold.length, FINISHES.length);
  for (const f of FINISHES) {
    const p = sold.filter((q) => q.furniture === f.id);
    assert.equal(p.length, 1, f.id);
    assert.equal(p[0].model, 'finish', f.id);
    assert.equal(p[0].price, f.price, f.id + ': the shop and the item agree');
    assert.ok(f.price >= 50000 && f.price <= 150000, f.id + ': cheaper than furniture');
    assert.ok(p[0].name.en && p[0].name.ko && p[0].desc.en && p[0].desc.ko, f.id);
    assert.ok(ITEMS[f.id]?.finish === f.kind, f.id + ' is an item (bought once, kept with a receipt)');
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(f.name[l], f.id + ' ' + l);
  }
});

test('nothing else sells finishes, and the furniture ids stay apart', () => {
  for (const s of stores.filter((st) => !SHOPS.includes(st.id))) assert.ok(!s.products?.some((p) => p.model === 'finish'), s.id);
  for (const f of FINISHES) assert.ok(!f.id.startsWith('f-'), f.id);
});

test('every finish has a pattern', () => {
  assert.deepEqual([...FINISH_ART_IDS].sort(), FINISHES.map((f) => f.id).sort());
});

test('the choice only takes a finish of the right kind that you own', () => {
  const owns = (id) => id === 'wall-sage' || id === 'floor-maru' || id === 'door-arch';
  assert.deepEqual(cleanFinish({ door: 'door-arch' }, owns).door, 'door-arch');
  assert.equal(cleanFinish({ door: 'wall-sage' }, owns).door, null, 'a wallpaper is not a door');
  assert.deepEqual(cleanFinish({ wall: 'wall-sage', floor: 'floor-maru' }, owns), { wall: 'wall-sage', floor: 'floor-maru', door: null });
  assert.deepEqual(cleanFinish({ wall: 'floor-maru', floor: 'wall-sage' }, owns), { wall: null, floor: null, door: null }, 'wrong kind');
  assert.deepEqual(cleanFinish({ wall: 'wall-white', floor: 'nope' }, owns), { wall: null, floor: null, door: null }, 'not owned, unknown');
  assert.deepEqual(cleanFinish(null), { wall: null, floor: null, door: null });
  const store = new Map(), storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  writeFinish({ wall: 'wall-sage', floor: 'junk' }, storage);
  assert.ok(FINISH_KEY.startsWith('mk.'), 'rides in the account save');
  assert.deepEqual(readFinish(owns, storage), { wall: 'wall-sage', floor: null, door: null });
  assert.deepEqual(readFinish(() => false, storage), { wall: null, floor: null, door: null }, 'sold or lost: back to Basic');
});

test('visitors get the host\'s wallpaper and floor', () => {
  const m = parseVisitMsg(finishMsg({ wall: 'wall-hanji', floor: null, door: 'door-panmun' }));
  assert.deepEqual(m, { fin: { wall: 'wall-hanji', floor: null, door: 'door-panmun' } });
  assert.deepEqual(cleanFinish(parseVisitMsg('hv:fin:["wall-hanji",null]').fin), { wall: 'wall-hanji', floor: null, door: null }, 'from a game before doors');
  assert.deepEqual(cleanFinish(parseVisitMsg('hv:fin:["<b>",5]').fin), { wall: null, floor: null, door: null }, 'junk is Basic');
  assert.equal(parseVisitMsg('hv:fin:{oops'), null);
});
