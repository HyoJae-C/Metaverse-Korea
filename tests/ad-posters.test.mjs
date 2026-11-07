import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyLots, lotFront } from '../src/core/ad-posters.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));

test('lotFront finds the side a lot faces', () => {
  const b = { p: [[0, 0], [16, 0], [16, 12], [0, 12]], f: [0, 1] };
  assert.deepEqual(lotFront(b), { x: 8, z: 12, nx: 0, nz: 1, half: 8 });
});

test('a lot with a shop in front is not an ad spot; numbers stay put', () => {
  const lots = [
    { p: [[0, 0], [16, 0], [16, 12], [0, 12]], f: [0, 1] },
    { p: [[18, 0], [34, 0], [34, 12], [18, 12]], f: [0, 1] },
  ];
  const spots = emptyLots(lots, [[8, 14]]);
  assert.deepEqual(spots.map((s) => s.id), ['L-02']);
});

test('Seongsu has some empty shop lots for posters, not most of them', () => {
  const map = read('map.json');
  const stores = read('stores.json').stores.filter((s) => s.at && Math.abs(s.at[0]) < 300 && s.at[1] > -120 && s.at[1] < 420);
  const lots = map.buildings.filter((b) => b.f);
  assert.ok(lots.length > 80);
  const spots = emptyLots(map.buildings, stores.map((s) => s.at));
  assert.ok(spots.length > 0 && spots.length < lots.length / 2, `${spots.length} empty lots`);
});
