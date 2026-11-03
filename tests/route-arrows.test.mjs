import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrowHeading } from '../src/core/route.js';

// Arrows are drawn pointing along -z; rotating by the heading about y must
// point them along the direction of travel.
test('route arrows point the way along the street', () => {
  for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [3, 4]]) {
    const h = arrowHeading(dx, dz), l = Math.hypot(dx, dz);
    const vx = -Math.sin(h), vz = -Math.cos(h);
    assert.ok(Math.abs(vx - dx / l) < 1e-9 && Math.abs(vz - dz / l) < 1e-9, `${dx},${dz}`);
  }
});
