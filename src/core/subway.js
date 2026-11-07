// Underground subway station: stair exits on the street and a station hall
// below (concourse, ticket gates, platform with screen doors, a passing train).
//
// The street side is data-driven (region.json "subway"): each exit has a spot
// and the direction its stairs go down. The ground gets a hole there, so you
// really walk down the steps; at the bottom you arrive in the station hall
// (its own scene, like a shop). Walk up another exit's stairs to come out there.
import * as THREE from 'three';

// Street stairwell, in the exit's own frame: +b runs down the stairs (from the
// mouth to the bottom), a runs across. The hole in the ground is w × l.
export const PIT = { w: 2.4, l: 6, depth: 3.2, run: 5 }; // steps over the first 5 m, then a landing
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
export const FARE = 2; // coins, paid at the gate on the way in (going out is free)
export const DOOR_Z = 7.5; // screen doors on both sides of the island platform
const TRACK_Z = 10.6;
const PLAT_X = [-8.5, 25.5];
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

// Riding: stations form a loop in list order. Up goes forward, down backward.
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

const STAIR = { w: 2.6, len: 7, rise: 3.4 };
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
const mat = (c, o) => (mats[c + JSON.stringify(o || {})] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));

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

// Route map for the pillar inside the ticket gates: all stations on one loop
// (a rounded rectangle), in the order the trains run. The first station sits
// at the top and the rest follow clockwise, the way "Up" trains go. The
// current station has a red ring and a red arrow shows the Up direction.
// lang: the second line's language (null = English).
export const ROUTE_MAP_TEXT = {
  title: { en: 'Route Map', ko: '노선도', ja: '路線図', zh: '线路图' },
  here: { en: 'You are here', ko: '현재 역', ja: '現在地', zh: '当前站' },
  up: { en: 'Up trains go clockwise', ko: '상행 열차 방향 (시계 방향)', ja: '上り列車は時計回り', zh: '上行列车顺时针行驶' },
  warn: { en: 'Riding the wrong way round can take longer!', ko: '반대 방향으로 타면 시간이 더 오래 걸릴 수 있어요!', ja: '逆方向に乗ると時間がもっとかかることがあります！', zh: '坐反方向可能要花更长时间！' },
  check: { en: 'Check the direction before you board.', ko: '타기 전에 방향을 확인하세요.', ja: '乗る前に方向を確認してください。', zh: '上车前请确认方向。' },
};
export const ROUTE_MAP = { w: 1024, h: 1560 };
export function drawRouteMap(c, { stops = [], index = 0, lang = null, line = '#2fb24a' } = {}) {
  const { w, h } = ROUTE_MAP;
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tx = (o) => o[lang] || o.en;
  const second = (nm) => (lang && lang !== 'ko' && nm[lang]) || nm.en || '';
  const both = (o) => [o.ko, lang && lang !== 'ko' && lang !== 'en' ? tx(o) : o.en];
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  // Header.
  g.fillStyle = '#2f3540'; g.fillRect(0, 0, w, 150);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
  const [t1, t2] = both(ROUTE_MAP_TEXT.title);
  g.font = '900 64px system-ui, sans-serif'; g.fillText(t1, w / 2, 60);
  g.font = '600 38px system-ui, sans-serif'; g.fillStyle = '#ffd34d'; g.fillText(t2, w / 2, 118);

  // The loop: a rounded rectangle, measured by length so stations are evenly spaced.
  const x0 = 330, x1 = w - 330, y0 = 350, y1 = 1080, r = 70;
  const W = x1 - x0, H = y1 - y0, sw = W - 2 * r, sh = H - 2 * r, arc = (Math.PI / 2) * r;
  const segs = [ // clockwise from the top centre
    { len: sw / 2, at: (u) => [w / 2 + u, y0, 'top'] },
    { len: arc, at: (u) => { const a = -Math.PI / 2 + u / r; return [x1 - r + r * Math.cos(a), y0 + r + r * Math.sin(a), 'tr']; } },
    { len: sh, at: (u) => [x1, y0 + r + u, 'right'] },
    { len: arc, at: (u) => { const a = u / r; return [x1 - r + r * Math.cos(a), y1 - r + r * Math.sin(a), 'br']; } },
    { len: sw, at: (u) => [x1 - r - u, y1, 'bottom'] },
    { len: arc, at: (u) => { const a = Math.PI / 2 + u / r; return [x0 + r + r * Math.cos(a), y1 - r + r * Math.sin(a), 'bl']; } },
    { len: sh, at: (u) => [x0, y1 - r - u, 'left'] },
    { len: arc, at: (u) => { const a = Math.PI + u / r; return [x0 + r + r * Math.cos(a), y0 + r + r * Math.sin(a), 'tl']; } },
    { len: sw / 2, at: (u) => [x0 + r + u, y0, 'top'] },
  ];
  const P = segs.reduce((a, s) => a + s.len, 0);
  const pointAt = (d) => {
    d = ((d % P) + P) % P;
    for (const s of segs) { if (d <= s.len) return s.at(d); d -= s.len; }
    return segs[0].at(0);
  };
  g.lineWidth = 26; g.strokeStyle = line; g.lineJoin = 'round';
  g.beginPath(); g.roundRect(x0, y0, W, H, r); g.stroke();

  const n = Math.max(1, stops.length), gap = P / n;
  // Red arrow along the inside of the loop, from here towards the next station (Up).
  if (n > 1) {
    const inset = 46, from = index * gap + 34, to = index * gap + gap * 0.62;
    const cx = w / 2, cy = (y0 + y1) / 2;
    const inner = (d) => { // pull the point towards the centre of the loop
      const [px, py] = pointAt(d);
      const dx = cx - px, dy = cy - py;
      const kx = Math.abs(px - cx) > W / 2 - r - 1 ? Math.sign(dx) * inset : 0;
      const ky = Math.abs(py - cy) > H / 2 - r - 1 ? Math.sign(dy) * inset : 0;
      return [px + kx, py + ky];
    };
    g.strokeStyle = '#e02424'; g.fillStyle = '#e02424'; g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath();
    for (let k = 0; k <= 40; k++) { const [px, py] = inner(from + (to - from) * k / 40); k ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.stroke();
    const [ax, ay] = inner(to), [bx, by] = inner(to - 6);
    const ang = Math.atan2(ay - by, ax - bx);
    g.beginPath();
    g.moveTo(ax + Math.cos(ang) * 30, ay + Math.sin(ang) * 30);
    g.lineTo(ax + Math.cos(ang + 2.3) * 30, ay + Math.sin(ang + 2.3) * 30);
    g.lineTo(ax + Math.cos(ang - 2.3) * 30, ay + Math.sin(ang - 2.3) * 30);
    g.closePath(); g.fill();
  }
  // Stations: a white circle on the line, the name outside the loop.
  stops.forEach((nm, k) => {
    const [px, py, side] = pointAt(k * gap);
    const cur = k === index;
    g.fillStyle = '#ffffff'; g.strokeStyle = cur ? '#e02424' : '#3b3f47'; g.lineWidth = cur ? 10 : 7;
    g.beginPath(); g.arc(px, py, cur ? 28 : 22, 0, Math.PI * 2); g.fill(); g.stroke();
    if (cur) { g.lineWidth = 8; g.beginPath(); g.arc(px, py, 50, 0, Math.PI * 2); g.stroke(); }
    let lx = px, ly = py, align = 'center';
    if (side === 'right' || side === 'tr' || side === 'br') { lx = px + (cur ? 66 : 44); align = 'left'; }
    else if (side === 'left' || side === 'tl' || side === 'bl') { lx = px - (cur ? 66 : 44); align = 'right'; }
    if (side === 'top') ly = py - (cur ? 158 : 126);
    else if (side === 'bottom') ly = py + (cur ? 60 : 36);
    else if (side === 'tr' || side === 'tl') ly = py - 70;
    else if (side === 'br' || side === 'bl') ly = py + 6;
    else ly = py - 50;
    const maxW = align === 'center' ? 520 : align === 'left' ? w - lx - 14 : lx - 14;
    g.textAlign = align; g.textBaseline = 'top';
    g.fillStyle = cur ? '#e02424' : '#22252b';
    g.font = `900 ${cur ? 52 : 46}px system-ui, sans-serif`;
    g.fillText(nm.ko || nm.en || '', lx, ly, maxW);
    g.fillStyle = cur ? '#e02424' : '#555b66';
    g.font = '600 32px system-ui, sans-serif';
    g.fillText(second(nm), lx, ly + (cur ? 58 : 52), maxW);
  });
  // In the middle of the loop: which way Up trains go.
  const up = both(ROUTE_MAP_TEXT.up), here = both(ROUTE_MAP_TEXT.here);
  const cy = (y0 + y1) / 2;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#e8eaee'; g.font = '700 240px system-ui, sans-serif'; g.fillText('↻', w / 2, cy - 30);
  // Legend under the loop: the red ring and the red arrow.
  const lgY = 1250;
  g.textAlign = 'left';
  g.strokeStyle = '#e02424'; g.fillStyle = '#fff'; g.lineWidth = 7;
  g.beginPath(); g.arc(80, lgY, 20, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#e02424'; g.font = '800 32px system-ui, sans-serif'; g.fillText(here[0], 118, lgY - 16, 330);
  g.font = '600 26px system-ui, sans-serif'; g.fillText(here[1], 118, lgY + 18, 330);
  g.strokeStyle = '#e02424'; g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(452, lgY); g.lineTo(500, lgY); g.stroke();
  g.fillStyle = '#e02424'; g.beginPath(); g.moveTo(520, lgY); g.lineTo(496, lgY - 16); g.lineTo(496, lgY + 16); g.closePath(); g.fill();
  g.fillStyle = '#22252b'; g.font = '800 28px system-ui, sans-serif'; g.fillText(up[0], 540, lgY - 16, w - 580);
  g.fillStyle = '#555b66'; g.font = '600 24px system-ui, sans-serif'; g.fillText(up[1], 540, lgY + 18, w - 580);
  // Warning at the bottom: the wrong way round takes longer.
  g.textAlign = 'center';
  const by0 = 1320;
  g.fillStyle = '#fff4d6'; g.strokeStyle = '#f2b01e'; g.lineWidth = 6;
  g.beginPath(); g.roundRect(40, by0, w - 80, 210, 24); g.fill(); g.stroke();
  const wn = both(ROUTE_MAP_TEXT.warn), ck = both(ROUTE_MAP_TEXT.check);
  g.fillStyle = '#b3261e'; g.font = '900 40px system-ui, sans-serif'; g.fillText('⚠ ' + wn[0], w / 2, by0 + 46, w - 130);
  g.fillStyle = '#22252b'; g.font = '700 32px system-ui, sans-serif'; g.fillText(wn[1], w / 2, by0 + 98, w - 130);
  g.fillStyle = '#555b66'; g.font = '600 28px system-ui, sans-serif'; g.fillText(`${ck[0]} · ${ck[1]}`, w / 2, by0 + 158, w - 130);
}

function signMesh(tex, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

// ---------- Street entrances ----------

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
    const box = (sx, sy, sz, x, y, z, m) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
      o.position.set(x, y, z);
      g.add(o);
      return o;
    };
    const { w, l, depth, run } = PIT;
    const L = l / 2, hw = w / 2;
    const tile = mat('#d9dde3'), stone = mat('#b9bec7'), steel = mat('#5d6470'), stepM = mat('#9aa1ab'), nose = mat('#f2c230');
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
      box(0.05, 0.25, l, s * (hw - 0.02), -1.6, 0, mat(line)); // a stripe in the line colour
      const rail = box(0.06, 0.06, Math.hypot(run, depth) + 0.2, s * (hw - 0.12), 0, 0, steel); // handrail
      rail.position.set(s * (hw - 0.12), -depth / 2 + 0.9, -L + run / 2);
      rail.rotation.x = Math.atan2(depth, run);
    }
    box(w + 0.4, depth + 0.6, 0.2, 0, -(depth + 0.6) / 2, L + 0.1, tile);
    const door = box(1.6, 2.2, 0.04, 0, -depth + 1.1, L - 0.01, new THREE.MeshBasicMaterial({ color: '#fff6dc' }));
    door.name = 'doorway';
    // Above the street: low stone walls with glass on top, posts and a glass roof.
    for (const s of [-1, 1]) {
      box(WALL, 1.0, l + WALL, s * (hw + WALL / 2), 0.5, WALL / 2, stone);
      box(0.04, 1.6, l + WALL, s * (hw + WALL / 2), 1.8, WALL / 2, glass());
      for (const b of [-L, L + WALL / 2]) box(0.14, 2.75, 0.14, s * (hw + WALL / 2), 1.375, b, steel);
    }
    box(w + WALL * 2, 1.0, WALL, 0, 0.5, L + WALL / 2, stone);
    box(w + WALL * 2, 1.6, 0.04, 0, 1.8, L + WALL / 2, glass());
    box(w + 1.0, 0.08, l + 1.0, 0, 2.78, WALL / 2, glass(0.35));
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
    g.add(front, back);
    scene.add(g);
    const it = { ex, n: ex.n ?? i + 1, group: g, signs: [front, back] };
    this._sign(it, false, 'en');
    return it;
  }

  _sign(it, translated, lang) {
    const name = this.sub.name || {};
    const second = translated ? (name[lang] || name.en) : name.en;
    const ko = (name.ko || '') + '역';
    const tex = signTexture(ko, `${second} · Exit ${it.n}`, { num: it.n, line: this.sub.line?.color });
    for (const s of it.signs) { s.material.map?.dispose(); s.material.map = tex; s.material.needsUpdate = true; }
  }

  // "Translate signs": the second line in the chosen language.
  setTranslated(on, lang) { for (const it of this.items) this._sign(it, on, lang); }
}

