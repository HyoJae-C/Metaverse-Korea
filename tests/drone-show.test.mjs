import { test } from 'node:test';
import assert from 'node:assert/strict';
import { droneShowAt, nextDroneShow, nightAt, SHOW_SECONDS, SKY, BARGE } from '../src/core/drone-show.js';
import { fireworksAt } from '../src/core/fireworks-show.js';
import { CYCLE_MS, NIGHT_FROM, SHOW_FROM, cycleNumber, cycleMs } from '../src/core/show-clock.js';
import { WATER } from '../src/core/duck-boat.js';
import { program, shapePoints, SHAPE_NAMES, useShow, PHOTO_TIME } from '../src/core/drone-sky.js';
import * as show from '../src/core/drone-show.js';
import { STAMPS } from '../src/data/stamps.js';
import { STAND_TIMES } from '../src/core/stamp-stands.js';

const MIN = 60e3;
// A drone show's start: drone shows are on the cycles numbered 2 mod 4.
const N = (cycleNumber(Date.UTC(2026, 10, 9)) & ~3) + 2;
const DRONE = (k = 0) => (N + 4 * k) * CYCLE_MS + SHOW_FROM;
const at = (min, k = 0) => DRONE(k) + min * MIN; // minutes from a show's start

test('a 20-minute show one night in four, taking turns with the Yeouido fireworks', () => {
  assert.equal(SHOW_SECONDS, 1200);
  assert.equal(CYCLE_MS, 120 * MIN);
  const s = droneShowAt(at(5));
  assert.equal(s.start, DRONE());
  assert.equal(Math.round(s.t), 300);
  assert.equal(s.night, 1);
  assert.ok(s.on);
  // in the game's night: 10 minutes after nightfall
  assert.equal(cycleMs(s.start), NIGHT_FROM + 10 * MIN);
  // the nights in between: quiet, then the fireworks, then quiet
  for (const k of [1, 3]) assert.ok(!droneShowAt(DRONE() + k * CYCLE_MS + 5 * MIN) && !fireworksAt(DRONE() + k * CYCLE_MS + 5 * MIN));
  assert.equal(droneShowAt(DRONE() + 2 * CYCLE_MS + 5 * MIN), null);
  assert.equal(fireworksAt(DRONE() + 2 * CYCLE_MS + 5 * MIN).start, DRONE() + 2 * CYCLE_MS);
});

test('night only around the show: dark from 1 minute before to the landing', () => {
  assert.equal(droneShowAt(at(-30)), null); // half an hour before
  const soon = droneShowAt(at(-8)); // the notice window
  assert.ok(soon && soon.night === 0 && !soon.on);
  assert.ok(droneShowAt(at(-2)).night > 0 && droneShowAt(at(-2)).night < 1);
  assert.equal(nightAt(-60), 1);
  assert.equal(nightAt(SHOW_SECONDS + 60), 1);
  assert.equal(nightAt(SHOW_SECONDS + 180), 0);
  assert.equal(droneShowAt(at(24)), null);
  assert.equal(droneShowAt(at(-1, 1)).start, DRONE(1)); // the next one
});

test('the next show: eight hours later, three a day', () => {
  assert.equal(nextDroneShow(at(5)), DRONE(1));
  assert.equal(nextDroneShow(at(-60)), DRONE());
  assert.equal(DRONE(1) - DRONE(), 480 * MIN);
});

test('the drones fly in front of the bridge, past where the duck boats go', () => {
  assert.ok(BARGE.z + BARGE.d / 2 < WATER.minZ - 1, 'barge clear of the boats');
  assert.ok(SKY.z > -74 + 5, 'in front of the bridge');
  assert.ok(SKY.y - SKY.h / 2 > 5, 'above the water and the bridge deck');
});

test('the program: Yozi\'s lines, in order, inside the show', () => {
  useShow(show);
  const steps = program(DRONE());
  const words = steps.filter((s) => s.lines).map((s) => s.lines.map((l) => (Array.isArray(l) ? l.join('') : l)).join('/'));
  const order = ['ANOTHER/SEOUL', '어 나 더/서 울', 'K O R E A', '라면', '먹고갈래?', '뚝섬에서', '사 랑', '행 복', '그리고 . . .', '너 ♡'];
  let at = -1;
  for (const w of order) { const i = words.indexOf(w); assert.ok(i > at, w); at = i; }
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i].at > steps[i - 1].at, 'steps in time order');
  assert.ok(steps.at(-1).at === SHOW_SECONDS && steps.at(-1).land);
  assert.ok(steps.some((s) => s.photo && s.at === PHOTO_TIME[0]));
  // the third act changes from show to show
  const acts = new Set([0, 1, 2].map((k) => JSON.stringify(program(DRONE(k)).find((s) => s.at === 750).lines)));
  assert.ok(acts.size > 1);
});

test('every line drawing fits the sky over an upright phone', () => {
  for (const name of SHAPE_NAMES) {
    const pts = shapePoints(name, 400);
    assert.equal(pts.length, 400, name);
    for (const [u, v] of pts) {
      assert.ok(Number.isFinite(u) && Number.isFinite(v), name);
      assert.ok(Math.abs(u) <= SKY.w / 2 + 2 && Math.abs(v) <= SKY.h / 2 + 0.5, `${name} ${u.toFixed(1)},${v.toFixed(1)}`);
    }
  }
});

test('the drone show stamp: on the Ttukseom park lawn, only while the drones are up', () => {
  const s = STAMPS.find((x) => x.id === 'drone-show');
  assert.ok(Array.isArray(s.place.at) && !s.place.room, 'on the street (tests/stamp-book.test.mjs: on the lawn)');
  assert.equal(s.onlyDuring, 'droneShow');
  assert.equal(STAND_TIMES.droneShow(at(5)), true);
  assert.equal(STAND_TIMES.droneShow(at(-30)), false);
  assert.equal(STAND_TIMES.droneShow(at(-2)), true); // lift-off counts
});

test('every show gets its own number', () => {
  const n = [0, 1, 2].map((k) => show.showNumber(DRONE(k)));
  assert.deepEqual([n[1] - n[0], n[2] - n[1]], [1, 1]);
});
