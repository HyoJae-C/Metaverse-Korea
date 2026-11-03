// Hair salon and cosmetic clinic panel (menus and prices in core/beauty.js).
// Pick options and see them on your character right away; Save pays and
// keeps them, Cancel puts your look back.
import { t } from '../core/i18n.js';
import { MENUS, BEAUTY_ICON, beautyCost } from '../core/beauty.js';
import { PALETTES } from '../data/appearance.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class BeautyUI {
  // onPreview(look): show it; onSave(look, cost): pay, keep, true if paid;
  // onCancel(): put the old look back.
  constructor({ root, onPreview, onSave, onCancel }) {
    Object.assign(this, { root, onPreview, onSave, onCancel });
  }

  get open() { return !this.root.hidden; }

  show(kind, look) {
    this.kind = kind;
    this.menu = MENUS[kind];
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

  render() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, BEAUTY_ICON[this.kind] + ' ' + t(this.kind + '.title')), el('p', 'order-hint', t(this.kind + '.howTo')));
    for (const o of this.menu) {
      const sec = el('div', 'beauty-sec');
      sec.append(el('strong', null, `${t('beauty.' + o.key)} · 🪙 ${o.price}`));
      const row = el('div', 'beauty-row');
      const opts = o.toggle ? [false, true] : [null, ...(o.choices || Object.keys(PALETTES[o.palette]))];
      for (const v of opts) {
        const b = el('button', 'beauty-opt');
        const cur = o.toggle ? !!this.draft[o.key] : this.draft[o.key] ?? null;
        b.setAttribute('aria-pressed', String(cur === v));
        if (o.toggle) b.textContent = t(v ? 'beauty.smallOn' : 'beauty.smallOff');
        else if (v === null) { b.textContent = t('beauty.own'); b.classList.add('own'); }
        else if (o.choices) { b.textContent = t(o.label + '.' + v); b.classList.add('word'); }
        else { b.classList.add('swatch'); b.style.background = hex(PALETTES[o.palette][v]); b.title = v; b.setAttribute('aria-label', v); }
        b.onclick = () => {
          this.draft = { ...this.draft, [o.key]: v };
          this.onPreview?.(this.draft);
          this.render();
        };
        row.append(b);
      }
      sec.append(row);
      this.root.append(sec);
    }
    const cost = beautyCost(this.menu, this.from, this.draft);
    const cancel = el('button', 'chip', t('beauty.cancel'));
    cancel.onclick = () => this.close();
    const save = el('button', 'primary', cost ? t('beauty.pay', { coins: cost }) : t('beauty.save'));
    save.onclick = () => {
      if (this.onSave?.(this.draft, cost)) this.root.hidden = true;
    };
    const actions = el('div', 'order-actions');
    actions.append(cancel, save);
    this.root.append(actions);
  }
}
