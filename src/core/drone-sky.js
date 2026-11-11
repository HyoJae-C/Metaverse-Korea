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
import { paintPicture, coasterY, PICTURE_NAMES } from './drone-pictures.js';
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
// A picture: pts = [[u, v, part, w, rgb?]] in metres on the sky plane (u
// right, v up, w towards you), sorted left to right so drone i always takes
// the i-th spot from the left (the moves between pictures stay tidy).
// Options: color (hex, [left, right] gradient, or fn(u, v, t, part); painted
// pictures carry their own colours), parts (the time each part lights up),
// move(p, t, f) for moving pictures (it may return a brightness, 0–1).
// The painted pictures (fans, towers, the whale …) are in drone-pictures.js.

const byU = (a, b) => a[0] - b[0] || a[1] - b[1];

// ---- words ----------------------------------------------------------------
// lines: ['MODU', 'SEOUL'], or a line as segments (['K', ' O', …]) when
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

// The last hello, one per show in turn (Yozi 2026-11-12): the game's other
// languages. (Korean, English, Japanese and Chinese come every show; 你好
// reads the same in Taiwan and Hong Kong.) The turn starts with French at
// the show of 2026-11-12 08:10 KST (number FIRST_HELLO_SHOW): the night
// before had Spanish.
const HELLOS = ['BONJOUR', 'สวัสดี', 'XIN CHÀO', 'HALO', 'नमस्ते', 'مرحبا', 'HOLA'];
const FIRST_HELLO_SHOW = 83075;
export const helloOf = (start) => { const k = (showNumber(start) - FIRST_HELLO_SHOW) % HELLOS.length; return HELLOS[(k + HELLOS.length) % HELLOS.length]; };

const beat = (period) => (p, t, f) => { // part 1 (the ♡) beats like a heart
  if (p[2] !== 1) return;
  const c = f.centers[1], k = 1 + 0.16 * Math.max(0, Math.sin((t / period) * TAU)) ** 4;
  p[0] = c[0] + (p[0] - c[0]) * k; p[1] = c[1] + (p[1] - c[1]) * k;
};

