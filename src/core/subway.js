// Underground subway station: stair exits on the street and a station hall
// below (concourse, ticket gates, platform with screen doors, a passing train).
//
// The street side is data-driven (region.json "subway"): each exit has a spot
// and the direction its stairs go down. The ground gets a hole there, so you
// really walk down the steps; at the bottom you arrive in the station hall
// (its own scene, like a shop). Walk up another exit's stairs to come out there.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Street stairwell, in the exit's own frame: +b runs down the stairs (from the
// mouth to the bottom), a runs across. The hole in the ground is w × l.
export const PIT = { w: 2.4, l: 6, depth: 3.2, run: 5 }; // steps over the first 5 m, then a landing
// A station's name with "역" / " Station" / "駅" / "站" on the end, but not
// twice: a name like 서울역 / Seoul Station already has it.
const STATION_SUFFIX = { ko: '역', en: ' Station', ja: '駅', zh: '站' };
export function stationName(name = {}) {
  return Object.fromEntries(Object.entries(name).map(([k, v]) => {
    const suf = STATION_SUFFIX[k] ?? '';
    return [k, suf && v.endsWith(suf.trim()) ? v : v + suf];
  }));
}
export const ENTER_AT = 0.8; // how far down the steps (0–1) you go below
const WALL = 0.3;

