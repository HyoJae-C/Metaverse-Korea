import test from 'node:test';
import assert from 'node:assert/strict';
import { RoadGraph } from '../src/core/route.js';

// An L-shaped street plus a separate street that is not connected.
const roads = [
  { p: [[0, 0], [100, 0]] },
  { p: [[100, 0], [100, 100]] },
  { p: [[500, 500], [600, 500]] },
];

test('route follows the streets around the corner', () => {
  const g = new RoadGraph(roads);
  const r = g.route(0, 0, 100, 100);
  assert.deepEqual(r, [[0, 0], [100, 0], [100, 100]]);
});

test('route falls back to a straight line when not connected or close', () => {
  const g = new RoadGraph(roads);
  assert.equal(g.route(0, 0, 600, 500).length, 2);
  assert.deepEqual(g.route(0, 0, 10, 10), [[0, 0], [10, 10]]);
});
