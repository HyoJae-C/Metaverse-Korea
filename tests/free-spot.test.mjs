// Getting up from a seat at home never leaves you shut in by furniture
// (Yozi 2026-11-20): the spot must be clear and walkable to the door.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionMap } from '../src/core/collision.js';
import { furnitureCollider, furnitureSeats } from '../src/core/furniture.js';
import { freeSpot } from '../src/core/free-spot.js';

const room = { w: 14, d: 11 }, door = [0, 4], r = 0.4;
const box = (x0, z0, x1, z1) => ({ p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });

test('a clear spot open to the door stays where it is', () => {
  const col = new CollisionMap([box(-1, -1, 1, 0)]);
  assert.deepEqual(freeSpot(col, [0, 1.2], door, room, r), [0, 1.2]);
});

test('a spot inside a piece moves to the nearest clear spot', () => {
  const col = new CollisionMap([box(-1, -1, 1, 1)]);
  const [x, z] = freeSpot(col, [0, 0.2], door, room, r);
  assert.equal(col.blocked(x, z, r), false);
  assert.ok(Math.hypot(x, z - 0.2) < 1.6, 'near: ' + [x, z]);
});

test('a clear pocket walled in by furniture is not used: out where the door can be reached', () => {
  // A 1.2 m pocket around (-4, -3), closed on all four sides.
  const walls = [box(-5, -4.2, -3, -3.8), box(-5, -2.2, -3, -1.8), box(-5.2, -4.2, -4.8, -1.8), box(-3.2, -4.2, -2.8, -1.8)];
  const col = new CollisionMap(walls);
  assert.equal(col.blocked(-4, -3, r), false, 'the pocket itself is clear');
  const [x, z] = freeSpot(col, [-4, -3], door, room, r);
  assert.equal(col.blocked(x, z, r), false);
  assert.ok(!(x > -5 && x < -3 && z > -4 && z < -2), 'outside the pocket: ' + [x, z]);
});

test('getting up from a sofa hemmed in by a table lands somewhere clear', () => {
  const items = [{ id: 'sofa', x: 0, z: -2, ry: 0 }, { id: 'table', x: 0, z: -0.9, ry: 0 }];
  const col = new CollisionMap(items.map(furnitureCollider).filter(Boolean));
  const seat = furnitureSeats(items[0])[0];
  const [x, z] = freeSpot(col, seat.stand, door, room, r);
  assert.equal(col.blocked(x, z, r), false);
});

test('the door boxed in: the door itself', () => {
  const col = new CollisionMap([box(-7, -5.5, 7, 5.5)]);
  assert.deepEqual(freeSpot(col, [1, 1], door, room, r), door);
});

// Room dividers (core/partitions.js) can't shut floor off from the door
// (Yozi 2026-11-22): game/decor.js refuses one when shutInArea grows.
test('shut-in floor: a closed-off corner counts, one with a body-wide gap does not', async () => {
  const { shutInArea } = await import('../src/core/free-spot.js');
  assert.equal(shutInArea(new CollisionMap([]), door, room, r), 0, 'an empty room');
  // The back-left corner (x < -4, z < -3) closed off by two thin walls.
  const closed = [box(-7, -3.1, -4, -2.9), box(-4.1, -5.5, -3.9, -2.9)];
  assert.ok(shutInArea(new CollisionMap(closed), door, room, r) > 1, 'closed corner');
  // The same with a 1 m gap where they'd meet: you walk in.
  const gap = [box(-7, -3.1, -5, -2.9), box(-4.1, -5.5, -3.9, -2.9)];
  assert.equal(shutInArea(new CollisionMap(gap), door, room, r), 0, '1 m gap');
  // A 50 cm gap is too narrow for a body: still shut in.
  const narrow = [box(-7, -3.1, -4.6, -2.9), box(-4.1, -5.5, -3.9, -2.9)];
  assert.ok(shutInArea(new CollisionMap(narrow), door, room, r) > 1, '50 cm gap');
});

test('the dividers are shop furniture and solid', async () => {
  const { PARTITIONS, isPartition } = await import('../src/core/partitions.js');
  assert.equal(PARTITIONS.length, 3);
  for (const [id] of PARTITIONS) {
    assert.ok(isPartition(id));
    assert.ok(furnitureCollider({ id, x: 0, z: 0, ry: 0 }), id + ' blocks');
  }
});
