import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PINS, FRAMES, rollBall, frameRolls, bowlingScores, bowlingTurn, frameMarks, powerQuality,
  CLIMB_ROUTES, routeHolds, judgeReach, gripAfter, gripDrain, climbOpen,
  AIM_SECONDS, aimLife, aimRadius, aimPoints, aimTier, accuracy,
  loadActivity, saveActivity,
} from '../src/core/activities.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const ALL = PINS.map((_, i) => i);

test('bowling: ten pins in the real triangle', () => {
  assert.equal(PINS.length, 10);
  assert.deepEqual(PINS.map((p) => p.row), [0, 1, 1, 2, 2, 2, 3, 3, 3, 3]);
  assert.ok(Math.abs(PINS[9].x - 0.4572) < 1e-6); // pin 10, far right
});

test('bowling: the gutter takes nothing, the pocket with good power strikes', () => {
  assert.deepEqual(rollBall({ aim: 1, power: 0.8, standing: ALL, rand: () => 0 }), []);
  assert.deepEqual(rollBall({ aim: -1, power: 0.8, standing: ALL, rand: () => 0 }), []);
  assert.equal(rollBall({ aim: 0.16, power: 0.82, standing: ALL, rand: () => 0 }).length, 10);
  // With no lucky scatter only the pins in the ball's path fall.
  const path = rollBall({ aim: 0.16, power: 0.82, standing: ALL, rand: () => 0.999 });
  assert.ok(path.length >= 3 && path.length < 10, String(path));
  // Only standing pins can fall.
  const second = rollBall({ aim: -0.8, power: 0.8, standing: [6], rand: () => 0 });
  assert.deepEqual(second, [6]);
  assert.ok(powerQuality(0.82) > powerQuality(0.3));
  assert.ok(powerQuality(0.82) > powerQuality(1));
});

test('bowling: frames and the real scoring', () => {
  assert.deepEqual(bowlingScores(Array(12).fill(10), 10).at(-1), 300);
  assert.deepEqual(bowlingScores(Array(21).fill(5), 10).at(-1), 150);
  assert.deepEqual(bowlingScores(Array(7).fill(10), FRAMES).at(-1), 150); // 5 frames, perfect
  assert.deepEqual(bowlingScores([10, 3, 4]), [17, 24]);
  assert.deepEqual(bowlingScores([7, 3, 4, 2]), [14, 20]);
  assert.deepEqual(bowlingScores([10, 3]), []); // the strike waits for two balls
  assert.deepEqual(frameRolls([10, 7, 3, 4, 5, 0, 0, 10, 10, 10]), [[10], [7, 3], [4, 5], [0, 0], [10, 10, 10]]);
});

test('bowling: whose ball, and a fresh rack in the last frame', () => {
  assert.deepEqual(bowlingTurn([]), { frame: 0, ball: 0, fresh: true, over: false });
  assert.deepEqual(bowlingTurn([7]), { frame: 0, ball: 1, fresh: false, over: false });
  assert.deepEqual(bowlingTurn([10]), { frame: 1, ball: 0, fresh: true, over: false });
  const four = [1, 1, 1, 1, 1, 1, 1, 1];
  assert.equal(bowlingTurn([...four, 10]).fresh, true);
  assert.equal(bowlingTurn([...four, 10, 7]).fresh, false);
  assert.equal(bowlingTurn([...four, 6, 4]).fresh, true);
  assert.equal(bowlingTurn([...four, 6, 3]).over, true);
  assert.equal(bowlingTurn([...four, 6, 4, 2]).over, true);
  assert.deepEqual(frameMarks([10]), ['X']);
  assert.deepEqual(frameMarks([7, 3]), ['7', '/']);
  assert.deepEqual(frameMarks([0, 5]), ['-', '5']);
  assert.deepEqual(frameMarks([10, 10, 10]), ['X', 'X', 'X']);
  assert.deepEqual(frameMarks([10, 7, 3]), ['X', '7', '/']);
  assert.deepEqual(frameMarks([6, 4, 10]), ['6', '/', 'X']);
});

test('climbing: harder grades have more holds, a faster ring and a tighter window', () => {
  for (let i = 1; i < CLIMB_ROUTES.length; i++) {
    const a = CLIMB_ROUTES[i - 1], b = CLIMB_ROUTES[i];
    assert.ok(b.holds > a.holds && b.period < a.period && b.window < a.window && b.drain > a.drain, b.id);
  }
  for (const r of CLIMB_ROUTES) {
    const h = routeHolds(r);
    assert.equal(h.length, r.holds);
    assert.deepEqual(h, routeHolds(r)); // the same every time
    for (let i = 1; i < h.length; i++) assert.ok(h[i][1] > h[i - 1][1], 'goes up');
    for (const [x] of h) assert.ok(x >= 0.12 && x <= 0.88);
  }
});

test('climbing: reach timing, grip and unlocking the next grade', () => {
  const r = CLIMB_ROUTES[0];
  assert.equal(judgeReach(1, r), 'perfect');
  assert.equal(judgeReach(0.02, r), 'perfect'); // just after the ring closed
  assert.equal(judgeReach(0.85, r), 'good');
  assert.equal(judgeReach(0.5, r), 'slip');
  assert.equal(gripAfter(0.95, 'perfect'), 1);
  assert.equal(gripAfter(0.1, 'slip'), 0);
  assert.ok(gripDrain(1, CLIMB_ROUTES[5], 1) < gripDrain(1, r, 1));
  assert.ok(climbOpen({}, CLIMB_ROUTES[0]));
  assert.ok(!climbOpen({}, CLIMB_ROUTES[1]));
  assert.ok(climbOpen({ climb: { v0: 20 } }, CLIMB_ROUTES[1]));
});

test('aim: targets get smaller and quicker; faster hits score more', () => {
  assert.ok(aimLife(AIM_SECONDS) < aimLife(0));
  assert.ok(aimRadius(AIM_SECONDS) < aimRadius(0));
  assert.ok(aimPoints(200) > aimPoints(800));
  assert.equal(aimPoints(2000), 100);
  assert.equal(aimTier(0).id, 'bronze');
  assert.equal(aimTier(3600).id, 'gold');
  assert.equal(aimTier(99999).id, 'master');
  assert.equal(accuracy(9, 1), 90);
  assert.equal(accuracy(0, 0), 0);
});

test('records: higher is better, except climbing times', () => {
  const s = memStore();
  assert.ok(saveActivity(s, 'bowling', 90));
  assert.ok(!saveActivity(s, 'bowling', 80));
  assert.ok(saveActivity(s, 'climb', 30, 'v0'));
  assert.ok(saveActivity(s, 'climb', 25, 'v0'));
  assert.ok(!saveActivity(s, 'climb', 40, 'v0'));
  assert.deepEqual(loadActivity(s), { bowling: 90, climb: { v0: 25 } });
  assert.deepEqual(loadActivity({ getItem: () => '{bad' }), {});
});
