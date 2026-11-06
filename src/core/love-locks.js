// Love locks (사랑의 자물쇠) at the Namsan summit: pick a lock, write a note
// (up to 20 lines) and pay coins to hang it. Everyone can read the notes in
// a list, newest first, a page at a time.
//
// The 3D heart on the summit is fixed decoration; a lock someone hangs is a
// row on the server, never a new 3D object.
//
// On the server (supabase/007_love_locks.sql) one function takes the coins
// from the player's cloud save and saves the note together, so the two can
// never disagree. A request id per note makes a double tap (or a retry after
// a dropped connection) hang one lock and charge once. Without the server
// (local play, tests) the notes stay in this browser.

export const LOCK_SHAPES = ['heart', 'circle', 'square', 'star'];
// Settings. The price is also kept on the server (love_lock_settings in
// 007_love_locks.sql), which wins whenever the game is online: change it
// there to change it for everyone, and here for offline play.
export const LOVE_LOCK = {
  price: 30, // coins
  pageSize: 10, // notes per page in the list
  maxLines: 20,
  maxChars: 1000,
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
  }
  get client() { return this.cloud.client; }
  _err(error) {
    if (!error) return null;
    if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202' || /does not exist|schema cache|could not find/i.test(error.message || '')) { this.missing = true; return 'missing'; }
    return 'network';
  }
  async price() {
    const { data, error } = await this.client.rpc('love_lock_price');
    if (error) { this._err(error); return LOVE_LOCK.price; }
    return Number.isFinite(data) ? data : LOVE_LOCK.price;
  }
  // The coins are taken on the server (from the cloud save) in the same
  // step as saving the note; the wallet here then takes the same amount
  // (once per request id) so the two copies agree. The save is uploaded
  // first so the server sees the coins this browser has right now.
  async hang({ requestId, shape, name, text, price }, note) {
    const c = cleanNote(text);
    if (c.error) return { error: c.error };
    if (!LOCK_SHAPES.includes(shape)) return { error: 'shape' };
    if (!(await this.cloud.flush())) return { error: 'network' };
    const { data, error } = await this.client.rpc('hang_love_lock', { p_request_id: requestId, p_shape: shape, p_name: String(name || '?').slice(0, LOVE_LOCK.maxName), p_body: c.body, p_price: price });
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || data.status !== 'ok') return { error: data?.status || 'network', price: data?.price };
    const p = Number(data.price) || price;
    if (!this.applied.has(requestId)) { this.applied.add(requestId); this.wallet.add(-p, note); }
    return { lock: data.lock, charged: !!data.charged };
  }
  async page(before = null, n = LOVE_LOCK.pageSize) {
    let q = this.client.from(TABLE).select('id, shape, name, body, created_at').order('id', { ascending: false }).limit(n + 1);
    if (before != null) q = q.lt('id', before);
    const { data, error } = await q;
    const e = this._err(error);
    if (e) return { error: e };
    return { rows: data.slice(0, n), more: data.length > n };
  }
}
