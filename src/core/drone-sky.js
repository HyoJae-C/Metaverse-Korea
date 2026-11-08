// The drones of the Ttukseom drone light show (drone-show.js has the
// schedule). Downloaded only when you're in Ttukseom park near show time.
//
// All the drones are one Points object (one draw call). Each frame every
// drone is moved from where the last picture left it towards its spot in
// the current one; pictures are words (drawn on a hidden canvas and sampled,
// so no font or picture files) or line drawings (point lists below).
// Everything follows the show's clock, so someone who walks in late sees
// the same picture as everyone else.
import * as THREE from 'three';
// The schedule and places (drone-show.js) are handed in by the park instead
// of imported, so this file pulls in nothing the game hasn't loaded already
// (an import here would split drone-show.js out of the main download).
let SKY, BARGE, SHOW_SECONDS, nextDroneShow, showNumber;
export function useShow(show) { ({ SKY, BARGE, SHOW_SECONDS, nextDroneShow, showNumber } = show); }

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => { const k = clamp01(x); return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2; };
const RGB = new Map(); // (colours are looked up per drone per frame: no garbage)
const rgb = (c) => { let v = RGB.get(c); if (!v) { const k = new THREE.Color(c); RGB.set(c, (v = [k.r, k.g, k.b])); } return v; };

// ---- pictures -------------------------------------------------------------
// A picture: pts = [[u, v, part, w]] in metres on the sky plane (u right,
// v up, w towards you), sorted left to right so drone i always takes the
// i-th spot from the left (the moves between pictures stay tidy).
// Options: color (hex, [left, right] gradient, or fn(u, v, t, part)),
// parts (the time each part lights up), move(p, t) for moving pictures.

const byU = (a, b) => a[0] - b[0] || a[1] - b[1];

