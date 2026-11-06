// Fishing panel (Han River) and the fish market's selling panel. Rules and
// the catch list are in core/fishing.js.
//   cast → wait for a bite (tapping too early scares the fish) → tap to hook
//   → reel: tap fast enough in REEL_SECONDS (rarer fish need more taps).
import { t, getLanguage, localName } from '../core/i18n.js';
import { FISH, AVAILABLE_FISH, rollCatch, tapsFor, escapeChance, biteWait, BITE_WINDOW, REEL_SECONDS, BAG_MAX, rarityStars } from '../core/fishing.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
export const fishName = (f) => (getLanguage() === 'ko' ? f.ko : `${localName(f.name, getLanguage())} · ${f.ko} (${f.rom})`);
const pct = c => (c < 0.1 ? c.toFixed(2) : c.toFixed(1)) + '%';
const text = (ko, en) => localName({ ko, en });

// One round red-ink stamp for a fish: the fish, "한강 낚시" and its name.
// Uncaught kinds are an empty dashed ring with the fish's dark silhouette.
export function fishStamp(f, caught = true) {
  const st = el('div', 'fish-stamp' + (caught ? '' : ' empty'));
  st.style.setProperty('--tilt', ((FISH.indexOf(f) * 37) % 17) - 8 + 'deg');
  st.append(el('small', 'fish-stamp-top', caught ? '한강 낚시' : ''), el('span', 'fish-stamp-fish', f.emoji), el('b', 'fish-stamp-name', caught ? f.ko : '???'));
  return st;
}

// The fish book is a stamp book: one stamp per kind caught, with how many,
// and the rest as silhouettes with only their rarity shown.
export function fishBook(dex, fresh = null) {
  const wrap = el('div', 'fish-book');
  const head = el('div', 'stamp-head');
  const available = AVAILABLE_FISH.filter(f => dex.has(f.id)).length;
  head.append(el('span', 'stamp-kicker', 'ANOTHER SEOUL · FISHING JOURNAL'),
    el('strong', 'fish-book-title', text('나의 낚시 도감', 'My fishing journal')),
    el('p', 'dex-summary', text('공개된 27종 중 ', 'Available collection ') + available + '/' + AVAILABLE_FISH.length),
    el('small', null, text('전체 49종 · 새 친구들이 차례로 찾아와요', '49 species planned · more friends to come')));
  const bar = el('div', 'stamp-bar'), fill = el('i');
  fill.style.width = available / AVAILABLE_FISH.length * 100 + '%';
  bar.append(fill); head.append(bar);
  const grid = el('div', 'stamp-grid');
  const detail = el('div', 'fish-book-detail'); detail.setAttribute('aria-live', 'polite');
  const nav = el('div', 'fish-book-nav');
  const previous = el('button', 'chip', text('이전', 'Previous'));
  const next = el('button', 'chip', text('다음', 'Next'));
  previous.type = next.type = 'button';
  const number = el('span'); number.setAttribute('aria-live', 'polite');
  nav.append(previous, number, next);
  let page = Math.max(0, FISH.findIndex(f => f.id === fresh)) / 9 | 0;
  const showDetail = f => {
    const n = dex.count(f.id);
    detail.replaceChildren(el('strong', null, fishName(f)), el('p', null,
      !f.released ? text('추후 공개 예정이에요.', 'Coming in a future release.') : n
      ? text('누적 ', 'Caught ') + n + text('마리 · 판매 ', ' times · Sell ') + f.price + text('코인', ' coins')
      : text('아직 만나지 못했어요. 낚시로 도장을 모아보세요!', 'Not caught yet. Go fishing to earn this stamp!')));
  };
  const render = () => {
    grid.replaceChildren();
    grid.classList.toggle('fish-special-page', page === 5);
    for (const f of FISH.slice(page * 9, page * 9 + 9)) {
      const n = dex.count(f.id);
      const cell = el('button', 'stamp-cell fish-cell' + (n ? '' : ' empty') + (f.id === fresh ? ' fresh' : ''));
      cell.type = 'button';
      cell.setAttribute('aria-label', fishName(f) + ' · ' + (n ? text('수집 완료', 'Collected') : f.released ? text('미발견', 'Undiscovered') : text('공개 예정', 'Coming soon')));
      cell.append(fishStamp(f, !!n), el('i', 'fish-stars', '★'.repeat(rarityStars(f))),
        el('small', null, n ? '× ' + n : f.released ? text('미발견', 'Undiscovered') : text('공개 예정', 'Coming soon')));
      cell.onclick = () => showDetail(f);
      grid.append(cell);
    }
    number.textContent = (page + 1) + ' / 6' + (page === 5 ? text(' · 특별 수집', ' · Special catches') : '');
    previous.disabled = page === 0; next.disabled = page === 5;
    detail.replaceChildren(el('p', null, text('도장을 눌러 자세히 보기', 'Select a stamp to see details')));
  };
  previous.onclick = () => { page--; render(); };
  next.onclick = () => { page++; render(); };
  wrap.append(head, grid, nav, detail);
  render();
  return wrap;
}

