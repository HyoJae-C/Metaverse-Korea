// Home visits: the room messages between the host's game and visitors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { homeRoom, kickMsg, layoutMsg, parseVisitMsg, MAX_PEOPLE } from '../src/game/home-visits.js';

test('a layout goes over the room and comes back the same (rounded)', () => {
  const m = layoutMsg([['bed', -5.8, -4.25, 0], ['sofa', 0.123456, 1.987654, Math.PI]]);
  assert.deepEqual(parseVisitMsg(m).lay, [['bed', -5.8, -4.25, 0], ['sofa', 0.12, 1.99, 3.14]]);
  assert.ok(m.length < 120);
});

test('kicks, junk and other emotes', () => {
  assert.deepEqual(parseVisitMsg(kickMsg('abc')), { kick: 'abc' });
  assert.deepEqual(parseVisitMsg(kickMsg('*')), { kick: '*' });
  assert.equal(parseVisitMsg('hv:lay:{not json'), null);
  assert.equal(parseVisitMsg('hv:lay:{"a":1}'), null);
  assert.equal(parseVisitMsg('wave'), null);
  assert.equal(parseVisitMsg(null), null);
});

test('one room per host, at most four people', () => {
  assert.equal(homeRoom('another-seoul', 'h1'), 'another-seoul-home-h1');
  assert.notEqual(homeRoom('another-seoul', 'h1'), homeRoom('another-seoul', 'h2'));
  assert.equal(MAX_PEOPLE, 4);
});
