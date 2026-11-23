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

// When: 23:10 KST every other day, taking turns with the Ttukseom drone
// show (show-clock.js PLAN): rare, so it feels special.
// 8¾ minutes (t = 0 … 525; 70 minutes on the game's clock). Was 20: too long
// to stay exciting, and a show that's over soon is one you make a point of
// catching (Yozi: "너무길어서 오히려 보는사람이 지루하고 불꽃놀이 희귀성이
// 사라져").
export const SHOW_SECONDS = 525;
export const DUSK_SECONDS = 180; // before the start: Yeouido's sky darkens
export const DAWN_SECONDS = 180; // after the end: it brightens again
export const ALERT_SECONDS = 600; // the game-wide "in 10 minutes" notice
export const RISE = 1.7; // seconds a shell takes to climb before it bursts (long enough to follow its tail up: Yozi, the climb is half the fun)

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
// 8¾ minutes with no quiet stretch, built like a real festival (Yozi, with
// photos of the Seoul and Busan festivals: "공연의 구성 피날레라던가 시작
// 마무리 하이라이트 잘생각해줘"):
//   curtain up   three gold willows, one from each barge
//   opening      big flowers stacked over each other
//   acts 1-3     shapes, colours and spirals, a crackle rush between
//   highlight    every barge at once, fans of sparks along the water
//   photo time   gold willows only
//   build-up     faster and faster
//   finale       the sky full, then a wall of small colours, then a gold
//                curtain over the whole river to end on
// gap: [fewest, most] seconds between shots. cluster: how many shells one
// barge fires together (picked at random from the list), stacked at
// different heights, each its own colour: real shows rarely fire one by
// one (Yozi: "한쪽에서 한개만 쏘던 여러개 동시에 쏴도되는거아니야?").
// volley: [chance, fewest, most]: several shells of one kind in a line
// along all three barges, for a big "bang"; a beat (below) forces one
// every 35-50 s. fans: the chance a shot also
// sets off a row of low fans of sparks on the barges (the glowing fans on
// the water in every festival photo).
// The three acts used to look alike (all colours, all at one height), so
// each has its own sky now (Yozi 2026-11-21: "반복되는 부분을 높낮이
// 조절도 하고 색깔도 다양하게"): act 1 warm and low, act 2 cool and higher,
// act 3 every colour from low to very high.
// palette: the colours an act draws from (all of COLORS without one).
// low, spread: a cluster's lowest shell and how far the others stack above
// it (38 and 24 without). high: the chance one goes much higher (HIGH
// without). vbase: the heights its volleys are fired at (42 without).
const WARM = ['#ff4d5e', '#ff9a3c', '#ffd34d', '#ff7ae0', '#ff7a5c', '#ffffff'];
const COOL = ['#4dd2ff', '#b07bff', '#7dff6b', '#3df0c8', '#5b8cff', '#ffffff', '#c8ff5a'];
export const PHOTO_TIME = [330, 380];
export const FINALE_TIME = 435;
export const ACTS = [
  { from: 0, to: 12, gap: [1.3, 1.5], kinds: ['willow'], volley: [1, 3, 3], name: 'curtain up: a gold willow from each barge' },
  { from: 12, to: 70, gap: [1, 1.4], kinds: ['peony', 'peony', 'pistil', 'ring'], mono: true, cluster: [2, 3], volley: [0.2, 3, 5], fans: 0.06, name: 'opening: big flowers stacked' },
  { from: 70, to: 150, gap: [0.8, 1.2], kinds: ['pistil', 'dahlia', 'kamuro', 'willow', 'double', 'peony', 'peony'], cluster: [1, 2, 2, 3], volley: [0.2, 3, 3], fans: 0.04, palette: WARM, low: 32, spread: 20, high: 0.08, vbase: [36, 40], name: 'act 1: shapes, warm and low' },
  { from: 150, to: 168, gap: [0.3, 0.5], kinds: ['small'], cluster: [3, 4, 5], volley: [0.4, 5, 7], name: 'crackle: a rush of small ones' },
  { from: 168, to: 235, gap: [0.6, 1], kinds: ['rainbow', 'palm', 'spiral', 'ring', 'peony', 'peony'], cluster: [1, 2, 3], volley: [0.3, 3, 5], fans: 0.05, palette: COOL, low: 46, spread: 28, high: 0.25, vbase: [50, 58], name: 'act 2: spirals, cool and higher' },
  { from: 235, to: 270, gap: [0.8, 1.2], kinds: ['small', 'double', 'peony', 'rainbow'], cluster: [2, 3], volley: [1, 5, 7], together: true, fans: 0.35, name: 'highlight: every barge at once, fans on the water' },
  { from: 270, to: PHOTO_TIME[0], gap: [0.6, 0.9], kinds: ['pistil', 'peony', 'kamuro', 'rainbow', 'palm', 'dahlia', 'spiral', 'kamuro', 'peony'], cluster: [1, 2, 2, 3], volley: [0.3, 3, 5], fans: 0.04, low: 34, spread: 40, high: 0.35, vbase: [34, 48, 62], name: 'act 3: every colour, low to very high' },
  { from: PHOTO_TIME[0], to: PHOTO_TIME[1], gap: [1, 1.4], kinds: ['willow'], cluster: [1, 2], volley: [0.35, 3, 5], beats: false, name: 'photo time: gold willows' },
  { from: PHOTO_TIME[1], to: FINALE_TIME, gap: [1, 0.3], kinds: ['peony', 'ring', 'pistil', 'willow', 'kamuro', 'rainbow', 'palm', 'dahlia', 'small'], ramp: true, cluster: [1, 2, 3], volley: [0.3, 3, 5], fans: 0.08, name: 'build-up: faster and faster' },
  { from: FINALE_TIME, to: 497, gap: [0.35, 0.5], kinds: ['peony', 'willow', 'rainbow', 'peony', 'palm', 'pistil', 'ring'], big: true, cluster: [2, 3, 3], volley: [0.5, 5, 9], fans: 0.25, name: 'finale: the sky full' },
  { from: 497, to: 512, gap: [0.15, 0.25], kinds: ['small'], cluster: [4, 5, 6], volley: [0.5, 7, 9], fans: 0.15, name: 'finale: a wall of small colours' },
  { from: 512, to: SHOW_SECONDS, gap: [0.5, 0.6], kinds: ['kamuro'], big: true, volley: [1, 7, 9], fans: 1, name: 'finale: a gold curtain over the whole river' },
];
// (No hearts, stars, smiles, butterflies or flowers: pictures are the drone
// show's, and in fireworks they looked childish. Yozi.)
// Rings are fun once in a while but got tiring when they kept coming
// (Yozi: "원형이랑 행성모양이 너무자주나와"; the saturn is gone altogether:
// "행성 없애버려"), so when one is drawn it
// stays only this often (double, a ring in a ring, counts as one); the rest become the basic festival flower (peony).
export const KEEP = { ring: 0.25, double: 0.3 };
// How a volley (or a row of fans) goes off along the river, so the same
// line doesn't always bang at once (Yozi: "패턴이 다양하지않은게 흠"):
// 0 all together, 1 sweeping left to right, 2 right to left, 3 from the
// middle out, 4 from both ends in. Seconds after the first shell.
const STEP = 0.14;
// The chance a shell (or a whole volley) goes up high, about 25 m above the
// rest, and opens bigger (Yozi: "가끔은 높이도 더높아도 좋을것같고").
const HIGH = 0.15;
export function sweep(order, i, n) {
  const mid = (n - 1) / 2, off = Math.abs(i - mid);
  return STEP * [0, i, n - 1 - i, off, mid - off][order];
}
// The low fans on the barges: warm colours, like the photos.
const FAN_COLORS = ['#ffc861', '#ff9ac8', '#ffffff', '#ff9a3c'];

