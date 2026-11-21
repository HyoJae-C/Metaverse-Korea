// The farmer's journal page (core/farm-journal.js). On top, "My beds": what
// grows in each of your twelve beds right now, how long is left, whether it
// was watered today, and what waits in your seed pouch, so you can check
// from anywhere (Yozi 2026-11-21: here, not on the map, which is full
// already). Below, a stamp for each crop you harvested yourself, the ones
// still to grow shown faint with how many days they take. Opened from the
// notebook; downloaded then.
import { t } from '../core/i18n.js';
import { CROPS, bedState, cropById, cropDays, timeLeft } from '../core/farm.js';
import { LocalFarm, SupabaseFarm } from '../core/farm-till.js';

const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const time = (ms) => { const { d, h, m } = timeLeft(ms); return d ? t(h ? 'farm.dh' : 'farm.d', { d, h }) : h ? t(m ? 'farm.hm' : 'farm.h', { h, m }) : t('farm.m', { m: Math.max(1, m) }); };

export class FarmJournalUI {
  // cloud, wallet: the game's, to ask the farm's keeper (core/farm-till.js).
  constructor({ root, journal, cloud, wallet }) {
    Object.assign(this, { root, journal, cloud, wallet });
    this.farm = null; // what the keeper last said: { now, beds, seeds } or { error }
    this.till = null;
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  store() {
    const live = this.cloud?.status === 'cloud' && this.cloud.client && this.cloud.user;
    if (live && !(this.till instanceof SupabaseFarm)) this.till = new SupabaseFarm(this.cloud, this.wallet);
    if (!live && !(this.till instanceof LocalFarm)) this.till = new LocalFarm(this.wallet);
    return this.till;
  }
  show() {
    this.root.hidden = false;
    this.render();
    this.store().info().then((r) => { this.farm = r.error ? { error: r.error } : { ...r, skew: r.now - Date.now() }; if (this.open) this.render(); }).catch(() => {});
  }
  // My beds: one small square a bed.
  beds() {
    const f = this.farm, box = el('div', 'farm-now');
    box.append(el('b', 'farm-now-title', '🪴 ' + t('farm.mine')));
    if (!f) { box.append(el('small', null, '…')); return box; }
    if (f.error) { box.append(el('small', null, t(f.error === 'missing' ? 'farm.missing' : 'farm.network'))); return box; }
    const now = Date.now() + f.skew, states = f.beds.map((b) => bedState(b, now));
    const n = (stage) => states.filter((s) => s.stage === stage).length;
    box.append(el('small', null, t('farm.mineSum', { ripe: n('ripe'), thirsty: n('thirsty'), growing: n('growing'), empty: n('empty') })));
    const grid = el('div', 'farm-now-grid');
    for (const s of states) {
      const cell = el('div', 'farm-now-cell ' + s.stage);
      if (s.stage === 'empty') cell.append(el('span', null, '·'));
      else cell.append(el('span', null, s.crop.emoji), el('small', null, s.stage === 'ripe' ? '🧺' : `${s.stage === 'thirsty' ? '💧 ' : ''}${time(s.left)}`), el('small', 'farm-now-water', s.stage === 'ripe' ? (s.fresh ? '✨' : '') : `${s.n}/${s.need}`));
      grid.append(cell);
    }
    box.append(grid);
    const pouch = Object.entries(f.seeds || {}).filter(([id, k]) => k > 0 && cropById(id));
    if (pouch.length) box.append(el('small', null, '🌱 ' + t('farm.pouch') + ' ' + pouch.map(([id, k]) => `${cropById(id).emoji} ${t('farm.' + id)} × ${k}`).join(' · ')));
    return box;
  }
  render() {
    const j = this.journal;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    const grid = el('div', 'farm-log-grid');
    for (const c of CROPS) {
      const got = j.has(c.id), secret = c.from === 'rare' && !got; // (a rare crop keeps its name until you grow one)
      const cell = el('div', 'farm-log-cell' + (got ? ' got' : '') + (j.fresh(c.id) ? ' fresh' : '') + (secret ? ' secret' : ''));
      cell.append(el('span', 'farm-log-stamp', secret ? '❓' : c.emoji), el('b', null, secret ? '???' : t('farm.' + c.id)), el('small', null, got ? `× ${j.count(c.id)}${j.fresh(c.id) ? ` · ✨ ${j.fresh(c.id)}` : ''}` : secret ? t('farm.logRare') : t('farm.days', { n: cropDays(c) })));
      grid.append(cell);
    }
    this.root.replaceChildren(x, el('h3', null, '🌱 ' + t('farm.log')), this.beds(), el('p', 'fine', t('farm.logHow', { k: j.kinds, all: CROPS.length })), grid);
  }
}
