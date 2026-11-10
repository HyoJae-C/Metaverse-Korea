// Yeouido fireworks (여의도 불꽃놀이): when they happen, where, and the
// program of bursts. Pure, no DOM, so it can be unit-tested; the sparks
// themselves are drawn by fireworks-sky.js, which is only downloaded when
// you come near Yeouido around show time.
//
// The game's day and night follow Seoul's (weather.js), and the show makes
// its own night too: during a morning show the sky turns to night only on
// and around Yeouido (the island, Seogang Bridge and the Hongdae bank
// across the river), fading in and out. Everywhere else it stays day.
//
// Everyone's clock gives the same bursts at the same moment (like the drone
// show and the weather): the program is worked out from the show's start
// time, so friends on the lawn watch the same fireworks together.

import { smooth, dailyStarts, checkTimes } from './show-clock.js';

// Show start times on Korean time (KST, UTC+9): twice a day. 21:00 is the
// evening in Korea, Japan and South-East Asia; 09:00 is the evening in the
// Americas. Kept 3 hours from the Ttukseom drone show (6, 18 KST). This is
// only the default: operators set the times from the operator page
// (admin.html → Shows, supabase/033_show_times.sql), and every game follows
// them (show-times-watch.js → setFireworksTimes).
export const FIREWORKS_HOURS_KST = [9, 21];
export const SHOW_SECONDS = 60 * 60; // an hour of fireworks (t = 0 … 3600)
export const DUSK_SECONDS = 180; // before the start: Yeouido's sky darkens
export const DAWN_SECONDS = 180; // after the end: it brightens again
export const ALERT_SECONDS = 600; // the game-wide "in 10 minutes" notice
export const RISE = 1.2; // seconds a shell takes to climb before it bursts

const DAY = 24 * 3600e3;

// Operator-set times: 1 to 4 shows a day, at least 90 minutes apart (the
// hour of fireworks plus its notice and dawn). FIREWORKS_SPAN: the minutes
// around a start the show takes, notice to dawn (kept clear of the drones).
export const MAX_SHOWS = 4;
export const MIN_GAP_MINUTES = 90;
export const FIREWORKS_SPAN = [-ALERT_SECONDS / 60, (SHOW_SECONDS + DAWN_SECONDS) / 60];
export const checkFireworksTimes = (list) => checkTimes(list, { max: MAX_SHOWS, gap: MIN_GAP_MINUTES });

// The times every game uses now (hours, may be fractional).
let showHours = FIREWORKS_HOURS_KST;
export const fireworksHours = () => showHours;

// Takes the operators' list (minutes after midnight KST), or null for the
// default. A bad list is ignored and the default stays.
export function setFireworksTimes(list) {
  const r = Array.isArray(list) ? checkFireworksTimes(list) : null;
  showHours = r?.minutes ? r.minutes.map((m) => m / 60) : FIREWORKS_HOURS_KST;
  return showHours;
}

// How dark Yeouido's sky is t seconds into a show: 0 = day, 1 = night.
export function nightAt(t) {
  if (t < -DUSK_SECONDS || t > SHOW_SECONDS + DAWN_SECONDS) return 0;
  if (t < -30) return smooth((t + DUSK_SECONDS) / (DUSK_SECONDS - 30));
  if (t > SHOW_SECONDS + 30) return 1 - smooth((t - SHOW_SECONDS - 30) / (DAWN_SECONDS - 30));
  return 1;
}

// The show around `now`, from 10 minutes before the start until the sky is
// day again: { start (ms), t (seconds from the start, negative before),
// night (0–1), on (bursts can happen: 0 … SHOW_SECONDS) }. null otherwise.
export function fireworksAt(now = Date.now(), hours = showHours) {
  for (const start of dailyStarts(now, hours)) {
    const t = (now - start) / 1000;
    if (t >= -ALERT_SECONDS && t < SHOW_SECONDS + DAWN_SECONDS) return { start, t, night: nightAt(t), on: t >= 0 && t < SHOW_SECONDS };
  }
  return null;
}

// The next show's start (ms) after now.
export function nextFireworks(now = Date.now(), hours = showHours) {
  return dailyStarts(now, hours).find((s) => s > now) ?? dailyStarts(now + DAY, hours)[0];
}

// ---- Where (world metres; the same frame as scripts/build-yeouido.mjs) ----
export const ORIGIN = [-2606.5, 528.6]; // the middle of the park's stretch of north shore
const ANGLE = (46 * Math.PI) / 180;
export const U = [Math.cos(ANGLE), Math.sin(ANGLE)]; // along the river
export const V = [-U[1], U[0]]; // across it: v < 0 is the main channel, towards Hongdae
export const atUV = (u, v) => [ORIGIN[0] + u * U[0] + v * V[0], ORIGIN[1] + u * U[1] + v * V[1]];
export const toUV = (x, z) => {
  const dx = x - ORIGIN[0], dz = z - ORIGIN[1];
  return [dx * U[0] + dz * U[1], dx * V[0] + dz * V[1]];
};
// Three launch barges in the main channel, facing the lawn (u -94 … 120).
export const BARGES = [[-46, -115], [13, -125], [72, -115]];