// Turn point p around (cx, cy) by angle a.
const turn = (p, cx, cy, a) => {
  const dx = p[0] - cx, dy = p[1] - cy, c = Math.cos(a), s = Math.sin(a);
  p[0] = cx + dx * c - dy * s; p[1] = cy + dx * s + dy * c;
};
const twinkle = (p, t) => 0.6 + 0.4 * Math.sin(t * 3 + p[0] * 1.7 + p[1]);
// The moving parts of the painted pictures (drone-pictures.js has the parts).
const MOVES = {
  fan: (p, t) => (p[2] === 1 ? twinkle(p, t) : 1),
  waver: (p, t) => { if (p[2] === 1) turn(p, 1.6, 2.4, Math.sin(t * 4) * 0.35); },
  janggu: (p, t) => { if (p[2] === 1) turn(p, 10.6, 7.4, -(Math.max(0, Math.sin(t * 6)) ** 2) * 0.28); },
  taekwondo: (p, t) => { if (p[2] === 1) turn(p, 0.6, -1.4, -0.7 * (0.5 - 0.5 * Math.sin(t * 2.2))); },
  subway: (p, t) => { if (p[2] === 1) p[0] += 4 - t * 0.45; },
  bike: (p, t) => { if (p[2] === 1) turn(p, -7.6, -4, -t * 2); else if (p[2] === 2) turn(p, 7.6, -4, -t * 2); },
  bridge: (p, t) => { if (p[2] !== 1) return 1; p[0] += Math.sin(t * 2 + p[1] * 3) * 0.25; return twinkle(p, t); },
  whale: (p, t) => {
    if (p[2] === 2) turn(p, 5.2, 1.6, Math.sin(t * 2.6) * 0.2); // the tail
    let k = 1;
    if (p[2] === 1) { const s = Math.sin(t * 3) * 0.5 + 0.5; p[1] += s * 1.2; k = 0.35 + 0.65 * s; } // the spout
    p[1] += Math.sin(t * 1.4 + p[0] * 0.2) * 0.4;
    p[0] = p[0] * 0.85 + 15 - (t / 44) * 30; // swims across, right to left
    return k;
  },
  duck: (p, t) => { if (p[2] === 1) p[0] += Math.sin(t * 1.6 + p[1]) * 0.5; else p[1] += Math.sin(t * 1.5) * 0.3; },
  ramen: (p, t) => { if (p[2] === 1) p[0] += Math.sin(p[1] * 1.1 - t * 2.5) * 0.5; },
  wheel: (p, t) => {
    const a = t * 0.25;
    if (p[2] === 1) turn(p, 0, 1.2, a);
    else if (p[2] >= 2) { const a0 = Math.PI / 2 + ((p[2] - 2) / 8) * TAU; p[0] += 7.6 * (Math.cos(a0 + a) - Math.cos(a0)); p[1] += 7.6 * (Math.sin(a0 + a) - Math.sin(a0)); }
  },
  coaster: (p, t) => { if (p[2] !== 1) return; const x = p[0], dx = t * 1.15; p[0] += dx; p[1] += coasterY(x + dx) - coasterY(x); },
  hearts: beat(0.85),
  lightstick: (p, t) => turn(p, [-7.6, 0, 7.6][p[2]], -9.6, Math.sin(t * 2.4 + p[2] * 1.2) * 0.12),
  star: (p, t) => { const a = t * 0.3, x = p[0]; p[0] = x * Math.cos(a); p[3] = x * Math.sin(a); },
  moon: (p, t) => (p[2] === 1 ? twinkle(p, t) : 1),
  dipper: (p, t) => (p[2] < 7 ? 0.55 + 0.45 * Math.sin(t * 2 + p[2] * 1.3) : 1),
  shootingstar: (p, t) => { if (p[2] === 1) return twinkle(p, t); p[0] += t * 0.35; p[1] -= t * 0.17; return 1; },
  clover: (p, t) => turn(p, 0, 0, Math.sin(t * 0.8) * 0.06),
  blossom: (p, t) => { if (p[2] === 0) return; p[1] -= t * 0.28 * (0.8 + p[2] * 0.08); p[0] += Math.sin(t * 0.9 + p[2]) * 0.6; },
  firework: (p, t, f) => {
    const k = ((t + p[2] * 1.05) % 3.2) / 3.2, s = 0.2 + 0.8 * (1 - (1 - k) ** 3), c = f.centers[p[2]];
    p[0] = c[0] + (p[0] - c[0]) * s; p[1] = c[1] + (p[1] - c[1]) * s;
    return k < 0.8 ? 1 : (1 - k) / 0.2;
  },
};

