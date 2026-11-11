// Hair salon and cosmetic clinic panel (menus and prices in core/beauty.js).
// Pick options and see them on your character right away; Save pays and
// keeps them, Cancel puts your look back.
import { t, localName } from '../core/i18n.js';
import { menuFor, BEAUTY_ICON, beautyCost } from '../core/beauty.js';
import { PALETTES } from '../data/appearance.js';
import { LIPSTICK_TEXT, LIPSTICK_USES, STICKS } from '../core/lipstick.js';
import { L, fmt } from './pocha-ui.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class BeautyUI {
  // onPreview(look): show it; onSave(look, cost): pay, keep, true if paid;
  // onCancel(): put the old look back; onBuyStick(kind, shade, coins): a lip
  // shop sells the shade tried on as a lipstick or blush, true if bought.
  constructor({ root, onPreview, onSave, onCancel, onBuyStick }) {
    Object.assign(this, { root, onPreview, onSave, onCancel, onBuyStick });
  }

  get open() { return !this.root.hidden; }

  // store: the shop you're in (a lip shop's own name and colour family).
  show(kind, look, store = null) {
    this.kind = kind;
    this.store = store;
    this.menu = menuFor(kind, store);
    this.from = { ...look };
    this.draft = { ...look };
    this.root.hidden = false;
    this.render();
  }

  // Close without saving.
  close() {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.onCancel?.();
  }

  // Options of one menu row: null (= my own), the palette keys or choices, or
  // off/on for a toggle.
  // A style you already wear from another salon stays on the list (free to keep).
  options(o) {
    if (o.toggle) return [false, true];
    const list = o.only || o.choices || Object.keys(PALETTES[o.palette]);
    const mine = this.from?.[o.key];
    return mine && o.choices && !list.includes(mine) ? [null, mine, ...list] : [null, ...list];
  }

  // Step the open row's option by +1 / -1 (the ◀ ▶ buttons and swipes).
  step(dir) {
    const o = this.menu[this.tab || 0];
    const opts = this.options(o);
    const cur = o.toggle ? !!this.draft[o.key] : this.draft[o.key] || null;
    const i = Math.max(0, opts.indexOf(cur));
    this.pick(o, opts[(i + dir + opts.length) % opts.length]);
  }

  pick(o, v) {
    this.draft = { ...this.draft, [o.key]: v };
    this.onPreview?.(this.draft);
    this.render();
  }

  // A slim bar at the bottom so your face stays in view: tabs for each menu
  // row, then ◀ the current option ▶ (or swipe), then Cancel / Save.
  render() {
    this.tab = Math.min(this.tab || 0, this.menu.length - 1);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    const head = el('div', 'beauty-head');
    head.append(el('strong', null, BEAUTY_ICON[this.kind] + ' ' + (this.store?.lipFamily || (this.kind === 'salon' && this.store?.name) ? localName(this.store.name) : t(this.kind + '.title'))));
    this.root.replaceChildren(x, head);
    if (this.menu.length > 1) {
      const tabs = el('div', 'beauty-tabs');
      this.menu.forEach((m, i) => {
        const b = el('button', 'beauty-tab', `${t('beauty.' + m.key)} · 🪙${m.price}`);
        b.setAttribute('aria-pressed', String(i === this.tab));
        b.onclick = () => { this.tab = i; this.render(); };
        tabs.append(b);
      });
      this.root.append(tabs);
      if (this.menu[0].stick) head.append(el('span', 'beauty-price', fmt(L(LIPSTICK_TEXT.tryFree), { n: LIPSTICK_USES })));
    } else if (this.menu[0].stick) head.append(el('span', 'beauty-price', fmt(L(LIPSTICK_TEXT.tryFree), { n: LIPSTICK_USES })));
    else head.append(el('span', 'beauty-price', `${t('beauty.' + this.menu[0].key)} · 🪙 ${this.menu[0].price}`));
    const o = this.menu[this.tab];
    const opts = this.options(o);
    const cur = o.toggle ? !!this.draft[o.key] : this.draft[o.key] || null;
    const idx = Math.max(0, opts.indexOf(cur));
    const stepper = el('div', 'beauty-stepper');
    const prev = el('button', 'beauty-arrow', '◀');
    const next = el('button', 'beauty-arrow', '▶');
    prev.setAttribute('aria-label', 'previous');
    next.setAttribute('aria-label', 'next');
    prev.onclick = () => this.step(-1);
    next.onclick = () => this.step(1);
    const now = el('div', 'beauty-now');
    if (!o.toggle && cur !== null && o.palette) {
      const dot = el('span', 'beauty-dot');
      dot.style.background = hex(PALETTES[o.palette][cur]);
      now.append(dot);
    }
    const name = o.toggle ? t(cur ? 'beauty.smallOn' : 'beauty.smallOff') : cur === null ? t('beauty.own') : o.choices ? t(o.label + '.' + cur) : '';
    if (name) now.append(el('span', null, name));
    const sig = o.signature?.includes(cur); // this salon's own style
    now.append(el('small', null, (sig ? `★ ${t('salon.signature')} · ` : '') + `${idx + 1} / ${opts.length}`));
    stepper.append(prev, now, next);
    // Swipe left / right on the bar to flip through.
    let sx = null;
    stepper.ontouchstart = (e) => { sx = e.touches[0].clientX; };
    stepper.ontouchend = (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 30) this.step(dx < 0 ? 1 : -1);
    };
    this.root.append(stepper);
    // Small swatches under it for colour rows: tap to jump straight there.
    if (o.palette) {
      const row = el('div', 'beauty-row');
      for (const v of opts) {
        const b = el('button', 'beauty-opt');
        b.setAttribute('aria-pressed', String(cur === v));
        if (v === null) { b.textContent = '↺'; b.classList.add('own'); b.setAttribute('aria-label', t('beauty.own')); }
        else { b.classList.add('swatch'); b.style.background = hex(PALETTES[o.palette][v]); b.setAttribute('aria-label', v); }
        b.onclick = () => this.pick(o, v);
        row.append(b);
      }
      this.root.append(row);
    }
    const cost = beautyCost(this.menu, this.from, this.draft);
    const cancel = el('button', 'chip', t('beauty.cancel'));
    cancel.onclick = () => this.close();
    // Lip shops: the colour you're trying is bought as a lipstick (your look
    // goes back until you put it on); "my own" lips are free to go back to.
    const shade = o.stick && this.draft[o.key];
    const save = el('button', 'primary', shade ? fmt(L(LIPSTICK_TEXT.buy), { icon: STICKS[o.stick].icon, n: LIPSTICK_USES, coins: o.price }) : cost ? t('beauty.pay', { coins: cost }) : t('beauty.save'));
    save.onclick = () => {
      if (shade) { if (this.onBuyStick?.(o.stick, shade, o.price)) this.close(); return; }
      // (lip shops: Save only takes colours off; a colour tried in the other
      // tab is never kept for free)
      const keep = this.menu.some((m) => m.stick) ? { ...this.from, ...Object.fromEntries(this.menu.filter((m) => m.stick && !this.draft[m.key]).map((m) => [m.key, null])) } : this.draft;
      if (this.onSave?.(keep, cost)) this.root.hidden = true;
    };
    const actions = el('div', 'order-actions');
    actions.append(cancel, save);
    this.root.append(actions);
  }
}
