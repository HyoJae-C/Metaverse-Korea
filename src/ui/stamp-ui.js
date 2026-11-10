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
  prev: { en: 'Previous', ko: '이전', ja: '前へ', zh: '上一页' },
  next: { en: 'Next', ko: '다음', ja: '次へ', zh: '下一页' },
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

// Stamps per page of the note: a 2×2 grid you turn like a book.
export const STAMPS_PER_PAGE = 4;
export const stampPages = (n) => Math.max(1, Math.ceil(n / STAMPS_PER_PAGE));

export class StampUI {
  constructor({ root, book, stamps, trails = [], trailLog = null }) {
    Object.assign(this, { root, book, stamps, trails, trailLog, page: 0 });
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
    const pages = stampPages(list.length);
    const at = fresh ? list.findIndex((s) => s.id === fresh) : -1;
    if (at >= 0) this.page = Math.floor(at / STAMPS_PER_PAGE);
    this.page = Math.min(pages - 1, Math.max(0, this.page));
    const grid = el('div', 'stamp-grid stamp-page');
    const nav = el('div', 'fish-book-nav stamp-nav');
    const prev = el('button', 'chip', tt('prev'));
    const next = el('button', 'chip', tt('next'));
    prev.type = next.type = 'button';
    const num = el('span');
    num.setAttribute('aria-live', 'polite');
    nav.append(prev, num, next);
    const render = () => {
      const from = this.page * STAMPS_PER_PAGE;
      grid.replaceChildren(...list.slice(from, from + STAMPS_PER_PAGE).map((s, k) => {
        const i = from + k, got = this.book.date(s.id);
        const cell = el('div', 'stamp-cell' + (got ? '' : ' empty') + (fresh === s.id ? ' fresh' : ''));
        const art = el('div', 'stamp-art');
        if (got) art.innerHTML = stampSvg(s, i);
        cell.append(art, el('strong', null, L(s.name)), el('small', null, L(s.gu)), el('em', null, got ? got.replaceAll('-', '.') : tt('notYet')));
        return cell;
      }));
      // Keep the last page the same size so the buttons don't jump up.
      while (grid.childElementCount < STAMPS_PER_PAGE) grid.append(el('div', 'stamp-cell stamp-blank'));
      num.textContent = `${this.page + 1} / ${pages}`;
      prev.disabled = this.page === 0;
      next.disabled = this.page === pages - 1;
      nav.hidden = pages < 2;
    };
    const go = (d) => {
      const p = Math.min(pages - 1, Math.max(0, this.page + d));
      if (p === this.page) return;
      this.page = p;
      fresh = null; // the press-in plays once, not again on every page turn
      render();
    };
    prev.onclick = () => go(-1);
    next.onclick = () => go(1);
    // Swipe left / right on the page to turn it (phones).
    let sx = null, sy = 0;
    grid.onpointerdown = (e) => { sx = e.clientX; sy = e.clientY; };
    grid.onpointerup = (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    };
    grid.onpointercancel = () => { sx = null; };
    render();
    const trails = this.trailList(list);
    this.root.replaceChildren(x, head, grid, nav, el('p', 'order-hint', tt('how', { c: STAMP_REWARD })), ...(trails ? [trails] : []));
  }
}