// The show, as [seconds it stays, step] in order; the last line fills up
// to the end (20 minutes). Each picture or line stays about half as long as
// in the first shows (2026-11-11), with more of them.
const SHOW_LEN = 1200;
function scenes(act3, nextText, hello = HELLOS[0]) {
  const W = (lines, opts) => ({ lines, morph: 2, ...opts });
  const P = (shape, opts) => ({ shape, morph: 2.5, move: MOVES[shape], ...opts });
  return [
    // Opening (Yozi): the name, then hello in Korean, English, Japanese and
    // Chinese (most visitors to Korea), then in one more language, a
    // different one each show
    [24, W(['MODU', 'SEOUL'], { color: [SKYBLUE, PINK], morph: 2.5 })],
    [18, W(['모 두', '서 울'], { color: [PINK, GOLD] })],
    [18, W([['K', ' O', ' R', ' E', ' A']], { color: WHITE, parts: [0, 0.8, 1.6, 2.4, 3.2] })],
    [14, W(['WELCOME TO', 'SEOUL'], { color: [GOLD, SKYBLUE] })],
    [12, W(['안녕하세요'], { color: [GOLD, PINK] })],
    [10, W(['HELLO'], { color: [SKYBLUE, MINT] })],
    [10, W(['こんにちは'], { color: [PINK, VIOLET] })],
    [10, W(['你好'], { color: [RED, GOLD] })],
    [10, W([hello], { color: [GOLD, RED], hello: true })],
    [18, P('waver')],
    // Act 1: Seoul
    [30, P('fan')],
    [22, P('hanbok')],
    [18, P('janggu')],
    [18, P('mask')],
    [18, P('taekwondo')],
    [10, W(['태권!'], { color: [WHITE, SKYBLUE] })],
    [32, P('palace')],
    [12, W(['경복궁'], { color: [GOLD, RED] })],
    [32, P('tower')],
    [12, W(['남산'], { color: [MINT, SKYBLUE] })],
    [22, P('anothertower')],
    [18, P('mugunghwa')],
    [22, P('subway')],
    [14, W(['서울의 밤'], { color: [VIOLET, SKYBLUE] })],
    // Act 2: a Ttukseom night
    [44, P('whale', { morph: 3 })],
    [7, W(['뚝섬의', '전설'], { color: [SKYBLUE, WHITE] })],
    [16, P('duck')],
    [18, P('bike')],
    [18, P('bridge')],
    [12, W(['한강'], { color: [SKYBLUE, MINT] })],
    [18, P('chimaek')],
    [10, W(['치맥'], { color: [GOLD, RED] })],
    [16, P('ramen')],
    // (Yozi)
    [6, W(['라면'], { color: [RED, GOLD] })],
    [6, W(['먹고갈래?'], { color: [GOLD, PINK] })],
    [7, W(['뚝섬에서'], { color: [PINK, SKYBLUE] })],
    [22, P('wheel')],
    [22, P('coaster')],
    [12, W(['모두랜드'], { color: [PINK, GOLD] })],
    // Love (Yozi)
    [12, W(['사 랑'], { color: PINK })],
    [12, W(['행 복'], { color: GOLD })],
    [15, W([['그리고', ' .', ' .', ' .']], { color: WHITE, parts: [0, 2, 4, 6] })],
    [18, W([['너 ', '♡']], { color: (u, v, t, part) => rgb(part === 1 ? RED : PINK), move: beat(0.85) })],
    [18, P('hearts')],
    // Photo time: 하나, 둘, 셋, 김치~ then the heart frame holds still
    [10, W(['사진 찍자!'], { color: [GOLD, PINK] })],
    [3, W(['하나'], { color: WHITE, morph: 1.2 })],
    [3, W(['둘'], { color: WHITE, morph: 1 })],
    [3, W(['셋'], { color: WHITE, morph: 1 })],
    [6, W(['김치~'], { color: GOLD, morph: 1.2 })],
    [45, P('frame', { photo: true, morph: 3 })],
    // Act 3: changes from show to show
    [12, W(act3[0], { color: MINT, act3: true })],
    [12, W(act3[1], { color: [MINT, SKYBLUE] })],
    [14, W(act3[2], { color: [SKYBLUE, VIOLET] })],
    [18, P('lightstick')],
    [34, { wave: true, morph: 4 }],
    // The night sky
    [14, P('star')],
    [10, W(['별'], { color: GOLD })],
    [10, W(['반짝반짝'], { color: [GOLD, WHITE] })],
    [14, P('moon')],
    [10, W(['달'], { color: '#fff3c4' })],
    [20, P('dipper')],
    [10, W(['꿈'], { color: [VIOLET, PINK] })],
    [15, P('shootingstar')],
    [12, W(['소원 빌어'], { color: [VIOLET, GOLD] })],
    [14, P('clover')],
    [10, W(['행운'], { color: [MINT, GOLD] })],
    [18, P('blossom')],
    [17, P('rainbow')],
    [24, P('firework')],
    [18, W(['오늘 하루도', '수고했어'], { color: [GOLD, PINK] })],
    [14, W(['고마워', 'THANK YOU'], { color: [PINK, SKYBLUE] })],
    // Finale
    [32, { burst: true, morph: 6 }],
    [12, W(['또 만나'], { color: [PINK, GOLD], morph: 3 })],
    [12, W(['SEE YOU', 'AGAIN'], { color: [SKYBLUE, PINK] })],
    [0, W(['NEXT SHOW', nextText], { color: [GOLD, WHITE] })],
  ];
}
function timed(list) {
  let at = 0;
  return list.map(([d, s]) => { const step = { at, ...s }; at += d; return step; });
}

