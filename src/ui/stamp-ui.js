// Stamp note panel (스탬프 노트): every stamp-tour place, stamped or not.
// Opened from the wallet, or right after you stamp at a stand.
import { L, fmt } from './pocha-ui.js';
import { stampSvg } from './stamp-art.js';
import { STAMP_REWARD } from '../core/stamp-book.js';
import { trailProgress } from '../core/trails.js';

export const STAMP_TEXT = {
  title: { en: 'Seoul stamp note', ko: '서울 스탬프 노트', ja: 'ソウル スタンプノート', zh: '首尔印章本' },
  kicker: { en: 'SEOUL STAMP TOUR', ko: 'SEOUL STAMP TOUR', ja: 'SEOUL STAMP TOUR', zh: 'SEOUL STAMP TOUR' },
  progress: { en: '{n} / {all} stamps', ko: '스탬프 {n} / {all}', ja: 'スタンプ {n} / {all}', zh: '印章 {n} / {all}' },
  how: { en: 'Find the stamp stand at each place and press it. Each new stamp gives 🪙{c}. More places are coming.', ko: '장소마다 있는 스탬프대에서 찍어요. 새 스탬프 하나에 🪙{c}. 장소는 계속 늘어나요.', ja: '各スポットのスタンプ台で押してね。新しいスタンプ1つで🪙{c}。スポットはこれからも増えます。', zh: '在每个地点的印章台盖章。每个新印章🪙{c}。地点还会增加。' },
  notYet: { en: 'Not yet', ko: '아직', ja: 'まだ', zh: '还没有' },
  stamp: { en: 'Stamp', ko: '스탬프 찍기', ja: 'スタンプを押す', zh: '盖章' },
  open: { en: 'Stamp note', ko: '스탬프 노트', ja: 'スタンプノート', zh: '印章本' },
  got: { en: 'Stamped! {name} +🪙{c}', ko: '스탬프 쾅! {name} +🪙{c}', ja: 'スタンプ！{name} +🪙{c}', zh: '盖章成功！{name} +🪙{c}' },
  ledger: { en: 'Stamp · {name}', ko: '스탬프 · {name}', ja: 'スタンプ · {name}', zh: '印章 · {name}' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
  trails: { en: 'Courses', ko: '코스', ja: 'コース', zh: '路线' },
  trailReward: { en: 'Finish: +🪙{c}', ko: '완주 보상 +🪙{c}', ja: '完走で +🪙{c}', zh: '完成奖励 +🪙{c}' },
  trailFinished: { en: 'Finished!', ko: '완주!', ja: '完走！', zh: '已完成！' },
  trailDone: { en: '{name} finished! +🪙{c}', ko: '{name} 완주! +🪙{c}', ja: '{name} 完走！ +🪙{c}', zh: '{name} 完成！ +🪙{c}' },
  trailLedger: { en: 'Course finished · {name}', ko: '코스 완주 · {name}', ja: 'コース完走 · {name}', zh: '路线完成 · {name}' },
};
const tt = (k, v) => fmt(L(STAMP_TEXT[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class StampUI {
  constructor({ root, book, stamps, trails = [], trailLog = null }) {
    Object.assign(this, { root, book, stamps, trails, trailLog });
  }
  // Courses: each one's stops in order, ticked when stamped.
  trailList(list) {
    const box = el('div', 'stamp-trails');
    const byId = new Map(list.map((s) => [s.id, s]));
    for (const tr of this.trails) {
      const p = trailProgress(tr, list, this.book);
      if (!p.all) continue;
      const card = el('div', 'stamp-trail' + (p.done ? ' done' : ''));
      card.append(el('strong', null, `${tr.icon} ${L(tr.name)} · ${p.got}/${p.all}`));
      card.append(el('p', null, L(tr.intro)));
      const stops = el('ol', 'stamp-stops');
      for (const id of p.stops) stops.append(el('li', this.book.has(id) ? 'got' : null, (this.book.has(id) ? '✓ ' : '') + L(byId.get(id).name)));
      card.append(stops, el('small', null, p.done || this.trailLog?.has(tr.id) ? tt('trailFinished') : tt('trailReward', { c: tr.reward })));
      box.append(card);
    }
    return box.childElementCount ? box : null;
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  // fresh: id of a stamp you just got, to play the press-in animation.
  show(fresh = null) {
    this.root.hidden = false;
    const list = this.stamps();
    const n = this.book.count(list);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    const head = el('div', 'stamp-head');
    const bar = el('div', 'stamp-bar');
    const fill = el('i');
    fill.style.width = (list.length ? (100 * n) / list.length : 0) + '%';
    bar.append(fill);
    head.append(el('small', 'stamp-kicker', tt('kicker')), el('h3', null, '🔖 ' + tt('title')), bar, el('p', 'stamp-count', tt('progress', { n, all: list.length })));
    const grid = el('div', 'stamp-grid');
    list.forEach((s, i) => {
      const got = this.book.date(s.id);
      const cell = el('div', 'stamp-cell' + (got ? '' : ' empty') + (fresh === s.id ? ' fresh' : ''));
      const art = el('div', 'stamp-art');
      if (got) art.innerHTML = stampSvg(s, i);
      cell.append(art, el('strong', null, L(s.name)), el('small', null, L(s.gu)), el('em', null, got ? got.replaceAll('-', '.') : tt('notYet')));
      grid.append(cell);
    });
    const trails = this.trailList(list);
    this.root.replaceChildren(x, head, el('p', 'order-hint', tt('how', { c: STAMP_REWARD })), ...(trails ? [trails] : []), grid);
    if (fresh) this.root.querySelector('.stamp-cell.fresh')?.scrollIntoView({ block: 'nearest' });
  }
}
