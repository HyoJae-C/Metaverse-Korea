import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lazyPanel } from '../src/core/lazy-panel.js';

class FakeUI {
  constructor() { this.hidden = true; this.shown = []; }
  get open() { return !this.hidden; }
  show(x) { this.hidden = false; this.shown.push(x); return 'shown'; }
  close() { this.hidden = true; }
}

test('closed and inert until first used, then loads once and forwards', async () => {
  let loads = 0;
  const p = lazyPanel(async () => { loads++; return new FakeUI(); });
  assert.equal(p.open, false);
  p.close(); // no load for a close
  assert.equal(loads, 0);
  assert.equal(p.loaded, false);
  await Promise.all([p.show('a'), p.show('b')]);
  assert.equal(loads, 1);
  assert.equal(p.loaded, true);
  assert.equal(p.open, true);
  assert.deepEqual(p.shown, ['a', 'b']);
  p.close();
  assert.equal(p.open, false);
  assert.equal(p.show('c'), 'shown'); // loaded: calls go straight through
});

test('is not mistaken for a promise, and retries after a failed load', async () => {
  let fail = true;
  const p = lazyPanel(async () => { if (fail) throw new Error('offline'); return new FakeUI(); });
  assert.equal(p.then, undefined);
  const orig = console.warn; console.warn = () => {};
  await p.show('x'); // swallowed
  console.warn = orig;
  assert.equal(p.loaded, false);
  fail = false;
  await p.show('y');
  assert.deepEqual(p.shown, ['y']);
});

test('idle values stand in for properties until it has loaded', async () => {
  const p = lazyPanel(async () => ({ walking: true, game: { n: 1 }, show() {} }), { walking: false, game: null });
  assert.equal(p.walking, false);
  assert.equal(p.game, null);
  await p.ready();
  assert.equal(p.walking, true);
  assert.deepEqual(p.game, { n: 1 });
});
