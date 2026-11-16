// The dish upgrade panel (음식 강화, game/dish-upgrade.js), at any cooking
// class: the seasoning you have and the tries left today, the food bag's
// dishes (one row for each kind, level and medal), the picked dish's chance
// and cost, the button, and the odds table (shown in full, as the law asks).
import { t } from '../core/i18n.js';
import { CHANCE, LEVEL_OPEN, costFor, dishKindOf, dishLevel, gaugeStep, startLevel } from '../core/dish-upgrade.js';
import { newRequestId } from '../core/dish-upgrade-store.js';
import { kimchiScore } from '../core/kimchi-market.js';
import { medalFor, medalIcon } from '../core/grill-game.js';

const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const TIER_IDS = ['plain', 'jeongseong', 'dalin', 'myeongin', 'myeongjang', 'sura', 'cheonha'];
export const tierName = (lv) => t('upgrade.tier.' + TIER_IDS[Math.floor(Math.max(0, Math.min(30, lv | 0)) / 5)]);

// The food bag's dishes as rows: one for each kind, level, medal and maker,
// the highest level first. → [{ i (a bag index), n, kind, lv, gz, medal, by }]
export function dishRows(items) {
  const rows = new Map();
  items.forEach((e, i) => {
    const kind = dishKindOf(e);
    if (!kind) return;
    const lv = dishLevel(e), medal = medalFor(kimchiScore(e)) || '', by = e.by || '';
    const key = [kind, lv, medal, by, e.gz | 0].join('|');
    const r = rows.get(key);
    if (r) r.n++; else rows.set(key, { i, n: 1, kind, lv, gz: e.gz | 0, medal, by });
  });
  const rank = { gold: 3, silver: 2, bronze: 1, '': 0 };
  return [...rows.values()].sort((a, b) => (b.lv - a.lv) || (b.gz - a.gz) || (rank[b.medal] - rank[a.medal]) || a.kind.localeCompare(b.kind));
}

export class DishUpgradeUI {
  // store(): the upgrade store (core/dish-upgrade-store.js); bag: the game's Bag;
  // describe(entry) → { emoji, name }; myName(); onSeasoning(n); onResult(ok).
  constructor({ root, store, bag, toast, describe, myName, onSeasoning, onResult }) {
    Object.assign(this, { root, store, bag, toast, describe, myName, onSeasoning, onResult });
    this.info = null;
    this.busy = false;
    this.sel = null; // the picked row's key: kind|lv|medal|by|gz
    this.rid = null; // the try's request id, kept until it gets an answer
    this.odds = false;
    root.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
  }
  get open() { return !this.root.hidden; }
  close() { if (this.busy) return; this.root.hidden = true; }

  async show() {
    this.root.hidden = false;
    this.render();
    const r = await this.store().info();
    this.info = r.error ? { error: r.error } : r;
    if (!r.error) { this.sync(r.dishes); this.onSeasoning(r.n); }
    if (this.open) this.render();
  }

  // The server's levels win over the bag's (a changed save can't make a +20).
  sync(dishes) {
    if (!dishes) return;
    this.bag.list().forEach((e, i) => {
      const s = e.u && dishes[e.u];
      if (s && (s.lv !== dishLevel(e) || s.gauge !== (e.gz | 0))) this.bag.swap(i, { ...e, lv: s.lv, gz: s.gauge });
    });
  }

  chance(lv, gz) {
    const c = this.info?.chance || CHANCE;
    return lv >= (this.info?.open || LEVEL_OPEN) ? 0 : Math.min(100, (c[lv] ?? 0) + (gz | 0));
  }

