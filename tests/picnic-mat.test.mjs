import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, MAT_SPOTS, matSpots, encodeMat, parseMat, canSpread, matsOverlap, keepsMat, matInFront } from '../src/core/picnic-mat.js';

const lawns = [{ x0: -12.6, x1: 17, z0: 0.5, z1: 13.6 }];

test('a mat has four lying spots side by side, all on the mat', () => {
  const spots = matSpots({ x: 2, z: 6 });
  assert.equal(spots.length, MAT_SPOTS);
  assert.equal(MAT_SPOTS, 4);
  for (const s of spots) {
    assert.ok(s.lie && s.mat);
    assert.ok(Math.abs(s.x - 2) < MAT.w / 2 && Math.abs(s.z - 6) < MAT.d / 2);
  }
  for (let i = 1; i < spots.length; i++) assert.ok(spots[i].x - spots[i - 1].x >= 0.6, 'room for shoulders');
});

test('mats go only on open grass, never on top of another mat', () => {
  assert.equal(canSpread({ x: 2, z: 6 }, { lawns }), 'ok');
  assert.equal(canSpread({ x: 2, z: -2 }, { lawns }), 'lawn', 'the riverside path');
  assert.equal(canSpread({ x: 16.5, z: 6 }, { lawns }), 'lawn', 'sticking off the lawn');
  const tree = { p: [[3.6, 5.6], [4.4, 5.6], [4.4, 6.4], [3.6, 6.4]] };
  assert.equal(canSpread({ x: 3, z: 6 }, { lawns, colliders: [tree] }), 'lawn', 'on a tree');
  const other = { x: 2, z: 6 };
  assert.equal(canSpread({ x: 3, z: 6.5 }, { lawns, mats: [other] }), 'taken');
  assert.equal(canSpread({ x: 2 + MAT.w + 0.2, z: 6 }, { lawns, mats: [other] }), 'ok', 'right next to it is fine');
  assert.ok(matsOverlap({ x: 0, z: 5 }, { x: MAT.w, z: 5 }), 'touching edges keep a gap');
});

test('the mat is shared as a short string and checked when read back', () => {
  const m = { x: 2.34, z: 6.06, c: 1 };
  assert.deepEqual(parseMat(encodeMat(m), lawns), { x: 2.3, z: 6.1, c: 1 });
  assert.equal(parseMat('2,-3,0', lawns), null, 'off the lawn');
  assert.equal(parseMat('2,6,9', lawns), null, 'no such colour');
  assert.equal(parseMat('nope', lawns), null);
  assert.equal(parseMat({ x: 1 }, lawns), null);
});

test('spread in front of you; a tie on the same spot goes to the lower id', () => {
  const m = matInFront(0, 5, 0);
  assert.ok(m.z > 5 && Math.abs(m.x) < 0.01);
  assert.equal(keepsMat('a', 'b'), true);
  assert.equal(keepsMat('b', 'a'), false);
});
