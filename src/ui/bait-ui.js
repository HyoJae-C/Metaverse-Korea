// The bait stall by a Han River park's fish buyer (core/bait.js,
// core/bait-shop.js): the three baits with what they do and their price, one
// pack of each a day. A bought pack goes into the bag; take it out and put
// it on the hook from your hand.

import { t } from '../core/i18n.js';
import { BAITS } from '../core/bait.js';
import { newRequestId } from '../core/bait-shop.js';

const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const fmtN = (n) => Number(n).toLocaleString('en-US');

export class BaitUI {
  // store(): the till; wallet: the game's Wallet; toast(msg);
  // room(): true if the bag has a free slot; onBought(bait, pack): put it in the bag.
  constructor({ root, store, wallet, toast, room, onBought, name }) {
    Object.assign(this, { root, store, wallet, toast, room, onBought, name });
    this.info = null;
    this.busy = false;
    this.ids = {}; // a request id per bait, kept until it goes through
    root.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
  }
  get open() { return !this.root.hidden; }
  close() { if (this.busy) return; this.root.hidden = true; }

  async show() {
    this.root.hidden = false;
    this.render();
    const r = await this.store().info();
    this.info = r.error ? { error: r.error } : r;
    if (this.open) this.render();
  }

  render() {
    const x = el('button', 'sheet-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    x.disabled = this.busy;
    const parts = [x, el('strong', 'wallet-title', '🪱 ' + t('bait.shop'))];
    const st = this.store();
    if (st.missing || this.info?.error === 'missing') { parts.push(el('p', 'board-empty', t('bait.missing'))); this.root.replaceChildren(...parts); return; }
    parts.push(el('p', 'fine', t('bait.how')));
    if (!st.shared) parts.push(el('p', 'fine board-warn', t('bait.local')));
    if (!this.info) parts.push(el('p', 'fine', t('temple.loading')));
    else if (this.info.error) parts.push(el('p', 'lock-warn', t('bait.network')));
    const list = el('div', 'bait-list');
    const plain = el('div', 'bait-row');
    plain.append(el('span', 'bait-dot plain'), el('div', 'bait-text'));
    plain.lastChild.append(el('b', null, t('bait.plainName')), el('small', null, t('bait.effect', { p: 2.15, l: 0.05 })));
    plain.append(el('span', 'bait-free', t('bait.free')));
    list.append(plain);
    for (const b of BAITS) {
      const row = el('div', 'bait-row');
      const dot = el('span', 'bait-dot');
      dot.style.background = b.color;
      const txt = el('div', 'bait-text');
      txt.append(el('b', null, `${this.name(b)} · ${t('bait.pack', { n: this.info?.pack || 5 })}`), el('small', null, t('bait.effect', { p: b.rare, l: b.legend })));
      const price = this.info?.prices?.[b.id] ?? b.price;
      const done = (this.info?.bought?.[b.id] || 0) >= (this.info?.daily || 1);
      const go = el('button', done ? 'chip' : 'primary', done ? t('bait.soldOut') : `🪙 ${fmtN(price)}`);
      go.type = 'button';
      go.disabled = done || this.busy || !this.info || !!this.info.error;
      go.onclick = () => this.buy(b, price);
      row.append(dot, txt, go);
      list.append(row);
    }
    parts.push(list, el('small', 'fine', t('bait.reset')), el('small', 'fine', t('temple.have', { n: fmtN(this.wallet.coins) })));
    this.root.replaceChildren(...parts);
  }

  async buy(b, price) {
    if (this.busy) return;
    if (!this.room()) { this.toast(t('bait.bagFull')); return; }
    if (this.wallet.coins < price) { this.toast(t('bait.poor', { n: fmtN(price) })); return; }
    this.busy = true;
    this.render();
    this.ids[b.id] ||= newRequestId();
    const r = await this.store().buy({ requestId: this.ids[b.id], b: b.id, price }, { k: 'bait.' + b.id });
    this.busy = false;
    if (r.error) {
      if (r.error === 'price' && Number.isFinite(r.price)) this.info.prices[b.id] = r.price;
      if (r.error === 'limit') this.info.bought[b.id] = this.info.daily;
      const key = { coins: 'bait.poor', price: 'bait.price', limit: 'bait.soldOut', missing: 'bait.missing' }[r.error] || 'bait.network';
      this.toast(t(key, { n: fmtN(this.info?.prices?.[b.id] ?? price) }));
      this.render();
      return;
    }
    delete this.ids[b.id]; // (the next one is a new purchase)
    this.info.bought[b.id] = (this.info.bought[b.id] || 0) + 1;
    this.onBought?.(b, this.info.pack || 5); // (charged: false is a retry of one whose answer got lost: still not in the bag)
    this.render();
  }
}
