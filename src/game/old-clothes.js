// Money back for clothes bought before the server kept purchases (Yozi,
// 2026-11-11): the server can't tell they were paid for, so they can't go
// to the shops or on a Potato Market mat. Once per account: the game asks
// the server which of my clothes it has no purchase for, takes those out of
// the closet first, then the server pays twice their price (at most
// ₩300,000 in all, supabase/035_old_clothes_refund.sql). If the answer is
// lost, the clothes stay out and the game asks again next time (the same op
// id: never paid twice); if the server says no, they come back.
//
// Loaded by main.js after the wallet opens, unless it's done on this device.
// game: { wallet, inventory, receipts, items, toast, takeOff(id),
// refreshWallet, refreshItems, storage }.
import { newOpId } from '../core/wallet.js';
import { won } from '../core/money.js';
import { t } from '../core/i18n.js';

export const DONE = 'mk.oldClothes'; // why it's over on this device
const WAIT = 'mk.oldClothesWait'; // { op, list }: out of the closet, not paid yet

// My clothes with a receipt on this device: [{ item, price, ref, bn, paid }]
// (price: what the server counts, the most I paid or the shop price).
export function oldCandidates(owned, items, receipts) {
  return owned.filter((id) => items[id]?.wear && items[id].price > 0 && receipts.paid(id) > 0)
    .map((id) => { const r = receipts.get(id); return { item: id, price: Math.min(r.paid, items[id].price), ref: r.op || null, bn: r.bn || null, paid: r.paid }; });
}

export async function runOldClothes(game) {
  const { wallet, inventory, receipts, items, storage = globalThis.localStorage } = game;
  const get = (k) => { try { return storage?.getItem(k); } catch { return null; } };
  const put = (k, v) => { try { if (v == null) storage?.removeItem(k); else storage?.setItem(k, v); } catch { /* storage blocked */ } };
  if (!wallet?.server || !wallet.client || get(DONE)) return null;
  const ask = async (args) => {
    if (!(await wallet.flush())) return null;
    try {
      const { data, error } = await Promise.race([wallet.client.rpc('old_clothes_refund', args), new Promise((r) => setTimeout(() => r({ error: { message: 'timeout' } }), 8000))]);
      return error || !data ? null : data;
    } catch { return null; }
  };
  const over = (why) => ['done', 'none', 'late'].includes(why);
  let wait = null;
  try { wait = JSON.parse(get(WAIT) || 'null'); } catch { wait = null; }
  if (!wait?.op || !Array.isArray(wait.list)) {
    const list = oldCandidates(inventory.list(), items, receipts);
    if (!list.length) { put(DONE, 'none'); return 'none'; }
    const dry = await ask({ p_items: list, p_op: null, p_dry: true });
    if (!dry) return null; // offline, or 035 not run yet: next time
    if (dry.status !== 'ok') { if (over(dry.status)) put(DONE, dry.status); return dry.status; }
    const old = new Set(dry.items || []);
    wait = { op: newOpId(), list: list.filter((r) => old.has(r.item)) };
    if (!wait.list.length) { put(DONE, 'none'); return 'none'; }
    put(WAIT, JSON.stringify(wait)); // (kept before the closet changes)
    for (const r of wait.list) { game.takeOff?.(r.item); inventory.remove(r.item); }
    game.refreshItems?.();
  }
  const res = await ask({ p_items: wait.list, p_op: wait.op, p_dry: false });
  if (!res) return null; // the clothes stay out; asked again next time
  if (res.status === 'ok') {
    const got = new Set(res.items || []), n = Number(res.n) || 0;
    wallet.credited(n, res, { k: 'ledger.oldClothes' });
    for (const r of wait.list) { if (got.has(r.item)) receipts.forget(r.item); else inventory.add(r.item); }
    put(WAIT, null); put(DONE, 'ok');
    game.refreshWallet?.(); game.refreshItems?.();
    game.toast?.(t('oldClothes.paid', { n: got.size, won: won(n) }));
    return 'ok';
  }
  // Not paid (paid on another device, account too new, stopped): they come back.
  for (const r of wait.list) inventory.add(r.item);
  put(WAIT, null);
  if (over(res.status)) put(DONE, res.status);
  game.refreshItems?.();
  return res.status;
}

// Receipts for the clothes players already had (Yozi, 2026-11-11: instead of
// taking clothes with no record out of the closet, give them a receipt at
// their shop price; supabase/038_item_grants.sql). The server made them from
// the save backup; clothes the old one-time sweep took out after that come
// back (restore), and so do clothes 035 refunded (039: the money is kept).
// Once per account; asked again until the server answers.
// Returns how many came back, or null (offline or 038 not run yet).
export const GRANTS = 'mk.itemGrants';
export async function runItemGrants(game) {
  const { wallet, inventory, receipts, items, storage = globalThis.localStorage } = game;
  try { if (storage?.getItem(GRANTS)) return null; } catch { return null; }
  if (!wallet?.server || !wallet.client || !(await wallet.flush())) return null;
  let rows = null;
  try {
    const res = await Promise.race([wallet.client.rpc('my_item_grants'), new Promise((r) => setTimeout(() => r({ error: { message: 'timeout' } }), 8000))]);
    rows = res?.error ? null : res?.data;
  } catch { rows = null; }
  if (!Array.isArray(rows)) return null;
  let back = 0;
  for (const r of rows) {
    const id = r?.item, price = Number(r?.price);
    if (!items[id]?.wear || !(price > 0) || typeof r.op !== 'string') continue;
    if (r.restore && !inventory.has(id) && inventory.add(id).length) back++;
    if (inventory.has(id) && !(receipts.paid(id) > 0)) receipts.record(id, price, r.op, null);
  }
  try { storage?.setItem(GRANTS, String(rows.length)); } catch { /* storage blocked */ }
  if (back) { game.refreshItems?.(); game.toast?.(t('oldClothes.restored', { n: back })); }
  return back;
}

// Travel money for accounts made before the server kept purchases (Yozi,
// 2026-11-11): the update took out clothes with no record and reset the
// collections, so the trips to buy them were lost. Once per account; the
// server checks the sign-up time (supabase/037_update_bonus.sql). Returns
// the server's status, or null (offline or 037 not run yet: next time).
export const BONUS = 'mk.updateBonus';
export async function runUpdateBonus(game) {
  const { wallet, storage = globalThis.localStorage } = game;
  try { if (storage?.getItem(BONUS)) return null; } catch { return null; }
  if (!wallet?.server || !wallet.client || !(await wallet.flush())) return null;
  let data = null;
  try {
    const res = await Promise.race([wallet.client.rpc('update_bonus'), new Promise((r) => setTimeout(() => r({ error: { message: 'timeout' } }), 8000))]);
    data = res?.error ? null : res?.data;
  } catch { data = null; }
  if (!data?.status || data.status === 'signin') return null;
  if (data.status === 'ok') {
    const n = Number(data.n) || 0;
    wallet.credited(n, data, { k: 'ledger.updateBonus' });
    game.refreshWallet?.();
    game.toast?.(t('oldClothes.bonus', { won: won(n) }));
  }
  try { storage?.setItem(BONUS, data.status); } catch { /* storage blocked */ }
  return data.status;
}
