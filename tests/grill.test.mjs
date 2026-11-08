import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Grill, sideScore, doneness, medalFor, Medals, GOLDEN } from '../src/core/grill-game.js';

test('golden scores best, raw scores low, burnt scores zero', () => {
  assert.equal(sideScore(GOLDEN), 1);
  assert.ok(sideScore(0.2) < 0.2);
  assert.equal(sideScore(1.1), 0);
  assert.equal(doneness(0.1), 'raw');
  assert.equal(doneness(0.78), 'golden');
  assert.equal(doneness(1.2), 'burnt');
});

test('only the side facing down cooks, and flipping switches it', () => {
  const g = new Grill(() => 0.5);
  g.step(2);
  const s = g.slices[0];
  assert.ok(s.sides[0] > 0 && s.sides[1] === 0);
  g.flip(0);
  g.step(2);
  assert.ok(s.sides[1] > 0);
});

test('perfect timing gives gold; leaving it on burns it', () => {
  const g = new Grill(() => 0.5);
  for (const s of g.slices) s.sides = [GOLDEN, GOLDEN];
  g.slices.forEach((_, i) => g.serve(i));
  assert.equal(g.done, true);
  assert.equal(g.score, 100);
  assert.equal(medalFor(g.score), 'gold');
  const b = new Grill(() => 0.5);
  b.step(30); // never flipped
  b.slices.forEach((_, i) => b.serve(i));
  assert.equal(medalFor(b.score), null);
  assert.equal(medalFor(80), 'silver');
  assert.equal(medalFor(60), 'bronze');
});

test('medals keep the best one and pay money for each new tier once', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const m = new Medals(storage);
  assert.equal(m.add('grill', 'bronze'), 5000);
  assert.equal(m.add('grill', 'bronze'), 0);
  assert.equal(m.add('grill', 'gold'), 17000); // silver + gold
  assert.equal(m.add('grill', 'silver'), 0);
  assert.equal(new Medals(storage).best('grill'), 'gold');
});
