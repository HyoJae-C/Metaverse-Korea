// Paying for a bigger home (core/home-stages.js has the levels). Loaded with
// game/home-grow.js, the first time you go into your home.
//
// On the server (supabase/053_home_levels.sql) buy_home_level takes the
// money and writes the receipt (coin_ledger, kind 'home', note
// 'home:<level>') in one step; the home's level is worked out from the
// receipts. A request id per purchase makes a double tap (or a retry after a
// dropped connection) charge once. Without the server (local play, tests)
// the level stays in this browser (mk.homeLevel).
import { HOME_LEVELS, homeLevelOf, readHomeLevel } from './home-stages.js';

export const newRequestId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
const defaults = () => Object.fromEntries(HOME_LEVELS.filter((l) => l.price).map((l) => [l.level, l.price]));

// Every till: info() → { level, prices: { level: won } } or { error };
// buy({ requestId, level, price }, note) → { charged, level } or { error }.
//   error: 'level' (with level: mine now) | 'coins' | 'price' (with price) | 'missing' | 'network'

// In this browser only.
export class LocalHomeTill {
  constructor(wallet, storage = globalThis.localStorage) {
    Object.assign(this, { wallet, storage });
    this.shared = false;
    this.done = new Set();
  }
  async info() { return { level: readHomeLevel(this.storage), prices: defaults() }; }
  async buy({ requestId, level, price }, note) {
    const cur = readHomeLevel(this.storage);
    if (this.done.has(requestId)) return { charged: false, level: cur };
    const want = HOME_LEVELS[level - 1];
    if (!want || level !== cur + 1) return { error: 'level', level: cur };
    if (price !== want.price) return { error: 'price', price: want.price };
    if (!this.wallet.spend(price, note)) return { error: 'coins' };
    this.done.add(requestId);
    return { charged: true, level };
  }
}

// In Supabase. cloud: the game's CloudSave (signed in).
export class SupabaseHomeTill {
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
    const { data, error } = await this.client.rpc('home_level_info');
    const e = this._err(error);
    if (e) return { error: e };
    const prices = defaults(), f = this._sf();
    for (const k of Object.keys(prices)) if (Number.isFinite(data?.prices?.[k])) prices[k] = data.prices[k] * f;
    return { level: data?.level ? homeLevelOf(data.level).level : null, prices };
  }
  async buy({ requestId, level, price }, note) {
    const onServer = !!this.wallet.server;
    if (!(await (onServer ? this.wallet.flush() : this.cloud.flush()))) return { error: 'network' };
    const { data, error } = await this.client.rpc('buy_home_level', { p_request_id: requestId, p_level: level, p_price: Math.round(price / this._sf()) });
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || data.status !== 'ok') return { error: data?.status || 'network', level: data?.level, price: data?.price != null ? data.price * this._sf() : undefined };
    const p = Number(data.price) * this._sf() || price;
    if (!this.applied.has(requestId)) {
      this.applied.add(requestId);
      if (onServer && data.ver != null) { if (data.charged) this.wallet.charged(p, data, note); else this.wallet.charged(0, data); }
      else this.wallet.add(-p, note);
    }
    return { charged: !!data.charged, level: homeLevelOf(data.level).level };
  }
}
