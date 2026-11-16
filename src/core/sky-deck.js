// Modu Sky (모두 스카이): the observation deck at the top of Modu Tower
// (core/haneul.js), a room entered from the tower's door (stores.json
// "skydeck"). An octagonal floor with glass all round but the lift wall,
// benches facing the view, a glass floor by the west windows to stand on
// for a photo, and people already at the windows.
//
// The view is not the game's own city: it is a made-up painting of Seoul
// seen from about 500 m (our own drawing, made in code here, no photos or
// map images), wrapped round the room, coloured for the game's time of day
// (core/show-clock.js: morning, day, sunset, night) with lit windows at
// night. The real directions from Jamsil are kept: the Han River to the
// north, Namsan and its tower and far Yeouido to the west, Ttukseom to the
// north-west, Seokchon Lake right below to the south. On a fireworks night
// small bursts go up over Yeouido, on a drone night the drones light up
// over Ttukseom (the real show's own drones and pictures, drone-sky.js), at
// the same times as the shows (Yozi 2026-11-15).
//
// Loaded with the room builder (core/interior.js), not in the first download.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch } from './cathedral-hall.js';
import * as droneShow from './drone-show.js';
import { CYCLE_MS, SHOW_FROM, FIREWORKS, DRONES, cycleNumber, cycleMs, showOf, smooth } from './show-clock.js';

const SEAT_H = 0.38; // the same seat height as every chair in the game
const A = 12; // the octagon's apothem: the centre to the middle of a wall
const H = 6; // tall glass: the sky shows over the city
// The room's box (the lift wall is at +z); the octagon is inside it.
export const ROOM_SKYDECK = { w: 2 * A + 1, d: 2 * A + 0.6, h: H };

// The shows as seen from here: the same start (show-clock.js SHOW_FROM) and
// length as fireworks-show.js SHOW_SECONDS and drone-sky.js SHOW_LEN.
export const SHOW_LEN = { [FIREWORKS]: 525, [DRONES]: 1200 };
// Bearings from Jamsil (degrees clockwise from north) of what is in view.
export const VIEW = {
  yeouido: 278, // the fireworks over the river, 14 km
  namsan: 293, // the hill and its tower, 11 km
  ttukseom: 307, // the drone show, 4.5 km
  river: 0, // the Han, 1.3 km north
  lake: 190, // Seokchon Lake, below
};
// Where the drone show's sky plane (drone-show.js SKY, 28 m wide) sits in
// the view: e degrees up, on a cylinder of radius r, scaled so it spans
// about 8 degrees (a hand's width at arm's length, like the real 4.5 km);
// dot: the drones' size.
export const DRONE_VIEW = { e: 4.5, r: 80, scale: 0.4, dot: 0.6 };

// Each wall's facing: φ from +z (the lift wall, south) round by +x.
// A wall facing φ looks out on bearing 180 - φ.
const WALLS = [...Array(8).keys()].map((k) => (k * Math.PI) / 4);
export const bearingOf = (phi) => (((180 - (phi * 180) / Math.PI) % 360) + 360) % 360;
const dirOf = (phi) => [Math.sin(phi), Math.cos(phi)];
// Inside the octagon by at least `r`.
export const insideDeck = (x, z, r = 0) => WALLS.every((p) => x * Math.sin(p) + z * Math.cos(p) <= A - r);

// The glass floor (by the west wall) and the benches.
export const SKYDECK_LAYOUT = {
  glass: { x0: -A + 0.45, x1: -A + 3.6, z0: -1.8, z1: 1.8 },
  benches: [5 * Math.PI / 4, 7 * Math.PI / 4, Math.PI / 2].map((phi) => { const [sx, sz] = dirOf(phi); return { phi, x: sx * (A - 3.4), z: sz * (A - 3.4) }; }),
};

// ---- The time of day ------------------------------------------------------
// Colours through a game day (minutes into the 180-minute cycle: morning
// 0–22.5, day –97.5, sunset –120, night –180). sky: top and horizon; city:
// the painting's tint; lights: how lit the windows are; room: the room's
// own light.
const KEYS = [
  [0, { top: '#28325e', hor: '#e49c78', city: '#6c6880', lights: 0.6, room: 0.75 }],
  [11, { top: '#7fa8dc', hor: '#f6cfa6', city: '#efdccb', lights: 0.05, room: 1.05 }],
  [27, { top: '#4f8fd8', hor: '#d3e8f8', city: '#ffffff', lights: 0, room: 1.25 }],
  [93, { top: '#4f8fd8', hor: '#d3e8f8', city: '#ffffff', lights: 0, room: 1.25 }],
  [107, { top: '#41548f', hor: '#ff9b5c', city: '#d9a088', lights: 0.15, room: 1.0 }],
  [118, { top: '#24295a', hor: '#e2665a', city: '#7a5d6e', lights: 0.6, room: 0.8 }],
  [128, { top: '#070b1f', hor: '#1d2747', city: '#1e2340', lights: 1, room: 0.6 }],
  [180, { top: '#070b1f', hor: '#1d2747', city: '#1e2340', lights: 1, room: 0.6 }],
];
const _a = new THREE.Color(), _b = new THREE.Color();
const mixHex = (h1, h2, k, out) => out.copy(_a.set(h1)).lerp(_b.set(h2), k);
// The look at time `now` (ms): { top, hor, city (THREE.Color), lights, room, phase }.
export function skyAt(now, out = { top: new THREE.Color(), hor: new THREE.Color(), city: new THREE.Color() }) {
  const m = cycleMs(now) / 60e3;
  let i = 0;
  while (i < KEYS.length - 2 && m >= KEYS[i + 1][0]) i++;
  const [m0, a] = KEYS[i], [m1, b] = KEYS[i + 1];
  const k = smooth((m - m0) / (m1 - m0));
  mixHex(a.top, b.top, k, out.top);
  mixHex(a.hor, b.hor, k, out.hor);
  mixHex(a.city, b.city, k, out.city);
  out.lights = a.lights + (b.lights - a.lights) * k;
  out.room = a.room + (b.room - a.room) * k;
  out.phase = m < 22.5 ? 'morning' : m < 97.5 ? 'day' : m < 120 ? 'sunset' : 'night';
  return out;
}

