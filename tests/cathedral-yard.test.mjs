// Myeongdong Cathedral's hill (core/cathedral-yard-ground.js): the yard up
// on its terrace, the stairs and the ramp from Myeongdong-gil, and its walls.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { yardY, yardHeightAt } from '../src/core/cathedral-yard-ground.js';
import { CollisionMap } from '../src/core/collision.js';
import { YARD, DOOR } from '../scripts/build-myeongdong.mjs';
import { STAMPS } from '../src/data/stamps.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const district = read('../public/regions/another-seoul/districts/myeongdong.json');
const region = read('../public/regions/another-seoul/region.json');
const [ox, oz] = region.districts.find((d) => d.id === 'myeongdong').offset;
const l = district.landmarks.find((q) => q.type === 'cathedralyard');
const list = [{ ...l, x: l.x + ox, z: l.z + oz }]; // as the game has it (world metres)
const F = YARD.f, S = [-F[1], F[0]];
const on = (a, s) => [YARD.x + F[0] * a + S[0] * s, YARD.z + F[1] * a + S[1] * s];
const at = (a, s) => yardY(list, ...on(a, s));
const { a0, a1, w, n } = YARD.stairs;

test('the cathedral yard: up on its terrace, the street below at 0', () => {
  assert.equal(at(0, 9), YARD.h, 'beside the church');
  assert.equal(at(a0 - 1, 0), YARD.h, 'in front of the bell tower');
  assert.equal(at(YARD.cut + 3, 0), 0, 'Myeongdong-gil');
  assert.equal(yardY(list, YARD.x + 300, YARD.z), 0, 'far off');
  // The church, the board, its trees and the door are up on it.
  for (const t of ['cathedral', 'sign', 'shrinetrees']) assert.equal(district.landmarks.find((q) => q.type === t).y, YARD.h, t);
  assert.equal(yardY(list, ...DOOR.at), YARD.h, 'the door');
  const store = read('../public/regions/another-seoul/stores.json').stores.find((s) => s.id === DOOR.id);
  assert.equal(store.y, YARD.h, 'the door ring is drawn on the yard');
  const stamp = STAMPS.find((s) => s.id === 'myeongdong-cathedral');
  if (stamp?.place) assert.equal(yardY(list, ...stamp.place.at), YARD.h, 'the stamp stand stands on the yard');
});

test('the stairs: a smooth slope (no jolt each step), flat yard beside the first hedges', () => {
  // Yozi 2026-11-11: the yard is flat beside the first three hedges (1.2 m
  // apart, from the old top at 21.4 m), and going up does not jolt.
  assert.ok(a0 >= 21.4 + 0.5 + 2 * 1.2, `the stairs start at ${a0}`); // (past the third)
  const slope = YARD.h / (a1 - a0);
  assert.ok(slope < 0.8, `not steeper than about 39 degrees (${slope})`);
  assert.ok((a1 - a0) / n >= 0.28 && n >= 12, 'the painted steps are people-sized');
  let prev = YARD.h;
  for (let a = a0 - 0.5; a <= YARD.cut; a += 0.02) {
    const y = at(a, 0);
    assert.ok(y <= prev + 1e-9, `going up at ${a}`);
    assert.ok(prev - y <= slope * 0.021, `a step of ${prev - y} at ${a}`);
    prev = y;
  }
  assert.equal(at(a1 + 0.1, 0), 0);
  assert.ok(w >= 4, 'wide enough for a few people side by side');
});

test('west of the stairs the bank and ramp rise smoothly to the yard', () => {
  // No sudden step anywhere on the bank (walls aside): neighbours 0.25 m apart.
  for (let a = YARD.ramp.r0 - 2; a <= YARD.cut; a += 0.25) {
    for (let s = -w / 2 - 0.01; s > -16; s -= 0.25) {
      const y = yardHeightAt(YARD, a, s), ya = yardHeightAt(YARD, a + 0.25, s), ys = yardHeightAt(YARD, a, s - 0.25);
      assert.ok(Math.abs(y - ya) < 0.2 && Math.abs(y - ys) < 0.2, `a jump at ${a}, ${s}`);
    }
  }
  assert.ok(at(YARD.cut - 0.1, YARD.ramp.side) < 0.1, 'the ramp starts at the street');
  assert.ok(at(YARD.ramp.r0, YARD.ramp.side) > YARD.h - 0.01, 'and reaches the yard');
});

test('the terrace walls: the yard can only be reached up the stairs or the ramp', () => {
  const walls = district.blockers.map((b) => ({ p: b.p.map(([x, z]) => [x + ox, z + oz]) }));
  assert.ok(district.blockers.every((b) => b.low), 'walls the camera may look over');
  const col = new CollisionMap(walls);
  assert.ok(!col.blocked(...on(a1 - 2, 0), 0.35), 'the stairs are open');
  assert.ok(!col.blocked(...on(YARD.cut - 1, YARD.ramp.side), 0.35), 'the ramp is open');
  // From the street east of the stairs, walking straight up hits the wall.
  let hit = false;
  for (let a = YARD.cut + 2; a > a0 && !hit; a -= 0.1) hit = col.blocked(...on(a, w / 2 + 3), 0.35);
  assert.ok(hit, 'a wall between the street and the terrace east of the stairs');
});