// World ↔ exit frame. Rotating by ry maps the exit's +b to (sin ry, cos ry).
export function toLocal(ex, x, z) {
  const dx = x - ex.at[0], dz = z - ex.at[1];
  const c = Math.cos(ex.ry), s = Math.sin(ex.ry);
  return [dx * c - dz * s, dx * s + dz * c];
}
export function toWorld(ex, a, b) {
  const c = Math.cos(ex.ry), s = Math.sin(ex.ry);
  return [ex.at[0] + a * c + b * s, ex.at[1] - a * s + b * c];
}
const rect = (ex, a0, a1, b0, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(([a, b]) => toWorld(ex, a, b));

// The hole in the ground (also where the steps are).
export const holeOf = (ex) => rect(ex, -PIT.w / 2, PIT.w / 2, -PIT.l / 2, PIT.l / 2);
// Walls you can't walk through: both sides and the far end. The mouth is open.
export function blockersOf(ex) {
  const h = PIT.w / 2, L = PIT.l / 2;
  return [
    { p: rect(ex, -h - WALL, -h, -L, L + WALL) },
    { p: rect(ex, h, h + WALL, -L, L + WALL) },
    { p: rect(ex, -h - WALL, h + WALL, L, L + WALL) },
  ];
}
// The whole entrance, for things that must not stand in it (street trees).
// (Keeps a clear patch in front of the mouth too.)
export const footprintOf = (ex, pad = 0.6) => ({ p: rect(ex, -PIT.w / 2 - WALL - pad, PIT.w / 2 + WALL + pad, -PIT.l / 2 - pad - 3, PIT.l / 2 + WALL + pad) });
// Where you come out: just outside the mouth, facing away from the stairs.
export function outsideOf(ex, dist = 1.6) {
  const [x, z] = toWorld(ex, 0, -PIT.l / 2 - dist);
  return { x, z, ry: ex.ry + Math.PI };
}

// Which stairwell (x, z) is in, how deep, and how far down the steps (0–1).
export function streetStairs(sub, x, z) {
  for (let i = 0; i < (sub?.exits?.length || 0); i++) {
    const ex = sub.exits[i];
    const [a, b] = toLocal(ex, x, z);
    if (Math.abs(a) > PIT.w / 2 || b < -PIT.l / 2 || b > PIT.l / 2) continue;
    const frac = Math.min(1, Math.max(0, (b + PIT.l / 2) / PIT.run));
    return { i, frac, y: -PIT.depth * frac };
  }
  return null;
}

// ---------- Station hall (its own scene) ----------
// Seen from above: the concourse at the west end (the stairs up to the exits,
// ticket machines), a row of ticket gates across the hall, then an island
// platform running east between two tracks: up trains on the south track,
// down trains on the north one, each behind screen doors.

export const HALL = { w: 52, d: 30, h: 4.4 };
export const GATE_X = -9; // ticket gates: the concourse is west (x < GATE_X), the platform east
export const GATE_LANES = [-3, -1.5, 0, 1.5, 3]; // lane centres (z)
export const FARE = 1550; // won (Seoul's card fare), paid at the gate on the way in (going out is free; see createReentry)
// Like Seoul's real rule: go out through the gates by mistake and come back in at
// the same station within 5 minutes, and the fare isn't charged again.
export const REENTRY_MS = 5 * 60 * 1000;

/**
 * The free re-entry pass. Only a paid trip earns one, on the way out; it works
 * once, at the station you left by, until 5 minutes after. Coming back in free
 * doesn't earn another, so you can't keep riding on one fare.
 */
export function createReentry() {
  let trip = null; // 'paid' | 'free' while you're through the gates
  let pass = null; // { station, until }
  const left = (station, now) => (pass && pass.station === station && now < pass.until ? pass.until - now : 0);
  return {
    /** Through the gates, paying or on the pass. */
    in(station, now, free = false) {
      if (free) { if (!left(station, now)) return false; pass = null; }
      trip = free ? 'free' : 'paid';
      return true;
    },
    /** Out through the gates. True when that earned a free way back in. */
    out(station, now) {
      const earned = trip === 'paid';
      trip = null;
      pass = earned ? { station, until: now + REENTRY_MS } : null;
      return earned;
    },
    /** Milliseconds left to come back in free at this station (0: pay). */
    left,
  };
}
export const DOOR_Z = 7.5; // screen doors on both sides of the island platform
const TRACK_Z = 10.6;
// Up trains run on the south track (+z), heading east; down trains on the north track.
export const TRACKS = [
  { dir: 1, z: TRACK_Z, doorZ: DOOR_Z, offset: 0 },
  { dir: -1, z: -TRACK_Z, doorZ: -DOOR_Z, offset: 7.5 },
];
// Standing at the gates? Which lane is nearest and which side you're on.
export function gateAt(x, z) {
  if (Math.abs(x - GATE_X) > 1.8 || z < GATE_LANES[0] - 1.2 || z > GATE_LANES[GATE_LANES.length - 1] + 1.2) return null;
  const lane = GATE_LANES.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
  return { lane, inside: x > GATE_X };
}

// Train timetable, the same for everyone (it runs on the clock): a train every
// 15 s on each track. It pulls in (2.5 s), stands with the doors open (5 s),
// then leaves (7.5 s). The two tracks are 7.5 s apart.
export const HEADWAY = 15, PULL_IN = 2.5, DOORS = 5;
export function trainPhase(tSec, offset = 0) {
  const t = (((tSec + offset) % HEADWAY) + HEADWAY) % HEADWAY;
  if (t < PULL_IN) return { phase: 'in', k: t / PULL_IN, left: PULL_IN - t };
  if (t < PULL_IN + DOORS) return { phase: 'open', k: (t - PULL_IN) / DOORS, left: PULL_IN + DOORS - t };
  return { phase: 'out', k: (t - PULL_IN - DOORS) / (HEADWAY - PULL_IN - DOORS), left: HEADWAY - t };
}

// Riding: stations form a loop in list order (main.js sorts them with
// loopOrder, so it follows the map). Up goes forward (clockwise), down backward.
export const STOP_SECONDS = 2.5;
export function stopsBetween(from, to, dir, n) {
  return ((((to - from) * dir) % n) + n) % n;
}
// The other stations in the order a train going dir reaches them.
export function lineAhead(from, dir, n) {
  const out = [];
  for (let k = 1; k < n; k++) out.push(((from + dir * k) % n + n) % n);
  return out;
}

export const STAIR = { w: 2.6, len: 7, rise: 3.4 };
export const HALL_EXIT_AT = 0.8;

// The stairs up to exit i, along the north and south walls of the concourse,
// climbing west. The foot faces into the concourse.
export function hallStairs(n) {
  return Array.from({ length: n }, (_, i) => {
    const side = i % 2 ? 1 : -1, row = i >> 1;
    const sgn = -1, top = -HALL.w / 2 + 0.5, foot = top + STAIR.len;
    const z = side * (HALL.d / 2 - 1.5 - row * 3.4);
    return { i, sgn, top, foot, z, w: STAIR.w, arrive: { x: foot + 1.4, z, ry: Math.PI / 2 } };
  });
}
// Height on the hall stairs at (x, z), and how far up (0–1), or null.
export function hallStairsAt(stairs, x, z) {
  for (const st of stairs) {
    if (Math.abs(z - st.z) > st.w / 2) continue;
    const along = (x - st.foot) * st.sgn;
    if (along < 0 || along > STAIR.len) continue;
    const frac = along / STAIR.len;
    return { i: st.i, frac, y: STAIR.rise * frac };
  }
  return null;
}

const mats = {};
export const mat = (c, o) => (mats[c + JSON.stringify(o || {})] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));

