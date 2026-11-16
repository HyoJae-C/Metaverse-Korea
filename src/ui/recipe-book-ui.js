// Recipe book panel (rules in core/recipe-book.js): a page for every dish,
// written in once you've cooked it, "coming soon" for dishes no class makes yet.
import { RECIPES } from '../core/recipe-book.js';
import { medalIcon } from '../core/grill-game.js';
import { t } from '../core/i18n.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class RecipeBookUI {
  constructor({ root, book }) {
    Object.assign(this, { root, book });
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  show() {
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('recipe.close'));
    x.onclick = () => this.close();
    const grid = el('div', 'dex-grid');
    for (const r of RECIPES) {
      const n = this.book.count(r.id), m = this.book.best(r.id);
      const card = el('div', 'dex-card' + (n ? '' : ' locked'));
      card.append(
        el('span', 'dex-emoji', n ? r.icon : r.cook ? '❔' : '🔒'),
        el('strong', null, t('recipe.d.' + r.id)),
        el('small', null, r.ko),
        el('em', null, n ? `× ${n}` + (m ? ' ' + medalIcon(m) : '') : r.cook ? t('recipe.cookIt') : t('recipe.soon')),
      );
      grid.append(card);
    }
    const summary = t('recipe.summary', { k: this.book.kinds, all: RECIPES.length, n: this.book.total });
    this.root.replaceChildren(x, el('h3', null, '📜 ' + t('recipe.title')), el('p', 'dex-summary', summary), el('p', 'order-hint', t('recipe.how')), grid);
  }
}
