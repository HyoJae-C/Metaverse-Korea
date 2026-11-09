import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { saveLastSpot, loadLastSpot, usableSpot, saveLastPlace, loadLastPlace, onMap, MAX_AGE_DAYS } from '../src/core/respawn.js';
import { mergeDistricts, districtBoxes } from '../src/core/districts.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const B = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
const free = () => false;

test('saves and loads the last spot', () => {
  const st = memory();
  saveLastSpot(12.345, -7.8, 1.234, st, 1000);
  assert.deepEqual(loadLastSpot(st), { x: 12.3, z: -7.8, ry: 1.23, t: 1000 });
  saveLastSpot(NaN, 0, 0, st, 2000);
  assert.equal(loadLastSpot(st).t, 1000); // bad values aren't saved
});

test('only a fresh, open spot on the map is used', () => {
  const now = 10 * 86400000;
  const s = { x: 1, z: 2, ry: 0, t: now - 1000 };
  assert.ok(usableSpot(s, B, free, now));
  assert.ok(!usableSpot({ ...s, x: 500 }, B, free, now));
  assert.ok(!usableSpot(s, B, () => true, now)); // inside a building
  assert.ok(!usableSpot({ ...s, t: now - (MAX_AGE_DAYS + 1) * 86400000 }, B, free, now));
  assert.ok(!usableSpot(null, B, free, now));
  assert.ok(!usableSpot({ x: '1', z: 2, ry: 0, t: now }, B, free, now));
});

test('the last district is shown only while the saved spot is fresh', () => {
  const st = memory();
  assert.equal(loadLastPlace(st, 1000), null); // first visit: nothing saved
  saveLastPlace('bukchon', st);
  assert.equal(loadLastPlace(st, 1000), null); // no spot yet
  saveLastSpot(1, 2, 0, st, 1000);
  assert.equal(loadLastPlace(st, 2000), 'bukchon');
  assert.equal(loadLastPlace(st, 1000 + (MAX_AGE_DAYS + 1) * 86400000), null);
  saveLastPlace('', st);
  assert.equal(loadLastPlace(st, 2000), 'bukchon'); // empty ids aren't saved
});

test('a spot by a district, on a road or in a park counts as on the map; empty land does not', () => {
  const boxes = [{ id: 'a', x0: 0, x1: 100, z0: 0, z1: 100 }];
  const areas = [{ k: 'park', p: [[500, 0], [600, 0], [600, 100], [500, 100]] }, { k: 'water', p: [[700, 0], [800, 0], [800, 100], [700, 100]] }];
  const onRoad = (x, z) => Math.abs(z - 50) < 5 && x > 100 && x < 500; // a road joining the two
  const m = { boxes, areas, onRoad };
  assert.ok(onMap(120, 120, m)); // within the margin
  assert.ok(onMap(300, 50, m)); // on the joining road
  assert.ok(onMap(550, 50, m)); // in the park
  assert.ok(!onMap(300, 300, m)); // nothing there
  assert.ok(!onMap(750, 50, m)); // the river isn't somewhere to stand
  assert.ok(onMap(9999, 9999, { boxes: [] })); // one-map regions: bounds decide
});

// The real Seoul map: every district box is the right way round (Euljiro's
// Heunginjimun box was written right-to-left and matched nothing, so a
// refresh there sent you back to Seongsu).
test('every district box in Seoul holds the ground it names', () => {
  const dir = new URL('../public/regions/another-seoul/', import.meta.url);
  const region = JSON.parse(readFileSync(new URL('region.json', dir)));
  const parts = region.districts.map((d) => ({ ...d, map: JSON.parse(readFileSync(new URL(d.map, dir))) }));
  const boxes = districtBoxes(mergeDistricts(parts, region.links || [], region.water || []));
  for (const b of boxes) assert.ok(b.x0 < b.x1 && b.z0 < b.z1, b.id);
  // Heunginjimun (Euljiro, local [-4, -318]) is in Euljiro's box now.
  const e = region.districts.find((d) => d.id === 'euljiro').offset;
  assert.ok(onMap(e[0] - 4, e[1] - 318, { boxes: boxes.filter((b) => b.id === 'euljiro') }, 0));
});
