// The Yeouido fireworks' five patterns (Yozi 2026-11-21: the drone show has
// several, the fireworks had one: "이것도 5개정도 만드는건어때"). One per
// show, in turn, so the same show comes back only every ten days.
//
// Every pattern keeps what the rest of the game counts on (the toasts, the
// photo pause, the sound): 8¾ minutes, gold willows to open, photo time at
// PHOTO_TIME, the finale from FINALE_TIME, a wall of small colours and the
// gold curtain to end. What differs is the five minutes in between, the
// build-up and the finale's colours.
//
// Downloaded with the sparks (fireworks-sky.js), not with the game.
import { ACTS, PHOTO_TIME, GOLD, program } from './fireworks-show.js';

const [OPEN, , , , , , , PHOTO, BUILD, FINALE, WALL, CURTAIN] = ACTS;
const P0 = PHOTO_TIME[0];
// A pattern: its own middle (12 s … photo time), and what its build-up and
// finale change.
const pattern = (middle, build = {}, finale = {}) => [OPEN, ...middle, PHOTO, { ...BUILD, ...build }, { ...FINALE, ...finale }, WALL, CURTAIN];

// B, a gold night: gold and white, willows and palms, slow and grand (the
// long falling trails show best here).
const GOLDS = [GOLD, '#ffffff', '#ffd34d', '#ff9a3c'];
const B = pattern([
  { from: 12, to: 80, gap: [1.1, 1.5], kinds: ['willow', 'peony', 'palm', 'peony'], palette: GOLDS, pure: true, cluster: [2, 3], volley: [0.25, 3, 5], fans: 0.06, low: 36, spread: 22, name: 'gold flowers stacked' },
  { from: 80, to: 160, gap: [0.9, 1.3], kinds: ['kamuro', 'palm', 'dahlia', 'willow', 'peony'], palette: GOLDS, pure: true, cluster: [1, 2, 3], volley: [0.3, 3, 5], fans: 0.05, low: 42, spread: 30, high: 0.25, vbase: [44, 54], name: 'crowns and palms, higher' },
  { from: 160, to: 176, gap: [0.3, 0.5], kinds: ['small'], palette: ['#ffffff', '#ffd34d'], pure: true, cluster: [3, 4, 5], volley: [0.4, 5, 7], name: 'a white and gold crackle' },
  { from: 176, to: 250, gap: [0.8, 1.2], kinds: ['willow', 'kamuro', 'pistil', 'peony', 'palm'], palette: GOLDS, pure: true, cluster: [2, 2, 3], volley: [0.35, 3, 5], fans: 0.06, low: 34, spread: 40, high: 0.3, vbase: [36, 50, 62], name: 'gold rain from every height' },
  { from: 250, to: 285, gap: [0.8, 1.2], kinds: ['kamuro', 'peony'], palette: GOLDS, pure: true, cluster: [2, 3], volley: [1, 5, 7], together: true, fans: 0.35, name: 'highlight: gold from every barge at once' },
  { from: 285, to: P0, gap: [0.7, 1], kinds: ['palm', 'willow', 'dahlia', 'kamuro', 'peony'], palette: GOLDS, pure: true, cluster: [1, 2, 3], volley: [0.3, 3, 5], fans: 0.05, low: 38, spread: 34, high: 0.3, vbase: [40, 56], name: 'palms and willows' },
], { kinds: ['peony', 'willow', 'kamuro', 'palm', 'dahlia', 'pistil', 'small'], palette: GOLDS, pure: true }, { kinds: ['peony', 'palm', 'peony', 'pistil', 'willow', 'peony'], palette: GOLDS, pure: true }); // (few of the long-lived willows here: the sky has only so much room)

// C, a rainbow: the whole sky one colour at a time, red to purple, then
// every colour together.
const RAINBOW = [['#ff4d5e', '#ff7a5c'], ['#ff9a3c', '#ffd34d'], ['#ffd34d', '#ffffff'], ['#7dff6b', '#c8ff5a'], ['#3df0c8', '#4dd2ff'], ['#5b8cff', '#4dd2ff'], ['#b07bff', '#ff7ae0']];
const C_KINDS = [['peony', 'peony', 'pistil'], ['peony', 'dahlia', 'palm'], ['peony', 'spiral', 'double'], ['peony', 'palm', 'ring'], ['peony', 'dahlia', 'spiral'], ['peony', 'pistil', 'double'], ['peony', 'palm', 'dahlia']];
const C_STEP = (270 - 12) / RAINBOW.length;
const C = pattern([
  ...RAINBOW.map((palette, i) => ({
    from: Math.round(12 + i * C_STEP), to: Math.round(12 + (i + 1) * C_STEP), gap: [0.8, 1.2], kinds: C_KINDS[i], palette, pure: true, cluster: [2, 2, 3], volley: [0.3, 3, 5], fans: 0.05,
    low: 34 + i * 2, spread: 24 + i * 2, vbase: [38 + i * 3, 46 + i * 3], name: `the sky in one colour: ${palette[0]}`,
  })),
  { from: 270, to: P0, gap: [0.6, 0.9], kinds: ['rainbow', 'rainbow', 'peony', 'spiral', 'palm'], cluster: [2, 3], volley: [0.5, 5, 7], fans: 0.2, low: 34, spread: 40, high: 0.35, vbase: [36, 50, 62], name: 'every colour together' },
], {}, { kinds: ['rainbow', 'peony', 'rainbow', 'palm', 'pistil', 'peony'] });

