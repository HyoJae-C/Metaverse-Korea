import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMasterCode, parseTandem, tandemMsg } from '../src/core/inventory.js';

test('master code is checked by hash', async () => {
  assert.equal(await isMasterCode('seongsu-dev-2026'), true);
  assert.equal(await isMasterCode(' seongsu-dev-2026 '), true);
  assert.equal(await isMasterCode('seongsu-dev-2025'), false);
});

test('tandem messages round-trip and reject junk', () => {
  assert.deepEqual(parseTandem(tandemMsg('invite', 'abc-123')), { verb: 'invite', target: 'abc-123' });
  assert.equal(parseTandem('tandem:hack:abc'), null);
  assert.equal(parseTandem('tandem:join:<script>'), null);
  assert.equal(parseTandem('wave'), null);
});
