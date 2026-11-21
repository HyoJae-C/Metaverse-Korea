// The weekend farm's keeper (core/farm.js has the rules): my beds, my barn
// and the money. Loaded with the glasshouse.
//
// On the server (supabase/064_farm.sql) the beds, the clock and the money
// are the server's: planting takes the seed's price with a receipt
// (coin_ledger, kind 'farm'), selling pays for the whole barn with one, and
// a request id makes a double tap or a retry move money once. Without the
// server (local play, tests) it all stays in this browser.
//
// Every keeper answers the same:
//   info()                         → { now, beds: [bed|null × n], barn, crops } or { error }
//   plant({ requestId, bed, crop, price }, note) → { bed: { crop, at, wet } } or { error, price? }
//   water(bed)                     → { wet } or { error }
//   pick(bed)                      → { crop, fresh, barn } or { error, left? }
//   sell({ requestId }, note)      → { paid, sold } or { error }
// error: 'signin' | 'crop' | 'bed' | 'busy' | 'price' | 'nosave' | 'coins' |
//   'empty' | 'early' | 'late' | 'wet' | 'unripe' | 'none' | 'missing' | 'network'
// Times are the keeper's clock in ms; `now` in info() lets the game follow it.
import { CROPS, FARM_BEDS, barnCount, barnKey, barnWorth, bedState, cropById } from './farm.js';

export const newRequestId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
const LOCAL_KEY = 'mkfarm.local'; // not "mk.": stays out of the cloud save
const crops0 = () => Object.fromEntries(CROPS.map((c) => [c.id, { grow: c.grow, seed: c.seed, sell: c.sell }]));

