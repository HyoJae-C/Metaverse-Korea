// The farmer's journal page (core/farm-journal.js): a stamp for each crop
// you harvested yourself, the ones still to grow shown faint with how many
// days they take. Opened from the notebook; downloaded then.
import { t } from '../core/i18n.js';
import { CROPS, cropDays } from '../core/farm.js';

const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

export class FarmJournalUI {
  constructor({ root, journal }) {
    Object.assign(this, { root, journal });
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  show() {
    const j = this.journal;
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    const grid = el('div', 'farm-log-grid');
    for (const c of CROPS) {
      const got = j.has(c.id);
      const cell = el('div', 'farm-log-cell' + (got ? ' got' : '') + (j.fresh(c.id) ? ' fresh' : ''));
      cell.append(el('span', 'farm-log-stamp', c.emoji), el('b', null, t('farm.' + c.id)), el('small', null, got ? `× ${j.count(c.id)}${j.fresh(c.id) ? ` · ✨ ${j.fresh(c.id)}` : ''}` : t('farm.days', { n: cropDays(c) })));
      grid.append(cell);
    }
    this.root.replaceChildren(x, el('h3', null, '🌱 ' + t('farm.log')), el('p', 'fine', t('farm.logHow', { k: j.kinds, all: CROPS.length })), grid);
  }
}
