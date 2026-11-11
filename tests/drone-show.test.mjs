import { test } from 'node:test';
import assert from 'node:assert/strict';
import { droneShowAt, nextDroneShow, nightAt, SHOW_SECONDS, SKY, BARGE } from '../src/core/drone-show.js';
import { fireworksAt } from '../src/core/fireworks-show.js';
import { CYCLE_MS, NIGHT_FROM, SHOW_FROM, cycleNumber, cycleMs } from '../src/core/show-clock.js';
import { WATER } from '../src/core/duck-boat.js';
import { program, SHAPE_NAMES, useShow, PHOTO_TIME, LAST_LINE_SECONDS } from '../src/core/drone-sky.js';
import { PIC_W, PIC_H } from '../src/core/drone-pictures.js';
import * as show from '../src/core/drone-show.js';
import { STAMPS } from '../src/data/stamps.js';
import { STAND_TIMES } from '../src/core/stamp-stands.js';

const MIN = 60e3;
// A drone show's start: drone shows are on the odd cycles.
const N = (cycleNumber(Date.UTC(2026, 10, 9)) & ~1) + 1;
const DRONE = (k = 0) => (N + 2 * k) * CYCLE_MS + SHOW_FROM;
const at = (min, k = 0) => DRONE(k) + min * MIN; // minutes from a show's start

test('a 20-minute show every other night, taking turns with the Yeouido fireworks', () => {
  assert.equal(SHOW_SECONDS, 1200);
  assert.equal(CYCLE_MS, 180 * MIN);
  const s = droneShowAt(at(5));
  assert.equal(s.start, DRONE());
  assert.equal(Math.round(s.t), 300);
  assert.equal(s.night, 1);
  assert.ok(s.on);
  // in the game's night: 10 minutes after nightfall
  assert.equal(cycleMs(s.start), NIGHT_FROM + 10 * MIN);
  // the night in between: the fireworks
  assert.equal(droneShowAt(DRONE() + CYCLE_MS + 5 * MIN), null);
  assert.equal(fireworksAt(DRONE() + CYCLE_MS + 5 * MIN).start, DRONE() + CYCLE_MS);
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

test('the next show: six hours later, four a day', () => {
  assert.equal(nextDroneShow(at(5)), DRONE(1));
  assert.equal(nextDroneShow(at(-60)), DRONE());
  assert.equal(DRONE(1) - DRONE(), 360 * MIN);
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
  const order = ['MODU/SEOUL', '모 두/서 울', 'K O R E A', '안녕하세요', 'HELLO', '라면', '먹고갈래?', '뚝섬에서', '사 랑', '행 복', '그리고 . . .', '너 ♡'];
  let at = -1;
  for (const w of order) { const i = words.indexOf(w); assert.ok(i > at, w); at = i; }
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i].at > steps[i - 1].at, 'steps in time order');
  assert.ok(steps.at(-1).at === SHOW_SECONDS && steps.at(-1).land);
  assert.ok(steps.some((s) => s.photo && s.at === PHOTO_TIME[0]));
  assert.equal(PHOTO_TIME[1] - PHOTO_TIME[0], 45, 'the photo pause keeps its 45 s');
  assert.ok(LAST_LINE_SECONDS >= 12 && LAST_LINE_SECONDS <= 40, `the next show's time stays ${LAST_LINE_SECONDS} s`);
  // the third act changes from show to show
  const acts = new Set([0, 1, 2].map((k) => JSON.stringify(program(DRONE(k)).find((s) => s.act3).lines)));
  assert.ok(acts.size > 1);
});

test('pictures and lines change about twice as often as the first shows', () => {
  useShow(show);
  const shown = program(DRONE()).filter((s) => s.at >= 0 && s.at < SHOW_SECONDS);
  assert.ok(shown.length >= 75, `${shown.length} pictures and lines`);
  const gaps = shown.slice(1).map((s, i) => s.at - shown[i].at).filter((g) => g > 6 && g !== 45);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  assert.ok(mean < 18, `${mean.toFixed(1)} s on average (was about 28)`);
});

test('every picture in the program is painted, on a canvas the size of the sky', () => {
  useShow(show);
  for (const s of program(DRONE())) if (s.shape) assert.ok(SHAPE_NAMES.includes(s.shape), s.shape);
  assert.equal(PIC_W, SKY.w);
  assert.ok(PIC_H <= SKY.h);
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