// Even points along line drawings: polys = [[[u, v], …], …] (closed: true
// on a poly joins its ends). parts: the part number of each poly.
function along(polys, n) {
  const segs = [];
  let total = 0;
  polys.forEach((poly) => {
    const p = poly.pts || poly;
    const loop = poly.closed ? [...p, p[0]] : p;
    for (let i = 1; i < loop.length; i++) {
      const [a, b] = [loop[i - 1], loop[i]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len > 0) { segs.push({ a, b, len, part: poly.part || 0, at: total }); total += len; }
    }
  });
  const out = [];
  let s = 0;
  for (let k = 0; k < n; k++) {
    const d = ((k + 0.5) / n) * total;
    while (s < segs.length - 1 && segs[s].at + segs[s].len < d) s++;
    const g = segs[s], f = (d - g.at) / g.len;
    out.push([g.a[0] + (g.b[0] - g.a[0]) * f, g.a[1] + (g.b[1] - g.a[1]) * f, g.part, 0]);
  }
  return out;
}
const arc = (cx, cy, rx, ry, a0, a1, steps = 32) => Array.from({ length: steps + 1 }, (_, i) => {
  const a = a0 + ((a1 - a0) * i) / steps;
  return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
});
const ring = (cx, cy, r, steps = 24) => ({ pts: arc(cx, cy, r, r, 0, TAU, steps).slice(0, -1), closed: true });
const heartPts = (s, cx = 0, cy = 0, steps = 64) => Array.from({ length: steps }, (_, i) => {
  const t = (i / steps) * TAU;
  return [cx + 16 * Math.sin(t) ** 3 * s, cy + (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s];
});
const wavy = (x0, x1, y, amp, waves, steps = 40) => Array.from({ length: steps + 1 }, (_, i) => {
  const x = x0 + ((x1 - x0) * i) / steps;
  return [x, y + Math.sin((i / steps) * waves * TAU) * amp];
});

const SHAPES = {
  heart: () => [{ pts: heartPts(0.55, 0, 1), closed: true }],
  frame: () => [{ pts: heartPts(0.68, 0, 1.7, 96), closed: true }, { pts: heartPts(0.6, 0, 1.7, 96), closed: true }],
  // a hapjukseon folding fan, as in the fan dance
  fan: () => {
    const c = [0, -8], a0 = 0.32, a1 = Math.PI - 0.32;
    const polys = [{ pts: arc(c[0], c[1], 14, 14, a0, a1, 40) }, { pts: arc(c[0], c[1], 10, 10, a0, a1, 30) }, { pts: arc(c[0], c[1], 2.5, 2.5, a0, a1, 8) }];
    for (let k = 0; k <= 8; k++) {
      const a = a0 + ((a1 - a0) * k) / 8;
      polys.push([[c[0] + Math.cos(a) * 2.5, c[1] + Math.sin(a) * 2.5], [c[0] + Math.cos(a) * 14, c[1] + Math.sin(a) * 14]]);
    }
    return polys;
  },
  // N Seoul Tower on Namsan
  tower: () => [
    [[-13, -9], [-8, -7], [-3, -6.2], [0, -6], [3, -6.2], [8, -7], [13, -9]],
    [[-1, -6], [-0.6, 3]], [[1, -6], [0.6, 3]],
    { pts: [[-2.2, 3], [-3, 4.2], [-2.6, 5.6], [2.6, 5.6], [3, 4.2], [2.2, 3]], closed: true },
    [[0, 5.6], [0, 10]], [[-1, 7.5], [1, 7.5]],
  ],
  // a palace hall: the curved tiled roof with upturned eaves, pillars, steps
  palace: () => [
    [[-13.5, 4.6], [-11, 3.2], [-6, 2.6], [6, 2.6], [11, 3.2], [13.5, 4.6]],
    [[-13.5, 4.6], [-7.5, 8]], [[13.5, 4.6], [7.5, 8]],
    [[-8.6, 8.8], [-7.5, 8], [7.5, 8], [8.6, 8.8]],
    [[-8, 2.6], [-8, -5.5]], [[-3, 2.6], [-3, -5.5]], [[3, 2.6], [3, -5.5]], [[8, 2.6], [8, -5.5]],
    [[-11, -5.5], [11, -5.5]], [[-12.5, -7.5], [12.5, -7.5]],
  ],
  // someone waving hello (part 1: the waving forearm)
  waver: () => [
    ring(0, 5.5, 2, 20),
    [[0, 3.5], [0, -3]], [[0, -3], [-2.6, -9.5]], [[0, -3], [2.6, -9.5]],
    [[0, 2], [-3.5, -2.5]], [[0, 2], [3.5, 3]],
    { pts: [[3.5, 3], [5, 7.5]], part: 1 },
  ],
  // the blue whale, Ttukseom's legendary fish (swims across: see move)
  whale: () => [
    { pts: [[10, 0], [8.5, 2], [4, 3], [-4, 2.4], [-9, 1], [-12, 0.5], [-15, 3.2], [-13.6, 0], [-15, -2.8], [-12, -0.5], [-6, -2.2], [2, -3], [8, -2.2]], closed: true },
    ring(7, 0.5, 0.45, 6),
    [[3, -2.6], [0.6, -5.4], [-0.4, -2.9]],
    { pts: [[6, 3.2], [6, 6]], part: 1 }, { pts: [[6, 5], [4.5, 7]], part: 1 }, { pts: [[6, 5], [7.5, 7]], part: 1 },
  ],
  // a duck boat (오리배) on little waves (part 1: the waves)
  duck: () => [
    [[-9, -1], [-8, -4], [6, -4], [9, -1], [-9, -1]],
    [[4, -1], [5, 4]], ring(6.3, 5.6, 2, 18), { pts: [[8.2, 6.2], [10.8, 5.6], [8.2, 5]], closed: true },
    [[-8.5, 5.2], [2, 5.2]], [[-7.5, -1], [-7.5, 5.2]], [[1, -1], [1, 5.2]],
    { pts: wavy(-13, 13, -6.5, 0.6, 4), part: 1 },
  ],
  // a bowl of Han River ramyeon with chopsticks and steam (part 1: steam)
  ramen: () => [
    arc(0, -1, 9, 7, Math.PI, TAU, 36), { pts: arc(0, -1, 9, 1.6, 0, TAU, 40).slice(0, -1), closed: true },
    [[-3, -8], [3, -8]], [[2, -0.5], [10, 8.5]], [[4, -0.5], [11.6, 7.4]],
    ...[-4, -0.5, 3].map((x) => ({ pts: Array.from({ length: 12 }, (_, i) => [x + Math.sin(i * 0.9) * 0.7, 1.2 + i * 0.7]), part: 1 })),
  ],
  star: () => [{ pts: Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4 : 10;
    return [Math.cos(a) * r, Math.sin(a) * r - 0.5];
  }), closed: true }],
  moon: () => { // a crescent, opening to the right
    const R = 9, d = 4, r = 7.4;
    const x = (d * d + R * R - r * r) / (2 * d), y = Math.sqrt(R * R - x * x);
    const a1 = Math.atan2(y, x), a2 = Math.atan2(y, x - d);
    return [{ pts: [...arc(0, 0, R, R, a1, TAU - a1, 40), ...arc(d, 0, r, r, -a2, -TAU + a2, 32)], closed: true }];
  },
  clover: () => {
    const polys = [];
    for (let k = 0; k < 4; k++) {
      const rot = Math.PI / 4 + (k * Math.PI) / 2 - Math.PI / 2;
      polys.push({ pts: heartPts(0.24, 0, 17 * 0.24, 40).map(([x, y]) => [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot) + 1.5]), closed: true });
    }
    polys.push([[0, 1.5], [0.8, -3], [2.6, -8]]);
    return polys;
  },
};

