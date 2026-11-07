import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryFromTimeZone, guessCountry, kstDay, reportCountryOnce, UNKNOWN } from '../src/core/country.js';

test('time zones map to countries, old alias names too', () => {
  assert.equal(countryFromTimeZone('Asia/Seoul'), 'KR');
  assert.equal(countryFromTimeZone('America/New_York'), 'US');
  assert.equal(countryFromTimeZone('Asia/Tokyo'), 'JP');
  assert.equal(countryFromTimeZone('Asia/Kolkata'), 'IN');
  assert.equal(countryFromTimeZone('Asia/Calcutta'), 'IN');
  assert.equal(countryFromTimeZone('Asia/Saigon'), 'VN');
  assert.equal(countryFromTimeZone('Europe/Vaduz'), 'LI');
});

test('UTC, empty and made-up names are unknown', () => {
  for (const tz of ['Etc/UTC', 'UTC', '', 'Mars/Olympus', undefined, null, 5]) assert.equal(countryFromTimeZone(tz), UNKNOWN);
  assert.deepEqual(guessCountry('Asia/Seoul'), { country: 'KR', source: 'tz' });
});

test('the day is counted in Korean time', () => {
  assert.equal(kstDay(Date.parse('2026-11-07T14:59:00Z')), '2026-11-07');
  assert.equal(kstDay(Date.parse('2026-11-07T15:00:00Z')), '2026-11-08');
});

test('reports once per account per Korean day', async () => {
  const m = new Map();
  const storage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  const sent = [];
  const send = async (g) => { sent.push(g); return true; };
  const now = Date.parse('2026-11-07T03:00:00Z');
  assert.equal(await reportCountryOnce({ uid: 'a', send, storage, now, tz: 'Asia/Tokyo' }), true);
  assert.equal(await reportCountryOnce({ uid: 'a', send, storage, now: now + 3600e3, tz: 'Asia/Tokyo' }), false);
  assert.equal(await reportCountryOnce({ uid: 'b', send, storage, now, tz: 'Asia/Tokyo' }), true);
  assert.equal(await reportCountryOnce({ uid: 'b', send, storage, now: now + 86400e3, tz: 'Asia/Tokyo' }), true);
  assert.deepEqual(sent.map((g) => g.country), ['JP', 'JP', 'JP']);
  assert.equal([...m.keys()].some((k) => k.startsWith('mk.')), false);
});

test('a failed send is tried again next time', async () => {
  const m = new Map();
  const storage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  let ok = false;
  const send = async () => ok;
  assert.equal(await reportCountryOnce({ uid: 'a', send, storage, tz: 'Asia/Seoul' }), false);
  ok = true;
  assert.equal(await reportCountryOnce({ uid: 'a', send, storage, tz: 'Asia/Seoul' }), true);
});
