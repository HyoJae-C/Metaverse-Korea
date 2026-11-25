import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAV_KEY, FAV_MAX, loadFavs, saveFavs, toggleFav, addSpot, removeFav, hasFav } from '../src/ui/map-favs.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};

test('a place is added newest first and taken off again with the same tap', () => {
  const cafe = { kind: 'store', id: 'cafe-1', x: 12.345, z: -7.06, icon: '☕' };
  let { list, added } = toggleFav([], cafe);
  assert.ok(added);
  assert.deepEqual(list, [{ kind: 'store', id: 'cafe-1', x: 12.3, z: -7.1, icon: '☕' }]);
  ({ list } = toggleFav(list, { kind: 'zone', id: 'A-1', x: 0, z: 0 }));
  assert.equal(list[0].kind, 'zone');
  assert.ok(hasFav(list, cafe));
  ({ list, added } = toggleFav(list, cafe));
  assert.ok(!added);
  assert.ok(!hasFav(list, cafe));
  assert.equal(list.length, 1);
});

test('the same id in another kind is another place', () => {
  const { list } = toggleFav(toggleFav([], { kind: 'store', id: 'x', x: 0, z: 0 }).list, { kind: 'landmark', id: 'x', x: 1, z: 1 });
  assert.equal(list.length, 2);
});

test('saved spots get their own id; the list stops at the limit', () => {
  let list = [];
  for (let i = 0; i < FAV_MAX; i++) list = addSpot(list, i, i, 1000 + i).list;
  assert.equal(list.length, FAV_MAX);
  assert.equal(new Set(list.map((f) => f.id)).size, FAV_MAX);
  const r = addSpot(list, 5, 5, 99999);
  assert.ok(r.full);
  assert.equal(r.list, list);
  assert.equal(removeFav(list, list[3]).length, FAV_MAX - 1);
});

test('kept under an mk. key (the cloud save carries those), bad data ignored', () => {
  const s = memory();
  assert.ok(FAV_KEY.startsWith('mk.'));
  assert.deepEqual(loadFavs(s), []);
  const list = toggleFav([], { kind: 'store', id: 'a', x: 1, z: 2 }).list;
  saveFavs(list, s);
  assert.deepEqual(loadFavs(s), list);
  s.setItem(FAV_KEY, JSON.stringify([{ kind: 'store', id: 'a', x: 1, z: 2 }, { kind: 'store' }, null, { kind: 'spot', id: 'q', x: 'no', z: 0 }]));
  assert.equal(loadFavs(s).length, 1);
  s.setItem(FAV_KEY, '{oops');
  assert.deepEqual(loadFavs(s), []);
  saveFavs([], s);
  assert.ok(!s.m.has(FAV_KEY));
  assert.deepEqual(loadFavs(null), []);
});
