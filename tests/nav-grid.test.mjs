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

test('a route along a slanted street runs straight, not zigzagging across it', () => {
  // A 10 m street at about 20 degrees to the grid, shops on both sides.
  const c = Math.cos(0.35), s = Math.sin(0.35);
  const rot = ([u, v]) => [u * c - v * s, u * s + v * c];
  const rbox = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(rot);
  const walls = [];
  for (let u = -200; u < 200; u += 14) walls.push(rbox(u, 9, u + 12, 25), rbox(u, -25, u + 12, -9));
  const big = { minX: -230, minZ: -230, maxX: 230, maxZ: 230 };
  const g = new NavGrid(walls, [{ p: [rot([-220, 0]), rot([220, 0])], w: 10 }], big, { cell: 1.5, r: 0.55 });
  const poly = g.route(...rot([-150, 3]), ...rot([150, -2]));
  for (let i = 1; i < poly.length; i++) assert.ok(g.clear(...poly[i - 1], ...poly[i]), `segment ${i} crosses a wall`);
  let turns = 0;
  for (let i = 1; i < poly.length - 1; i++) {
    const a = Math.atan2(poly[i][1] - poly[i - 1][1], poly[i][0] - poly[i - 1][0]);
    const b = Math.atan2(poly[i + 1][1] - poly[i][1], poly[i + 1][0] - poly[i][0]);
    const d = Math.abs(b - a);
    if (Math.min(d, 2 * Math.PI - d) > 0.15) turns++;
  }
  assert.ok(turns <= 4, `${turns} turns on a straight street`);
});

test('a straightened route still keeps to the street instead of cutting across open ground', () => {
  // An L-shaped street; the open lot inside the bend costs more to cross.
  const g = new NavGrid([], [{ p: [[-25, 20], [20, 20], [20, -25]], w: 6 }], bounds);
  const poly = g.route(-22, 20, 20, -22);
  assert.ok(poly.some(([x, z]) => x > 14 && z > 14), 'goes round the corner');
});
