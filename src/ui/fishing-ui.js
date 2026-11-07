// Fishing panel (Han River) and the fish market's selling panel. Rules and
// the catch list are in core/fishing.js.
//   cast → wait for a bite (tapping too early scares the fish) → tap to hook
//   → reel: tap fast enough in REEL_SECONDS (rarer fish need more taps).
import { t, getLanguage, localName } from '../core/i18n.js';
import { ROD_SKINS } from '../core/rod-skins.js';
import { FISH, AVAILABLE_FISH, rollCatch, tapsFor, escapeChance, biteWait, BITE_WINDOW, REEL_SECONDS, BAG_MAX, rarityStars, isRare, drainFor, TIER_NAMES, BITE_LINES, FISH_SHEET, AUTO_SECONDS, rollAutoCatch, AUTO_FISH, TRASH_CHANCE, LUCKY_BOOST } from '../core/fishing.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
export const fishName = (f) => (getLanguage() === 'ko' ? f.ko : `${localName(f.name, getLanguage())} · ${f.ko} (${f.rom})`);
const pct = c => (c < 0.1 ? c.toFixed(2) : c.toFixed(1)) + '%';
const text = (ko, en) => localName({ ko, en });

export const biteLine = (f, rand = Math.random) => {
  const lines = !f || f.trash ? null : BITE_LINES[f.rarity];
  return lines ? localName(lines[Math.floor(rand() * lines.length) % lines.length]) : null;
};

// Every picture of a fish (book, stamps, catch cards, guide, market, the
// trophy and the fish on the line) comes from one sheet: FISH_SHEET.
const fishIconPositions = new Map(FISH_SHEET.map((id, index) => [id, `${(index % 7) * 100 / 6}% ${Math.floor(index / 7) * 100 / 6}%`]));

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

// The little picture over the catcher's head for every catch; ★2 adds its stars.
export function catchBubble(f) {
  const icon = fishStampIcon(f, 'bubble-fish tier-' + f.rarity);
  if (f.rarity !== 2) return icon;
  const w = el('span', 'bubble-catch');
  w.append(icon, el('b', 'bubble-stars', '★★'));
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
      const status = n ? '× ' + n : f.released ? text('미발견', 'Undiscovered') : text('공개 예정', 'Coming soon');
      cell.setAttribute('aria-label', fishName(f) + ' · ' + (n ? text('수집 완료', 'Collected') : status));
      cell.append(fishStamp(f, !!n), el('i', 'fish-stars', '★'.repeat(rarityStars(f))), el('small', null, status));
      cell.onclick = () => showDetail(f);
      grid.append(cell);
    }
    number.textContent = (page + 1) + ' / 6' + (page === 5 ? ' · ' + localName(TIER_NAMES[5]) : '');
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

export class FishingUI {
  // bag: FishBag; onRod(on): show or hide the rod; onCatch(fish): after a catch.
  // dex: FishDex, every catch is recorded there too.
  // onPhase(name, data): drives the 3D motion (core/fishing-rig.js).
  // lucky(): true while standing at the lucky spot (better odds, see luckySpot).
  // stats: FishStats (optional), counts what happens to each cast for balancing.
  // Every park's fishing spots share one catch table (core/fishing.js).
  constructor({ root, bag, dex, stats, onRod, onCatch, onEscape, onClose, onStamp, onPhase, lucky }) {
    Object.assign(this, { root, bag, dex, stats, onRod, onCatch, onEscape, onClose, onStamp, onPhase, lucky });
    this.timer = 0;
    this.state = 'idle';
  }

  get open() { return !this.root.hidden; }

  show() {
    this.root.hidden = false;
    this.onRod?.(true);
    this.onPhase?.('idle');
    this.renderIdle();
  }

  close() {
    clearTimeout(this.timer);
    clearInterval(this.tick);
    this._unkey?.(); this._unkey = null;
    this.state = 'idle';
    this.root.hidden = true;
    this.onPhase?.('off');
    this.onRod?.(false);
    this.onClose?.();
  }

