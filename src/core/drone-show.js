// Ttukseom drone light show (한강 드론 라이트쇼): when it happens. Pure, no
// DOM, so it can be unit-tested; the drones themselves are in drone-sky.js,
// which is only downloaded when you walk into Ttukseom park near show time.
//
// The game's day and night follow Seoul's (weather.js), and the show makes
// its own night too: during a show Ttukseom park's sky turns to night
// (park.js) even when the sun is still up, fading in and out.
//
// Everyone's clock gives the same show at the same moment (like the lucky
// fishing spot and the weather), so friends watch the same drones together.

import { smooth, dailyStarts } from './show-clock.js';

// Show start times on Korean time (KST, UTC+9): twice a day. 18:00 is the
// early evening in Korea; 06:00 is the evening (22:00 CET) in Europe. Kept
// 3 hours apart from the Yeouido fireworks (09, 21 KST, fireworks-show.js),
// so the two shows never overlap. This is only the default: operators set
// the times from the operator page (admin.html → Drone show,
// supabase/033_drone_show.sql), and every game follows them
// (drone-show-watch.js → setDroneShowTimes).
export const DRONE_SHOW_HOURS_KST = [6, 18];
export const SHOW_SECONDS = 20 * 60; // the show itself (t = 0 … 1200)
export const LIFT_SECONDS = 180; // before the start: the sky darkens, the drones rise
export const LAND_SECONDS = 180; // after the end: they land, the sky brightens
export const ALERT_SECONDS = 600; // the game-wide "in 10 minutes" notice

const DAY = 24 * 3600e3;

// Operator-set times: 1 to 4 shows a day, as minutes after midnight KST
// (0 … 1439), at least an hour apart (the show plus its notice and landing
// take 33 minutes) and clear of the fireworks.
export const MAX_SHOWS = 4;
export const MIN_GAP_MINUTES = 60;
// Minutes from a drone show's start that must not fall inside a fireworks
// show: its notice (10 min before) through the end of its landing.
const DRONE_SPAN = [-ALERT_SECONDS / 60, (SHOW_SECONDS + LAND_SECONDS) / 60];

// Checks a list of start times (minutes after midnight KST). → { minutes }
// sorted, or { error } with a reason: 'empty', 'many', 'bad', 'close',
// 'fireworks'. fireworks: [[start minute, end minute], …] to keep clear of.
export function checkShowTimes(list, fireworks = []) {
  if (!Array.isArray(list) || !list.length) return { error: 'empty' };
  if (list.length > MAX_SHOWS) return { error: 'many' };
  if (list.some((m) => !Number.isInteger(m) || m < 0 || m >= 1440)) return { error: 'bad' };
  const minutes = [...list].sort((a, b) => a - b);
  for (let i = 0; i < minutes.length; i++) {
    const next = i + 1 < minutes.length ? minutes[i + 1] : minutes[0] + 1440;
    if (minutes.length > 1 && next - minutes[i] < MIN_GAP_MINUTES) return { error: 'close' };
  }
  const span = (a0, a1, b0, b1) => [-1440, 0, 1440].some((d) => a0 + d < b1 && b0 < a1 + d);
  for (const m of minutes) for (const [f0, f1] of fireworks) {
    if (span(m + DRONE_SPAN[0], m + DRONE_SPAN[1], f0, f1)) return { error: 'fireworks' };
  }
  return { minutes };
}

// "18:30" for 1110 minutes.
export const clockText = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// The times every game uses now (hours, may be fractional: 18.5 = 18:30).
let showHours = DRONE_SHOW_HOURS_KST;
export const droneShowHours = () => showHours;

// Takes the operators' setting ({ minutes: [...] } from the server, or null
// for the default). A bad list is ignored and the default stays.
export function setDroneShowTimes(raw) {
  const r = Array.isArray(raw?.minutes) ? checkShowTimes(raw.minutes) : null;
  showHours = r?.minutes ? r.minutes.map((m) => m / 60) : DRONE_SHOW_HOURS_KST;
  return showHours;
}

// How dark the park's sky is t seconds into a show: 0 = day, 1 = night.
// Darkens over the 3 minutes before the start, stays dark through the show
// and the landing, brightens over the last 2 minutes.
export function nightAt(t) {
  if (t < -LIFT_SECONDS || t > SHOW_SECONDS + LAND_SECONDS) return 0;
  if (t < -60) return smooth((t + LIFT_SECONDS) / (LIFT_SECONDS - 60));
  if (t > SHOW_SECONDS + 60) return 1 - smooth((t - SHOW_SECONDS - 60) / (LAND_SECONDS - 60));
  return 1;
}

// The show around `now`, from 10 minutes before the start to the end of the
// landing: { start (ms), t (seconds from the start, negative before),
// night (0–1), on (the drones are up: lift-off to landing) }. null otherwise.
export function droneShowAt(now = Date.now(), hours = showHours) {
  for (const start of dailyStarts(now, hours)) {
    const t = (now - start) / 1000;
    if (t >= -ALERT_SECONDS && t < SHOW_SECONDS + LAND_SECONDS) {
      return { start, t, night: nightAt(t), on: t >= -LIFT_SECONDS && t < SHOW_SECONDS + 60 };
    }
  }
  return null;
}

// The next show's start (ms) after the current one (or after now).
export function nextDroneShow(now = Date.now(), hours = showHours) {
  return dailyStarts(now, hours).find((s) => s > now) ?? dailyStarts(now + DAY, hours)[0];
}

// Which show of all time this is (counts up by one per show): picks the
// changing part of the program, the same on every screen.
export function showNumber(start, hours = showHours) {
  const k = start + 9 * 3600e3, day = Math.floor(k / DAY), h = (k - day * DAY) / 3600e3;
  let i = 0, best = Infinity;
  hours.forEach((x, j) => { const d = Math.abs(x - h); if (d < best) { best = d; i = j; } });
  return day * hours.length + i;
}

// Where it happens, in the Ttukseom park room's space (park.js: the river is
// z < -4, the duck boats stay at z > -44, the bridge is at z = -74). The
// drones draw on an upright "sky plane" in front of the bridge, sized so a
// phone held upright still sees the whole picture from the lawn.
export const SKY = { x: 0, y: 16, z: -52, w: 28, h: 20 };
// The launch barge the drones rise from and land on (there in the day too).
export const BARGE = { x: 0, z: -52, w: 15, d: 6, deck: 0.55 };
