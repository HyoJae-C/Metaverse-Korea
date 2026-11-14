// My lantern on Jogyesa's canopy (내 연등 달기): pick a colour and a wish,
// pay, and your lantern hangs in a free spot of the canopy over the yard,
// with your name, for three days. Everyone who walks under it sees it, and reads
// the wish in their own language.
//
// Like the Cheonggyecheon wish lanterns, the wishes come from a fixed list
// (core/lanterns.js WISHES, sent as a number), so there is nothing to
// moderate; the colours are the same seven. The canopy's 400 spots
// (data/jogyesa.js canopySlots) are numbered; a lantern takes the lowest
// free one, the front rows by Daeungjeon first.
//
// On the server (supabase/041_temple_lanterns.sql) one function takes the
// money from the player's wallet and hangs the lantern together, so the two
// can never disagree, and writes the receipt (coin_ledger, kind 'lantern').
// A request id per lantern makes a double tap (or a retry after a dropped
// connection) hang one lantern and charge once. Without the server (local
// play, tests) the lanterns stay in this browser.

import { WISHES, WISH_COLORS } from './lanterns.js';
import { canopySlots } from '../data/jogyesa.js';

// Settings. The price, the days and the daily limit are also kept on the
// server (temple_lantern_settings), which wins whenever the game is online.
export const TEMPLE_LANTERN = {
  price: 5000, // won (Yozi 2026-11-12)
  days: 3, // how long it hangs (Yozi 2026-11-12)
  dailyLimit: 3, // lanterns a player can hang a day (KST)
  maxName: 16,
};
export const SLOTS = canopySlots().length; // 400
const DAY = 86400e3;
const TABLE = 'temple_lanterns';
const LOCAL_KEY = 'mktemple.local'; // not "mk.": stays out of the cloud save

export const newRequestId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
export const validColor = (c) => Number.isInteger(c) && c >= 0 && c < WISH_COLORS.length;
export const validWish = (w) => Number.isInteger(w) && w >= 0 && w < WISHES.length;

// The lowest spot no lantern hanging now uses, or -1 when the canopy is full.
export function freeSlot(rows, now = Date.now(), slots = SLOTS) {
  const used = new Set(rows.filter((r) => Date.parse(r.expires_at) > now).map((r) => r.slot));
  for (let i = 0; i < slots; i++) if (!used.has(i)) return i;
  return -1;
}
// Whole days left (at least 1 while it still hangs).
export const daysLeft = (row, now = Date.now()) => Math.max(1, Math.ceil((Date.parse(row.expires_at) - now) / DAY));

// Every backend: price(), hang({ requestId, color, wish, name, price }, note)
// → { lantern, charged } or { error }, active() → { rows } or { error }.
//   error: 'color' | 'wish' | 'coins' | 'price' | 'limit' | 'full'
//          | 'missing' (server not set up) | 'network'
// A lantern (row): { id, slot, color, wish, name, created_at, expires_at }.

// In this browser only.
export class LocalTempleLanterns {
  constructor(wallet, storage = globalThis.localStorage) {
    Object.assign(this, { wallet, storage });
    this.shared = false;
  }
  _all() {
    try { const a = JSON.parse(this.storage.getItem(LOCAL_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
  }
  _save(a) { try { this.storage.setItem(LOCAL_KEY, JSON.stringify(a.slice(-100))); } catch { /* storage blocked */ } }
  async price() { return TEMPLE_LANTERN.price; }
  async hang({ requestId, color, wish, name, price }, note, now = Date.now()) {
    if (!validColor(color)) return { error: 'color' };
    if (!validWish(wish)) return { error: 'wish' };
    const all = this._all();
    const dup = all.find((l) => l.request_id === requestId);
    if (dup) return { lantern: dup, charged: false };
    if (price !== TEMPLE_LANTERN.price) return { error: 'price', price: TEMPLE_LANTERN.price };
    const today = new Date(now + 9 * 3600e3).toISOString().slice(0, 10); // (the KST day)
    if (all.filter((l) => new Date(Date.parse(l.created_at) + 9 * 3600e3).toISOString().slice(0, 10) === today).length >= TEMPLE_LANTERN.dailyLimit) return { error: 'limit' };
    const slot = freeSlot(all, now);
    if (slot < 0) return { error: 'full' };
    if (!this.wallet.spend(price, note)) return { error: 'coins' };
    const lantern = {
      id: all.reduce((m, l) => Math.max(m, l.id), 0) + 1, request_id: requestId, slot, color, wish, mine: true,
      name: String(name || '?').slice(0, TEMPLE_LANTERN.maxName),
      created_at: new Date(now).toISOString(), expires_at: new Date(now + TEMPLE_LANTERN.days * DAY).toISOString(),
    };
    all.push(lantern);
    this._save(all.filter((l) => Date.parse(l.expires_at) > now));
    return { lantern, charged: true };
  }
  async active(now = Date.now()) { return { rows: this._all().filter((l) => Date.parse(l.expires_at) > now) }; }
}

// In Supabase (shared with everyone). cloud: the game's CloudSave (signed in).
export class SupabaseTempleLanterns {
  constructor(cloud, wallet) {
    this.cloud = cloud;
    this.wallet = wallet;
    this.applied = new Set(); // request ids already taken from the local wallet
    this.mine = new Set(); // ids of my lanterns (hung here, or my_temple_lanterns())
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
  async price() {
    const { data, error } = await this.client.rpc('temple_lantern_price');
    if (error) { this._err(error); return TEMPLE_LANTERN.price; }
    return Number.isFinite(data) ? data * this._sf() : TEMPLE_LANTERN.price;
  }
  // The money is taken on the server in the same step as hanging the
  // lantern (the wallet's waiting changes are sent first; then it shows the
  // server's balance), like the Namsan love locks.
  async hang({ requestId, color, wish, name, price }, note) {
    if (!validColor(color)) return { error: 'color' };
    if (!validWish(wish)) return { error: 'wish' };
    const onServer = !!this.wallet.server;
    if (!(await (onServer ? this.wallet.flush() : this.cloud.flush()))) return { error: 'network' };
    const { data, error } = await this.client.rpc('hang_temple_lantern', { p_request_id: requestId, p_color: color, p_wish: wish, p_name: String(name || '?').slice(0, TEMPLE_LANTERN.maxName), p_price: Math.round(price / this._sf()) });
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || data.status !== 'ok') return { error: data?.status || 'network', price: data?.price != null ? data.price * this._sf() : undefined };
    const p = Number(data.price) * this._sf() || price;
    if (!this.applied.has(requestId)) {
      this.applied.add(requestId);
      if (onServer && data.ver != null) { if (data.charged) this.wallet.charged(p, data, note); else this.wallet.charged(0, data); }
      else this.wallet.add(-p, note);
    }
    this.mine.add(data.lantern.id);
    return { lantern: { ...data.lantern, mine: true }, charged: !!data.charged };
  }
  async active() {
    const [{ data, error }, mine] = await Promise.all([
      this.client.from(TABLE).select('id, slot, color, wish, name, created_at, expires_at').gt('expires_at', new Date().toISOString()).order('slot').limit(SLOTS),
      this.client.rpc('my_temple_lanterns'),
    ]);
    const e = this._err(error);
    if (e) return { error: e };
    for (const id of (mine.error ? [] : mine.data) || []) this.mine.add(Number(id));
    return { rows: data.map((r) => (this.mine.has(r.id) ? { ...r, mine: true } : r)) };
  }
}
