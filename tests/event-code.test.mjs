import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
const { eventCode, isEventCode, coinCode } = await import('../src/core/inventory.js');

test('event codes look like ./CODE and ignore letter case', async () => {
  assert.equal(isEventCode('./EVENTSTART1'), true);
  assert.equal(isEventCode('/EVENTSTART1'), false);
  assert.equal(isEventCode('hello ./EVENTSTART1'), false);
  assert.deepEqual(await eventCode('./EVENTSTART1'), { id: 'eventstart1', coins: 100 });
  assert.deepEqual(await eventCode('./eventstart1'), { id: 'eventstart1', coins: 100 });
  assert.equal(await eventCode('./NOPE'), null);
});

test('event codes are not developer codes and the other way round', async () => {
  assert.equal(await coinCode('EVENTSTART1'), 0);
  assert.equal(await eventCode('./nope-123'), null);
});
