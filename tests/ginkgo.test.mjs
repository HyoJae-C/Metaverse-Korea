import test from 'node:test';
import assert from 'node:assert/strict';
import { lyingNuts, describeNuts, NUT_MAX } from '../src/game/ginkgo.js';
import { cleanEntry } from '../src/core/bag.js';

test('some ginkgos have a few nuts under them, the same for everyone in a slot', () => {
  const trees = Array.from({ length: 400 }, (_, i) => [i * 14, 0, 1]);
  const withNuts = trees.filter((tr, i) => lyingNuts(tr, i, 1000).length).length;
  assert.ok(withNuts > 80 && withNuts < 200, `${withNuts} of 400`);
  for (const [tr, i] of trees.slice(0, 50).map((tr, i) => [tr, i])) {
    const a = lyingNuts(tr, i, 1000), b = lyingNuts(tr, i, 1000);
    assert.deepEqual(a, b);
    for (const [x, z] of a) {
      const d = Math.hypot(x - tr[0], z - tr[1]);
      assert.ok(d >= 0.8 && d <= 2.6, `nut ${d.toFixed(2)} m from the trunk`);
    }
    if (a.length) assert.ok(a.length >= 2 && a.length <= 4);
  }
});

test('the nuts change with the slot', () => {
  const tr = [0, 0, 1];
  const seen = new Set(Array.from({ length: 30 }, (_, s) => JSON.stringify(lyingNuts(tr, 3, s))));
  assert.ok(seen.size > 5);
});

test('ginkgo nuts in the bag: one slot, a count kept to 1-99', () => {
  assert.deepEqual(cleanEntry({ kind: 'ginkgo', n: 5 }), { kind: 'ginkgo', n: 5 });
  assert.deepEqual(cleanEntry({ kind: 'ginkgo', n: 500 }), { kind: 'ginkgo', n: NUT_MAX });
  assert.deepEqual(cleanEntry({ kind: 'ginkgo' }), { kind: 'ginkgo', n: 1 });
  const card = describeNuts({ kind: 'ginkgo', n: 3 }, (k, v) => k + JSON.stringify(v || {}));
  assert.equal(card.canHold, false);
  assert.match(card.desc, /"n":3/);
});
