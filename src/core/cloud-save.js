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

const PREFIX = 'mk.';
const AT_KEY = 'mkcloud.at'; // when local data last changed (ms), not synced
const TABLE = 'saves';

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
export function pickNewer(localAt, remoteAt, localData, remoteData) {
  if (JSON.stringify(localData) === JSON.stringify(remoteData)) return 'same';
  if (!remoteAt) return 'local';
  if (!localAt || !Object.keys(localData).length) return 'remote';
  return remoteAt > localAt ? 'remote' : 'local';
}

export class CloudSave {
  constructor(cfg) {
    this.cfg = cfg;
    this.client = null;
    this.user = null;
    this.status = 'local'; // 'local' | 'cloud' | 'error'
    this.lastJson = null;
    this.listeners = [];
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
    const which = pickNewer(localAt, remoteAt, local, row?.data || {});
    if (which === 'remote') {
      applySnapshot(row.data);
      localStorage.setItem(AT_KEY, String(remoteAt));
      this.lastJson = JSON.stringify(snapshot());
    } else if (which === 'local') {
      await this._upload(local);
    } else this.lastJson = JSON.stringify(local);
    this._set('cloud');
  }

  async _upload(data = snapshot()) {
    const json = JSON.stringify(data);
    const now = new Date();
    const { error } = await this.client.from(TABLE).upsert({ user_id: this.user.id, data, updated_at: now.toISOString() });
    if (error) throw error;
    this.lastJson = json;
    localStorage.setItem(AT_KEY, String(now.getTime()));
  }

  // Upload when the saved data changes (checked every few seconds and when
  // the page is hidden or closed).
  _watch() {
    const tick = async () => {
      const data = snapshot();
      const json = JSON.stringify(data);
      if (json === this.lastJson) return;
      localStorage.setItem(AT_KEY, String(Date.now())); // changed here, now
      if (!this.client || !this.user) return;
      try { await this._upload(data); this._set('cloud'); } catch { this._set('error'); }
    };
    setInterval(tick, 8000);
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') tick(); });
    addEventListener('pagehide', tick);
  }

  onChange(f) { this.listeners.push(f); }
  _set(s) { this.status = s; this.listeners.forEach((f) => f(s)); }
}
