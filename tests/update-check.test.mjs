import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewBuild, startUpdateCheck } from '../src/core/update-check.js';

test('a different deployed id means a new build', () => {
  assert.equal(isNewBuild('abc', 'abc'), false);
  assert.equal(isNewBuild('abc', 'def'), true);
  assert.equal(isNewBuild('abc', null), false, 'offline');
  assert.equal(isNewBuild('dev', 'def'), false, 'never in development');
});

const fakeDoc = () => {
  const fns = [];
  return { hidden: false, addEventListener: (_, f) => fns.push(f), removeEventListener() {}, fire: () => fns.forEach((f) => f()) };
};

test('onNew fires once when the deployed build changes', async () => {
  let remote = 'abc', calls = 0;
  const doc = fakeDoc();
  const stop = startUpdateCheck({ current: 'abc', fetchVersion: async () => remote, onNew: () => calls++, interval: 5, doc });
  await new Promise((r) => setTimeout(r, 25));
  assert.equal(calls, 0);
  remote = 'def';
  await new Promise((r) => setTimeout(r, 25));
  doc.fire();
  await new Promise((r) => setTimeout(r, 10));
  stop();
  assert.equal(calls, 1);
});

test('coming back to the tab checks at once; dev builds never check', async () => {
  let fetched = 0;
  const doc = fakeDoc();
  const stop = startUpdateCheck({ current: 'abc', fetchVersion: async () => { fetched++; return 'abc'; }, onNew() {}, interval: 1e9, doc });
  doc.fire();
  await new Promise((r) => setTimeout(r, 5));
  stop();
  assert.equal(fetched, 1);
  let devFetched = 0;
  startUpdateCheck({ current: 'dev', fetchVersion: async () => { devFetched++; }, onNew() {}, interval: 1, doc: fakeDoc() })();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(devFetched, 0);
});

test('a missing game file after a deploy offers the refresh banner once', async () => {
  const { watchMissingFiles } = await import('../src/core/update-check.js');
  const fns = [];
  const win = { addEventListener: (n, f) => n === 'vite:preloadError' && fns.push(f), removeEventListener() {} };
  let remote = 'abc', calls = 0;
  watchMissingFiles({ current: 'abc', fetchVersion: async () => remote, onNew: () => calls++, win });
  await fns[0]();
  assert.equal(calls, 0, 'same build (a dropped connection): no banner');
  remote = 'def';
  await fns[0]();
  await fns[0]();
  assert.equal(calls, 1);
});