  render() {
    const x = el('button', 'sheet-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => this.close();
    x.disabled = this.busy;
    const parts = [x, el('strong', 'wallet-title', '✨ ' + t('upgrade.title'))];
    const st = this.store(), info = this.info;
    if (st.missing || info?.error === 'missing') { parts.push(el('p', 'board-empty', t('upgrade.missing'))); this.root.replaceChildren(...parts); return; }
    if (!st.shared) parts.push(el('p', 'fine board-warn', t('upgrade.local')));
    if (!info) parts.push(el('p', 'fine', t('temple.loading')));
    else if (info.error) parts.push(el('p', 'lock-warn', t('upgrade.network')));
    else parts.push(el('p', 'upgrade-have', `${t('upgrade.seasoning', { n: info.n })} · ${t('upgrade.tries', { n: Math.max(0, info.daily - info.tries), daily: info.daily })}`));

    const items = this.bag.list(), rows = dishRows(items);
    const keyOf = (r) => [r.kind, r.lv, r.medal, r.by, r.gz].join('|');
    if (!rows.some((r) => keyOf(r) === this.sel)) this.sel = rows[0] ? keyOf(rows[0]) : null;
    if (!rows.length) parts.push(el('p', 'board-empty', t('upgrade.empty')));
    else parts.push(el('small', 'fine', t('upgrade.pick')));
    const list = el('div', 'bait-list upgrade-list');
    for (const r of rows) {
      const d = this.describe(items[r.i]);
      const row = el('button', 'bait-row upgrade-row' + (keyOf(r) === this.sel ? ' on' : ''));
      row.type = 'button';
      row.disabled = this.busy;
      const txt = el('div', 'bait-text');
      txt.append(el('b', null, `${d.emoji} ${d.name}${r.lv ? ' +' + r.lv : ''}${r.medal ? ' ' + medalIcon(r.medal) : ''}${r.n > 1 ? ' ×' + r.n : ''}`));
      txt.append(el('small', null, [tierName(r.lv), r.by ? t('upgrade.made', { name: r.by }) : '', r.gz ? t('upgrade.gauge', { g: r.gz }) : ''].filter(Boolean).join(' · ')));
      row.append(txt);
      row.onclick = () => { this.sel = keyOf(r); this.rid = null; this.render(); };
      list.append(row);
    }
    if (rows.length) parts.push(list);

    const r = rows.find((q) => keyOf(q) === this.sel);
    if (r) {
      const lv = Math.max(r.lv, startLevel(items[r.i]));
      const top = lv >= (info?.open || LEVEL_OPEN);
      const box = el('div', 'upgrade-go');
      if (top) box.append(el('small', 'fine', t('upgrade.max')));
      else box.append(el('b', null, `+${lv} → +${lv + 1}`), el('small', 'fine', `${t('upgrade.chance', { p: this.chance(lv, r.gz) })} · ${t('upgrade.cost', { n: costFor(lv + 1) })}`));
      const go = el('button', 'primary', '✨ ' + t('upgrade.go'));
      go.type = 'button';
      go.disabled = top || this.busy || !info || !!info.error;
      go.onclick = () => this.go(r);
      box.append(go);
      parts.push(box);
    }

    const odds = el('details', 'upgrade-odds');
    odds.open = this.odds;
    odds.ontoggle = () => { this.odds = odds.open; };
    odds.append(el('summary', null, '📊 ' + t('upgrade.odds')), el('small', 'fine', t('upgrade.oddsNote')));
    const table = el('table', 'upgrade-table');
    const head = el('tr');
    for (const k of ['colLv', 'colChance', 'colCost']) head.append(el('th', null, t('upgrade.' + k)));
    table.append(head);
    const open = info?.open || LEVEL_OPEN;
    for (let lv = 1; lv <= open; lv++) {
      const tr = el('tr');
      tr.append(el('td', null, '+' + lv), el('td', null, this.chance(lv - 1, 0) + '%'), el('td', null, String(costFor(lv))));
      table.append(tr);
    }
    odds.append(table);
    parts.push(odds);
    this.root.replaceChildren(...parts);
  }

  async go(row) {
    if (this.busy || !this.info || this.info.error) return;
    const i = row.i, e = this.bag.list()[i];
    if (!e || dishKindOf(e) !== row.kind) { this.render(); return; }
    const lv = Math.max(dishLevel(e), startLevel(e)), cost = costFor(lv + 1);
    if (this.info.tries >= this.info.daily) { this.toast(t('upgrade.limit')); return; }
    if (this.info.n < cost) { this.toast(t('upgrade.noSeasoning')); return; }
    this.busy = true;
    this.render();
    this.rid ||= newRequestId();
    const d = this.describe(e);
    let r;
    try {
      r = await this.store().upgrade({ requestId: this.rid, id: e.u, dish: row.kind, lv: dishLevel(e), gauge: e.gz | 0, start: startLevel(e), maker: e.by || this.myName() });
    } catch { r = { error: 'network' }; }
    this.busy = false;
    if (r.error) {
      if (r.error !== 'network') this.rid = null; // (a dropped connection: the same try again)
      if (Number.isFinite(r.n)) { this.info.n = r.n; this.onSeasoning(r.n); }
      this.toast(t({ seasoning: 'upgrade.noSeasoning', limit: 'upgrade.limit', max: 'upgrade.max', missing: 'upgrade.missing' }[r.error] || 'upgrade.network'));
      if (r.error === 'limit') this.info.tries = this.info.daily;
      this.render();
      return;
    }
    this.rid = null;
    const now = this.bag.list()[i] === e ? i : this.bag.list().indexOf(e);
    const next = { ...e, lv: r.lv };
    if (r.gauge) next.gz = r.gauge; else delete next.gz;
    if (r.id) next.u = r.id;
    if (now >= 0) this.bag.swap(now, next);
    Object.assign(this.info, { n: r.n, tries: r.tries });
    this.onSeasoning(r.n);
    this.sel = [row.kind, r.lv, row.medal, row.by, r.gauge | 0].join('|');
    this.toast(r.ok ? t('upgrade.ok', { name: d.name, lv: r.lv }) : t('upgrade.fail', { g: gaugeStep(lv + 1) }));
    this.onResult(r.ok);
    this.render();
  }
}
