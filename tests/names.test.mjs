import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CloudSave } from '../src/core/cloud-save.js';

test('a name is checked on the server: ok, taken, or go ahead when it cannot be asked', async () => {
  const cs = new CloudSave(null);
  assert.equal(await cs.claimName('Mina'), 'offline'); // no Supabase
  const used = new Map([['mina', 'someone-else']]);
  cs.user = { id: 'me' };
  cs.client = { rpc: async (fn, { new_name }) => {
    assert.equal(fn, 'claim_name');
    const k = new_name.toLowerCase().replace(/\s+/g, '');
    if (used.has(k) && used.get(k) !== 'me') return { data: 'taken' };
    used.set(k, 'me');
    return { data: 'ok' };
  } };
  assert.equal(await cs.claimName('MI NA'), 'taken');
  assert.equal(await cs.claimName('Jun'), 'ok');
  cs.client = { rpc: async () => ({ error: { message: 'function claim_name does not exist' } }) };
  assert.equal(await cs.claimName('Jun'), 'offline'); // the SQL isn't set up yet
});