// How much the show's night reaches a spot: 1 on the island, Seogang Bridge
// and the Hongdae bank by the bridge, fading to 0 over the next 90 m (so
// Hongdae's south edge gets a dusky sky, the rest of Seoul none).
export function nearYeouido(x, z) {
  const [u, v] = toUV(x, z);
  // The island runs u -616 … 231 and v 0 … 440 (to the Saetgang); the
  // bridge's Hongdae end is at v -257.
  const out = Math.max(0, Math.abs(u + 192) - 450, v - 470, -265 - v);
  return 1 - smooth(out / 90);
}

// ---- The program ----
// Acts and rests: no wait longer than about two minutes for anyone who
// arrives mid-show, a gold "photo time", and a finale that fills the sky.
export const PHOTO_TIME = [2520, 2700];
export const ACTS = [
  { from: 0, to: 720, gap: [2.2, 3.2], kinds: ['peony', 'peony', 'ring'], mono: true, name: 'act 1: big single-colour flowers, slowly' },
  { from: 720, to: 840, gap: [6, 9], kinds: ['small'], name: 'rest' },
  { from: 840, to: 1620, gap: [1.6, 2.4], kinds: ['heart', 'star', 'ring', 'smile', 'peony'], name: 'act 2: shapes in many colours' },
  { from: 1620, to: 1740, gap: [6, 9], kinds: ['small'], name: 'rest' },
  { from: 1740, to: 2520, gap: [0.6, 1.1], kinds: ['peony', 'ring', 'small', 'peony', 'willow'], name: 'act 3: quick, from every barge' },
  { from: PHOTO_TIME[0], to: PHOTO_TIME[1], gap: [2.4, 3.4], kinds: ['willow'], name: 'photo time: slow gold willows' },
  { from: 2700, to: 3420, gap: [1.4, 0.45], kinds: ['peony', 'ring', 'heart', 'willow', 'star', 'small'], ramp: true, name: 'build-up: faster and faster' },
  { from: 3420, to: SHOW_SECONDS, gap: [0.12, 0.24], kinds: ['peony', 'willow', 'ring', 'peony'], big: true, name: 'finale' },
];
export const KINDS = ['peony', 'ring', 'heart', 'star', 'smile', 'willow', 'small'];
export const COLORS = ['#ff4d5e', '#ffd34d', '#4dd2ff', '#7dff6b', '#ff7ae0', '#ffffff', '#b07bff', '#ff9a3c'];
export const GOLD = '#ffc861';
// How long a kind's sparks glow (seconds) and how wide it opens (metres).
export const LIFE = { peony: 2.6, ring: 2.4, heart: 2.8, star: 2.6, smile: 2.8, willow: 4.6, small: 1.5 };
export const RADIUS = { peony: 28, ring: 26, heart: 24, star: 26, smile: 24, willow: 30, small: 11 };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every burst of the show that starts at `start` (ms), in time order:
// { t (seconds: when it bursts), barge (0-2), du (metres along the river
// from its barge), h (height), kind, color, color2, scale, seed }.
const cache = new Map();
export function program(start) {
  if (cache.has(start)) return cache.get(start);
  const r = rng(Math.floor(start / 1000));
  const out = [];
  let mono = null;
  for (const act of ACTS) {
    let t = act.from + r() * 0.5;
    while (t < act.to) {
      const k = act.ramp ? (t - act.from) / (act.to - act.from) : r();
      const kind = act.kinds[Math.floor(r() * act.kinds.length)];
      if (act.mono && (!mono || r() < 0.08)) mono = COLORS[Math.floor(r() * COLORS.length)];
      const color = kind === 'willow' ? GOLD : act.mono ? mono : COLORS[Math.floor(r() * COLORS.length)];
      const color2 = r() < 0.35 ? COLORS[Math.floor(r() * COLORS.length)] : color;
      out.push({
        t: Math.round(t * 100) / 100, barge: Math.floor(r() * BARGES.length), du: (r() - 0.5) * 50,
        h: kind === 'small' ? 28 + r() * 12 : 40 + r() * 22, kind, color, color2,
        scale: (act.big ? 1.15 : 1) * (0.85 + r() * 0.3), seed: Math.floor(r() * 1e9),
      });
      const [g0, g1] = act.gap;
      t += act.ramp ? g0 + (g1 - g0) * k : g0 + (g1 - g0) * r();
    }
  }
  if (cache.size > 4) cache.clear();
  cache.set(start, out);
  return out;
}
