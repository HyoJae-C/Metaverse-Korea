import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { checkSend, parseAmount, sendCap, MEMOS } = await import('../src/core/bank.js');
const { BANK_TEXT, whyText } = await import('../src/ui/bank-ui.js');
const { CloudSave } = await import('../src/core/cloud-save.js');

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('what the form checks before asking the server', () => {
  const base = { to: 'Mina', n: 5000, balance: 20000, min: 1000, max: 500000, me: 'Yozi' };
  assert.equal(checkSend(base), null);
  assert.equal(checkSend({ ...base, to: '  ' }), 'name');
  assert.equal(checkSend({ ...base, to: 'yo zi' }), 'self', 'same name, any case or spaces');
  assert.equal(checkSend({ ...base, n: 999 }), 'amount');
  assert.equal(checkSend({ ...base, n: 500001 }), 'amount');
  assert.equal(checkSend({ ...base, n: NaN }), 'amount');
  assert.equal(checkSend({ ...base, n: 30000 }), 'poor');
});

test('the amount box takes commas, ₩ and spaces', () => {
  assert.equal(parseAmount('12,000'), 12000);
  assert.equal(parseAmount(' ₩5000 '), 5000);
  assert.ok(Number.isNaN(parseAmount('5k')));
  assert.ok(Number.isNaN(parseAmount('-500')));
  assert.ok(Number.isNaN(parseAmount('')));
});

function cloudWith(answers, user = { id: 'u1' }) {
  const c = Object.create(CloudSave.prototype);
  c.user = user;
  c.calls = [];
  c.client = { rpc: async (fn, args) => { c.calls.push([fn, args]); return answers[fn] ?? { error: { code: 'PGRST202' } }; } };
  return c;
}

test('closed ("coming soon") unless the server says this account may send', async () => {
  assert.equal((await cloudWith({}).bankStatus()).open, false, 'SQL not run yet');
  assert.equal((await cloudWith({}, null).bankStatus()).open, false, 'not signed in');
  assert.equal((await cloudWith({ bank_status: { data: { status: 'ok', open: false, min: 1000, max: 500000 } } }).bankStatus()).open, false);
  assert.equal((await cloudWith({ bank_status: { data: { status: 'ok', open: 'yes' } } }).bankStatus()).open, false, 'only a real true opens it');
  const before077 = await cloudWith({ bank_status: { data: { status: 'ok', open: true, min: 1000, max: 500000 } } }).bankStatus();
  assert.equal(before077.open, true);
  assert.equal(before077.max, 500000);
  assert.equal(before077.ready, true, 'before 077: no rules');
  assert.equal(before077.left, null);
  assert.equal(before077.keep, 0);
  const st = await cloudWith({ bank_status: { data: { status: 'ok', open: true, min: 1000, max: 250000, op: false, ready: false, days: 3, missions: 12, min_days: 7, min_missions: 35, keep: 1000000, day_max: 250000, left: 50000, friends_only: true } } }).bankStatus();
  assert.deepEqual(st, { open: true, min: 1000, max: 250000, op: false, ready: false, days: 3, missions: 12, minDays: 7, minMissions: 35, keep: 1000000, dayMax: 250000, left: 50000, friendsOnly: true });
});

test('sending asks the server once, and news of money sent to me', async () => {
  assert.equal((await cloudWith({}).bankSend({ op: 'x', to: 'Mina', n: 1000, memo: 'thanks' })).status, 'offline');
  const c = cloudWith({ bank_send: { data: { status: 'ok', coins: 9000, ver: 3, name: 'Mina', n: 1000 } } });
  assert.equal((await c.bankSend({ op: 'id1', to: 'Mina with a long name', n: 1000.4, memo: 'coffee' })).status, 'ok');
  assert.deepEqual(c.calls[0], ['bank_send', { p_op: 'id1', p_to: 'Mina with a long', p_n: 1000, p_memo: 'coffee' }]);
  const r = await cloudWith({ bank_news: { data: { status: 'ok', coins: 6000, ver: 9, items: [{ name: 'Op', n: 5000, memo: 'trip' }, { name: 'x', n: 0 }] } } }).bankNews();
  assert.deepEqual(r, { items: [{ name: 'Op', n: 5000, memo: 'trip' }], coins: 6000, ver: 9 });
  assert.equal(await cloudWith({}).bankNews(), null);
});

