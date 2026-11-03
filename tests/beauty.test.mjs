import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SALON, CLINIC, beautyCost } from '../src/core/beauty.js';
import { sanitizeLook, PALETTES } from '../src/data/appearance.js';

test('you pay for each change; going back to your own is free', () => {
  assert.equal(beautyCost(SALON, {}, { dye: 'pink' }), 30);
  assert.equal(beautyCost(SALON, { dye: 'pink' }, { dye: 'pink' }), 0);
  assert.equal(beautyCost(SALON, { dye: 'pink' }, { dye: null }), 0);
  assert.equal(beautyCost(CLINIC, {}, { eyes: 'blue', tone: 'tan', small: true }), 105);
  assert.equal(beautyCost(CLINIC, { small: true }, { small: false }), 0);
});

test('looks keep valid salon and clinic choices and drop the rest', () => {
  const ok = sanitizeLook({ dye: 'mint', eyes: 'green', tone: 'deep', small: true });
  assert.deepEqual([ok.dye, ok.eyes, ok.tone, ok.small], ['mint', 'green', 'deep', true]);
  const bad = sanitizeLook({ dye: 'toString', eyes: '#fff', tone: 1, small: 'yes' });
  assert.deepEqual([bad.dye, bad.eyes, bad.tone, bad.small], [null, null, null, false]);
  for (const o of [...SALON, ...CLINIC]) if (o.palette) assert.ok(PALETTES[o.palette]);
});
