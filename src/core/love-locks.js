// Love locks (사랑의 자물쇠) at the Namsan summit: pick a lock, write a note
// (up to 20 lines) and pay coins to hang it. Everyone can read the notes in
// a list, newest first, a page at a time.
//
// The 3D heart on the summit is fixed decoration; a lock someone hangs is a
// row on the server, never a new 3D object.
//
// On the server (supabase/007b_love_locks.sql) one function takes the coins
// from the player's cloud save and saves the note together, so the two can
// never disagree. A request id per note makes a double tap (or a retry after
// a dropped connection) hang one lock and charge once. Without the server
// (local play, tests) the notes stay in this browser.

export const LOCK_SHAPES = ['heart', 'circle', 'square', 'star'];
// Settings. The price is also kept on the server (love_lock_settings in
// 007b_love_locks.sql), which wins whenever the game is online: change it
// there to change it for everyone, and here for offline play.
export const LOVE_LOCK = {
  price: 15000, // won (₩15,000, about what a padlock costs at Namsan)
  pageSize: 10, // notes per page in the list
  maxLines: 20,
  maxChars: 200, // was 1000 until 2026-11-19; older locks stay as written
  maxName: 16,
};
const TABLE = 'love_locks';
const LOCAL_KEY = 'mklocks.local'; // not "mk.": stays out of the cloud save

// Lines as the player sees them: every line break starts a new one; an empty
// box is 0 lines.
export function countLines(text) {
  const s = String(text || '').replace(/\r\n?/g, '\n');
  return s ? s.split('\n').length : 0;
}

// The note as it will be saved, or an error code: 'empty', 'lines', 'chars'.
// Line breaks and spaces inside are kept as written; only blank lines at the
// very start and end are dropped.
export function cleanNote(text) {
  const body = String(text || '').replace(/\r\n?/g, '\n').replace(/^(?:[ \t]*\n)+/, '').replace(/(?:\n[ \t]*)+$/, '').replace(/\s+$/, '');
  if (!body.trim()) return { error: 'empty' };
  if (countLines(body) > LOVE_LOCK.maxLines) return { error: 'lines' };
  if (body.length > LOVE_LOCK.maxChars) return { error: 'chars' };
  return { body };
}

// A short one-line preview for the list.
export function preview(body, n = 40) {
  const one = String(body || '').replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n - 1) + '…' : one;
}

// A lock for two (supabase/061_pair_locks.sql): two friends side by side,
// both names on it, each pays half (an odd won goes to the host).
export const halves = (price) => { const friend = Math.floor(price / 2); return { host: price - friend, friend }; };
export const PAIR_RADIUS = 6; // m: the friend stands next to you at the heart
export const PAIR_WAIT = 60 * 1000; // ms either side waits for the other's answer

// Messages between the two games, on the emote channel (JSON, so the note can
// hold any character). Only the host's ask carries the note; the server
// checks the friend said yes to exactly that note.
//   { v: 'ask', to, rid, shape, body }  host → friend
//   { v: 'ok', to, rid }                friend said yes (the server has it)
//   { v: 'no', to, rid, why }           friend said no, or it failed
//   { v: 'done', to, rid }              host: the lock is up (both paid)
//   { v: 'fail', to, rid, why }         host: it didn't go up (nobody paid)
const PAIR_VERBS = ['ask', 'ok', 'no', 'done', 'fail'];
export const pairMsg = (o) => 'll:' + JSON.stringify(o);
export function parsePair(e) {
  const s = String(e);
  if (!s.startsWith('ll:') || s.length > 1200) return null;
  let o;
  try { o = JSON.parse(s.slice(3)); } catch { return null; }
  if (!o || typeof o !== 'object' || !PAIR_VERBS.includes(o.v)) return null;
  const id = (x) => typeof x === 'string' && /^[\w-]{1,64}$/.test(x);
  if (!id(o.to) || !id(o.rid)) return null;
  const m = { v: o.v, to: o.to, rid: o.rid };
  if (o.v === 'ask') {
    const c = cleanNote(o.body);
    if (c.error || !LOCK_SHAPES.includes(o.shape)) return null;
    Object.assign(m, { shape: o.shape, body: c.body });
  }
  if (o.v === 'no' || o.v === 'fail') m.why = typeof o.why === 'string' ? o.why.slice(0, 20) : 'no';
  return m;
}