// First catch of a kind: a stamp card pops up over everything, shows the
// fish, then the stamp slams down (콱!) with a shake and an ink splash.
// onSlam: at the moment of impact (for the sound). Tap anywhere to close;
// the button opens the book (onBook).
export function stampPop(f, dex, { onSlam, onClose, onBook } = {}) {
  document.querySelector('.fish-pop')?.remove();
  const pop = el('div', 'fish-pop');
  const card = el('div', 'fish-pop-card');
  const page = el('div', 'fish-pop-page');
  const st = fishStamp(f, true);
  st.classList.add('slam');
  page.append(el('span', 'fish-pop-big', f.emoji), st, el('span', 'fish-pop-ink'), el('b', 'fish-pop-bang', '콱!'));
  const done = dex.availableComplete;
  const ok = el('button', 'primary', '📖 ' + t('fish.book'));
  card.append(
    el('span', 'stamp-kicker', 'NEW · ' + t('fish.book')),
    page,
    el('strong', 'fish-pop-name', `${f.ko} · ${f.rom}`),
    el('small', null, `${localName(f.name, getLanguage())} · ${'★'.repeat(rarityStars(f))}`),
    el('p', 'fish-pop-count', done ? text('공개된 27종을 모두 모았어요!', 'All 27 available species collected!') : t('fish.bookNew', { k: dex.kinds, all: FISH.length })),
    ok,
  );
  pop.append(card);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    pop.classList.add('out');
    setTimeout(() => pop.remove(), 220);
    onClose?.();
  };
  pop.onclick = close;
  ok.onclick = (e) => { e.stopPropagation(); close(); onBook?.(); };
  document.body.append(pop);
  // The stamp lands 0.55 s in (see .fish-stamp.slam in style.css).
  setTimeout(() => { card.classList.add('hit'); onSlam?.(); }, 550);
  const timer = setTimeout(close, 6000);
  return { el: pop, close };
}

export class FishingUI {
  // bag: FishBag; onRod(on): show or hide the rod; onCatch(fish): after a catch.
  // dex: FishDex, every catch is recorded there too.
  constructor({ root, bag, dex, onRod, onCatch, onEscape, onClose, onStamp }) {
    Object.assign(this, { root, bag, dex, onRod, onCatch, onEscape, onClose, onStamp });
    this.timer = 0;
    this.state = 'idle';
  }

  get open() { return !this.root.hidden; }

  show() {
    this.root.hidden = false;
    this.onRod?.(true);
    this.renderIdle();
  }

  close() {
    clearTimeout(this.timer);
    clearInterval(this.tick);
    this.state = 'idle';
    this.root.hidden = true;
    this.onRod?.(false);
    this.onClose?.();
  }

  _frame(extra) {
    clearTimeout(this.timer);
    clearInterval(this.tick);
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🎣 ' + t('fish.title')));
    this.root.append(el('p', 'fish-bag', t('fish.bag', { n: this.bag.size, max: BAG_MAX, coins: this.bag.value })));
    if (extra) this.root.append(extra);
  }

  _water(text, cls = '') {
    const w = el('div', 'fish-water ' + cls);
    w.append(el('span', 'fish-bobber', '🔴'), el('p', null, text));
    return w;
  }

  renderIdle(note) {
    this.state = 'idle';
    this._frame(note ? el('p', 'order-hint', note) : null);
    this.root.append(this._water(t('fish.ready'), 'calm'));
    const cast = el('button', 'primary', '🎣 ' + t('fish.cast'));
    cast.disabled = this.bag.full;
    cast.onclick = () => this.cast();
    const actions = el('div', 'order-actions');
    actions.append(cast);
    if (this.dex) {
      const book = el('button', 'chip', `📖 ${t('fish.book')} · ${this.dex.kinds}/${FISH.length} · 🐟 ${this.dex.total}`);
      book.onclick = () => this.renderBook();
      actions.append(book);
    }
    if (this.bag.full) this.root.append(el('p', 'order-hint', t('fish.full')));
    this.root.append(actions, this._odds());
  }

