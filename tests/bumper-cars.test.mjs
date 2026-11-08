import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BumperCar, RINK, HOMES, SEATS, CAR_COLORS, CAR_R, SPEED, BOOST_SPEED, BOARD_MS, ROUND_S, GATE,
  MIN_DRIVERS, tooFew, inRink, phaseOf, roundGo, freeSlot, settleSlot, mayBoard, freeForLine, rammedBy, ranking,
} from '../src/core/bumper-cars.js';
import { TarotQueue } from '../src/core/tarot-queue.js';
import { RIDES } from '../src/core/themepark.js';
import { HAUNT } from '../src/core/haunted.js';
import { ROOM_SIZES } from '../src/core/interior.js';

const run = (car, dx, dz, secs, others = []) => { for (let t = 0; t < secs; t += 1 / 60) { car.drive(dx, dz, 1 / 60); car.bump(others); } };

test('six cars, six different colours, parked inside the rink', () => {
  assert.equal(SEATS, 6);
  assert.equal(HOMES.length, 6);
  assert.equal(new Set(CAR_COLORS).size, 6, 'every car its own colour');
  for (const h of HOMES) {
    const [x, z] = inRink(h.x, h.z);
    assert.ok(Math.abs(x - h.x) < 1e-9 && Math.abs(z - h.z) < 1e-9, 'home inside the floor');
  }
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) assert.ok(Math.hypot(HOMES[i].x - HOMES[j].x, HOMES[i].z - HOMES[j].z) > CAR_R * 2, 'parked cars do not touch');
});

test('the rink fits in the park and stays clear of the other rides', () => {
  const { w, d } = ROOM_SIZES.park;
  const x0 = RINK.x - RINK.hx - 0.5, x1 = RINK.x + RINK.hx + 0.5, z0 = RINK.z - RINK.hz - 0.5, z1 = RINK.z + RINK.hz + 0.5;
  assert.ok(x1 < w / 2 && z1 < d / 2 && z0 > -d / 2, 'inside the park fence');
  const clear = (x, z, r) => x + r < x0 || x - r > x1 || z + r < z0 || z - r > z1;
  assert.ok(clear(RIDES.drop.x, RIDES.drop.z, RIDES.drop.r + 1.2), 'drop tower');
  assert.ok(clear(RIDES.wheel.x, RIDES.wheel.z, 3.2), 'Ferris wheel');
  assert.ok(clear(HAUNT.x, HAUNT.z, 3.5), 'haunted house');
  assert.ok(clear(12, 6, 0.9), 'bench');
  assert.ok(GATE.x < x0 && GATE.x > 13, 'the gate spot is outside, by the plaza');
});

test('the rink is bigger than the first one (8.8 × 8 m)', () => {
  assert.ok(RINK.hx * 2 * RINK.hz * 2 > 8.8 * 8 * 1.4, 'at least 40% more floor');
  assert.ok(RINK.hx >= 4.4 && RINK.hz >= 4, 'longer and wider, not just one way');
});

test('one driver alone cannot start a round', () => {
  assert.equal(MIN_DRIVERS, 2);
  assert.equal(tooFew(1), true);
  assert.equal(tooFew(2), false);
  assert.equal(tooFew(6), false);
});

test('drives where the stick points, and boost is faster for a moment', () => {
  const car = new BumperCar({ x: RINK.x, z: RINK.z - 2, ry: 0 });
  run(car, 0, 1, 1);
  assert.ok(car.z > RINK.z - 2 + 0.5, 'moved forward (+z)');
  assert.ok(Math.abs(car.speed - SPEED) < 0.3, `top speed ${car.speed}`);
  assert.equal(car.boost(), true);
  assert.equal(car.boost(), false, 'not twice in a row');
  for (let t = 0; t < 0.4; t += 1 / 60) car.drive(0, 1, 1 / 60);
  assert.ok(car.speed > SPEED + 1 && car.speed <= BOOST_SPEED + 1e-9, `boosting ${car.speed}`);
  run(car, 0, 0, 2);
  assert.ok(!car.boosting && car.charge < 1, 'boost over, recharging');
  run(car, 0, 0, 4.1);
  assert.equal(car.charge, 1, 'ready again');
});

test('turns towards the stick instead of snapping', () => {
  const car = new BumperCar({ x: RINK.x, z: RINK.z, ry: 0 });
  car.drive(1, 0, 1 / 60); // stick right (+x): a quarter turn away
  assert.ok(car.ry > 0 && car.ry < 0.2);
  run(car, 1, 0, 1);
  assert.ok(Math.abs(car.ry - Math.PI / 2) < 0.05);
});

test('never leaves the floor and bounces back off the rail', () => {
  const car = new BumperCar({ x: RINK.x, z: RINK.z, ry: Math.PI / 2 });
  let wall = 0;
  for (let t = 0; t < 3; t += 1 / 60) wall = Math.max(wall, car.drive(1, 0, 1 / 60).wall);
  assert.ok(car.x <= RINK.x + RINK.hx - CAR_R + 1e-9);
  assert.ok(wall > 0, 'felt the rail');
  car.drive(0, 0, 1 / 60);
  assert.ok(car.knock.vx < 0, 'pushed back in');
});