export const newRequestId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);

// What the game hands a backend to take the coins locally.
//   wallet: { coins, spend(n, note) }
// Every backend's hang() resolves to { lock, charged } or { error }:
//   error: 'empty' | 'lines' | 'chars' | 'shape' | 'coins' | 'price' | 'limit'
//          | 'missing' (server not set up) | 'network'

// In this browser only.
export class LocalLoveLocks {
  constructor(wallet, storage = globalThis.localStorage, uid = 'me') {
    Object.assign(this, { wallet, storage, uid });
    this.shared = false;
    this.pairs = false; // a lock for two needs the server
  }
  _all() {
    try { const a = JSON.parse(this.storage.getItem(LOCAL_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
  }
  _save(a) { try { this.storage.setItem(LOCAL_KEY, JSON.stringify(a.slice(-300))); } catch { /* storage blocked */ } }
  async price() { return LOVE_LOCK.price; }
  async hang({ requestId, shape, name, text, price }, note, now = Date.now()) {
    const c = cleanNote(text);
    if (c.error) return { error: c.error };
    if (!LOCK_SHAPES.includes(shape)) return { error: 'shape' };
    if (price !== LOVE_LOCK.price) return { error: 'price', price: LOVE_LOCK.price };
    const all = this._all();
    const dup = all.find((l) => l.request_id === requestId);
    if (dup) return { lock: dup, charged: false };
    if (!this.wallet.spend(price, note)) return { error: 'coins' };
    const lock = { id: all.reduce((m, l) => Math.max(m, l.id), 0) + 1, request_id: requestId, shape, name: String(name || '?').slice(0, LOVE_LOCK.maxName), body: c.body, created_at: new Date(now).toISOString() };
    all.push(lock);
    this._save(all);
    return { lock, charged: true };
  }
  // A page, newest first: before = the last id already shown (or null).
  async page(before = null, n = LOVE_LOCK.pageSize) {
    const rows = this._all().filter((l) => before == null || l.id < before).sort((a, b) => b.id - a.id);
    return { rows: rows.slice(0, n), more: rows.length > n };
  }
}

// In Supabase (shared with everyone). cloud: the game's CloudSave (signed in).
export class SupabaseLoveLocks {
  constructor(cloud, wallet) {
    this.cloud = cloud;
    this.wallet = wallet;
    this.applied = new Set(); // request ids already taken from the local wallet
    this.shared = true;
    this.missing = false; // the SQL isn't set up yet
    this.pairs = true; // locks for two (061_pair_locks.sql), until the server says it doesn't know them
  }
  get client() { return this.cloud.client; }
  // Won per server unit: 1 (018_won.sql) or 1000 on a server still in coins.
  _sf() { return (this.wallet.server && this.wallet._sf?.()) || 1; }
  _err(error) {
    if (!error) return null;
    if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202' || /does not exist|schema cache|could not find/i.test(error.message || '')) { this.missing = true; return 'missing'; }
    return 'network';
  }
  async price() {
    const { data, error } = await this.client.rpc('love_lock_price');
    if (error) { this._err(error); return LOVE_LOCK.price; }
    return Number.isFinite(data) ? data * this._sf() : LOVE_LOCK.price;
  }
  // The coins are taken on the server in the same step as saving the note.
  // With the server wallet (015_wallet.sql) its waiting coin changes are
  // sent first and the wallet then shows the server's balance. Before that,
  // the coins came out of the cloud save: it is uploaded first and the
  // wallet here takes the same amount (once per request id).
  async hang({ requestId, shape, name, text, price }, note) {
    const c = cleanNote(text);
    if (c.error) return { error: c.error };
    if (!LOCK_SHAPES.includes(shape)) return { error: 'shape' };
    const onServer = !!this.wallet.server;
    if (!(await (onServer ? this.wallet.flush() : this.cloud.flush()))) return { error: 'network' };
    const { data, error } = await this.client.rpc('hang_love_lock', { p_request_id: requestId, p_shape: shape, p_name: String(name || '?').slice(0, LOVE_LOCK.maxName), p_body: c.body, p_price: Math.round(price / this._sf()) });
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || data.status !== 'ok') return { error: data?.status || 'network', price: data?.price != null ? data.price * this._sf() : undefined };
    const p = Number(data.price) * this._sf() || price;
    if (!this.applied.has(requestId)) {
      this.applied.add(requestId);
      if (onServer && data.ver != null) { if (data.charged) this.wallet.charged(p, data, note); else this.wallet.charged(0, data); }
      else this.wallet.add(-p, note);
    }
    return { lock: data.lock, charged: !!data.charged };
  }
  // The friend says yes to the host's note (nothing is paid yet), or, once
  // the host has hung it, learns what they paid: { status: 'ok', half } |
  // { status: 'hung', paid, lock } | { error }. note: the budget book's line.
  async pairOk({ requestId, host, shape, text }, note) {
    if (!this.wallet.server) return { error: 'network' };
    if (!(await this.wallet.flush())) return { error: 'network' };
    const { data, error } = await this.client.rpc('love_lock_pair_ok', { p_request_id: requestId, p_host: host, p_shape: shape, p_body: text });
    if (error && this._pairGone(error)) return { error: 'nopair' };
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || (data.status !== 'ok' && data.status !== 'hung')) return { error: data?.status || 'network' };
    if (data.status === 'ok') return { status: 'ok', half: Number(data.half) * this._sf() };
    const paid = Number(data.paid) * this._sf() || 0;
    if (!this.applied.has(requestId)) {
      this.applied.add(requestId);
      this.wallet.charged(paid, data, note);
    }
    return { status: 'hung', paid, lock: data.lock };
  }
  // The host hangs it for both: { lock, charged, paid } or { error } (also
  // 'waiting': no yes from the friend for this note; 'partner_coins').
  async hangPair({ requestId, partner, shape, name, text, price }, note) {
    const c = cleanNote(text);
    if (c.error) return { error: c.error };
    if (!LOCK_SHAPES.includes(shape)) return { error: 'shape' };
    if (!this.wallet.server) return { error: 'network' };
    if (!(await this.wallet.flush())) return { error: 'network' };
    const { data, error } = await this.client.rpc('hang_love_lock_pair', { p_request_id: requestId, p_partner: partner, p_shape: shape,
      p_name: String(name || '?').slice(0, LOVE_LOCK.maxName), p_body: c.body, p_price: Math.round(price / this._sf()) });
    if (error && this._pairGone(error)) return { error: 'nopair' };
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || data.status !== 'ok') return { error: data?.status || 'network', price: data?.price != null ? data.price * this._sf() : undefined };
    const paid = Number(data.paid) * this._sf() || 0;
    if (!this.applied.has(requestId)) {
      this.applied.add(requestId);
      if (data.charged) this.wallet.charged(paid, data, note); else this.wallet.charged(0, data);
    }
    return { lock: data.lock, charged: !!data.charged, paid };
  }
  // The server has no locks for two yet (061 not run): only the one-person lock.
  _pairGone(error) {
    const gone = error.code === 'PGRST202' || error.code === '42883' || /could not find the function|does not exist/i.test(error.message || '');
    if (gone) this.pairs = false;
    return gone;
  }
  async page(before = null, n = LOVE_LOCK.pageSize) {
    const ask = (cols) => {
      let q = this.client.from(TABLE).select(cols).order('id', { ascending: false }).limit(n + 1);
      if (before != null) q = q.lt('id', before);
      return q;
    };
    let { data, error } = await ask('id, shape, name, name2, body, created_at');
    if (error && (error.code === '42703' || /name2/.test(error.message || ''))) ({ data, error } = await ask('id, shape, name, body, created_at')); // (before 061_pair_locks.sql)
    const e = this._err(error);
    if (e) return { error: e };
    return { rows: data.slice(0, n), more: data.length > n };
  }
}
