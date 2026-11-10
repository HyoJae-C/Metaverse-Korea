// Game tips (i18n keys tip.1 … tip.8), shown while you wait: on the taxi's
// back seat and while a room is being set up. A different one each time,
// never the same twice in a row.
import { t } from '../core/i18n.js';
import { DRONE_SHOW_HOURS_KST, droneShowHours } from '../core/drone-show.js';

export const TIP_COUNT = 8;
let last = -1;
export function nextTip(rand = Math.random) {
  let i = Math.floor(rand() * (TIP_COUNT - 1));
  if (i >= last && last >= 0) i++; // (skip the one shown last)
  // tip.7 names the default drone show times: skip it while operators have
  // set other ones (admin.html → Drone show).
  if (i === 6 && droneShowHours() !== DRONE_SHOW_HOURS_KST) i = last === 7 ? 0 : 7;
  last = i;
  return t(`tip.${i + 1}`);
}

// A room you haven't been into yet (or one let go to save memory) is built
// when you walk in, which can take a moment on a phone: cover the screen
// with a tip until it's ready, instead of a frozen street.
// enterStore(item): main.js's; built(store): whether its room is ready.
export function createRoomTips({ $, enterStore, built }) {
  const MIN_MS = 900; // long enough to read a line
  let busy = false;
  return {
    enter(item) {
      const s = item.store;
      if (busy) return;
      if (s.hanpark || built(s)) { enterStore(item); return; }
      busy = true;
      const box = $('room-loading');
      $('room-loading-tip').textContent = nextTip();
      box.hidden = false;
      const shown = performance.now();
      // Two frames: the cover is on screen before the build holds the page.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try { enterStore(item); } finally {
          // (one more frame drawn behind it: the room's shaders get ready too)
          const wait = Math.max(0, MIN_MS - (performance.now() - shown));
          setTimeout(() => requestAnimationFrame(() => { box.hidden = true; busy = false; }), wait);
        }
      }));
    },
  };
}