function glass(opacity = 0.25) {
  return mat('#bfe4f2', { transparent: true, opacity, depthWrite: false });
}

// ---------- The station hall ----------

// store.subway: the station's data; store.towards: { up, down } names of the
// next station each way (or null when there's nowhere to go).
export function buildStation(store, ROOM) {
  const sub = store.subway;
  const line = sub.line?.color || '#f5a200';
  const { w, d, h } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a2d33');
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bcc4, 2.0));
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const colliders = [];
  const block = (x0, z0, x1, z1) => colliders.push({ p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  const box = (sx, sy, sz, x, y, z, m, parent = scene) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof m === 'string' ? mat(m) : m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const sign = (tex, sw, sh, x, y, z, ry = 0) => {
    const m = signMesh(tex, sw, sh);
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
    return m;
  };
  const name = sub.name || {};
  const lineName = sub.line?.name || {};

  // Floor; yellow tactile strips along both platform edges.
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tileTexture(w, d) })));
  const platL = PLAT_X[1] - PLAT_X[0], platC = (PLAT_X[0] + PLAT_X[1]) / 2;
  for (const s of [-1, 1]) box(platL, 0.02, 0.5, platC, 0.01, s * (DOOR_Z - 0.6), '#f2c230');
  // Walls (inward-facing, so the camera can look in from outside), with a
  // stripe in the line colour.
  const wallM = new THREE.MeshLambertMaterial({ color: '#e6e8ec' });
  const wall = (len, x, z, ry, color) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h + 1), color ? mat(color) : wallM);
    m.position.set(x, (h - 1) / 2, z); m.rotation.y = ry; scene.add(m);
    if (color) return;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.35), mat(line));
    s.position.set(x + Math.sin(ry) * 0.01, 2.2, z + Math.cos(ry) * 0.01); s.rotation.y = ry; scene.add(s);
  };
  const cw = GATE_X + w / 2; // concourse width
  wall(cw, -w / 2 + cw / 2, -d / 2, 0);
  wall(cw, -w / 2 + cw / 2, d / 2, Math.PI);
  wall(d, -w / 2, 0, Math.PI / 2);
  wall(platL + 0.5, platC, -d / 2, 0, '#3a3d44'); // tunnel walls behind the tracks
  wall(platL + 0.5, platC, d / 2, Math.PI, '#3a3d44');
  wall(d, w / 2, 0, -Math.PI / 2, '#3a3d44');

  // Tracks: a sunken bed with rails, walled off from the concourse.
  for (const tr of TRACKS) {
    const z0 = Math.sign(tr.z) * DOOR_Z, z1 = Math.sign(tr.z) * d / 2;
    box(platL + 0.5, 0.1, Math.abs(z1 - z0), platC, -0.9, (z0 + z1) / 2, '#3a3d44');
    for (const off of [-0.7, 0.7]) box(platL + 0.5, 0.08, 0.08, platC, -0.8, tr.z + off, '#9aa1ab');
    block(GATE_X - 0.3, Math.min(z0, z1), w / 2, Math.max(z0, z1));
    // The end of the track zone facing the concourse: a wall with the line stripe.
    box(0.3, h, Math.abs(z1 - z0), GATE_X - 0.15, h / 2, (z0 + z1) / 2, '#d9dde3');
  }

  // Screen doors along both platform edges: glass on a frame; each pair slides
  // open while a train stands there.
  const doors = [[], []];
  const pitch = 4.25;
  for (let t = 0; t < 2; t++) {
    const z = TRACKS[t].doorZ;
    for (let x = PLAT_X[0] + pitch / 2; x < PLAT_X[1]; x += pitch) {
      box(0.18, 2.5, 0.18, x - pitch / 2 + 0.09, 1.25, z, '#8a919c');
      for (const s of [-1, 1]) doors[t].push({ pane: box(1.0, 2.1, 0.05, x + s * 0.5, 1.05, z, glass(0.4)), x0: x + s * 0.5, s });
      box(pitch - 0.2, 0.3, 0.2, x, 2.45, z, '#30343b');
    }
  }

  // Concourse: ticket machines and the station sign on the west wall.
  for (let k = 0; k < 3; k++) {
    const z = -2.2 + k * 2.2;
    box(0.6, 1.7, 1.6, -w / 2 + 0.35, 0.85, z, '#3c6fb4');
    box(0.04, 0.6, 1.1, -w / 2 + 0.67, 1.25, z, '#d8ecff');
  }
  block(-w / 2, -3.4, -w / 2 + 0.75, 3.4);
  // Two drink vending machines against the north wall of the concourse.
  const vending = [];
  {
    const cans = ['#2b2b2b', '#c8a27a', '#f2c230', '#6b3b22', '#1fb34f', '#ff8a1c', '#7fd1ff', '#c9a15a', '#e8f4ff'];
    for (const [k, vx] of [-15.6, -14.3].entries()) {
      const vz = -d / 2 + 0.45;
      box(1.15, 1.95, 0.8, vx, 0.975, vz, k ? '#2f6fd0' : '#d8342c');
      box(0.95, 1.0, 0.04, vx, 1.35, vz + 0.41, new THREE.MeshBasicMaterial({ color: '#f7fbff' })); // lit window
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        box(0.16, 0.24, 0.04, vx - 0.3 + c * 0.3, 1.05 + r * 0.32, vz + 0.44, new THREE.MeshBasicMaterial({ color: cans[(r * 3 + c + k * 4) % cans.length] }));
      }
      box(0.7, 0.18, 0.06, vx, 0.35, vz + 0.42, '#1b1d22'); // the slot drinks drop into
      box(0.16, 0.3, 0.05, vx + 0.42, 0.85, vz + 0.42, '#c9ced6'); // coin slot and buttons
      block(vx - 0.6, vz - 0.4, vx + 0.6, vz + 0.4);
      vending.push({ x: vx, z: vz + 0.95 });
    }
    sign(signTexture('음료 자판기', 'Drinks · 🪙 1', { line, w: 512, h: 128 }), 2.4, 0.6, -14.95, 2.35, -d / 2 + 0.03, 0);
  }
  const sep = (a, b) => (b ? `${a} · ${b}` : a); // (a station may have no line name)
  sign(signTexture(sep(`${name.ko || ''}역`, lineName.ko), sep(`${name.en || ''} Station`, lineName.en), { line, w: 768, h: 128 }), 6, 1, -w / 2 + 0.02, 2.9, 0, Math.PI / 2);

  // Gates: waist-high cabinets across the hall; each lane has red flaps. You
  // pay at the gate (an action) and are walked through.
  let prev = -DOOR_Z;
  for (const lz of [...GATE_LANES, DOOR_Z + 0.45]) {
    const z0 = prev, z1 = lz - 0.45;
    if (z1 > z0) {
      box(0.8, 1.0, z1 - z0, GATE_X, 0.5, (z0 + z1) / 2, '#c9ced6');
      box(0.8, 0.04, z1 - z0, GATE_X, 1.02, (z0 + z1) / 2, '#30343b');
      block(GATE_X - 0.4, z0, GATE_X + 0.4, z1);
    }
    prev = lz + 0.45;
  }
  for (const lz of GATE_LANES) {
    box(0.05, 0.12, 0.3, GATE_X - 0.38, 1.12, lz, '#3ad17a'); // green arrows
    for (const s of [-1, 1]) box(0.06, 0.5, 0.32, GATE_X, 0.75, lz + s * 0.27, '#d0453a'); // flaps
    block(GATE_X - 0.1, lz - 0.45, GATE_X + 0.1, lz + 0.45);
  }

  // Up-stairs to the street along the concourse walls, with daylight at the top.
  const stairs = hallStairs(sub.exits.length);
  for (const st of stairs) {
    const n = 18, run = STAIR.len / n, rise = STAIR.rise / n;
    for (let k = 0; k < n; k++) {
      const top = (k + 1) * rise, x = st.foot + st.sgn * (k + 0.5) * run;
      box(run, top, st.w, x, top / 2, st.z, '#a7aeb8');
      box(0.06, 0.02, st.w, x - st.sgn * run / 2 + st.sgn * 0.03, top + 0.005, st.z, '#f2c230');
    }
    // A low wall that climbs with the steps on the open side (so the camera
    // can still see you), a handrail, and the daylight at the top.
    const side = st.z - Math.sign(st.z) * (st.w / 2 + 0.2);
    const prof = new THREE.Shape([[0, 0], [STAIR.len, 0], [STAIR.len, STAIR.rise + 1.0], [0, 1.0]].map(([u, v]) => new THREE.Vector2(u, v)));
    const sideWall = new THREE.Mesh(new THREE.ExtrudeGeometry(prof, { depth: 0.2, bevelEnabled: false }), mat('#d9dde3', { side: THREE.DoubleSide }));
    sideWall.scale.x = st.sgn; // climbs towards the end wall
    sideWall.position.set(st.foot, 0, side);
    scene.add(sideWall);
    block(Math.min(st.foot, st.top) - 0.5, side, Math.max(st.foot, st.top), side + 0.2);
    // Rows further in (a third or fourth exit) also need the wall on the far side.
    const far = st.z + Math.sign(st.z) * (st.w / 2);
    if (Math.abs(far) < d / 2 - 0.6) block(Math.min(st.foot, st.top) - 0.5, far, Math.max(st.foot, st.top), far + Math.sign(st.z) * 0.2);
    const rail = box(Math.hypot(STAIR.len, STAIR.rise), 0.07, 0.07, st.foot + st.sgn * STAIR.len / 2, STAIR.rise / 2 + 1.0, side + 0.1, '#5d6470');
    rail.rotation.z = st.sgn * Math.atan2(STAIR.rise, STAIR.len);
    box(0.05, 2.2, st.w, st.top + st.sgn * 0.45, STAIR.rise + 1.1, st.z, new THREE.MeshBasicMaterial({ color: '#dff2ff' }));
    // Exit sign over the foot of the stairs: "나가는 곳 1번 · Way Out".
    const n2 = sub.exits[st.i].n ?? st.i + 1;
    sign(signTexture(`나가는 곳 ${n2}번`, `Way Out · Exit ${n2}`, { num: n2, bg: '#2f3540', fg: '#ffffff' }), 2.8, 0.7, st.foot + 0.2, 3.3, st.z, Math.PI / 2);
  }

  // Platform: benches back to back down the middle (sit facing a track),
  // pillars, the station name and which way each track goes.
  const seats = [];
  for (const x of [-1, 11, 21]) {
    box(2.4, 0.08, 1.0, x, 0.4, 0, '#c08a52');
    box(2.4, 0.5, 0.08, x, 0.7, 0, '#c08a52');
    for (const s of [-1, 1]) box(0.08, 0.4, 0.95, x + s * 1.1, 0.2, 0, '#5d6470');
    block(x - 1.2, -0.5, x + 1.2, 0.5);
    for (const sx of [-0.6, 0.6]) {
      seats.push({ x: x + sx, z: 0.3, ry: 0, stand: [x + sx, 1.3] });
      seats.push({ x: x + sx, z: -0.3, ry: Math.PI, stand: [x + sx, -1.3] });
    }
  }
  for (const x of [5, 16]) {
    box(0.7, h, 0.7, x, h / 2, 0, '#d9dde3');
    block(x - 0.35, -0.35, x + 0.35, 0.35);
  }
  const code = sub.code ? '  ' + sub.code : '';
  const towards = store.towards || {};
  for (const [t, tr] of TRACKS.entries()) {
    const s = Math.sign(tr.z);
    // Station name boards on the pillars, facing each track.
    // (Facing a board, the trains on that side run off to your right, so the
    // next station is always on the right.)
    const next = t === 0 ? towards.up : towards.down, prev = t === 0 ? towards.down : towards.up;
    const board = nameBoardTexture({ ko: name.ko || '', en: lineName.en ? `${name.en || ''} · ${lineName.en}` : name.en || '', code: sub.code, line, next, prev });
    for (const x of [5, 16]) sign(board, 3.6, 1.01, x, 2.75, s * 0.37, s > 0 ? 0 : Math.PI);
    // Over the screen doors: which way this track goes.
    const to = t === 0 ? towards.up : towards.down;
    const label = t === 0 ? ['상행', 'Up'] : ['하행', 'Down'];
    const txt = to ? [`${label[0]} · ${to.ko} 방면`, `${label[1]} · for ${to.en}`] : [`${label[0]}`, 'Not in service'];
    for (const x of [platC - 8, platC + 8]) sign(signTexture(txt[0], txt[1], { bg: '#2f3540', fg: '#ffffff', line, w: 640, h: 128 }), 3.5, 0.7, x, 3.2, s * (DOOR_Z - 0.4), s > 0 ? Math.PI : 0);
  }

  // Hanging sign where you step onto the platform: which side goes where.
  // Facing east (in from the gates) the up track (south, +z) is on the right.
  {
    const dirTxt = (t) => {
      const to = t === 0 ? towards.up : towards.down;
      const l = t === 0 ? ['상행', 'Up'] : ['하행', 'Down'];
      return to ? [`${l[0]} · ${to.ko} 방면`, `${l[1]} · for ${to.en}`] : [l[0], 'Not in service'];
    };
    const up = dirTxt(0), down = dirTxt(1);
    const sw = 7.2, sh = 0.9, sy = 3.8;
    const hang = (sx, front, back) => {
      sign(front, sw, sh, sx, sy, 0, -Math.PI / 2); // read walking east
      sign(back, sw, sh, sx + 0.04, sy, 0, Math.PI / 2); // read walking west
      for (const z of [-sw / 2 + 0.4, sw / 2 - 0.4]) box(0.04, h - sy - sh / 2, 0.04, sx + 0.02, (h + sy + sh / 2) / 2, z, '#9aa1ab');
    };
    // Just past the gates, over the platform end.
    hang(GATE_X + 2.6,
      directionSignTexture(['◀ ' + down[0], down[1]], [up[0] + ' ▶', up[1]], line),
      directionSignTexture(['◀ 나가는 곳', 'Way out · gates and stairs'], null, line));
    // In the concourse before the gates: where the trains are, and the way out.
    const upTo = towards.up, downTo = towards.down;
    hang(GATE_X - 5,
      directionSignTexture(['타는 곳 · Trains', '개찰구 지나서 · through the gates'],
        upTo ? [`상행 ${upTo.ko} · 하행 ${downTo.ko} ▶`, `Up for ${upTo.en} · Down for ${downTo.en}`] : ['▶', ''], line),
      directionSignTexture(['◀ 나가는 곳 · Exit 1, 2', '계단 위로 · stairs up to the street'], null, line));
  }

  // Route map on a pillar just inside the gates: a big board on each face
  // along the walk (seen coming through the gates and coming back to them).
  let setSignLang;
  const loop = store.loop;
  if (loop?.stops?.length > 1) {
    const px = GATE_X + 4.4, pw = 2.3, pd = 0.6;
    box(pd, h, pw, px, h / 2, 0, '#d9dde3');
    block(px - pd / 2, -pw / 2, px + pd / 2, pw / 2);
    const mapC = document.createElement('canvas');
    const mapTex = new THREE.CanvasTexture(mapC);
    mapTex.colorSpace = THREE.SRGBColorSpace;
    mapTex.anisotropy = 4;
    const mw = 2.0, mh = mw * ROUTE_MAP.h / ROUTE_MAP.w;
    for (const s of [-1, 1]) {
      box(0.04, mh + 0.12, mw + 0.12, px + s * (pd / 2 + 0.01), 0.35 + mh / 2, 0, '#5d6470'); // frame
      sign(mapTex, mw, mh, px + s * (pd / 2 + 0.035), 0.35 + mh / 2, 0, s < 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    setSignLang = (lang) => {
      drawRouteMap(mapC, { stops: loop.stops, index: loop.index, lang: lang || null });
      mapTex.needsUpdate = true;
    };
    setSignLang(null);
  }

  // LED board over the gates, facing the concourse.
  const ledC = document.createElement('canvas');
  ledC.width = 512; ledC.height = 64;
  const ledTex = new THREE.CanvasTexture(ledC);
  sign(ledTex, 4, 0.5, GATE_X - 0.42, 3.0, 0, -Math.PI / 2);
  let ledLast = '';
  const drawLed = (txt) => {
    if (txt === ledLast) return;
    ledLast = txt;
    const g = ledC.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#ffb21e'; g.font = '700 26px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 256, 33, 496);
    ledTex.needsUpdate = true;
  };

  // Trains: silver cars with a stripe in the line colour, clipped to the
  // platform so they appear out of the tunnel.
  const clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -(GATE_X)), new THREE.Plane(new THREE.Vector3(-1, 0, 0), w / 2)];
  const cm = (c) => new THREE.MeshLambertMaterial({ color: c, clippingPlanes: clip });
  const carL = 10, cars = 3, gap = 0.5, trainLen = cars * carL + (cars - 1) * gap;
  const body = cm('#d6dae0'), stripe = cm(line), win = cm('#33404f'), doorM = cm('#aeb4bd');
  const trains = TRACKS.map((tr) => {
    const g = new THREE.Group();
    for (let k = 0; k < cars; k++) {
      const cx = -k * (carL + gap);
      box(carL, 2.6, 2.7, cx, 0.6, 0, body, g);
      box(carL + 0.02, 0.25, 2.72, cx, 0.1, 0, stripe, g);
      for (const j of [-3, 0, 3]) box(1.6, 0.8, 2.74, cx + j, 1.15, 0, win, g);
      for (const j of [-1.5, 1.5]) box(1.3, 2.0, 2.76, cx + j, 0.5, 0, doorM, g);
    }
    g.rotation.y = tr.dir > 0 ? 0 : Math.PI; // the front leads the way
    g.position.set(0, -0.4, tr.z);
    g.visible = false;
    scene.add(g);
    // Where the front car stands so the train is centred on the platform.
    const stopX = platC + tr.dir * (trainLen / 2 - carL / 2);
    const runIn = platL + trainLen; // from out of sight to the stop
    return { g, tr, stopX, runIn };
  });

  const status = TRACKS.map(() => trainPhase(0));
  // Sounds: onSound(kind, track) for 'arrive', 'open', 'closing', 'depart'.
  // After a gap (the player was elsewhere) the phases resync silently.
  const hall = { onSound: null };
  const heard = TRACKS.map(() => null);
  let lastT = 0;
  const CLOSE_WARN = 1.6; // s before the doors shut
  function animate() {
    const now = Date.now() / 1000;
    const fresh = now - lastT < 0.5;
    lastT = now;
    let led = `${name.ko || ''}역 · ${name.en || ''} Station`;
    for (let t = 0; t < 2; t++) {
      const { g, tr, stopX, runIn } = trains[t];
      const ph = trainPhase(now, tr.offset);
      status[t] = ph;
      const was = heard[t];
      const key = ph.phase === 'open' && ph.left <= CLOSE_WARN ? 'closing' : ph.phase;
      heard[t] = key;
      if (fresh && was && was !== key && hall.onSound) hall.onSound({ in: 'arrive', open: 'open', closing: 'closing', out: 'depart' }[key], t);
      g.visible = true;
      if (ph.phase === 'in') g.position.x = stopX - tr.dir * runIn * (1 - ph.k) * (1 - ph.k);
      else if (ph.phase === 'open') g.position.x = stopX;
      else g.position.x = stopX + tr.dir * runIn * ph.k * ph.k;
      // Doors: open over 0.4 s, close in the last 0.4 s.
      const e = ph.phase === 'open' ? Math.min(1, (DOORS - ph.left) / 0.4, ph.left / 0.4) : 0;
      for (const dr of doors[t]) dr.pane.position.x = dr.x0 + dr.s * e * 0.95;
      if (ph.phase === 'in') led = t === 0 ? '상행 열차가 들어옵니다 · Up train arriving' : '하행 열차가 들어옵니다 · Down train arriving';
    }
    drawLed(led);
  }
  animate();

  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, stations: {}, room: ROOM,
    exit: { x: 1e4, z: 1e4 }, // no door: walk up the stairs
    animate, setSignLang,
    subway: Object.assign(hall, {
      stairs,
      vending,
      // Track t: the doors are open now, and for how much longer (s).
      doorsOpen: (t) => (status[t].phase === 'open' && status[t].left > 0.3 ? status[t].left : 0),
      train: { get phase() { return status[0].phase; } },
    }),
  };
}

