// Rules for three modern-city activities, no DOM so they can be unit-tested:
//   bowling   (볼링장)      10 frames, real ball and pin physics and scoring
//   climbing  (클라이밍짐)  bouldering problems graded V0-V5 by hold colour
//   aim       (PC방)        a 30-second target practice with e-sports tiers
// Like the batting cage (core/arcade.js) they are free to play and pay out
// no coins: you chase your own records, kept in this browser.

import { PINS, PIN_GAP } from './bowling-physics.js';

export const ACTIVITY_KEY = 'mk.activity';

// ── Bowling ──────────────────────────────────────────────────────────────
// A full 10-frame game. The ball and the pins are simulated in
// core/bowling-physics.js; here are the score sheet rules.
export { PINS, LANE_HALF } from './bowling-physics.js';
export const FRAMES = 10;

// A split: the head pin is down and what is left stands in two or more
// groups with a gap between them (7-10, 4-6, 3-10…). 6-10 is not one.
export function isSplit(left) {
  if (left.includes(0) || left.length < 2) return false;
  const near = (a, b) => Math.hypot(PINS[a].x - PINS[b].x, PINS[a].z - PINS[b].z) < PIN_GAP + 0.01;
  const seen = new Set([left[0]]), todo = [left[0]];
  while (todo.length) { const a = todo.pop(); for (const b of left) if (!seen.has(b) && near(a, b)) { seen.add(b); todo.push(b); } }
  return seen.size < left.length;
}

// Split rolls (pins down per ball) into frames; the last frame has up to 3.
export function frameRolls(rolls, n = FRAMES) {
  const frames = [];
  let i = 0;
  for (let f = 0; f < n && i < rolls.length; f++) {
    if (f === n - 1) { frames.push(rolls.slice(i, i + 3)); break; }
    if (rolls[i] === 10) { frames.push([10]); i += 1; } else { frames.push(rolls.slice(i, i + 2)); i += 2; }
  }
  return frames;
}
const lastDone = ([a, b, c]) => (a === 10 || (b != null && a + b === 10) ? c != null : b != null);

// Running total after each frame, as far as it is known (a strike waits for
// the next two balls, a spare for the next one).
export function bowlingScores(rolls, n = FRAMES) {
  const out = [];
  let i = 0, total = 0;
  for (let f = 0; f < n; f++) {
    const [a, b, c] = [rolls[i], rolls[i + 1], rolls[i + 2]];
    if (a == null) break;
    if (f === n - 1) {
      if (!lastDone([a, b, c])) break;
      out.push((total += a + b + (c ?? 0)));
      break;
    }
    if (a === 10) {
      if (b == null || c == null) break;
      out.push((total += 10 + b + c));
      i += 1;
    } else {
      if (b == null) break;
      if (a + b === 10) { if (c == null) break; total += 10 + c; } else total += a + b;
      out.push(total);
      i += 2;
    }
  }
  return out;
}

// Whose ball is next: { frame, ball, fresh (a full rack of 10), over }.
export function bowlingTurn(rolls, n = FRAMES) {
  const fr = frameRolls(rolls, n);
  const f = fr.length - 1;
  if (f < 0) return { frame: 0, ball: 0, fresh: true, over: false };
  const cur = fr[f];
  const done = f < n - 1 ? cur[0] === 10 || cur.length === 2 : lastDone(cur);
  if (done) return f === n - 1 ? { frame: f, ball: cur.length, fresh: false, over: true } : { frame: f + 1, ball: 0, fresh: true, over: false };
  let fresh = false;
  if (f === n - 1) { // the last frame racks up again after a strike or a spare
    if (cur.length === 1) fresh = cur[0] === 10;
    else fresh = cur[0] === 10 ? cur[1] === 10 : cur[0] + cur[1] === 10;
  }
  return { frame: f, ball: cur.length, fresh, over: false };
}
// The marks on the score sheet: X strike, / spare, - nothing.
export function frameMarks(frame) {
  const out = [];
  let rack = true; // this ball meets a full rack
  frame.forEach((v, k) => {
    if (rack && v === 10) out.push('X');
    else if (!rack && frame[k - 1] + v === 10) out.push('/');
    else out.push(v === 0 ? '-' : String(v));
    // The next ball meets a full rack after a strike or a spare (only the
    // last frame gets that far).
    rack = (rack && v === 10) || (!rack && frame[k - 1] + v === 10);
  });
  return out;
}

