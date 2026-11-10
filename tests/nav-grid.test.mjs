import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NavGrid, trimPoly, pointAhead } from '../src/core/nav-grid.js';
import { liftStations } from '../src/core/districts.js';

const box = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
const bounds = { minX: -30, minZ: -30, maxX: 30, maxZ: 30 };

test('a route goes around a wall, never through it', () => {
  const wall = box(-2, -20, 2, 20);
  const g = new NavGrid([wall], [], bounds);
  const poly = g.route(-10, 0, 10, 0);
  assert.ok(poly && poly.length > 2);
  for (let i = 1; i < poly.length; i++) assert.ok(g.clear(...poly[i - 1], ...poly[i]), `segment ${i} crosses the wall`);
  assert.ok(poly.some(([, z]) => Math.abs(z) > 20), 'goes round an end of the wall');
});

test('a closed-off spot has no route', () => {
  const ring = [box(-6, -6, 6, -4), box(-6, 4, 6, 6), box(-6, -6, -4, 6), box(4, -6, 6, 6)];
  const g = new NavGrid(ring, [], bounds);
  assert.equal(g.route(-20, 0, 0, 0), null);
});

test('a place the search gave up on is not searched again right away', () => {
  const g = new NavGrid([box(-2, -20, 2, 20)], [], bounds);
  assert.equal(g.route(-10, 0, 10, 0, 50), null); // gives up after 50 cells
  let searched = 0;
  const search = g._search.bind(g);
  g._search = (...a) => { searched++; return search(...a); };
  assert.equal(g.route(-9, 1, 10, 0), null);
  assert.equal(searched, 0);
  assert.ok(g.route(-10, 0, -10, 10)); // another place: searched as usual
});

test('trim and look-ahead follow the route', () => {
  const poly = [[0, 0], [10, 0], [10, 10]];
  assert.deepEqual(trimPoly(poly, 9, 1), [[9, 1], [10, 0], [10, 10]]);
  assert.deepEqual(pointAhead(poly, 8, 0, 4).map(Math.round), [10, 2]);
});

test('a building an elevated railway runs through becomes a deck you walk under', () => {
  const map = { rail: [{ e: 1, p: [[-50, 0], [50, 0]] }], buildings: [{ h: 6.4, p: box(-30, -5, 30, 5) }, { h: 9, p: box(-10, 20, 10, 30) }] };
  liftStations(map);
  assert.equal(map.buildings[0].m, 4.5);
  assert.equal(map.buildings[1].m, undefined);
});