// Sign texture: Korean first, English (or the chosen language) below, as on
// real Seoul station signs. opts.num: an exit number box on the left.
export function signTexture(ko, sub2, { bg = '#f4f5f7', fg = '#22252b', num = null, numBg = '#f5a200', line = null, w = 512, h = 128 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  let x0 = 24;
  if (num != null) {
    g.fillStyle = numBg;
    g.beginPath(); g.roundRect(14, 14, h - 28, h - 28, 14); g.fill();
    g.fillStyle = '#1b1b1b';
    g.font = `900 ${h * 0.56}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(num), h / 2, h / 2 + 4);
    x0 = h + 4;
  }
  if (line) { // the line colour as a dot
    g.fillStyle = line;
    g.beginPath(); g.arc(x0 + 18, h * 0.36, 14, 0, Math.PI * 2); g.fill();
    x0 += 44;
  }
  g.fillStyle = fg;
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.font = `800 ${h * 0.36}px system-ui, sans-serif`;
  g.fillText(ko, x0, h * 0.36, w - x0 - 16);
  g.font = `600 ${h * 0.2}px system-ui, sans-serif`;
  g.fillStyle = fg + 'cc';
  if (sub2) g.fillText(sub2, x0, h * 0.75, w - x0 - 16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// A platform station board in the Seoul style: the station name large in the
// middle, the line colour as a band, and along the bottom the previous
// station (left) and the next one (right, with an arrow).
export function nameBoardTexture({ ko = '', en = '', code = '', line = '#00a84d', next = null, prev = null }) {
  const w = 1024, h = 288;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.fillStyle = line; g.fillRect(0, 196, w, 92); // line-colour band
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (code) { // station number in a line-colour ring
    g.lineWidth = 10; g.strokeStyle = line; g.fillStyle = '#fff';
    g.beginPath(); g.arc(150, 84, 52, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#22252b'; g.font = '800 44px system-ui, sans-serif';
    g.fillText(String(code), 150, 87);
  }
  g.fillStyle = '#22252b';
  g.font = '900 92px system-ui, sans-serif';
  g.fillText(ko, w / 2, 80, 560);
  g.font = '600 40px system-ui, sans-serif';
  g.fillStyle = '#555b66';
  g.fillText(en, w / 2, 152, 560);
  g.fillStyle = '#ffffff';
  if (next) {
    g.textAlign = 'right'; g.font = '800 46px system-ui, sans-serif';
    g.fillText(`${next.ko} ▶`, w - 28, 228, w / 2 - 40);
    g.font = '600 28px system-ui, sans-serif';
    g.fillText(`다음 역 Next · ${next.en}`, w - 72, 266, w / 2 - 90);
  }
  if (prev) {
    g.textAlign = 'left'; g.font = '700 38px system-ui, sans-serif';
    g.globalAlpha = 0.8;
    g.fillText(prev.ko, 28, 228, w / 2 - 40);
    g.font = '600 26px system-ui, sans-serif';
    g.fillText(`${prev.en} · 이전 역 Prev`, 28, 266, w / 2 - 40);
    g.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Hanging sign at the platform entrance: one direction on each half, each
// on the side its track is on as you look at it.
export function directionSignTexture(left, right, line) {
  const w = 1280, h = 160;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#2f3540'; g.fillRect(0, 0, w, h);
  g.fillStyle = line; g.fillRect(w / 2 - 3, 16, 6, h - 32);
  g.textBaseline = 'middle';
  const half = (t, x, align) => {
    if (!t) return;
    g.textAlign = align;
    g.fillStyle = '#ffd34d'; g.font = '900 50px system-ui, sans-serif';
    g.fillText(t[0], x, 56, w / 2 - 60);
    g.fillStyle = '#ffffff'; g.font = '600 34px system-ui, sans-serif';
    g.fillText(t[1], x, 116, w / 2 - 60);
  };
  half(left, 30, 'left');
  half(right, w - 30, 'right');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---------- The loop and its route map ----------

// Where a station is: the middle of its exits.
export const stationAt = (st) => {
  const ex = st.exits || [];
  if (!ex.length) return [0, 0];
  return [ex.reduce((a, e) => a + e.at[0], 0) / ex.length, ex.reduce((a, e) => a + e.at[1], 0) / ex.length];
};
// The order the trains run round the stations: the shortest loop through
// them on the map (nearest neighbour, then 2-opt), starting at the first
// station in the list and going clockwise as seen on the map (north up), so
// "Up" is clockwise. New stations in region.json slot in by where they are.
export function loopOrder(stations) {
  const n = stations.length;
  if (n < 4) return stations.slice();
  const P = stations.map(stationAt);
  const d = (i, j) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
  const tour = [0], left = new Set(stations.map((_, i) => i).slice(1));
  while (left.size) {
    const last = tour[tour.length - 1];
    let best = -1;
    for (const j of left) if (best < 0 || d(last, j) < d(last, best)) best = j;
    tour.push(best); left.delete(best);
  }
  for (let again = true, guard = 0; again && guard < 200; guard++) {
    again = false;
    for (let i = 0; i < n - 1; i++) for (let k = i + 2; k < n; k++) {
      const a = tour[i], b = tour[i + 1], c = tour[k], e = tour[(k + 1) % n];
      if (a === e) continue;
      if (d(a, c) + d(b, e) < d(a, b) + d(c, e) - 1e-6) {
        tour.splice(i + 1, k - i, ...tour.slice(i + 1, k + 1).reverse());
        again = true;
      }
    }
  }
  // Start at the first station; clockwise on a north-up map (x east, z south)
  // means a positive shoelace area.
  const at = tour.indexOf(0);
  let order = tour.slice(at).concat(tour.slice(0, at));
  let area = 0;
  for (let i = 0; i < n; i++) { const p = P[order[i]], q = P[order[(i + 1) % n]]; area += p[0] * q[1] - q[0] * p[1]; }
  if (area < 0) order = [order[0], ...order.slice(1).reverse()];
  return order.map((i) => stations[i]);
}

// Route map for the pillar on the platform: a simple diagram, not the real
// map (with 20+ stations the real shapes crowded and overlapped). The loop is
// a tall rounded rectangle; the stations stand evenly down its two long
// sides, the first station top right, Up trains going clockwise (down the
// right side, up the left). Every name is full size and beside its station,
// so it reads on a phone, and a new station just adds a row.
// The current station has a red ring; a red arrow shows the way Up trains go
// and a blue one the way Down trains go.
// stops: [{ name }] in loop order. lang: the second line's language (null = English).
export const ROUTE_MAP_TEXT = {
  title: { en: 'Route Map', ko: '노선도', ja: '路線図', zh: '线路图' },
  here: { en: 'You are here', ko: '현재 역', ja: '現在地', zh: '当前站' },
  up: { en: 'Up trains go clockwise', ko: '상행 열차 방향 (시계 방향)', ja: '上り列車は時計回り', zh: '上行列车顺时针行驶' },
  down: { en: 'Down trains go counter-clockwise', ko: '하행 열차 방향 (반시계 방향)', ja: '下り列車は反時計回り', zh: '下行列车逆时针行驶' },
  upShort: { en: 'Up', ko: '상행', ja: '上り', zh: '上行' },
  downShort: { en: 'Down', ko: '하행', ja: '下り', zh: '下行' },
  view: { en: 'View route map', ko: '노선도 자세히 보기', ja: '路線図を詳しく見る', zh: '查看线路图' },
  warn: { en: 'Riding the wrong way round can take longer!', ko: '반대 방향으로 타면 시간이 더 오래 걸릴 수 있어요!', ja: '逆方向に乗ると時間がもっとかかることがあります！', zh: '坐反方向可能要花更长时间！' },
  check: { en: 'Check the direction before you board.', ko: '타기 전에 방향을 확인하세요.', ja: '乗る前に方向を確認してください。', zh: '上车前请确认方向。' },
};
const UP_C = '#e02424', DOWN_C = '#1f6fd1';
const RM = { w: 1000, x0: 340, x1: 660, y0: 200, rad: 90, row: 112 };

// The canvas size and the loop for n stations: { w, h, rows, y1, legendY }.
export function routeMapSize(n) {
  const rows = Math.max(1, Math.ceil(n / 2));
  const y1 = RM.y0 + 2 * RM.rad + (rows - 1) * RM.row;
  const legendY = y1 + 90;
  return { w: RM.w, h: legendY + 3 * 64 + 230, rows, y1, legendY };
}

// The loop as a walk along its middle line, clockwise from the top middle:
// at(s) = { x, y, nx, ny } (n points out of the loop), L = its length.
function routeLoop(n) {
  const { x0, x1, y0, rad } = RM, { y1 } = routeMapSize(n);
  const side = y1 - y0 - 2 * rad, top = x1 - x0 - 2 * rad, q = Math.PI * rad / 2;
  const legs = [ // [length, at(t)] in order round the loop
    [top / 2, (t) => [x0 + rad + top / 2 + t, y0, 0, -1]],
    [q, (t) => { const a = -Math.PI / 2 + t / rad; return [x1 - rad + Math.cos(a) * rad, y0 + rad + Math.sin(a) * rad, Math.cos(a), Math.sin(a)]; }],
    [side, (t) => [x1, y0 + rad + t, 1, 0]],
    [q, (t) => { const a = t / rad; return [x1 - rad + Math.cos(a) * rad, y1 - rad + Math.sin(a) * rad, Math.cos(a), Math.sin(a)]; }],
    [top, (t) => [x1 - rad - t, y1, 0, 1]],
    [q, (t) => { const a = Math.PI / 2 + t / rad; return [x0 + rad + Math.cos(a) * rad, y1 - rad + Math.sin(a) * rad, Math.cos(a), Math.sin(a)]; }],
    [side, (t) => [x0, y1 - rad - t, -1, 0]],
    [q, (t) => { const a = Math.PI + t / rad; return [x0 + rad + Math.cos(a) * rad, y0 + rad + Math.sin(a) * rad, Math.cos(a), Math.sin(a)]; }],
    [top / 2, (t) => [x0 + rad + t, y0, 0, -1]],
  ];
  const L = legs.reduce((a, [len]) => a + len, 0);
  const at = (s) => {
    s = ((s % L) + L) % L;
    for (const [len, f] of legs) { if (s <= len) { const [x, y, nx, ny] = f(s); return { x, y, nx, ny }; } s -= len; }
    const [x, y, nx, ny] = legs[0][1](0); return { x, y, nx, ny };
  };
  // Where each station sits (distance along the loop): right side top to
  // bottom, then left side bottom to top.
  const nr = Math.ceil(n / 2), nl = n - nr, startR = top / 2 + q, startL = startR + side + q + top + q;
  const down = (k, cnt) => (cnt === 1 ? side / 2 : side * k / (cnt - 1));
  const S = Array.from({ length: n }, (_, i) => (i < nr ? startR + down(i, nr) : startL + down(i - nr, nl)));
  return { L, at, S, gap: RM.row, legs };
}

// Where each station is on the canvas ([x, y]), e.g. to scroll the map to it.
export function routeLayout(stops) {
  const { at, S } = routeLoop(stops.length);
  return S.map((s) => { const p = at(s); return [p.x, p.y]; });
}

export function drawRouteMap(c, { stops = [], index = 0, lang = null, line = '#2fb24a' } = {}) {
  const n = stops.length, { w, h, legendY } = routeMapSize(n);
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tx = (o) => o[lang] || o.en;
  const second = (nm) => (lang && lang !== 'ko' && nm[lang]) || nm.en || '';
  const both = (o) => [o.ko, lang && lang !== 'ko' && lang !== 'en' ? tx(o) : o.en];
  const font = (wt, px) => { g.font = `${wt} ${px}px system-ui, sans-serif`; };
  // Shrink a font until txt fits in maxW (down to 60%).
  const fit = (txt, wt, px, maxW) => { let f = px; font(wt, f); while (f > px * 0.6 && g.measureText(txt).width > maxW) font(wt, --f); };
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  // Header.
  g.fillStyle = '#2f3540'; g.fillRect(0, 0, w, 110);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const [t1, t2] = both(ROUTE_MAP_TEXT.title);
  g.fillStyle = '#ffffff'; font(900, 54); g.fillText(t1, w / 2 - 100, 58);
  g.fillStyle = '#ffd34d'; font(600, 38); g.fillText(t2, w / 2 + 110, 60, 300);

  const { at, S, gap, legs } = routeLoop(n);
  // The line.
  g.strokeStyle = line; g.lineWidth = 22; g.lineJoin = 'round';
  g.beginPath();
  let first = true;
  for (let s = 0, L = legs.reduce((a, [len]) => a + len, 0); s <= L; s += 4) {
    const p = at(s);
    if (first) { g.moveTo(p.x, p.y); first = false; } else g.lineTo(p.x, p.y);
  }
  g.closePath(); g.stroke();

  // Arrows from here, just inside the loop: red towards the next station
  // (Up), blue towards the previous one (Down), each labelled.
  if (n > 1) {
    // Each label in the middle of the loop, level with its arrow; when the
    // two would meet (here near a corner), each moves the way its arrow goes.
    const arrow = (dir, color, label) => {
      const pts = [];
      for (let t = 0.25; t <= 0.751; t += 0.025) { const p = at(S[index] + dir * t * gap); pts.push([p.x - p.nx * 36, p.y - p.ny * 36]); }
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 11; g.lineCap = 'round';
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 3], an = Math.atan2(ay - by, ax - bx);
      g.beginPath(); for (const d of [0, 2.3, -2.3]) g.lineTo(ax + Math.cos(an + d) * 24, ay + Math.sin(an + d) * 24); g.closePath(); g.fill();
      return { color, label, y: pts[Math.floor(pts.length / 2)][1], tip: ay };
    };
    const tags = [arrow(1, UP_C, both(ROUTE_MAP_TEXT.upShort)), arrow(-1, DOWN_C, both(ROUTE_MAP_TEXT.downShort))];
    if (Math.abs(tags[0].y - tags[1].y) < 64) {
      const mid = (tags[0].y + tags[1].y) / 2, [lo, hi] = tags[0].tip > tags[1].tip ? [tags[1], tags[0]] : tags;
      lo.y = mid - 32; hi.y = mid + 32;
    }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.strokeStyle = '#ffffff'; g.lineWidth = 7;
    const cx = (RM.x0 + RM.x1) / 2 + (at(S[index]).nx > 0 ? -20 : 20);
    for (const { color, label, y } of tags) {
      g.fillStyle = color;
      font(900, 26); g.strokeText(label[0], cx, y - 12, 150); g.fillText(label[0], cx, y - 12, 150);
      font(700, 19); g.strokeText(label[1], cx, y + 13, 150); g.fillText(label[1], cx, y + 13, 150);
    }
  }

  // Stations: a white circle on the line, the name beside it outside.
  const big = 42, small = 27;
  for (let i = 0; i < n; i++) {
    const p = at(S[i]), cur = i === index, nm = stops[i].name || {};
    g.fillStyle = '#ffffff'; g.strokeStyle = cur ? UP_C : '#3b3f47'; g.lineWidth = cur ? 9 : 7;
    g.beginPath(); g.arc(p.x, p.y, cur ? 22 : 16, 0, Math.PI * 2); g.fill(); g.stroke();
    if (cur) { g.lineWidth = 6; g.beginPath(); g.arc(p.x, p.y, 36, 0, Math.PI * 2); g.stroke(); }
    const right = p.nx > 0, ax = p.x + (right ? 1 : -1) * (cur ? 48 : 32), maxW = right ? w - ax - 14 : ax - 14;
    const top = p.y - (big + small + 6) / 2;
    g.textAlign = right ? 'left' : 'right'; g.textBaseline = 'top';
    const n1 = nm.ko || nm.en || '', n2 = second(nm);
    g.fillStyle = cur ? UP_C : '#22252b'; fit(n1, 900, big, maxW); g.fillText(n1, ax, top, maxW);
    g.fillStyle = cur ? UP_C : '#555b66'; fit(n2, 600, small, maxW); g.fillText(n2, ax, top + big + 6, maxW);
  }

  // Legend: the red ring, the red (Up) and blue (Down) arrows.
  g.textAlign = 'left'; g.textBaseline = 'middle';
  const lx = 60, row = (y, draw, txt, color, color2 = '#555b66') => {
    draw(y);
    g.fillStyle = color; fit(txt[0], 800, 30, w - lx - 130); g.fillText(txt[0], lx + 70, y - 15, w - lx - 130);
    g.fillStyle = color2; fit(txt[1], 600, 23, w - lx - 130); g.fillText(txt[1], lx + 70, y + 16, w - lx - 130);
  };
  const here = both(ROUTE_MAP_TEXT.here);
  row(legendY, (y) => { g.strokeStyle = UP_C; g.fillStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(lx + 22, y, 20, 0, Math.PI * 2); g.fill(); g.stroke(); }, here, UP_C, UP_C);
  const legendArrow = (color) => (y) => {
    g.strokeStyle = color; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(lx - 4, y); g.lineTo(lx + 30, y); g.stroke();
    g.fillStyle = color; g.beginPath(); g.moveTo(lx + 50, y); g.lineTo(lx + 26, y - 16); g.lineTo(lx + 26, y + 16); g.closePath(); g.fill();
  };
  row(legendY + 64, legendArrow(UP_C), both(ROUTE_MAP_TEXT.up), UP_C);
  row(legendY + 128, legendArrow(DOWN_C), both(ROUTE_MAP_TEXT.down), DOWN_C);
  // Warning at the bottom: the wrong way round takes longer.
  const by0 = legendY + 180;
  g.fillStyle = '#fff4d6'; g.strokeStyle = '#f2b01e'; g.lineWidth = 6;
  g.beginPath(); g.roundRect(30, by0, w - 60, 190, 22); g.fill(); g.stroke();
  g.textAlign = 'center';
  const wn = both(ROUTE_MAP_TEXT.warn), ck = both(ROUTE_MAP_TEXT.check);
  g.fillStyle = '#b3261e'; fit('⚠ ' + wn[0], 900, 36, w - 100); g.fillText('⚠ ' + wn[0], w / 2, by0 + 42, w - 100);
  g.fillStyle = '#22252b'; fit(wn[1], 700, 28, w - 100); g.fillText(wn[1], w / 2, by0 + 88, w - 100);
  g.fillStyle = '#555b66'; font(600, 25); g.fillText(ck[0], w / 2, by0 + 128, w - 100);
  g.fillText(ck[1], w / 2, by0 + 160, w - 100);
}

export function signMesh(tex, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

// ---------- Street entrances ----------

const SOLID = new THREE.MeshLambertMaterial({ vertexColors: true });
const DOOR = new THREE.MeshBasicMaterial({ color: '#fff6dc' });
export function glass(opacity = 0.25) {
  return mat('#bfe4f2', { transparent: true, opacity, depthWrite: false });
}

export class SubwayEntrances {
  constructor(scene, sub) {
    this.sub = sub;
    this.items = (sub?.exits || []).map((ex, i) => this._build(scene, ex, i));
  }

  _build(scene, ex, i) {
    const line = this.sub.line?.color || '#f5a200';
    const g = new THREE.Group();
    g.position.set(ex.at[0], 0, ex.at[1]);
    g.rotation.y = ex.ry;
    // Every box is gathered by kind and merged at the end: one mesh for the
    // solid parts (coloured per vertex), one for the glass, plus the lit
    // doorway and the two signs. It was 58 meshes, one draw call each.
    const parts = { solid: [], glass: [], door: [] };
    const box = (sx, sy, sz, x, y, z, color, kind = 'solid', rx = 0) => {
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      if (rx) geo.rotateX(rx);
      geo.translate(x, y, z);
      geo.deleteAttribute('uv');
      if (kind === 'solid') {
        const c = new THREE.Color(color), n = geo.attributes.position.count, a = new Float32Array(n * 3);
        for (let k = 0; k < n; k++) c.toArray(a, k * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
      }
      parts[kind].push(geo);
    };
    const { w, l, depth, run } = PIT;
    const L = l / 2, hw = w / 2;
    const tile = '#d9dde3', stone = '#b9bec7', steel = '#5d6470', stepM = '#9aa1ab', nose = '#f2c230';
    // Steps down, then a landing and a lit doorway at the bottom.
    const n = 16, stepRun = run / n, rise = depth / n;
    for (let k = 0; k < n; k++) {
      const top = -(k + 1) * rise, b = -L + (k + 0.5) * stepRun;
      box(w, 0.3, stepRun, 0, top - 0.15, b, stepM);
      box(w, 0.02, 0.06, 0, top + 0.005, b - stepRun / 2 + 0.03, nose); // yellow step edges
    }
    box(w, 0.3, l - run + 0.02, 0, -depth - 0.15, L - (l - run) / 2, stepM);
    // Stairwell walls (below the street) and the far wall with the doorway.
    for (const s of [-1, 1]) {
      box(0.2, depth + 0.6, l + 0.2, s * (hw + 0.1), -(depth + 0.6) / 2, 0, tile);
      box(0.05, 0.25, l, s * (hw - 0.02), -1.6, 0, line); // a stripe in the line colour
      box(0.06, 0.06, Math.hypot(run, depth) + 0.2, s * (hw - 0.12), -depth / 2 + 0.9, -L + run / 2, steel, 'solid', Math.atan2(depth, run)); // handrail
    }
    box(w + 0.4, depth + 0.6, 0.2, 0, -(depth + 0.6) / 2, L + 0.1, tile);
    box(1.6, 2.2, 0.04, 0, -depth + 1.1, L - 0.01, null, 'door');
    // Above the street: low stone walls with glass on top, posts and a glass roof.
    for (const s of [-1, 1]) {
      box(WALL, 1.0, l + WALL, s * (hw + WALL / 2), 0.5, WALL / 2, stone);
      box(0.04, 1.6, l + WALL, s * (hw + WALL / 2), 1.8, WALL / 2, null, 'glass');
      for (const b of [-L, L + WALL / 2]) box(0.14, 2.75, 0.14, s * (hw + WALL / 2), 1.375, b, steel);
    }
    box(w + WALL * 2, 1.0, WALL, 0, 0.5, L + WALL / 2, stone);
    box(w + WALL * 2, 1.6, 0.04, 0, 1.8, L + WALL / 2, null, 'glass');
    box(w + 1.0, 0.08, l + 1.0, 0, 2.78, WALL / 2, null, 'glass'); // the roof (was a little less clear than the walls; one glass now)
    for (const s of [-1, 1]) box(0.1, 0.12, l + 1.0, s * (hw + 0.5), 2.74, WALL / 2, steel);
    box(w + 1.0, 0.12, 0.1, 0, 2.74, -L - 0.35, steel);
    // Signs on the front (above the mouth) and the back.
    const front = signMesh(null, w + 0.8, (w + 0.8) / 4);
    front.position.set(0, 3.15, -L - 0.4);
    front.rotation.y = Math.PI;
    const back = front.clone();
    back.material = front.material.clone();
    back.position.set(0, 3.15, L + WALL + 0.25);
    back.rotation.y = 0;
    box(w + 0.9, (w + 0.8) / 4 + 0.1, 0.12, 0, 3.15, -L - 0.33, steel); // sign holders
    box(w + 0.9, (w + 0.8) / 4 + 0.1, 0.12, 0, 3.15, L + WALL + 0.18, steel);
    g.add(new THREE.Mesh(mergeGeometries(parts.solid), SOLID));
    g.add(new THREE.Mesh(mergeGeometries(parts.glass), glass()));
    const door = new THREE.Mesh(parts.door[0], DOOR);
    door.name = 'doorway';
    g.add(door, front, back);
    scene.add(g);
    const it = { ex, n: ex.n ?? i + 1, group: g, signs: [front, back] };
    this._sign(it, false, 'en');
    return it;
  }

  _sign(it, translated, lang) {
    const name = this.sub.name || {};
    const second = translated ? (name[lang] || name.en) : name.en;
    const ko = stationName(name).ko || '역';
    const tex = signTexture(ko, `${second} · Exit ${it.n}`, { num: it.n, line: this.sub.line?.color });
    for (const s of it.signs) { s.material.map?.dispose(); s.material.map = tex; s.material.needsUpdate = true; }
  }

  // "Translate signs": the second line in the chosen language.
  setTranslated(on, lang) { for (const it of this.items) this._sign(it, on, lang); }
}

// Drinks from the station vending machines: all cheap (1 coin), all
// non-alcoholic, so each one works like a coffee (sips that refill stamina).
export const VENDING_DRINKS = [
  { id: 'black-coffee', icon: '☕', price: 700, name: { ko: '블랙커피', en: 'Black coffee', ja: 'ブラックコーヒー', zh: '黑咖啡' } },
  { id: 'milk-coffee', icon: '☕', price: 700, name: { ko: '밀크커피', en: 'Milk coffee', ja: 'ミルクコーヒー', zh: '牛奶咖啡' } },
  { id: 'yuja-tea', icon: '🍋', price: 1000, name: { ko: '유자차', en: 'Yuja tea', ja: 'ゆず茶', zh: '柚子茶' } },
  { id: 'hot-choco', icon: '🍫', price: 1000, name: { ko: '핫초코', en: 'Hot chocolate', ja: 'ホットチョコ', zh: '热巧克力' } },
  { id: 'energy', icon: '⚡', price: 1500, name: { ko: '에너지음료', en: 'Energy drink', ja: 'エナジードリンク', zh: '能量饮料' } },
  { id: 'vitamin', icon: '🍊', price: 1200, name: { ko: '비타민음료', en: 'Vitamin drink', ja: 'ビタミンドリンク', zh: '维生素饮料' } },
  { id: 'cider', icon: '🥤', price: 1500, name: { ko: '사이다', en: 'Lemon-lime soda (cider)', ja: 'サイダー', zh: '汽水' } },
  { id: 'barley-tea', icon: '🍵', price: 1300, name: { ko: '보리차', en: 'Barley tea', ja: '麦茶', zh: '大麦茶' } },
  { id: 'water', icon: '💧', price: 1000, name: { ko: '생수', en: 'Bottled water', ja: 'ミネラルウォーター', zh: '矿泉水' } },
];
