// The flying costumes' state as it travels to other players (core/sky-costume.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeFlight, parseFlight, encodeCarried, parseCarried, carrySeats } from '../src/core/sky-costume.js';

test('flight state round-trips and rejects junk', () => {
  assert.equal(encodeFlight('suit', null), 'suit');
  assert.equal(encodeFlight('wings', 'princess'), 'wings.princess');
  assert.equal(encodeFlight('nope', 'arm1'), undefined);
  assert.deepEqual(parseFlight('seoulman.arms2'), { kind: 'seoulman', carry: 'arms2' });
  assert.deepEqual(parseFlight('suit.bogus'), { kind: 'suit', carry: null });
  assert.equal(parseFlight('dragon'), null);
  assert.equal(parseFlight(undefined), null);
});

test('carried state names the flyer, the pose and the slot', () => {
  assert.deepEqual(parseCarried(encodeCarried('abc-123', 'arms2', 1)), { flyer: 'abc-123', pose: 'arms2', slot: 1 });
  assert.equal(parseCarried('abc.hug.0'), null);
  assert.equal(parseCarried('a b.arm1.0'), null);
  assert.equal(carrySeats('arms2'), 2);
  assert.equal(carrySeats('princess'), 1);
  assert.equal(carrySeats('x'), 0);
});
