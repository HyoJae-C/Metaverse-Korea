// Yeouido fireworks (여의도 불꽃놀이): when they happen, where, and the
// program of bursts. Pure, no DOM, so it can be unit-tested; the sparks
// themselves are drawn by fireworks-sky.js, which is only downloaded when
// you come near Yeouido around show time.
//
// The show is in the game's night (show-clock.js, weather.js), and Yeouido
// makes sure of it too: during a show the sky on and around the island
// (Seogang Bridge and the Hongdae bank across the river) is night, fading
// in and out.
//
// Everyone's clock gives the same bursts at the same moment (like the drone
// show and the weather): the program is worked out from the show's start
// time, so friends on the lawn watch the same fireworks together.

import { smooth, showStarts, FIREWORKS } from './show-clock.js';

// When: one night in ten of the game's two-hour day (show-clock.js),
// taking turns with the Ttukseom drone show: every 20 hours.
export const SHOW_SECONDS = 20 * 60; // 20 minutes of fireworks (t = 0 … 1200)
export const DUSK_SECONDS = 180; // before the start: Yeouido's sky darkens
export const DAWN_SECONDS = 180; // after the end: it brightens again
export const ALERT_SECONDS = 600; // the game-wide "in 10 minutes" notice
export const RISE = 1.2; // seconds a shell takes to climb before it bursts

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
export function fireworksAt(now = Date.now()) {
  for (const start of showStarts(now, FIREWORKS)) {
    const t = (now - start) / 1000;
    if (t >= -ALERT_SECONDS && t < SHOW_SECONDS + DAWN_SECONDS) return { start, t, night: nightAt(t), on: t >= 0 && t < SHOW_SECONDS };
  }
  return null;
}