// ---- words ----------------------------------------------------------------
// lines: ['ANOTHER', 'SEOUL'], or a line as segments (['K', ' O', …]) when
// they light up one by one (each segment is a part).
let canvas = null, ctx = null;
const CW = 512, CH = 256; // the canvas is the sky plane's 28 m × 14 m
const FONT = (px) => `900 ${px}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif`;
function wordPts(lines, n) {
  if (typeof document === 'undefined') return [];
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }
  const rows = lines.map((l) => (Array.isArray(l) ? l : [l]));
  let px = Math.floor((CH * 0.84) / rows.length);
  ctx.font = FONT(px);
  const widest = Math.max(...rows.map((segs) => ctx.measureText(segs.join('')).width));
  if (widest > CW * 0.94) { px = Math.floor((px * CW * 0.94) / widest); ctx.font = FONT(px); }
  const lineH = px * 1.1, top = CH / 2 - (lineH * (rows.length - 1)) / 2;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
  const ink = [];
  let part = 0;
  rows.forEach((segs, li) => {
    let x = CW / 2 - ctx.measureText(segs.join('')).width / 2;
    for (const s of segs) {
      ctx.clearRect(0, 0, CW, CH);
      ctx.fillText(s, x, top + li * lineH);
      const d = ctx.getImageData(0, 0, CW, CH).data;
      for (let y = 0; y < CH; y += 2) for (let xx = 0; xx < CW; xx += 2) if (d[(y * CW + xx) * 4 + 3] > 128) ink.push([xx, y, part]);
      x += ctx.measureText(s).width;
      part++;
    }
  });
  // Thin the ink to about n spots on an even grid.
  const step = Math.max(2, 2 * Math.sqrt(ink.length / n));
  const taken = new Set(), out = [];
  for (const [x, y, p] of ink) {
    const key = Math.floor(x / step) + ',' + Math.floor(y / step);
    if (taken.has(key)) continue;
    taken.add(key);
    out.push([((x - CW / 2) / CW) * 28, ((CH / 2 - y) / CH) * 14, p, 0]);
  }
  if (out.length <= n) return out;
  return Array.from({ length: n }, (_, k) => out[Math.floor((k * out.length) / n)]);
}

