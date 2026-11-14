import test from 'node:test';
import assert from 'node:assert/strict';
import { claimTab } from '../src/core/single-tab.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const opts = (channel, extra) => ({ channel, isHidden: () => false, answerMs: 80, ...extra });

test('the newest tab takes over and older tabs step aside once', async () => {
  const channel = 'test-single-tab-' + Math.random();
  const parked = [];
  const releaseA = claimTab(() => parked.push('a'), opts(channel));
  const releaseB = claimTab(() => parked.push('b'), opts(channel));
  await wait(150);
  assert.deepEqual(parked, ['a']);
  const releaseC = claimTab(() => parked.push('c'), opts(channel));
  await wait(150);
  [releaseA, releaseB, releaseC].forEach((r) => r());
  assert.deepEqual(parked, ['a', 'b']); // a already stepped aside; only b hears c
});

test('a claim from a tab that is gone (frozen, closed) is ignored', async () => {
  const channel = 'test-single-tab-' + Math.random();
  const parked = [];
  const releaseA = claimTab(() => parked.push('a'), opts(channel));
  // A page that posts its claim and then can't answer anymore.
  const ghost = new BroadcastChannel(channel);
  ghost.postMessage({ type: 'claim', from: 'ghost' });
  ghost.close();
  await wait(200);
  releaseA();
  assert.deepEqual(parked, []);
});

test('a tab that starts hidden steps aside for the live one', async () => {
  const channel = 'test-single-tab-' + Math.random();
  const parked = [];
  const releaseA = claimTab(() => parked.push('a'), opts(channel));
  const releaseB = claimTab(() => parked.push('b'), opts(channel, { isHidden: () => true }));
  await wait(200);
  releaseA(); releaseB();
  assert.deepEqual(parked, ['b']);
});

test('a hidden tab with nobody else around keeps the game', async () => {
  const channel = 'test-single-tab-' + Math.random();
  const parked = [];
  const releaseA = claimTab(() => parked.push('a'), opts(channel, { isHidden: () => true }));
  await wait(200);
  releaseA();
  assert.deepEqual(parked, []);
});

test('no BroadcastChannel: nothing happens', () => {
  const release = claimTab(() => assert.fail('should not park'), { Channel: null });
  assert.equal(typeof release, 'function');
});
