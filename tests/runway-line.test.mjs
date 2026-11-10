import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunwayLine, MAX_LINE, STALE_MS, lineMsg, parseLineMsg } from '../src/core/runway-line.js';

const hi = (at, w = false) => parseLineMsg(lineMsg.hi(at, w));

test('alone: join and it is your turn at once', () => {
  const l = new RunwayLine('me');
  assert.equal(l.myTurn(0), false);
  assert.ok(l.join(100));
  assert.equal(l.place(100), 0);
  assert.ok(l.myTurn(100));
  l.setWalking(true);
  assert.equal(l.myTurn(100), false);
});

test('taking turns: by joining time, never while someone walks', () => {
  const l = new RunwayLine('me');
  l.heard('a', hi(50), 100);
  l.join(100);
  assert.equal(l.place(100), 1);
  assert.equal(l.myTurn(100), false);
  l.heard('a', hi(50, true), 200); // a walks
  assert.equal(l.myTurn(200), false);
  l.heard('b', hi(20), 300); // b joined earlier by the clock but a is walking: a stays first
  assert.deepEqual(l.order(300).map((p) => p.id), ['a', 'b', 'me']);
  l.heard('a', parseLineMsg(lineMsg.bye()), 400);
  l.heard('b', hi(20, true), 500);
  assert.equal(l.myTurn(500), false);
  l.heard('b', parseLineMsg('rwq:bye'), 600);
  assert.ok(l.myTurn(600));
});

test('at most four in line', () => {
  const l = new RunwayLine('me');
  for (let i = 0; i < MAX_LINE; i++) l.heard('p' + i, hi(i), 0);
  assert.equal(l.join(10), false);
  assert.equal(l.has(), false);
  l.heard('p9', hi(99), 0); // a fifth waiting: not counted
  assert.equal(l.order(0).length, MAX_LINE);
});

test('someone not heard from drops out', () => {
  const l = new RunwayLine('me');
  l.heard('a', hi(1, true), 0);
  l.join(10);
  assert.equal(l.myTurn(10), false);
  assert.ok(l.myTurn(STALE_MS + 1));
});

test('the board keeps the latest walks, best first', () => {
  const l = new RunwayLine('me');
  for (const [id, n] of [['a', 50], ['b', 90], ['c', 70], ['d', 30], ['e', 80]]) l.heard(id, parseLineMsg(lineMsg.score(n)), 0);
  assert.deepEqual(l.board().map((r) => r.id), ['b', 'e', 'c', 'd']);
});

test('messages: junk is ignored', () => {
  assert.equal(parseLineMsg('rwq:hi:x:1'), null);
  assert.equal(parseLineMsg('rwq:score:101'), null);
  assert.equal(parseLineMsg('rwq:nope'), null);
  assert.equal(parseLineMsg('wave'), null);
  assert.deepEqual(parseLineMsg('rwq:score:77'), { k: 'score', n: 77 });
});