// A picture from points: sorted, with the centre of each part.
function picture(pts, opts = {}) {
  pts.sort(byU);
  const centers = [];
  for (const [u, v, p] of pts) { const c = (centers[p] ||= [0, 0, 0]); c[0] += u; c[1] += v; c[2]++; }
  for (const c of centers) if (c) { c[0] /= c[2]; c[1] /= c[2]; }
  return { pts, centers, ...opts };
}

// ---- the program -----------------------------------------------------------
// Each step: at (seconds from the start), what to draw, how long the move
// from the last picture takes (morph), and optional stagger (later drones
// start their move later: lift-off and landing).
const PINK = '#ff5ca8', GOLD = '#ffd166', SKYBLUE = '#7fd4ff', WHITE = '#ffffff', MINT = '#7cf2c4', VIOLET = '#b48cff', RED = '#ff5a5a';

// The third act changes from show to show (the same for everyone).
const ACT3 = [
  [['우리'], ['함께'], ['지금', '여기']],
  [['고마워'], ['보고 싶었어'], ['다시 와 줘서']],
  [['우리'], ['같이'], ['걸을까?']],
];

const beat = (period) => (p, t, f) => { // part 1 (the ♡) beats like a heart
  if (p[2] !== 1) return;
  const c = f.centers[1], k = 1 + 0.16 * Math.max(0, Math.sin((t / period) * TAU)) ** 4;
  p[0] = c[0] + (p[0] - c[0]) * k; p[1] = c[1] + (p[1] - c[1]) * k;
};