// In this browser only.
export class LocalFarm {
  constructor(wallet, storage = globalThis.localStorage) {
    Object.assign(this, { wallet, storage });
    this.shared = false;
  }
  _load() {
    let s = null;
    try { s = JSON.parse(this.storage.getItem(LOCAL_KEY) || 'null'); } catch { /* broken */ }
    return s && Array.isArray(s.beds) ? { beds: s.beds.slice(0, FARM_BEDS), barn: s.barn || {}, ids: s.ids || [] } : { beds: [], barn: {}, ids: [] };
  }
  _save(s) { try { this.storage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch { /* storage blocked */ } }
  _beds(s) { return Array.from({ length: FARM_BEDS }, (_, i) => s.beds[i] || null); }
  async info(now = Date.now()) { const s = this._load(); return { now, beds: this._beds(s), barn: { ...s.barn }, crops: crops0() }; }
  async plant({ requestId, bed, crop, price }, note, now = Date.now()) {
    const c = cropById(crop), s = this._load();
    if (!c) return { error: 'crop' };
    if (!(bed >= 0 && bed < FARM_BEDS)) return { error: 'bed' };
    if (s.ids.includes(requestId)) return { bed: s.beds[bed] || null };
    if (s.beds[bed]) return { error: 'busy' };
    if (price !== c.seed) return { error: 'price', price: c.seed };
    if (!this.wallet.spend(c.seed, note, { ask: false })) return { error: 'coins' };
    s.beds[bed] = { crop, at: now, wet: null };
    s.ids = [...s.ids, requestId].slice(-40);
    this._save(s);
    return { bed: s.beds[bed] };
  }
  async water(bed, now = Date.now()) {
    const s = this._load(), b = s.beds[bed];
    if (!b) return { error: 'empty' };
    if (Number.isFinite(b.wet)) return { error: 'wet', wet: b.wet };
    const st = bedState(b, now);
    if (st.stage === 'sprout') return { error: 'early' };
    if (st.stage === 'ripe') return { error: 'late' };
    b.wet = now;
    this._save(s);
    return { wet: now };
  }
  async pick(bed, now = Date.now()) {
    const s = this._load(), b = s.beds[bed];
    if (!b) return { error: 'empty' };
    const st = bedState(b, now);
    if (st.stage !== 'ripe') return { error: 'unripe', left: st.left };
    const k = barnKey(b.crop, st.fresh);
    s.barn[k] = (s.barn[k] || 0) + 1;
    s.beds[bed] = null;
    this._save(s);
    return { crop: b.crop, fresh: st.fresh, barn: { ...s.barn } };
  }
  async sell({ requestId }, note) {
    const s = this._load();
    if (s.ids.includes(requestId)) return { paid: 0, sold: 0 };
    const sold = barnCount(s.barn), paid = barnWorth(s.barn);
    if (!sold) return { error: 'none' };
    s.barn = {};
    s.ids = [...s.ids, requestId].slice(-40);
    this._save(s);
    this.wallet.add(paid, note);
    return { paid, sold };
  }
}

// In Supabase. cloud: the game's CloudSave (signed in).
export class SupabaseFarm {
  constructor(cloud, wallet) {
    this.cloud = cloud;
    this.wallet = wallet;
    this.applied = new Set(); // request ids already shown in the local wallet
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
  async _call(fn, args) {
    try {
      const { data, error } = await this.client.rpc(fn, args);
      const e = this._err(error);
      if (e) return { error: e };
      if (!data || data.status !== 'ok') return { ...(data || {}), error: data?.status || 'network' };
      return data;
    } catch { return { error: 'network' }; }
  }
  _settle() { return this.wallet.server ? this.wallet.flush() : this.cloud.flush(); } // (what I earned or spent just now reaches the server first)
  async info() {
    const d = await this._call('farm_info');
    if (d.error) return d;
    const f = this._sf(), n = Number(d.beds) || FARM_BEDS;
    const beds = Array.from({ length: n }, () => null);
    for (const b of d.mine || []) if (b.bed >= 0 && b.bed < n) beds[b.bed] = { crop: b.crop, at: b.at, wet: b.wet ?? null };
    const crops = crops0();
    for (const [id, c] of Object.entries(d.crops || {})) if (crops[id]) crops[id] = { grow: Number(c.grow) || crops[id].grow, seed: c.seed * f, sell: c.sell * f };
    return { now: Number(d.now) || Date.now(), beds, barn: { ...(d.barn || {}) }, crops, fresh: Number(d.fresh) || undefined };
  }
  async plant({ requestId, bed, crop, price }, note) {
    if (!cropById(crop)) return { error: 'crop' };
    if (!(await this._settle())) return { error: 'network' };
    const f = this._sf();
    const d = await this._call('farm_plant', { p_request_id: requestId, p_bed: bed, p_crop: crop, p_price: Math.round(price / f) });
    if (d.error) return { error: d.error, price: d.price != null ? d.price * f : undefined };
    if (!this.applied.has(requestId)) {
      this.applied.add(requestId);
      const p = Number(d.price) * f || price;
      if (this.wallet.server && d.ver != null) this.wallet.charged(d.charged ? p : 0, d, note);
      else if (d.charged) this.wallet.add(-p, note);
    }
    return { bed: d.bed ? { crop: d.bed.crop, at: d.bed.at, wet: d.bed.wet ?? null } : null };
  }
  async water(bed) {
    const d = await this._call('farm_water', { p_bed: bed });
    return d.error ? { error: d.error, wet: d.wet } : { wet: d.wet };
  }
  async pick(bed) {
    const d = await this._call('farm_pick', { p_bed: bed });
    return d.error ? { error: d.error, left: d.left } : { crop: d.crop, fresh: !!d.fresh, barn: { ...(d.barn || {}) } };
  }
  async sell({ requestId }, note) {
    if (!(await this._settle())) return { error: 'network' };
    const d = await this._call('farm_sell', { p_request_id: requestId });
    if (d.error) return { error: d.error };
    const paid = Number(d.paid) * this._sf() || 0;
    if (!this.applied.has(requestId)) {
      this.applied.add(requestId);
      if (this.wallet.server && d.ver != null) this.wallet.credited(paid, d, note);
      else if (d.sold) this.wallet.add(paid, note);
    }
    return { paid, sold: Number(d.sold) || 0 };
  }
}