export const KINDS = ['fan', 'peony', 'ring', 'pistil', 'dahlia', 'kamuro', 'willow', 'small', 'double', 'spiral', 'palm', 'rainbow'];
export const COLORS = ['#ff4d5e', '#ffd34d', '#4dd2ff', '#7dff6b', '#ff7ae0', '#ffffff', '#b07bff', '#ff9a3c', '#3df0c8', '#5b8cff', '#ff7a5c', '#c8ff5a']; // (the last four: teal, blue, coral, lime)
export const GOLD = '#ffc861';
// Colours that look good together in one burst: its stars start in the
// first and turn into the second, a few in the second from the start
// (Yozi, with a sheet of festival bursts: "똑같은패턴도 색깔만 잘섞어도
// 이쁘게나올것같아"). Purple-sky blue, orange-yellow, red-purple and so on.
const PARTNERS = {
  '#ff4d5e': ['#b07bff', '#ffd34d', '#ffffff'], '#ffd34d': ['#ff9a3c', '#ff4d5e', '#7dff6b'], '#4dd2ff': ['#b07bff', '#ffffff', '#7dff6b'],
  '#7dff6b': ['#ffd34d', '#4dd2ff'], '#ff7ae0': ['#ffd34d', '#b07bff', '#ffffff'], '#ffffff': ['#ff7ae0', '#4dd2ff', '#b07bff'],
  '#b07bff': ['#4dd2ff', '#ff7ae0', '#ff4d5e'], '#ff9a3c': ['#ffd34d', '#ff4d5e', '#b07bff'],
  '#3df0c8': ['#5b8cff', '#ffffff', '#c8ff5a'], '#5b8cff': ['#3df0c8', '#b07bff', '#ffffff'],
  '#ff7a5c': ['#ffd34d', '#ff7ae0', '#ffffff'], '#c8ff5a': ['#3df0c8', '#ffd34d', '#4dd2ff'],
};
const partner = (c, r) => { const p = PARTNERS[c] || COLORS; return p[Math.floor(r() * p.length)]; };
// How long a kind's sparks glow (seconds) and how wide it opens (metres).
export const LIFE = { fan: 1.8, peony: 2.6, ring: 2.4, pistil: 2.6, dahlia: 3, kamuro: 5.2, willow: 4.6, small: 1.5, double: 2.6, spiral: 2.8, palm: 3.2, rainbow: 2.6 };
export const RADIUS = { fan: 26, peony: 28, ring: 26, pistil: 28, dahlia: 30, kamuro: 34, willow: 30, small: 11, double: 26, spiral: 26, palm: 30, rainbow: 28 };

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
// acts: the pattern to play (ACTS without one; fireworks-patterns.js has
// the others and picks the show's). More an act can say, for those:
// pure: a burst's second colour comes from the act's palette too (a sky all
// in one colour). orders: the ways its volleys go off (see sweep; any
// without). shapes: the lines its volleys draw (0 flat, 1 V, 2 arch,
// 3 staircase; any without).
const caches = new WeakMap();
export function program(start, acts = ACTS) {
  if (!caches.has(acts)) caches.set(acts, new Map());
  const cache = caches.get(acts);
  if (cache.has(start)) return cache.get(start);
  const r = rng(Math.floor(start / 1000));
  const out = [];
  let mono = null, nextBeat = 40;
  for (const act of acts) {
    const pal = act.palette || COLORS, hi = act.high ?? HIGH;
    const heart = (c) => (act.pure ? pal[(pal.indexOf(c) + 1) % pal.length] : COLORS[(COLORS.indexOf(c) + 3) % COLORS.length] || '#ffffff');
    const late = act.to - 0.01; // (a sweep's last shells stay in their act: only willows at photo time)
    let t = act.from + r() * 0.5;
    while (t < act.to) {
      const k = act.ramp ? (t - act.from) / (act.to - act.from) : r();
      let kind = act.kinds[Math.floor(r() * act.kinds.length)];
      if (KEEP[kind] && r() >= KEEP[kind]) kind = 'peony';
      if (act.mono && (!mono || r() < 0.08)) mono = COLORS[Math.floor(r() * COLORS.length)];
      const color = kind === 'willow' || kind === 'kamuro' ? GOLD : act.mono ? mono : pal[Math.floor(r() * pal.length)];
      let color2 = color === GOLD ? color : act.pure ? pal[Math.floor(r() * pal.length)] : r() < 0.75 ? partner(color, r) : color;
      if (kind === 'pistil' && color2 === color) color2 = heart(color); // its heart is another colour
      const scale = (act.big ? 1.15 : 1) * (0.85 + r() * 0.3);
      const [vc, v0, v1] = act.volley || [0, 1, 1];
      // A "beat" every 35-50 s: the biggest volley the act has plus a row of
      // fans, so no stretch of the show goes flat (Yozi: "20분짜리니까
      // 지루하면 안좋거든").
      const beat = act.beats !== false && t >= nextBeat;
      if (beat) nextBeat = t + 35 + r() * 15;
      const n = KEEP[kind] ? 1 : beat ? Math.max(5, v1) : r() < vc ? v0 + Math.floor(r() * (v1 - v0 + 1)) : 1; // (never a whole line of rings)
      let n2 = 1;
      if (n > 1) {
        // A volley: n shells at once, evenly along all three barges, in a
        // flat line, a V, an arch or a staircase (climbing to the left or
        // the right), in one colour or two taking turns.
        const span = BARGES.at(-1)[0] - BARGES[0][0] + 50, shape = act.shapes ? act.shapes[Math.floor(r() * act.shapes.length)] : Math.floor(r() * 4), vb = act.vbase || [42], base = kind === 'small' ? 30 : kind !== 'fan' && r() < hi ? 64 : vb[Math.floor(r() * vb.length)];
        const order = act.orders ? act.orders[Math.floor(r() * act.orders.length)] : act.together || r() < 0.55 ? 0 : 1 + Math.floor(r() * 4), up = r() < 0.5;
        for (let i = 0; i < n; i++) {
          const tt = Math.min(late, Math.round((t + sweep(order, i, n)) * 100) / 100);
          const u = BARGES[0][0] - 25 + (span * i) / (n - 1), barge = BARGES.reduce((b, x, j) => (Math.abs(x[0] - u) < Math.abs(BARGES[b][0] - u) ? j : b), 0);
          const m = Math.abs(i / (n - 1) - 0.5) * 2; // 0 in the middle, 1 at the ends
          const h = base + [6, 4 + 16 * m, 20 - 16 * m, 2 + 22 * (up ? i : n - 1 - i) / (n - 1)][shape];
          out.push({ t: tt, barge, du: u - BARGES[barge][0], h, kind, color: i % 2 && kind !== 'pistil' ? color2 : color, color2: i % 2 && kind !== 'pistil' ? color : color2, scale, seed: Math.floor(r() * 1e9) });
        }
      } else {
        // A cluster: one barge fires 1-3 shells together, stacked at
        // different heights and a little apart, each its own colour, so
        // they open over each other like a real festival (Yozi: "한쪽에서
        // 한개만 쏘던 여러개 동시에 쏴도되는거아니야?", with photos).
        const cl = act.cluster || [1], many = cl[Math.floor(r() * cl.length)], barge = Math.floor(r() * BARGES.length), du = (r() - 0.5) * 40;
        for (let i = 0; i < many; i++) {
          let ki = kind, ci = color, c2i = color2;
          if (i > 0) {
            ki = act.kinds[Math.floor(r() * act.kinds.length)];
            if (KEEP[ki] && r() >= KEEP[ki]) ki = 'peony';
            ci = ki === 'willow' || ki === 'kamuro' ? GOLD : act.mono ? mono : pal[Math.floor(r() * pal.length)];
            c2i = ki === 'pistil' ? heart(ci) : ci === GOLD ? ci : act.pure ? pal[Math.floor(r() * pal.length)] : partner(ci, r);
          }
          const low = ki === 'small' ? 28 : act.low ?? 38, high = ki !== 'small' && i === many - 1 && r() < hi; // now and then the top one goes much higher, and bigger
          out.push({
            t: Math.min(late, Math.round((t + i * r() * 0.25) * 100) / 100), barge, du: du + (i ? (r() - 0.5) * 36 : 0),
            h: low + (many > 1 ? (i / (many - 1)) * (act.spread ?? 24) : r() * ((act.spread ?? 24) - 2)) + r() * 5 + (high ? 24 : 0), kind: ki, color: ci, color2: c2i, scale: (i ? 0.85 + r() * 0.3 : scale) * (high ? 1.35 : 1), seed: Math.floor(r() * 1e9),
          });
        }
        n2 = many;
      }
      if (beat || (act.fans && r() < act.fans)) {
        // A row of fans along the barges, all at once, in one warm colour.
        const nf = 5 + Math.floor(r() * 3), fc = FAN_COLORS[Math.floor(r() * FAN_COLORS.length)], span = BARGES.at(-1)[0] - BARGES[0][0] + 30;
        const order = r() < 0.4 ? 0 : 1 + Math.floor(r() * 4);
        for (let i = 0; i < nf; i++) {
          const tt = Math.min(late, Math.round((t + sweep(order, i, nf)) * 100) / 100);
          const u = BARGES[0][0] - 15 + (span * i) / (nf - 1), barge = BARGES.reduce((b, x, j) => (Math.abs(x[0] - u) < Math.abs(BARGES[b][0] - u) ? j : b), 0);
          out.push({ t: tt, barge, du: u - BARGES[barge][0], h: 4, kind: 'fan', color: fc, color2: fc, scale: 0.9 + r() * 0.2, seed: Math.floor(r() * 1e9) });
        }
      }
      const [g0, g1] = act.gap;
      t += (act.ramp ? g0 + (g1 - g0) * k : g0 + (g1 - g0) * r()) * (n > 1 ? 1.6 : 1 + (n2 - 1) * 0.2); // a breath after a volley or a cluster
    }
  }
  out.sort((x, y) => x.t - y.t); // clusters' and sweeps' later shells can come after the next shot
  while (out.at(-1).t >= SHOW_SECONDS) out.pop(); // (a sweep running past the end)
  if (cache.size > 4) cache.clear();
  cache.set(start, out);
  return out;
}
