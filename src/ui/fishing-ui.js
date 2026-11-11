// Fishing helpers the street needs (trophies, catch bubbles, fish pictures,
// the book and stamps). The panels themselves are in fishing-panels.js,
// downloaded the first time one opens. Rules and the catch list are in
// core/fishing.js.
//   cast → wait for a bite (tapping too early scares the fish) → tap to hook
//   → reel: tap fast enough in REEL_SECONDS (rarer fish need more taps).
import { t, getLanguage, localName } from '../core/i18n.js';

import { FISH, AVAILABLE_FISH, rarityStars, feelOf, TIER_NAMES, BITE_LINES, FISH_SHEET, parkOf, SHEET_COLS, SHEET_ROWS, ESCAPE } from '../core/fishing.js';

export const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
export const fishName = (f) => (getLanguage() === 'ko' ? f.ko : `${localName(f.name, getLanguage())} · ${f.ko} (${f.rom})`);
export const pct = c => (c < 0.1 ? c.toFixed(2) : c.toFixed(1)) + '%';
export const text = (ko, en) => localName({ ko, en });
// A rod's effect, shown as the real escape chance of the hardest fish (★5):
// "💨 ★5 30% → 22.5%". The cut is relative, so this reads more honestly than "-25%".
export const pctOf = (x) => +(x * 100).toFixed(1) + '%';
export const holdText = (hold) => (hold ? `💨 ★5 ${pctOf(ESCAPE[5])} → ${pctOf(ESCAPE[5] * (1 - hold))}` : `💨 ★5 ${pctOf(ESCAPE[5])}`);

export const biteLine = (f, rand = Math.random) => {
  const lines = f ? BITE_LINES[feelOf(f)] : null;
  return lines ? localName(lines[Math.floor(rand() * lines.length) % lines.length]) : null;
};

// Every picture of a fish (book, stamps, catch cards, guide, market, the
// trophy and the fish on the line) comes from one sheet: FISH_SHEET.
const fishIconPositions = new Map(FISH_SHEET.map((id, index) => [id, `${(index % SHEET_COLS) * 100 / (SHEET_COLS - 1)}% ${Math.floor(index / SHEET_COLS) * 100 / (SHEET_ROWS - 1)}%`]));

export function fishStampIcon(f, cls = 'fish-stamp-fish') {
  const position = fishIconPositions.get(f.id);
  const icon = el('span', cls, position ? null : f.emoji);
  icon.setAttribute('aria-hidden', 'true');
  if (position) {
    icon.classList.add('fish-stamp-sprite');
    icon.style.backgroundPosition = position;
  }
  return icon;
}

// A ★3–★5 catch, shown over the angler's head for everyone nearby: the
// fish's picture in a burst of light and "<name> caught <fish>!".
export const TROPHY_RARITY = 3;
// How long a catch shows over the catcher's head, by rarity (ms): the rarer,
// the longer (a ★5 legend stays up for 12 seconds).
export const SHOW_MS = [0, 2500, 3000, 4500, 8000, 12000];
export const showMs = (f) => SHOW_MS[f?.rarity] || 2500;
export function trophy(f, name) {
  const w = el('div', 'trophy-in tier-' + f.rarity);
  if (f.rarity >= 5) for (const k of [1, 2, 3]) w.append(el('i', 'fish-spark s' + k, k === 3 ? '⭐' : '✨'));
  const pic = el('span', 'trophy-pic');
  pic.append(el('i', 'trophy-rays'), fishStampIcon(f));
  w.append(pic, el('span', 'trophy-stars', '★'.repeat(f.rarity)), el('b', 'trophy-text', t('fish.trophy', { name, fish: fishName(f) })));
  return w;
}

// The little picture over the catcher's head for every catch, with its stars.
export function catchBubble(f) {
  const icon = fishStampIcon(f, 'bubble-fish tier-' + f.rarity);
  if (!f.rarity) return icon;
  const w = el('span', 'bubble-catch');
  w.append(icon, el('b', 'bubble-stars', '★'.repeat(f.rarity)));
  return w;
}

