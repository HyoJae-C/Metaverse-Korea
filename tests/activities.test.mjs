import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PINS, FRAMES, frameRolls, bowlingScores, bowlingTurn, frameMarks, isSplit,
  CLIMB_ROUTES, routeHolds, judgeReach, gripAfter, gripDrain, climbOpen,
  AIM_SECONDS, aimLife, aimRadius, aimPoints, aimTier, accuracy,
  loadActivity, saveActivity,
} from '../src/core/activities.js';
import { simulateRoll, throwFrom, rackSpot, seeded } from '../src/core/bowling-physics.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const ALL = PINS.map((_, i) => i);

test('bowling: ten pins in the real triangle', () => {
  assert.equal(PINS.length, 10);
  assert.deepEqual(PINS.map((p) => p.row), [0, 1, 1, 2, 2, 2, 3, 3, 3, 3]);
  assert.ok(Math.abs(PINS[9].x - 0.4572) < 1e-6); // pin 10, far right
});

const rack = () => ALL.map((i) => ({ i, ...rackSpot(i) }));
// Strikes out of 40 seeded balls for one throw.
const strikes = (opt) => { let n = 0; for (let s = 1; s <= 40; s++) if (simulateRoll(throwFrom(opt), rack(), seeded(s * 7919)).down.length === 10) n++; return n; };

test('bowling physics: the gutter takes nothing', () => {
  const r = simulateRoll(throwFrom({ stance: 1, aim: 1, power: 0.7 }), rack(), seeded(3));
  assert.equal(r.gutter, true);
  assert.deepEqual(r.down, []);
  assert.equal(r.left.length, 10);
});

test('bowling physics: the pocket strikes, the head pin straight on leaves splits', () => {
  const pocketHook = strikes({ stance: 0.8, aim: 0.25, power: 0.7, spin: -1 }); // hooks left into the 1-3 pocket
  const pocketStraight = strikes({ stance: 0, aim: 0.06, power: 0.7, spin: 0 });
  const headOn = strikes({ stance: 0, aim: 0, power: 0.7, spin: 0 });
  assert.ok(pocketHook >= 30, `hook into the pocket: ${pocketHook}/40`);
  assert.ok(pocketStraight >= 20, `straight into the pocket: ${pocketStraight}/40`);
  assert.ok(headOn <= 10, `head pin straight on: ${headOn}/40`);
  // Too far off the pocket and the head pin stays up.
  const r = simulateRoll(throwFrom({ stance: 0, aim: 0.3, power: 0.7 }), rack(), seeded(5));
  assert.ok(r.down.length > 0 && !r.down.includes(0), String(r.down));
});

test('bowling physics: spin hooks on the dry back end, more when slower', () => {
  const at = (opt) => { const f = simulateRoll(throwFrom(opt), [], seeded(1)).frames; return { mid: f.find((q) => q.b[1] > 9).b[0], end: f.find((q) => q.b[1] > 18).b[0] }; };
  const straight = at({ stance: 0.5, power: 0.7 }), hook = at({ stance: 0.5, power: 0.7, spin: -1 }), slow = at({ stance: 0.5, power: 0.2, spin: -1 });
  assert.ok(straight.mid - hook.mid < 0.08, 'little hook in the oil');
  assert.ok(straight.end - hook.end > 0.3, 'the back end hooks');
  assert.ok(hook.end - slow.end > 0.1, 'a slower ball hooks more');
});

test('bowling physics: only standing pins fall, the rest stay where they were nudged', () => {
  const r = simulateRoll(throwFrom({ stance: -0.85, aim: 0, power: 0.7 }), [{ i: 6, ...rackSpot(6) }], seeded(2));
  assert.deepEqual(r.down, [6]); // the 7 pin, far left
  const miss = simulateRoll(throwFrom({ stance: 0.6, aim: 0, power: 0.7 }), [{ i: 6, ...rackSpot(6) }], seeded(2));
  assert.deepEqual(miss.down, []);
  assert.equal(miss.left[0].i, 6);
});

test('bowling: splits', () => {
  assert.equal(isSplit([6, 9]), true); // 7-10
  assert.equal(isSplit([3, 5]), true); // 4-6
  assert.equal(isSplit([4, 6]), true); // 5-7
  assert.equal(isSplit([2, 9]), true); // 3-10, the baby split
  assert.equal(isSplit([5, 9]), false); // 6-10 stand side by side
  assert.equal(isSplit([0, 6]), false); // the head pin is up
  assert.equal(isSplit([9]), false);
});

