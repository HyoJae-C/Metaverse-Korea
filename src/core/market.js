// Potato Market (감자마켓) at Dongmyo: players spread a mat and lay clothes on
// it for others to buy while they are away. No DOM, so it can be
// unit-tested; the server keeps the mats (supabase/034_player_market.sql).
//
// Rules (Yozi, 2026-11-10): one mat each with up to 6 things; a price the
// seller picks between 10% and 100% of the clothes' new price; the seller
// gets it less a 5% fee; the mat stays 3 days after the seller was last in
// the game, then what didn't sell goes back to their closet. Only clothes
// they paid for (a receipt, core/resale.js) can go on a mat, so gifts and
// code items can't be turned into coins. Accounts younger than a day can't
// use it (a fresh guest's welcome money can't be passed on).
//
// Two players tapping the same thing at once: the server sells it to the
// first; the second hears 'gone' and pays nothing.

import { noteText } from './wallet.js';
import { serverBuy } from './resale.js';

export const MARKET = { minPct: 10, maxPct: 100, feePct: 5, days: 3, openMax: 6, minHours: 24 };
const SEEN = 'mk.marketSeen'; // sold listings already told about

// What a seller may ask for clothes whose new price is `list`.
export function priceRange(list, rules = MARKET) {
  if (!(list > 0) || !(rules.maxPct > 0)) return null;
  return { min: Math.ceil((list * rules.minPct) / 100), max: Math.floor((list * rules.maxPct) / 100) };
}
// What the seller gets for a sale at `price` (the server rounds the fee up).
export const sellerGets = (price, feePct = MARKET.feePct) => Math.max(0, price - Math.ceil((price * feePct) / 100));
// Snap a price to the range, in steps of ₩100 inside it.
export function clampPrice(price, range) {
  if (!range) return 0;
  const p = Math.round((Number(price) || 0) / 100) * 100;
  return Math.max(range.min, Math.min(range.max, p));
}

// What I can put on my mat: owned clothes with a receipt, not on the mat
// already, as [{ id, paid, list }] (list: the new price prices are counted from).
export function listable(owned, items, receipts, onMat = new Set()) {
  return owned.filter((id) => items[id]?.wear && receipts.paid(id) > 0 && !onMat.has(id))
    .map((id) => ({ id, paid: receipts.paid(id), list: receipts.get(id)?.list || items[id].price }))
    .filter((r) => r.list > 0);
}

// A listing this game can show: clothes it knows (retired colours too) at
// their real new price, so a listing can't pass off one thing as another.
export const shown = (row, items) => !!(items[row?.item]?.wear && row.list === items[row.item].price && row.price > 0);

// The mats from market_browse rows: [{ mat, name, mine, things }] with up to
// `max` things each (newest mats first, as the server sends them).
export function mats(rows, items, max = MARKET.openMax) {
  const out = new Map();
  for (const r of rows || []) {
    if (!shown(r, items)) continue;
    let m = out.get(r.mat);
    if (!m) out.set(r.mat, (m = { mat: r.mat, name: r.name || null, mine: !!r.mine, things: [] }));
    if (m.things.length < max) m.things.push({ id: r.id, item: r.item, price: r.price, list: r.list });
  }
  return [...out.values()];
}

// Where each seller's things lie (Yozi 2026-11-11): the striped stalls round
// the plaza first, then the mats in the middle. The server sends sellers
// freshest first, so the stalls go to whoever was in the game last. Same
// rules either way: a stall is only a nicer place to show the same listing.
// [{ m, stall: index into stalls, or mat: index into the mat spots }].
export function layout(list, stalls, spots) {
  return (list || []).slice(0, stalls + spots).map((m, i) => (i < stalls ? { m, stall: i } : { m, mat: i - stalls }));
}

// Things from my mat that sold since I last looked: [{ id, item, got }].
export function newlySold(rows, storage = globalThis.localStorage) {
  let seen = [];
  try { seen = JSON.parse(storage?.getItem(SEEN) || '[]') || []; } catch { /* broken save */ }
  const known = new Set(seen);
  const sold = (rows || []).filter((r) => r.status === 'sold' && !known.has(r.id));
  if (sold.length) {
    const keep = [...seen, ...sold.map((r) => r.id)].slice(-200);
    try { storage?.setItem(SEEN, JSON.stringify(keep)); } catch { /* storage blocked */ }
  }
  return sold.map((r) => ({ id: r.id, item: r.item, got: Number(r.got) || 0 }));
}

// Talks to the server for the game. wallet: core/wallet.js (its client and
// its queue: a purchase must reach the server before it can be listed).
export class MarketClient {
  constructor(wallet) {
    this.wallet = wallet;
    this.rules = null; // null: closed (no server wallet, or 034 not run)
  }
  get client() { return this.wallet?.client || null; }
  async _rpc(fn, args) {
    if (!this.client) return { error: { message: 'offline' } };
    try {
      return await Promise.race([this.client.rpc(fn, args), new Promise((r) => setTimeout(() => r({ error: { message: 'timeout' } }), 8000))]);
    } catch (e) { return { error: e }; }
  }
  // The rules from the server; null when the market is closed.
  async info() {
    const { data, error } = await this._rpc('market_info');
    if (error || !data || data.unit !== 'krw' || !(data.max_pct > 0)) { this.rules = null; return null; }
    this.rules = { minPct: data.min_pct, maxPct: data.max_pct, feePct: data.fee_pct, days: data.days, openMax: data.open_max, minHours: data.min_hours };
    return this.rules;
  }
  async browse() {
    const { data, error } = await this._rpc('market_browse');
    return error || !Array.isArray(data) ? null : data;
  }
  async mine() {
    const { data, error } = await this._rpc('market_mine');
    return error || !Array.isArray(data) ? null : data;
  }
  // Put clothes on my mat. rc: its receipt ({ paid, op, bn }). Resolves
  // { ok, id, why }: why is offline, closed, young, price, noref, sold, full.
  async list(item, price, rc) {
    if (!(await this.wallet.flush())) return { ok: false, why: 'offline' };
    const { data, error } = await this._rpc('market_list', { p_item: item, p_price: Math.round(price), p_ref: rc?.op || null, p_bn: rc?.op ? null : rc?.bn || null, p_paid: rc?.op ? null : rc?.paid || null });
    if (error || !data) return { ok: false, why: 'offline' };
    if (data.status === 'ok') return { ok: true, id: data.id };
    return { ok: false, why: data.status === 'open' || data.status === 'signin' ? 'offline' : data.status, min: data.min, max: data.max };
  }
  // Take something back. Resolves { ok, item, rc, why } (rc: the receipt to
  // keep): why is offline, gone (it sold), none.
  async cancel(id) {
    const { data, error } = await this._rpc('market_cancel', { p_id: id });
    if (error || !data) return { ok: false, why: 'offline' };
    if (data.status !== 'ok') return { ok: false, why: data.status, item: data.item };
    return { ok: true, item: data.item, rc: { op: data.ref || null, paid: Number(data.paid) || 0 } };
  }
  // Buy a listing. op: a fixed id for this purchase (asking again never pays
  // twice); note: for the budget book. Resolves { ok, n (won paid), item, list, why }: why is offline,
  // gone, own, poor, young, closed.
  buy(id, op, note) {
    return serverBuy(this.wallet, 'market_buy', { p_id: id, p_op: op, p_note: noteText(note) }, note);
  }
}
