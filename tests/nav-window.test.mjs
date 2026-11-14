import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NavGrid } from '../src/core/nav-grid.js';
import { createNavWindow } from '../src/core/nav-window.js';

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
