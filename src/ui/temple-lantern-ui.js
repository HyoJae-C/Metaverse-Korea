// The lantern panel in Jogyesa's yard (core/temple-lanterns.js):
//   show('hang'): pick a colour and a wish, pay and hang your lantern on the
//                 canopy for three days.
//   show('list'): the lanterns hanging now: whose, which wish, days left;
//                 mine first.
// Wishes come from a fixed list (core/lanterns.js WISHES), shown in each
// player's language; names go on the page with textContent only.

import { t, localName } from '../core/i18n.js';
import { WISHES, WISH_COLORS } from '../core/lanterns.js';
import { TEMPLE_LANTERN, newRequestId, daysLeft } from '../core/temple-lanterns.js';

const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const fmtN = (n) => Number(n).toLocaleString('en-US');

export class TempleLanternUI {
  // store(): the backend; wallet: the game's Wallet; name(): my name;
  // toast(msg); onHung(lantern): after a lantern is hung.
  constructor({ root, store, wallet, name, toast, onHung }) {
    Object.assign(this, { root, store, wallet, name, toast, onHung });
    this.view = 'hang';
    this.c = 0;
    this.w = 0;
    this.price = TEMPLE_LANTERN.price;
    this.busy = false;
    this.requestId = newRequestId();
    this.rows = null;
    root.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
  }
  get open() { return !this.root.hidden; }
  close() { if (this.busy) return; this.root.hidden = true; }

  async show(view = 'hang') {
    this.root.hidden = false;
    this.view = view;
    this.render();
    if (view === 'list') {
      this.rows = null;
      const r = await this.store().active();
      this.rows = r.error ? [] : r.rows;
      this.listErr = r.error || null;
      if (this.view === 'list') this.render();
      return;
    }
    const p = await this.store().price();
    if (Number.isFinite(p) && p !== this.price) { this.price = p; if (this.view === 'hang') this.render(); }
  }

  _head(text) {
    const x = el('button', 'sheet-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    x.disabled = this.busy;
    return [x, el('strong', 'wallet-title', '🏮 ' + text)];
  }
  render() { this.root.replaceChildren(...(this.view === 'list' ? this._list() : this._hang())); }

  _hang() {
    const st = this.store();
    const parts = this._head(t('temple.hang'));
    if (st.missing) { parts.push(el('p', 'board-empty', t('temple.missing'))); return parts; }
    parts.push(el('p', 'fine', t('temple.how')));
    if (!st.shared) parts.push(el('p', 'fine board-warn', t('temple.local')));
    parts.push(el('b', 'lock-sub', t('temple.color')));
    const colors = el('div', 'wish-colors');
    colors.setAttribute('role', 'radiogroup');
    WISH_COLORS.forEach((c, i) => {
      const b = el('button', 'wish-color' + (i === this.c ? ' on' : ''));
      b.type = 'button';
      b.style.setProperty('--c', c);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === this.c));
      b.setAttribute('aria-label', c);
      b.onclick = () => { this.c = i; this.render(); };
      colors.append(b);
    });
    parts.push(colors);
    parts.push(el('b', 'lock-sub', t('temple.wish')));
    const list = el('div', 'wish-list');
    list.setAttribute('role', 'radiogroup');
    WISHES.forEach((w, i) => {
      const b = el('button', 'wish-item' + (i === this.w ? ' on' : ''), localName(w));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === this.w));
      b.onclick = () => { this.w = i; this.render(); };
      list.append(b);
    });
    parts.push(list);
    const poor = this.wallet.coins < this.price;
    parts.push(el('small', 'fine', t('temple.have', { n: fmtN(this.wallet.coins) })));
    if (poor) parts.push(el('p', 'lock-warn', t('temple.poor', { n: fmtN(this.price) })));
    const go = el('button', 'primary', this.busy ? '…' : t('temple.pay', { n: fmtN(this.price) }));
    go.type = 'button';
    go.disabled = poor || this.busy;
    go.onclick = () => this.buy();
    parts.push(go);
    const see = el('button', 'wish-item temple-see', t('temple.see'));
    see.type = 'button';
    see.disabled = this.busy;
    see.onclick = () => this.show('list');
    parts.push(see);
    return parts;
  }

  async buy() {
    if (this.busy) return;
    this.busy = true;
    this.render();
    const r = await this.store().hang({ requestId: this.requestId, color: this.c, wish: this.w, name: this.name(), price: this.price }, { k: 'temple.note' });
    this.busy = false;
    if (r.error) {
      if (r.error === 'price' && Number.isFinite(r.price)) this.price = r.price;
      const key = { coins: 'temple.poor', price: 'temple.price', limit: 'temple.limit', full: 'temple.full', missing: 'temple.missing' }[r.error] || 'temple.network';
      this.toast(t(key, { n: fmtN(this.price) }));
      this.render();
      return;
    }
    this.requestId = newRequestId(); // (the next one is a new lantern)
    this.toast(t('temple.done'));
    this.onHung?.(r.lantern);
    this.show('list');
  }

  _list() {
    const parts = this._head(t('temple.list', { n: this.rows ? this.rows.length : '…' }));
    if (!this.rows) { parts.push(el('p', 'board-empty', t('temple.loading'))); return parts; }
    if (this.listErr === 'missing') { parts.push(el('p', 'board-empty', t('temple.missing'))); return parts; }
    if (this.listErr) { parts.push(el('p', 'board-empty', t('temple.network'))); return parts; }
    if (!this.rows.length) parts.push(el('p', 'board-empty', t('temple.none')));
    const box = el('div', 'temple-list');
    const rows = [...this.rows].sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || Date.parse(b.created_at) - Date.parse(a.created_at));
    for (const r of rows) {
      const row = el('div', 'temple-row' + (r.mine ? ' mine' : ''));
      const dot = el('span', 'temple-dot');
      dot.style.background = WISH_COLORS[r.color] || '#fff';
      const who = el('b', '', r.name);
      if (r.mine) who.append(el('small', 'temple-mine', ' · ' + t('temple.mine')));
      row.append(dot, el('span', 'temple-text'));
      row.lastChild.append(who, el('span', 'temple-wish', localName(WISHES[r.wish] || WISHES[0])));
      row.append(el('small', 'fine', t('temple.left', { d: daysLeft(r) })));
      box.append(row);
    }
    parts.push(box);
    const back = el('button', 'primary', t('temple.hang'));
    back.type = 'button';
    back.onclick = () => this.show('hang');
    parts.push(back);
    return parts;
  }
}
