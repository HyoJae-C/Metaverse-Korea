import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { foldHomes, HOME_ID } from '../src/core/home-fold.js';

const mem = (o) => {
  const m = new Map(Object.entries(o));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
const L = (n) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: 'p' + i, x: 0, z: 0, ry: 0 })));

test('one home is left in homes.json (Sunny Villa only points to it)', () => {
  const all = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/homes.json', import.meta.url), 'utf8')).homes;
  assert.deepEqual(all.filter((h) => !h.movedTo).map((h) => h.id), [HOME_ID]);
  assert.ok(all.filter((h) => h.movedTo).every((h) => h.movedTo === HOME_ID));
});

test('a villa-only layout moves into the home', () => {
  const s = mem({ 'mk.home.sunny-villa': L(5) });
  foldHomes(s);
  assert.equal(s.getItem('mk.home.' + HOME_ID), L(5));
  assert.equal(s.getItem('mk.home.sunny-villa'), null);
  assert.equal(s.getItem('mk.home.backup.' + HOME_ID), null);
});

test('both decorated: the fuller room wins, the other is backed up', () => {
  const a = mem({ 'mk.home.sunny-villa': L(10), ['mk.home.' + HOME_ID]: L(9) });
  foldHomes(a);
  assert.equal(a.getItem('mk.home.' + HOME_ID), L(10));
  assert.equal(a.getItem('mk.home.backup.' + HOME_ID), L(9));
  const b = mem({ 'mk.home.sunny-villa': L(1), ['mk.home.' + HOME_ID]: L(12) });
  foldHomes(b);
  assert.equal(b.getItem('mk.home.' + HOME_ID), L(12));
  assert.equal(b.getItem('mk.home.backup.sunny-villa'), L(1));
  assert.equal(b.getItem('mk.home.sunny-villa'), null);
});

test('an empty villa just goes away; running again changes nothing', () => {
  const s = mem({ 'mk.home.sunny-villa': '[]', ['mk.home.' + HOME_ID]: L(3) });
  foldHomes(s);
  foldHomes(s);
  assert.deepEqual([...s.m.keys()], ['mk.home.' + HOME_ID]);
});
