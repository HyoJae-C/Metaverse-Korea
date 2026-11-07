import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const { fishCode, forceNextCatch, pendingCatch } = await import('../src/core/fish-luck.js');
const { rollCatch, escapeChance, drainFor, fishById, TRASH } = await import('../src/core/fishing.js');
const hash = (s) => createHash('sha256').update(s).digest('hex');

test('a fishing code is matched by its hash only', async () => {
  const codes = { [hash('test-whale')]: 'whale' };
  assert.equal(await fishCode('test-whale', codes), 'whale');
  assert.equal(await fishCode('  test-whale ', codes), 'whale');
  assert.equal(await fishCode('test-whal', codes), null);
  assert.equal(await fishCode('anything'), null);
});

test('the set-up fish is the next bite once, and is sure to be caught', () => {
  forceNextCatch('whale');
  assert.equal(pendingCatch(), 'whale');
  const f = rollCatch(() => 0); // 0 would be the old boot
  assert.equal(f.id, 'whale');
  assert.equal(f.sure, true);
  assert.equal(escapeChance(f, 0), 0);
  assert.equal(drainFor(f), 0);
  assert.equal(pendingCatch(), null);
  assert.equal(rollCatch(() => 0), TRASH); // back to normal
  assert.ok(drainFor(fishById('whale')) > 0);
  assert.ok(escapeChance(fishById('whale'), 0) > 0);
  forceNextCatch('no-such-fish');
  assert.equal(rollCatch(() => 0), TRASH);
});
