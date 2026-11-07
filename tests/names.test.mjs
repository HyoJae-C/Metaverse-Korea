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

test('an empty name becomes the next numbered default name (여행자100, 여행자101, …)', async () => {
  const { isDefaultName, defaultNamePrefix, localDefaultName } = await import('../src/core/identity.js');
  assert.ok(isDefaultName(''));
  assert.ok(isDefaultName(' 여행자 '));
  assert.ok(isDefaultName('TRAVELER'));
  assert.ok(!isDefaultName('여행자100'));
  assert.ok(!isDefaultName('Mina'));
  assert.equal(defaultNamePrefix('여행자'), '여행자');
  assert.equal(defaultNamePrefix('Traveler'), 'Traveler');
  assert.equal(defaultNamePrefix('مسافر'), 'Traveler'); // not Hangul or Latin
  assert.equal(defaultNamePrefix('Lữ khách'), 'Traveler');
  assert.equal(localDefaultName('여행자', () => 0), '여행자100');

  const cs = new CloudSave(null);
  assert.equal(await cs.claimDefaultName('여행자'), null); // no Supabase
  let next = 100;
  cs.user = { id: 'me' };
  cs.client = { rpc: async (fn, { prefix }) => {
    assert.equal(fn, 'claim_default_name');
    return { data: prefix + next++ };
  } };
  assert.equal(await cs.claimDefaultName('여행자'), '여행자100');
  assert.equal(await cs.claimDefaultName('여행자'), '여행자101');
  cs.client = { rpc: async () => ({ error: { message: 'function claim_default_name does not exist' } }) };
  assert.equal(await cs.claimDefaultName('여행자'), null); // the SQL isn't set up yet
});