  _frame(extra) {
    clearTimeout(this.timer);
    clearInterval(this.tick);
    this._unkey?.(); this._unkey = null;
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
    if (this.lucky?.()) this.root.append(el('p', 'fish-lucky', '🍀 ' + text('행운 포인트! 지금 여기서는 귀한 물고기가 더 잘 물어요.', 'Lucky spot! Rarer fish bite more often here right now.')));
    this.root.append(this._water(t('fish.ready'), 'calm'));
    const cast = el('button', 'primary', '🎣 ' + t('fish.cast'));
    cast.disabled = this.bag.full;
    cast.onclick = () => this.cast();
    const actions = el('div', 'order-actions');
    const auto = el('button', 'chip', '🤖 ' + t('fish.auto'));
    auto.disabled = this.bag.full;
    auto.onclick = () => this.autoFish();
    actions.append(cast, auto);
    if (this.dex) {
      const book = el('button', 'chip', `📖 ${t('fish.book')} · ${this.dex.kinds}/${FISH.length} · 🐟 ${this.dex.total}`);
      book.onclick = () => this.renderBook();
      actions.append(book);
    }
    if (this.bag.full) this.root.append(el('p', 'order-hint', t('fish.full')));
    const odds = el('button', 'chip fish-odds-btn', '📊 ' + t('fish.guide'));
    odds.onclick = () => this.renderOdds();
    actions.append(odds);
    this.root.append(actions);
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

  // The odds table: every catchable kind grouped by stars, with its chance
  // when you fish by hand (the old boot included) and with auto fishing
  // (common kinds only), its price, and how often it slips off the hook.
  renderOdds() {
    this.state = 'odds';
    this._frame();
    const autoTotal = AUTO_FISH.reduce((a, f) => a + f.chance, 0);
    const wrap = el('div', 'fish-odds');
    wrap.append(el('p', 'fish-odds-note', text('직접 낚시 = 직접 던지고 감을 때 · 자동 = 자동낚시 · 💨 = 마지막에 놓칠 확률',
      'Hand = fishing yourself · Auto = auto fishing · 💨 = chance it slips off at the end')));
    const head = el('div', 'fish-odds-row head');
    head.append(el('span'), el('span', null, text('물고기', 'Fish')), el('span', null, text('직접', 'Hand')), el('span', null, text('자동', 'Auto')), el('span', null, '🪙'));
    wrap.append(head);
    for (const r of [1, 2, 3, 4, 5]) {
      const kinds = AVAILABLE_FISH.filter(f => f.rarity === r);
      if (!kinds.length) continue;
      const hand = kinds.reduce((a, f) => a + f.chance, 0) * (1 - TRASH_CHANCE);
      const tier = el('div', 'fish-odds-tier tier-' + r);
      tier.append(el('b', null, '★'.repeat(r)), el('span', null, localName(TIER_NAMES[r]) + ' · ' + text(r >= 3 ? '자동낚시 불가' : '자동낚시 가능', r >= 3 ? 'hand fishing only' : 'auto fishing too')), el('small', null, pct(hand)));
      wrap.append(tier);
      for (const f of kinds) {
        const row = el('div', 'fish-odds-row');
        const name = el('span', 'fish-name', fishName(f));
        if (escapeChance(f)) name.append(el('small', null, `💨 ${Math.round(escapeChance(f) * 100)}%`));
        row.append(fishStampIcon(f, 'fish-emoji'), name,
          el('b', null, pct(f.chance * (1 - TRASH_CHANCE))), el('span', null, isRare(f) ? '—' : pct(f.chance / autoTotal * 100)), el('span', null, String(f.price)));
        wrap.append(row);
      }
    }
    const boot = el('div', 'fish-odds-row trash');
    boot.append(el('span', 'fish-emoji', '🥾'), el('span', 'fish-name', text('고물장화 (쓰레기)', 'Old boot (litter)')), el('b', null, pct(TRASH_CHANCE * 100)), el('span', null, '—'), el('span', null, '0'));
    wrap.append(boot, el('p', 'fish-odds-note', '🍀 ' + text(`행운 포인트(금색 표지판)에서는 ★2 이상이 ${LUCKY_BOOST}배 잘 물고 장화는 절반으로 줄어요. 행운 포인트는 몇 분마다 바뀌어요.`,
      `At the lucky spot (gold sign) ★2 and up bite ${LUCKY_BOOST}× as often and boots half as often. It moves every few minutes.`)), el('p', 'fish-odds-note', text(`자동낚시는 약 ${AUTO_SECONDS}초에 한 마리 · 공개된 ${AVAILABLE_FISH.length}종 기준`, `Auto fishing lands about one fish every ${AUTO_SECONDS} s · ${AVAILABLE_FISH.length} kinds available now`)));
    const back = el('button', 'primary', '🎣 ' + t('fish.back'));
    back.onclick = () => this.renderIdle();
    const actions = el('div', 'order-actions');
    actions.append(back);
    this.root.append(wrap, actions);
  }

  cast() {
    this.state = 'waiting';
    this.stats?.add('cast');
    this.onPhase?.('cast');
    this._frame();
    const water = this._water(t('fish.waiting'), 'waiting');
    const btn = el('button', 'primary fish-hook', t('fish.hook'));
    btn.onclick = () => { this.stats?.add('early'); this.onPhase?.('retrieve'); this.renderIdle(t('fish.tooEarly')); }; // nothing has bitten yet
    const actions = el('div', 'order-actions');
    actions.append(btn);
    this.root.append(water, actions);
    this.timer = setTimeout(() => this.bite(water, btn), biteWait() * 1000);
  }

  bite(water, btn) {
    this.state = 'bite';
    const lucky = !!this.lucky?.();
    this.fish = rollCatch(Math.random, lucky);
    this.stats?.add('bite', this.fish);
    if (lucky) this.stats?.add('lucky');
    this.onPhase?.('bite', this.fish);
    water.className = 'fish-water bite' + (this.fish.trash ? '' : ' t' + this.fish.rarity) + (isRare(this.fish) ? ' rare' : '');
    water.querySelector('p').textContent = t('fish.bite');
    this.shout = biteLine(this.fish); // kept for the reel-in too
    if (this.shout) water.prepend(el('b', 'fish-callout tier-' + this.fish.rarity, this.shout));
    btn.classList.add('pulse');
    btn.onclick = () => this.reel();
    this.timer = setTimeout(() => { this.stats?.add('miss'); this.onPhase?.('retrieve'); this.renderIdle(t('fish.slow')); }, BITE_WINDOW * 1000);
  }

  reel() {
    this.state = 'reel';
    const need = tapsFor(this.fish);
    const drain = drainFor(this.fish); // rare fish pull the gauge back down
    let taps = 0, left = REEL_SECONDS;
    this._frame();
    const big = need >= 12;
    this.onPhase?.('reel', { big });
    const rare = isRare(this.fish);
    const water = this._water(rare ? t('fish.fightBack') : big ? t('fish.bigOne') : t('fish.reeling'), 'reel' + (rare ? ' rare' : ''));
    if (this.shout) water.prepend(el('b', 'fish-callout tier-' + this.fish.rarity, this.shout));
    const bar = el('div', 'fish-meter' + (drain ? ' drain' : ''));
    const fill = el('i');
    bar.append(fill);
    const time = el('small', 'fish-time');
    const paint = () => {
      fill.style.width = Math.min(100, (taps / need) * 100) + '%';
      time.textContent = t('fish.time', { s: Math.max(0, left).toFixed(1) });
    };
    const tap = () => {
      if (this.state !== 'reel') return;
      taps++;
      this.onPhase?.('tap', taps / need);
      paint();
      if (taps >= need) this.landed(Math.max(0, left) / REEL_SECONDS);
    };
    // Two reel buttons, left and right, to tap with both thumbs (← → or
    // A D on a keyboard). pointerdown, not click: fast taps register at
    // once (and no double-tap zoom on phones, see .fish-reel in style.css).
    const pads = el('div', 'fish-reels');
    for (const side of ['left', 'right']) {
      const b = el('button', 'primary fish-reel ' + side, (side === 'left' ? '◀ ' : '') + '🌀 ' + t('fish.reel') + (side === 'right' ? ' ▶' : ''));
      b.onpointerdown = (e) => { e.preventDefault(); tap(); };
      pads.append(b);
    }
    const onKey = (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(e.code)) return;
      e.preventDefault(); e.stopPropagation(); // don't walk away
      if (!e.repeat) tap();
    };
    window.addEventListener('keydown', onKey, true);
    this._unkey = () => window.removeEventListener('keydown', onKey, true);
    this.root.append(water, bar, time, pads, el('small', 'fish-reel-hint', t('fish.reelHint')));
    paint();
    this.tick = setInterval(() => {
      left -= 0.1;
      if (drain && taps > 0) { taps = Math.max(0, taps - drain * 0.1); this.onPhase?.('progress', taps / need); }
      paint();
      if (left <= 0) { this.stats?.add('lost', this.fish); this.onPhase?.('retrieve'); this.renderIdle(t('fish.gotAway')); }
    }, 100);
  }

