import test from 'node:test';
import assert from 'node:assert/strict';
import { createReentry, REENTRY_MS } from '../src/core/subway.js';

test('out by mistake: back in at the same station within 5 minutes is free', () => {
  const r = createReentry();
  r.in(0, 0); // paid
  assert.equal(r.out(0, 1000), true);
  assert.ok(r.left(0, 1000 + REENTRY_MS - 1) > 0);
  assert.equal(r.in(0, 2000, true), true);
});

test('the free pass ends after 5 minutes and only works where you left', () => {
  const r = createReentry();
  r.in(0, 0);
  r.out(2, 0); // rode to station 2 and went out there
  assert.equal(r.left(0, 1), 0);
  assert.equal(r.left(2, REENTRY_MS), 0);
  assert.equal(r.in(2, REENTRY_MS, true), false);
});

test('one free way back in per fare: no chaining, no second use', () => {
  const r = createReentry();
  r.in(1, 0);
  r.out(1, 0);
  assert.equal(r.in(1, 10, true), true);
  assert.equal(r.in(1, 20, true), false); // used up
  assert.equal(r.out(1, 30), false); // a free trip earns nothing
  assert.equal(r.left(1, 40), 0);
});

test('going out without a paid trip earns nothing, and paying again replaces the old pass', () => {
  const r = createReentry();
  assert.equal(r.out(0, 0), false);
  r.in(0, 0); r.out(0, 0);
  r.in(3, 10); // paid somewhere else meanwhile
  assert.equal(r.out(3, 20), true);
  assert.equal(r.left(0, 30), 0);
  assert.ok(r.left(3, 30) > 0);
});
