import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { YOGA_FLOW, YOGA_POSES, STUDIO_EX, classPose, POSE_SECONDS, driftStep, nudge, inBalance, holdStep, breathAt, goodRep, INSTRUCTOR_LINES, nextInstructorLine, SWAY } from '../src/core/studio.js';
import { STUDIO_MOVES } from '../src/core/studio-moves.js';
import { GymLog } from '../src/core/gym.js';

const LANGS = ['en', 'ko', 'ja', 'zh'];

test('yoga flow: six poses, each named and cued in every language, each with a pose to show', () => {
  assert.equal(YOGA_FLOW.length, 6);
  for (const p of YOGA_FLOW) {
    for (const l of LANGS) assert.ok(p.name[l] && p.cue[l], `${p.id}.${l}`);
    assert.equal(typeof STUDIO_MOVES[p.id], 'function', p.id);
    assert.ok(SWAY[p.id] > 0, p.id);
  }
  for (const k of ['reformer', 'bench']) assert.equal(typeof STUDIO_MOVES[k], 'function', k);
  for (const ex of Object.values(STUDIO_EX)) for (const l of LANGS) assert.ok(ex.name[l]);
});

test('every pose gives finite bone offsets at any time', () => {
  for (const [name, fn] of Object.entries(STUDIO_MOVES)) {
    for (let t = 0; t < 12; t += 0.37) {
      const m = fn(t);
      for (const [k, v] of Object.entries(m)) {
        if (Array.isArray(v)) assert.ok(v.length === 3 && v.every(Number.isFinite), `${name}.${k}`);
        else if (typeof v === 'number') assert.ok(Number.isFinite(v), `${name}.${k}`);
      }
    }
  }
  assert.ok(STUDIO_MOVES.bench(0).bar >= 0 && STUDIO_MOVES.bench(0.9).bar <= 1, 'the bench press moves the bar');
});

test('the class moves through the flow together, in order', () => {
  assert.equal(classPose(0), YOGA_POSES[0]);
  assert.equal(classPose(POSE_SECONDS + 0.1), YOGA_POSES[1]);
  assert.equal(classPose(POSE_SECONDS * YOGA_POSES.length), YOGA_POSES[0]);
});

test('balance drifts but stays on the bar; nudges push it back', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const st = { x: 0.5, v: 0 };
  let outside = 0;
  for (let i = 0; i < 600; i++) { driftStep(st, 1 / 30, 1.4, rand); assert.ok(st.x >= 0 && st.x <= 1); if (!inBalance(st.x)) outside++; }
  assert.ok(outside > 0, 'left alone it wobbles out of the zone');
  const s2 = { x: 0.2, v: 0 };
  nudge(s2, 1);
  for (let i = 0; i < 15; i++) driftStep(s2, 1 / 30, 0, rand);
  assert.ok(s2.x > 0.2, 'a nudge to the right moves it right');
  assert.equal(holdStep(0, true, 0.5), 0.5);
  assert.equal(holdStep(0.2, false, 1), 0);
});

test('reformer: breathe in, then push on the out-breath; most of a breath right counts', () => {
  const p = STUDIO_EX.reformer.period;
  assert.deepEqual([breathAt(0, p).push, breathAt(p * 0.25, p).push, breathAt(p * 0.75, p).push], [false, false, true]);
  assert.equal(breathAt(p * 2.1, p).cycle, 2);
  assert.ok(goodRep(0.8, 1) && !goodRep(0.5, 1) && !goodRep(0, 0));
});

test('a yoga flow or a reformer set counts as a workout', () => {
  const m = new Map();
  const g = new GymLog({ getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) });
  g.finishSet('yoga'); g.finishSet('reformer');
  assert.equal(g.workouts, 2);
  assert.equal(g.byKind.yoga, 1);
});

test('the instructor never says the same thing twice in a row', () => {
  let last = -1;
  for (let i = 0; i < 200; i++) { const n = nextInstructorLine(last); assert.notEqual(n, last); assert.ok(n >= 0 && n < INSTRUCTOR_LINES.length); last = n; }
  for (const l of INSTRUCTOR_LINES) assert.equal(l.length, 3);
});

test('the studio stands in Hongdae by the gym, on the street', () => {
  const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
  const s = stores.find((x) => x.id === 'sum-yoga'), gym = stores.find((x) => x.id === 'muscle-gym');
  assert.ok(s && s.workshop === 'yoga' && s.category === 'play');
  assert.ok(Math.hypot(s.at[0] - gym.at[0], s.at[1] - gym.at[1]) < 30, 'next to the gym');
  for (const l of LANGS) assert.ok(s.name[l] && s.tagline[l]);
});
