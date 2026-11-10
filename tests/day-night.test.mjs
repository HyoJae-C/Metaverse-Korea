// Day and night follow the game's own two-hour day (core/show-clock.js,
// core/weather.js): 15 minutes of morning, 50 of day, 15 of sunset and 40 of
// night, the same for everyone wherever they live, with a show every night.
import test from 'node:test';
import assert from 'node:assert/strict';
import { daylight, darkness } from '../src/core/weather.js';
import { CYCLE_MS, NIGHT_FROM, SHOW_FROM, SKY_SUN, gameHour, cycleNumber } from '../src/core/show-clock.js';
import { fireworksAt } from '../src/core/fireworks-show.js';
import { droneShowAt } from '../src/core/drone-show.js';

const MIN = 60e3;
const C0 = cycleNumber(Date.UTC(2026, 10, 9)) * CYCLE_MS; // a cycle's start
const at = (m, k = 0) => C0 + k * CYCLE_MS + m * MIN; // m minutes into cycle k

test('a two-hour day: 15 morning, 50 day, 15 sunset, 40 night', () => {
  assert.equal(CYCLE_MS, 120 * MIN);
  assert.equal(NIGHT_FROM, 80 * MIN);
  assert.ok(Math.abs(gameHour(at(0)) - 5.3) < 1e-9); // the morning begins in the dark before sunrise
  assert.ok(Math.abs(gameHour(at(15)) - 8) < 1e-9);
  assert.ok(Math.abs(gameHour(at(65)) - 16.5) < 1e-9);
  assert.ok(Math.abs(gameHour(at(80)) - 18.7) < 1e-9);
  assert.ok(Math.abs(gameHour(at(119.99)) - 5.3) < 0.01);
  for (let m = 1; m < 240; m++) {
    const dh = ((gameHour(at(m)) - gameHour(at(m - 1)) + 24) % 24);
    assert.ok(dh > 0 && dh < 0.4, `the clock runs on smoothly at ${m}`);
  }
});

test('daylight: full day at noon, night at midnight, a dusk in between', () => {
  assert.equal(daylight(12, SKY_SUN), 1);
  assert.equal(daylight(0, SKY_SUN), 0);
  assert.equal(daylight(22, SKY_SUN), 0);
  const dusk = daylight(SKY_SUN.set, SKY_SUN);
  assert.ok(dusk > 0.2 && dusk < 0.8, String(dusk));
});

test('darkness: day in the day, real dark all night, light again in the morning', () => {
  assert.equal(darkness(at(40)), 0); // the day
  assert.ok(darkness(at(75)) > 0.1 && darkness(at(75)) < 0.9, 'the sunset darkens');
  for (let m = 80; m < 120; m += 2) assert.equal(darkness(at(m)), 1, `night at ${m}`);
  assert.ok(darkness(at(12)) === 0, 'day by the end of the morning');
});

test('every night has a show, fireworks and drones taking turns', () => {
  const shows = [0, 1, 2, 3].map((k) => {
    const t = C0 + k * CYCLE_MS + SHOW_FROM + 5 * MIN;
    assert.equal(darkness(t), 1, 'in the dark');
    return fireworksAt(t) ? 'fireworks' : droneShowAt(t) ? 'drones' : null;
  });
  assert.ok(shows.every(Boolean), shows.join());
  for (let i = 1; i < 4; i++) assert.notEqual(shows[i], shows[i - 1]);
  // both done before the morning
  assert.ok(SHOW_FROM + 23 * MIN < CYCLE_MS);
});
