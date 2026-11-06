// Cloud save: the game keeps its data in this browser (localStorage keys that
// start with "mk."). This copies that data to a Supabase table for the
// player's account, so it survives clearing the browser and, once Google
// sign-in is linked, moves between devices.
//
// Accounts start as anonymous guests (no sign-up). A guest can later link a
// Google login and keep the same account and data.
//
// If Supabase isn't configured, anonymous sign-in is off, or the table is
// missing, the game quietly keeps saving on this device only.
//
// Note: the browser writes its own save, so coins and items are not cheat-
// proof yet. Paid items must be checked on the server later.
//
// One device at a time: a signed-in account can be open on a phone and a PC
// at once. Each page load claims the save, and every upload only goes
// through if nobody else has written since this device last did (the row's
// updated_at is the version). If another device got there first, this one
// stops saving and tells the player, instead of overwriting the other
// device's progress with its own older copy.

const PREFIX = 'mk.';
const AT_KEY = 'mkcloud.at'; // when local data last changed (ms), not synced
const TABLE = 'saves';
const OWNER_KEY = 'mkcloud.uid'; // which account the data on this device belongs to
const DEVICE_KEY = 'mkcloud.device'; // inside the row's data: which page load wrote it last

export function snapshot(storage = localStorage) {
  const out = {};
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(PREFIX)) out[k] = storage.getItem(k);
  }
  return out;
}

export function applySnapshot(data, storage = localStorage) {
  for (const [k, v] of Object.entries(data || {})) {
    if (k.startsWith(PREFIX) && typeof v === 'string') storage.setItem(k, v);
  }
}

// Which copy wins: the newer one. Returns 'remote', 'local' or 'same'.
// switched: this device's data belongs to another account (e.g. a guest that
// then signed in with Google on a second device): the account's save wins.
export function pickNewer(localAt, remoteAt, localData, remoteData, switched = false) {
  if (JSON.stringify(localData) === JSON.stringify(remoteData)) return 'same';
  if (switched && remoteAt) return 'remote';
  if (!remoteAt) return 'local';
  if (!localAt || !Object.keys(localData).length) return 'remote';
  return remoteAt > localAt ? 'remote' : 'local';
}

// Was the save written by another device since this one last wrote it?
// row: { updated_at, data } as read now; mine: the updated_at this device
// last wrote or read; device: this page load's id.
export function takenOver(row, mine, device) {
  if (!row || !mine) return false;
  if (Date.parse(row.updated_at) === Date.parse(mine)) return false;
  return row.data?.[DEVICE_KEY] !== device;
}

// Remember (for this tab) that we left for Google's sign-in, so the start
// screen can skip straight into the game when we come back.
function markOAuth() {
  try { sessionStorage.setItem('mk.oauth', '1'); } catch { /* ignore */ }
}

export class CloudSave {
  constructor(cfg) {
    this.cfg = cfg;
    this.client = null;
    this.user = null;
    this.status = 'local'; // 'local' | 'cloud' | 'error'
    this.lastJson = null;
    this.listeners = [];
    this.device = globalThis.crypto?.randomUUID?.() || String(Math.random()).slice(2);
    this.version = null; // updated_at of the row as this device last saw it
    this.parked = false; // another device took over: stop saving
    this.elsewhereListeners = [];
  }

  get guest() { return !!this.user?.is_anonymous; }