export function program(start) {
  const act3 = ACT3[((showNumber(start) % ACT3.length) + ACT3.length) % ACT3.length];
  const next = new Date(nextDroneShow(start + 1000));
  let nextText = '';
  try { nextText = next.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { nextText = `${next.getHours()}:${String(next.getMinutes()).padStart(2, '0')}`; }
  const W = (lines, opts) => ({ lines, ...opts });
  const S = (shape, opts) => ({ shape, ...opts });
  const steps = [
    { at: -180, hover: true, morph: 70, stagger: 60 }, // lift-off from the barge
    ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((k, i) => ({ at: -10 + i, ...W([String(k)], { color: k <= 3 ? GOLD : WHITE }), morph: 0.5 })),
    // Opening (Yozi)
    { at: 0, ...W(['ANOTHER', 'SEOUL'], { color: [SKYBLUE, PINK] }), morph: 2.5 },
    { at: 40, ...W(['어 나 더', '서 울'], { color: [PINK, GOLD] }), morph: 3 },
    { at: 80, ...W([['K', ' O', ' R', ' E', ' A']], { color: WHITE, parts: [0, 1.2, 2.4, 3.6, 4.8] }), morph: 3 },
    // Act 1: Seoul
    { at: 120, ...S('fan', { color: [RED, PINK] }), morph: 4 },
    { at: 160, ...S('tower', { color: [SKYBLUE, WHITE] }), morph: 4 },
    { at: 205, ...S('palace', { color: [GOLD, RED] }), morph: 4 },
    { at: 250, ...W(['안녕'], { color: GOLD }), morph: 3 },
    { at: 275, ...W(['안녕하세요'], { color: [GOLD, PINK] }), morph: 3 },
    { at: 300, ...S('waver', { color: MINT, move: (p, t) => { if (p[2] !== 1) return; const a = Math.sin(t * 4) * 0.55, dx = p[0] - 3.5, dy = p[1] - 3; p[0] = 3.5 + dx * Math.cos(a) - dy * Math.sin(a); p[1] = 3 + dx * Math.sin(a) + dy * Math.cos(a); } }), morph: 4 },
    // Act 2: a Ttukseom night
    { at: 340, ...S('whale', { color: [SKYBLUE, '#3d7bff'], move: (p, t) => {
      const k = t / 70;
      p[1] += Math.sin(t * 1.4 + p[0] * 0.25) * 0.5 + (p[0] < -11 ? Math.sin(t * 2.6) * (-11 - p[0]) * 0.35 : 0);
      if (p[2] === 1) p[1] += (Math.sin(t * 3) * 0.5 + 0.5) * 1.5; // the spout
      p[0] = p[0] * 0.9 - 18 + k * 36;
    } }), morph: 5 },
    { at: 410, ...W(['뚝섬의', '전설'], { color: [SKYBLUE, WHITE] }), morph: 4 },
    { at: 440, ...S('duck', { color: (u, v, t, part) => (part === 1 ? rgb(SKYBLUE) : v > 3 && u > 3 ? rgb(GOLD) : rgb(WHITE)), move: (p, t) => { if (p[2] === 1) p[1] += Math.sin(t * 2 + p[0] * 0.5) * 0.4; else p[1] += Math.sin(t * 1.5) * 0.3; } }), morph: 4 },
    { at: 470, ...S('ramen', { color: (u, v, t, part) => rgb(part === 1 ? WHITE : v > -0.5 && u > 1.5 ? GOLD : RED), move: (p, t) => { if (p[2] === 1) p[0] += Math.sin(p[1] * 1.1 - t * 2.5) * 0.5; } }), morph: 4 },
    // (Yozi)
    { at: 500, ...W(['라면'], { color: [RED, GOLD] }), morph: 3 },
    { at: 520, ...W(['먹고갈래?'], { color: [GOLD, PINK] }), morph: 3 },
    { at: 540, ...W(['뚝섬에서'], { color: [PINK, SKYBLUE] }), morph: 3 },
    // Love (Yozi)
    { at: 570, ...W(['사 랑'], { color: PINK }), morph: 3 },
    { at: 595, ...W(['행 복'], { color: GOLD }), morph: 3 },
    { at: 620, ...W([['그리고', ' .', ' .', ' .']], { color: WHITE, parts: [0, 4, 8, 12] }), morph: 3 },
    { at: 650, ...W([['너 ', '♡']], { color: (u, v, t, part) => rgb(part === 1 ? RED : PINK), move: beat(0.85) }), morph: 3 },
    // Photo time: 하나, 둘, 셋, 김치~ then the heart frame holds still
    { at: 690, ...W(['하나'], { color: WHITE }), morph: 1.2 },
    { at: 693, ...W(['둘'], { color: WHITE }), morph: 1 },
    { at: 696, ...W(['셋'], { color: WHITE }), morph: 1 },
    { at: 699, ...W(['김치~'], { color: GOLD }), morph: 1.2 },
    { at: 705, ...S('frame', { color: [PINK, RED] }), morph: 3, photo: true },
    // Act 3: changes from show to show
    { at: 750, ...W(act3[0], { color: MINT }), morph: 3 },
    { at: 775, ...W(act3[1], { color: [MINT, SKYBLUE] }), morph: 3 },
    { at: 800, ...W(act3[2], { color: [SKYBLUE, VIOLET] }), morph: 3 },
    { at: 830, wave: true, morph: 5 },
    { at: 890, ...S('star', { color: GOLD, move: (p, t) => { const a = t * 0.3; const x = p[0]; p[0] = x * Math.cos(a); p[3] = x * Math.sin(a); } }), morph: 4 },
    { at: 910, ...W(['별'], { color: GOLD }), morph: 3 },
    { at: 925, ...S('moon', { color: ['#fff3c4', GOLD] }), morph: 4 },
    { at: 945, ...W(['달'], { color: '#fff3c4' }), morph: 3 },
    { at: 960, ...W(['꿈'], { color: [VIOLET, PINK] }), morph: 3 },
    { at: 980, ...S('clover', { color: MINT }), morph: 4 },
    { at: 1005, ...W(['행운'], { color: [MINT, GOLD] }), morph: 3 },
    { at: 1025, ...W(['오늘 하루도', '수고했어'], { color: [GOLD, PINK] }), morph: 4 },
    // Finale
    { at: 1065, burst: true, morph: 8 },
    { at: 1110, ...W(['또 만나'], { color: [PINK, GOLD] }), morph: 5 },
    { at: 1135, ...W(['SEE YOU', 'AGAIN'], { color: [SKYBLUE, PINK] }), morph: 3 },
    { at: 1160, ...W(['NEXT SHOW', nextText], { color: [GOLD, WHITE] }), morph: 3 },
    { at: SHOW_SECONDS, land: true, morph: 45, stagger: 15 },
  ];
  return steps;
}

// When the photo pause is (for the "Photo time" notice): [from, to] seconds.
export const PHOTO_TIME = [705, 750];

// ---- the drones -------------------------------------------------------------
// count: how many drones (fewer on phones). scene: the park room's scene.
export function createDroneSky(scene, { count = 600 } = {}) {
  const n = count;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(SKY.x, SKY.y, SKY.z), 60);
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  const g = dot.getContext('2d'), grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
  const mat = new THREE.PointsMaterial({ size: 0.8, map: new THREE.CanvasTexture(dot), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);

  // Where each drone waits on the barge (a grid on the deck).
  const cols = Math.ceil(Math.sqrt(n * (BARGE.w / BARGE.d)));
  const rows = Math.ceil(n / cols);
  const parked = Array.from({ length: n }, (_, i) => [
    BARGE.x - SKY.x + ((i % cols) / Math.max(1, cols - 1) - 0.5) * (BARGE.w - 1),
    BARGE.deck + 0.15 - SKY.y,
    0, BARGE.z - SKY.z + (Math.floor(i / cols) / Math.max(1, rows - 1) - 0.5) * (BARGE.d - 1),
  ]);
  // hover grid over the water before the show; the light-stick wave
  const grid = (w, h, v0) => Array.from({ length: n }, (_, i) => {
    const gc = Math.ceil(Math.sqrt(n * (w / h))), gr = Math.ceil(n / gc);
    return [((i % gc) / Math.max(1, gc - 1) - 0.5) * w, v0 + (Math.floor(i / gc) / Math.max(1, gr - 1) - 0.5) * h, 0, 0];
  });
  // directions for the finale's burst
  const sphere = Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });

  let steps = null, showStart = null;
  const cache = new Map();
  // The picture of a step: { pts, centers, color, parts, move, alpha? }.
  function pictureOf(k) {
    if (cache.has(k)) return cache.get(k);
    const s = steps[k];
    let f;
    if (s.hover) f = { pts: grid(24, 8, -6), color: WHITE, hover: true };
    else if (s.land) f = { pts: parked, color: WHITE, dim: true };
    else if (s.wave) f = { pts: grid(30, 6, 0), wave: true };
    else if (s.burst) f = { pts: sphere.map(() => [0, 1, 0, 0]), burst: true };
    else if (s.shape) f = picture(along(SHAPES[s.shape](), n), s);
    else f = picture(wordPts(s.lines, n), s);
    if (!f.centers) f.centers = [];
    cache.set(k, f);
    return f;
  }
  const colorOf = (f, u, v, t, part) => {
    const c = f.color;
    if (typeof c === 'function') return c(u, v, t, part);
    if (Array.isArray(c)) { const a = rgb(c[0]), b = rgb(c[1]), k = clamp01((u + 14) / 28); mix[0] = a[0] + (b[0] - a[0]) * k; mix[1] = a[1] + (b[1] - a[1]) * k; mix[2] = a[2] + (b[2] - a[2]) * k; return mix; }
    return rgb(c || WHITE);
  };
  const hsl = new THREE.Color(), mix = [0, 0, 0], hc = [0, 0, 0];
  // Drone i's spot, colour and brightness in picture f, t seconds into it.
  const tmp = [0, 0, 0, 0];
  function spot(f, i, t, out) {
    const m = f.pts.length;
    if (!m) { out.set(parked[i], [1, 1, 1], 0); return; }
    const j = Math.min(m - 1, Math.floor((i * m) / n));
    const first = i === 0 || Math.floor(((i - 1) * m) / n) !== j || m >= n; // extra drones on one spot stay dark
    const p = f.pts[j];
    tmp[0] = p[0]; tmp[1] = p[1]; tmp[2] = p[2] || 0; tmp[3] = p[3] || 0;
    let a = first ? 1 : 0;
    let c;
    if (f.hover) { tmp[1] += Math.sin(t * 0.8 + tmp[0] * 0.3) * 0.4; c = rgb(WHITE); }
    else if (f.wave) {
      tmp[1] += Math.sin(tmp[0] * 0.32 - t * 2.2) * 3 * Math.min(1, t / 6);
      hsl.setHSL((tmp[0] / 30 + t * 0.05) % 1, 0.9, 0.62); hc[0] = hsl.r; hc[1] = hsl.g; hc[2] = hsl.b; c = hc;
    } else if (f.burst) {
      const d = sphere[i], r = t < 10 ? 0 : 15 * (1 - (1 - clamp01((t - 10) / 4)) ** 3);
      tmp[0] = d[0] * r; tmp[1] = 1 + d[1] * r - Math.max(0, t - 18) * 0.25; tmp[3] = d[2] * r * 0.5;
      hsl.setHSL((i / n + t * 0.03) % 1, 0.85, t < 10 ? 0.9 : 0.6); hc[0] = hsl.r; hc[1] = hsl.g; hc[2] = hsl.b; c = hc;
      if (t < 10) a *= 0.6 + 0.4 * Math.sin(t * 6);
    } else {
      if (f.parts) a *= clamp01((t - (f.parts[tmp[2]] ?? 0)) / 0.5);
      if (f.move) f.move(tmp, t, f);
      c = colorOf(f, p[0], p[1], t, tmp[2]);
    }
    if (f.dim) a *= 0.35;
    out.set(tmp, c, a);
  }
  const mk = () => ({ u: new Float32Array(n), v: new Float32Array(n), w: new Float32Array(n), r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n), a: new Float32Array(n) });
  const from = mk();
  let fromStep = -2;
  const one = { set(p, c, a) { this.p = p; this.c = c; this.a = a; } };
  // Take a snapshot of every drone at the end of step k-1 (where step k's move starts).
  function snapshot(k) {
    fromStep = k;
    for (let i = 0; i < n; i++) {
      if (k === 0) one.set(parked[i], rgb(WHITE), 0.35);
      else spot(pictureOf(k - 1), i, steps[k].at - steps[k - 1].at, one);
      from.u[i] = one.p[0]; from.v[i] = one.p[1]; from.w[i] = one.p[3] || 0;
      from.r[i] = one.c[0]; from.g[i] = one.c[1]; from.b[i] = one.c[2]; from.a[i] = one.a;
    }
  }

  return {
    points,
    // start: the show's start (ms), t: seconds from it, night: 0–1 (park.js).
    update(start, t, night) {
      points.visible = night > 0.02;
      if (!points.visible) return;
      if (start !== showStart) { showStart = start; steps = program(start); cache.clear(); fromStep = -2; }
      let k = -1;
      for (let s = 0; s < steps.length && steps[s].at <= t; s++) k = s;
      if (k < 0) { // still on the barge
        for (let i = 0; i < n; i++) { const q = parked[i]; pos.set([SKY.x + q[0], SKY.y + q[1], SKY.z + q[3]], i * 3); col.set([0.3 * night, 0.3 * night, 0.3 * night], i * 3); }
      } else {
        if (fromStep !== k) snapshot(k);
        const s = steps[k], f = pictureOf(k), lt = t - s.at, now = performance.now() / 1000;
        // Wider screens see more sky to the sides: draw bigger there (the
        // bottom stays put, above the bridge). An upright phone: as designed.
        const aspect = typeof innerWidth === 'number' && innerHeight ? innerWidth / innerHeight : 1;
        const big = Math.min(1.4, Math.max(1, aspect / 0.9)), base = SKY.y - SKY.h / 2;
        for (let i = 0; i < n; i++) {
          spot(f, i, lt, one);
          const delay = s.stagger ? (i / n) * s.stagger : 0;
          const m = ease((lt - delay) / s.morph);
          const u = from.u[i] + (one.p[0] - from.u[i]) * m, v = from.v[i] + (one.p[1] - from.v[i]) * m, w = from.w[i] + ((one.p[3] || 0) - from.w[i]) * m;
          const a = (from.a[i] + (one.a - from.a[i]) * m) * night * (0.85 + 0.15 * Math.sin(now * 7 + i * 1.7));
          const sk = v < -SKY.h / 2 + 1 ? 1 : big; // (on the barge: real size)
          pos[i * 3] = SKY.x + u * sk; pos[i * 3 + 1] = sk === 1 ? SKY.y + v : base + (v + SKY.h / 2) * sk; pos[i * 3 + 2] = SKY.z + w * sk;
          col[i * 3] = (from.r[i] + (one.c[0] - from.r[i]) * m) * a;
          col[i * 3 + 1] = (from.g[i] + (one.c[1] - from.g[i]) * m) * a;
          col[i * 3 + 2] = (from.b[i] + (one.c[2] - from.b[i]) * m) * a;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
    dispose() { scene.remove(points); geo.dispose(); mat.map.dispose(); mat.dispose(); },
    // How many drones are lit now (tests).
    lit() { let k = 0; if (points.visible) for (let i = 0; i < n; i++) if (col[i * 3] + col[i * 3 + 1] + col[i * 3 + 2] > 0.15) k++; return k; },
  };
}

// For tests: the line drawings, sampled.
export const shapePoints = (name, n) => along(SHAPES[name](), n);
export const SHAPE_NAMES = Object.keys(SHAPES);

// ---- people already watching ------------------------------------------------
// During a show a few people sit on picnic mats at the back of the lawn and
// stand at the railing, so the park never looks empty (away from the
// entrance and the paths). Park-room positions.
const MATS = [{ x: -8.6, z: 8.2, color: '#3f7fd0' }, { x: 9.4, z: 6.4, color: '#e8708f' }];
const RAIL = [[-14.5, -2.5], [14.8, -2.4]];
// (createCharacter and randomLook come from the park, so this file pulls in
// nothing the game hasn't loaded already.)
export function createWatchers(scene, { createCharacter, randomLook }) {
  const group = new THREE.Group();
  const people = [];
  for (const m of MATS) {
    const mat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 2), new THREE.MeshLambertMaterial({ color: m.color }));
    mat.position.set(m.x, 0.02, m.z);
    group.add(mat);
    for (const dx of [-0.8, 0, 0.8]) {
      const ch = createCharacter(randomLook());
      ch.activity('matsit');
      ch.root.position.set(m.x + dx, 0.12, m.z + 0.2);
      ch.root.rotation.y = Math.PI + dx * 0.15; // facing the river
      group.add(ch.root);
      people.push({ ch, sit: true });
    }
  }
  for (const [x, z] of RAIL) {
    const ch = createCharacter(randomLook());
    ch.root.position.set(x, 0, z);
    ch.root.rotation.y = Math.PI;
    group.add(ch.root);
    people.push({ ch, sit: false });
  }
  group.visible = false;
  scene.add(group);
  return {
    update(dt, night) {
      group.visible = night > 0.4;
      if (group.visible) for (const p of people) p.ch.animate(dt, 0, p.sit);
    },
  };
}
