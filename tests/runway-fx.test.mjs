import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERFECT_FX, pickPerfect, pickWord, wordColor, WORDS, tierOf, runwayMsg, parseRunwayMsg, wobbleAt, WOBBLE_S } from '../src/core/runway-fx.js';
import { PHOTO_POSES, pickPoses, poseKind, poseAt, POSE_S } from '../src/core/runway-poses.js';
import { POSES } from '../src/core/runway-game.js';
import { LANGUAGES } from '../src/i18n/strings.js';
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

test("Yozi's nineteen words, each in every language and its own colour", () => {
  const ko = ['섹시', '큐트', '도도', '자신감', '매력적', '쿨', '매혹적', '러블리', '스위트', '펑키', '존재감', '독특한', '우아하게', '기품있는', '자유롭게', '신비롭게', '발랄', '깜찍', '당당하게'];
  assert.deepEqual(Object.values(WORDS).map((w) => w.ko.replace('!', '')).sort(), ko.slice().sort());
  const langs = LANGUAGES.map((l) => l.code).filter((c) => c !== 'zht'); // (繁體 is made from 简体)
  for (const w of Object.values(WORDS)) for (const lang of langs) assert.ok(w[lang], lang);
  const colours = Object.keys(WORDS).map(wordColor);
  assert.equal(new Set(colours).size, colours.length);
  for (const c of colours) assert.match(c, /^#[0-9a-f]{6}$/);
  const seen = new Set();
  const n = Object.keys(WORDS).length;
  for (let i = 0; i < n; i++) seen.add(pickWord(() => i / n));
  assert.equal(seen.size, n);
  assert.ok(WORDS[pickWord(() => 0.9999)]);
});

test('each walk picks three different poses from a varied pool', () => {
  assert.ok(PHOTO_POSES.length >= 10);
  for (const id of PHOTO_POSES) assert.ok(poseKind(id), id);
  assert.equal(poseKind('nope'), null);
  for (const r of [0, 0.3, 0.7, 0.9999]) {
    const p = pickPoses(POSES.length, () => r);
    assert.equal(p.length, POSES.length);
    assert.equal(new Set(p).size, p.length);
  }
  const seen = new Set();
  for (let i = 0; i < 200; i++) for (const p of pickPoses()) seen.add(p);
  assert.equal(seen.size, PHOTO_POSES.length);
});

test('held poses ease in, hold for the cameras and let go', () => {
  for (const id of PHOTO_POSES.filter((p) => poseKind(p) === 'moves')) {
    const start = poseAt(id, 0), held = poseAt(id, POSE_S / 2);
    assert.ok(held && Object.keys(held).length >= 2, id);
    for (const r of Object.values(start)) for (const v of r) assert.ok(Math.abs(v) < 1e-9);
    for (const r of Object.values(held)) for (const v of r) assert.ok(Number.isFinite(v) && Math.abs(v) <= 3.2);
    assert.equal(poseAt(id, POSE_S), null);
    assert.equal(poseAt(id, -0.1), null);
  }
  assert.equal(poseAt('wave', 0.5), null); // (an emote clip)
});

test('messages round-trip and junk is ignored', () => {
  assert.deepEqual(parseRunwayMsg(runwayMsg('p', 'chic', 'heart')), { tier: 'p', word: 'chic', pose: 'heart' });
  assert.deepEqual(parseRunwayMsg(runwayMsg('g', 'bold')), { tier: 'g', word: 'bold', pose: null });
  assert.deepEqual(parseRunwayMsg(runwayMsg('m')), { tier: 'm', word: null, pose: null });
  assert.deepEqual(parseRunwayMsg('rw:p:chic'), { tier: 'p', word: 'chic', pose: null }); // (from an older version)
  assert.deepEqual(parseRunwayMsg('rw:g:nope:nope'), { tier: 'g', word: null, pose: null });
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