// D, waves: volleys sweeping along the river and climbing like stairs, the
// whole show rising from low over the water to very high.
const SEA = ['#4dd2ff', '#5b8cff', '#3df0c8', '#ffffff', '#b07bff'];
const D = pattern([
  { from: 12, to: 75, gap: [0.9, 1.2], kinds: ['peony', 'pistil', 'peony'], palette: SEA, cluster: [1, 2], volley: [0.7, 5, 7], orders: [1, 2], shapes: [0, 3], fans: 0.1, low: 30, spread: 14, high: 0, vbase: [30, 34], name: 'low waves, left to right and back' },
  { from: 75, to: 140, gap: [0.8, 1.1], kinds: ['peony', 'dahlia', 'palm', 'peony'], palette: SEA, cluster: [1, 2], volley: [0.7, 5, 7], orders: [3, 4], shapes: [1, 2], fans: 0.08, low: 38, spread: 18, high: 0.05, vbase: [40, 46], name: 'waves from the middle out and back in' },
  { from: 140, to: 156, gap: [0.3, 0.45], kinds: ['small'], cluster: [3, 4], volley: [0.6, 7, 9], orders: [1, 2], name: 'spray: small ones running along the river' },
  { from: 156, to: 225, gap: [0.8, 1.1], kinds: ['peony', 'spiral', 'pistil', 'palm'], cluster: [1, 2, 3], volley: [0.7, 5, 7], orders: [1, 2, 3, 4], shapes: [3], fans: 0.08, low: 44, spread: 24, high: 0.15, vbase: [48, 56], name: 'staircases, higher' },
  { from: 225, to: 260, gap: [0.8, 1.1], kinds: ['peony', 'rainbow', 'double'], cluster: [2, 3], volley: [1, 7, 9], orders: [1, 2], shapes: [3], fans: 0.35, vbase: [50, 60], name: 'highlight: tall staircases one after another' },
  { from: 260, to: P0, gap: [0.7, 1], kinds: ['peony', 'kamuro', 'dahlia', 'palm', 'rainbow'], cluster: [2, 3], volley: [0.6, 5, 9], orders: [1, 2, 3, 4], fans: 0.08, low: 40, spread: 40, high: 0.4, vbase: [52, 64], name: 'the highest waves' },
], { orders: [1, 2, 3, 4] }, { volley: [0.7, 5, 9], orders: [0, 1, 2, 3, 4] });

// E, rhythm: a rush of small ones, then one big shell alone in a quiet
// sky, again and again, the rushes getting longer.
const rush = (from, to, palette) => ({ from, to, gap: [0.2, 0.35], kinds: ['small'], palette, pure: !!palette, cluster: [3, 4, 5], volley: [0.5, 5, 9], fans: 0.1, name: 'a rush of small ones' });
const rest = (from, to, kinds) => ({ from, to, gap: [1.5, 1.9], kinds, cluster: [1], beats: false, big: true, low: 62, spread: 12, high: 0.5, name: 'one big shell at a time' });
const mix = (from, to) => ({ from, to, gap: [0.7, 1], kinds: ['peony', 'pistil', 'dahlia', 'spiral', 'peony'], cluster: [2, 3], volley: [0.3, 3, 5], fans: 0.05, low: 36, spread: 30, high: 0.2, name: 'flowers' });
const E = pattern([
  mix(12, 50), rush(50, 60, ['#ff4d5e', '#ffd34d']), rest(60, 74, ['peony']),
  mix(74, 110), rush(110, 122, ['#4dd2ff', '#b07bff']), rest(122, 136, ['dahlia', 'kamuro']),
  mix(136, 170), rush(170, 184, ['#7dff6b', '#3df0c8']), rest(184, 198, ['pistil', 'peony']),
  mix(198, 232), rush(232, 250), rest(250, 264, ['kamuro', 'palm']),
  { from: 264, to: 296, gap: [0.8, 1.1], kinds: ['small', 'peony', 'rainbow'], cluster: [2, 3], volley: [1, 5, 7], together: true, fans: 0.35, name: 'highlight: every barge at once' },
  rush(296, 314), rest(314, P0, ['kamuro', 'willow']),
], { gap: [0.9, 0.25] }, {});

// name: what the pattern is called (for the notes and the tests).
export const PATTERNS = [
  { name: 'festival', acts: ACTS }, { name: 'gold night', acts: B }, { name: 'rainbow', acts: C }, { name: 'waves', acts: D }, { name: 'rhythm', acts: E },
];
// Which pattern a show has: the regular shows are two days apart (23:10
// KST), so each takes the next one; 2026-11-21's is the first. An extra
// show the operator starts (/불꽃놀이) lands in the same two days as the
// regular one before it, and so repeats its pattern.
const TWO_DAYS = 48 * 3600e3, FIRST = Date.UTC(2026, 10, 20, 15); // 2026-11-21 0:00 KST
export const patternOf = (start) => (((Math.floor((start - FIRST) / TWO_DAYS) % PATTERNS.length) + PATTERNS.length) % PATTERNS.length);
export const programOf = (start) => program(start, PATTERNS[patternOf(start)].acts);