// The show in the sky at `now`: { kind: FIREWORKS | DRONES, t: seconds in } or null.
export function showAt(now) {
  const n = cycleNumber(now), kind = showOf(n);
  if (!(kind in SHOW_LEN)) return null;
  const t = (now - (n * CYCLE_MS + SHOW_FROM)) / 1000;
  return t >= 0 && t < SHOW_LEN[kind] ? { kind, t } : null;
}

// ---- The painting -----------------------------------------------------------
// A cylinder round the room. Angles: e (degrees, up from level), b (bearing).
const R = 90; // the painting's radius (m)
const E_TOP = 9, E_BOT = -56; // what it covers, up and down
const EYE = 1.3; // about a chibi's eye height
const yOf = (e) => R * Math.tan((e * Math.PI) / 180);
const Y_TOP = yOf(E_TOP), Y_BOT = yOf(E_BOT);
const HIGH = 480; // metres: how far above the city the deck stands (real)

// The real Han near Jamsil, roughly (metres east, north of the tower): a
// band ~900 m wide. Made simple: this is a painting.
const RIVER = [[9000, 3600], [5000, 2300], [2000, 1600], [0, 1350], [-2600, 1300], [-4600, 1800], [-7000, 1600], [-9000, 700], [-11500, 500], [-13500, -500], [-16000, -300], [-20000, 600]];
const LAKES = [[[-330, -420], 260], [[330, -380], 230]]; // Seokchon Lake, west and east
const PARKS = [[[2100, -900], 700], [[-3300, 2000], 500], [[-4300, -1900], 600]]; // Olympic Park, Seoul Forest, Seonjeongneung
function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
// What the ground is at (x east, y north) metres from the tower.
export function groundAt(x, y) {
  for (let i = 1; i < RIVER.length; i++) if (segDist(x, y, RIVER[i - 1], RIVER[i]) < 450) return 'water';
  for (const [[cx, cy], r] of LAKES) if (Math.hypot(x - cx, y - cy) < r) return 'water';
  for (const [[cx, cy], r] of PARKS) if (Math.hypot(x - cx, y - cy) < r) return 'park';
  return 'city';
}

// A seeded random, so the city looks the same every visit.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const HAZE = [205, 218, 230];
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRgb = (c, k) => `rgb(${c.map((v, i) => Math.round(v + (HAZE[i] - v) * k)).join(',')})`;
const hazeOf = (D) => Math.min(0.88, Math.pow(D / 17000, 0.7));
const BUILD = ['#cfc9bf', '#b9b3a9', '#a9a6a0', '#d8d1c4', '#97a8b8', '#bcc4cb', '#b09f8a', '#cdc2b0', '#8fa1b2', '#e0dbd2'].map(hexRgb);

// Mountains on the skyline: [bearing from, to, distance m, top height m, peaks].
const RIDGES = [
  [318, 362, 21000, 840, 7], // Bukhansan and Dobongsan
  [20, 70, 4500, 300, 3], // Achasan and Yongmasan
  [70, 100, 12000, 600, 3], // Geomdansan, far east
  [118, 160, 8500, 520, 4], // Namhansanseong
  [196, 214, 9000, 620, 2], // Cheonggyesan
  [222, 242, 15000, 680, 3], // Gwanaksan
  [286, 300, 10800, 262, 1], // Namsan
];
// Tall clusters: [bearing from, to, distance from, to (m), tallest m].
const TOWERS = [[232, 268, 2500, 6000, 230], [292, 300, 9500, 11500, 120], [272, 283, 13500, 15500, 160], [55, 75, 9000, 12000, 120]];