// One round red-ink stamp for a fish: the fish, "한강 낚시" and its name.
// Uncaught kinds are an empty dashed ring with the fish's dark silhouette.
export function fishStamp(f, caught = true) {
  const st = el('div', 'fish-stamp' + (caught ? '' : ' empty'));
  st.style.setProperty('--tilt', ((FISH.indexOf(f) * 37) % 17) - 8 + 'deg');
  st.append(el('small', 'fish-stamp-top', caught ? '한강 낚시' : ''), fishStampIcon(f), el('b', 'fish-stamp-name', caught ? f.ko : '???'));
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
    el('p', 'dex-summary', text(`공개된 ${AVAILABLE_FISH.length}종 중 `, 'Available collection ') + available + '/' + AVAILABLE_FISH.length),
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
  const PAGES = Math.max(...FISH.map(f => f.page)) + 1, LAST = PAGES - 1;
  let page = FISH.find(f => f.id === fresh)?.page ?? 0;
  const showDetail = f => {
    const n = dex.count(f.id);
    detail.replaceChildren(el('strong', null, fishName(f)), el('p', null,
      !f.released ? text('추후 공개 예정이에요.', 'Coming in a future release.')
      : !n && parkOf(f.id) ? text(`${parkOf(f.id).name.ko} 한강공원에서만 잡혀요.`, `Only bites at ${parkOf(f.id).name.en} Han River Park.`) : n
      ? text('누적 ', 'Caught ') + n + text('마리 · 판매 ', ' times · Sell ') + '🪙 ' + f.price
      : text('아직 만나지 못했어요. 낚시로 도장을 모아보세요!', 'Not caught yet. Go fishing to earn this stamp!')));
  };
  const render = () => {
    grid.replaceChildren();
    grid.classList.toggle('fish-special-page', page === LAST);
    for (const f of FISH.filter(q => q.page === page)) {
      const n = dex.count(f.id);
      const cell = el('button', 'stamp-cell fish-cell' + (n ? '' : ' empty') + (f.id === fresh ? ' fresh' : ''));
      cell.type = 'button';
      const where = !n && f.released && parkOf(f.id)?.name;
      const status = n ? '× ' + n : where ? '📍 ' + text(`${where.ko} 전용`, `${where.en} only`) : f.released ? text('미발견', 'Undiscovered') : text('공개 예정', 'Coming soon');
      cell.setAttribute('aria-label', fishName(f) + ' · ' + (n ? text('수집 완료', 'Collected') : status));
      cell.append(fishStamp(f, !!n), el('i', 'fish-stars', '★'.repeat(rarityStars(f))), el('small', null, status));
      cell.onclick = () => showDetail(f);
      grid.append(cell);
    }
    number.textContent = (page + 1) + ' / ' + PAGES + (page === LAST ? ' · ' + localName(TIER_NAMES[5]) : '');
    previous.disabled = page === 0; next.disabled = page === LAST;
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
  page.append(fishStampIcon(f, 'fish-pop-big'), st, el('span', 'fish-pop-ink'), el('b', 'fish-pop-bang', '콱!'));
  const done = dex.availableComplete;
  const ok = el('button', 'primary', '📖 ' + t('fish.book'));
  card.append(
    el('span', 'stamp-kicker', 'NEW · ' + t('fish.book')),
    page,
    el('strong', 'fish-pop-name', `${f.ko} · ${f.rom}`),
    el('small', null, `${localName(f.name, getLanguage())} · ${'★'.repeat(rarityStars(f))}`),
    el('p', 'fish-pop-count', done ? text(`공개된 ${AVAILABLE_FISH.length}종을 모두 모았어요!`, `All ${AVAILABLE_FISH.length} available species collected!`) : t('fish.bookNew', { k: dex.kinds, all: FISH.length })),
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