test('the server only lets operators send, and moves both wallets in one go', () => {
  const sql = read('supabase/028_bank.sql');
  assert.match(sql, /bank_open boolean not null default false/);
  assert.match(sql, /if not \(coalesce\(s\.bank_open, false\) or exists \(select 1 from public\.operators/);
  assert.match(sql, /order by user_id for update/);
  for (const m of MEMOS) assert.ok(sql.includes(`'${m}'`), m);
  assert.match(sql, /revoke all on public\.bank_transfers from anon, authenticated/);
});

test('Seoul Bank stands in Euljiro, and the teller speaks every language', () => {
  const stores = JSON.parse(read('public/regions/another-seoul/stores.json')).stores;
  const banks = stores.filter((s) => s.workshop === 'bank');
  assert.equal(banks.length, 1);
  assert.equal(banks[0].name.ko, '서울은행');
  assert.equal(banks[0].district, 'euljiro');
  assert.equal(BANK_TEXT.soon.ko, '🚧 준비중입니다');
  const langs = ['en', 'ko', 'ja', 'zh', 'es', 'ar', 'vi', 'fr', 'th', 'id'];
  const walk = (o, path) => {
    if (o.en) { for (const l of langs) assert.ok(o[l], `${path} ${l}`); return; }
    for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  };
  walk(BANK_TEXT, 'BANK_TEXT');
});

test('side-account rules: keep 1,000,000 and send 250,000 a day at most (077)', () => {
  const base = { to: 'Mina', n: 200000, balance: 1300000, min: 1000, max: 250000, me: 'Yozi', keep: 1000000, left: 250000 };
  assert.equal(checkSend(base), null);
  assert.equal(checkSend({ ...base, n: 250001 }), 'amount', 'over one transfer');
  assert.equal(checkSend({ ...base, balance: 1150000 }), 'keep', 'would leave 950,000');
  assert.equal(checkSend({ ...base, balance: 1200000 }), null, 'leaves exactly 1,000,000');
  assert.equal(checkSend({ ...base, left: 100000 }), 'daylimit');
  assert.equal(checkSend({ ...base, balance: 5000000, keep: 0, left: null, n: 250000 }), null, 'operators: no keep, no daily limit');
  assert.equal(sendCap({ balance: 1150000, max: 250000, keep: 1000000, left: 250000 }), 150000);
  assert.equal(sendCap({ balance: 3000000, max: 250000, keep: 1000000, left: 40000 }), 40000);
  assert.equal(sendCap({ balance: 900000, max: 250000, keep: 1000000, left: 250000 }), 0);
  assert.equal(sendCap({ balance: 9000000, max: 250000 }), 250000);
});

test('the bank says why, with the numbers', () => {
  globalThis.localStorage = { getItem: () => 'en', setItem: () => {}, removeItem: () => {} };
  for (const k of ['young', 'keep', 'daylimit', 'notfriend']) assert.ok(BANK_TEXT.why[k]?.ko, k);
  const t = whyText('young', { days: 3, missions: 12, minDays: 7, minMissions: 35 });
  assert.ok(t.includes('7') && t.includes('35') && t.includes('12'), t);
  assert.ok(!whyText('keep', { keep: 1000000, cap: 150000 }).includes('{'));
  assert.ok(!whyText('daylimit', { dayMax: 250000, left: 0 }).includes('{'));
});

test('the server checks the side-account rules, not just the form (077)', () => {
  const sql = read('supabase/077_bank_rules.sql');
  assert.match(sql, /bank_keep bigint not null default 1000000/);
  assert.match(sql, /bank_day_max bigint not null default 250000/);
  assert.match(sql, /bank_friends_only boolean not null default true/);
  assert.match(sql, /not v_op and not public\.gift_ready\(uid\)/, '7 days + 35 missions, same as gifts');
  assert.match(sql, /not public\.are_friends\(uid, v_to\)/);
  assert.match(sql, /w\.coins - p_n < s\.bank_keep/);
  assert.match(sql, /bank_sent_today\(uid\) \+ p_n > s\.bank_day_max/);
  assert.match(sql, /at time zone 'Asia\/Seoul'/, 'a Korean day');
  // The rules are checked after the sender's wallet is locked, so two sends at once can't both fit.
  assert.ok(sql.indexOf('for update') < sql.indexOf('bank_sent_today(uid) + p_n'));
});
