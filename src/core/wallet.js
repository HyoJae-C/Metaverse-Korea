// Coins (virtual, no cash value) and rewarded ads.
//
// For now the wallet lives in this browser and the ad is a demo countdown, so
// coins are easy to cheat and must not buy anything valuable yet. Before real
// rewards: keep the balance on the server and grant coins only after the ad
// network confirms the view.
//
// A real provider plugs in behind showRewardedAd(): for the web that is Google
// Ad Manager rewarded ads (GPT, googletag.enums.OutOfPageFormat.REWARDED),
// which needs an approved Ad Manager account, a privacy policy and a consent
// banner (CMP) for EU/UK visitors.

const KEY = 'mk.wallet';

function read() {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { coins: Math.max(0, Math.floor(Number(w.coins) || 0)), day: String(w.day || ''), ads: Number(w.ads) || 0 };
  } catch { return { coins: 0, day: '', ads: 0 }; }
}
function write(w) {
  try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* storage blocked */ }
}
const today = () => new Date().toISOString().slice(0, 10);

export class Wallet {
  constructor(cfg) {
    this.cfg = cfg;
    this.w = read();
    this.listeners = [];
  }
  get coins() { return this.w.coins; }
  adsLeft() {
    return this.w.day === today() ? Math.max(0, this.cfg.dailyLimit - this.w.ads) : this.cfg.dailyLimit;
  }
  add(n) {
    this.w.coins += n;
    write(this.w);
    this.listeners.forEach((f) => f(this.w.coins));
  }
  onChange(f) { this.listeners.push(f); }

  // Shows a rewarded ad; resolves to the coins earned (0 if skipped or none left).
  async watchAd(show) {
    if (this.adsLeft() <= 0) return 0;
    const done = await show(this.cfg.seconds);
    if (!done) return 0;
    if (this.w.day !== today()) { this.w.day = today(); this.w.ads = 0; }
    this.w.ads += 1;
    this.add(this.cfg.reward);
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
