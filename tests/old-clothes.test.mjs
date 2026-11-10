import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { oldCandidates, runOldClothes, DONE } from '../src/game/old-clothes.js';
import { Receipts } from '../src/core/resale.js';
import { WEARABLES } from '../src/data/wearables.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const sql = readFileSync(new URL('../supabase/035_old_clothes_refund.sql', import.meta.url), 'utf8');
const [A, B] = Object.keys(WEARABLES).filter((id) => WEARABLES[id].price > 0);
const inv = (ids) => { const s = new Set(ids); return { list: () => [...s], has: (id) => s.has(id), add: (id) => s.add(id), remove: (id) => s.delete(id) }; };
// A wallet whose server answers with `answer(args)` (null: no answer).
const wallet = (answer) => ({ server: true, credited(n) { this.got = (this.got || 0) + n; }, flush: async () => true, client: { rpc: async (fn, args) => { const d = answer(args); return d ? { data: d } : { error: { message: 'timeout' } }; } } });
const setup = () => {
  const storage = mem(), receipts = new Receipts(storage);
  receipts.record(A, WEARABLES[A].price, null, { name: WEARABLES[A].name });
  receipts.record(B, WEARABLES[B].price, '11ae4b00-80ed-4bda-b37d-51d0e325c105');
  return { storage, receipts, inventory: inv([A, B, 'gift-thing']) };
};

test('the server settings Yozi picked: twice the price, ₩300,000 an account, once', () => {
  assert.match(sql, /old_refund_mult int not null default 2/);
  assert.match(sql, /old_refund_cap bigint not null default 300000/);
  assert.match(sql, /primary key \(user_id, item\)/);
  assert.match(sql, /status', 'done'/);
});

test('only clothes with a receipt on this device are asked about', () => {
  const { receipts, inventory } = setup();
  const c = oldCandidates(inventory.list(), WEARABLES, receipts);
  assert.deepEqual(c.map((r) => r.item), [A, B]);
  assert.equal(c[1].ref, '11ae4b00-80ed-4bda-b37d-51d0e325c105');
});

test('the old ones leave the closet first, then the money comes, once', async () => {
  const { storage, receipts, inventory } = setup();
  const seen = [];
  const w = wallet((a) => { seen.push({ dry: a.p_dry, out: inventory.has(A) }); return { status: 'ok', items: [A], n: 2 * WEARABLES[A].price, coins: 1, ver: 1 }; });
  assert.equal(await runOldClothes({ wallet: w, inventory, receipts, items: WEARABLES, storage }), 'ok');
  assert.deepEqual(seen, [{ dry: true, out: true }, { dry: false, out: false }], 'out of the closet before the real ask');
  assert.equal(w.got, 2 * WEARABLES[A].price);
  assert.ok(!inventory.has(A) && inventory.has(B), 'only the old one goes');
  assert.equal(receipts.paid(A), 0);
  assert.equal(storage.getItem(DONE), 'ok');
  assert.equal(await runOldClothes({ wallet: w, inventory, receipts, items: WEARABLES, storage }), null, 'not asked again');
});

test('no answer: the clothes stay out and the same op is asked next time; refused: they come back', async () => {
  const { storage, receipts, inventory } = setup();
  const ops = [];
  let up = false;
  const w = wallet((a) => { if (a.p_dry) return { status: 'ok', items: [A], n: 1 }; ops.push(a.p_op); return up ? { status: 'done' } : null; });
  assert.equal(await runOldClothes({ wallet: w, inventory, receipts, items: WEARABLES, storage }), null);
  assert.ok(!inventory.has(A), 'still out');
  up = true;
  assert.equal(await runOldClothes({ wallet: w, inventory, receipts, items: WEARABLES, storage }), 'done');
  assert.equal(ops[0], ops[1], 'same op id');
  assert.ok(inventory.has(A), 'back in the closet');
  assert.equal(w.got, undefined);
});

test('before 035 is run nothing changes', async () => {
  const { storage, receipts, inventory } = setup();
  assert.equal(await runOldClothes({ wallet: wallet(() => null), inventory, receipts, items: WEARABLES, storage }), null);
  assert.deepEqual(inventory.list(), [A, B, 'gift-thing']);
  assert.equal(storage.getItem(DONE), null);
});

test('clothes with no receipt leave the closet once; ones with a receipt and non-clothes stay', async () => {
  const { sweepNoReceipt } = await import('../src/game/old-clothes.js');
  const { storage, receipts } = setup();
  const [C] = Object.keys(WEARABLES).filter((id) => WEARABLES[id].price > 0 && id !== A && id !== B);
  const inventory = inv([A, B, C, 'not-clothes']);
  const off = [];
  assert.deepEqual(sweepNoReceipt({ inventory, receipts, items: WEARABLES, storage, takeOff: (id) => off.push(id) }), [C]);
  assert.deepEqual(off, [C]);
  assert.deepEqual(inventory.list().sort(), [A, B, 'not-clothes'].sort());
  inventory.add(C);
  assert.deepEqual(sweepNoReceipt({ inventory, receipts, items: WEARABLES, storage }), [], 'only once');
  assert.ok(inventory.has(C));
});

test('the update travel money: asked once, paid by the server, never asked again', async () => {
  const { runUpdateBonus, BONUS } = await import('../src/game/old-clothes.js');
  const bsql = readFileSync(new URL('../supabase/037_update_bonus.sql', import.meta.url), 'utf8');
  assert.match(bsql, /update_bonus bigint not null default 300000/);
  assert.match(bsql, /v_made >= s\.old_refund_before then return jsonb_build_object\('status', 'late'\)/);
  const storage = mem();
  let asked = 0, said = '';
  const w = { server: true, flush: async () => true, credited(n) { this.got = (this.got || 0) + n; },
    client: { rpc: async () => { asked++; return { data: { status: 'ok', n: 300000, coins: 1, ver: 1 } }; } } };
  assert.equal(await runUpdateBonus({ wallet: w, storage, toast: (m) => { said = m; } }), 'ok');
  assert.equal(w.got, 300000);
  assert.ok(said);
  assert.equal(storage.getItem(BONUS), 'ok');
  assert.equal(await runUpdateBonus({ wallet: w, storage }), null);
  assert.equal(asked, 1);
  const off = { server: true, flush: async () => true, client: { rpc: async () => ({ error: { message: 'no function' } }) } };
  const s2 = mem();
  assert.equal(await runUpdateBonus({ wallet: off, storage: s2 }), null);
  assert.equal(s2.getItem(BONUS), null); // asked again next time
});
