import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clearGrass, throwTarget, flightTime, discAt, chaseSpeed, canCatch, catchChance, THROW_MAX, THROW_MIN, HAND_Y } from '../src/core/frisbee.js';

// The Han River park lawn (core/park.js).
const park = { lawns: [{ x0: -12.6, x1: 17, z0: 0.5, z1: 13.6 }], colliders: [] };

test('only open grass counts: not the path, not under a tree', () => {
  assert.ok(clearGrass(park, 2, 6));
  assert.ok(!clearGrass(park, 2, -2), 'the riverside path');
  assert.ok(!clearGrass(null, 2, 6), 'not a picnic place at all');
  const tree = { ...park, colliders: [{ p: [[3.6, 5.6], [4.4, 5.6], [4.4, 6.4], [3.6, 6.4]] }] };
  assert.ok(!clearGrass(tree, 4, 6));
  const street = { ...park, blocked: (r) => r.x0 < 0 }; // a street path on the left
  assert.ok(!clearGrass(street, 0.1, 6) && clearGrass(street, 5, 6));
});

test('a throw lands on the grass, shortened when the lawn ends', () => {
  const along = throwTarget(park, -10, 7, Math.PI / 2, 1); // facing +x, along the lawn
  assert.equal(along.d, THROW_MAX);
  assert.ok(Math.abs(along.x - (-10 + THROW_MAX)) < 1e-9 && Math.abs(along.z - 7) < 1e-9);
  const across = throwTarget(park, 2, 3, 0, 1); // facing +z: the lawn ends at 13.6
  assert.ok(across.d < THROW_MAX && across.d >= THROW_MIN && clearGrass(park, across.x, across.z));
  assert.equal(throwTarget(park, 2, 3, Math.PI, 1), null, 'facing the river: no room');
  const soft = throwTarget(park, -10, 7, Math.PI / 2, 0);
  assert.equal(soft.d, THROW_MIN);
});

test('it floats from the hand to the grass in an arc', () => {
  const from = { x: 0, z: 0 }, to = { x: 10, z: 0 };
  assert.equal(discAt(from, to, 0).y, HAND_Y);
  assert.ok(Math.abs(discAt(from, to, 1).y - 0.03) < 1e-9);
  assert.ok(discAt(from, to, 0.5).y > HAND_Y, 'higher than the hand mid-flight');
  assert.ok(flightTime(10) > flightTime(5));
});

test('a dog can make it to a long throw; cats and hamsters are slow', () => {
  // A small dog from a metre behind, after a slow start, to a full throw or a short one.
  for (const d of [THROW_MIN, 8, THROW_MAX]) assert.ok(0.3 + (d + 1) / chaseSpeed('dog', 0.85) < flightTime(d), `in time for ${d} m`);
  assert.ok(catchChance(0.85) >= 0.5 && catchChance(1.7) > catchChance(0.85) && catchChance(1.7) < 1, 'not every time');
  assert.ok(chaseSpeed('dog', 0.85) < chaseSpeed('dog', 1.7));
  assert.ok(chaseSpeed('cat') < chaseSpeed('dog', 0.85) && chaseSpeed('hamster') < chaseSpeed('cat'));
  assert.ok(canCatch(0.2, 0.2, 1.2, 1.7) && !canCatch(0.2, 0.2, 1.2, 0.85), 'big dogs leap higher');
  assert.ok(!canCatch(1, 0, 0.2, 1), 'too far away');
});

test('frisbees are sold only where picnic mats are, and the game only runs on the picnic lawn', () => {
  const { stores } = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url), 'utf8'));
  const sells = (k) => stores.filter((s) => s.products?.some((p) => p.ingredient === k)).map((s) => s.id).sort();
  assert.deepEqual(sells('frisbee'), sells('mat'));
  assert.ok(sells('frisbee').length >= 3);
  const game = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(game, /get room\(\) \{ return picnic\.room; \}/, 'the frisbee uses the picnic lawn');
});
