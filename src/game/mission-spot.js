// The mission bar (📜 errand + 🧭) and the delivery timer sit at the top of
// the screen, right under the pinned notices, like one stack of notes
// (Yozi 2026-11-19: "미션창도 공지사항처럼 위쪽에"). The notices box moves and
// changes height a lot (folded, two shows, in a shop, ad on wide screens,
// phone, landscape), so instead of copying its CSS rules this measures it and
// puts the bars just under it, lined up with its left edge.
// Phones (Yozi 2026-11-21): the notices fold down by the chat tab in the
// bottom left instead, so the bars go to the top-left corner, under the
// 👁️ / 🗺️ buttons (or the minimap while you are guided); folded, the
// notices sit right of the chat tab, open just above it, and the chat lines
// step up over them (--pin-lift).
const GAP = 6;
const EDGE = 12;

// Where the bars go for a notices box at `pin` (a DOMRect, or null when it
// can't be measured) on a `w`-wide screen. `fallbackTop`: under the top chips.
export function missionSpot(pin, w, fallbackTop) {
  const left = pin && pin.width ? Math.round(pin.left) : EDGE;
  const top = pin && pin.height ? Math.round(pin.bottom + GAP) : fallbackTop;
  const maxWidth = Math.max(160, Math.min(460, w - left - EDGE));
  return { left, top, maxWidth };
}

// Phones: the bars under the lowest of the top-left corner buttons
// (DOMRects, null or empty when not shown), on a `w`-wide screen.
// `tools`: the round buttons in the top-right row (the bag, and ☕ / 📥
// while you hold something), as DOMRects; when they leave the bar too little
// room, it goes under them instead.
export function cornerSpot(rects, w, fallbackTop, tools = []) {
  const shown = rects.filter((r) => r && r.height);
  let top = shown.length ? Math.round(Math.max(...shown.map((r) => r.bottom)) + GAP) : fallbackTop;
  const row = tools.filter((r) => r && r.height && r.top < top + 40 && r.bottom > top);
  let right = EDGE;
  if (row.length) {
    right = Math.round(w - Math.min(...row.map((r) => r.left)) + GAP);
    if (w - EDGE - right < MIN_BAR) { top = Math.round(Math.max(...row.map((r) => r.bottom)) + GAP); right = EDGE; }
  }
  return { left: EDGE, top, maxWidth: Math.max(160, w - EDGE - right) };
}
const MIN_BAR = 200; // (the 📜 chip and 🧭 both still readable)

const DOCK = '(max-width: 760px) and (pointer: coarse)';

export function createMissionSpot() {
  const $ = (id) => document.getElementById(id);
  const pin = $('notice-pin'), bar = $('quest-bar'), delivery = $('delivery-chip');
  if (!pin || !bar) return { update() {} };

  // The notices box's spot, also when it is hidden (measured unseen).
  function pinRect() {
    if (!pin.hidden && pin.offsetParent) return pin.getBoundingClientRect();
    const was = pin.style.cssText;
    pin.style.cssText = was + ';display:flex !important;visibility:hidden !important';
    const r = pin.getBoundingClientRect();
    pin.style.cssText = was;
    // Hidden: only its top-left is kept (the bars take its place).
    return r.width ? { left: r.left, width: r.width, bottom: r.top - GAP, height: 1 } : null;
  }

  const dock = typeof matchMedia === 'function' ? matchMedia(DOCK) : { matches: false };
  const root = document.documentElement;
  const shownRect = (el) => (el && el.offsetParent && getComputedStyle(el).visibility !== 'hidden' ? el.getBoundingClientRect() : null);
  // Phones: the notices folded right of the chat tab; open (above it, CSS),
// the chat lines go above them.
  function dockPin() {
    const fold = $('chat-fold');
    const f = shownRect(fold);
    const folded = pin.classList.contains('folded');
    pin.style.left = folded && f && f.width ? Math.round(f.right + GAP) + 'px' : '';
    const lift = pin.hidden || folded ? 0 : Math.round(pin.offsetHeight + GAP);
    if (lift !== lastLift) { lastLift = lift; root.style.setProperty('--pin-lift', lift + 'px'); }
  }
  let lastLift = 0;

  let last = '';
  function update() {
    if (dock.matches) dockPin();
    else if (pin.style.left || lastLift) { pin.style.left = ''; lastLift = 0; root.style.setProperty('--pin-lift', '0px'); }
    const map = $('map-btn');
    const cornerEls = [document.querySelector('.ui-eye'), map?.classList.contains('corner-map') ? map : null, document.querySelector('.minimap'), $('notes-btn') && getComputedStyle($('notes-btn')).position === 'fixed' ? $('notes-btn') : null];
    const s = dock.matches ? cornerSpot(cornerEls.map(shownRect), window.innerWidth, EDGE + 52, [...document.querySelectorAll('.tools > .tool:not(.corner-map)')].map(shownRect)) : missionSpot(pinRect(), window.innerWidth, EDGE + 62);
    const dTop = s.top + (bar.hidden ? 0 : bar.offsetHeight + GAP);
    const showDelivery = delivery && !delivery.hidden;
    const bottom = showDelivery ? dTop + delivery.offsetHeight : bar.hidden ? s.top - GAP : dTop - GAP;
    const key = `${s.left},${s.top},${s.maxWidth},${dTop},${bottom}`;
    if (key === last) return;
    last = key;
    // Hint cards (.info-hint) open below the stack instead of over it.
    document.documentElement.style.setProperty('--top-notes-bottom', Math.max(0, bottom) + 'px');
    Object.assign(bar.style, { top: s.top + 'px', left: s.left + 'px', maxWidth: s.maxWidth + 'px' });
    if (delivery) Object.assign(delivery.style, { top: dTop + 'px', left: s.left + 'px', maxWidth: s.maxWidth + 'px' });
  }

  new ResizeObserver(update).observe(pin);
  new ResizeObserver(update).observe(bar);
  if ($('chat-fold')) new ResizeObserver(update).observe($('chat-fold'));
  const watch = new MutationObserver(update);
  watch.observe(pin, { attributes: true, attributeFilter: ['hidden', 'class'] });
  watch.observe(bar, { attributes: true, attributeFilter: ['hidden'] });
  if (delivery) watch.observe(delivery, { attributes: true, attributeFilter: ['hidden'] });
  watch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', update);
  dock.addEventListener?.('change', update);
  // (an ad or a banner coming and going moves the box without resizing it)
  setInterval(update, 1000);
  update();
  return { update };
}
