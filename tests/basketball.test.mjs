import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHOTS, SHOT_BY_ID, HOOP, shotPoints, shotMove, ShotMeter, BasketRound, basketMedal, SHOTS_PER_ROUND,
  needleTier, mashTier, doubleTier, rhythmTier, needlePos, NEEDLE, MASH, RHYTHM, DOUBLE, MEDAL_PTS,
} from '../src/core/basketball-game.js';
import { BT } from '../src/ui/basketball-text.js';

const LANGS = ['en', 'ko', 'ja', 'zh', 'es', 'id', 'vi', 'hi', 'ar'];

test('four shots, three levels each; free throw and dunk as asked', () => {
  assert.equal(SHOTS.length, 4);
  for (const s of SHOTS) assert.equal(s.tiers.length, 3);
  assert.deepEqual(SHOT_BY_ID.free.tiers.map((t) => t.id), ['miss', 'make', 'swish']);
  assert.deepEqual(SHOT_BY_ID.dunk.tiers.map((t) => t.id), ['twohand', 'onehand', 'back']);
  assert.equal(SHOT_BY_ID.free.tiers[0].made, false);
  assert.equal(SHOT_BY_ID.fade.tiers[0].made, false);
});

test('points: made shots score, level 3 adds a style point', () => {
  assert.equal(shotPoints('free', 1), 0);
  assert.equal(shotPoints('free', 2), 1);
  assert.equal(shotPoints('free', 3), 2);
  assert.equal(shotPoints('dunk', 1), 2);
  assert.equal(shotPoints('dunk', 3), 3);
  assert.equal(shotPoints('fade', 1), 0);
  assert.equal(shotPoints('nope', 2), 0);
  assert.equal(shotPoints('dunk', 4), 0);
  // the best round: five level 3 two-pointers
  assert.equal(SHOTS_PER_ROUND * 3, 15);
  assert.equal(basketMedal(15), 'gold');
  assert.equal(basketMedal(MEDAL_PTS.bronze), 'bronze');
  assert.equal(basketMedal(MEDAL_PTS.bronze - 1), null);
});

test('gauges turn taps into levels', () => {
  assert.equal(needleTier(0), 3);
  assert.equal(needleTier(NEEDLE.good), 2);
  assert.equal(needleTier(0.4), 1);
  assert.equal(mashTier(MASH.great), 3);
  assert.equal(mashTier(MASH.good), 2);
  assert.equal(mashTier(2), 1);
  assert.equal(doubleTier(2, 2), 3);
  assert.equal(doubleTier(2, 0), 2);
  assert.equal(doubleTier(1, 0), 1);
  assert.equal(rhythmTier([2, 2, 1]), 3);
  assert.equal(rhythmTier([1, 1, 1]), 2);
  assert.equal(rhythmTier([0, 1, 0]), 1);
  assert.ok(Math.abs(needlePos(NEEDLE.period / 2) - 1) < 1e-9);
  assert.ok(Math.abs(needlePos(0)) < 1e-9);
});

const run = (m, until, dt = 1 / 60) => { while (!m.done && m.t < until) m.step(dt); };

test('needle: a tap in the middle is level 3; waiting too long is level 1', () => {
  const m = new ShotMeter('needle');
  // swing to the middle (a quarter period, with the speed-up it comes a bit sooner)
  while (Math.abs(m.pos - 0.5) > 0.01) m.step(1 / 240);
  m.tap();
  assert.equal(m.done, true);
  assert.equal(m.tier, 3);
  const idle = new ShotMeter('needle');
  run(idle, NEEDLE.timeout + 1);
  assert.equal(idle.tier, 1);
});

test('mash: taps in the time decide the jump', () => {
  for (const [taps, tier] of [[MASH.great + 2, 3], [MASH.good, 2], [3, 1]]) {
    const m = new ShotMeter('mash');
    for (let i = 0; i < taps; i++) { m.tap(); m.step(0.05); }
    run(m, MASH.time + 0.1);
    assert.equal(m.tier, tier, `${taps} taps`);
  }
});

test('double: two taps in the green are level 3, a miss of both is 1', () => {
  const m = new ShotMeter('double');
  while (Math.abs(m.pos - 0.5) > 0.01) m.step(1 / 240);
  m.tap();
  assert.equal(m.done, false);
  while (Math.abs(m.pos - 0.5) > 0.01) m.step(1 / 240);
  m.tap();
  assert.equal(m.tier, 3);
  const bad = new ShotMeter('double');
  bad.step(0.01); bad.tap(); bad.step(0.01); bad.tap();
  assert.equal(bad.tier, 1);
  const idle = new ShotMeter('double');
  run(idle, DOUBLE.timeout * 3);
  assert.equal(idle.done, true);
  assert.equal(idle.tier, 1);
});

