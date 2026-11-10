// The next show, for the pinned notice at the top of the screen (game/chat.js):
// the Yeouido fireworks or the Ttukseom drone show, whichever is on now or
// comes first (show-clock.js has the schedule). Pure, no DOM.

import { fireworksAt, nextFireworks, SHOW_SECONDS } from './fireworks-show.js';
import { droneShowAt, nextDroneShow } from './drone-show.js';

// → { kind: 'fireworks' | 'drones', start (ms), on (true while it's on) }
export function nextShow(now = Date.now()) {
  for (const [kind, at] of [['fireworks', fireworksAt], ['drones', droneShowAt]]) {
    const s = at(now);
    if (s && s.t >= 0 && s.t < SHOW_SECONDS) return { kind, start: s.start, on: true };
  }
  const f = nextFireworks(now), d = nextDroneShow(now);
  return f <= d ? { kind: 'fireworks', start: f, on: false } : { kind: 'drones', start: d, on: false };
}

// The notice's two parts: { label, text }. `t` is the i18n t(key, vars);
// `clock(ms)` gives the start in the player's own time ("21:30").
export function showNoticeText(show, now, t, clock) {
  const label = t(show.kind === 'fireworks' ? 'show.fireworks' : 'show.drones');
  if (show.on) {
    const m = Math.max(1, Math.ceil((show.start + SHOW_SECONDS * 1000 - now) / 60e3));
    return { label, text: t('show.now', { m }) };
  }
  const mins = Math.max(1, Math.ceil((show.start - now) / 60e3));
  const at = clock(show.start);
  if (mins < 60) return { label, text: t('show.inM', { m: mins, at }) };
  return { label, text: t('show.inHM', { h: Math.floor(mins / 60), m: mins % 60, at }) };
}
