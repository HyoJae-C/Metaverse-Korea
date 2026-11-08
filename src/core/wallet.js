// Money (Korean won, game money with no cash value) and rewarded ads.
// The code still says "coins" for the balance; every amount is in won.
//
// The balance lives on the server (supabase/015_wallet.sql): the browser
// can't change it, only ask the server to. The game still calls add(),
// spend() and take() and gets an answer at once; each change is queued as an
// op with its own id and sent in the background (wallet_apply). The server
// refuses spending more than the balance, caps earning per reward and per
// day, and answers with the real balance, which the wallet then shows. Ops
// are kept in this browser until the server has them, so nothing is lost
// offline, and an op sent twice only counts once.
//
// The first time an account opens its server wallet (wallet_open), the coins
// this browser had are brought over, once, up to a cap. Until the SQL is set
// up (or with no Supabase, as in tests and ?debug), the wallet works in this
// browser only, as it always did ("local" mode).
//
// Rewarded ads: the real ad is Google's H5 Games Ads (core/h5-ads.js), passed
// to watchAd() as `show`; it falls back to demoAd() below until AdSense
// serves ads. H5 ads have no server-side verification, so the server keeps
// the daily limit and the time between ads (wallet_ad).
//
// Note: rewards are still worked out by the games in the browser, so the
// server can only cap them, not check them.

import { OLD_COIN_WON } from './money.js';

const KEY = 'mk.wallet'; // the browser-only wallet (local mode)
// The server wallet's copy here: { uid, base (server balance), ver, ads,
// adsDay, queue: [ops not yet confirmed] }. Not "mk." so the cloud save
// leaves it alone.
const STATE_KEY = 'mkw.state';
// The budget book (가계부): the last LOG_MAX coins in and out, newest last.
// Each entry: { t: time (ms), n: +earned / -spent, bal: balance after,
// note: what it was for, or null }. A note is { k, v } (an i18n key and
// its {vars}), { name, at } (a thing's and a place's name objects), or both.
const LOG_KEY = 'mk.ledger';
export const LOG_MAX = 100;
// Travel money every player gets once (new players at the start; players
// from before it existed the next time they play). When it goes up, players
// who got the old amount get the difference on their next visit. `gift` in
// the save is how much was given (1 = the first 500). With the server
// wallet, the server gives it (wallet_settings.welcome).
export const WELCOME_COINS = 1000000; // ₩1,000,000
// gift saved before won (no `u` in the save) was in coins.
const giftGiven = (g, old = false) => (g === 1 ? 500 * OLD_COIN_WON : Math.max(0, Math.floor(Number(g) || 0)) * (old ? OLD_COIN_WON : 1));
const BATCH = 50; // ops per wallet_apply call
const RESELL_PCT = 10;
// What the server counts in: 'krw' once supabase/018_won.sql has run. Before
// that it still counts old coins, and the wallet changes amounts on the way
// in and out (SERVER_OLD).
const SERVER_OLD = OLD_COIN_WON; // second-hand shops in a browser-only wallet (core/resale.js)
const QUEUE_MAX = 500; // more than this waiting: the oldest are dropped
// Server errors meaning "the SQL isn't run yet".
const missing = (e) => !!e && (e.code === 'PGRST202' || e.code === '42883' || e.code === 'PGRST205' || /could not find the function|does not exist/i.test(e.message || ''));

