import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FISH, rollFish, tapsFor, FishBag, BAG_MAX } from '../src/core/fishing.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};

test('ten kinds, chances add up to 100%, from 0.1% to 30%', () => {
  assert.equal(FISH.length, 10);
  assert.equal(Math.round(FISH.reduce((a, f) => a + f.chance, 0) * 1000) / 1000, 100);
  assert.equal(Math.min(...FISH.map((f) => f.chance)), 0.1);
  assert.equal(Math.max(...FISH.map((f) => f.chance)), 30);
  for (const f of FISH) for (const l of ['en', 'ja', 'zh']) assert.ok(f.name[l] && f.ko && f.rom, f.id);
});

test('rarer catches sell for more and fight harder', () => {
  for (let i = 1; i < FISH.length; i++) {
    assert.ok(FISH[i].chance <= FISH[i - 1].chance, `${FISH[i].id} is rarer`);
    assert.ok(FISH[i].price >= FISH[i - 1].price, `${FISH[i].id} costs more`);
    assert.ok(tapsFor(FISH[i]) >= tapsFor(FISH[i - 1]));
  }
});

test('rolls follow the chances', () => {
  assert.equal(rollFish(() => 0).id, 'crucian');
  assert.equal(rollFish(() => 0.999).id, 'whale');
  assert.equal(rollFish(() => 0.995).id, 'shark');
  const n = 20000, seen = {};
  let s = 42;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) { const f = rollFish(rand); seen[f.id] = (seen[f.id] || 0) + 1; }
  assert.ok(Math.abs(seen.crucian / n - 0.3) < 0.02);
});

test('the bag keeps catches, caps at its size, and sells', () => {
  const st = memory();
  const bag = new FishBag(st);
  bag.add('crucian'); bag.add('crucian'); bag.add('tuna');
  assert.equal(new FishBag(st).size, 3);
  assert.equal(bag.value, 2 + 15);
  assert.equal(bag.sell('crucian', 1), 1);
  assert.equal(bag.sellAll(), 1 + 15);
  assert.equal(bag.size, 0);
  for (let i = 0; i < BAG_MAX + 5; i++) bag.add('catfish');
  assert.equal(bag.size, BAG_MAX);
  assert.equal(bag.add('whale'), false);
});