  renderBook() {
    this.state = 'book';
    this._frame();
    const back = el('button', 'primary', '🎣 ' + t('fish.back'));
    back.onclick = () => this.renderIdle();
    const actions = el('div', 'order-actions');
    actions.append(back);
    this.root.append(fishBook(this.dex, this.fresh), actions);
    this.fresh = null;
  }

  // The catch list with chances and prices (a small "fish guide").
  _odds() {
    const d = el('details', 'fish-odds');
    d.append(el('summary', null, t('fish.guide')));
    const list = el('div', 'fish-list');
    for (const f of AVAILABLE_FISH) {
      const row = el('div', 'fish-row');
      row.append(el('span', 'fish-emoji', f.emoji), el('span', 'fish-name', fishName(f)), el('small', null, `${pct(f.chance)} · 🪙 ${f.price} · 💨 ${Math.round(escapeChance(f) * 100)}%`));
      list.append(row);
    }
    d.append(list);
    return d;
  }

  cast() {
    this.state = 'waiting';
    this._frame();
    const water = this._water(t('fish.waiting'), 'waiting');
    const btn = el('button', 'primary fish-hook', t('fish.hook'));
    btn.onclick = () => this.renderIdle(t('fish.tooEarly')); // nothing has bitten yet
    const actions = el('div', 'order-actions');
    actions.append(btn);
    this.root.append(water, actions);
    this.timer = setTimeout(() => this.bite(water, btn), biteWait() * 1000);
  }

  bite(water, btn) {
    this.state = 'bite';
    this.fish = rollCatch();
    water.className = 'fish-water bite';
    water.querySelector('p').textContent = t('fish.bite');
    btn.classList.add('pulse');
    btn.onclick = () => this.reel();
    this.timer = setTimeout(() => this.renderIdle(t('fish.slow')), BITE_WINDOW * 1000);
  }

  reel() {
    this.state = 'reel';
    const need = tapsFor(this.fish);
    let taps = 0, left = REEL_SECONDS;
    this._frame();
    const big = need >= 12;
    const water = this._water(big ? t('fish.bigOne') : t('fish.reeling'), 'reel');
    const bar = el('div', 'fish-meter');
    const fill = el('i');
    bar.append(fill);
    const time = el('small', 'fish-time');
    const btn = el('button', 'primary fish-reel', '🌀 ' + t('fish.reel'));
    const paint = () => {
      fill.style.width = Math.min(100, (taps / need) * 100) + '%';
      time.textContent = t('fish.time', { s: Math.max(0, left).toFixed(1) });
    };
    // pointerdown, not click: fast taps register at once (and no
    // double-tap zoom on phones, see .fish-reel in style.css).
    btn.onpointerdown = (e) => {
      e.preventDefault();
      if (this.state !== 'reel') return;
      taps++;
      paint();
      if (taps >= need) this.landed(Math.max(0, left) / REEL_SECONDS);
    };
    const actions = el('div', 'order-actions');
    actions.append(btn);
    this.root.append(water, bar, time, actions);
    paint();
    this.tick = setInterval(() => {
      left -= 0.1;
      paint();
      if (left <= 0) this.renderIdle(t('fish.gotAway'));
    }, 100);
  }

  renderTrash(item) {
    this._frame();
    const card = el('div', 'fish-card fish-trash-card');
    const image = el('img', 'fish-trash-image');
    image.src = item.image;
    image.alt = text('물에서 건진 고물장화', 'An old boot recovered from the water');
    image.width = image.height = 160;
    card.append(el('span', 'stamp-kicker', text('쓰레기를 건졌어요', 'Litter recovered')), image,
      el('strong', null, text('고물장화', 'Old boot')),
      el('p', null, text('물가에 쓰레기를 버리지 마세요.', 'Please do not litter near the water.')),
      el('small', null, text('건져낸 장화는 수거했어요. 물가가 조금 더 깨끗해졌어요!', 'The boot has been collected for disposal. The water is a little cleaner!')));
    const again = el('button', 'primary', t('fish.again'));
    again.disabled = this.bag.full;
    again.onclick = () => this.cast();
    this.root.append(card, again);
  }

