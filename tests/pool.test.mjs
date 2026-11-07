// Olympic Park Pool rules (core/pool.js): the hall's layout, the 50 m race,
// dives and the saved records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { POOL_ROOM, COMP, DIVE, LEISURE, BOARDS, RACE_LEN, laneZ, laneAt, waterAt, strokeQuality, Race, rivalAt, rivalPaces, rivalLanes, airTime, maxFlips, scoreDive, PoolLog, DAILY_PAID, PAY, GOOD } from '../src/core/pool.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('the pools fit in the hall and do not overlap', () => {
  const { w, d } = POOL_ROOM;
  for (const r of [COMP, DIVE]) {
    assert.ok(r.x0 > -w / 2 && r.x1 < w / 2 && r.z0 > -d / 2 && r.z1 < d / 2);
  }
  assert.equal(RACE_LEN, 50);
  assert.ok(COMP.x1 < DIVE.x0, 'competition pool west of the diving pool');
  assert.ok(Math.hypot(LEISURE.x - DIVE.x1, LEISURE.z - DIVE.z1) > LEISURE.r);
  assert.ok(LEISURE.x + LEISURE.r < w / 2 && LEISURE.z + LEISURE.r < d / 2);
});

test('lanes and water areas', () => {
  for (let i = 0; i < COMP.lanes; i++) assert.equal(laneAt(laneZ(i)), i);
  assert.equal(laneAt(COMP.z0 - 1), -1);
  assert.equal(waterAt(0, laneZ(3)), 'comp');
  assert.equal(waterAt((DIVE.x0 + DIVE.x1) / 2, (DIVE.z0 + DIVE.z1) / 2), 'dive');
  assert.equal(waterAt(LEISURE.x, LEISURE.z), 'leisure');
  assert.equal(waterAt(0, POOL_ROOM.d / 2 - 1), null, 'the entrance is dry');
  assert.equal(waterAt(COMP.x0 + 0.1, laneZ(0)), null, 'right on the edge is still the deck');
});

test('diving boards reach out over the diving pool, ladders on the deck', () => {
  for (const b of BOARDS) {
    assert.equal(waterAt(b.tip - 0.4, b.z), 'dive', b.id);
    assert.equal(waterAt(...b.foot), null, b.id);
    assert.ok(b.foot[0] < POOL_ROOM.w / 2 - 0.5);
  }
});

test('stroke rhythm', () => {
  assert.equal(strokeQuality(Infinity), 1);
  assert.equal(strokeQuality(0.05), 0);
  assert.equal(strokeQuality(0.2), 0.3);
  assert.equal(strokeQuality((GOOD[0] + GOOD[1]) / 2), 1);
  assert.ok(strokeQuality(1.5) < 1 && strokeQuality(1.5) > 0.5);
});

// Race with taps every `gap` seconds; returns the finish time.
function swim(gap, paces = [99, 99, 99]) {
  const r = new Race(3, paces);
  const dt = 1 / 60;
  let next = 0;
  for (let i = 0; i < 60 * 120 && !r.done; i++) {
    r.step(dt);
    if (r.started && r.t >= next) { r.tap(r.t); next = r.t + gap; }
  }
  return r;
}

test('a steady rhythm beats spamming and beats drifting', () => {
  const steady = swim(0.4).done.time, spam = swim(0.15).done.time, slow = swim(1.2).done.time;
  assert.ok(steady < spam, `${steady} < ${spam}`);
  assert.ok(steady < slow, `${steady} < ${slow}`);
  assert.ok(steady > 12 && steady < 20, `steady ${steady}`);
});

test('the race counts down, then places you among the rivals', () => {
  const r = new Race(0, [17, 18, 19]);
  assert.equal(r.tap(), 0, 'no strokes before the start');
  const ev = [];
  for (let i = 0; i < 4 * 60; i++) ev.push(...r.step(1 / 60));
  assert.ok(ev.includes('go'));
  const fast = swim(0.4, [30, 31, 32]);
  assert.equal(fast.done.place, 1);
  const lost = swim(1.2, [17, 18, 19]);
  assert.equal(lost.done.place, 4);
  assert.equal(lost.x, RACE_LEN);
});