// The browser-only wallet. `u: 1` marks a save in won; older saves (coins)
// are turned into won here (also when one comes back from the cloud save).
function read() {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) || '{}');
    const old = !w.u && w.coins != null;
    const gift = w.gift === true ? 1 : Math.max(0, Math.floor(Number(w.gift) || 0));
    return { u: 1, coins: Math.max(0, Math.floor(Number(w.coins) || 0)) * (old ? OLD_COIN_WON : 1), day: String(w.day || ''), ads: Number(w.ads) || 0, gift: giftGiven(gift, old) };
  } catch { return { u: 1, coins: 0, day: '', ads: 0, gift: 0 }; }
}
function write(w) {
  try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* storage blocked */ }
}
function readState() {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    if (!s || typeof s.uid !== 'string') return null;
    // Ops queued before won (no `u`) are in coins.
    const queue = Array.isArray(s.queue) ? s.queue.filter((o) => o && typeof o.id === 'string' && Number.isFinite(o.n))
      .map((o) => (o.w ? o : { ...o, n: o.n * OLD_COIN_WON, w: 1 })) : [];
    const f = s.u ? 1 : OLD_COIN_WON;
    return { uid: s.uid, u: 1, unit: s.unit === 'krw' ? 'krw' : 'coin', base: Math.max(0, Math.floor(Number(s.base) || 0)) * f, ver: Number(s.ver) || 0, ads: Math.max(0, Number(s.ads) || 0), adsDay: String(s.adsDay || ''), queue };
  } catch { return null; }
}
function readLog() {
  try {
    // Entries from before won (no `w`) were in coins.
    const l = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    return Array.isArray(l) ? l.filter((e) => e && Number.isFinite(e.n) && Number.isFinite(e.t))
      .map((e) => (e.w ? e : { ...e, n: e.n * OLD_COIN_WON, bal: (Number(e.bal) || 0) * OLD_COIN_WON, w: 1 })) : [];
  } catch { return []; }
}
function writeLog(l) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(l)); } catch { /* storage blocked */ }
}
const today = () => new Date().toISOString().slice(0, 10);
// The server counts ads per Korean day.
export const kstDay = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

export function newOpId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  return uuidFromBytes(b);
}
// A fixed op id from a text (an event code's id, say): the server then takes
// it once per account however often it is sent.
export async function opIdFor(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return uuidFromBytes(new Uint8Array(buf).slice(0, 16));
}
// The same, at once (no await): for rewards given once ever (a medal, a
// stamp) or once a day (the check-in), so clearing the browser's storage
// can't earn them twice on the server.
export function onceId(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
  const str = 'once:' + String(text);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193); h2 = Math.imul(h2 ^ c, 0x5bd1e995);
    h3 = Math.imul(h3 ^ c, 0x27d4eb2d); h4 = Math.imul(h4 ^ c, 0x165667b1);
  }
  const b = new Uint8Array(16);
  [h1, h2 ^ h1, h3 ^ h2, h4 ^ h3].forEach((h, k) => { for (let j = 0; j < 4; j++) b[k * 4 + j] = (h >>> (j * 8)) & 255; });
  return uuidFromBytes(b);
}
function uuidFromBytes(b) {
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
// A short text for the server's ledger, so the operator can see what it was for.
export function noteText(note) {
  if (!note) return null;
  const nm = (x) => (x && typeof x === 'object' ? x.en || Object.values(x)[0] : x);
  const parts = [note.k, nm(note.name), nm(note.at)].filter((x) => typeof x === 'string' && x);
  return parts.length ? parts.join(' · ').slice(0, 80) : null;
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r({ error: { message: 'timeout' } }), ms))]);

export class Wallet {
  constructor(cfg) {
    this.cfg = cfg;
    this.w = read();
    this.s = readState(); // set: the server wallet (maybe not reached yet this visit)
    this.log = readLog();
    this.listeners = [];
    this.client = null;
    this.welcomed = 0; // welcome money the server gave on opening
    this.lastOp = null; // the id of the last change (for a refund later)
    // The share second-hand shops pay for clothes (core/resale.js): the
    // server's when it has one, null when its SQL (017_resale.sql) isn't run.
    this.resellPct = RESELL_PCT;
    this._sending = null;
    this._timer = null;
    this._retry = 0;
    // What the player is doing right now ({ name } of the shop they are in,
    // say), used as the note when a caller gives none. Set by the game.
    this.context = null;
  }
  // True once coins are kept on the server.
  get server() { return !!this.s; }
  get coins() {
    if (!this.s) return this.w.coins;
    return Math.max(0, this.s.base + this.s.queue.reduce((a, o) => a + o.n, 0));
  }

