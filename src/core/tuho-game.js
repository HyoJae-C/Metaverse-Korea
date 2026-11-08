// Tuho (투호) rules, no DOM (ui/tuho-ui.js draws it).
//
// Toss arrows into a jar a few steps away. Each toss is two taps: an aim
// marker swings left and right (tap to fix the direction), then a power bar
// rises and falls (tap to fix how far). The jar has a mouth in the middle
// and two small ears (귀) on its sides: the mouth scores 2, an ear 3. An
// arrow that just clips the rim bounces out. Ten arrows a round; the markers
// swing a little faster with every arrow.

export const TUHO_GAME = 'tuho'; // medal id (core/grill-game.js Medals)
export const ARROWS = 10;
export const JAR_AT = 2.6; // metres from the throwing line
export const NEAR = 2.0, FAR = 3.2; // where power 0 and 1 land
export const SPREAD = 0.32; // aim -1..1 → metres left/right at the jar
export const MOUTH_R = 0.075; // how close to the middle counts as in the mouth
export const EAR_X = 0.17, EAR_R = 0.035;
export const RIM = 0.03; // past the mouth by less than this: bounces off the rim
export const POINTS = { mouth: 2, ear: 3, rim: 0, miss: 0 };
export const MEDAL_SCORES = { gold: 22, silver: 16, bronze: 10 };

// The swinging markers, t in seconds. aim: -1..1 (a smooth swing), power:
// 0..1 (up and down at a steady speed). Arrow k (0-based) swings faster.
export const swingSpeed = (k) => 1 + Math.min(k, 9) * 0.07;
export function aimAt(t, k = 0) { return Math.sin(t * 2.4 * swingSpeed(k)); }
export function powerAt(t, k = 0) {
  const u = (t * 0.85 * swingSpeed(k)) % 2;
  return u < 1 ? u : 2 - u;
}

// Where an arrow lands and what it scores. A small wobble (rand) keeps two
// identical taps from always landing on the same spot.
export function toss(aim, power, rand = Math.random) {
  const wob = () => (rand() + rand() - 1) * 0.012;
  const x = aim * SPREAD + wob();
  const d = NEAR + power * (FAR - NEAR) + wob();
  const r = Math.hypot(x, d - JAR_AT);
  let kind = 'miss';
  if (r < MOUTH_R) kind = 'mouth';
  else if (Math.hypot(Math.abs(x) - EAR_X, d - JAR_AT) < EAR_R) kind = 'ear';
  else if (r < MOUTH_R + RIM) kind = 'rim';
  // Which way it missed, for the teacher's tip.
  const short = d < JAR_AT - MOUTH_R;
  let tip = null;
  if (kind === 'rim') tip = 'rim';
  else if (kind === 'miss') tip = Math.abs(d - JAR_AT) > Math.abs(x) ? (short ? 'short' : 'long') : x < 0 ? 'left' : 'right';
  return { x, d, kind, points: POINTS[kind], tip };
}

export function tuhoMedal(score) {
  for (const m of ['gold', 'silver', 'bronze']) if (score >= MEDAL_SCORES[m]) return m;
  return null;
}

// One round: ARROWS tosses, a running score.
export class TuhoRound {
  constructor() { this.throws = []; }
  get k() { return this.throws.length; }
  get done() { return this.throws.length >= ARROWS; }
  get score() { return this.throws.reduce((a, r) => a + r.points, 0); }
  get inJar() { return this.throws.filter((r) => r.points > 0).length; }
  add(result) { if (!this.done) this.throws.push(result); return result; }
}
