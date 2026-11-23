// Who may send gifts: an account at least 7 days old with 3 hours of play
// (Yozi 2026-11-24; supabase/073_gift_age.sql). The server says, through
// gift_wait(); the answer is kept for a few minutes. The server also refuses
// the payment itself, so this is only so the player is told before paying.
// No server (offline, or 073 not run yet): not held back here.
// No DOM, so it can be unit-tested.

const KEEP_MS = 5 * 60 * 1000;

export class GiftGate {
  // wallet: the wallet, or a function that returns it.
  constructor({ wallet, now = () => Date.now() }) {
    this._wallet = typeof wallet === 'function' ? wallet : () => wallet;
    this.now = now;
    this.w = undefined; // undefined: not asked yet; null: no answer (not held back)
    this.at = 0;
    this.busy = null;
  }
  // Ask the server (at most once every few minutes). Resolves the answer.
  check() {
    if (this.w !== undefined && this.now() - this.at < KEEP_MS) return Promise.resolve(this.w);
    if (this.busy) return this.busy;
    this.busy = (async () => {
      const c = this._wallet()?.client;
      let w = null;
      if (c && this._wallet()?.server) {
        try {
          const { data, error } = await Promise.race([c.rpc('gift_wait'), new Promise((r) => setTimeout(() => r({ error: 'timeout' }), 5000))]);
          if (!error && data && typeof data.ok === 'boolean') w = data;
        } catch { /* no answer */ }
      }
      this.w = w;
      this.at = this.now();
      this.busy = null;
      return w;
    })();
    return this.busy;
  }
  // Known now: undefined (ask first), or the words for why not (null: may send).
  // t: the game's t(key, vars).
  why(t) {
    if (this.w === undefined) return undefined;
    if (this.now() - this.at >= KEEP_MS) this.check(); // (refresh for next time)
    const w = this.w;
    if (!w || w.ok) return null;
    return t('gift.young', { minDays: w.min_days, minHours: w.min_hours, days: w.days, hours: w.hours });
  }
  // Run go() if I may send gifts, else show the reason with toast(text).
  gate(t, toast, go) {
    const why = this.why(t);
    if (why === undefined) { this.check().then(() => this.gate(t, toast, go)); return; }
    if (why) { toast(why); return; }
    go();
  }
}
