import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEPS, VEG, sliceScore, sliceWord, MARINADE, beefScore, spinachScore, spinachState, eggScore, eggSideScore,
  FRY_ORDER, fryScore, fryState, noodleScore, noodleState, PARTS, SAUCE, mixScore, mixNotes, plateScore, totalScore, WORDS,
} from '../src/core/japchae-game.js';
import { medalFor } from '../src/core/grill-game.js';
import { JT, JAPCHAE_LINES } from '../src/ui/japchae-text.js';

const LANGS = ['en', 'ko', 'ja', 'zh', 'es', 'id', 'vi', 'hi', 'ar'];
const card = (list) => Object.fromEntries(list.filter((g) => !g.decoy).map((g) => [g.id, g.target]));

test('slicing: thin matchsticks score best', () => {
  assert.equal(sliceScore([0.25, 0.3, 0.2, 0.35]), 100);
  assert.ok(sliceScore([0.9, 0.9, 0.9, 0.9]) < 20);
  assert.deepEqual([0.02, 0.28, 0.7].map(sliceWord), ['thin', 'good', 'thick']);
  assert.equal(sliceScore([]), 0);
});

test('beef marinade: the card scores 100, decoys cost', () => {
  assert.equal(beefScore(card(MARINADE)), 100);
  assert.equal(beefScore({ ...card(MARINADE), blackpepper: 0 }), 100); // optional
  assert.equal(beefScore({ ...card(MARINADE), ketchup: 1 }), 85);
  assert.ok(beefScore({}) < 50);
});

test('spinach: 20-40 seconds, cold water, squeezed, seasoned', () => {
  const ok = { secs: 30, cooled: true, squeezed: true, seasoned: true };
  assert.equal(spinachScore(ok), 100);
  assert.equal(spinachScore({ ...ok, cooled: false }), 75);
  assert.ok(spinachScore({ ...ok, secs: 90 }) < 10);
  assert.deepEqual([5, 30, 80].map(spinachState), ['raw', 'bright', 'mushy']);
});

test('egg garnish: low heat, separated, flipped in time', () => {
  const sheets = [{ a: 0.7, b: 0.6 }, { a: 0.6, b: 0.75 }];
  assert.equal(eggScore({ sheets, heat: 'low' }), 100);
  assert.equal(eggScore({ sheets, heat: 'high' }), 80);
  assert.equal(eggScore({ sheets, heat: 'low', separated: false }), 75);
  assert.ok(eggSideScore(1.2) < 40);
  assert.equal(eggScore({ sheets: [], heat: 'low' }), 0);
});

test('stir-fry: tender-crisp, light colours first', () => {
  const times = Object.fromEntries(FRY_ORDER.map((id) => [id, 0.6]));
  assert.equal(fryScore({ times, order: FRY_ORDER }), 100);
  assert.equal(fryScore({ times, order: [...FRY_ORDER].reverse() }), 60); // 10 pairs out of order
  assert.ok(fryScore({ times: { onion: 0.6 }, order: ['onion'] }) <= 20);
  assert.deepEqual([0.2, 0.6, 0.9, 1.1].map(fryState), ['raw', 'tender', 'soft', 'burnt']);
});

test('noodles: 6-7.5 minutes, 2-3 snips', () => {
  assert.equal(noodleScore({ mins: 6.5, snips: 2 }), 100);
  assert.equal(noodleScore({ mins: 6.5, snips: 0 }), 80);
  assert.equal(noodleScore({ mins: 6.5, snips: 6 }), 70);
  assert.ok(noodleScore({ mins: 12, snips: 2 }) < 10);
  assert.deepEqual([3, 7, 10].map(noodleState), ['hard', 'chewy', 'mushy']);
});

test('mixing and plating', () => {
  const full = { added: PARTS, amounts: card(SAUCE), mixes: 4 };
  assert.equal(mixScore(full), 100);
  assert.deepEqual(mixNotes(full), ['glossy']);
  assert.ok(mixNotes({ ...full, amounts: { ...card(SAUCE), vinegar: 1 } }).includes('strange'));
  assert.ok(mixNotes({ ...full, mixes: 9 }).includes('broken'));
  assert.ok(mixScore({ ...full, added: [] }) <= 60);
  assert.equal(plateScore({ mound: true, yolk: true, white: true, seeds: true }), 100);
  assert.equal(plateScore({ mound: true }), 40);
});

test('the total and the medal', () => {
  const all = Object.fromEntries(STEPS.map((k) => [k, 100]));
  assert.equal(medalFor(totalScore(all)), 'gold');
  assert.equal(totalScore({ ...all, egg: 20 }), 90);
  assert.equal(totalScore({}), 0);
});

test('every japchae text and word has all nine languages', () => {
  const keys = new Set(Object.keys(JT));
  for (const k of STEPS) { assert.ok(keys.has('s.' + k), k); assert.ok(keys.has('tip.' + k), k); }
  for (const g of [...MARINADE, ...SAUCE]) assert.ok(keys.has('g.' + g.id), g.id);
  for (const v of [...VEG.map((x) => x.id), ...PARTS, 'beef']) assert.ok(keys.has('v.' + v), v);
  for (const w of WORDS) assert.ok(keys.has('w.' + w.key), w.key);
  for (const s of ['raw', 'tender', 'soft', 'burnt']) assert.ok(keys.has('fry.' + s), s);
  for (const [k, v] of Object.entries(JT)) for (const l of LANGS) assert.ok(v[l], `${k}.${l}`);
  for (const [k, [ko, rom, tr]] of Object.entries(JAPCHAE_LINES)) {
    assert.ok(ko && rom, k);
    for (const l of LANGS.filter((x) => x !== 'ko')) assert.ok(tr[l], `${k}.${l}`);
  }
});
