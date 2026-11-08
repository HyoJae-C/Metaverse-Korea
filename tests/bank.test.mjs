import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { checkSend, parseAmount, MEMOS } = await import('../src/core/bank.js');
const { BANK_TEXT } = await import('../src/ui/bank-ui.js');
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
  assert.deepEqual(await cloudWith({ bank_status: { data: { status: 'ok', open: true, min: 1000, max: 500000 } } }).bankStatus(), { open: true, min: 1000, max: 500000 });
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
  const langs = ['en', 'ko', 'ja', 'zh', 'es', 'ar', 'vi', 'hi', 'fr', 'th', 'id'];
  const walk = (o, path) => {
    if (o.en) { for (const l of langs) assert.ok(o[l], `${path} ${l}`); return; }
    for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  };
  walk(BANK_TEXT, 'BANK_TEXT');
});