// Drinks from the station vending machines: all cheap (1 coin), all
// non-alcoholic, so each one works like a coffee (sips that refill stamina).
export const VENDING_DRINKS = [
  { id: 'black-coffee', icon: '☕', price: 1, name: { ko: '블랙커피', en: 'Black coffee', ja: 'ブラックコーヒー', zh: '黑咖啡' } },
  { id: 'milk-coffee', icon: '☕', price: 1, name: { ko: '밀크커피', en: 'Milk coffee', ja: 'ミルクコーヒー', zh: '牛奶咖啡' } },
  { id: 'yuja-tea', icon: '🍋', price: 1, name: { ko: '유자차', en: 'Yuja tea', ja: 'ゆず茶', zh: '柚子茶' } },
  { id: 'hot-choco', icon: '🍫', price: 1, name: { ko: '핫초코', en: 'Hot chocolate', ja: 'ホットチョコ', zh: '热巧克力' } },
  { id: 'energy', icon: '⚡', price: 1, name: { ko: '에너지음료', en: 'Energy drink', ja: 'エナジードリンク', zh: '能量饮料' } },
  { id: 'vitamin', icon: '🍊', price: 1, name: { ko: '비타민음료', en: 'Vitamin drink', ja: 'ビタミンドリンク', zh: '维生素饮料' } },
  { id: 'cider', icon: '🥤', price: 1, name: { ko: '사이다', en: 'Lemon-lime soda (cider)', ja: 'サイダー', zh: '汽水' } },
  { id: 'barley-tea', icon: '🍵', price: 1, name: { ko: '보리차', en: 'Barley tea', ja: '麦茶', zh: '大麦茶' } },
  { id: 'water', icon: '💧', price: 1, name: { ko: '생수', en: 'Bottled water', ja: 'ミネラルウォーター', zh: '矿泉水' } },
];

