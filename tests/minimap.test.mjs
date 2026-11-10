import test from 'node:test';
import assert from 'node:assert/strict';
import { gridIndex, nearShapes, rimPoint, VIEW_M } from '../src/game/minimap.js';
import { BADGES_PHONE, BADGES_WIDE } from '../src/ui/map-view.js';

test('minimap finds the streets near you and not the far ones', () => {
  const shapes = [
    { p: [[0, 0], [10, 0]] },
    { p: [[-200, 50], [200, 50]] }, // a long road crossing many cells
    { p: [[2000, 2000], [2010, 2000]] },
  ];
  const grid = gridIndex(shapes);
  const near = nearShapes(grid, shapes, 5, 5, VIEW_M * 1.5);
  assert.ok(near.includes(shapes[0]) && near.includes(shapes[1]));
  assert.ok(!near.includes(shapes[2]));
  assert.equal(new Set(near).size, near.length, 'each shape once');
});

test('a far guide target sits on the minimap rim, a near one in place', () => {
  const s = 1, r = 50, pad = 5;
  assert.deepEqual(rimPoint(10, -10, s, r, pad), { x: 10, y: -10, inside: true });
  const far = rimPoint(300, 400, s, r, pad);
  assert.equal(far.inside, false);
  assert.ok(Math.abs(Math.hypot(far.x, far.y) - (r - pad)) < 1e-9);
  assert.ok(far.x > 0 && far.y > 0, 'same direction');
});

test('the full map shows only a few district badges at once', () => {
  assert.ok(BADGES_PHONE <= 4 && BADGES_WIDE <= 8 && BADGES_PHONE <= BADGES_WIDE);
});
