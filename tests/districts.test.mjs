import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeDistricts, loadRegionMap, placeOf, districtBoxes, districtAt } from '../src/core/districts.js';

const a = { meta: { region: 'seoul' }, roads: [{ k: 'walk', w: 3, p: [[0, 0], [10, 0]] }], buildings: [{ h: 9, p: [[1, 1], [2, 1], [2, 2]] }], areas: [], rail: [], pois: [{ kind: 'station', x: 1, z: 2 }] };
const b = { roads: [], buildings: [{ h: 6, p: [[0, 0], [1, 0], [1, 1]] }], areas: [{ k: 'water', p: [[0, 0], [5, 0], [5, 5]] }], blockers: [{ p: [[0, 0], [5, 0], [5, 5]] }] };

test('districts are shifted by their offsets and joined', () => {
  const m = mergeDistricts([{ id: 'a', map: a }, { id: 'b', map: b, offset: [100, -50] }], [{ k: 'primary', w: 16, p: [[10, 0], [100, -50]] }]);
  assert.equal(m.buildings.length, 2);
  assert.deepEqual(m.buildings[1].p[1], [101, -50]);
  assert.equal(m.buildings[1].d, 'b');
  assert.deepEqual(m.areas[0].p[2], [105, -45]);
  assert.equal(m.blockers.length, 1);
  assert.equal(m.roads.length, 2);
  assert.deepEqual(m.pois[0], { kind: 'station', x: 1, z: 2, d: 'a' });
  assert.deepEqual(m.meta.districts.map((d) => d.id), ['a', 'b']);
});

test('a region without districts loads its one map', async () => {
  const files = { 'map.json': a, 'd/b.json': b };
  const one = await loadRegionMap({}, async (f) => files[f]);
  assert.equal(one, a);
  const two = await loadRegionMap({ districts: [{ id: 'a', map: 'map.json' }, { id: 'b', map: 'd/b.json', offset: [10, 0] }] }, async (f) => files[f]);
  assert.equal(two.buildings.length, 2);
});

test('places come from local metres or a lat/lon anchor', () => {
  const ll = () => [7, 8];
  assert.deepEqual(placeOf({ at: [1, 2], anchor: { lat: 0, lon: 0 } }, {}, ll), [1, 2]);
  assert.deepEqual(placeOf({ anchor: { lat: 0, lon: 0 } }, {}, ll), [7, 8]);
});

test('a small district beside a big one wins inside its own box (land areas count, water does not)', () => {
  const big = { buildings: [{ h: 9, p: [[0, 0], [500, 0], [500, 300], [0, 300]] }], areas: [{ k: 'water', p: [[0, 0], [900, 0], [900, 50], [0, 50]] }] };
  const park = { buildings: [{ h: 9, p: [[480, 10], [490, 10], [490, 20], [480, 20]] }], areas: [{ k: 'park', p: [[480, 10], [800, 10], [800, 300], [480, 300]] }] };
  const boxes = districtBoxes(mergeDistricts([{ id: 'big', map: big }, { id: 'park', map: park }]));
  assert.equal(districtAt(boxes, 495, 150), 'park');
  assert.equal(districtAt(boxes, 700, 150), 'park');
  assert.equal(districtAt(boxes, 200, 150), 'big');
  assert.equal(districtAt(boxes, 850, 25), 'park', 'water is not part of a box; nearest within the margin');
});
