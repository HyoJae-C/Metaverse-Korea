import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey } from '../src/net/area.js';

test('cell keys group nearby positions and split far ones', () => {
  assert.equal(cellKey('seongsu', 200, 10, 10), 'seongsu@0,0');
  assert.equal(cellKey('seongsu', 200, 199, -1), 'seongsu@0,-1');
  assert.equal(cellKey('seongsu', 200, -201, 450), 'seongsu@-2,2');
});

import { groupKey, CROWD_CAP } from '../src/net/area.js';
import { sendRate } from '../src/net/rate.js';

test('crowd groups get channels of their own; group 0 keeps the old names', () => {
  assert.equal(groupKey('seongsu@0,0', 0), 'seongsu@0,0');
  assert.equal(groupKey('seongsu@0,0', 2), 'seongsu@0,0~2');
  assert.ok(CROWD_CAP >= 10, 'a group still feels busy');
});

test('send rate drops in a crowd so each player receives about the budget', () => {
  const o = { base: 6, budget: 20, min: 1.5 };
  assert.equal(sendRate({ ...o, peers: 0 }), 6);
  assert.equal(sendRate({ ...o, peers: 3 }), 6);
  assert.equal(sendRate({ ...o, peers: 10 }), 2);
  assert.equal(sendRate({ ...o, peers: 40 }), 1.5);
  assert.equal(sendRate({ ...o }), 6); // solo play has no peer count
  // What one player receives from 11 others: never above the budget.
  assert.ok(11 * sendRate({ ...o, peers: 11 }) <= 20 + 1e-9);
});
