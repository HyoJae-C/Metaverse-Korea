import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NavGrid } from '../src/core/nav-grid.js';
import { createNavWindow, createRoutePlanner } from '../src/core/nav-window.js';
import { RoadGraph } from '../src/core/route.js';

const box = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

test('a small map is one grid, built once', () => {
  let built = 0;
  const nav = createNavWindow((b) => { built++; return b; }, { minX: -300, minZ: -300, maxX: 300, maxZ: 300 });
  assert.equal(nav(0, 0), nav(250, -250));
  assert.equal(built, 1);
});

test('on a big map the grid is a window round the walker, rebuilt only after walking away', () => {
  const seoul = { minX: -6400, minZ: -4400, maxX: 2800, maxZ: 3200 };
  let built = 0;
  const nav = createNavWindow((b) => { built++; return b; }, seoul, { half: 700, slack: 200 });
  const a = nav(0, 0);
  assert.deepEqual(a, { minX: -700, minZ: -700, maxX: 700, maxZ: 700 });
  assert.equal(nav(150, -150), a);
  assert.equal(built, 1);
  const b = nav(250, 0);
  assert.equal(built, 2);
  assert.equal(b.minX, -450);
  assert.equal(nav(2700, 3100).maxX, 2800, 'cut at the edge of the map');
});

test('a window grid of all Seoul stays small and still routes round a wall', () => {
  const seoul = { minX: -6400, minZ: -4400, maxX: 2800, maxZ: 3200 };
  const walls = [box(-2, -20, 2, 20), box(-5000, -3000, -4990, -2000), box(600, -5, 5000, 5)]; // (near, far away, and one that crosses the window's edge)
  const nav = createNavWindow((b) => new NavGrid(walls, [{ p: [[-6000, 30], [2000, 30]], w: 8 }], b, { cell: 1.5 }), seoul);
  const g = nav(0, 0);
  assert.ok(g.w * g.h < 1e6, `${g.w * g.h} cells`);
  const poly = g.route(-10, 0, 10, 0);
  assert.ok(poly && poly.some(([, z]) => Math.abs(z) > 20));
  assert.ok(!g.open(650, 0), 'the wall that crosses the edge is in');
  assert.ok(g.inside(650, 0) && !g.inside(-4995, -2500));
  assert.equal(g.cost[g._j(30) * g.w + g._i(-300)], 1, 'the road is cheap ground inside the window');
});

// A walker at (0, 0), a long wall just east of them, and a place 2 km east: the
// road graph alone starts with a straight line through the wall.
const crosses = (poly, wall) => poly.slice(1).some(([bx, bz], i) => { const [ax, az] = poly[i]; for (let t = 0; t <= 1; t += 0.01) { const x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (x > wall[0][0] && x < wall[1][0] && z > wall[0][1] && z < wall[2][1]) return true; } return false; });

test('a far place: the grid leads round the walls to the streets that go there', () => {
  const seoul = { minX: -6400, minZ: -4400, maxX: 2800, maxZ: 3200 };
  const wall = box(20, -150, 24, 150);
  const roads = [{ p: [[100, 0], [1000, 0], [2000, 0]], w: 8 }];
  const nav = createNavWindow((b) => new NavGrid([wall], roads, b, { cell: 1.5 }), seoul);
  const graph = new RoadGraph(roads);
  const streets = graph.route(0, 0, 2000, 0);
  assert.ok(crosses(streets, wall), 'the road graph alone walks through the wall');
  const planner = createRoutePlanner(nav, graph);
  const poly = planner.plan(0, 0, 2000, 0);
  assert.ok(!crosses(poly, wall), 'the planned route goes round it');
  assert.deepEqual(poly[poly.length - 1], [2000, 0]);
  assert.ok(poly.some(([x]) => x > 500 && x < 700), 'the grid part reaches near the window\'s edge');
  // Planned again once the walker has left that window, not before.
  assert.equal(planner.stale(100, 0), false);
  assert.equal(planner.stale(300, 0), true);
  // A near place is the grid's own route, and never stale.
  const near = planner.plan(0, 0, 60, 0);
  assert.ok(!crosses(near, wall));
  assert.equal(planner.stale(300, 0), false);
});

test('a far place no street joins up with: still round the walls as far as the window goes', () => {
  const seoul = { minX: -6400, minZ: -4400, maxX: 2800, maxZ: 3200 };
  const wall = box(20, -150, 24, 150);
  const nav = createNavWindow((b) => new NavGrid([wall], [], b, { cell: 1.5 }), seoul);
  const planner = createRoutePlanner(nav, new RoadGraph([]));
  const poly = planner.plan(0, 0, 2000, 0);
  assert.ok(!crosses(poly, wall));
  assert.deepEqual(poly[poly.length - 1], [2000, 0]);
});

test('a route whose points are dead in line with a start inside a wall\'s margin does not throw', () => {
  const g = new NavGrid([box(-1, 5, 1, 9)], [], { minX: -50, minZ: -50, maxX: 50, maxZ: 50 }, { cell: 1.5 });
  assert.doesNotThrow(() => g._simplify([[0, 0], [0, 3], [0, 6], [0, 12]]));
});
