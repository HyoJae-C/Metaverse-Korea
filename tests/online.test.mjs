import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pollOnline, watchOnline } from '../src/net/online.js';

const fakeDoc = () => {
  const ls = new Set();
  return { hidden: false, addEventListener: (_, f) => ls.add(f), removeEventListener: (_, f) => ls.delete(f), fire() { for (const f of ls) f(); }, ls };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('the server count is shown, never below 1 (you are here)', async () => {
  const seen = [];
  const answers = [2, 0, 3];
  const doc = fakeDoc();
  const stop = await pollOnline(async () => answers.shift() ?? 3, (n) => seen.push(n), { every: 5, doc });
  await wait(30);
  stop();
  assert.deepEqual(seen.slice(0, 3), [2, 1, 3]);
  assert.equal(doc.ls.size, 0);
});

test('SQL not run yet: falls back (returns null without counting)', async () => {
  const seen = [];
  const stop = await pollOnline(async () => 'missing', (n) => seen.push(n), { doc: fakeDoc() });
  assert.equal(stop, null);
  assert.deepEqual(seen, []);
  // and watchOnline then has nothing else to count with outside supabase
  assert.equal(await watchOnline('local', null, 'x', () => {}, { fetchCount: async () => 'missing' }), null);
});

test('a hidden tab skips the request and asks again when shown', async () => {
  let calls = 0;
  const doc = fakeDoc();
  const stop = await pollOnline(async () => { calls++; return 2; }, () => {}, { every: 5, doc });
  doc.hidden = true;
  const before = calls;
  await wait(30);
  assert.equal(calls, before);
  doc.hidden = false;
  doc.fire();
  await wait(1);
  assert.ok(calls > before);
  stop();
});

test('a passing error keeps polling', async () => {
  const seen = [];
  const answers = [2, null, 4];
  const stop = await pollOnline(async () => { const a = answers.shift(); if (a === undefined) throw new Error('x'); return a; }, (n) => seen.push(n), { every: 5, doc: fakeDoc() });
  await wait(30);
  stop();
  assert.deepEqual(seen, [2, 4]);
});
