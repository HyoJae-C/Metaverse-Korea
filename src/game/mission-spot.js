// The mission bar (📜 errand + 🧭) and the delivery timer sit at the top of
// the screen, right under the pinned notices, like one stack of notes
// (Yozi 2026-11-19: "미션창도 공지사항처럼 위쪽에"). The notices box moves and
// changes height a lot (folded, two shows, in a shop, ad on wide screens,
// phone, landscape), so instead of copying its CSS rules this measures it and
// puts the bars just under it, lined up with its left edge.
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

  let last = '';
  function update() {
    const s = missionSpot(pinRect(), window.innerWidth, EDGE + 62);
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
  const watch = new MutationObserver(update);
  watch.observe(pin, { attributes: true, attributeFilter: ['hidden', 'class'] });
  watch.observe(bar, { attributes: true, attributeFilter: ['hidden'] });
  if (delivery) watch.observe(delivery, { attributes: true, attributeFilter: ['hidden'] });
  watch.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', update);
  // (an ad or a banner coming and going moves the box without resizing it)
  setInterval(update, 1000);
  update();
  return { update };
}
