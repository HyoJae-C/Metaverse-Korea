import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TaxiHost, parseTaxi, taxiMsg, shareOf, worstShare, SHARE_MAX } from '../src/core/taxi-share.js';

test('dutch pay: the fare split by riders, rounded up to ₩100', () => {
  assert.equal(shareOf(9600, 2), 4800);
  assert.equal(shareOf(9700, 3), 3300);
  assert.equal(shareOf(4800, 4), 1200);
  assert.equal(worstShare(9700), 4900);
});

test('messages go there and back, and nothing else parses', () => {
  const m = parseTaxi(taxiMsg('ask', 'p-1', 'abc123', 9700, -1096.4, 503));
  assert.deepEqual(m, { verb: 'ask', to: 'p-1', trip: 'abc123', a: 9700, b: -1096, c: 503 });
  assert.deepEqual(parseTaxi(taxiMsg('no', 'p-1', 'abc123')), { verb: 'no', to: 'p-1', trip: 'abc123', a: null, b: null, c: null });
  assert.equal(parseTaxi('taxi:steal:p-1:abc'), null);
  assert.equal(parseTaxi('tarot:join:p-1'), null);
});

test('the host: up to four ride, the short are treated or left behind', () => {
  const asked = [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }, { id: 'c', name: 'Cy' }, { id: 'd', name: 'Di' }];
  const h = new TaxiHost('t1', 10000, asked);
  assert.equal(h.asked.size, SHARE_MAX - 1, 'only three are asked');
  assert.equal(h.heard('d', { verb: 'join', trip: 't1', a: 1 }), false, 'not asked');
  assert.equal(h.heard('a', { verb: 'join', trip: 'zzz', a: 1 }), false, 'another ride');
  h.heard('a', { verb: 'join', trip: 't1', a: 1 });
  h.heard('b', { verb: 'join', trip: 't1', a: 0 });
  assert.equal(h.settled, false);
  h.heard('c', { verb: 'no', trip: 't1' });
  assert.equal(h.settled, true);
  assert.deepEqual(h.plan(), { each: 3400, host: 6800, guests: [{ id: 'a', name: 'Ana', pays: 3400 }, { id: 'b', name: 'Bo', pays: 0 }] });
  h.leaveBehind('b');
  assert.deepEqual(h.plan(), { each: 5000, host: 5000, guests: [{ id: 'a', name: 'Ana', pays: 5000 }] });
  h.heard('a', { verb: 'bye', trip: 't1' });
  assert.equal(h.count, 1);
});
