import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMBLEMS, NAME_COLORS, TIERS, EmblemCollection, priceOf } from '../src/core/emblems.js';
import { sanitizeLook } from '../src/data/appearance.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const walletOf = (coins) => ({ coins, spend(n) { if (n > this.coins) return false; this.coins -= n; return true; } });

test('20 emblems in three tiers, unique ids', () => {
  assert.equal(EMBLEMS.length, 20);
  for (const tier of Object.keys(TIERS)) assert.ok(EMBLEMS.some((e) => e.tier === tier) && NAME_COLORS.some((c) => c.tier === tier), tier);
  assert.equal(new Set(EMBLEMS.map((e) => e.id)).size, 20);
  assert.equal(new Set(NAME_COLORS.map((e) => e.id)).size, NAME_COLORS.length);
  assert.ok(TIERS.basic.price < TIERS.fancy.price && TIERS.fancy.price < TIERS.dazzling.price);
});

test('buying spends coins once and is remembered', () => {
  const st = memory();
  const w = walletOf(250);
  const c = new EmblemCollection(st);
  assert.equal(c.buy('emblem', 'crown', w), 'bought');
  assert.equal(w.coins, 250 - priceOf(EMBLEMS.find((e) => e.id === 'crown')));
  assert.equal(c.buy('emblem', 'crown', w), 'owned');
  assert.equal(c.buy('color', 'rainbow', w), 'poor');
  assert.equal(c.buy('color', 'red', w), 'bought');
  const again = new EmblemCollection(st);
  assert.ok(again.has('emblem', 'crown') && again.has('color', 'red') && !again.has('color', 'rainbow'));
});

test('looks keep valid emblem and name colour only', () => {
  assert.equal(sanitizeLook({ emblem: 'heart', nameColor: 'gold' }).emblem, 'heart');
  assert.equal(sanitizeLook({ emblem: 'heart', nameColor: 'gold' }).nameColor, 'gold');
  const bad = sanitizeLook({ emblem: '<img>', nameColor: 'url(x)' });
  assert.equal(bad.emblem, undefined);
  assert.equal(bad.nameColor, undefined);
});
