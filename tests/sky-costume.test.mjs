// The flying costumes' state as it travels to other players (core/sky-costume.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeFlight, parseFlight, encodeCarried, parseCarried, carrySeats } from '../src/core/sky-costume.js';

test('flight state round-trips and rejects junk', () => {
  assert.equal(encodeFlight('suit', null), 'suit');
  assert.equal(encodeFlight('wings', 'princess'), 'wings.princess');
  assert.equal(encodeFlight('nope', 'arm1'), undefined);
  assert.deepEqual(parseFlight('seoulman.arms2'), { kind: 'seoulman', carry: 'arms2', stand: false });
  assert.deepEqual(parseFlight('suit.bogus'), { kind: 'suit', carry: null, stand: false });
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

test('birds carry by the talons, the carpet and the cloud seat two riders', async () => {
  const { COSTUMES } = await import('../src/core/sky-costume.js');
  assert.deepEqual(COSTUMES.eagle.carry, ['talons']);
  assert.deepEqual(COSTUMES.albatross.carry, ['talons']);
  assert.deepEqual(COSTUMES.carpet.carry, ['ride']);
  assert.deepEqual(COSTUMES.wukong.carry, ['ride']);
  assert.equal(carrySeats('talons'), 1);
  assert.equal(carrySeats('ride'), 2);
  assert.equal(encodeFlight('eagle', 'talons'), 'eagle.talons');
  assert.deepEqual(parseFlight('carpet.ride'), { kind: 'carpet', carry: 'ride', stand: false });
  assert.deepEqual(parseCarried(encodeCarried('p-1', 'talons', 0)), { flyer: 'p-1', pose: 'talons', slot: 0 });
  assert.deepEqual(parseCarried('p-1.ride.1'), { flyer: 'p-1', pose: 'ride', slot: 1 });
});

test('the new chat codes and carry messages', async () => {
  const { skyCode, parseSkyMsg, skyMsg } = await import('../src/game/sky-flight.js');
  assert.equal(skyCode('신천옹'), 'albatross');
  assert.equal(skyCode('독수리'), 'eagle');
  assert.equal(skyCode('양탄자'), 'carpet');
  assert.equal(skyCode('손오공'), 'wukong');
  assert.deepEqual(parseSkyMsg(skyMsg('invite', 'abc', 'talons', 0)), { verb: 'invite', target: 'abc', pose: 'talons', slot: 0 });
});

test('standing on the ground travels with the flight', () => {
  assert.equal(encodeFlight('eagle', null, true), 'eagle!');
  assert.equal(encodeFlight('carpet', 'ride', true), 'carpet!.ride');
  assert.deepEqual(parseFlight('carpet!.ride'), { kind: 'carpet', carry: 'ride', stand: true });
  assert.deepEqual(parseFlight('wukong!'), { kind: 'wukong', carry: null, stand: true });
  assert.equal(parseFlight('dragon!'), null);
});