// The next show's start (ms) after now.
export function nextFireworks(now = Date.now()) {
  return showStarts(now, FIREWORKS).find((s) => s > now);
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
// 20 minutes with no quiet stretch: something bursts every second or so,
// the shapes change every few minutes, a gold "photo time", and a finale
// that fills the sky. (Yozi: shorter, busier, more kinds.) volley:
// [chance, fewest, most]: now and then several shells of one kind burst at
// the same moment in a line along the river, for a big "bang" (Yozi: too
// many came one by one).
export const PHOTO_TIME = [780, 900];
export const FINALE_TIME = 1110;
export const ACTS = [
  { from: 0, to: 150, gap: [0.9, 1.4], kinds: ['peony', 'ring', 'saturn', 'peony'], mono: true, volley: [0.3, 3, 3], name: 'opening: big single-colour flowers' },
  { from: 150, to: 330, gap: [0.7, 1.1], kinds: ['pistil', 'dahlia', 'kamuro', 'flower', 'butterfly', 'double'], volley: [0.2, 3, 3], name: 'act 1: shapes' },
  { from: 330, to: 360, gap: [0.25, 0.45], kinds: ['small', 'small', 'ring'], volley: [0.4, 5, 7], name: 'crackle: a rush of small ones' },
  { from: 360, to: 540, gap: [0.5, 0.9], kinds: ['rainbow', 'palm', 'spiral', 'ring', 'peony', 'saturn'], volley: [0.3, 3, 5], name: 'act 2: colours and spirals' },
  { from: 540, to: 600, gap: [0.9, 1.4], kinds: ['small', 'ring', 'double', 'peony', 'rainbow'], volley: [1, 5, 7], name: 'salvo: every barge at once' },
  { from: 600, to: PHOTO_TIME[0], gap: [0.5, 0.8], kinds: ['pistil', 'flower', 'butterfly', 'rainbow', 'palm', 'dahlia', 'spiral', 'kamuro'], volley: [0.3, 3, 5], name: 'act 3: everything' },
  { from: PHOTO_TIME[0], to: PHOTO_TIME[1], gap: [0.9, 1.3], kinds: ['willow'], volley: [0.35, 3, 5], name: 'photo time: gold willows' },
  { from: PHOTO_TIME[1], to: FINALE_TIME, gap: [0.8, 0.2], kinds: ['peony', 'ring', 'pistil', 'willow', 'kamuro', 'rainbow', 'palm', 'saturn', 'flower', 'small'], ramp: true, volley: [0.3, 3, 5], name: 'build-up: faster and faster' },
  { from: FINALE_TIME, to: SHOW_SECONDS, gap: [0.25, 0.4], kinds: ['peony', 'willow', 'ring', 'rainbow', 'peony', 'palm'], big: true, volley: [0.6, 5, 9], name: 'finale' },
];
// (No hearts, stars or smiles: those are the drone show's. Yozi.)
export const KINDS = ['peony', 'ring', 'pistil', 'dahlia', 'kamuro', 'willow', 'small', 'saturn', 'flower', 'butterfly', 'double', 'spiral', 'palm', 'rainbow'];
export const COLORS = ['#ff4d5e', '#ffd34d', '#4dd2ff', '#7dff6b', '#ff7ae0', '#ffffff', '#b07bff', '#ff9a3c'];
export const GOLD = '#ffc861';
// How long a kind's sparks glow (seconds) and how wide it opens (metres).
export const LIFE = { peony: 2.6, ring: 2.4, pistil: 2.6, dahlia: 3, kamuro: 5.2, willow: 4.6, small: 1.5, saturn: 2.8, flower: 2.8, butterfly: 2.8, double: 2.6, spiral: 2.8, palm: 3.2, rainbow: 2.6 };
export const RADIUS = { peony: 28, ring: 26, pistil: 28, dahlia: 30, kamuro: 34, willow: 30, small: 11, saturn: 26, flower: 26, butterfly: 26, double: 26, spiral: 26, palm: 30, rainbow: 28 };

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
      const color = kind === 'willow' || kind === 'kamuro' ? GOLD : act.mono ? mono : COLORS[Math.floor(r() * COLORS.length)];
      let color2 = r() < 0.35 ? COLORS[Math.floor(r() * COLORS.length)] : color;
      if (kind === 'pistil' && color2 === color) color2 = COLORS[(COLORS.indexOf(color) + 3) % COLORS.length] || '#ffffff'; // its heart is another colour
      const scale = (act.big ? 1.15 : 1) * (0.85 + r() * 0.3);
      const [vc, v0, v1] = act.volley || [0, 1, 1];
      const n = r() < vc ? v0 + Math.floor(r() * (v1 - v0 + 1)) : 1;
      if (n > 1) {
        // A volley: n shells at once, evenly along all three barges, in a
        // flat line, a V or an arch, in one colour or two taking turns.
        const span = BARGES.at(-1)[0] - BARGES[0][0] + 50, shape = Math.floor(r() * 3), base = kind === 'small' ? 30 : 42;
        const tt = Math.round(t * 100) / 100;
        for (let i = 0; i < n; i++) {
          const u = BARGES[0][0] - 25 + (span * i) / (n - 1), barge = BARGES.reduce((b, x, j) => (Math.abs(x[0] - u) < Math.abs(BARGES[b][0] - u) ? j : b), 0);
          const m = Math.abs(i / (n - 1) - 0.5) * 2; // 0 in the middle, 1 at the ends
          const h = base + [6, 4 + 16 * m, 20 - 16 * m][shape];
          out.push({ t: tt, barge, du: u - BARGES[barge][0], h, kind, color: i % 2 && kind !== 'willow' && kind !== 'kamuro' && kind !== 'pistil' && color2 !== color ? color2 : color, color2: kind === 'pistil' ? color2 : color, scale, seed: Math.floor(r() * 1e9) });
        }
      } else {
        out.push({
          t: Math.round(t * 100) / 100, barge: Math.floor(r() * BARGES.length), du: (r() - 0.5) * 50,
          h: kind === 'small' ? 28 + r() * 12 : 40 + r() * 22, kind, color, color2, scale, seed: Math.floor(r() * 1e9),
        });
      }
      const [g0, g1] = act.gap;
      t += (act.ramp ? g0 + (g1 - g0) * k : g0 + (g1 - g0) * r()) * (n > 1 ? 1.6 : 1); // a breath after a volley
    }
  }
  if (cache.size > 4) cache.clear();
  cache.set(start, out);
  return out;
}