  // Auto fishing: the line goes out and a common fish comes in every
  // AUTO_SECONDS while you stay here with the game open (a hidden tab
  // doesn't count). Rare fish only bite for hands-on fishing.
  autoFish() {
    this.state = 'auto';
    this._frame();
    let got = 0, waited = 0, last = performance.now();
    const water = this._water(t('fish.autoWaiting'), 'waiting');
    const bar = el('div', 'fish-meter auto');
    const fill = el('i');
    bar.append(fill);
    const status = el('small', 'fish-time');
    const stop = el('button', 'primary', '⏹ ' + t('fish.autoStop'));
    stop.onclick = () => { this.onPhase?.('retrieve'); this.renderIdle(); };
    const actions = el('div', 'order-actions');
    actions.append(stop);
    this.root.append(el('p', 'fish-auto-note', '⚠️ ' + t('fish.autoNote')), water, bar, status, actions);
    const paint = () => {
      fill.style.width = Math.min(100, waited / AUTO_SECONDS * 100) + '%';
      status.textContent = t('fish.autoStatus', { n: got, s: Math.ceil(Math.max(0, AUTO_SECONDS - waited)) });
    };
    this.onPhase?.('cast');
    paint();
    this.tick = setInterval(() => {
      const now = performance.now(), dt = Math.min(1, (now - last) / 1000);
      last = now;
      if (globalThis.document?.hidden) return; // only while you're here
      waited += dt;
      if (waited >= AUTO_SECONDS) {
        waited = 0;
        const f = rollAutoCatch();
        if (!this.bag.add(f.id)) { this.onPhase?.('retrieve'); this.renderIdle(t('fish.full')); return; }
        got++;
        this.stats?.add('auto', f);
        const isNew = this.dex ? this.dex.add(f.id) : false;
        this.onPhase?.('land', f);
        if (isNew) stampPop(f, this.dex, { onSlam: this.onStamp });
        this.root.querySelector('.fish-bag').textContent = t('fish.bag', { n: this.bag.size, max: BAG_MAX, coins: this.bag.value });
        water.querySelector('p').textContent = t('fish.caught', { name: fishName(f) });
        this.onCatch?.(f, isNew);
        clearTimeout(this.timer);
        this.timer = setTimeout(() => { if (this.state === 'auto') { water.querySelector('p').textContent = t('fish.autoWaiting'); this.onPhase?.('cast'); } }, 3000);
      }
      paint();
    }, 250);
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
    if (f.trash) { this.stats?.add('land', f); this.onPhase?.('trash'); this.renderTrash(f); return; }
    if (Math.random() < escapeChance(f, spare)) { this.stats?.add('escape', f); this.onPhase?.('escape'); this.escaped(f); return; }
    this.stats?.add('land', f);
    this.onPhase?.('land', f);
    const kept = this.bag.add(f.id);
    const isNew = this.dex ? this.dex.add(f.id) : false;
    this.fresh = isNew ? f.id : null; // the book shows its stamp pressing in
    this._frame();
    // How loud a catch is, by rarity: ★1 plain, ★2 stars only, ★3 a small
    // glow, ★4 a big one, ★5 the works (style.css .fish-card.tier-N).
    const card = el('div', 'fish-card' + (f.rarity >= 2 ? ' tier-' + f.rarity : '') + (f.rarity >= 3 ? ' rare' : ''));
    if (f.rarity >= 5) for (const k of [1, 2, 3]) card.append(el('i', 'fish-spark s' + k, k === 3 ? '⭐' : '✨'));
    if (f.rarity >= 2) card.append(el('span', 'fish-card-stars', '★'.repeat(f.rarity) + ' ' + localName(TIER_NAMES[f.rarity])));
    if (isNew) card.append(el('span', 'fish-new', t('fish.bookNew', { k: this.dex.kinds, all: FISH.length })));
    if (isNew) stampPop(f, this.dex, { onSlam: this.onStamp, onBook: () => this.open && this.renderBook() });
    card.append(
      fishStampIcon(f, 'fish-big'),
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
  card.append(fishStampIcon(f, 'fish-big'), el('strong', null, f.ko), el('small', 'order-rom', f.rom));
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
  // rods (RodSkins) adds a second tab to buy and wear rod skins; onRodSkin(id)
  // tells the game which skin is now worn.
  constructor({ root, bag, wallet, onSold, rods, onRodSkin, onShort }) {
    Object.assign(this, { root, bag, wallet, onSold, rods, onRodSkin, onShort });
    this.tab = 'sell';
  }

  get open() { return !this.root.hidden; }
  close() { this.root.hidden = true; }

  show(tab = 'sell') {
    this.root.hidden = false;
    this.tab = tab;
    this.render();
  }

  render() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => this.close();
    this.root.replaceChildren(x, el('h3', null, '🐟 ' + t('fish.market')));
    if (this.rods) {
      const tabs = el('div', 'fish-tabs');
      for (const [key, label] of [['sell', '🐟 ' + t('fish.tabSell')], ['rods', '🎣 ' + t('fish.tabRods')]]) {
        const b = el('button', 'chip' + (this.tab === key ? ' on' : ''), label);
        b.setAttribute('aria-pressed', String(this.tab === key));
        b.onclick = () => { this.tab = key; this.render(); };
        tabs.append(b);
      }
      this.root.append(tabs);
    }
    if (this.tab === 'rods' && this.rods) { this._renderRods(); return; }
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
      row.append(fishStampIcon(f, 'fish-emoji'), el('span', 'fish-name', `${fishName(f)} × ${n}`), one, all);
      list.append(row);
    }
    const sellAll = el('button', 'primary', t('fish.sellAll', { coins: this.bag.value }));
    sellAll.onclick = () => this._sell(null);
    const actions = el('div', 'order-actions');
    actions.append(sellAll);
    this.root.append(list, actions);
  }