  // Open the server wallet for this account (cloud: the game's CloudSave,
  // signed in). Brings this browser's coins over the first time. Resolves
  // 'server', 'offline' (server wallet, not reached now: keeps queueing) or
  // 'local'. Never throws.
  async connect(cloud, timeoutMs = 4000) {
    const client = cloud?.client, uid = cloud?.user?.id;
    if (!client || !uid) return this.s ? 'offline' : 'local';
    if (this.s && this.s.uid !== uid) { this.s = null; this._saveState(); } // another account's copy
    this.client = client;
    let res;
    const local = this.w.coins;
    const ask = (args) => withTimeout(client.rpc('wallet_open', args), timeoutMs).catch((e) => ({ error: e }));
    // In won (018_won.sql); a server from before it only knows coins.
    res = await ask({ p_local: local, p_gift: giftGiven(this.w.gift), p_unit: 'krw' });
    let unit = 'krw';
    if (missing(res?.error)) {
      unit = 'coin';
      res = await ask({ p_local: Math.floor(local / SERVER_OLD), p_gift: Math.floor(giftGiven(this.w.gift) / SERVER_OLD) });
    }
    const { data, error } = res || {};
    if (error || data?.status !== 'ok') {
      if (missing(error)) { this.client = null; this.s = null; this._saveState(); return 'local'; }
      if (this.s) this._later();
      return this.s ? 'offline' : 'local';
    }
    if (data.unit !== 'krw') unit = 'coin';
    const f = unit === 'krw' ? 1 : SERVER_OLD;
    // Brought over just now: the queue (from this browser's balance) is in it.
    const queue = data.created || !this.s ? [] : this.s.queue;
    this.s = { uid, u: 1, unit, base: (Number(data.coins) || 0) * f, ver: Number(data.ver) || 0, ads: Number(data.ads_left) || 0, adsDay: kstDay(), queue };
    this.welcomed = (Number(data.welcome) || 0) * f;
    if (this.welcomed > 0) this._log(this.welcomed, { k: 'ledger.welcome' });
    // Coins that moved here while the server was being asked.
    const late = this.s && data.created ? this.w.coins - local : 0;
    if (late > 0) this.s.queue.push({ id: newOpId(), n: late, k: 'earn', r: 'late', w: 1 });
    else if (late < 0) this.s.queue.push({ id: newOpId(), n: late, k: 'take', w: 1 });
    this._saveState();
    this._notify();
    this.flush();
    this._askResellPct(client, timeoutMs);
    return 'server';
  }
  async _askResellPct(client, timeoutMs) {
    this.resellPct = null;
    let res;
    try { res = await withTimeout(client.rpc('wallet_resell_pct'), timeoutMs); } catch (e) { res = { error: e }; }
    const n = Number(res?.data);
    if (!res?.error && res?.data != null && Number.isFinite(n)) this.resellPct = Math.max(0, Math.min(90, Math.round(n)));
  }

  // Sell something back at a second-hand shop (core/resale.js). r: { id
  // (a fixed op id, so asking again never pays twice), n (coins asked), ref
  // (the purchase's op id) or bn + paid (its note and price), note (for the
  // budget book) }. With the server wallet this waits for the server, which
  // pays from its own ledger. Resolves { ok, n (coins paid), why }: why is
  // 'offline', 'closed' (the server doesn't buy yet), 'noref' (no such
  // purchase there) or 'sold' (sold before: ok, nothing more paid).
  async resell(r) {
    if (!this.s) {
      this.add(r.n, r.note);
      return { ok: true, n: r.n };
    }
    if (!this.client) return { ok: false, n: 0, why: 'offline' };
    if (this.resellPct == null) return { ok: false, n: 0, why: 'closed' };
    if (!(await this.flush())) return { ok: false, n: 0, why: 'offline' }; // the purchase must be there first
    const op = { id: r.id, n: Math.round(r.n), k: 'resell', w: 1 };
    if (r.ref) op.ref = r.ref;
    else { op.bn = r.bn; op.paid = r.paid; }
    const txt = noteText(r.note);
    if (txt) op.note = txt;
    const out = this._out(op);
    if (out.paid != null) out.paid = this._sf() === 1 ? op.paid : Math.round(op.paid / this._sf());
    let res;
    try { res = await withTimeout(this.client.rpc('wallet_apply', { p_ops: [out] }), 8000); } catch (e) { res = { error: e }; }
    const { data, error } = res || {};
    const got = data?.results?.[0];
    if (error || data?.status !== 'ok' || !got) return { ok: false, n: 0, why: 'offline' };
    const n = Math.max(0, Number(got.n) || 0) * this._sf();
    this._fromServer(data);
    if (n) this._log(n, r.note);
    this._notify();
    if (got.status === 'ok' || got.status === 'cap') return { ok: true, n };
    if (got.status === 'sold') return { ok: true, n: 0, why: 'sold' };
    if (got.status === 'bad') return { ok: false, n: 0, why: 'closed' }; // an older wallet_apply
    return { ok: false, n: 0, why: 'noref' };
  }

