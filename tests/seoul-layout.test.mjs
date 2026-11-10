import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toGame, toLatLon, anchorOffset, boxOverlap, SCALE } from '../src/core/seoul-grid.js';
import { loadAll, layout, problems } from '../scripts/place-districts.mjs';

test('the Seoul grid is real Seoul at 1/4 around Seongsu Station', () => {
  assert.equal(SCALE, 1 / 4);
  assert.deepEqual(toGame(37.5446, 127.0557).map((v) => Math.round(v) + 0), [0, 0]);
  const [x, z] = toGame(37.5572, 126.9245); // Hongik Univ. Station, ~11.6 km west-north-west
  assert.ok(Math.abs(Math.hypot(x, z) - 11600 / 4) < 150);
  assert.ok(x < 0 && z < 0, 'west is -x, north is -z');
  const back = toLatLon(x, z);
  assert.ok(Math.abs(back.lat - 37.5572) < 1e-9 && Math.abs(back.lon - 126.9245) < 1e-9);
});

test('an anchor puts its local spot on the real place, plus any nudge', () => {
  const [x, z] = toGame(37.55, 127.0);
  assert.deepEqual(anchorOffset({ lat: 37.55, lon: 127.0, local: [10, -20] }), [Math.round(x - 10), Math.round(z + 20)]);
  assert.deepEqual(anchorOffset({ lat: 37.55, lon: 127.0, nudge: [5, 5] }), [Math.round(x + 5), Math.round(z + 5)]);
  assert.deepEqual(boxOverlap({ x0: 0, x1: 10, z0: 0, z1: 10 }, { x0: 5, x1: 20, z0: 8, z1: 20 }), [5, 2]);
  assert.deepEqual(boxOverlap({ x0: 0, x1: 10, z0: 0, z1: 10 }, { x0: 11, x1: 20, z0: 0, z1: 10 }), [0, 0]);
});

// Every district sits on its real place (its anchor), inside its gu, and
// none overlap. Adding or moving a district: give it an anchor in
// region.json and run `node scripts/place-districts.mjs --apply`.
test('the Seoul districts are on their real places and do not overlap', () => {
  const { region, maps, seoul } = loadAll();
  assert.deepEqual(problems(layout(region, maps, seoul)), []);
});
