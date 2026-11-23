// Home visits: the room messages between the host's game and visitors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { homeRoom, kickMsg, layoutMsg, parseVisitMsg } from '../src/game/home-visits.js';
import { homePeople } from '../src/core/home-stages.js';

test('a layout goes over the room and comes back the same (rounded)', () => {
  const m = layoutMsg([['bed', -5.8, -4.25, 0], ['sofa', 0.123456, 1.987654, Math.PI]]);
  assert.deepEqual(parseVisitMsg(m).lay, [['bed', -5.8, -4.25, 0], ['sofa', 0.12, 1.99, 3.14]]);
  assert.ok(m.length < 120);
  const on = parseVisitMsg(layoutMsg([['lamp-moon', 1, 2, 0, 0.65, 1]])).lay; // on a table, switched off
  assert.deepEqual(on, [['lamp-moon', 1, 2, 0, 0.65, 1]]);
});

test('kicks, junk and other emotes', () => {
  assert.deepEqual(parseVisitMsg(kickMsg('abc')), { kick: 'abc' });
  assert.deepEqual(parseVisitMsg(kickMsg('*')), { kick: '*' });
  assert.equal(parseVisitMsg('hv:lay:{not json'), null);
  assert.equal(parseVisitMsg('hv:lay:{"a":1}'), null);
  assert.equal(parseVisitMsg('wave'), null);
  assert.equal(parseVisitMsg(null), null);
});

test('one room per host; 4 / 6 / 8 / 8 people (host included) by home level', () => {
  assert.equal(homeRoom('another-seoul', 'h1'), 'another-seoul-home-h1');
  assert.notEqual(homeRoom('another-seoul', 'h1'), homeRoom('another-seoul', 'h2'));
  assert.deepEqual([1, 2, 3, 4].map(homePeople), [4, 6, 8, 8]);
});