  // Gives the welcome travel money once; returns the coins given (0 if done before).
  welcome(n = WELCOME_COINS) {
    if (this.s) { const g = this.welcomed; this.welcomed = 0; return g; }
    const more = n - giftGiven(this.w.gift);
    if (more <= 0) return 0;
    this.w.gift = n;
    this.add(more, { k: 'ledger.welcome' });
    return more;
  }
  // Totals for one local day (default today): { in, out } in coins.
  dayTotals(d = new Date()) {
    const same = (t) => { const x = new Date(t); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate(); };
    let inn = 0, out = 0;
    for (const e of this.log) if (same(e.t)) { if (e.n > 0) inn += e.n; else out -= e.n; }
    return { in: inn, out };
  }
  adsLeft() {
    if (this.s) return this.s.adsDay === kstDay() ? this.s.ads : this.cfg.dailyLimit;
    return this.w.day === today() ? Math.max(0, this.cfg.dailyLimit - this.w.ads) : this.cfg.dailyLimit;
  }
  // note: what the coins were for (see LOG_KEY); left out, the current context.
  // opt: { kind: 'earn'|'spend'|'take'|'refund', ref (refund: the payment's
  // op id), id (a fixed op id), r (earning: the reward, one of REWARDS; the
  // server pays each up to its own limits), once (a text: a fixed op id made
  // from it) }. Returns the op id.
  add(n, note, opt = {}) {
    n = Math.round(Number(n) || 0);
    let id = null;
    if (this.s) {
      if (n) {
        id = opt.id || (opt.once ? onceId(opt.once) : newOpId());
        const kind = opt.kind || (n > 0 ? 'earn' : 'spend');
        const op = { id, n, k: kind, w: 1 };
        if (kind === 'earn' && opt.r) op.r = opt.r;
        if (kind === 'refund' && opt.ref) op.ref = opt.ref;
        const txt = noteText(note === undefined ? this._ctx() : note);
        if (txt) op.note = txt;
        this.s.queue.push(op);
        if (this.s.queue.length > QUEUE_MAX) this.s.queue.splice(0, this.s.queue.length - QUEUE_MAX);
        this._saveState();
        this._soon();
      }
    } else {
      this.w.coins = Math.max(0, this.w.coins + n);
      write(this.w);
    }
    if (n) this._log(n, note);
    this.lastOp = id;
    this._notify();
    return id;
  }
  // Pay n coins if there are enough; returns true when paid (lastOp: its id).
  spend(n, note) {
    if (n > this.coins) return false;
    this.add(-n, note, { kind: 'spend' });
    return true;
  }
  // Take up to n coins (a fine never makes the balance negative); returns what was taken.
  take(n, note) {
    const k = Math.min(n, this.coins);
    if (k > 0) this.add(-k, note, { kind: 'take' });
    return k;
  }
  // Give back (up to) n coins of a payment (ref: spend()'s lastOp). Without
  // its id it counts as earning.
  refund(n, ref, note) {
    return this.add(Math.abs(n), note, ref ? { kind: 'refund', ref } : {});
  }
  onChange(f) { this.listeners.push(f); }

  // The server took coins itself (a love lock): show its balance.
  // r: the server's answer { coins, ver }.
  charged(n, r, note) {
    if (!this.s) return this.add(-n, note);
    if (n) this._log(-Math.abs(n), note);
    this._fromServer(r);
    this._notify();
  }

  // Send the waiting ops now. Resolves true when the server has all of them.
  async flush() {
    if (!this.s || !this.client) return false;
    while (this._sending) await this._sending;
    if (!this.s.queue.length) return true;
    this._sending = this._send().finally(() => { this._sending = null; });
    const ok = await this._sending;
    return ok && !this.s?.queue.length ? true : ok ? this.flush() : false;
  }

  async _send() {
    clearTimeout(this._timer); this._timer = null;
    const ops = this.s.queue.slice(0, BATCH);
    let res;
    try { res = await withTimeout(this.client.rpc('wallet_apply', { p_ops: ops.map((o) => this._out(o)) }), 8000); } catch (e) { res = { error: e }; }
    const { data, error } = res || {};
    if (error || data?.status !== 'ok' || !this.s) { this._later(); return false; }
    const sent = new Set(ops.map((o) => o.id));
    this.s.queue = this.s.queue.filter((o) => !sent.has(o.id));
    this._fromServer(data);
    this._retry = 0;
    this._saveState();
    this._notify();
    return true;
  }