// ── Climbing ─────────────────────────────────────────────────────────────
// A boulder problem is marked by its hold colour, the way real gyms do it.
// A ring shrinks around the next hold; reach (tap) when it closes on it.
// Your grip drains all the time; a clean reach gives some back, a slip
// costs a lot, and an empty grip means you drop onto the mat.
export const CLIMB_ROUTES = [
  { id: 'v0', grade: 'V0', color: '#f2c94c', holds: 7, period: 1.45, window: 0.2, drain: 0.035 },
  { id: 'v1', grade: 'V1', color: '#5fbf6a', holds: 8, period: 1.3, window: 0.17, drain: 0.045 },
  { id: 'v2', grade: 'V2', color: '#4a90d9', holds: 9, period: 1.15, window: 0.145, drain: 0.055 },
  { id: 'v3', grade: 'V3', color: '#e0524a', holds: 10, period: 1.0, window: 0.125, drain: 0.065 },
  { id: 'v4', grade: 'V4', color: '#9b6bd6', holds: 11, period: 0.9, window: 0.105, drain: 0.075 },
  { id: 'v5', grade: 'V5', color: '#2b2b2e', holds: 12, period: 0.8, window: 0.09, drain: 0.085 },
];
export const routeById = (id) => CLIMB_ROUTES.find((r) => r.id === id) || null;

// The holds of a route, bottom to top, in wall units (x 0..1, y 0..1). The
// same every time (seeded by the route), zig-zagging further on harder ones.
export function routeHolds(route) {
  let s = [...route.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const swing = 0.1 + CLIMB_ROUTES.indexOf(route) * 0.035;
  const out = [];
  let x = 0.5;
  for (let i = 0; i < route.holds; i++) {
    const y = 0.07 + (i / (route.holds - 1)) * 0.86;
    if (i > 0) x = Math.max(0.12, Math.min(0.88, x + (i % 2 ? 1 : -1) * swing * (0.6 + rnd() * 0.8)));
    out.push([+x.toFixed(3), +y.toFixed(3)]);
  }
  return out;
}

// phase: 0..1 through the ring's shrink (1 = closed on the hold).
export function judgeReach(phase, route) {
  const err = Math.min(Math.abs(1 - phase), phase); // (just after closing counts too)
  if (err <= route.window * 0.4) return 'perfect';
  if (err <= route.window) return 'good';
  return 'slip';
}
export const GRIP_GAIN = { perfect: 0.12, good: 0.04, slip: -0.24 };
export const gripAfter = (grip, result) => Math.max(0, Math.min(1, grip + GRIP_GAIN[result]));
export const gripDrain = (grip, route, dt) => Math.max(0, grip - route.drain * dt);

// A grade opens once you have topped the one below it.
export const climbOpen = (rec, route) => {
  const i = CLIMB_ROUTES.indexOf(route);
  return i <= 0 || !!rec?.climb?.[CLIMB_ROUTES[i - 1].id];
};

// ── Aim (PC방) ───────────────────────────────────────────────────────────
// Targets pop up one at a time and shrink; hit each before it vanishes.
// Faster hits score more; a click on nothing costs a little.
export const AIM_SECONDS = 30;
const ramp = (t) => Math.max(0, Math.min(1, t / AIM_SECONDS));
export const aimLife = (t) => 1.5 - 0.75 * ramp(t); // s a target stays up
export const aimRadius = (t) => 0.06 - 0.025 * ramp(t); // of the canvas width
export const aimPoints = (reactMs) => 100 + Math.max(0, Math.round((900 - reactMs) / 9));
export const AIM_MISS = 40;
export const AIM_TIERS = [
  { id: 'bronze', min: 0, icon: '🥉' },
  { id: 'silver', min: 2000, icon: '🥈' },
  { id: 'gold', min: 3500, icon: '🥇' },
  { id: 'platinum', min: 5000, icon: '💠' },
  { id: 'diamond', min: 6500, icon: '💎' },
  { id: 'master', min: 8000, icon: '👑' },
];
export const aimTier = (score) => [...AIM_TIERS].reverse().find((t) => score >= t.min);
export const accuracy = (hits, misses) => (hits + misses ? Math.round((hits / (hits + misses)) * 100) : 0);

// ── Records ──────────────────────────────────────────────────────────────
// { bowling: best score, climb: { v0: best seconds, … }, aim: best score }
export function loadActivity(store) {
  try { const r = JSON.parse(store?.getItem(ACTIVITY_KEY) || '{}'); return r && typeof r === 'object' ? r : {}; } catch { return {}; }
}
// Save if better; true for a new record. Climbing keeps the fastest time.
export function saveActivity(store, game, value, routeId) {
  const rec = loadActivity(store);
  let better;
  if (game === 'climb') {
    rec.climb ||= {};
    better = !(rec.climb[routeId] <= value);
    if (better) rec.climb[routeId] = value;
  } else {
    better = !(rec[game] >= value);
    if (better) rec[game] = value;
  }
  if (better) try { store?.setItem(ACTIVITY_KEY, JSON.stringify(rec)); } catch { /* storage blocked */ }
  return better;
}
