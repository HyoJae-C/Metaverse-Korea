import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYut, yutInvite, yutReply, yutGo, yutAct, yutKick, yutClose, yutRng, gaugeAt, YUT_GAUGE_MS, YUT_BOT } from '../src/core/yut-net.js';
import { YutGame, throwSticks, chooseMove } from '../src/core/yut-game.js';

test('yutnori room messages read back as sent', () => {
  assert.deepEqual(parseYut(yutInvite('ab-12')), { k: 'i', to: 'ab-12' });
  assert.deepEqual(parseYut(yutReply('h1', true)), { k: 'a', host: 'h1' });
  assert.deepEqual(parseYut(yutReply('h1', false)), { k: 'n', host: 'h1' });
  assert.deepEqual(parseYut(yutGo('g1', 12345, 4, ['h1', 'p2', YUT_BOT])), { k: 'g', gid: 'g1', seed: 12345, pieces: 4, ids: ['h1', 'p2', '~'] });
  assert.deepEqual(parseYut(yutAct('g1', 7, 2, { k: 't', power: 9 })), { k: 'x', gid: 'g1', n: 7, seat: 2, act: { k: 't', power: 9 } });
  assert.deepEqual(parseYut(yutAct('g1', 8, 0, { k: 'm', i: 1, from: -1 })), { k: 'x', gid: 'g1', n: 8, seat: 0, act: { k: 'm', i: 1, from: -1 } });
  assert.deepEqual(parseYut(yutKick('g1', 3)), { k: 'k', gid: 'g1', seat: 3 });
  assert.deepEqual(parseYut(yutClose('g1')), { k: 'c', gid: 'g1' });
});

test('bad yutnori messages are dropped', () => {
  for (const e of ['bg:i:x', 'yut:i:', 'yut:g:g1:1:3:a,b', 'yut:g:g1:1:4:a', 'yut:g:g1:1:4:a,a', 'yut:x:g1:1:4:t5', 'yut:x:g1:1:0:q1', 'yut:k:g1:7', 'yut:i:' + 'x'.repeat(80), 42, null]) {
    assert.equal(parseYut(e), null, String(e));
  }
});

test('the shared sticks land the same in every browser', () => {
  const a = yutRng(99), b = yutRng(99), c = yutRng(100);
  const ra = Array.from({ length: 20 }, () => throwSticks(a).kind), rb = Array.from({ length: 20 }, () => throwSticks(b).kind);
  assert.deepEqual(ra, rb);
  assert.notDeepEqual(ra, Array.from({ length: 20 }, () => throwSticks(c).kind));
  // Every result comes up over many throws.
  const seen = new Set(Array.from({ length: 2000 }, () => throwSticks(a).kind));
  assert.equal(seen.size, 6);
});

test('two browsers playing the same moves end with the same board', () => {
  // The host picks the moves; the guest only replays the messages.
  const seed = 4242, host = new YutGame({ players: 3, pieces: 2 }), guest = new YutGame({ players: 3, pieces: 2 });
  const hr = yutRng(seed), gr = yutRng(seed);
  let n = 0;
  while (host.phase !== 'over' && n < 2000) {
    let msg;
    if (host.phase === 'throw') { host.throw(throwSticks(hr).kind); msg = yutAct('g', n++, guest.turn, { k: 't', power: 3 }); }
    else { const o = chooseMove(host); host.move(o.i, o.from); msg = yutAct('g', n++, guest.turn, { k: 'm', i: o.i, from: o.from }); }
    const m = parseYut(msg);
    assert.equal(m.seat, guest.turn);
    if (m.act.k === 't') guest.throw(throwSticks(gr).kind); else guest.move(m.act.i, m.act.from);
    assert.deepEqual(guest.snapshot(), host.snapshot());
  }
  assert.equal(host.phase, 'over');
});

test('the throw gauge goes up and down', () => {
  assert.equal(gaugeAt(0), 0);
  assert.equal(gaugeAt(YUT_GAUGE_MS), 1);
  assert.ok(Math.abs(gaugeAt(YUT_GAUGE_MS * 1.5) - 0.5) < 1e-9);
  assert.equal(gaugeAt(YUT_GAUGE_MS * 2), 0);
});
