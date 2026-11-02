import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMasterCode, redeemCode, parseTandem, tandemMsg, ITEMS } from '../src/core/inventory.js';

test('master code is checked by hash', async () => {
  assert.equal(await isMasterCode('seongsu-dev-2026'), true);
  assert.equal(await isMasterCode(' seongsu-dev-2026 '), true);
  assert.equal(await isMasterCode('seongsu-dev-2025'), false);
  assert.deepEqual(await redeemCode('seongsu-dev-2026'), Object.keys(ITEMS));
  assert.deepEqual(await redeemCode('seongsu-car-2026'), ['car']);
  assert.equal(await redeemCode('nope'), null);
});

test('tandem messages round-trip and reject junk', () => {
  assert.deepEqual(parseTandem(tandemMsg('invite', 'abc-123')), { verb: 'invite', target: 'abc-123', seat: 0 });
  assert.deepEqual(parseTandem(tandemMsg('join', 'abc', 3)), { verb: 'join', target: 'abc', seat: 3 });
  assert.equal(parseTandem('tandem:hack:abc'), null);
  assert.equal(parseTandem('tandem:join:<script>'), null);
  assert.equal(parseTandem('wave'), null);
});