test('rhythm: on-beat taps are level 3, no taps is level 1', () => {
  const m = new ShotMeter('rhythm');
  for (const b of m.beats) { run(m, b); m.tap(); }
  run(m, 10);
  assert.equal(m.tier, 3);
  const idle = new ShotMeter('rhythm');
  run(idle, 10);
  assert.equal(idle.done, true);
  assert.equal(idle.tier, 1);
  // tapping long before the first beat does nothing
  const early = new ShotMeter('rhythm');
  assert.equal(early.tap(), null);
  assert.equal(early.marks.length, 0);
  assert.ok(RHYTHM.lead > 0.5);
});

// Did the ball drop through the rim (from above to below, inside the ring)?
function throughRim(m) {
  let prev = m.ball(0);
  for (let t = 0; t <= m.dur; t += 1 / 120) {
    const p = m.ball(t);
    if (prev[1] >= HOOP.h && p[1] < HOOP.h && Math.hypot(p[0], p[2]) < HOOP.r - HOOP.ball * 0.4) return true;
    prev = p;
  }
  return false;
}

test('every move is finite, starts in your hands and ends on the floor', () => {
  for (const s of SHOTS) for (let tier = 1; tier <= 3; tier++) {
    const m = shotMove(s.id, tier);
    assert.ok(m.dur > m.release && m.release > 0.5, `${s.id}${tier} timing`);
    for (let t = 0; t <= m.dur; t += 0.05) {
      const r = m.root(t), b = m.ball(t), p = m.pose(t);
      for (const v of [r.x, r.y, r.z, r.yaw, r.spin, ...b]) assert.ok(Number.isFinite(v), `${s.id}${tier} at ${t}`);
      for (const v of Object.values(p)) assert.ok(v.every(Number.isFinite), `${s.id}${tier} pose at ${t}`);
      assert.ok(r.y >= 0 && r.y < 1.6, `${s.id}${tier} feet height ${r.y}`);
      assert.ok(b[1] >= HOOP.ball - 1e-6, `${s.id}${tier} ball under the floor at ${t}`);
    }
    // in your hands at the start: near you, about chest high
    const r0 = m.root(0), b0 = m.ball(0);
    assert.ok(Math.hypot(b0[0] - r0.x, b0[2] - r0.z) < 0.4, `${s.id}${tier} ball in hand`);
    // at rest on the floor at the end, and you are back on your feet
    assert.ok(m.ball(m.dur)[1] < HOOP.ball + 0.02, `${s.id}${tier} ball on the floor`);
    assert.equal(m.root(m.dur).y, 0);
  }
});

test('made moves go through the rim, misses do not', () => {
  for (const s of SHOTS) for (let tier = 1; tier <= 3; tier++) {
    const m = shotMove(s.id, tier);
    assert.equal(throughRim(m), m.made, `${s.id} level ${tier}`);
  }
});

test('the back dunk turns your back to the rim; the euro step zig-zags', () => {
  const d = shotMove('dunk', 3);
  assert.ok(Math.abs(d.root(d.release).spin - Math.PI) < 1e-6);
  assert.equal(shotMove('dunk', 1).root(1.6).spin, 0);
  const e = shotMove('layup', 3), b = shotMove('layup', 1);
  // the euro step's path bends more than the plain layup's
  const bend = (m) => { const a = m.root(0.75), c = m.root(1.05); return Math.abs(a.x - c.x) / Math.max(0.01, Math.abs(a.z - c.z)); };
  assert.ok(bend(e) > bend(b) * 2);
});

test('events: a dunk shakes the rim, a swish flicks the net, a miss bounces', () => {
  const kinds = (m) => m.events.map((e) => e.kind);
  assert.ok(kinds(shotMove('dunk', 2)).includes('dunk'));
  assert.ok(shotMove('free', 3).events.some((e) => e.kind === 'net' && e.swish));
  assert.ok(!kinds(shotMove('free', 1)).includes('net'));
  assert.ok(kinds(shotMove('fade', 2)).includes('board'));
  assert.ok(!kinds(shotMove('fade', 1)).includes('cheer'));
  for (const s of SHOTS) for (let tier = 1; tier <= 3; tier++) {
    const ev = shotMove(s.id, tier).events;
    for (let i = 1; i < ev.length; i++) assert.ok(Number.isFinite(ev[i].t));
  }
});

test('a round is five shots', () => {
  const r = new BasketRound();
  for (const [s, t] of [['free', 3], ['dunk', 1], ['fade', 1], ['layup', 3], ['dunk', 3]]) r.add(s, t);
  assert.equal(r.over, true);
  assert.equal(r.points, 2 + 2 + 0 + 3 + 3);
  assert.equal(r.made, 4);
  assert.equal(r.add('free', 2), null);
});

test('text: every key in every language, a name for each move', () => {
  for (const [k, v] of Object.entries(BT)) for (const l of LANGS) assert.ok(v[l], `${k} ${l}`);
  for (const s of SHOTS) {
    assert.ok(BT['shot.' + s.id] && BT['mode.' + s.mode]);
    for (const t of s.tiers) assert.ok(BT[s.id + '.' + t.id], `${s.id}.${t.id}`);
  }
});
