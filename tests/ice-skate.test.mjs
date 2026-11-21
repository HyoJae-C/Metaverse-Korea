import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ICE, GATES, SKATE, MOVES, TURN_PTS, TURN_TIME, IceSkater, addPress, bankJump, comboMult, iceDepth, judge, jumpPose, onIce,
  peerJump, syncPeerTricks, trickCode, trickFromCode,
} from '../src/core/ice-skate.js';

// Mokdong Ice Rink's skating (Yozi 2026-11-21): jump, then arrows in the air
// make tricks; clean landings in a row make a combo.
const press = (keys, t = 0.05, gap = 0.03) => { const j = { tricks: [], half: null }; [...keys].forEach((k, i) => addPress(j, k, t + i * gap)); return j.tricks; };
const codes = (tricks) => tricks.map(trickCode).join(',');
const airTime = (speed) => (2 * (SKATE.jump0 + SKATE.jumpPerSpeed * speed)) / SKATE.gravity;

test('the ice is a rounded rectangle, and both gates open onto it', () => {
  assert.ok(onIce(ICE.x, ICE.z));
  assert.ok(!onIce(ICE.x + ICE.hw + 0.1, ICE.z));
  assert.ok(!onIce(ICE.x + ICE.hw - 0.5, ICE.z + ICE.hd - 0.5), 'the corner is cut round');
  assert.ok(Math.abs(iceDepth(ICE.x, ICE.z) - ICE.hd) < 1e-9);
  for (const g of GATES) {
    assert.ok(onIce(g.x, ICE.z + ICE.hd - 0.2), 'just inside the gate is ice');
    assert.ok(Math.abs(g.x) + g.w / 2 < ICE.hw - ICE.r, 'a gate is on the straight part of the boards');
  }
});

test('arrows in the air: left and right in turn raise the turn, pairs of up and down are tricks', () => {
  assert.equal(codes(press('L')), 'L1');
  assert.equal(codes(press('LR')), 'L2');
  assert.equal(codes(press('LRL')), 'L3');
  assert.equal(codes(press('RLRL')), 'R4', 'it turns the way of its first key');
  assert.equal(codes(press('RLRLR')), 'R4,R1', 'a fifth press starts another turn');
  assert.equal(codes(press('LL')), 'L1,L1', 'the same key twice is two singles');
  assert.equal(codes(press('LRR')), 'L2,R1');
  assert.equal(codes(press('UD')), 'UD');
  assert.equal(codes(press('DU')), 'DU');
  assert.equal(codes(press('UU')), 'UU');
  assert.equal(codes(press('DD')), 'DD');
  assert.equal(codes(press('U')), '', 'a lone ↑ waits');
  assert.equal(codes(press('ULR')), 'L2', 'a turn key drops the waiting ↑');
  assert.equal(codes(press('LRUDL')), 'L2,UD,L1', 'a trick between closes the first turn');
  // A turn that is already over is not raised: the key starts a new one.
  const j = { tricks: [], half: null };
  addPress(j, 'L', 0.05); addPress(j, 'R', 0.05 + TURN_TIME(1) + 0.05);
  assert.equal(codes(j.tricks), 'L1,R1');
  assert.ok(j.tricks[1].at >= j.tricks[0].at + j.tricks[0].dur);
});

test('a new trick that could only fall is not started; raising a turn is always taken', () => {
  const end = 0.75;
  const j = { tricks: [], half: null };
  assert.equal(addPress(j, 'L', end - 0.05, end), null, 'a tap just before the ice does nothing');
  addPress(j, 'U', end - 0.2, end);
  assert.equal(addPress(j, 'D', end - 0.2, end), null, 'nor a butterfly that cannot be turned');
  assert.equal(j.tricks.length, 0); assert.equal(j.half, null);
  assert.equal(judge(j.tricks, end).kind, 'land');
  assert.ok(addPress(j, 'L', end - 0.2, end), 'a single still fits');
  assert.equal(addPress(j, 'R', end - 0.15, end).turns, 2, 'and raising it is your own risk');
  addPress(j, 'L', end - 0.1, end);
  assert.equal(judge(j.tricks, end).kind, 'fall');
  // A trick waiting for one that ends after the landing never starts: no harm.
  const q = { tricks: [], half: null };
  addPress(q, 'L', 0.3, end); addPress(q, 'R', 0.3, end); addPress(q, 'U', 0.35, end);
  assert.ok(addPress(q, 'D', 0.35, end) === null || judge(q.tricks, end).kind === 'land');
});