// ---------- Inside a train car ----------

export const CAR = { w: 18, d: 3.4, h: 3 };
export function buildTrainCar(store, ROOM) {
  const line = store.line || '#00a84d';
  const { w, d, h } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#15171b');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa1ab, 2.2));
  const colliders = [];
  const block = (x0, z0, x1, z1) => colliders.push({ p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  const box = (sx, sy, sz, x, y, z, c, parent = scene) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof c === 'string' ? mat(c) : c);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  box(w, 0.05, d, 0, -0.025, 0, '#8d939c'); // floor
  // Long bench seats along both sides, under the windows; doors between.
  const seats = [];
  for (const s of [-1, 1]) {
    for (const x0 of [-6.5, 0, 6.5]) {
      box(4.2, 0.4, 0.5, x0, 0.2, s * (d / 2 - 0.25), line);
      box(4.2, 0.6, 0.1, x0, 0.7, s * (d / 2 - 0.05), line);
      block(x0 - 2.1, s > 0 ? d / 2 - 0.5 : -d / 2, x0 + 2.1, s > 0 ? d / 2 : -d / 2 + 0.5);
      for (const k of [-1.5, -0.5, 0.5, 1.5]) seats.push({ x: x0 + k, z: s * (d / 2 - 0.3), ry: s > 0 ? Math.PI : 0, stand: [x0 + k, s * (d / 2 - 1.1)] });
      // Wall with windows onto the tunnel.
      box(4.2, 0.6, 0.06, x0, 1.0, s * (d / 2), '#d6dae0');
      box(4.2, 0.6, 0.06, x0, 2.5, s * (d / 2), '#d6dae0');
      box(4.2, 0.9, 0.04, x0, 1.75, s * (d / 2), '#202a36');
    }
    for (const x0 of [-3.25, 3.25]) box(1.6, 2.4, 0.06, x0, 1.2, s * (d / 2), '#aeb4bd'); // doors
    for (const x0 of [-3.25, 3.25]) box(0.05, 2.3, 0.05, x0, 1.15, s * 0.6, '#c9ced6'); // poles
  }
  for (const s of [-1, 1]) box(0.08, h, d, s * w / 2, h / 2, 0, '#d6dae0'); // car ends
  // Tunnel lights streaming past the windows while the train moves.
  const lights = [];
  for (let k = 0; k < 8; k++) for (const s of [-1, 1]) {
    lights.push(box(0.6, 0.12, 0.05, -w / 2 + k * (w / 8), 1.9, s * (d / 2 + 0.6), new THREE.MeshBasicMaterial({ color: '#ffd28a' })));
  }
  // The LED strip at both car ends: next stop.
  const ledC = document.createElement('canvas');
  ledC.width = 768; ledC.height = 64;
  const ledTex = new THREE.CanvasTexture(ledC);
  for (const s of [-1, 1]) {
    const m = signMesh(ledTex, 3, 0.25);
    m.position.set(s * (w / 2 - 0.05), 2.4, 0);
    m.rotation.y = -s * Math.PI / 2;
    scene.add(m);
  }
  const setLed = (txt) => {
    const g = ledC.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, 768, 64);
    g.fillStyle = '#ff5a3c'; g.font = '700 28px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 384, 33, 752);
    ledTex.needsUpdate = true;
  };
  setLed('');
  let moving = false;
  function animate(dt) {
    if (!moving) return;
    for (const l of lights) {
      l.position.x -= dt * 22;
      if (l.position.x < -w / 2) l.position.x += w;
    }
  }
  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, stations: {}, room: ROOM,
    exit: { x: 1e4, z: 1e4 }, animate,
    train: { setLed, setMoving: (m) => { moving = m; } },
  };
}

function tileTexture(w, d) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#cfd3d9'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(80,90,100,0.18)'; g.lineWidth = 2;
  for (let v = 0; v <= 128; v += 64) { g.beginPath(); g.moveTo(0, v); g.lineTo(128, v); g.stroke(); g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 128); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / 2, d / 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
