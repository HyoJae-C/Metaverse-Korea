import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, MAT_SPOTS, matSpots, encodeMat, parseMat, canSpread, matsOverlap, keepsMat, matInFront, matDir, matLost, MAT_AWAY, MAT_IDLE_MS } from '../src/core/picnic-mat.js';

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

test('a mat can be kept off things the lawn itself does not know about', () => {
  const path = (r) => r.x0 < 4 && r.x1 > 4; // a path crossing at x = 4
  assert.equal(canSpread({ x: 4, z: 6 }, { lawns, blocked: path }), 'lawn');
  assert.equal(canSpread({ x: 8, z: 6 }, { lawns, blocked: path }), 'ok');
});

test('a mat lies the way you faced when spreading it: sitting on it you look that way', () => {
  for (const [ry, d] of [[0, 0], [Math.PI / 2, 1], [Math.PI, 2], [-Math.PI / 2, 3], [0.6, 0], [1.0, 1]]) assert.equal(matDir(ry), d, `ry ${ry}`);
  const m = { x: 5, z: 6, c: 0, d: 1 };
  const spots = matSpots(m);
  for (const s of spots) {
    assert.ok(Math.abs(s.ry - Math.PI / 2) < 1e-9, 'everyone faces +x');
    assert.ok(Math.abs(s.x - 5) < MAT.d / 2 && Math.abs(s.z - 6) < MAT.w / 2, 'on the turned mat');
    assert.ok(s.stand[0] > 5 + MAT.d / 2, 'stand up off its foot');
  }
  assert.ok(Math.abs(spots[0].x - spots[1].x) < 1e-9, 'side by side along z');
  // Turned a quarter, it is narrow along x: room next to it on the long side.
  assert.equal(canSpread({ x: 2, z: 6, d: 1 }, { lawns, mats: [{ x: 2 + MAT.d + 0.2, z: 6, d: 1 }] }), 'ok');
  assert.equal(canSpread({ x: 2, z: 6 }, { lawns, mats: [{ x: 2 + MAT.d + 0.2, z: 6, d: 1 }] }), 'taken');
  assert.deepEqual(parseMat(encodeMat(m), lawns), m);
  assert.deepEqual(parseMat('2,6,1', lawns), { x: 2, z: 6, c: 1 }, 'an older game sends no direction');
  assert.equal(parseMat('2,6,1,4', lawns), null);
});

test('a mat left alone or far behind is folded away', () => {
  const m = { x: 0, z: 0 };
  assert.equal(matLost(m, 3, 0, 0, 1000), false);
  assert.equal(matLost(m, MAT_AWAY + 1, 0, 1000, 1000), true, 'walked off');
  assert.equal(matLost(m, 10, 0, 0, MAT_IDLE_MS - 1), false);
  assert.equal(matLost(m, 10, 0, 0, MAT_IDLE_MS + 1), true, 'nobody by it for too long');
});

test('on a lawn laid at an angle (Yeouido) the mat lies square with it, not crooked', async () => {
  const { lawnFrom, lawnAngle, matCorners } = await import('../src/core/picnic-mat.js');
  // Yeouido's picnic lawn (districts/yeouido.json): along the shore, 46° off the axes.
  const lawn = lawnFrom([[-67, -66.5], [81.9, 87.7], [56.7, 112], [-92.2, -42.2]]);
  assert.ok(lawn.a && Math.abs(Math.abs(lawn.a) - (44 * Math.PI) / 180) < 0.02, `angle ${lawn.a}`);
  const a = lawnAngle(0, 20, [lawn]);
  assert.equal(a, lawn.a);
  const m = { x: 0, z: 20, c: 0, a };
  assert.equal(canSpread(m, { lawns: [lawn] }), 'ok');
  // Each edge of the mat runs along an edge of the lawn.
  const [p0, p1] = matCorners(m);
  const edge = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), shore = Math.atan2(87.7 + 66.5, 81.9 + 67);
  const off = (((edge - shore) % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2); // 0 or 90° when square
  assert.ok(Math.min(off, Math.PI / 2 - off) < 0.01, 'square with the shore');
  // Off the outline (inside its box but past the shore) is not lawn.
  assert.equal(canSpread({ x: 70, z: 20, c: 0, a }, { lawns: [lawn] }), 'lawn');
  // Others read it back with the same angle.
  assert.deepEqual(parseMat(encodeMat({ x: 0, z: 20, c: 1 }), [lawn]), { x: 0, z: 20, c: 1, a });
  // Facing straight along the shore you sit facing it: d counted from the lawn.
  assert.equal(matDir(a + Math.PI / 2, a), 1);
  // A neighbour along the shore fits; one on top doesn't.
  const s = [Math.cos(a), -Math.sin(a)];
  assert.equal(canSpread({ x: s[0] * 2.9, z: 20 + s[1] * 2.9, c: 0, a }, { lawns: [lawn], mats: [m] }), 'ok');
  assert.equal(canSpread({ x: 1, z: 20.5, c: 0, a }, { lawns: [lawn], mats: [m] }), 'taken');
  for (const sp of matSpots(m)) assert.ok(Math.abs(sp.ry - a) < 1e-9);
  // A square lawn has no angle: nothing changes there.
  assert.equal(lawnFrom([[0, 0], [10, 0], [10, 5], [0, 5]]).a, undefined);
});
