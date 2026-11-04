import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clipLine, clipPoly, cropMap, placedPoints, polyArea } from '../scripts/lib/crop-map.mjs';

const BOX = [-10, -10, 10, 10];

test('clipLine cuts a road at the box edge', () => {
  assert.deepEqual(clipLine([[-20, 0], [20, 0]], BOX), [[[-10, 0], [10, 0]]]);
  assert.deepEqual(clipLine([[-20, 20], [20, 20]], BOX), []);
  // In, out, in again: two pieces.
  assert.equal(clipLine([[0, 0], [0, 20], [5, 20], [5, 0]], BOX).length, 2);
});

test('clipPoly keeps the part of a park inside the box', () => {
  const p = clipPoly([[0, 0], [20, 0], [20, 20], [0, 20]], BOX);
  assert.equal(polyArea(p), 100);
  assert.deepEqual(clipPoly([[20, 20], [30, 20], [30, 30]], BOX), []);
});

test('cropMap drops small buildings and lanes, but not next to a shop', () => {
  const sq = (x, z, s) => [[x, z], [x + s, z], [x + s, z + s], [x, z + s]];
  const map = {
    buildings: [{ p: sq(0, 0, 9) }, { p: sq(-9, -9, 5) }, { p: sq(40, -45, 3) }, { p: sq(48, 48, 5) }],
    roads: [{ k: 'service', p: [[0, 0], [5, 0]] }, { k: 'primary', p: [[-90, 0], [90, 0]] }, { k: 'residential', p: [[0, 0], [0, 5]] }],
    areas: [], pois: [{ x: 0, z: 0 }, { x: 80, z: 0 }],
  };
  const out = cropMap(map, [-50, -50, 50, 50], { keepNear: [[-8, -8]], minBuilding: 50, minAlley: 10 });
  // big one kept; small one by the shop kept; small lone one and the one over the edge dropped
  assert.equal(out.buildings.length, 2);
  assert.deepEqual(out.roads.map((r) => r.k), ['primary']);
  assert.equal(out.pois.length, 1);
});

test('placedPoints reads at and anchor positions', () => {
  const region = { center: { lat: 37.5, lon: 127 } };
  const pts = placedPoints(region, { stores: { stores: [{ at: [3, 4] }, { anchor: { lat: 37.5, lon: 127 } }] }, bikes: { stations: [{ at: [1, 2] }] } });
  assert.deepEqual(pts.map((p) => p.map((v) => Math.round(v) + 0)), [[3, 4], [0, 0], [1, 2]]);
});
