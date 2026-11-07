import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERFECT_FX, pickPerfect, poseWord, WORDS, tierOf, runwayMsg, parseRunwayMsg, wobbleAt, WOBBLE_S } from '../src/core/runway-fx.js';
import { POSES } from '../src/core/runway-game.js';
import { cleanFx } from '../src/core/perfume.js';

test('three tiers: perfect, close (great or good), miss', () => {
  assert.equal(tierOf('perfect'), 'p');
  assert.equal(tierOf('great'), 'g');
  assert.equal(tierOf('good'), 'g');
  assert.equal(tierOf('miss'), 'm');
});

test('perfect effects are varied and valid perfume effects', () => {
  assert.ok(PERFECT_FX.length >= 5);
  for (const fx of PERFECT_FX) assert.deepEqual(cleanFx(fx), fx);
  const seen = new Set();
  for (let i = 0; i < PERFECT_FX.length; i++) seen.add(pickPerfect(() => i / PERFECT_FX.length));
  assert.equal(seen.size, PERFECT_FX.length);
  assert.ok(PERFECT_FX.includes(pickPerfect(() => 0.9999)));
});

test('every pose has a word in four languages', () => {
  for (const p of POSES) for (const r of [0, 0.5, 0.99]) {
    const w = poseWord(p, () => r);
    for (const lang of ['en', 'ko', 'ja', 'zh']) assert.ok(WORDS[w][lang]);
  }
  assert.equal(poseWord('wave'), 'cute');
  assert.ok(['chic', 'sexy'].includes(poseWord('turn')));
});

test('messages round-trip and junk is ignored', () => {
  assert.deepEqual(parseRunwayMsg(runwayMsg('p', 'chic')), { tier: 'p', word: 'chic' });
  assert.deepEqual(parseRunwayMsg(runwayMsg('m')), { tier: 'm', word: null });
  assert.deepEqual(parseRunwayMsg('rw:g:nope'), { tier: 'g', word: null });
  assert.equal(parseRunwayMsg('rw:x'), null);
  assert.equal(parseRunwayMsg('wave'), null);
  assert.equal(parseRunwayMsg(3), null);
});

test('the wobble leans and settles back upright', () => {
  assert.equal(wobbleAt(0), 0);
  assert.equal(wobbleAt(WOBBLE_S), 0);
  assert.equal(wobbleAt(-1), 0);
  let max = 0;
  for (let t = 0; t < WOBBLE_S; t += 0.01) max = Math.max(max, Math.abs(wobbleAt(t)));
  assert.ok(max > 0.15 && max < 0.4);
});
