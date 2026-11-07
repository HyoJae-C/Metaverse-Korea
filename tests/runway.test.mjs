import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEAD_BEATS, STEP_BEATS, POSES, SHOW_BEATS, runwayChart, bestPoints, judgeTap, runwayScore, walkAt } from '../src/core/runway-game.js';

const BPM = 112, beat = 60 / BPM;

test('the chart: a step a beat after the count-in, then the poses', () => {
  const notes = runwayChart(BPM);
  assert.equal(notes.filter((n) => n.kind === 'step').length, STEP_BEATS);
  assert.deepEqual(notes.filter((n) => n.kind === 'pose').map((n) => n.i), POSES.map((_, i) => i));
  assert.ok(Math.abs(notes[0].t - LEAD_BEATS * beat) < 1e-9);
  for (let i = 1; i < notes.length; i++) assert.ok(notes[i].t > notes[i - 1].t, 'in time order');
  assert.ok(notes.at(-1).t < SHOW_BEATS * beat, 'the last pose comes before the walk back ends');
});

test('poses count double; a perfect show scores 100', () => {
  const notes = runwayChart(BPM);
  assert.equal(bestPoints(notes), STEP_BEATS * 3 + POSES.length * 6);
  const hit = notes.map(() => false);
  let points = 0;
  for (const n of notes) {
    const j = judgeTap(notes, hit, n.t);
    hit[j.index] = j.label;
    points += j.points;
  }
  assert.equal(runwayScore(points, notes), 100);
  const pose = notes.findIndex((n) => n.kind === 'pose');
  assert.equal(judgeTap(notes, notes.map(() => false), notes[pose].t).points, 6);
});

test('a tap far from any note is not judged', () => {
  const notes = runwayChart(BPM);
  assert.equal(judgeTap(notes, notes.map(() => false), 0), null);
});

test('walking: backstage, down the runway, poses at the end, back again', () => {
  assert.equal(walkAt(0, BPM).phase, 'wait');
  const half = walkAt((LEAD_BEATS + STEP_BEATS / 2) * beat, BPM);
  assert.equal(half.phase, 'walk');
  assert.ok(Math.abs(half.along - 0.5) < 1e-9);
  const notes = runwayChart(BPM);
  for (const n of notes.filter((q) => q.kind === 'pose')) {
    const w = walkAt(n.t, BPM);
    assert.equal(w.phase, 'pose');
    assert.equal(w.along, 1);
    assert.equal(w.pose, n.i);
  }
  const back = walkAt((SHOW_BEATS - 0.01) * beat, BPM);
  assert.equal(back.phase, 'back');
  assert.ok(back.along < 0.05);
  assert.equal(walkAt(SHOW_BEATS * beat + 1, BPM).phase, 'done');
});
