// Library books: pick one from the shelf to carry, then read it page by page
// while sitting anywhere (a café, a bench, the jjimjilbang...).
import { BOOKS, bookById, pageCount, EDITIONS, defaultEdition, pageUrl, LIT_KINDS, litUrl } from '../core/books.js';
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
  library: { en: 'Library', ko: '도서관', ja: '図書館', zh: '图书馆' },
  learn: { en: 'Learn Korean', ko: '한국어 공부', ja: '韓国語の勉強', zh: '学韩语' },
  children: { en: "Children's stories", ko: '어린이 동화', ja: '子ども向けのお話', zh: '儿童故事' },
  story: { en: 'Short stories', ko: '단편소설', ja: '短編小説', zh: '短篇小说' },
  poems: { en: 'Poetry', ko: '시집', ja: '詩集', zh: '诗集' },
  freeNote: {
    en: 'Free to read: Korean classics whose copyright has ended, and old folk tales, with English translations.',
    ko: '저작권이 끝난 한국 문학과 옛이야기를 무료로 읽을 수 있어요. 영어 번역도 함께 있어요.',
    ja: '著作権が切れた韓国の名作と昔話を無料で読めます。英語訳つき。',
    zh: '免费阅读版权已过期的韩国经典和民间故事，附英文翻译。',
  },
  cover: { en: 'Cover', ko: '표지', ja: '表紙', zh: '封面' },
  start: { en: 'Start reading ▶', ko: '읽기 시작 ▶', ja: '読みはじめる ▶', zh: '开始阅读 ▶' },
  source: { en: 'Source', ko: '출처', ja: '出典', zh: '出处' },
  license: { en: 'Copyright', ko: '저작권', ja: '著作権', zh: '版权' },
  loading: { en: 'Opening the book…', ko: '책을 펴는 중…', ja: '本を開いています…', zh: '正在打开书…' },
  failed: { en: "Couldn't open this book. Check your connection and try again.", ko: '책을 열지 못했어요. 연결을 확인하고 다시 시도해 주세요.', ja: '本を開けませんでした。接続を確認してもう一度お試しください。', zh: '无法打开这本书。请检查网络后重试。' },
  retry: { en: 'Try again', ko: '다시 시도', ja: '再試行', zh: '重试' },
  modeKo: { en: '한국어', ko: '한국어', ja: '한국어', zh: '한국어' },
  modeEn: { en: 'English', ko: 'English', ja: 'English', zh: 'English' },
  modeBoth: { en: 'Both', ko: '함께 보기', ja: '両方', zh: '对照' },
};
// Opened library books, by id (the JSON is fetched once per visit).
const litCache = new Map();
const LIT_MODES = ['ko', 'en', 'both'];
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
  close() { this.root.hidden = true; this.root.classList.remove('book-full', 'book-lit'); this._litOpen = null; }
  _head(title) {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, title));
  }

  showShelf() {
    this.root.hidden = false;
    this.root.classList.remove('book-full', 'book-lit');
    this._head('📚 ' + tt('library'));
    this.root.append(el('p', 'order-hint', tt('shelfHow')));
    const section = (title, list, note) => {
      this.root.append(el('h4', 'book-shelf-title', title));
      if (note) this.root.append(el('p', 'fine', note));
      const grid = el('div', 'book-grid');
      for (const b of list) {
        const mine = this.carrying() === b.id;
        const card = el('button', 'book-card' + (mine ? ' picked' : ''));
        card.style.setProperty('--spine', b.color);
        card.append(el('span', 'book-icon', b.icon), el('strong', null, L(b.title)));
        if (b.lit) card.append(el('small', 'book-author', L(b.lit.author)));
        card.append(el('small', null, mine ? tt('carrying') : tt('pages', { n: pageCount(b) })));
        card.onclick = () => { this.take(b.id); this.showShelf(); };
        grid.append(card);
      }
      this.root.append(grid);
    };
    section('🇰🇷 ' + tt('learn'), BOOKS.filter((b) => !b.lit));
    LIT_KINDS.forEach((k, i) => section({ children: '🧸 ', story: '📖 ', poems: '🌸 ' }[k] + tt(k), BOOKS.filter((b) => b.lit?.kind === k), i === 0 ? tt('freeNote') : null));
  }

  read(id) {
    const b = bookById(id);
    if (!b) return;
    this.root.hidden = false;
    if (b.textbook) { this._readTextbook(b); return; }
    if (b.lit) { this._readLit(b); return; }
    this.root.classList.remove('book-full', 'book-lit');
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

  // Stories and poems: page 0 is the cover (author, source, copyright), then
  // each page shows the Korean original, the English translation, or both.
  get litMode() {
    let m = this._litMode;
    try { m = m || localStorage.getItem('mk.litMode'); } catch { /* storage blocked */ }
    return LIT_MODES.includes(m) ? m : getLanguage() === 'ko' ? 'ko' : 'en';
  }
  set litMode(m) { this._litMode = m; try { localStorage.setItem('mk.litMode', m); } catch { /* storage blocked */ } }

  _readLit(b) {
    const root = this.root;
    root.classList.remove('book-full');
    root.classList.add('book-lit');
    this._litOpen = b.id;
    const data = litCache.get(b.id);
    if (data && !(data instanceof Promise)) { this._renderLit(b, data); return; }
    this._head(`${b.icon} ${L(b.title)}`);
    if (data === undefined && this._litFailed === b.id) {
      root.append(el('p', 'order-hint', tt('failed')));
      const again = el('button', 'primary', tt('retry'));
      again.onclick = () => { this._litFailed = null; this._readLit(b); };
      const foot = el('div', 'order-actions');
      foot.append(again);
      root.append(foot);
      return;
    }
    root.append(el('p', 'order-hint', tt('loading')));
    if (data) return; // already on its way
    const BASE = import.meta.env?.BASE_URL || '/';
    const p = fetch(BASE + litUrl(b)).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
    litCache.set(b.id, p);
    p.then((d) => { litCache.set(b.id, d); }, () => { litCache.delete(b.id); this._litFailed = b.id; })
      .then(() => { if (!root.hidden && this._litOpen === b.id) this._readLit(b); });
  }

  _renderLit(b, data) {
    const root = this.root;
    const n = data.pages.length;
    const i = Math.min(n, Math.max(0, this.getPage(b.id) | 0));
    const go = (j) => { this.setPage(b.id, j); this._renderLit(b, data); root.scrollTo?.(0, 0); };
    this._head(`${b.icon} ${L(b.title)}`);
    const page = el('div', 'book-page lit-page');
    page.style.setProperty('--spine', b.color);
    const mode = this.litMode;
    if (i === 0) {
      page.classList.add('lit-cover');
      page.append(el('div', 'lit-cover-icon', b.icon), el('p', 'lit-cover-title', data.title.ko));
      if (data.title.en) page.append(el('p', 'lit-cover-sub', data.title.en));
      page.append(el('p', 'lit-cover-author', L(data.author)), el('p', 'lit-about', L(data.about)));
      const src = el('p', 'lit-fine');
      src.append(el('strong', null, tt('source') + ': '));
      data.source.split(' · ').forEach((u, k) => {
        if (k) src.append(' · ');
        if (/^https?:/.test(u)) {
          const a = el('a', null, decodeURI(u).replace(/^https?:\/\//, ''));
          a.href = u; a.target = '_blank'; a.rel = 'noopener';
          src.append(a);
        } else src.append(u);
      });
      const lic = el('p', 'lit-fine');
      lic.append(el('strong', null, tt('license') + ': '), data.license);
      page.append(src, lic);
    } else {
      const pg = data.pages[i - 1];
      if (pg.heading) page.append(el('h4', 'lit-heading', mode === 'ko' ? pg.heading.ko : mode === 'en' ? pg.heading.en : `${pg.heading.ko} · ${pg.heading.en}`));
      const block = (text, cls, lang) => {
        const box = el('div', 'lit-text ' + cls);
        box.lang = lang;
        for (const para of text.split(/\n\n+/)) {
          box.append(para.startsWith('# ') ? el('h5', 'lit-sub', para.slice(2)) : el('p', null, para));
        }
        return box;
      };
      if (mode !== 'en') page.append(block(pg.ko, 'lit-ko', 'ko'));
      if (mode !== 'ko') page.append(block(pg.en, 'lit-en', 'en'));
    }
    const modes = el('div', 'lit-modes');
    for (const m of LIT_MODES) {
      const c = el('button', 'chip' + (m === mode ? ' on' : ''), tt({ ko: 'modeKo', en: 'modeEn', both: 'modeBoth' }[m]));
      c.onclick = () => { this.litMode = m; this._renderLit(b, data); };
      modes.append(c);
    }
    const nav = el('div', 'order-actions');
    const prev = el('button', 'chip', tt('prev'));
    prev.disabled = i === 0;
    prev.onclick = () => go(i - 1);
    const next = el('button', 'primary', i === 0 ? tt('start') : tt('next'));
    next.disabled = i === n;
    next.onclick = () => go(i + 1);
    const away = el('button', 'chip', '📕');
    away.title = tt('putDown');
    away.setAttribute('aria-label', tt('putDown'));
    away.onclick = () => { this.putDown(); this.close(); };
    nav.append(prev, el('span', 'book-num', i === 0 ? tt('cover') : `${i} / ${n}`), next, away);
    root.append(modes, page, nav);
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