test('rivals: paces, positions and lanes', () => {
  const paces = rivalPaces(() => 0.5);
  assert.deepEqual(paces, [17.5, 19.5, 22]);
  assert.equal(rivalAt(20, 0), 0);
  assert.equal(rivalAt(20, 20), RACE_LEN);
  let last = 0;
  for (let t = 0.5; t <= 20; t += 0.5) { const x = rivalAt(20, t); assert.ok(x > last); last = x; }
  for (const mine of [0, 3, 7]) {
    const ln = rivalLanes(mine);
    assert.equal(ln.length, 3);
    assert.ok(!ln.includes(mine) && ln.every((i) => i >= 0 && i < COMP.lanes));
  }
});

test('dives: more height, more flips; an unfinished flip is a belly flop', () => {
  assert.ok(airTime(5) > airTime(3) && airTime(3) > airTime(1));
  assert.ok(maxFlips(5) > maxFlips(1));
  assert.ok(maxFlips(1) >= 1);
  const clean = scoreDive(3, 2), flop = scoreDive(3, 1.5);
  assert.ok(clean.clean && !flop.clean);
  assert.ok(clean.points > flop.points);
  assert.ok(scoreDive(5, 2).points > scoreDive(1, 2).points);
  assert.equal(scoreDive(3, 1.95).flips, 2, 'nearly round counts');
});

test('records and the paid races of the day', () => {
  let day = new Date(2026, 10, 7, 12);
  const store = memory();
  const log = new PoolLog(store, () => day);
  const first = log.finishRace(18.2, 1);
  assert.deepEqual(first, { coins: PAY.win, best: true });
  assert.equal(log.finishRace(19, 2).best, false);
  for (let i = 2; i < DAILY_PAID; i++) log.finishRace(20, 3);
  assert.equal(log.paidLeft, 0);
  assert.equal(log.finishRace(17, 1).coins, 0, 'only a few paid races a day');
  assert.equal(log.finishDive(50).best, true);
  assert.equal(log.finishDive(20).best, false);
  const again = new PoolLog(store, () => day);
  assert.equal(again.s.bestRace, 17);
  assert.equal(again.s.bestDive, 50);
  day = new Date(2026, 10, 8, 12);
  assert.equal(again.paidLeft, DAILY_PAID, 'a new day');
  assert.equal(again.s.bestRace, 17, 'the best time stays');
});

test('racing friends: messages, lanes and places', async () => {
  const { raceMsg, parseRaceMsg, pickLane, rankTimes, LOBBY } = await import('../src/core/pool.js');
  assert.deepEqual(parseRaceMsg(raceMsg('open', 'ab12', { lane: 3, left: 7.46 })), { verb: 'open', rid: 'ab12', lane: 3, left: 7.5 });
  assert.equal(parseRaceMsg(raceMsg('open', 'ab12', { lane: 3, left: 99 })).left, LOBBY); // never longer than the lobby
  assert.deepEqual(parseRaceMsg(raceMsg('join', 'ab12', 5)), { verb: 'join', rid: 'ab12', lane: 5 });
  assert.deepEqual(parseRaceMsg(raceMsg('fin', 'ab12', 21.456)), { verb: 'fin', rid: 'ab12', time: 21.46 });
  assert.deepEqual(parseRaceMsg(raceMsg('quit', 'ab12')), { verb: 'quit', rid: 'ab12' });
  for (const bad of ['prace:join:ab12:9', 'prace:join:AB!:1', 'prace:fin:ab12:100', 'prace:open:ab12:1', 'hi5:x', 42, null]) assert.equal(parseRaceMsg(bad), null);
  assert.equal(pickLane(3, new Set()), 3);
  assert.equal(pickLane(3, new Set([3])), 2);
  assert.equal(pickLane(0, new Set([0, 1])), 2);
  assert.equal(pickLane(0, new Set([0, 1, 2, 3, 4, 5, 6, 7])), -1);
  const ranked = rankTimes([{ name: 'a', time: 22 }, { name: 'b', time: null }, { name: 'c', time: 19.5 }]);
  assert.deepEqual(ranked.map((r) => [r.name, r.place]), [['c', 1], ['a', 2], ['b', null]]);
});
