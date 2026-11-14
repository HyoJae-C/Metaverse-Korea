// The bait stall's till (core/bait.js has the baits): one pack of each kind
// a day, the day turning over at 00:00 KST. Loaded with the stall's panel.
//
// On the server (supabase/042_fish_bait.sql) buy_bait takes the money and
// writes the receipt (coin_ledger, kind 'bait', note 'bait:<id>') in one
// step, and counts today's receipts for the daily limit, so clearing the
// browser doesn't buy more. A request id per purchase makes a double tap (or
// a retry after a dropped connection) charge once. Without the server (local
// play, tests) the day's purchases stay in this browser.
import { BAITS, BAIT_DAILY, BAIT_PACK, baitById, kstDay } from './bait.js';

export const newRequestId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
const LOCAL_KEY = 'mkbait.local'; // not "mk.": stays out of the cloud save
const defaults = () => ({ prices: Object.fromEntries(BAITS.map((b) => [b.id, b.price])), daily: BAIT_DAILY, pack: BAIT_PACK });

// Every till: info() → { prices: { id: won }, daily, pack, bought: { id: n today } }
// or { error }; buy({ requestId, b, price }, note) → { charged } or { error }.
//   error: 'bait' | 'coins' | 'price' (with price) | 'limit' | 'missing' | 'network'

// In this browser only.
export class LocalBaitShop {
  constructor(wallet, storage = globalThis.localStorage) {
    Object.assign(this, { wallet, storage });
    this.shared = false;
  }
  _day(now) {
    let s = null;
    try { s = JSON.parse(this.storage.getItem(LOCAL_KEY) || 'null'); } catch { /* broken */ }
    return s && s.day === kstDay(now) && s.bought && typeof s.bought === 'object' ? s : { day: kstDay(now), bought: {}, ids: [] };
  }
  async info(now = Date.now()) { return { ...defaults(), bought: { ...this._day(now).bought } }; }
  async buy({ requestId, b, price }, note, now = Date.now()) {
    const bait = baitById(b);
    if (!bait) return { error: 'bait' };
    const s = this._day(now);
    if (s.ids?.includes(requestId)) return { charged: false };
    if (price !== bait.price) return { error: 'price', price: bait.price };
    if ((s.bought[b] || 0) >= BAIT_DAILY) return { error: 'limit' };
    if (!this.wallet.spend(price, note)) return { error: 'coins' };
    s.bought[b] = (s.bought[b] || 0) + 1;
    s.ids = [...(s.ids || []), requestId].slice(-20);
    try { this.storage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
    return { charged: true };
  }
}

// In Supabase. cloud: the game's CloudSave (signed in).
export class SupabaseBaitShop {
  constructor(cloud, wallet) {
    this.cloud = cloud;
    this.wallet = wallet;
    this.applied = new Set(); // request ids already taken from the local wallet
    this.shared = true;
    this.missing = false; // the SQL isn't set up yet
  }
  get client() { return this.cloud.client; }
  _sf() { return (this.wallet.server && this.wallet._sf?.()) || 1; } // won per server unit
  _err(error) {
    if (!error) return null;
    if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202' || /does not exist|schema cache|could not find/i.test(error.message || '')) { this.missing = true; return 'missing'; }
    return 'network';
  }
  async info() {
    const { data, error } = await this.client.rpc('bait_info');
    const e = this._err(error);
    if (e) return { error: e };
    const d = defaults(), f = this._sf();
    for (const b of BAITS) if (Number.isFinite(data?.prices?.[b.id])) d.prices[b.id] = data.prices[b.id] * f;
    return { ...d, daily: Number(data?.daily) || d.daily, bought: { ...(data?.bought || {}) } };
  }
  async buy({ requestId, b, price }, note) {
    if (!baitById(b)) return { error: 'bait' };
    const onServer = !!this.wallet.server;
    if (!(await (onServer ? this.wallet.flush() : this.cloud.flush()))) return { error: 'network' };
    const { data, error } = await this.client.rpc('buy_bait', { p_request_id: requestId, p_bait: b, p_price: Math.round(price / this._sf()) });
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || data.status !== 'ok') return { error: data?.status || 'network', price: data?.price != null ? data.price * this._sf() : undefined };
    const p = Number(data.price) * this._sf() || price;
    if (!this.applied.has(requestId)) {
      this.applied.add(requestId);
      if (onServer && data.ver != null) { if (data.charged) this.wallet.charged(p, data, note); else this.wallet.charged(0, data); }
      else this.wallet.add(-p, note);
    }
    return { charged: !!data.charged };
  }
}
