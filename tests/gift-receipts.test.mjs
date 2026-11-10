import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GiftReceipts } from '../src/core/gift-receipts.js';
import { Receipts } from '../src/core/resale.js';
import { WEARABLES } from '../src/data/wearables.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const sql = readFileSync(new URL('../supabase/036_gift_receipts.sql', import.meta.url), 'utf8');
const [A, B] = Object.keys(WEARABLES).filter((id) => WEARABLES[id].price > 0);
const OP = '11ae4b00-80ed-4bda-b37d-51d0e325c105';
const inv = (ids) => { const s = new Set(ids); return { has: (id) => s.has(id) }; };
// A wallet whose server answers fn(args) with answer(fn, args) (null: no answer).
const wallet = (answer) => {
  const calls = [];
  return { calls, server: true, flush: async () => true,
    client: { rpc: async (fn, args) => { calls.push([fn, args]); const d = answer(fn, args); return d ? { data: d } : { error: { message: 'timeout' } }; } } };
};

test('the server ties a gift to the friend by their claimed player id, and the giver can no longer take it back', () => {
  assert.match(sql, /from public\.chat_ids c where c\.net_id = p_to/);
  assert.match(sql, /not exists \(select 1 from public\.gift_binds g where g\.op = v_ref and g\.giver = uid\)/);
  assert.match(sql, /v_orig := public\.buy_line\(uid, v_ref\)/);
});

test('the giver keeps a bind until the server has answered it', async () => {
  const storage = mem();
  let status = null;
  const w = wallet(() => status && { status });
  const g = new GiftReceipts({ wallet: () => w, storage });
  assert.equal(await g.bind(OP, 'net-b', A), 1); // no answer
  status = 'wait';
  assert.equal(await new GiftReceipts({ wallet: w, storage }).run(), 1); // kept after a reload
  status = 'ok';
  assert.equal(await g.run(), 0);
  assert.equal(storage.getItem('mk.giftBind'), null);
  assert.deepEqual(w.calls.at(-1), ['gift_bind', { p_op: OP, p_to: 'net-b', p_item: A }]);
});

test('binds older than three days are dropped', async () => {
  const storage = mem();
  let now = 0;
  const g = new GiftReceipts({ wallet: wallet(() => null), storage, now: () => now });
  await g.bind(OP, 'net-b', A);
  now = 4 * 24 * 3600 * 1000;
  assert.equal(await g.run(), 0);
});

test('no server wallet, no op: nothing is kept', async () => {
  const g = new GiftReceipts({ wallet: { server: false }, storage: mem() });
  assert.equal(g.bind(OP, 'net-b', A), undefined);
  assert.equal(g.bind(null, 'net-b', A), undefined);
  assert.equal(g.wait.length, 0);
});

test('the friend gets a receipt for gifted clothes they have and no receipt for yet', async () => {
  const storage = mem(), receipts = new Receipts(storage);
  receipts.record(B, 1000, null);
  const rows = [{ item: A, op: OP, price: WEARABLES[A].price }, { item: B, op: OP, price: 5 }, { item: 'nope', op: OP, price: 9 }];
  const g = new GiftReceipts({ wallet: wallet((fn) => fn === 'my_gifts' && rows), storage });
  assert.equal(await g.sync(inv([A, B, 'nope']), receipts, WEARABLES), 1);
  assert.deepEqual(receipts.get(A), { paid: WEARABLES[A].price, op: OP, bn: null, w: 1 });
  assert.equal(receipts.paid(B), 1000); // its own receipt stays
  assert.equal(await new GiftReceipts({ wallet: wallet(() => null), storage }).sync(inv([A]), receipts, WEARABLES), 0);
});