  // Sign in (guest if needed) and bring the newer save onto this device.
  // Must run before the game reads its saved data. Never throws.
  async load(timeoutMs = 3000) {
    if (!this.cfg?.url || !this.cfg?.key) return this._set('local');
    try {
      await Promise.race([this._load(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))]);
    } catch (e) {
      console.info('[cloud-save] staying local:', e.message);
      this._set(this.user ? 'error' : 'local');
    }
    this._watch();
  }

  async _load() {
    const { createClient } = await import('@supabase/supabase-js');
    // Own storage key so it never clashes with the realtime client.
    this.client = createClient(this.cfg.url, this.cfg.key, { auth: { storageKey: 'mkauth', persistSession: true, autoRefreshToken: true } });
    let { data: { session } } = await this.client.auth.getSession();
    if (!session) {
      const { data, error } = await this.client.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }
    this.user = session.user;
    const { data: row, error } = await this.client.from(TABLE).select('data, updated_at').eq('user_id', this.user.id).maybeSingle();
    if (error) throw error;
    const local = snapshot();
    const localAt = Number(localStorage.getItem(AT_KEY)) || 0;
    const remoteAt = row ? Date.parse(row.updated_at) : 0;
    const owner = localStorage.getItem(OWNER_KEY);
    const which = pickNewer(localAt, remoteAt, local, row?.data || {}, !!owner && owner !== this.user.id);
    localStorage.setItem(OWNER_KEY, this.user.id);
    this.version = row?.updated_at || null;
    if (which === 'remote') applySnapshot(row.data);
    // Claim the save for this device (also when nothing changed), so a
    // device that was open before stops saving over it.
    await this._upload(which === 'remote' ? snapshot() : local);
    this._set('cloud');
  }

  // Write the save, but only if no other device wrote since we last did.
  // Returns false (and parks this device) when another device took over.
  async _upload(data = snapshot(), tries = 2) {
    if (this.parked) return false;
    const json = JSON.stringify(data);
    const now = new Date().toISOString();
    const row = { data: { ...data, [DEVICE_KEY]: this.device }, updated_at: now };
    let written;
    if (this.version) {
      const res = await this.client.from(TABLE).update(row).eq('user_id', this.user.id).eq('updated_at', this.version).select('updated_at');
      if (res.error) throw res.error;
      written = res.data?.length > 0;
    } else {
      const res = await this.client.from(TABLE).insert({ user_id: this.user.id, ...row });
      if (res.error && res.error.code !== '23505') throw res.error; // 23505: a row appeared meanwhile
      written = !res.error;
    }
    if (!written) {
      // Someone wrote in between. If it was another device, step aside.
      const { data: cur, error } = await this.client.from(TABLE).select('data, updated_at').eq('user_id', this.user.id).maybeSingle();
      if (error) throw error;
      if (cur && cur.data?.[DEVICE_KEY] !== this.device) { this._park(); return false; }
      if (!tries) throw new Error('save kept changing');
      this.version = cur?.updated_at || null;
      return this._upload(data, tries - 1);
    }
    this.version = now;
    this.lastJson = json;
    localStorage.setItem(AT_KEY, String(Date.parse(now)));
    return true;
  }

  // Another device has the save now. Stop uploading, and make sure that when
  // this page is reloaded, the account's save wins over what is left here.
  _park() {
    if (this.parked) return;
    this.parked = true;
    localStorage.setItem(AT_KEY, '0');
    this.elsewhereListeners.forEach((f) => f());
  }

  // This tab stepped aside for another tab of the same browser (they share
  // the saved data): just stop uploading from here.
  stop() { this.parked = true; this.stoppedForTab = true; }

  // Coming back to this tab: if another device saved meanwhile, park now
  // rather than on the next change.
  async _check() {
    if (this.parked || !this.client || !this.user || !this.version) return;
    try {
      const { data: row, error } = await this.client.from(TABLE).select('data, updated_at').eq('user_id', this.user.id).maybeSingle();
      if (!error && takenOver(row, this.version, this.device)) this._park();
    } catch { /* offline: try again next time */ }
  }

  // Upload when the saved data changes (checked every few seconds and when
  // the page is hidden or closed).
  _watch() {
    const tick = async () => {
      const data = snapshot();
      const json = JSON.stringify(data);
      if (this.parked || json === this.lastJson) return;
      localStorage.setItem(AT_KEY, String(Date.now())); // changed here, now
      if (!this.client || !this.user) return;
      try { if (await this._upload(data)) this._set('cloud'); } catch { this._set('error'); }
    };
    setInterval(tick, 8000);
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') tick(); else this._check(); });
    addEventListener('pagehide', tick);
  }

  // Reserve a player name for this account (supabase/003_names.sql):
  // 'ok', 'taken', or 'offline' when the server can't be asked (no Supabase,
  // not signed in, or the table isn't set up yet), in which case the game
  // goes ahead without the check.
  async claimName(name, timeoutMs = 4000) {
    if (!this.client || !this.user) return 'offline';
    try {
      const call = this.client.rpc('claim_name', { new_name: String(name).slice(0, 16) });
      const { data, error } = await Promise.race([call, new Promise((r) => setTimeout(() => r({ error: 'timeout' }), timeoutMs))]);
      if (error) return 'offline';
      return data === 'taken' ? 'taken' : data === 'ok' ? 'ok' : 'offline';
    } catch { return 'offline'; }
  }

  // Does this player name belong to an operator account? (005_operators.sql)
  // False when it can't be asked: no badge is better than a fake one.
  async isOperator(name, timeoutMs = 4000) {
    if (!this.client) return false;
    try {
      const call = this.client.rpc('is_operator', { player_name: String(name).slice(0, 16) });
      const { data, error } = await Promise.race([call, new Promise((r) => setTimeout(() => r({ error: 'timeout' }), timeoutMs))]);
      return !error && data === true;
    } catch { return false; }
  }

  // This account's sign-in token, for realtime's private channels (the chat
  // channel checks it on the server). Null without an account.
  async accessToken() {
    if (!this.client || !this.user) return null;
    const { data } = await this.client.auth.getSession();
    return data.session?.access_token || null;
  }

  // The Google address once linked (or null).
  get email() { return this.user?.identities?.find((i) => i.provider === 'google')?.identity_data?.email || this.user?.email || null; }

  // Link Google to this guest account: same account, same save. Leaves the
  // page for Google's sign-in and comes back. Returns an error code or null.
  async linkGoogle() {
    if (!this.client || !this.user) return 'offline';
    await this._upload().catch(() => {}); // save right before leaving the page
    markOAuth();
    const { error } = await this.client.auth.linkIdentity({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } });
    if (!error) return null;
    console.info('[cloud-save] link failed:', error.message);
    return /already|exists/i.test(error.message) ? 'taken' : 'notReady';
  }

  // Sign in to a Google account used before (e.g. on another device). The
  // account's save then replaces this device's guest data.
  async signInGoogle() {
    if (!this.client) return 'offline';
    markOAuth();
    const { error } = await this.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } });
    return error ? 'notReady' : null;
  }

  // Google's own sign-in button (Google Identity Services). Google then shows
  // this site's address on its sign-in screen instead of the Supabase project
  // address, and the player never leaves the page. Returns false when it
  // can't be used (no client ID, script blocked), so the caller keeps the
  // redirect buttons above. mode(): 'link' (keep this guest's save) or
  // 'signin' (load an account used before). The page reloads after sign-in
  // so the save is loaded the normal way.
  async renderGoogleButton(el, mode, { locale = 'en', onError } = {}) {
    const clientId = this.cfg?.googleClientId;
    if (!this.client || !clientId || !el) return false;
    try {
      const gis = await loadGis();
      if (!this._gisReady) {
        this._gisReady = true;
        this._nonce = randomNonce();
        gis.initialize({
          client_id: clientId,
          nonce: await sha256Hex(this._nonce),
          use_fedcm_for_button: true,
          callback: (res) => this._onGoogleToken(res.credential).then((err) => (err ? this._gisError?.(err) : location.reload())),
        });
      }
      this._gisMode = mode;
      this._gisError = onError;
      el.replaceChildren();
      gis.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'center', locale, width: buttonWidth(el) });
      return true;
    } catch (e) {
      console.info('[cloud-save] Google button unavailable:', e?.message || e);
      return false;
    }
  }

  async _onGoogleToken(token) {
    const signin = this._gisMode?.() === 'signin' || !this.user;
    if (!signin) await this._upload().catch(() => {});
    const creds = { provider: 'google', token, nonce: this._nonce };
    const { error } = signin ? await this.client.auth.signInWithIdToken(creds) : await this.client.auth.linkIdentity(creds);
    if (!error) return null;
    console.info('[cloud-save] Google sign-in failed:', error.message);
    return /already|exists/i.test(error.message) ? 'taken' : 'notReady';
  }

  onChange(f) { this.listeners.push(f); }
  // Called once when another device takes over this account's save.
  onElsewhere(f) { this.elsewhereListeners.push(f); if (this.parked && !this.stoppedForTab) f(); }
  _set(s) { this.status = s; this.listeners.forEach((f) => f(s)); }
}

let gisPromise = null;
function loadGis() {
  if (globalThis.google?.accounts?.id) return Promise.resolve(globalThis.google.accounts.id);
  gisPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => (globalThis.google?.accounts?.id ? resolve(globalThis.google.accounts.id) : reject(new Error('no gis')));
    script.onerror = () => { gisPromise = null; reject(new Error('gis blocked')); };
    document.head.appendChild(script);
    setTimeout(() => reject(new Error('gis timeout')), 8000);
  });
  return gisPromise;
}

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Google's button needs a pixel width (200-400). The empty slot is hidden, so
// measure the panel around it instead.
function buttonWidth(el) {
  const box = el.parentElement;
  const pad = box ? parseFloat(getComputedStyle(box).paddingLeft) + parseFloat(getComputedStyle(box).paddingRight) : 0;
  const w = (box?.clientWidth || 0) - pad;
  return Math.round(Math.min(400, Math.max(200, w || 280)));
}
