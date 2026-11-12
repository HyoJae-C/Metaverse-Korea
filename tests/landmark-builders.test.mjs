// The landmark builders must all be there however the bundle orders the
// files. palace-model.js (and bukchon-models.js) import landmarks.js back;
// when one of them runs first, its table isn't filled in while landmarks.js
// loads. Gwanghwamun, the palace gates and the Bukchon models went missing
// that way on 2026-11-12. So this file loads palace-model.js first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { PALACE_BUILD } = await import('../src/core/palace-model.js');
const { BUKCHON_BUILD } = await import('../src/core/bukchon-models.js');
const { landmarkBuilders } = await import('../src/core/landmarks.js');

test('palace and Bukchon builders are there even when palace-model.js loads first', () => {
  const b = landmarkBuilders();
  for (const k of Object.keys(PALACE_BUILD)) assert.equal(typeof b[k], 'function', k);
  for (const k of Object.keys(BUKCHON_BUILD)) assert.equal(typeof b[k], 'function', k);
  for (const k of ['gwanghwamun', 'palacegate', 'throne', 'yeongjegyo', 'cloister', 'palacehalls']) assert.ok(b[k], k);
});

test('every palace landmark on the Gyeongbokgung map has a builder', () => {
  const dir = new URL('../public/regions/another-seoul/districts/', import.meta.url);
  const g = JSON.parse(readFileSync(new URL('gyeongbokgung.json', dir)));
  const b = landmarkBuilders();
  for (const l of g.landmarks) if (l.gb) assert.ok(b[l.type] || ['wall', 'blossoms'].includes(l.type), l.type);
});
