// Selling homemade food at Yongmaru Market's side-dish stall (rules in
// core/kimchi-market.js, text in market-text.js). Lists the kimchi, japchae
// and kimbap in the bag (and one in your hand) with what each one fetches;
// a few a day in all.
import { getLanguage, localName } from '../core/i18n.js';
import { medalFor, medalIcon } from '../core/grill-game.js';
import { isHomemade, dishOf, DISHES, kimchiScore, kimchiPrice, SELL_PER_DAY, KimchiSales } from '../core/kimchi-market.js';
import { MT } from './market-text.js';
import { KIMCHI_LABELS, JAPCHAE_LABELS, KIMBAP_LABELS } from './cooking-labels.js';

const ITEM = { kimchi: KIMCHI_LABELS.item, japchae: JAPCHAE_LABELS.item, kimbap: KIMBAP_LABELS.item };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
export const ML = (k, vars) => {
  let s = localName(MT[k], getLanguage()) ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll('{' + a + '}', b);
  return s;
};

export class KimchiSellUI {
  // bag: core/bag.js; wallet: { add(n) }; getHeld()/clearHeld(): the thing in
  // your hand; onSold(coins, score) after a sale; onLimit() when today's
  // limit stops a sale.
  constructor({ root, bag, wallet, getHeld, clearHeld, onSold, onLimit, sales = new KimchiSales() }) {
    Object.assign(this, { root, bag, wallet, getHeld, clearHeld, onSold, onLimit, sales });
  }

  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  show() {
    this.root.hidden = false;
    this.render();
  }

  render() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    const left = this.sales.left();
    this.root.replaceChildren(
      x,
      el('h3', null, '🧺 ' + ML('title')),
      el('p', 'fine', ML('intro')),
      ...Object.entries(DISHES).map(([id, d]) => el('p', 'fine', d.icon + ' ' + localName(ITEM[id], getLanguage()) + ' · ' + ML('prices', d.price))),
      el('p', 'order-hint', left ? ML('left', { n: left, max: SELL_PER_DAY }) : ML('limit')),
    );
    const jars = [];
    const h = this.getHeld?.();
    if (isHomemade(h)) jars.push({ e: h, hand: true });
    this.bag.list().forEach((e, i) => { if (isHomemade(e)) jars.push({ e, i }); });
    if (!jars.length) {
      this.root.append(el('p', 'fine', ML('none')));
    } else {
      const list = el('div', 'fish-list');
      for (const j of jars) {
        const score = kimchiScore(j.e), medal = medalFor(score);
        const row = el('div', 'fish-row');
        const dish = dishOf(j.e);
        const label = `${localName(ITEM[dish], getLanguage())}${j.hand ? ' (' + ML('hand') + ')' : ''} · ${medal ? medalIcon(medal) + ' ' : ''}${ML('score', { n: score })}`;
        const b = el('button', 'chip', ML('sell', { coins: kimchiPrice(j.e) }));
        b.disabled = !left;
        b.onclick = () => this._sell(j);
        row.append(el('span', 'fish-emoji', DISHES[dish].icon), el('span', 'fish-name', label), b);
        list.append(row);
      }
      this.root.append(list);
    }
    this.root.append(el('p', 'kimchi-fact', '🍚 ' + ML('fact')));
  }

  _sell(j) {
    if (this.sales.left() <= 0) { this.onLimit?.(); this.render(); return; }
    let coins = 0;
    if (j.hand) {
      // Same limit and price as from the bag: sell it through a one-slot bag.
      const one = { list: () => [j.e], take: () => j.e };
      coins = this.sales.sell(one, 0);
      if (coins) this.clearHeld?.();
    } else {
      coins = this.sales.sell(this.bag, j.i);
    }
    if (coins) {
      this.wallet.add(coins, undefined, { r: 'kimchi' });
      this.onSold?.(coins, kimchiScore(j.e));
    }
    this.render();
  }
}
