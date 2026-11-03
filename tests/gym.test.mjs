import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boostFor, GymLog, MAX_BOOST, markerAt, zoneFor, inZone, EXERCISES } from '../src/core/gym.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('each workout adds 0.01% speed, capped at +1%', () => {
  assert.equal(boostFor(0), 1);
  assert.ok(Math.abs(boostFor(1) - 1.0001) < 1e-12);
  assert.ok(Math.abs(boostFor(100) - 1.01) < 1e-12);
  assert.equal(boostFor(1e6), 1 + MAX_BOOST);
});

test('sets are counted and remembered', () => {
  const st = memory();
  const g = new GymLog(st);
  g.finishSet('bench'); g.finishSet('bench'); g.finishSet('pushup');
  const again = new GymLog(st);
  assert.equal(again.workouts, 3);
  assert.equal(again.byKind.bench, 2);
});

test('timing marker sweeps and the zone narrows', () => {
  for (let t = 0; t < 5; t += 0.07) { const x = markerAt(t); assert.ok(x >= 0 && x <= 1); }
  const [a0, b0] = zoneFor(0, 10), [a1, b1] = zoneFor(9, 10);
  assert.ok(b1 - a1 < b0 - a0);
  assert.ok(inZone(0.5, zoneFor(9, 10)) && !inZone(0.05, zoneFor(0, 10)));
  assert.equal(Object.keys(EXERCISES).length, 5);
});