test('each trick starts when the one before ends', () => {
  const t = press('LRDU');
  assert.equal(t[0].at, 0.05);
  assert.ok(Math.abs(t[1].at - (0.05 + TURN_TIME(2))) < 1e-9);
});

test('the pose: turns turn the body whole turns, and it ends upright facing the way it went', () => {
  const t = press('LRL', 0.1);
  const mid = jumpPose(t, 0.1 + TURN_TIME(3) / 2);
  assert.ok(Math.abs(mid.spin - Math.PI * 3) < 1e-6 && mid.i === 0 && Math.abs(mid.left - 0.5) < 1e-9);
  const end = jumpPose(t, 5);
  assert.ok(Math.abs(end.spin - Math.PI * 6) < 1e-6 && end.flip === 0 && end.roll === 0 && end.i === -1);
  assert.ok(jumpPose(press('RL'), 5).spin < 0, '→ turns the other way');
  for (const id of Object.keys(MOVES)) {
    const k = [{ ...MOVES[id], at: 0 }];
    const half = jumpPose(k, MOVES[id].dur / 2);
    assert.ok(Math.abs(half.flip) + Math.abs(half.roll) + Math.abs(half.spin) > 1, `${id} moves the body`);
    const done = jumpPose(k, MOVES[id].dur + 0.01);
    assert.ok(done.flip === 0 && done.roll === 0 && done.i === -1, `${id} ends upright`);
  }
});

test('landing: done is clean, nearly done is shaky (half points), still turning is a fall', () => {
  const t = press('LRL', 0.1), end = 0.1 + TURN_TIME(3);
  assert.deepEqual({ ...judge(t, end + 0.01), done: 1 }, { kind: 'land', clean: true, perfect: false, done: 1, pts: TURN_PTS[3] });
  assert.equal(judge(t, end + 0.01, true).pts, TURN_PTS[3] * 1.5, 'Jump pressed just before the ice: perfect');
  const shaky = judge(t, end - TURN_TIME(3) * 0.2, true);
  assert.ok(!shaky.clean && !shaky.perfect && shaky.pts === TURN_PTS[3] / 2);
  assert.equal(judge(t, end - TURN_TIME(3) * 0.5).kind, 'fall');
  assert.equal(judge([], 0.6).pts, 20, 'a plain jump is worth a little');
  // A second trick that never started is no harm; two done earn a bonus.
  const two = press('LDU', 0.1);
  assert.equal(judge(two, 0.1 + TURN_TIME(1) - 0.001).done.length, 1);
  assert.equal(judge(two, 5).pts, TURN_PTS[1] + MOVES.DU.pts + 100);
});

test('how much fits in a jump: a triple from a standstill, a quad with a little speed, and room to spare at a glide', () => {
  const react = 0.12; // s to the first key
  assert.ok(airTime(0) > react + TURN_TIME(3), 'standing: a triple');
  assert.ok(airTime(0) < react + TURN_TIME(4), 'standing: a quad is not clean');
  assert.ok(airTime(0) > react + TURN_TIME(4) * (1 - SKATE.stepOut), 'standing: a quad at once is shaky, not a fall');
  assert.ok(airTime(0) < 0.4 + TURN_TIME(4) * (1 - SKATE.stepOut), 'standing: a quad begun late falls');
  assert.ok(airTime(3) > react + TURN_TIME(4), 'a little speed: a quad');
  assert.ok(airTime(5) > 0.3 + TURN_TIME(3), 'gliding: a triple with a slow start');
  assert.ok(airTime(SKATE.max) < 1.2, 'never long in the air');
});

