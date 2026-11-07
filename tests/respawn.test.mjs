import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveLastSpot, loadLastSpot, usableSpot, saveLastPlace, loadLastPlace, MAX_AGE_DAYS } from '../src/core/respawn.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const B = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
const free = () => false;

test('saves and loads the last spot', () => {
  const st = memory();
  saveLastSpot(12.345, -7.8, 1.234, st, 1000);
  assert.deepEqual(loadLastSpot(st), { x: 12.3, z: -7.8, ry: 1.23, t: 1000 });
  saveLastSpot(NaN, 0, 0, st, 2000);
  assert.equal(loadLastSpot(st).t, 1000); // bad values aren't saved
});

test('only a fresh, open spot on the map is used', () => {
  const now = 10 * 86400000;
  const s = { x: 1, z: 2, ry: 0, t: now - 1000 };
  assert.ok(usableSpot(s, B, free, now));
  assert.ok(!usableSpot({ ...s, x: 500 }, B, free, now));
  assert.ok(!usableSpot(s, B, () => true, now)); // inside a building
  assert.ok(!usableSpot({ ...s, t: now - (MAX_AGE_DAYS + 1) * 86400000 }, B, free, now));
  assert.ok(!usableSpot(null, B, free, now));
  assert.ok(!usableSpot({ x: '1', z: 2, ry: 0, t: now }, B, free, now));
});

test('the last district is shown only while the saved spot is fresh', () => {
  const st = memory();
  assert.equal(loadLastPlace(st, 1000), null); // first visit: nothing saved
  saveLastPlace('bukchon', st);
  assert.equal(loadLastPlace(st, 1000), null); // no spot yet
  saveLastSpot(1, 2, 0, st, 1000);
  assert.equal(loadLastPlace(st, 2000), 'bukchon');
  assert.equal(loadLastPlace(st, 1000 + (MAX_AGE_DAYS + 1) * 86400000), null);
  saveLastPlace('', st);
  assert.equal(loadLastPlace(st, 2000), 'bukchon'); // empty ids aren't saved
});
