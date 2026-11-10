import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
const { eventCode, isEventCode, coinCode } = await import('../src/core/inventory.js');

test('event codes look like ./CODE and ignore letter case', async () => {
  assert.equal(isEventCode('./EVENTSTART1'), true);
  assert.equal(isEventCode('/EVENTSTART1'), false);
  assert.equal(isEventCode('hello ./EVENTSTART1'), false);
  assert.deepEqual(await eventCode('./EVENTSTART1'), { id: 'eventstart1', coins: 100000 });
  assert.deepEqual(await eventCode('./eventstart1'), { id: 'eventstart1', coins: 100000 });
  assert.equal(await eventCode('./NOPE'), null);
});

test('event codes are not developer codes and the other way round', async () => {
  assert.equal(await coinCode('EVENTSTART1'), 0);
  assert.equal(await eventCode('./nope-123'), null);
});

test('coin codes: a known word plus a number gives that many coins', async () => {
  const { coinsFor, COIN_CODE_MAX } = await import('../src/core/inventory.js');
  const { createHash } = await import('node:crypto');
  const words = new Set([createHash('sha256').update('testword').digest('hex')]); // a stand-in, not a real code
  assert.equal(await coinsFor('testword1000', words), 1000);
  assert.equal(await coinsFor('testword25', words), 25);
  assert.equal(await coinsFor('TestWord7', words), 7); // case ignored
  assert.equal(await coinsFor('testword0', words), 0);
  assert.equal(await coinsFor('testword', words), 0);
  assert.equal(await coinsFor('otherword1000', words), 0);
  assert.equal(await coinsFor('testword99999999999', words), COIN_CODE_MAX);
});