test('bowling: frames and the real scoring', () => {
  assert.deepEqual(bowlingScores(Array(12).fill(10), 10).at(-1), 300);
  assert.deepEqual(bowlingScores(Array(21).fill(5), 10).at(-1), 150);
  assert.equal(FRAMES, 10);
  assert.deepEqual(bowlingScores(Array(12).fill(10)).at(-1), 300); // a perfect game
  assert.deepEqual(bowlingScores([10, 3, 4]), [17, 24]);
  assert.deepEqual(bowlingScores([7, 3, 4, 2]), [14, 20]);
  assert.deepEqual(bowlingScores([10, 3]), []); // the strike waits for two balls
  assert.deepEqual(frameRolls([10, 7, 3, 4, 5, 0, 0, 10, 10, 10], 5), [[10], [7, 3], [4, 5], [0, 0], [10, 10, 10]]);
});

test('bowling: whose ball, and a fresh rack in the last frame', () => {
  assert.deepEqual(bowlingTurn([]), { frame: 0, ball: 0, fresh: true, over: false });
  assert.deepEqual(bowlingTurn([7]), { frame: 0, ball: 1, fresh: false, over: false });
  assert.deepEqual(bowlingTurn([10]), { frame: 1, ball: 0, fresh: true, over: false });
  const four = Array(18).fill(1); // nine open frames
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

test('bowling with others: a thrown ball as a message, and back', async () => {
  const { bowlThrowMsg, parseBowl, bowlGoMsg, bowlLaneMsg, bowlToMsg } = await import('../src/core/activities.js');
  const msg = bowlThrowMsg({ lane: 4, stance: -0.3, aim: 0.42, power: 0.77, spin: 0.5, seed: 123456789, rack: ALL, down: [0, 1, 2, 4], rolls: [10, 7, 3] });
  const m = parseBowl(msg);
  assert.equal(m.kind, 't'); assert.equal(m.lane, 4); assert.equal(m.seed, 123456789);
  assert.ok(Math.abs(m.stance + 0.3) < 1e-9 && Math.abs(m.aim - 0.42) < 1e-9 && m.power === 0.77 && m.spin === 0.5);
  assert.deepEqual(m.rack, ALL); assert.deepEqual(m.down, [0, 1, 2, 4]); assert.deepEqual(m.rolls, [10, 7, 3]);
  // The same message again gives the same numbers (the thrower rolls what the others will).
  assert.equal(bowlThrowMsg({ ...m, rack: m.rack, down: m.down, rolls: m.rolls }), msg);
  assert.equal(parseBowl(msg.replace(':23:', ':1024:')), null); // knocked down a pin that was not there
  assert.equal(parseBowl('bowl:t:4:35:710:770:3:1:1023:23:XXXXXXXXXXXX'), null); // a finished game
  assert.deepEqual(parseBowl(bowlGoMsg('abc', 2, ['abc', 'def'])), { kind: 'g', to: 'abc', lane: 2, ids: ['abc', 'def'] });
  assert.equal(parseBowl(bowlGoMsg('abc', 2, ['abc'])), null);
  assert.equal(parseBowl(bowlGoMsg('abc', 2, ['abc', 'abc'])), null);
  assert.deepEqual(parseBowl(bowlLaneMsg('o', 7)), { kind: 'o', lane: 7 });
  assert.deepEqual(parseBowl(bowlToMsg('i', 'xyz')), { kind: 'i', to: 'xyz' });
  assert.equal(parseBowl('bowl:q:1'), null);
});

test('bowling with others: a frame each, in line-up order', async () => {
  const { bowlTurnOf } = await import('../src/core/activities.js');
  assert.equal(bowlTurnOf([[], []]), 0);
  assert.equal(bowlTurnOf([[7], []]), 0); // finishes the frame
  assert.equal(bowlTurnOf([[7, 2], []]), 1);
  assert.equal(bowlTurnOf([[10], []]), 1);
  assert.equal(bowlTurnOf([[10], [3]]), 1);
  assert.equal(bowlTurnOf([[10], [3, 4]]), 0);
  assert.equal(bowlTurnOf([[10], null, [5, 5]]), 0); // a player who left is skipped
  assert.equal(bowlTurnOf([Array(12).fill(10), Array(12).fill(10)]), -1);
});

test('bowling with others: the watcher rolls the same ball', async () => {
  const { replay, rackFor, leftAfter } = await import('../src/game/bowling-lanes.js');
  const m = { stance: 0.2, aim: -0.1, power: 0.6, spin: 0.5, seed: 777, rack: ALL };
  const a = replay(m, rackFor(ALL)), b = replay(m, rackFor(ALL));
  assert.deepEqual(a.down, b.down);
  assert.deepEqual(a.frames.at(-1), b.frames.at(-1));
  // What stands for the next ball: what the message says stands, where this ball left it.
  const left = leftAfter(a, { rack: ALL, down: a.down });
  assert.deepEqual(left.map((p) => p.i), ALL.filter((i) => !a.down.includes(i)));
  assert.deepEqual(rackFor([3, 6], left).map((p) => p.i), [3, 6]);
});
