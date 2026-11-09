// Day and night follow Seoul's clock (core/weather.js): night in the game
// when it's night in Seoul, with sunrise and sunset moving with the seasons.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seoulHour, sunTimes, daylight, darkness } from '../src/core/weather.js';

const kst = (y, mo, d, h, mi = 0) => Date.UTC(y, mo - 1, d, h - 9, mi);

test('seoulHour is the hour in Korea (UTC+9)', () => {
  assert.equal(seoulHour(kst(2026, 11, 9, 18, 30)), 18.5);
  assert.equal(seoulHour(kst(2026, 11, 10, 0, 0)), 0);
  assert.equal(seoulHour(Date.UTC(2026, 10, 9, 20, 0)), 5); // 20:00 UTC = 05:00 KST next day
});

test('sunrise and sunset move with the seasons, close to Seoul\'s', () => {
  const june = sunTimes(kst(2026, 6, 21, 12)), dec = sunTimes(kst(2026, 12, 21, 12)), nov = sunTimes(kst(2026, 11, 9, 12));
  // Seoul: about 05:11 / 19:57 in late June, 07:43 / 17:17 in late December.
  assert.ok(Math.abs(june.rise - 5.18) < 0.3 && Math.abs(june.set - 19.95) < 0.3, JSON.stringify(june));
  assert.ok(Math.abs(dec.rise - 7.72) < 0.3 && Math.abs(dec.set - 17.28) < 0.3, JSON.stringify(dec));
  // Early November: about 07:05 / 17:28.
  assert.ok(Math.abs(nov.rise - 7.08) < 0.5 && Math.abs(nov.set - 17.47) < 0.5, JSON.stringify(nov));
});

test('daylight: full day at noon, night at midnight, a dusk in between', () => {
  const sun = sunTimes(kst(2026, 11, 9, 12));
  assert.equal(daylight(12, sun), 1);
  assert.equal(daylight(0, sun), 0);
  assert.equal(daylight(22, sun), 0);
  const dusk = daylight(sun.set, sun);
  assert.ok(dusk > 0.2 && dusk < 0.8, String(dusk));
});

test('darkness: the shows in Seoul\'s evening are in the real dark', () => {
  assert.equal(darkness(kst(2026, 11, 9, 13)), 0); // the afternoon
  assert.equal(darkness(kst(2026, 11, 9, 18, 10)), 1); // the 18:00 drone show in November
  assert.equal(darkness(kst(2026, 11, 9, 21, 10)), 1); // the 21:00 fireworks
  assert.equal(darkness(kst(2026, 11, 9, 9, 10)), 0); // the 09:00 fireworks: Yeouido makes its own night
});