test('the skater: pushes up to top speed, glides on, carves, jumps and lands a triple into a combo', () => {
  const s = new IceSkater();
  for (let i = 0; i < 300; i++) s.step(1 / 60, 1, 0);
  assert.ok(s.speed > SKATE.max * 0.9 && s.speed <= SKATE.max + 1e-6, `top speed ${s.speed}`);
  for (let i = 0; i < 60; i++) s.step(1 / 60);
  assert.ok(s.speed > SKATE.max * 0.6, 'a second later, still gliding');
  for (let i = 0; i < 90; i++) s.step(1 / 60, 0, 1); // lean the other way
  assert.ok(Math.abs(s.vx) < 2 && s.vz > 4, 'the glide came round');
  const fly = (keys, at = 5) => {
    assert.equal(s.jump().kind, 'jump');
    let ev = [];
    for (let i = 0; i < 120 && s.air; i++) {
      if (i === at) for (const k of keys) s.press(k);
      ev = s.step(1 / 60).events;
    }
    assert.ok(!s.air);
    return ev[0];
  };
  for (let i = 0; i < 200; i++) s.step(1 / 60, 0, 1);
  const a = fly('LRL');
  assert.equal(a.kind, 'land'); assert.ok(a.clean); assert.equal(a.total, TURN_PTS[3]); assert.equal(s.chain, 1);
  for (let i = 0; i < 60; i++) s.step(1 / 60, 0, 1);
  const b = fly('DU');
  assert.equal(b.mult, 1.5); assert.equal(b.total, MOVES.DU.pts * 1.5); assert.equal(s.chain, 2);
  // A quad from nearly nothing, begun late: a fall, on the ice for a moment, the combo gone.
  s.vx = 0; s.vz = 0.5;
  const c = fly('RLRL', 24);
  assert.equal(c.kind, 'fall'); assert.ok(s.down > 0); assert.equal(s.chain, 0);
  assert.equal(s.jump(), null, 'no jumping while down');
  assert.match(s.code(), /^\d+:!$/);
  for (let i = 0; i < 90; i++) s.step(1 / 60);
  assert.equal(s.down <= 0, true);
  // The combo runs out when the next jump takes too long.
  fly('L'); assert.equal(s.chain, 1);
  for (let i = 0; i < (SKATE.chain + 0.5) * 60; i++) s.step(1 / 60);
  assert.equal(s.chain, 0);
});

test('the combo grows by half a time each clean landing, up to x3', () => {
  assert.deepEqual([1, 2, 3, 5, 9].map(comboMult), [1, 1.5, 2, 3, 3]);
});

test('what travels to the others: the jump and its tricks, and they play it back', () => {
  const s = new IceSkater();
  assert.equal(s.code(), '');
  s.jump(); s.step(0.05); s.press('L'); s.press('R');
  assert.equal(s.code(), '1:L2');
  const j = peerJump(s.code());
  assert.deepEqual(j, { n: '1', fall: false, codes: ['L2'] });
  const mine = [];
  syncPeerTricks(mine, j.codes, 0.1);
  assert.equal(mine[0].at, 0.1);
  syncPeerTricks(mine, ['L3', 'UD'], 0.2); // raised, and a second one
  assert.equal(codes(mine), 'L3,UD'); assert.equal(mine[0].at, 0.1, 'a raised turn keeps its start');
  assert.ok(Math.abs(mine[1].at - (0.1 + TURN_TIME(3))) < 1e-9);
  assert.deepEqual(peerJump('4:!'), { n: '4', fall: true, codes: [] });
  assert.deepEqual(peerJump('2:L9,XX,R1').codes, ['R1'], 'made-up tricks are dropped');
  assert.equal(peerJump(''), null);
  assert.equal(trickFromCode('L5'), null);
});

test("today's points and the best jump", () => {
  let s = bankJump(null, 'd1', 300);
  s = bankJump(s, 'd1', 700);
  assert.deepEqual(s, { day: 'd1', pts: 1000, best: 700 });
  assert.deepEqual(bankJump(s, 'd2', 100), { day: 'd2', pts: 100, best: 700 }, 'a new day: the best stays');
});
