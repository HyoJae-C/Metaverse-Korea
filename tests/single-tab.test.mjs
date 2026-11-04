import test from 'node:test';
import assert from 'node:assert/strict';
import { claimTab } from '../src/core/single-tab.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('the newest tab takes over and older tabs step aside once', async () => {
  const channel = 'test-single-tab-' + Math.random();
  const parked = [];
  claimTab(() => parked.push('a'), { channel });
  claimTab(() => parked.push('b'), { channel });
  await wait(50);
  assert.deepEqual(parked, ['a']);
  const releaseC = claimTab(() => parked.push('c'), { channel });
  await wait(50);
  releaseC(); // close the newest tab's channel so the process can exit
  assert.deepEqual(parked, ['a', 'b']); // a already stepped aside; only b hears c
});

test('no BroadcastChannel: nothing happens', () => {
  const release = claimTab(() => assert.fail('should not park'), { Channel: null });
  assert.equal(typeof release, 'function');
});