  // Rod skins: a swatch of each, its price, and buy / wear.
  _renderRods() {
    const grid = el('div', 'rod-skins');
    for (const s of ROD_SKINS) {
      const owned = this.rods.has(s.id), worn = this.rods.equipped === s.id;
      const card = el('div', 'rod-skin' + (worn ? ' worn' : '') + (s.glow ? ' glow' : s.shine ? ' shine' : ''));
      const sw = el('i', 'rod-swatch');
      sw.style.background = `linear-gradient(90deg, ${s.grip} 0 18%, ${s.reel} 18% 26%, ${s.pole} 26% 82%, ${s.tip} 82%)`;
      const btn = el('button', worn ? 'chip on' : owned ? 'chip' : 'primary small',
        worn ? t('fish.rodWorn') : owned ? t('fish.rodWear') : t('fish.rodBuy', { coins: s.price }));
      btn.disabled = worn;
      btn.onclick = () => {
        if (owned) this.rods.equip(s.id);
        else if (!this.rods.buy(s.id, this.wallet, { name: s.name })) { this.onShort?.(s); return; }
        this.onRodSkin?.(s.id, !owned);
        this.render();
      };
      card.append(sw, el('b', null, localName(s.name)), btn);
      grid.append(card);
    }
    this.root.append(el('p', 'fine', t('fish.rodHint')), grid);
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
