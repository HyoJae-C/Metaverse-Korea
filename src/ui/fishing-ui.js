// Fishing panel (Han River) and the fish market's selling panel. Rules and
// the catch list are in core/fishing.js.
//   cast → wait for a bite (tapping too early scares the fish) → tap to hook
//   → reel: tap fast enough in REEL_SECONDS (rarer fish need more taps).
import { t, getLanguage } from '../core/i18n.js';
import { FISH, rollFish, tapsFor, biteWait, BITE_WINDOW, REEL_SECONDS, BAG_MAX } from '../core/fishing.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
export const fishName = (f) => (getLanguage() === 'ko' ? f.ko : `${f.name[getLanguage()] || f.name.en} · ${f.ko} (${f.rom})`);
const pct = (c) => (c < 1 ? c.toFixed(1) : String(c)) + '%';

export class FishingUI {
  // bag: FishBag; onRod(on): show or hide the rod; onCatch(fish): after a catch.
  constructor({ root, bag, onRod, onCatch, onClose }) {
    Object.assign(this, { root, bag, onRod, onCatch, onClose });
    this.timer = 0;
    this.state = 'idle';
  }

  get open() { return !this.root.hidden; }

  show() {
    this.root.hidden = false;
    this.onRod?.(true);
    this.renderIdle();
  }

  close() {
    clearTimeout(this.timer);
    clearInterval(this.tick);
    this.state = 'idle';
    this.root.hidden = true;
    this.onRod?.(false);
    this.onClose?.();
  }

  _frame(extra) {
    clearTimeout(this.timer);
    clearInterval(this.tick);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🎣 ' + t('fish.title')));
    this.root.append(el('p', 'fish-bag', t('fish.bag', { n: this.bag.size, max: BAG_MAX, coins: this.bag.value })));
    if (extra) this.root.append(extra);
  }

  _water(text, cls = '') {
    const w = el('div', 'fish-water ' + cls);
    w.append(el('span', 'fish-bobber', '🔴'), el('p', null, text));
    return w;
  }

  renderIdle(note) {
    this.state = 'idle';
    this._frame(note ? el('p', 'order-hint', note) : null);
    this.root.append(this._water(t('fish.ready'), 'calm'));
    const cast = el('button', 'primary', '🎣 ' + t('fish.cast'));
    cast.disabled = this.bag.full;
    cast.onclick = () => this.cast();
    const actions = el('div', 'order-actions');
    actions.append(cast);
    if (this.bag.full) this.root.append(el('p', 'order-hint', t('fish.full')));
    this.root.append(actions, this._odds());
  }

  // The catch list with chances and prices (a small "fish guide").
  _odds() {
    const d = el('details', 'fish-odds');
    d.append(el('summary', null, t('fish.guide')));
    const list = el('div', 'fish-list');
    for (const f of FISH) {
      const row = el('div', 'fish-row');
      row.append(el('span', 'fish-emoji', f.emoji), el('span', 'fish-name', fishName(f)), el('small', null, `${pct(f.chance)} · 🪙 ${f.price}`));
      list.append(row);
    }
    d.append(list);
    return d;
  }

  cast() {
    this.state = 'waiting';
    this._frame();
    const water = this._water(t('fish.waiting'), 'waiting');
    const btn = el('button', 'primary fish-hook', t('fish.hook'));
    btn.onclick = () => this.renderIdle(t('fish.tooEarly')); // nothing has bitten yet
    const actions = el('div', 'order-actions');
    actions.append(btn);
    this.root.append(water, actions);
    this.timer = setTimeout(() => this.bite(water, btn), biteWait() * 1000);
  }

  bite(water, btn) {
    this.state = 'bite';
    this.fish = rollFish();
    water.className = 'fish-water bite';
    water.querySelector('p').textContent = t('fish.bite');
    btn.classList.add('pulse');
    btn.onclick = () => this.reel();
    this.timer = setTimeout(() => this.renderIdle(t('fish.slow')), BITE_WINDOW * 1000);
  }

  reel() {
    this.state = 'reel';
    const need = tapsFor(this.fish);
    let taps = 0, left = REEL_SECONDS;
    this._frame();
    const big = need >= 12;
    const water = this._water(big ? t('fish.bigOne') : t('fish.reeling'), 'reel');
    const bar = el('div', 'fish-meter');
    const fill = el('i');
    bar.append(fill);
    const time = el('small', 'fish-time');
    const btn = el('button', 'primary fish-reel', '🌀 ' + t('fish.reel'));
    const paint = () => {
      fill.style.width = Math.min(100, (taps / need) * 100) + '%';
      time.textContent = t('fish.time', { s: Math.max(0, left).toFixed(1) });
    };
    btn.onclick = () => {
      taps++;
      paint();
      if (taps >= need) this.landed();
    };
    const actions = el('div', 'order-actions');
    actions.append(btn);
    this.root.append(water, bar, time, actions);
    paint();
    this.tick = setInterval(() => {
      left -= 0.1;
      paint();
      if (left <= 0) this.renderIdle(t('fish.gotAway'));
    }, 100);
  }

  landed() {
    const f = this.fish;
    const kept = this.bag.add(f.id);
    this._frame();
    const card = el('div', 'fish-card' + (f.chance <= 2 ? ' rare' : ''));
    card.append(
      el('span', 'fish-big', f.emoji),
      el('strong', null, f.ko),
      el('small', 'order-rom', f.rom),
      el('small', null, `${f.name[getLanguage()] || f.name.en} · ${pct(f.chance)} · 🪙 ${f.price}`),
    );
    this.root.append(card, el('p', 'order-hint', kept ? t('fish.caught', { name: fishName(f) }) : t('fish.full')));
    const again = el('button', 'primary', '🎣 ' + t('fish.again'));
    again.onclick = () => this.cast();
    again.disabled = this.bag.full;
    const actions = el('div', 'order-actions');
    actions.append(again);
    this.root.append(actions);
    if (kept) this.onCatch?.(f);
  }
}

// Fish market: sell one, a whole kind, or everything.
export class FishMarketUI {
  constructor({ root, bag, wallet, onSold }) {
    Object.assign(this, { root, bag, wallet, onSold });
  }

  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }

  show() {
    this.root.hidden = false;
    this.render();
  }

  render() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🐟 ' + t('fish.market')));
    const items = this.bag.list();
    if (!items.length) {
      this.root.append(el('p', 'fine', t('fish.empty')));
      return;
    }
    const list = el('div', 'fish-list');
    for (const { fish: f, n } of items) {
      const row = el('div', 'fish-row');
      const one = el('button', 'chip', t('fish.sellOne', { coins: f.price }));
      one.onclick = () => this._sell(f.id, 1);
      const all = el('button', 'chip', t('fish.sellKind', { n, coins: f.price * n }));
      all.onclick = () => this._sell(f.id);
      row.append(el('span', 'fish-emoji', f.emoji), el('span', 'fish-name', `${fishName(f)} × ${n}`), one, all);
      list.append(row);
    }
    const sellAll = el('button', 'primary', t('fish.sellAll', { coins: this.bag.value }));
    sellAll.onclick = () => this._sell(null);
    const actions = el('div', 'order-actions');
    actions.append(sellAll);
    this.root.append(list, actions);
  }

  _sell(id, n) {
    const coins = id ? this.bag.sell(id, n) : this.bag.sellAll();
    if (coins) this.wallet.add(coins);
    this.onSold?.(coins);
    this.render();
  }
}
