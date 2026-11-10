import { test } from 'node:test';
import assert from 'node:assert/strict';
import { droneShowAt, nextDroneShow, nightAt, DRONE_SHOW_HOURS_KST, SHOW_SECONDS, SKY, BARGE } from '../src/core/drone-show.js';
import { WATER } from '../src/core/duck-boat.js';
import { program, shapePoints, SHAPE_NAMES, useShow, PHOTO_TIME } from '../src/core/drone-sky.js';
import * as show from '../src/core/drone-show.js';
import { STAMPS } from '../src/data/stamps.js';
import { STAND_TIMES } from '../src/core/stamp-stands.js';

const KST = (h, m = 0, d = 9) => Date.UTC(2026, 10, d, h - 9, m); // a time on Korean time, 2026-11-d

test('two 20-minute shows a day, 3 hours apart from the Yeouido fireworks', () => {
  assert.deepEqual(DRONE_SHOW_HOURS_KST, [6, 18]);
  for (const h of DRONE_SHOW_HOURS_KST) for (const f of [9, 21]) assert.ok(Math.abs(h - f) % 24 >= 3);
  assert.equal(SHOW_SECONDS, 1200);
  const s = droneShowAt(KST(18, 5));
  assert.equal(s.start, KST(18));
  assert.equal(Math.round(s.t), 300);
  assert.equal(s.night, 1);
  assert.ok(s.on);
});

test('night only around the show: dark from 1 minute before to the landing, day otherwise', () => {
  assert.equal(droneShowAt(KST(17, 30)), null); // half an hour before
  const soon = droneShowAt(KST(17, 52)); // 8 minutes before: the notice window, still day
  assert.ok(soon && soon.night === 0 && !soon.on);
  assert.ok(droneShowAt(KST(17, 58)).night > 0 && droneShowAt(KST(17, 58)).night < 1);
  assert.equal(nightAt(-60), 1);
  assert.equal(nightAt(SHOW_SECONDS + 60), 1);
  assert.equal(nightAt(SHOW_SECONDS + 180), 0);
  assert.equal(droneShowAt(KST(18, 24)), null);
  // the morning show, the next day
  assert.equal(droneShowAt(KST(5, 59, 10)).start, KST(6, 0, 10));
  assert.equal(droneShowAt(KST(6, 10, 10)).start, KST(6, 0, 10));
  assert.equal(droneShowAt(KST(0, 0, 10)), null, 'no show at midnight any more');
});

test('the next show', () => {
  assert.equal(nextDroneShow(KST(18, 5)), KST(6, 0, 10));
  assert.equal(nextDroneShow(KST(7)), KST(18));
});

test('the drones fly in front of the bridge, past where the duck boats go', () => {
  assert.ok(BARGE.z + BARGE.d / 2 < WATER.minZ - 1, 'barge clear of the boats');
  assert.ok(SKY.z > -74 + 5, 'in front of the bridge');
  assert.ok(SKY.y - SKY.h / 2 > 5, 'above the water and the bridge deck');
});

test('the program: Yozi\'s lines, in order, inside the show', () => {
  useShow(show);
  const steps = program(KST(18));
  const words = steps.filter((s) => s.lines).map((s) => s.lines.map((l) => (Array.isArray(l) ? l.join('') : l)).join('/'));
  const order = ['ANOTHER/SEOUL', '어 나 더/서 울', 'K O R E A', '라면', '먹고갈래?', '뚝섬에서', '사 랑', '행 복', '그리고 . . .', '너 ♡'];
  let at = -1;
  for (const w of order) { const i = words.indexOf(w); assert.ok(i > at, w); at = i; }
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i].at > steps[i - 1].at, 'steps in time order');
  assert.ok(steps.at(-1).at === SHOW_SECONDS && steps.at(-1).land);
  assert.ok(steps.some((s) => s.photo && s.at === PHOTO_TIME[0]));
  // the third act changes from show to show
  const acts = new Set([[6, 10], [18, 10], [6, 11]].map(([h, d]) => JSON.stringify(program(KST(h, 0, d)).find((s) => s.at === 750).lines)));
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
  assert.equal(STAND_TIMES.droneShow(KST(18, 5)), true);
  assert.equal(STAND_TIMES.droneShow(KST(17, 30)), false);
  assert.equal(STAND_TIMES.droneShow(KST(17, 58)), true); // lift-off counts
});

test('operators can set the show times; bad lists keep the default', () => {
  assert.deepEqual(show.checkShowTimes([1080, 360]), { minutes: [360, 1080] });
  assert.equal(show.checkShowTimes([]).error, 'empty');
  assert.equal(show.checkShowTimes([1, 100, 200, 300, 400]).error, 'many');
  assert.equal(show.checkShowTimes([1440]).error, 'bad');
  assert.equal(show.checkShowTimes([600, 640]).error, 'close');
  assert.equal(show.checkShowTimes([20, 1420]).error, 'close', 'across midnight too');
  try {
    show.setDroneShowTimes([1170]); // 19:30
    assert.equal(droneShowAt(KST(18, 5)), null, 'no 18:00 show any more');
    assert.equal(droneShowAt(KST(19, 35)).start, KST(19, 30));
    assert.equal(nextDroneShow(KST(19, 40)), KST(19, 30, 10));
    assert.equal(STAND_TIMES.droneShow(KST(19, 35)), true);
    show.setDroneShowTimes([10, 20]); // too close: ignored
    assert.deepEqual(show.droneShowHours(), DRONE_SHOW_HOURS_KST);
  } finally {
    show.setDroneShowTimes(null);
  }
  assert.equal(droneShowAt(KST(18, 5)).start, KST(18));
});

test('every show of the day gets its own number, even at uneven times', () => {
  const hours = [6, 6.5 + 1, 18];
  const n = [KST(6), KST(7, 30), KST(18), KST(6, 0, 10)].map((s) => show.showNumber(s, hours));
  assert.deepEqual(n.slice(1).map((x, i) => x - n[i]), [1, 1, 1]);
});
