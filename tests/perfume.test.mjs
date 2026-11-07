import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { perfumeIndex, onSale, cleanFx, Scent, SCENT_MS, SCENT_KEY, STYLES, MOTIONS, nextPuff, PUFF_EVERY, PUFF_JITTER, SPRAYS } from '../src/core/perfume.js';
import { Bag } from '../src/core/bag.js';

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url), 'utf8')).stores;
const mem = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, d };
};

const FIVE = ['funny', 'elegant', 'cute', 'simple', 'clean'];
test('10 perfume shops (2 per style, 3 each), 4 handmade workshops and a pop-up, split between Seongsu and Hongdae', () => {
  const shops = stores.filter((s) => s.perfumery);
  const hongdae = shops.filter((s) => s.at[0] < -2750 && s.at[0] > -3150);
  assert.equal(hongdae.length, 5, 'five moved to Hongdae');
  assert.equal(shops.length - hongdae.length, 10, 'ten stay in Seongsu');
  const main = shops.filter((s) => FIVE.includes(s.perfumery));
  assert.equal(main.length, 10);
  for (const st of FIVE) {
    const ps = main.filter((s) => s.perfumery === st).flatMap((s) => s.products);
    assert.equal(ps.length, 6, st);
    for (const p of ps) assert.equal(p.perfume, st, p.id);
  }
  for (const s of shops) {
    assert.ok(s.name.ko && s.name.en && s.at && (s.at[0] || s.at[1]), s.id);
    if (s.perfumery !== 'popup') assert.equal(s.products.length, 3, s.id);
  }
  const crafts = shops.filter((s) => s.perfumery === 'handmade');
  assert.equal(crafts.length, 4);
  for (const s of crafts) for (const p of s.products) assert.equal(p.perfume, 'handmade', p.id);
  const pop = shops.find((s) => s.perfumery === 'popup');
  assert.ok(pop.products.every((p) => p.limited), 'the pop-up sells limited editions');
  const idx = perfumeIndex(stores);
  assert.equal(idx.size, 43);
  for (const { style } of idx.values()) assert.ok(STYLES[style], style);
});

test('limited editions are on sale only between their dates', () => {
  const p = perfumeIndex(stores).get('pf-aerial-tramway').product;
  assert.deepEqual(p.fx.e, ['🚡', '🟧', '➗', '🤿', '🏤']);
  assert.equal(cleanFx(p.fx).e.length, 5);
  assert.ok(onSale(p, new Date(2026, 10, 1)));
  assert.ok(onSale(p, new Date(2026, 10, 30, 23, 59)));
  assert.ok(!onSale(p, new Date(2026, 9, 31)));
  assert.ok(!onSale(p, new Date(2026, 11, 1)));
  assert.ok(onSale({ id: 'x' }), 'not limited: always');
});

test('every perfume has names, a price and an effect the renderer knows', () => {
  for (const { product: p, fx } of perfumeIndex(stores).values()) {
    assert.ok(p.name.en && p.name.ko && p.desc.en && p.desc.ko, p.id);
    assert.ok(p.price > 0, p.id);
    assert.ok(MOTIONS.includes(p.fx.m), p.id);
    assert.deepEqual(fx, cleanFx(p.fx), p.id);
    assert.ok(fx.e.length || fx.c, p.id);
  }
  const effects = [...perfumeIndex(stores).values()].map(({ fx }) => JSON.stringify(fx));
  assert.equal(new Set(effects).size, effects.length, 'each perfume has its own effect');
});

test('cleanFx keeps only what is safe', () => {
  assert.deepEqual(cleanFx({ e: ['💖', 5, '', 'x'.repeat(20)], m: 'boom', c: 'red' }), { e: ['💖'], m: 'float' });
  assert.deepEqual(cleanFx(null), { e: ['@spark'], m: 'float' });
  assert.deepEqual(cleanFx({ c: '#AABBCC', m: 'rise' }), { e: [], m: 'rise', c: '#AABBCC' });
});

test('a spray lasts 3 minutes, survives a reload, and wears off', () => {
  const s = mem();
  const t0 = Date.now();
  const a = new Scent(s);
  assert.equal(a.active(t0), null);
  a.spray('pf-pretty-rainbow', t0);
  assert.equal(a.active(t0 + 1000), 'pf-pretty-rainbow');
  assert.equal(a.minutesLeft(t0 + 1000), 3);
  const b = new Scent(s);
  assert.equal(b.active(t0 + SCENT_MS - 1), 'pf-pretty-rainbow');
  assert.equal(b.active(t0 + SCENT_MS), null);
  assert.equal(s.getItem(SCENT_KEY), null);
});

test('a scent for a perfume that no longer exists is dropped', () => {
  const s = mem({ [SCENT_KEY]: JSON.stringify({ id: 'gone', until: Date.now() + 1000 }) });
  assert.equal(new Scent(s, (id) => id !== 'gone').active(), null);
});

test('puffs come every few seconds, never in step', () => {
  assert.equal(nextPuff(() => 0), PUFF_EVERY - PUFF_JITTER);
  assert.equal(nextPuff(() => 1), PUFF_EVERY + PUFF_JITTER);
});

test('the bag holds perfume bottles with their sprays left', () => {
  const s = mem();
  const bag = new Bag(s, { isPerfume: (id) => id === 'pf-mint-ice', maxSprays: SPRAYS });
  assert.ok(bag.add({ kind: 'perfume', p: 'pf-mint-ice', sips: 4, name: 'Mint Ice' }));
  assert.ok(!bag.add({ kind: 'perfume', p: 'nope', sips: 4 }));
  assert.ok(!bag.add({ kind: 'perfume', p: 'pf-mint-ice', sips: 0 }));
  assert.ok(bag.add({ kind: 'perfume', p: 'pf-mint-ice', sips: 99 }));
  const again = new Bag(s, { isPerfume: (id) => id === 'pf-mint-ice', maxSprays: SPRAYS });
  assert.deepEqual(again.list().map((e) => e.sips), [4, SPRAYS]);
});
