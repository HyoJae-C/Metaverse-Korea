import test from 'node:test';
import assert from 'node:assert/strict';
import { Bag, BASE_CAP, MAX_CAP, BAG_KEY } from '../src/core/bag.js';

const mem = (init = {}) => {
  const d = { ...init };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, d };
};

test('starts empty with 20 slots', () => {
  const b = new Bag(mem());
  assert.equal(b.cap, BASE_CAP);
  assert.equal(b.size, 0);
});

test('holds books, drinks and one umbrella, and saves', () => {
  const s = mem();
  const b = new Bag(s, { isBook: (id) => id === 'hangul' });
  assert.ok(b.add({ kind: 'book', book: 'hangul' }));
  assert.ok(!b.add({ kind: 'book', book: 'nope' }));
  assert.ok(b.add({ kind: 'coffee', sips: 3, name: 'Latte' }));
  assert.ok(b.add({ kind: 'umbrella' }));
  assert.ok(!b.add({ kind: 'umbrella' }), 'one umbrella is enough');
  assert.ok(!b.add({ kind: 'rod' }));
  const again = new Bag(s, { isBook: (id) => id === 'hangul' });
  assert.deepEqual(again.list(), b.list());
  assert.ok(again.has('umbrella'));
});

test('full at 20, and expand adds room up to the max', () => {
  const b = new Bag(mem());
  for (let i = 0; i < BASE_CAP; i++) assert.ok(b.add({ kind: 'coffee', sips: 1 }));
  assert.ok(b.full);
  assert.ok(!b.add({ kind: 'coffee', sips: 1 }));
  assert.equal(b.expand(10), BASE_CAP + 10);
  assert.ok(b.add({ kind: 'coffee', sips: 1 }));
  assert.equal(b.expand(1000), MAX_CAP);
});

test('take and swap', () => {
  const b = new Bag(mem());
  b.add({ kind: 'coffee', sips: 2, name: 'A' });
  b.add({ kind: 'umbrella' });
  assert.deepEqual(b.swap(0, { kind: 'coffee', sips: 5, name: 'B' }), { kind: 'coffee', sips: 2, name: 'A' });
  assert.equal(b.list()[0].name, 'B');
  assert.deepEqual(b.take(1), { kind: 'umbrella' });
  assert.equal(b.take(5), null);
  assert.equal(b.size, 1);
});

test('a broken save gives an empty bag', () => {
  for (const v of ['nope', 'null', '[]', '{"cap":"x","items":{}}', '{"cap":5,"items":[null,1,{"kind":"coffee","sips":0}]}']) {
    const b = new Bag(mem({ [BAG_KEY]: v }));
    assert.equal(b.size, 0, v);
    assert.equal(b.cap, BASE_CAP, v);
  }
});

test('a Han River ramen bowl stays a ramen bowl in the bag', () => {
  const b = new Bag(mem());
  assert.equal(b.add({ kind: 'food', sips: 3, name: 'Ramen', ramen: true }), true);
  assert.equal(b.list()[0].ramen, true);
  b.add({ kind: 'food', sips: 3, name: 'Box', ramen: true, extra: 1 });
  assert.equal(b.add({ kind: 'coffee', sips: 2, ramen: true }), true);
  assert.equal(b.list()[2].ramen, undefined);
});

test('one library book at a time: a second is refused, removeKind returns them, old piles shrink to one', () => {
  const s = mem();
  const b = new Bag(s);
  assert.ok(b.add({ kind: 'book', book: 'hangul' }));
  assert.ok(!b.add({ kind: 'book', book: 'idioms' }), 'only one book out');
  assert.ok(b.add({ kind: 'coffee', sips: 2, name: 'Latte' }));
  assert.equal(b.removeKind('book'), 1);
  assert.ok(!b.has('book'));
  assert.equal(b.size, 1);
  const pile = mem({ [BAG_KEY]: JSON.stringify({ items: [{ kind: 'book', book: 'a' }, { kind: 'umbrella' }, { kind: 'book', book: 'b' }, { kind: 'book', book: 'c' }] }) });
  assert.deepEqual(new Bag(pile).list(), [{ kind: 'book', book: 'a' }, { kind: 'umbrella' }]);
});

test('dishes go in their own food bag, apart from the 20 slots', async () => {
  const { DISH_CAP } = await import('../src/core/bag.js');
  const m = new Map(), s = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  const b = new Bag(s);
  for (let i = 0; i < b.cap; i++) assert.ok(b.add({ kind: 'umbrella' }) || b.add({ kind: 'gift', name: 'x' + i, icon: '🛍️' }));
  assert.ok(b.full);
  const kimbap = { kind: 'gift', name: 'Kimbap', icon: '🍙', g: 'kimbap', q: 90 };
  assert.ok(b.add(kimbap), 'a dish still fits with the slots full');
  assert.equal(b.size, b.cap);
  assert.equal(b.dishes, 1);
  assert.equal(b.fullFor(kimbap), false);
  assert.equal(b.add({ kind: 'gift', name: 'y', icon: '🛍️' }), false);
  for (let i = 1; i < DISH_CAP; i++) assert.ok(b.add(kimbap));
  assert.ok(b.dishFull);
  assert.equal(b.add(kimbap), false);
  // swapping a thing into a dish's place needs a free slot
  const di = b.list().findIndex((e) => e.g === 'kimbap');
  assert.equal(b.swap(di, { kind: 'gift', name: 'z', icon: '🛍️' }), null);
  assert.equal(b.dishes, DISH_CAP);
  // saved and loaded back whole
  const again = new Bag(s);
  assert.equal(again.size, again.cap);
  assert.equal(again.dishes, DISH_CAP);
});
