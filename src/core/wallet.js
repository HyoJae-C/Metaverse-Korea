// Coins (virtual, no cash value) and rewarded ads.
//
// For now the wallet lives in this browser and the ad is a demo countdown, so
// coins are easy to cheat and must not buy anything valuable yet. Before real
// rewards: keep the balance on the server and grant coins only after the ad
// network confirms the view.
//
// The real ad is Google's H5 Games Ads (core/h5-ads.js), passed to watchAd()
// as `show`; it falls back to demoAd() below until AdSense serves ads. The
// reward is still granted here in the browser: when coins move to the server,
// grant them there instead (H5 ads have no server-side verification, so the
// server should keep the daily limit).

const KEY = 'mk.wallet';
// The budget book (가계부): the last LOG_MAX coins in and out, newest last.
// Each entry: { t: time (ms), n: +earned / -spent, bal: balance after,
// note: what it was for, or null }. A note is { k, v } (an i18n key and
// its {vars}), { name, at } (a thing's and a place's name objects), or both.
const LOG_KEY = 'mk.ledger';
export const LOG_MAX = 100;
// Travel money every player gets once (new players at the start; players
// from before it existed the next time they play). When it goes up, players
// who got the old amount get the difference on their next visit. `gift` in
// the save is how much was given (1 = the first 500).
export const WELCOME_COINS = 1000;
const giftGiven = (g) => (g === 1 ? 500 : Math.max(0, Math.floor(Number(g) || 0)));

function read() {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { coins: Math.max(0, Math.floor(Number(w.coins) || 0)), day: String(w.day || ''), ads: Number(w.ads) || 0, gift: w.gift === true ? 1 : Math.max(0, Math.floor(Number(w.gift) || 0)) };
  } catch { return { coins: 0, day: '', ads: 0, gift: 0 }; }
}
function write(w) {
  try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* storage blocked */ }
}
function readLog() {
  try {
    const l = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    return Array.isArray(l) ? l.filter((e) => e && Number.isFinite(e.n) && Number.isFinite(e.t)) : [];
  } catch { return []; }
}
function writeLog(l) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(l)); } catch { /* storage blocked */ }
}
const today = () => new Date().toISOString().slice(0, 10);

export class Wallet {
  constructor(cfg) {
    this.cfg = cfg;
    this.w = read();
    this.log = readLog();
    this.listeners = [];
    // What the player is doing right now ({ name } of the shop they are in,
    // say), used as the note when a caller gives none. Set by the game.
    this.context = null;
  }
  get coins() { return this.w.coins; }
  // Gives the welcome travel money once; returns the coins given (0 if done before).
  welcome(n = WELCOME_COINS) {
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
    return this.w.day === today() ? Math.max(0, this.cfg.dailyLimit - this.w.ads) : this.cfg.dailyLimit;
  }
  // note: what the coins were for (see LOG_KEY); left out, the current context.
  add(n, note) {
    n = Math.round(Number(n) || 0);
    this.w.coins = Math.max(0, this.w.coins + n);
    write(this.w);
    if (n) {
      let ctx = null;
      if (note === undefined) { try { ctx = this.context?.() || null; } catch { ctx = null; } }
      this.log.push({ t: Date.now(), n, bal: this.w.coins, note: note === undefined ? ctx : note });
      if (this.log.length > LOG_MAX) this.log.splice(0, this.log.length - LOG_MAX);
      writeLog(this.log);
    }
    this.listeners.forEach((f) => f(this.w.coins));
  }
  // Pay n coins if there are enough; returns true when paid.
  spend(n, note) {
    if (n > this.w.coins) return false;
    this.add(-n, note);
    return true;
  }
  // Take up to n coins (a fine never makes the balance negative); returns what was taken.
  take(n, note) {
    const k = Math.min(n, this.w.coins);
    if (k > 0) this.add(-k, note);
    return k;
  }
  onChange(f) { this.listeners.push(f); }

  // Shows a rewarded ad; resolves to the coins earned (0 if skipped or none left).
  async watchAd(show) {
    if (this.adsLeft() <= 0) return 0;
    const done = await show(this.cfg.seconds);
    if (!done) return 0;
    if (this.w.day !== today()) { this.w.day = today(); this.w.ads = 0; }
    this.w.ads += 1;
    this.add(this.cfg.reward, { k: 'ledger.ad' });
    return this.cfg.reward;
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
