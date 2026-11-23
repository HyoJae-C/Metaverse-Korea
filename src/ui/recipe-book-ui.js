// Recipe book panel (rules in core/recipe-book.js): a stamp book like the
// fish book and the travel stamp note. A red-ink stamp for every dish you've
// cooked (how many, best medal), a dashed ring for one a class makes that you
// haven't yet, and a padlock for dishes no class makes yet.
import { RECIPES } from '../core/recipe-book.js';
import { medalIcon } from '../core/grill-game.js';
import { t } from '../core/i18n.js';
import { dishIcon, dishIconId } from './dish-icon.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// One round stamp: "요리비법", the dish and its Korean name.
export function recipeStamp(r, cooked) {
  const st = el('div', 'fish-stamp recipe-stamp' + (cooked ? '' : ' empty'));
  st.style.setProperty('--tilt', ((RECIPES.indexOf(r) * 37) % 17) - 8 + 'deg');
  st.append(el('small', 'fish-stamp-top', cooked ? '요리비법' : ''), cooked && dishIconId(r.id) ? dishIcon(r.id) : el('span', 'fish-stamp-fish', cooked ? r.icon : r.cook ? '❔' : '🔒'), el('b', 'fish-stamp-name', cooked ? r.ko : '???'));
  return st;
}

export class RecipeBookUI {
  constructor({ root, book }) {
    Object.assign(this, { root, book });
    this.fresh = null; // a dish stamped since the book was last opened: it slams in
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  show() {
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('recipe.close'));
    x.onclick = () => this.close();
    const grid = el('div', 'stamp-grid recipe-grid');
    for (const r of RECIPES) {
      const n = this.book.count(r.id), m = this.book.best(r.id);
      const cell = el('div', 'stamp-cell recipe-cell' + (n ? '' : ' empty') + (r.id === this.fresh ? ' fresh' : ''));
      cell.setAttribute('aria-label', t('recipe.d.' + r.id));
      cell.append(
        recipeStamp(r, !!n),
        el('strong', null, n || r.cook ? t('recipe.d.' + r.id) : '???'),
        el('em', null, n ? `× ${n}` + (m ? ' ' + medalIcon(m) : '') : r.cook ? t('recipe.cookIt') : t('recipe.soon')),
      );
      grid.append(cell);
    }
    this.fresh = null;
    const summary = t('recipe.summary', { k: this.book.kinds, all: RECIPES.length, n: this.book.total });
    const bar = el('div', 'stamp-bar'), fill = el('i');
    fill.style.width = (100 * this.book.kinds / RECIPES.length).toFixed(1) + '%';
    bar.append(fill);
    this.root.replaceChildren(x, el('h3', null, '📜 ' + t('recipe.title')), el('p', 'dex-summary', summary), bar, el('p', 'order-hint', t('recipe.how')), grid);
  }
}
