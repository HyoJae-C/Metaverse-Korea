// The next show, for the pinned notice at the top of the screen (game/chat.js):
// the Yeouido fireworks, the lantern parade or the Ttukseom drone show, whichever is on now or
// comes first (show-clock.js has the schedule). Under it, the next sunset
// (every game day, best from Mangwon Han River Park). Pure, no DOM.

import { fireworksAt, nextFireworks, SHOW_SECONDS } from './fireworks-show.js';
import { droneShowAt, nextDroneShow } from './drone-show.js';
import { paradeAt, nextParade } from './lantern-parade.js';
import { cycleMs, CYCLE, CYCLE_MS } from './show-clock.js';

// → { kind: 'fireworks' | 'lanterns' | 'drones', start (ms), on (true while it's on) }
// (All three shows last SHOW_SECONDS, 20 minutes.)
export function nextShow(now = Date.now()) {
  for (const [kind, at] of [['fireworks', fireworksAt], ['lanterns', paradeAt], ['drones', droneShowAt]]) {
    const s = at(now);
    if (s && s.t >= 0 && s.t < SHOW_SECONDS) return { kind, start: s.start, on: true };
  }
  const [kind, start] = [['fireworks', nextFireworks(now)], ['lanterns', nextParade(now)], ['drones', nextDroneShow(now)]]
    .reduce((a, b) => (b[1] < a[1] ? b : a));
  return { kind, start, on: false };
}

// The notice's two parts: { label, text }. `t` is the i18n t(key, vars);
// `clock(ms)` gives the start in the player's own time ("21:30").
export function showNoticeText(show, now, t, clock) {
  const label = t('show.' + show.kind);
  if (show.on) {
    const m = Math.max(1, Math.ceil((show.start + SHOW_SECONDS * 1000 - now) / 60e3));
    return { label, text: t('show.now', { m }) };
  }
  const mins = Math.max(1, Math.ceil((show.start - now) / 60e3));
  const at = clock(show.start);
  if (mins < 60) return { label, text: t('show.inM', { m: mins, at }) };
  return { label, text: t('show.inHM', { h: Math.floor(mins / 60), m: mins % 60, at }) };
}

// The sunset (core/sunset-sky.js): the 22.5 minutes before every night.
// → { start (ms), end (ms), on }
const SUN_FROM = (CYCLE.morning + CYCLE.day) * 60e3, SUN_LEN = CYCLE.sunset * 60e3;
export function nextSunset(now = Date.now()) {
  const into = cycleMs(now), cycleStart = now - into;
  if (into >= SUN_FROM && into < SUN_FROM + SUN_LEN) return { start: cycleStart + SUN_FROM, end: cycleStart + SUN_FROM + SUN_LEN, on: true };
  const start = cycleStart + SUN_FROM + (into >= SUN_FROM ? CYCLE_MS : 0);
  return { start, end: start + SUN_LEN, on: false };
}
export function sunsetNoticeText(sun, now, t, clock) {
  const label = t('show.sunset');
  if (sun.on) return { label, text: t('show.now', { m: Math.max(1, Math.ceil((sun.end - now) / 60e3)) }) };
  const mins = Math.max(1, Math.ceil((sun.start - now) / 60e3)), at = clock(sun.start);
  if (mins < 60) return { label, text: t('show.inM', { m: mins, at }) };
  return { label, text: t('show.inHM', { h: Math.floor(mins / 60), m: mins % 60, at }) };
}