export function program(start) {
  const act3 = ACT3[((showNumber(start) % ACT3.length) + ACT3.length) % ACT3.length];
  const next = new Date(nextDroneShow(start + 1000));
  let nextText = '';
  try { nextText = next.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { nextText = `${next.getHours()}:${String(next.getMinutes()).padStart(2, '0')}`; }
  return [
    { at: -180, hover: true, morph: 70, stagger: 60 }, // lift-off from the barge
    ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((k, i) => ({ at: -10 + i, lines: [String(k)], color: k <= 3 ? GOLD : WHITE, morph: 0.5 })),
    ...timed(scenes(act3, nextText, helloOf(start))),
    { at: SHOW_SECONDS, land: true, morph: 45, stagger: 15 },
  ];
}

// When the photo pause is (for the "Photo time" notice): [from, to] seconds.
export const PHOTO_TIME = (() => {
  const list = timed(scenes(ACT3[0], ''));
  const k = list.findIndex((s) => s.photo);
  return [list[k].at, list[k + 1].at];
})();
// How long the last line (the next show's time) stays: tests keep it sensible.
export const LAST_LINE_SECONDS = SHOW_LEN - timed(scenes(ACT3[0], '')).at(-1).at;

// ---- the drones -------------------------------------------------------------
// count: how many drones (900 everywhere). scene: the park room's scene.
export function createDroneSky(scene, { count = 900 } = {}) {
  const n = count;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(SKY.x, SKY.y, SKY.z), 60);
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  const g = dot.getContext('2d'), grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.3, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.6, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
  const mat = new THREE.PointsMaterial({ size: 1.4, map: new THREE.CanvasTexture(dot), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
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
    else if (s.shape) f = picture(paintPicture(s.shape, n), s);
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
      const d = sphere[i], r = t < 6 ? 0 : 15 * (1 - (1 - clamp01((t - 6) / 4)) ** 3);
      tmp[0] = d[0] * r; tmp[1] = 1 + d[1] * r - Math.max(0, t - 13) * 0.25; tmp[3] = d[2] * r * 0.5;
      hsl.setHSL((i / n + t * 0.03) % 1, 0.85, t < 6 ? 0.9 : 0.6); hc[0] = hsl.r; hc[1] = hsl.g; hc[2] = hsl.b; c = hc;
      if (t < 6) a *= 0.6 + 0.4 * Math.sin(t * 6);
    } else {
      if (f.parts) a *= clamp01((t - (f.parts[tmp[2]] ?? 0)) / 0.5);
      if (f.move) { const k = f.move(tmp, t, f); if (typeof k === 'number') a *= k; }
      c = p[4] && !f.color ? p[4] : colorOf(f, p[0], p[1], t, tmp[2]);
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

// For tests: the names of the painted pictures.
export const SHAPE_NAMES = PICTURE_NAMES;

// ---- people already watching ------------------------------------------------
// During a show a few people sit on picnic mats at the back of the lawn and
// stand at the railing, so the park never looks empty (away from the
// entrance and the paths). Park-room positions.
const MATS = [{ x: -8.6, z: 8.2, color: '#3f7fd0' }, { x: 9.4, z: 6.4, color: '#e8708f' }];
const RAIL = [[-14.5, -2.5], [14.8, -2.4]];
// (createCharacter and randomLook come from the park, so this file pulls in
// nothing the game hasn't loaded already.)
// (`mats` and `rail` move them where a park's own lawn and railing are.)
export function createWatchers(scene, { createCharacter, randomLook, mats = MATS, rail = RAIL }) {
  const group = new THREE.Group();
  const people = [];
  for (const m of mats) {
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
  for (const [x, z] of rail) {
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
