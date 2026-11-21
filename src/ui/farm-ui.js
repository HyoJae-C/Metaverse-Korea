// The weekend farm's panel (game/farm.js): the seeds to plant in a bed, or
// the stall that buys what you picked.
import { t } from '../core/i18n.js';
import { won } from '../core/money.js';
import { cropById } from '../core/farm.js';

const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

export class FarmUI {
  // view: what game/farm.js shows of the farm (crops(), barn, plantOne…).
  constructor({ root, view }) {
    Object.assign(this, { root, view });
    this.mode = 'stall';
    this.bed = -1;
    root.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
  }
  get open() { return !this.root.hidden; }
  close() { if (this.view.busy) return; this.root.hidden = true; }
  refresh() { if (this.open) this.render(); }
  showSeeds(bed) { this.mode = 'seeds'; this.bed = bed; this.root.hidden = false; this.render(); }
  showStall() { this.mode = 'stall'; this.root.hidden = false; this.render(); }

  render() {
    const v = this.view;
    const x = el('button', 'sheet-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    x.disabled = v.busy;
    const seeds = this.mode === 'seeds';
    const parts = [x, el('strong', 'wallet-title', seeds ? '🌱 ' + t('farm.seedTitle') : '🧺 ' + t('farm.stall'))];
    if (v.problem === 'missing') { parts.push(el('p', 'board-empty', t('farm.missing'))); this.root.replaceChildren(...parts); return; }
    parts.push(el('p', 'fine', t(seeds ? 'farm.seedHow' : 'farm.stallHow')));
    if (v.local) parts.push(el('p', 'fine board-warn', t('farm.local')));
    if (v.problem) parts.push(el('p', 'lock-warn', t('farm.network')));
    const list = el('div', 'bait-list');
    if (seeds) {
      const empty = v.empty;
      for (const c of v.crops()) {
        const row = el('div', 'bait-row farm-row');
        const txt = el('div', 'bait-text');
        txt.append(el('b', null, `${c.emoji} ${v.name(c)} · ${t('farm.days', { n: v.days(c) })}`), el('small', null, t('farm.row', { sell: won(c.sell), fresh: won(c.fresh), n: v.days(c) })));
        const one = el('button', 'primary', won(c.seed));
        one.type = 'button';
        one.disabled = v.busy || !v.known;
        one.onclick = () => v.plantOne(this.bed, c);
        row.append(txt, one);
        if (empty > 1) {
          const all = el('button', 'chip', t('farm.all', { n: empty, price: won(c.seed * empty) }));
          all.type = 'button';
          all.disabled = v.busy || !v.known;
          all.onclick = () => v.plantAll(c);
          row.append(all);
        }
        list.append(row);
      }
      parts.push(list);
    } else {
      const have = Object.entries(v.barn).filter(([, n]) => n > 0);
      if (!have.length) parts.push(el('p', 'board-empty', t('farm.barnEmpty')));
      for (const [k, n] of have) {
        const fresh = k.endsWith('+'), c = v.crops().find((q) => q.id === (fresh ? k.slice(0, -1) : k)) || cropById(fresh ? k.slice(0, -1) : k);
        if (!c) continue;
        const row = el('div', 'bait-row');
        const txt = el('div', 'bait-text');
        const each = fresh ? c.fresh : c.sell;
        txt.append(el('b', null, `${c.emoji} ${v.name(c)}${fresh ? ' ✨ ' + t('farm.fresh') : ''} × ${n}`), el('small', null, t('farm.each', { n: won(each) })));
        row.append(txt, el('span', 'bait-free', won(each * n)));
        list.append(row);
      }
      if (have.length) {
        const go = el('button', 'primary', t('farm.sellAll', { n: won(v.worth()) }));
        go.type = 'button';
        go.disabled = v.busy;
        go.onclick = () => v.sell();
        parts.push(list, go);
      }
    }
    parts.push(el('small', 'fine', t('temple.have', { n: Number(v.coins).toLocaleString('en-US') })));
    this.root.replaceChildren(...parts);
  }
}
