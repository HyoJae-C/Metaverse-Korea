// Library books: pick one from the shelf to carry, then read it page by page
// while sitting anywhere (a café, a bench, the jjimjilbang...).
import { BOOKS, bookById, pageCount, EDITIONS, defaultEdition, pageUrl } from '../core/books.js';
import { getLanguage } from '../core/i18n.js';
import { L, fmt } from './pocha-ui.js';

const T = {
  shelf: { en: 'Korean bookshelf', ko: '한국어 책장', ja: '韓国語の本棚', zh: '韩语书架' },
  shelfHow: {
    en: 'Pick a book to carry. Sit down anywhere and tap 📖 to read it.',
    ko: '책을 골라 들고 가세요. 어디든 앉아서 📖를 누르면 읽을 수 있어요.',
    ja: '本を選んで持って行こう。どこでも座って📖を押すと読めます。',
    zh: '选一本书带走。随便找个地方坐下，点📖就能读。',
  },
  take: { en: 'Carry', ko: '들고 가기', ja: '持って行く', zh: '带走' },
  carrying: { en: 'In your hand', ko: '들고 있음', ja: '手に持っている', zh: '拿在手里' },
  pages: { en: '{n} pages', ko: '{n}쪽', ja: '{n}ページ', zh: '{n}页' },
  page: { en: 'Page {i} / {n}', ko: '{i} / {n}쪽', ja: '{i} / {n}ページ', zh: '第{i} / {n}页' },
  prev: { en: '◀ Back', ko: '◀ 이전', ja: '◀ 前へ', zh: '◀ 上一页' },
  next: { en: 'Next ▶', ko: '다음 ▶', ja: '次へ ▶', zh: '下一页 ▶' },
  putDown: { en: 'Put the book away', ko: '책 내려놓기', ja: '本をしまう', zh: '把书放下' },
  close: { en: 'Close', ko: '닫기', ja: '閉じる', zh: '关闭' },
};
const tt = (k, v) => fmt(L(T[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class BookUI {
  // carrying(): the book id in hand or null; take(id); putDown();
  // getPage(id) / setPage(id, i) remember where you stopped.
  constructor({ root, carrying, take, putDown, getPage, setPage }) {
    Object.assign(this, { root, carrying, take, putDown, getPage, setPage });
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; this.root.classList.remove('book-full'); }
  _head(title) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, title));
  }

  showShelf() {
    this.root.hidden = false;
    this._head('📚 ' + tt('shelf'));
    this.root.append(el('p', 'order-hint', tt('shelfHow')));
    const grid = el('div', 'book-grid');
    for (const b of BOOKS) {
      const mine = this.carrying() === b.id;
      const card = el('button', 'book-card' + (mine ? ' picked' : ''));
      card.style.setProperty('--spine', b.color);
      card.append(el('span', 'book-icon', b.icon), el('strong', null, L(b.title)), el('small', null, mine ? tt('carrying') : tt('pages', { n: pageCount(b) })));
      card.onclick = () => { this.take(b.id); this.showShelf(); };
      grid.append(card);
    }
    this.root.append(grid);
  }

  read(id) {
    const b = bookById(id);
    if (!b) return;
    this.root.hidden = false;
    if (b.textbook) { this._readTextbook(b); return; }
    this.root.classList.remove('book-full');
    const n = b.pages.length;
    const i = Math.min(n - 1, Math.max(0, this.getPage(id) | 0));
    this._head(`${b.icon} ${L(b.title)}`);
    const pg = b.pages[i];
    const page = el('div', 'book-page');
    page.style.setProperty('--spine', b.color);
    page.append(el('p', 'book-ko', pg.ko), el('p', 'book-rom', pg.rom), el('p', 'book-mean', L(pg.mean)));
    const nav = el('div', 'order-actions');
    const prev = el('button', 'chip', tt('prev'));
    prev.disabled = i === 0;
    prev.onclick = () => { this.setPage(id, i - 1); this.read(id); };
    const next = el('button', 'primary', tt('next'));
    next.disabled = i === n - 1;
    next.onclick = () => { this.setPage(id, i + 1); this.read(id); };
    nav.append(prev, el('span', 'book-num', tt('page', { i: i + 1, n })), next);
    const away = el('button', 'chip', '📕 ' + tt('putDown'));
    away.onclick = () => { this.putDown(); this.close(); };
    const foot = el('div', 'order-actions');
    foot.append(away);
    this.root.append(page, nav, foot);
  }

  // Textbooks: full-screen page images, for studying. Swipe or tap the
  // left/right edge to turn pages; switch editions (English, 简体, 繁體).
  _readTextbook(b) {
    const root = this.root;
    root.classList.add('book-full');
    let ed = this.edition || defaultEdition(getLanguage());
    try { ed = localStorage.getItem('mk.bookEdition') || ed; } catch { /* storage blocked */ }
    if (!EDITIONS.some((e) => e.id === ed)) ed = 'en';
    const n = b.textbook.pages;
    const BASE = import.meta.env?.BASE_URL || '/';
    const i = Math.min(n - 1, Math.max(0, this.getPage(b.id) | 0));
    const edition = EDITIONS.find((e) => e.id === ed);
    const go = (j) => { if (j < 0 || j >= n) return; this.setPage(b.id, j); this._readTextbook(b); root.querySelector('.tb-view')?.scrollTo(0, 0); };

    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    const head = el('div', 'tb-head');
    head.append(el('strong', null, `${edition.title} · TOPIK ${b.textbook.level}`));
    const eds = el('div', 'tb-eds');
    for (const e of EDITIONS) {
      const btn = el('button', 'chip' + (e.id === ed ? ' on' : ''), e.label);
      btn.onclick = () => { this.edition = e.id; try { localStorage.setItem('mk.bookEdition', e.id); } catch { /* storage blocked */ } this._readTextbook(b); };
      eds.append(btn);
    }
    head.append(eds);
    const view = el('div', 'tb-view' + (this.zoom ? ' zoom' : ''));
    const img = el('img', 'tb-page');
    img.alt = `${edition.title} TOPIK ${b.textbook.level} ${i + 1}/${n}`;
    img.src = BASE + pageUrl(b, ed, i);
    img.draggable = false;
    view.append(img);
    // Tap the left or right third of the page to turn; swipe too.
    let sx = null;
    view.onpointerdown = (e) => { sx = e.clientX; };
    view.onpointerup = (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx, r = view.getBoundingClientRect();
      sx = null;
      if (this.zoom) return; // zoomed in: drag to look around, turn with the buttons
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      else if (e.clientX < r.left + r.width / 3) go(i - 1);
      else if (e.clientX > r.right - r.width / 3) go(i + 1);
    };
    if (i + 1 < n) new Image().src = BASE + pageUrl(b, ed, i + 1); // preload the next page
    const nav = el('div', 'tb-nav');
    const prev = el('button', 'chip', tt('prev'));
    prev.disabled = i === 0;
    prev.onclick = () => go(i - 1);
    const next = el('button', 'primary', tt('next'));
    next.disabled = i === n - 1;
    next.onclick = () => go(i + 1);
    const away = el('button', 'chip', '📕');
    away.title = tt('putDown');
    away.onclick = () => { this.putDown(); this.close(); };
    const zoom = el('button', 'chip' + (this.zoom ? ' on' : ''), this.zoom ? '🔍−' : '🔍+');
    zoom.onclick = () => { this.zoom = !this.zoom; this._readTextbook(b); };
    nav.append(prev, el('span', 'book-num', `${i + 1} / ${n}`), next, zoom, away);
    root.replaceChildren(x, head, view, nav);
  }
}
