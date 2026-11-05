import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEPS, makeCabbages, pickScore, halveScore, halveResult, saltScore, saltVerdict, LEAVES, soakScore, bendTest,
  rinseScore, rinseVerdict, pasteScore, pasteState, INGREDIENTS, REAL, seasonScore, tasteNotes, stuffScore,
  packScore, BUBBLES, ripenScore, totalScore, WORDS,
} from '../src/core/kimchi-game.js';
import { medalFor } from '../src/core/grill-game.js';
import { KT, KIMCHI_LINES } from '../src/ui/kimchi-text.js';

const LANGS = ['en', 'ko', 'ja', 'zh', 'es', 'id', 'vi', 'hi', 'ar'];
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test('three cabbages: one perfect, one so-so, one poor', () => {
  for (const rng of [Math.random, seq([0.1, 0.9, 0.5, 0.3]), seq([0])]) {
    const list = makeCabbages(rng);
    assert.equal(list.length, 3);
    assert.deepEqual(list.map(pickScore).sort((a, b) => b - a), [100, 50, 25]);
    for (const c of list) assert.equal(c.kg >= 2.6, c.traits.heavy);
  }
});

test('halving: only slit the root end', () => {
  assert.equal(halveScore(0.3), 100);
  assert.equal(halveResult(0.3), 'clean');
  assert.equal(halveResult(0.05), 'short');
  assert.equal(halveResult(0.9), 'through');
  assert.ok(halveScore(0.9) < 60);
});

test('salting: two pinches per stem, little on the leaves', () => {
  const good = Array.from({ length: LEAVES }, () => ({ stem: 2, leaf: 0 }));
  assert.equal(saltScore(good), 100);
  assert.equal(saltVerdict(good), 'good');
  const heavy = good.map(() => ({ stem: 4, leaf: 3 }));
  assert.equal(saltVerdict(heavy), 'high');
  assert.ok(saltScore(heavy) < 30);
  assert.equal(saltVerdict([{ stem: 1, leaf: 0 }, ...good.slice(1)]), 'low');
  assert.equal(saltScore(good.map(() => ({ stem: 0, leaf: 0 }))), 25); // only the "no salt on leaves" part
});

test('soaking: 6-8 hours, turned once halfway; bend test', () => {
  assert.equal(soakScore({ hours: 7, turnedAt: 3.5 }), 100);
  assert.equal(soakScore({ hours: 7 }), 70);
  assert.ok(soakScore({ hours: 7, turnedAt: 0.5 }) < 100);
  assert.ok(soakScore({ hours: 12, turnedAt: 4 }) < 20);
  assert.deepEqual([1, 5, 7, 11].map(bendTest), ['snaps', 'stiff', 'bends', 'limp']);
});

test('rinsing three times, cut side down', () => {
  assert.equal(rinseScore({ rinses: 3, cutDown: true }), 100);
  assert.equal(rinseScore({ rinses: 3, cutDown: false }), 70);
  assert.equal(rinseScore({ rinses: 0, cutDown: true }), 0);
  assert.equal(rinseVerdict(1), 'salty');
  assert.equal(rinseVerdict(3), 'good');
  assert.equal(rinseVerdict(6), 'bland');
  assert.equal(rinseScore({ rinses: 9, cutDown: true }), 60);
});

test('rice paste: thin porridge, no lumps, not burnt', () => {
  assert.equal(pasteScore({ thick: 0.8, lumps: 0 }), 100);
  assert.equal(pasteScore({ thick: 0.8, lumps: 3 }), 70);
  assert.ok(pasteScore({ thick: 1.3, lumps: 0 }) <= 20);
  assert.deepEqual([0.1, 0.5, 0.8, 1, 1.2].map(pasteState), ['watery', 'thickening', 'ready', 'thick', 'burnt']);
});

test('seasoning: the recipe card scores 100; decoys and bare hands cost', () => {
  const recipe = Object.fromEntries(REAL.map((g) => [g.id, g.target]));
  assert.equal(seasonScore(recipe), 100);
  assert.deepEqual(tasteNotes(recipe), ['balanced']);
  assert.equal(seasonScore({ ...recipe, gochugaru: 5, pear: 0 }), 100); // "to taste" and optional
  assert.equal(seasonScore({ ...recipe, ketchup: 1 }), 85);
  assert.equal(seasonScore(recipe, { gloves: false }), 92);
  assert.ok(seasonScore({}) < 30);
  assert.ok(tasteNotes({ ...recipe, fishsauce: 5 }).includes('salty'));
  assert.ok(tasteNotes({ ...recipe, gochugaru: 6 }).includes('spicy'));
  assert.ok(tasteNotes({ ...recipe, vinegar: 1 }).includes('strange'));
  assert.equal(new Set(INGREDIENTS.map((g) => g.id)).size, INGREDIENTS.length);
});

test('stuffing: stem first, two strokes, then the leaf', () => {
  const good = Array.from({ length: LEAVES }, () => ({ stem: 2, leaf: 1, stemFirst: true }));
  assert.equal(stuffScore(good), 100);
  assert.ok(stuffScore(good.map((l) => ({ ...l, stemFirst: false }))) === 85);
  assert.equal(stuffScore(good.map(() => ({ stem: 0, leaf: 0 }))), 0);
});

test('packing, ripening and the total', () => {
  assert.equal(packScore({ wrapped: 2, bubblesLeft: 0, covered: true }), 100);
  assert.equal(packScore({ wrapped: 2, bubblesLeft: BUBBLES, covered: false }), 40);
  assert.equal(ripenScore('room'), 100);
  assert.ok(ripenScore('sun') < ripenScore('fridge'));
  const all = Object.fromEntries(STEPS.map((k) => [k, 100]));
  assert.equal(medalFor(totalScore(all)), 'gold');
  assert.equal(totalScore({}), 0);
  assert.equal(totalScore({ ...all, pick: 0 }), 90);
});

test('every kimchi text and word has all nine languages', () => {
  const keys = new Set(Object.keys(KT));
  for (const k of STEPS) { assert.ok(keys.has('s.' + k), k); assert.ok(keys.has('tip.' + k), k); }
  for (const g of INGREDIENTS) assert.ok(keys.has('g.' + g.id), g.id);
  for (const w of WORDS) assert.ok(keys.has('w.' + w.key), w.key);
  for (const [k, v] of Object.entries(KT)) {
    if (k === 'kg') continue; // a unit, the same everywhere
    for (const l of LANGS) assert.ok(v[l], `${k}.${l}`);
  }
  for (const [k, [ko, rom, tr]] of Object.entries(KIMCHI_LINES)) {
    assert.ok(ko && rom, k);
    for (const l of LANGS.filter((x) => x !== 'ko')) assert.ok(tr[l], `${k}.${l}`);
  }
});
