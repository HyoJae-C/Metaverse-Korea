import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
const { CloudSave } = await import('../src/core/cloud-save.js');
const { Wallet } = await import('../src/core/wallet.js');

// A CloudSave signed in, with rpc answering from `answers`.
function cloudWith(answers) {
  const c = Object.create(CloudSave.prototype);
  c.user = { id: 'u1' };
  c.calls = [];
  c.client = { rpc: async (fn, args) => { c.calls.push([fn, args]); return answers[fn] ?? { error: { code: 'PGRST202' } }; } };
  return c;
}

test('naming the friend: the server decides, the game only passes the answer on', async () => {
  for (const st of ['ok', 'nobody', 'self', 'done', 'late']) {
    assert.equal(await cloudWith({ claim_referral: { data: { status: st } } }).claimReferral('Mina'), st);
  }
  assert.equal(await cloudWith({ claim_referral: { data: { status: 'invalid' } } }).claimReferral('Mina'), 'offline');
  assert.equal(await cloudWith({}).claimReferral('Mina'), 'offline', 'SQL not run yet: let the player in');
  const c = cloudWith({ claim_referral: { data: { status: 'ok' } } });
  await c.claimReferral('A very long friend name');
  assert.deepEqual(c.calls[0], ['claim_referral', { friend_name: 'A very long frie' }]);
  const off = cloudWith({});
  off.user = null;
  assert.equal(await off.claimReferral('Mina'), 'offline');
});

test('news of friends who joined, and the wallet takes the server balance', async () => {
  const c = cloudWith({ referral_news: { data: { status: 'ok', coins: 31000, ver: 7, items: [{ name: 'Newbie', n: 15000 }, { name: '', n: 15000 }, { name: 'x', n: 0 }] } } });
  const r = await c.referralNews();
  assert.deepEqual(r.items, [{ name: 'Newbie', n: 15000 }, { name: '', n: 15000 }]);
  assert.equal(await cloudWith({}).referralNews(), null);

  const w = new Wallet({ reward: 20, dailyLimit: 5, seconds: 0 });
  w.s = { uid: 'u1', u: 1, unit: 'krw', base: 1000, ver: 5, ads: 0, adsDay: '', queue: [{ id: 'q', n: -500, k: 'spend', w: 1 }] };
  w.credited(15000, r, { k: 'ledger.referral', v: { name: 'Newbie' } });
  assert.equal(w.coins, 30500, 'server balance plus what is still queued');
  assert.equal(w.log.at(-1).n, 15000);
  w.credited(15000, { coins: 1, ver: 2 }, null);
  assert.equal(w.coins, 30500, 'an older balance is ignored');
});

test('the server keeps the abuse rules', () => {
  const sql = readFileSync(new URL('../supabase/025_referrals.sql', import.meta.url), 'utf8');
  assert.match(sql, /user_id uuid primary key/, 'one invite per account');
  assert.match(sql, /referral_hours/, 'only a new account');
  assert.match(sql, /v_friend = uid then return jsonb_build_object\('status', 'self'\)/);
  assert.match(sql, /referral_day/);
  assert.match(sql, /referral_max/);
  assert.doesNotMatch(sql, /insert into public\.reward_rules/, 'wallet_apply must not pay referrals');
  assert.match(sql, /revoke all on function public\.claim_referral\(text\) from public, anon/);
});

test('a friend name the server could not take is sent again later', async () => {
  const { keepPending, retryPending } = await import('../src/game/referral-retry.js');
  const mem = {};
  const storage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  assert.equal(await retryPending({ cloud: cloudWith({}), storage }), null, 'nothing kept');
  keepPending(storage, 'Mina', 1000);
  assert.equal(await retryPending({ cloud: cloudWith({}), storage, now: 2000 }), 'offline');
  assert.ok(mem['mk.refPending'], 'still offline: kept for next time');
  const c = cloudWith({ claim_referral: { data: { status: 'ok' } } });
  assert.equal(await retryPending({ cloud: c, storage, now: 3000 }), 'ok');
  assert.deepEqual(c.calls[0], ['claim_referral', { friend_name: 'Mina' }]);
  assert.equal(mem['mk.refPending'], undefined, 'answered: dropped');
  keepPending(storage, 'Mina', 0);
  assert.equal(await retryPending({ cloud: c, storage, now: 25 * 3600 * 1000 }), null, 'older than a day: dropped');
  assert.equal(mem['mk.refPending'], undefined);
});
