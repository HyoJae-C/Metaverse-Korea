import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clusterPoints, placeLabel } from '../src/ui/map-view.js';

test('pins closer than the radius merge into one cluster; far ones stay apart', () => {
  const pts = [{ sx: 0, sy: 0, item: 'a' }, { sx: 10, sy: 5, item: 'b' }, { sx: 100, sy: 0, item: 'c' }];
  const c = clusterPoints(pts, 30);
  assert.equal(c.length, 2);
  assert.deepEqual(c[0].items, ['a', 'b']);
  assert.deepEqual(c[1].items, ['c']);
});

test('seeds (meeting zones) soak up the pins next to them', () => {
  const c = clusterPoints([{ sx: 5, sy: 0, item: 'shop' }], 30, [{ sx: 0, sy: 0 }]);
  assert.equal(c.length, 1);
  assert.ok(c[0].seed);
  assert.deepEqual(c[0].items, ['shop']);
});

test('labels avoid each other and are dropped when nothing fits', () => {
  const taken = [];
  const a = placeLabel(taken, { sx: 50, sy: 50, w: 40, h: 10, gap: 5 });
  assert.equal(a.y, 55); // below first
  const b = placeLabel(taken, { sx: 50, sy: 50, w: 40, h: 10, gap: 5 });
  assert.notDeepEqual(b, a);
  const full = [{ x: -1000, y: -1000, w: 3000, h: 3000 }];
  assert.equal(placeLabel(full, { sx: 50, sy: 50, w: 40, h: 10, gap: 5 }), null);
});
