import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMasterCode, redeemCode, parseTandem, tandemMsg, ITEMS } from '../src/core/inventory.js';

// Developer codes are kept out of the repository (only their hashes are in
// the code), so the tests only check that unknown codes unlock nothing.
test('unknown developer codes unlock nothing', async () => {
  assert.equal(await isMasterCode('nope'), false);
  assert.equal(await redeemCode('nope'), null);
  assert.equal(await redeemCode('EVENTSTART1'), null);
  assert.ok(Object.keys(ITEMS).length > 0);
});

test('tandem messages round-trip and reject junk', () => {
  assert.deepEqual(parseTandem(tandemMsg('invite', 'abc-123')), { verb: 'invite', target: 'abc-123', seat: 0 });
  assert.deepEqual(parseTandem(tandemMsg('join', 'abc', 3)), { verb: 'join', target: 'abc', seat: 3 });
  assert.equal(parseTandem('tandem:hack:abc'), null);
  assert.equal(parseTandem('tandem:join:<script>'), null);
  assert.equal(parseTandem('wave'), null);
});