// Draws the painting (alpha above the skyline) and collects night lights
// as { b, e } pairs. W: canvas width (4096, 2048 on small phones).
export function paintView(W = 4096) {
  const Hc = W / 8;
  const c = document.createElement('canvas');
  c.width = W; c.height = Hc;
  const g = c.getContext('2d');
  const rand = rng(20261115);
  const lights = [];
  let farLights = 0;
  const colOf = (b) => ((((b / 360 + 0.5) % 1) + 1) % 1) * W;
  const rowOf = (e) => ((Y_TOP - yOf(Math.max(E_BOT - 1, Math.min(E_TOP + 1, e)))) / (Y_TOP - Y_BOT)) * Hc;
  const depOf = (D, up = 0) => -(Math.atan2(HIGH - up, D) * 180) / Math.PI; // e of a point `up` metres high, D away
  const pxPerDeg = W / 360;
  // A rect from bearing b (width wDeg), between angles eLo..eHi; wraps.
  const rect = (b, wDeg, eLo, eHi, fill) => {
    g.fillStyle = fill;
    const x = colOf(b), y0 = rowOf(eHi), y1 = rowOf(eLo), w = Math.max(1, wDeg * pxPerDeg);
    g.fillRect(x, y0, w, y1 - y0 + 0.5);
    if (x + w > W) g.fillRect(x - W, y0, w, y1 - y0 + 0.5);
  };

  // 1. The ground, coarse (scaled up): land, parks and water, hazier far off.
  const gw = W / 4, gh = Hc / 4;
  const low = document.createElement('canvas');
  low.width = gw; low.height = gh;
  const lg = low.getContext('2d');
  const img = lg.createImageData?.(gw, gh);
  if (img) {
    const LAND = hexRgb('#9ea392'), PARK = hexRgb('#7e9a6a'), WATER = hexRgb('#6f90ab');
    for (let j = 0; j < gh; j++) {
      const y = Y_TOP - ((j + 0.5) / gh) * (Y_TOP - Y_BOT), e = Math.atan2(y, R);
      if (e > -0.005) continue; // above the horizon: the sky shows
      const D = HIGH / Math.tan(-e), k = hazeOf(D);
      for (let i = 0; i < gw; i++) {
        const b = ((i + 0.5) / gw - 0.5) * 2 * Math.PI;
        const kind = groundAt(Math.sin(b) * D, Math.cos(b) * D);
        const col = kind === 'water' ? WATER : kind === 'park' ? PARK : LAND;
        const o = (j * gw + i) * 4;
        for (let ch = 0; ch < 3; ch++) img.data[o + ch] = col[ch] + (HAZE[ch] - col[ch]) * k;
        img.data[o + 3] = 255;
      }
    }
    lg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(low, 0, 0, W, Hc);
  }

  // 2. Mountains, far ones first (exaggerated a little, so they read).
  for (const [b0, b1, D, top, peaks] of [...RIDGES].sort((p, q) => q[2] - p[2])) {
    const k = hazeOf(D) * 0.9, fill = mixRgb(hexRgb(D > 9000 ? '#7d8f8a' : '#6f8a62'), k);
    const span = b1 - b0, steps = Math.ceil(span * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, bump = Math.pow(Math.sin(t * Math.PI), 0.8) * (0.75 + 0.25 * Math.sin(t * peaks * Math.PI * 2 + b0));
      const hgt = top * bump;
      rect(b0 + t * span, 0.6, depOf(D), depOf(D, hgt * 1.6), fill);
    }
  }

  // 3. Buildings, far rings first; nothing on water or in parks.
  for (let D = 18000; D > 260; D /= 1.035) {
    const k = hazeOf(D);
    const step = Math.max(0.12, (60 / D) * (180 / Math.PI)); // about one building per 60 m round
    for (let b = rand() * step; b < 360; b += step * (0.6 + rand() * 0.8)) {
      const rad = (b * Math.PI) / 180;
      if (groundAt(Math.sin(rad) * D, Math.cos(rad) * D) !== 'city') continue;
      let tall = 15 + rand() * rand() * 70;
      for (const [t0, t1, d0, d1, top] of TOWERS) if (b >= t0 && b <= t1 && D >= d0 && D <= d1 && rand() < 0.5) tall = Math.max(tall, top * (0.4 + rand() * 0.6));
      if (D < 2500 && rand() < 0.15) tall = 60 + rand() * 50; // apartment blocks nearby
      const wDeg = ((20 + rand() * 30) / D) * (180 / Math.PI);
      const base = BUILD[Math.floor(rand() * BUILD.length)];
      const eLo = depOf(D), eHi = depOf(D, tall);
      rect(b, wDeg, eLo, eHi, mixRgb(base, k));
      if (D < 9000) rect(b + wDeg * 0.62, wDeg * 0.38, eLo, eHi, mixRgb(base.map((v) => v * 0.78), k)); // its shady side
      if (D < 8000) rect(b, wDeg, eHi - (eHi - eLo) * 0.08, eHi, mixRgb(base.map((v) => v * 0.82), k)); // a roof edge
      // Its lights at night: a few windows (fewer far off).
      const area = wDeg * (eHi - eLo) * pxPerDeg * pxPerDeg; // its size on the canvas (px²)
      const nl = D > 9000 ? (rand() < 0.12 && farLights++ < 2500 ? 1 : 0) : Math.min(14, 1 + Math.floor(rand() * area / 40));
      for (let n = 0; n < nl && lights.length < 9000; n++) lights.push({ b: b + rand() * wDeg, e: eLo + (eHi - eLo) * rand() });
    }
  }

  // 4. Landmarks: Namsan's tower, far 63 Building (gold), the bridges.
  const tw = mixRgb(hexRgb('#e8e2d8'), hazeOf(10800) * 0.8);
  rect(VIEW.namsan - 0.08, 0.16, depOf(10800, 262 * 1.6), depOf(10800, 262 * 1.6 + 236 * 1.4), tw);
  rect(VIEW.namsan - 0.25, 0.5, depOf(10800, 262 * 1.6 + 150), depOf(10800, 262 * 1.6 + 180), tw);
  rect(VIEW.yeouido - 0.1, 0.22, depOf(15000), depOf(15000, 300), mixRgb(hexRgb('#d8b45a'), 0.5));
  lights.push({ b: VIEW.namsan, e: depOf(10800, 262 * 1.6 + 236 * 1.4), red: true });
  // Bridges: thin pale lines across the river, with lamps along them.
  for (const x of [-20000, -16500, -13800, -12000, -10200, -8200, -6200, -4300, -2600, -900, 1300, 4200, 7400]) {
    for (let y = -1500; y < 4500; y += 60) {
      if (groundAt(x, y) !== 'water') continue;
      const D = Math.hypot(x, y), b = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
      rect(b, Math.max(0.05, (40 / D) * 57.3), depOf(D), depOf(D, 12), mixRgb(hexRgb('#e6e2da'), hazeOf(D)));
      if (lights.length < 9400 && (y / 60) % 4 === 0) lights.push({ b, e: depOf(D, 14), warm: true });
    }
  }

  // 5. Clear above the skyline: soften the horizon into the haze.
  const hz = rowOf(0);
  const grad = g.createLinearGradient?.(0, hz - Hc * 0.03, 0, hz + Hc * 0.02);
  if (grad) {
    grad.addColorStop(0, 'rgba(205,218,230,0)');
    grad.addColorStop(1, 'rgba(205,218,230,0.55)');
    g.fillStyle = grad;
    g.fillRect(0, hz - Hc * 0.03, W, Hc * 0.05);
  }
  return { canvas: c, lights };
}

