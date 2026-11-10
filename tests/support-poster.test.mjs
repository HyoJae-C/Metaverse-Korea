import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSupportSpots, SUPPORT_TEXT } from '../src/core/support-poster.js';
import { LANGUAGES } from '../src/i18n/strings.js';

test('one support spot per district, nearest the hub', () => {
  const sp = (id, d, x, z) => ({ id, b: { d }, front: { x, z } });
  const spots = [sp('L-01', 'a', 50, 0), sp('L-02', 'a', 10, 0), sp('L-03', 'b', 300, 0), sp('L-04', 'b', 120, 0), sp('L-05', 'c', 0, 0)];
  const got = pickSupportSpots(spots, { a: { x: 0, z: 0 }, b: { x: 100, z: 0 } });
  assert.deepEqual(Object.keys(got).sort(), ['a', 'b']);
  assert.equal(got.a.id, 'L-02');
  assert.equal(got.b.id, 'L-04');
});

test('busy spots are skipped', () => {
  const spots = [{ id: 'L-01', b: { d: 'a' }, front: { x: 1, z: 0 } }, { id: 'L-02', b: { d: 'a' }, front: { x: 9, z: 0 } }];
  const got = pickSupportSpots(spots, { a: { x: 0, z: 0 } }, (s) => s.id !== 'L-01');
  assert.equal(got.a.id, 'L-02');
});

test('poster text has English and every listed language except zh-Hant (falls back to zh)', () => {
  for (const [k, names] of Object.entries(SUPPORT_TEXT)) {
    for (const { code } of LANGUAGES) {
      if (code === 'zht') continue;
      assert.ok(names[code], `${k} missing ${code}`);
    }
  }
});