  // Shows a rewarded ad; resolves to the coins earned (0 if skipped or none left).
  async watchAd(show) {
    if (this.adsLeft() <= 0) return 0;
    const done = await show(this.cfg.seconds);
    if (!done) return 0;
    if (this.s && this.client) {
      const id = newOpId();
      for (let i = 0; i < 2; i++) { // once more if the network dropped
        let res;
        try { res = await withTimeout(this.client.rpc('wallet_ad', { p_op: id }), 8000); } catch (e) { res = { error: e }; }
        const { data, error } = res || {};
        if (error || !data) continue;
        if (data.status !== 'ok') { if (data.status === 'limit') { this.s.ads = 0; this.s.adsDay = kstDay(); this._saveState(); } return 0; }
        const n = (Number(data.granted) || 0) * this._sf();
        this.s.ads = Number(data.ads_left) || 0; this.s.adsDay = kstDay();
        if (n) this._log(n, { k: 'ledger.ad' });
        this._fromServer(data);
        this._saveState();
        this._notify();
        return n;
      }
      return 0;
    }
    if (this.s) return 0; // server wallet, not reached: no coins this time
    if (this.w.day !== today()) { this.w.day = today(); this.w.ads = 0; }
    this.w.ads += 1;
    this.add(this.cfg.reward, { k: 'ledger.ad' });
    return this.cfg.reward;
  }

  // Take the server's balance if it is newer than the one we have.
  _fromServer(r) {
    const ver = Number(r?.ver), coins = Number(r?.coins);
    if (!this.s || !Number.isFinite(coins) || !Number.isFinite(ver) || ver < this.s.ver) return;
    this.s.base = Math.max(0, coins) * this._sf();
    this.s.ver = ver;
    this._saveState();
  }
  // How many won one server unit is: 1, or a coin on a server from before won.
  _sf() { return this.s?.unit === 'krw' ? 1 : SERVER_OLD; }
  // An op as the server wants it: in won with u: 'krw', or in coins.
  _out(o) {
    const { w: _w, ...op } = o;
    if (this._sf() === 1) return { ...op, u: 'krw' };
    return { ...op, n: Math.round(o.n / SERVER_OLD) };
  }
  _ctx() { try { return this.context?.() || null; } catch { return null; } }
  _log(n, note) {
    this.log.push({ t: Date.now(), n, bal: this.coins, note: note === undefined ? this._ctx() : note, w: 1 });
    if (this.log.length > LOG_MAX) this.log.splice(0, this.log.length - LOG_MAX);
    writeLog(this.log);
  }
  _notify() { const c = this.coins; this.listeners.forEach((f) => f(c)); }
  _saveState() {
    try {
      if (this.s) localStorage.setItem(STATE_KEY, JSON.stringify(this.s));
      else localStorage.removeItem?.(STATE_KEY);
    } catch { /* storage blocked */ }
  }
  // Send shortly (changes close together go in one call).
  _soon() {
    if (!this.client || this._timer || this._sending) return;
    this._timer = setTimeout(() => { this._timer = null; this.flush(); }, 1500);
  }
  // The server didn't answer: try again later, waiting longer each time.
  _later() {
    if (!this.client || this._timer) return;
    const ms = Math.min(60000, 2000 * 2 ** this._retry++);
    this._timer = setTimeout(() => { this._timer = null; this.flush(); }, ms);
  }
}

// Demo "ad": a countdown overlay the player can close early (no reward).
export function demoAd(el, countEl, closeBtn) {
  return (seconds) => new Promise((resolve) => {
    let left = seconds;
    el.hidden = false;
    countEl.textContent = left;
    const timer = setInterval(() => {
      left -= 1;
      countEl.textContent = Math.max(0, left);
      if (left <= 0) finish(true);
    }, 1000);
    const finish = (ok) => {
      clearInterval(timer);
      el.hidden = true;
      closeBtn.onclick = null;
      resolve(ok);
    };
    closeBtn.onclick = () => finish(false);
  });
}