  landed(spare = 0) {
    clearInterval(this.tick);
    this.state = 'landed';
    const f = this.fish;
    if (f.trash) { this.renderTrash(f); return; }
    if (Math.random() < escapeChance(f, spare)) { this.escaped(f); return; }
    const kept = this.bag.add(f.id);
    const isNew = this.dex ? this.dex.add(f.id) : false;
    this.fresh = isNew ? f.id : null; // the book shows its stamp pressing in
    this._frame();
    const card = el('div', 'fish-card' + (f.chance <= 2 ? ' rare' : ''));
    if (isNew) card.append(el('span', 'fish-new', t('fish.bookNew', { k: this.dex.kinds, all: FISH.length })));
    if (isNew) stampPop(f, this.dex, { onSlam: this.onStamp, onBook: () => this.open && this.renderBook() });
    card.append(
      el('span', 'fish-big', f.emoji),
      el('strong', null, f.ko),
      el('small', 'order-rom', f.rom),
      el('small', null, `${localName(f.name, getLanguage())} · ${pct(f.chance)} · 🪙 ${f.price}`),
    );
    this.root.append(card, el('p', 'order-hint', kept ? t('fish.caught', { name: fishName(f) }) : t('fish.full')));
    const again = el('button', 'primary', '🎣 ' + t('fish.again'));
    again.onclick = () => this.cast();
    again.disabled = this.bag.full;
    const actions = el('div', 'order-actions');
    actions.append(again);
    if (this.dex) {
      const book = el('button', 'chip', `📖 ${t('fish.book')} · ${this.dex.kinds}/${FISH.length}`);
      book.onclick = () => this.renderBook();
      actions.append(book);
    }
    this.root.append(actions);
    if (kept) this.onCatch?.(f, isNew);
  }
}

// It slipped off the hook right at the end.
FishingUI.prototype.escaped = function escaped(f) {
  this._frame();
  const card = el('div', 'fish-card escaped');
  card.append(el('span', 'fish-big', f.emoji), el('strong', null, f.ko), el('small', 'order-rom', f.rom));
  this.root.append(card, el('p', 'order-hint', t('fish.escaped', { name: fishName(f) })));
  const again = el('button', 'primary', '🎣 ' + t('fish.again'));
  again.onclick = () => this.cast();
  again.disabled = this.bag.full;
  const actions = el('div', 'order-actions');
  actions.append(again);
  this.root.append(actions);
  this.onEscape?.(f);
};

// Fish market: sell one, a whole kind, or everything.
export class FishMarketUI {
  constructor({ root, bag, wallet, onSold }) {
    Object.assign(this, { root, bag, wallet, onSold });
  }

  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }

  show() {
    this.root.hidden = false;
    this.render();
  }

  render() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🐟 ' + t('fish.market')));
    const items = this.bag.list();
    if (!items.length) {
      this.root.append(el('p', 'fine', t('fish.empty')));
      return;
    }
    const list = el('div', 'fish-list');
    for (const { fish: f, n } of items) {
      const row = el('div', 'fish-row');
      const one = el('button', 'chip', t('fish.sellOne', { coins: f.price }));
      one.onclick = () => this._sell(f.id, 1);
      const all = el('button', 'chip', t('fish.sellKind', { n, coins: f.price * n }));
      all.onclick = () => this._sell(f.id);
      row.append(el('span', 'fish-emoji', f.emoji), el('span', 'fish-name', `${fishName(f)} × ${n}`), one, all);
      list.append(row);
    }
    const sellAll = el('button', 'primary', t('fish.sellAll', { coins: this.bag.value }));
    sellAll.onclick = () => this._sell(null);
    const actions = el('div', 'order-actions');
    actions.append(sellAll);
    this.root.append(list, actions);
  }

  _sell(id, n) {
    const coins = id ? this.bag.sell(id, n) : this.bag.sellAll();
    if (coins) this.wallet.add(coins);
    this.onSold?.(coins);
    this.render();
  }
}

// The fish book on its own (opened from the wallet).
export class FishBookUI {
  constructor({ root, dex }) {
    Object.assign(this, { root, dex });
  }
  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }
  show() {
    this.root.hidden = false;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '📖 ' + t('fish.book')), fishBook(this.dex));
  }
}
