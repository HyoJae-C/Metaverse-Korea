import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey } from '../src/net/area.js';

test('cell keys group nearby positions and split far ones', () => {
  assert.equal(cellKey('seongsu', 200, 10, 10), 'seongsu@0,0');
  assert.equal(cellKey('seongsu', 200, 199, -1), 'seongsu@0,-1');
  assert.equal(cellKey('seongsu', 200, -201, 450), 'seongsu@-2,2');
});
