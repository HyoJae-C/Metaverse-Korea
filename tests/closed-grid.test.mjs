import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packClosed, closedRects } from '../src/core/closed-grid.js';

test('closed land packed as bits comes back as rectangles over the same squares', () => {
  const w = 7, h = 4, cells = new Uint8Array(w * h);
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1], [6, 1], [3, 3], [4, 3], [5, 3]]) cells[j * w + i] = 1;
  const packed = packClosed(cells, w, h, -30, 100, 10);
  assert.equal(typeof packed.bits, 'string');
  const rects = closedRects(JSON.parse(JSON.stringify(packed)));
  assert.deepEqual(rects, [[-30, 100, -10, 120], [30, 110, 40, 120], [0, 130, 30, 140]]);
  const back = new Uint8Array(w * h);
  for (const [x0, z0, x1, z1] of rects) for (let x = x0; x < x1; x += 10) for (let z = z0; z < z1; z += 10) back[((z - 100) / 10) * w + (x + 30) / 10] = 1;
  assert.deepEqual(back, cells);
});

test('the older form (a list of rectangles) and no closed land still work', () => {
  assert.deepEqual(closedRects({ rects: [[0, 0, 10, 10]] }), [[0, 0, 10, 10]]);
  assert.deepEqual(closedRects(undefined), []);
});
