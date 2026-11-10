import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherAt, weatherSettings, seasonAt, rolledWeather, SEASON_ODDS, WEATHER_SLOT_MS } from '../src/core/weather.js';

const slots = (n, f) => Array.from({ length: n }, (_, i) => f(i * WEATHER_SLOT_MS + 1000));

test('every season\'s odds add up to one', () => {
  for (const [k, odds] of Object.entries(SEASON_ODDS)) assert.ok(Math.abs(odds.reduce((a, [, p]) => a + p, 0) - 1) < 1e-9, k);
});

test('no setting keeps the old weather', () => {
  for (const t of slots(50, (ms) => ms)) assert.equal(weatherAt(t, null), rolledWeather(t));
});

test('winter snows more than the default, summer never snows', () => {
  const count = (season, kind) => slots(2000, (ms) => weatherAt(ms, weatherSettings({ season }))).filter((k) => k === kind).length;
  assert.ok(count('winter', 'snow') > count('default', 'snow') * 2);
  assert.equal(count('summer', 'snow'), 0);
});

test('a held weather lasts until its end', () => {
  const s = weatherSettings({ season: 'summer', fixed: 'snow', from: new Date(1000).toISOString(), until: new Date(10 * 60000).toISOString() });
  assert.equal(weatherAt(5 * 60000, s), 'snow');
  assert.notEqual(weatherAt(10 * 60000, s), 'snow');
  const forever = weatherSettings({ season: 'default', fixed: 'rain', from: new Date(0).toISOString(), until: null });
  assert.equal(weatherAt(1e12, forever), 'rain');
});

test('bad settings fall back safely', () => {
  assert.deepEqual(weatherSettings({ season: 'monsoon', fixed: 'lava' }), { season: 'default', fixed: null, from: -Infinity, until: Infinity });
});

test('auto follows Seoul\'s calendar', () => {
  assert.equal(seasonAt(Date.UTC(2026, 0, 10)), 'winter');
  assert.equal(seasonAt(Date.UTC(2026, 3, 10)), 'spring');
  assert.equal(seasonAt(Date.UTC(2026, 6, 10)), 'summer');
  assert.equal(seasonAt(Date.UTC(2026, 9, 10)), 'autumn');
  assert.equal(seasonAt(Date.UTC(2026, 10, 30, 16)), 'winter'); // 1 December in Seoul
});