// Where a point at bearing b, angle e lands on a cylinder of radius r.
const onCylinder = (b, e, r) => {
  const rad = (b * Math.PI) / 180;
  return [Math.sin(rad) * r, EYE + r * Math.tan((e * Math.PI) / 180), -Math.cos(rad) * r];
};

// The straight-down view under the glass floor: streets and roofs.
function belowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const rand = rng(7);
  g.fillStyle = '#9ea392'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#6d7076';
  g.fillRect(0, 230, 512, 46); // Olympic-ro
  g.fillRect(250, 0, 40, 512); // Songpa-daero
  g.fillStyle = '#eef0f2';
  for (let i = 0; i < 512; i += 24) { g.fillRect(i, 252, 12, 2); g.fillRect(269, i, 2, 12); }
  for (let i = 0; i < 70; i++) { // roofs
    const x = rand() * 512, y = rand() * 512, w = 18 + rand() * 40, h = 18 + rand() * 40;
    if ((x + w > 240 && x < 300) || (y + h > 220 && y < 286)) continue;
    g.fillStyle = ['#d9d4cb', '#c3c8cf', '#b8b0a2', '#e2ddd3'][i % 4];
    g.fillRect(x, y, w, h);
  }
  for (let i = 0; i < 40; i++) { // cars
    g.fillStyle = ['#e8463c', '#f2f2f2', '#2c2c34', '#3a6fd8', '#f2c94c'][i % 5];
    if (i % 2) g.fillRect(254 + (i % 4) * 9, rand() * 512, 5, 9);
    else g.fillRect(rand() * 512, 234 + (i % 4) * 10, 9, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A plaque on the handrail: what you're looking at, in English and Korean.
function plaqueTexture(en, ko, km) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1d2433'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#e9c46a'; g.fillRect(0, 0, 10, 128);
  g.fillStyle = '#ffffff';
  g.font = '700 46px "Helvetica Neue", Arial, system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText(`${en} ${ko}`, 30, 46);
  g.fillStyle = '#b9c4d6';
  g.font = '500 32px "Helvetica Neue", Arial, system-ui, sans-serif';
  g.fillText(km, 30, 98);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#141a26'; g.fillRect(0, 0, 1024, 256);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.font = '900 104px "Helvetica Neue", Arial, system-ui, sans-serif';
  g.fillText('MODU SKY', 512, 104);
  g.fillStyle = '#e9c46a';
  g.font = '700 44px "Helvetica Neue", Arial, system-ui, sans-serif';
  g.fillText('모두 스카이 · 117F', 512, 196);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The lift: a floor counter over the screen, slow enough to watch (a
// player's wish, Yozi 2026-11-16: "it's fine to arrive slowly"). Going up
// as you arrive, down as you leave. Beside the number, a tall gauge with
// the height and little marks you pass on the way (a Ferris wheel, a tall
// building, Namsan's tower top, each with its height): pictures and
// numbers, so every language reads it. A tap skips it.
export const LIFT = { floors: 117, top: 500, up: 8, down: 6 }; // floors, metres, seconds
export const LIFT_MARKS = [['🎡', 60], ['🏢', 250], ['🗼', 480]]; // [mark, metres]: a Ferris wheel, a tall building, Namsan's tower top
// How far along the ride is (0–1) after `k` of its time (0–1): eases in
// and out, steady in the middle like a real lift.
export const liftAlong = (k) => {
  const x = Math.min(1, Math.max(0, k)), e = 0.18; // the first and last 18% speed up and slow down
  if (x < e) return (x * x) / (2 * e * (1 - e));
  if (x > 1 - e) return 1 - ((1 - x) * (1 - x)) / (2 * e * (1 - e));
  return (x - e / 2) / (1 - e);
};
export const liftFloor = (along) => Math.max(1, Math.round(1 + (LIFT.floors - 1) * along));

function liftRide(dir = 'up') {
  if (typeof document === 'undefined' || !document.body?.appendChild) return;
  document.querySelector('.skydeck-lift')?.remove();
  const up = dir === 'up', LEN = (up ? LIFT.up : LIFT.down) * 1000;
  const el = (tag, css, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text) e.textContent = text; return e; };
  const o = el('div', 'position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;gap:clamp(24px,7vw,64px);'
    + 'background:linear-gradient(#0d1322,#1d2a44);color:#fff;font-family:system-ui,sans-serif;transition:opacity .5s;cursor:pointer');
  o.className = 'skydeck-lift';
  // The gauge: a thin shaft, the marks beside it, the car moving along.
  const H = 'min(58vh,340px)';
  const gauge = el('div', `position:relative;width:110px;height:${H}`);
  gauge.append(el('div', 'position:absolute;left:76px;top:0;bottom:0;width:4px;border-radius:2px;background:rgba(255,255,255,.18)'));
  const fill = el('div', 'position:absolute;left:76px;bottom:0;width:4px;border-radius:2px;background:#e9c46a');
  gauge.append(fill);
  const marks = LIFT_MARKS.map(([m, at]) => {
    const e = el('div', `position:absolute;right:42px;bottom:calc(${(at / LIFT.top) * 100}% - 11px);display:flex;align-items:center;gap:4px;white-space:nowrap;font:600 12px system-ui,sans-serif;color:#b9c4d6;line-height:22px;opacity:.35;transition:opacity .4s,transform .4s;transform-origin:right center`);
    e.append(el('span', 'font-size:18px', m), el('span', '', `${at} m`));
    gauge.append(e);
    return [e, at];
  });
  const car = el('div', 'position:absolute;left:70px;width:16px;height:16px;margin-bottom:-8px;border-radius:4px;background:#fff;box-shadow:0 0 12px #e9c46a');
  gauge.append(car);
  const right = el('div', 'display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:6ch');
  const floor = el('div', 'font:900 clamp(52px,12vw,84px)/1 system-ui,sans-serif;font-variant-numeric:tabular-nums');
  const metres = el('div', 'font:700 22px system-ui,sans-serif;color:#b9c4d6;font-variant-numeric:tabular-nums');
  const name = el('div', 'margin-top:10px;font:700 15px system-ui,sans-serif;letter-spacing:.2em;color:#e9c46a', `${up ? '▲' : '▼'} MODU SKY`);
  right.append(floor, metres, name);
  o.append(gauge, right);
  document.body.appendChild(o);
  let done = false;
  const end = () => { if (done) return; done = true; o.style.opacity = '0'; setTimeout(() => o.remove(), 600); };
  o.addEventListener('pointerdown', end);
  const t0 = performance.now();
  const tick = () => {
    if (done) return;
    const k = (performance.now() - t0) / LEN, a = liftAlong(k), along = up ? a : 1 - a;
    const m = Math.round(along * LIFT.top);
    floor.textContent = `${liftFloor(along)}F`;
    metres.textContent = `${m} m`;
    fill.style.height = `${along * 100}%`;
    car.style.bottom = `${along * 100}%`;
    for (const [e, at] of marks) { const on = m >= at - 1; e.style.opacity = on ? '1' : '.35'; e.style.transform = on ? 'scale(1.15)' : 'none'; }
    if (k < 1) requestAnimationFrame(tick);
    else setTimeout(end, 500); // (a moment on the last floor)
  };
  tick();
}

// ---- The room ------------------------------------------------------------
const C = {
  floor: '#3e4350', floorRing: '#545a69', ceiling: '#1d212a', frame: '#2a2f3a', rail: '#c9ced6', lift: '#8f96a3',
  liftWall: '#e9e6df', wood: '#8a6446', woodDark: '#5a3f2c', glassFrame: '#e8ecf1',
};

export function buildSkyDeck(store, ROOM, EXIT) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1d2747');
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0x40465a, 1.2);
  scene.add(hemi, new THREE.AmbientLight(0xffffff, 0.35));
  const colliders = [];
  const poly = (p) => colliders.push({ p });
  const b = new Batch();
  const Lo = SKYDECK_LAYOUT, G = Lo.glass;
  const Rv = A / Math.cos(Math.PI / 8); // the corners
  const corner = (k) => [Math.sin(WALLS[k] - Math.PI / 8) * Rv, Math.cos(WALLS[k] - Math.PI / 8) * Rv];

  // The floor: the octagon with the glass floor cut out of it.
  const shape = new THREE.Shape();
  for (let k = 0; k <= 8; k++) { const [x, z] = corner(k % 8); if (k) shape.lineTo(x, -z); else shape.moveTo(x, -z); }
  const hole = new THREE.Path();
  hole.moveTo(G.x0, -G.z0); hole.lineTo(G.x1, -G.z0); hole.lineTo(G.x1, -G.z1); hole.lineTo(G.x0, -G.z1); hole.lineTo(G.x0, -G.z0);
  shape.holes.push(hole);
  b.add(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), C.floor);
  b.add(new THREE.RingGeometry(4.2, 4.5, 8, 1, Math.PI / 8).rotateX(-Math.PI / 2), C.floorRing, 0, 0.005, 0);
  // The ceiling (seen from below), and a ring of light under it.
  b.add(new THREE.CircleGeometry(Rv, 8, Math.PI / 8).rotateX(Math.PI / 2), C.ceiling, 0, H, 0);
  b.add(new THREE.RingGeometry(5.4, 5.8, 8, 1, Math.PI / 8).rotateX(Math.PI / 2), '#fff4d6', 0, H - 0.01, 0, { basic: true });

  // The walls: the lift wall (+z) solid, the others glass between thin
  // frames, with a handrail a step in from the glass.
  const len = 2 * A * Math.tan(Math.PI / 8);
  WALLS.forEach((phi, k) => {
    const [sx, sz] = dirOf(phi), wx = sx * A, wz = sz * A;
    // Solid beyond the glass (and the rail) for walking.
    const [x0, z0] = corner(k), [x1, z1] = corner((k + 1) % 8), out = 2;
    const inset = k === 0 ? 0.25 : 0.55;
    poly([[x0 - sx * inset, z0 - sz * inset], [x1 - sx * inset, z1 - sz * inset], [x1 + sx * out, z1 + sz * out], [x0 + sx * out, z0 + sz * out]]);
    if (k === 0) {
      b.add(new THREE.PlaneGeometry(len, H), C.liftWall, wx, H / 2, wz - 0.01, { ry: phi + Math.PI });
      return;
    }
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const t = -len / 2 + (len * i) / n;
      b.box(0.12, H, 0.12, wx + Math.cos(phi) * t, H / 2, wz - Math.sin(phi) * t, C.frame, { ry: phi });
    }
    b.box(len, 0.35, 0.16, wx, H - 0.175, wz, C.frame, { ry: phi }); // the header
    b.box(len, 0.08, 0.3, wx - sx * 0.1, 0.04, wz - sz * 0.1, C.frame, { ry: phi }); // the sill
    // The handrail on posts.
    const rx = sx * (A - 0.45), rz = sz * (A - 0.45), rl = 2 * (A - 0.45) * Math.tan(Math.PI / 8);
    b.box(rl, 0.05, 0.07, rx, 0.86, rz, C.rail, { ry: phi });
    for (const t of [-rl / 2 + 0.3, 0, rl / 2 - 0.3]) b.box(0.05, 0.86, 0.05, rx + Math.cos(phi) * t, 0.43, rz - Math.sin(phi) * t, C.rail);
  });
  // The glass panes: one faint mesh for all of them (the view shows through).
  const panes = [];
  WALLS.forEach((phi, k) => { if (k) { const [sx, sz] = dirOf(phi); panes.push(new THREE.PlaneGeometry(len, H - 0.4).rotateY(phi + Math.PI).translate(sx * (A + 0.02), (H - 0.4) / 2 + 0.05, sz * (A + 0.02))); } });

  // The lift wall: three lift doors (the middle one is the way out), the
  // deck's name over them.
  for (const x of [-3, 0, 3]) {
    b.box(1.5, 2.4, 0.06, x, 1.2, A - 0.04, C.lift);
    b.box(0.02, 2.4, 0.07, x, 1.2, A - 0.05, '#5d6470');
    b.box(1.7, 0.12, 0.08, x, 2.46, A - 0.05, C.frame);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: signTexture() }));
  sign.position.set(0, 3.45, A - 0.06);
  sign.rotation.y = Math.PI;
  scene.add(sign);

  // The glass floor: a frame round it, the pane, and the street far below.
  const gx = (G.x0 + G.x1) / 2, gz = (G.z0 + G.z1) / 2, gw = G.x1 - G.x0, gd = G.z1 - G.z0;
  for (const [w, d, x, z] of [[gw + 0.2, 0.1, gx, G.z0], [gw + 0.2, 0.1, gx, G.z1], [0.1, gd, G.x1, gz]]) b.box(w, 0.02, d, x, 0.01, z, C.glassFrame);
  const below = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: belowTexture() }));
  below.position.set(gx, -40, gz);
  scene.add(below);
  const glassFloor = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.12, depthWrite: false }));
  glassFloor.position.set(gx, 0.002, gz);
  scene.add(glassFloor);
  // Benches facing the view (two seats each).
  const seats = [];
  for (const { phi, x, z } of Lo.benches) {
    const [sx, sz] = dirOf(phi), cx = Math.cos(phi), cz = -Math.sin(phi);
    b.box(2.2, 0.08, 0.5, x, SEAT_H - 0.04, z, C.wood, { ry: phi });
    for (const e of [-0.95, 0.95]) b.box(0.08, SEAT_H - 0.08, 0.44, x + cx * e, (SEAT_H - 0.08) / 2, z + cz * e, C.woodDark, { ry: phi });
    poly([[-1.15, -0.3], [1.15, -0.3], [1.15, 0.3], [-1.15, 0.3]].map(([u, v]) => [x + cx * u + sx * v, z + cz * u + sz * v]));
    for (const e of [-0.5, 0.5]) seats.push({ x: x + cx * e, z: z + cz * e, ry: phi, stand: [x + cx * e - sx * 0.8, z + cz * e - sz * 0.8] });
  }

  // Plaques on the rail: what's out there.
  const plaques = [
    [3 * Math.PI / 2, 0.55, 'Yeouido', '여의도', '14 km · fireworks nights'],
    [3 * Math.PI / 2, -0.35, 'Namsan', '남산', '11 km'],
    [5 * Math.PI / 4, 0.2, 'Ttukseom', '뚝섬', '4.5 km · drone show nights'],
    [Math.PI, 0, 'Han River', '한강', '1.3 km'],
    [Math.PI / 4, 0, 'Seokchon Lake', '석촌호수', 'right below'],
  ];
  for (const [phi, along, en, ko, km] of plaques) {
    const [sx, sz] = dirOf(phi), rl = 2 * (A - 0.45) * Math.tan(Math.PI / 8);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: plaqueTexture(en, ko, km) }));
    m.position.set(sx * (A - 0.5) + Math.cos(phi) * along * rl / 2, 0.8, sz * (A - 0.5) - Math.sin(phi) * along * rl / 2);
    m.rotation.set(-0.5, phi + Math.PI, 0, 'YXZ');
    scene.add(m);
  }

  b.flush(scene);
  if (panes.length) {
    const glass = new THREE.Mesh(mergeGeometries(panes.map((g) => { const n = g.toNonIndexed(); n.deleteAttribute('uv'); n.deleteAttribute('normal'); return n; })), new THREE.MeshBasicMaterial({ color: '#dff1ff', transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }));
    scene.add(glass);
  }
  scene.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = false; o.updateMatrix(); } });

  // ---- The view ----
  const small = typeof navigator !== 'undefined' && (navigator.deviceMemory || 8) <= 4;
  const { canvas, lights } = paintView(small ? 2048 : 4096);
  const viewTex = new THREE.CanvasTexture(canvas);
  viewTex.colorSpace = THREE.SRGBColorSpace;
  viewTex.wrapS = THREE.RepeatWrapping;
  viewTex.repeat.x = -1; // (seen from inside: bearings run left to right)
  viewTex.anisotropy = 4;
  const cityMat = new THREE.MeshBasicMaterial({ map: viewTex, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false });
  const city = new THREE.Mesh(new THREE.CylinderGeometry(R, R, Y_TOP - Y_BOT, 96, 1, true), cityMat);
  city.position.y = EYE + (Y_TOP + Y_BOT) / 2;
  city.renderOrder = -2;
  // The sky: a dome coloured by height (top to horizon), behind the city.
  const skyGeo = new THREE.SphereGeometry(R + 5, 32, 16);
  const skyCol = new Float32Array(skyGeo.attributes.position.count * 3);
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyCol, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false }));
  sky.position.y = EYE;
  sky.renderOrder = -3;
  // Under the sky: the ground far below, where the painting stops.
  const floorBelow = new THREE.Mesh(new THREE.CircleGeometry(R + 4, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#9ea392', depthWrite: false, fog: false }));
  floorBelow.position.y = EYE + Y_BOT - 0.5;
  floorBelow.renderOrder = -2.5;
  // Lit windows at night.
  const lp = new Float32Array(lights.length * 3), lc = new Float32Array(lights.length * 3), rnd = rng(3);
  lights.forEach((l, i) => {
    lp.set(onCylinder(l.b, l.e, R - 1), i * 3);
    const c = l.red ? [1, 0.25, 0.2] : l.warm ? [1, 0.82, 0.5] : rnd() < 0.7 ? [1, 0.86, 0.6] : [0.75, 0.85, 1];
    lc.set(c, i * 3);
  });
  const lightGeo = new THREE.BufferGeometry();
  lightGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lightGeo.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const lightMat = new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const cityLights = new THREE.Points(lightGeo, lightMat);
  cityLights.renderOrder = -1;
  // The sun or the moon: a soft disc in the painting's sky.
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3, 24), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, depthWrite: false, fog: false }));
  disc.renderOrder = -2.8;
  // The fireworks: a few hundred sparks.
  const SPARKS = 320;
  const sp = new Float32Array(SPARKS * 3), sc = new Float32Array(SPARKS * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const sparkMat = new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.visible = false;
  sparks.frustumCulled = false;
  scene.add(sky, floorBelow, city, cityLights, disc, sparks);

  // ---- Each frame ----
  const look = { top: new THREE.Color(), hor: new THREE.Color(), city: new THREE.Color() };
  const below0 = new THREE.Color('#9ea392');
  let lastFrame = -1e9, lastPaint = -1e9;
  const paintSky = (now) => {
    skyAt(now, look);
    const pos = skyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / (R + 5), k = Math.max(0, y);
      const c = _a.copy(look.hor).lerp(look.top, Math.pow(k, 0.55));
      if (y < 0) c.copy(look.hor).multiplyScalar(0.8);
      skyCol.set([c.r, c.g, c.b], i * 3);
    }
    pos.needsUpdate = true;
    skyGeo.attributes.color.needsUpdate = true;
    cityMat.color.copy(look.city);
    floorBelow.material.color.copy(below0).multiply(look.city);
    below.material.color.copy(look.city).lerp(_b.set('#ffffff'), 0.15);
    lightMat.opacity = look.lights;
    hemi.intensity = 1.2 * look.room;
    // The sun rises in the east, sets in the west (over Yeouido); the moon at night.
    const m = cycleMs(now) / 60e3;
    let db = null, de = 0, col = '#fff3c4', op = 1;
    if (m < 30) { db = 105; de = -1 + (m / 30) * 14; col = '#ffd9a0'; }
    else if (m > 92 && m < 121) { db = 262; de = 13 - ((m - 92) / 29) * 15; col = m > 108 ? '#ff9a5a' : '#ffe6b0'; }
    else if (m >= 124) { db = 140; de = 6 + ((m - 124) / 56) * 8; col = '#eef2ff'; op = 0.9; }
    disc.visible = db !== null;
    if (db !== null) {
      disc.position.set(...onCylinder(db, de, R + 2));
      disc.lookAt(0, EYE, 0);
      disc.material.color.set(col);
      disc.material.opacity = op;
    }
  };

  // Fireworks over Yeouido: bursts of sparks that open, fall and fade.
  const bursts = [];
  const burstColors = [[1, 0.35, 0.3], [1, 0.85, 0.35], [0.45, 0.8, 1], [0.8, 0.5, 1], [0.4, 1, 0.6], [1, 1, 1]];
  const PER = 40;
  const fireworks = (dt) => {
    if (bursts.length < SPARKS / PER && Math.random() < dt * 1.6) {
      bursts.push({ b: VIEW.yeouido + (Math.random() - 0.5) * 5, e: 1 + Math.random() * 3, age: 0, size: 1.2 + Math.random() * 1.4, c: burstColors[Math.floor(Math.random() * burstColors.length)], c2: burstColors[Math.floor(Math.random() * burstColors.length)] });
    }
    for (let i = bursts.length - 1; i >= 0; i--) if ((bursts[i].age += dt) > 2.4) bursts.splice(i, 1);
    sc.fill(0);
    bursts.forEach((u, j) => {
      const open = 1 - Math.pow(1 - Math.min(1, u.age / 0.9), 3), fade = Math.max(0, 1 - Math.max(0, u.age - 0.6) / 1.8);
      for (let n = 0; n < PER; n++) {
        const a = (n / PER) * Math.PI * 2, r = u.size * open * (n % 2 ? 1 : 0.7);
        const i = j * PER + n, c = n % 2 ? u.c : u.c2;
        sp.set(onCylinder(u.b + Math.cos(a) * r, u.e + Math.sin(a) * r - u.age * u.age * 0.35, R - 3), i * 3);
        sc.set([c[0] * fade, c[1] * fade, c[2] * fade], i * 3);
      }
    });
  };
  // The real Ttukseom drone show (core/drone-sky.js, the same pictures at
  // the same moment as in the park), small over the river to the north-west.
  // Its code comes only when a show is near while you're up here.
  const droneG = new THREE.Group();
  droneG.visible = false;
  scene.add(droneG);
  let droneSky = null, droneLoading = false;
  const placeDrones = (SKY) => {
    const yaw = (-VIEW.ttukseom * Math.PI) / 180, k = DRONE_VIEW.scale;
    const centre = new THREE.Vector3(...onCylinder(VIEW.ttukseom, DRONE_VIEW.e, DRONE_VIEW.r));
    const local = new THREE.Vector3(SKY.x, SKY.y, SKY.z).multiplyScalar(k).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    droneG.position.copy(centre.sub(local));
    droneG.rotation.y = yaw;
    droneG.scale.setScalar(k);
    droneG.updateMatrixWorld(true);
  };
  const drones = (now) => {
    const s = droneShow.droneShowAt(now);
    const near = s && s.t > -droneShow.LIFT_SECONDS - 60;
    if (near && !droneSky && !droneLoading) {
      droneLoading = true;
      import('./drone-sky.js').then((m) => {
        m.useShow(droneShow);
        placeDrones(droneShow.SKY);
        droneSky = m.createDroneSky(droneG, { count: 900 });
        droneSky.points.material.size = DRONE_VIEW.dot; // (far away: smaller dots)
      }).catch(() => {}).finally(() => { droneLoading = false; }); // (offline: try again later)
    }
    droneG.visible = !!(near && droneSky);
    if (droneG.visible) droneSky.update(s.start, s.t, s.night);
  };

  const animate = (dt) => {
    const t = performance.now(), now = Date.now();
    if (t - lastFrame > 1500) { liftRide('up'); lastPaint = -1e9; } // just walked in: the ride up
    lastFrame = t;
    if (t - lastPaint > 500) { paintSky(now); lastPaint = t; }
    const show = showAt(now);
    sparks.visible = show?.kind === FIREWORKS;
    drones(now);
    if (sparks.visible) {
      fireworks(Math.min(dt, 0.1));
      sparkGeo.attributes.position.needsUpdate = true;
      sparkGeo.attributes.color.needsUpdate = true;
    } else bursts.length = 0;
  };

  // People already here: at the windows, looking out (one on the glass floor).
  const visitors = [
    [Math.PI, -2.2], [Math.PI, 1.6], [3 * Math.PI / 4, -0.8], [Math.PI / 4, 1.2], [5 * Math.PI / 4, -1.8], [7 * Math.PI / 4, 1.6], [Math.PI / 2, 2.6],
  ].map(([phi, along]) => {
    const [sx, sz] = dirOf(phi);
    return { x: sx * (A - 1) + Math.cos(phi) * along, z: sz * (A - 1) - Math.sin(phi) * along, ry: phi };
  });
  visitors.push({ x: gx + 0.4, z: gz - 0.9, ry: 3 * Math.PI / 2 }); // on the glass floor, looking west

  return {
    scene, products: [], colliders, clerk: null, turntable: null, room: ROOM, exit: EXIT,
    seats,
    stations: { visitors },
    animate,
    camBlocked: (x, z) => !insideDeck(x, z, 0.3),
    onLeave: () => liftRide('down'), // (main.js leaveStore: the ride down)
    skyDeck: true,
  };
}
