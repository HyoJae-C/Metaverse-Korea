import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { perfumeIndex, cleanFx, Scent, SCENT_MS, SCENT_KEY, STYLES, MOTIONS, nextPuff, PUFF_EVERY, PUFF_JITTER, SPRAYS } from '../src/core/perfume.js';
import { Bag } from '../src/core/bag.js';

const stores = JSON.parse(readFileSync(new URL('../public/regions/seongsu/stores.json', import.meta.url), 'utf8')).stores;
const mem = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, d };
};

test('Seongsu has 10 perfume shops with 3 perfumes each, 6 per style', () => {
  const shops = stores.filter((s) => s.perfumery);
  assert.equal(shops.length, 10);
  const idx = perfumeIndex(stores);
  assert.equal(idx.size, 30);
  for (const s of shops) {
    assert.equal(s.products.length, 3, s.id);
    assert.ok(s.name.ko && s.name.en && s.at, s.id);
    for (const p of s.products) assert.equal(p.perfume, s.perfumery, p.id);
  }
  const per = {};
  for (const { style } of idx.values()) per[style] = (per[style] || 0) + 1;
  assert.deepEqual(Object.keys(per).sort(), Object.keys(STYLES).sort());
  for (const n of Object.values(per)) assert.equal(n, 6);
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