test('a hit shoves you back and kills your speed', () => {
  const car = new BumperCar({ x: RINK.x - 2, z: RINK.z, ry: Math.PI / 2 });
  run(car, 1, 0, 0.4);
  const fast = car.speed;
  const parked = { x: car.x + CAR_R * 2 - 0.1, z: car.z, vx: 0, vz: 0, fixed: true };
  const hit = car.bump([parked]);
  assert.ok(hit && hit.mine, 'I rammed it');
  assert.ok(car.speed < fast * 0.5, 'lost speed');
  assert.ok(car.knock.vx < -2, 'sliding back');
  const x0 = car.x;
  for (let t = 0; t < 0.3; t += 1 / 60) car.drive(0, 0, 1 / 60);
  assert.ok(car.x < x0 - 0.3, `pushed back ${x0 - car.x}`);
});

test('who rammed whom', () => {
  assert.equal(rammedBy({ x: 0, z: 0, vx: 3, vz: 0 }, { x: 1.4, z: 0, vx: 0, vz: 0 }), true);
  assert.equal(rammedBy({ x: 1.4, z: 0, vx: 0, vz: 0 }, { x: 0, z: 0, vx: 3, vz: 0 }), false);
  assert.equal(rammedBy({ x: 0, z: 0, vx: 0.4, vz: 0 }, { x: 1.4, z: 0 }), false, 'a nudge is not a ram');
});

test('round phases: boarding countdown, a minute of driving, then over', () => {
  const go = 100000;
  assert.deepEqual(phaseOf(0, go), { phase: 'idle', left: 0 });
  assert.equal(phaseOf(go, go - BOARD_MS).phase, 'boarding');
  assert.equal(phaseOf(go, go - 5000).left, 5);
  assert.equal(phaseOf(go, go + 1).phase, 'driving');
  assert.equal(phaseOf(go, go + 1).left, ROUND_S);
  assert.equal(phaseOf(go, go + ROUND_S * 1000).phase, 'over');
});

test('two people who get in at once end up on the same clock', () => {
  const now = 50000;
  assert.equal(roundGo([{ go: now + 9000 }, { go: now + 12000 }], now), now + 9000);
  assert.equal(roundGo([{ go: now - ROUND_S * 1000 - 1 }], now), 0, 'a finished round does not count');
  assert.equal(roundGo([], now), 0);
});

test('cars: the first free one, and a clash goes to the smaller id', () => {
  assert.equal(freeSlot([]), 0);
  assert.equal(freeSlot([0, 1, 3]), 2);
  assert.equal(freeSlot([0, 1, 2, 3, 4, 5]), -1);
  assert.equal(settleSlot('b', 0, [{ id: 'a', slot: 0 }]), 1, 'b moves');
  assert.equal(settleSlot('a', 0, [{ id: 'b', slot: 0 }]), 0, 'a keeps it');
  assert.equal(settleSlot('z', 0, [0, 1, 2, 3, 4, 5].map((s) => ({ id: 'a' + s, slot: s }))), -1, 'seventh is out');
});

test('max six a round, then the line: called in order when the round ends', () => {
  let now = 0;
  const q = new TarotQueue(() => now, 20000);
  const line = Array.from({ length: 8 }, (_, i) => ({ id: 'p' + i, tq: 1000 + i }));
  // A round is driving: nobody is called, nobody may get in.
  let turn = q.update(line, freeForLine('driving', 6));
  assert.deepEqual(turn.callable, []);
  assert.equal(mayBoard({ phase: 'driving', riders: 2, turn: { order: [], callable: [] }, myId: 'x' }), false);
  // Round over, the rink is empty: the first six are called.
  now = 70000;
  turn = q.update(line, freeForLine('idle', 0));
  assert.deepEqual(turn.callable, ['p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
  assert.equal(mayBoard({ phase: 'idle', riders: 0, turn, myId: 'p5' }), true);
  assert.equal(mayBoard({ phase: 'idle', riders: 0, turn, myId: 'p6' }), false, 'no cutting in');
  assert.equal(mayBoard({ phase: 'idle', riders: 0, turn, myId: 'walk-up' }), false, 'a newcomer waits too');
  // Six are in (boarding): the cars are full.
  assert.equal(mayBoard({ phase: 'boarding', riders: 6, turn: { order: [], callable: [] }, myId: 'x' }), false);
  // Nobody waiting: walk up and get in.
  assert.equal(mayBoard({ phase: 'boarding', riders: 3, turn: { order: [], callable: [] }, myId: 'x' }), true);
});

test('the bump king', () => {
  assert.deepEqual(ranking([{ id: 'a', hits: 2 }, { id: 'b', hits: 5 }, { id: 'c', hits: 5 }]).map((r) => r.id), ['b', 'c', 'a']);
});
