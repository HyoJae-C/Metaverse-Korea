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
  let remote = 'abc', calls = 0, broken = 0;
  watchMissingFiles({ current: 'abc', fetchVersion: async () => remote, onNew: () => calls++, onBroken: () => broken++, win });
  await fns[0]();
  await fns[0]();
  assert.equal(calls, 0, 'same build (a dropped connection): no new-version banner');
  assert.equal(broken, 1, 'but one "part did not load, refresh" banner');
  remote = 'def';
  await fns[0]();
  await fns[0]();
  assert.equal(calls, 1);
});

test('offline when the file fails: the refresh banner for the broken part', async () => {
  const { watchMissingFiles } = await import('../src/core/update-check.js');
  const fns = [];
  const win = { addEventListener: (_, f) => fns.push(f), removeEventListener() {} };
  let broken = 0;
  watchMissingFiles({ current: 'abc', fetchVersion: async () => { throw new Error('offline'); }, onNew() {}, onBroken: () => broken++, win });
  await fns[0]();
  assert.equal(broken, 1);
});

test('the browsers\' words for a game file that did not download', async () => {
  const { isMissingFileError } = await import('../src/core/update-check.js');
  assert.ok(isMissingFileError('promise: Importing a module script failed.'), 'Safari');
  assert.ok(isMissingFileError('promise: Failed to fetch dynamically imported module: https://x/assets/a.js'), 'Chrome');
  assert.ok(isMissingFileError('promise: error loading dynamically imported module: https://x/assets/a.js'), 'Firefox');
  assert.ok(!isMissingFileError('promise: x is not a function'));
});
