// Euljiro 3-ga's neon alley, built when you first come near
// (game/neon-alley-near.js): vertical neon signs hung one over another down
// both walls of the lane, wires strung across, air-con units and silver
// ducts, hanok-style lanterns, beer crates, coloured light on the ground,
// and people walking through (Yozi's photos, 2026-11-21). The lane and its
// buildings are on the map (scripts/build-neon-alley.mjs); this is only what
// hangs on them.
//
// The point is the night view, not shops: nothing here opens. By day the
// signs are plain painted boards; after dark (core/weather.js darkness) they
// light up and a couple flicker. Every name is made up (the real beer hall
// is "을지맥옥"; Yozi 2026-11-21: call it 모두맥옥 / 을지모두).
//
// Light: no real lights (heavy on a phone). Signs and tubes are unlit
// materials whose brightness follows the dark, plus soft colour pools on the
// ground. Draw calls: signs, flickering signs, the still props (one mesh,
// vertex colours), the tubes and lantern glass, the ground pools: 5.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { darkness } from '../core/weather.js';
import { StreetNpcs, PHRASES } from '../core/npcs.js';
import { NEON, NEON_CENTER } from '../data/neon-alley.js';

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const HIDE = 140; // m from the middle: past this nothing here is drawn
const CELL = { w: 128, h: 512 }, COLS = 8; // a sign's picture in the shared texture

// The signs' pictures (made-up names). text: top to bottom, one character a
// line; small: a short line above (or below with below: true); frame: the
// neon tube round the edge; bg: the board; shape: 'oval' | 'box'.
const SIGNS = [
  { text: '모두맥옥', color: '#ff5fa2', bg: '#141018', frame: '#ffd23f', small: '별관', smallColor: '#ffd23f', below: true }, // the hero (photo 1)
  { text: '삼가집', color: '#39ff6a', bg: '#3a0d0d', frame: '#ff3b2f', small: '한식전문', smallColor: '#ff6a4a' },
  { text: '파도', color: '#5fb8ff', bg: '#0b1530', frame: '#ff5a4a', small: 'dining pub', smallColor: '#ffffff', waves: true },
  { text: '을지모두', color: '#ff4a3a', bg: '#0b1033', frame: '#39ff8a', shape: 'oval', small: 'Korean pub', smallColor: '#5fb8ff' },
  { text: '을지', color: '#6ff4ff', bg: '#071a2a', frame: '#6ff4ff', ring: '#ff3030' },
  { text: '삼가집', color: '#ffffff', bg: '#17a34a', frame: '#9dff9d', arrow: true },
  { text: '노가리', color: '#ff9a2e', bg: '#1a0f08', frame: '#ff9a2e' },
  { text: '호프', color: '#ffe14a', bg: '#1a1606', frame: '#ff5fa2' },
  { text: 'LPBAR', color: '#c77dff', bg: '#120a1c', frame: '#c77dff' },
  { text: '포차', color: '#ff3b3b', bg: '#160808', frame: '#ffd23f' },
  { text: '골뱅이', color: '#4ff0d0', bg: '#06181a', frame: '#ff5fa2' },
  { text: '이자카야', color: '#ffffff', bg: '#a3121c', frame: '#ffb3b3' },
  { text: '치킨', color: '#ffd23f', bg: '#0e0e10', frame: '#ff8a2e' },
  { text: '모두소주', color: '#1b4fb5', bg: '#f4f1e8', frame: '#ff4040', small: '소주의 원조', smallColor: '#1b4fb5', paper: true },
  { text: '노래방', color: '#ff4fe0', bg: '#14061a', frame: '#4fd8ff' },
  { text: '다방', color: '#7dff5f', bg: '#0c160a', frame: '#ffe14a' },
];
const FLICKER = new Set([7, 12]); // these two buzz on and off

function signAtlas() {
  const c = document.createElement('canvas');
  c.width = CELL.w * COLS; c.height = CELL.h * Math.ceil(SIGNS.length / COLS);
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  SIGNS.forEach((s, i) => {
    const x0 = (i % COLS) * CELL.w, y0 = Math.floor(i / COLS) * CELL.h, W = CELL.w, H = CELL.h;
    g.save();
    g.translate(x0, y0);
    g.beginPath(); g.rect(0, 0, W, H); g.clip();
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const tube = (fn, color, wdt) => { g.strokeStyle = color; g.shadowColor = color; g.shadowBlur = 14; g.lineWidth = wdt; fn(); g.stroke(); g.shadowBlur = 0; g.lineWidth = wdt * 0.4; g.strokeStyle = '#ffffffcc'; fn(); g.stroke(); };
    const board = () => { g.beginPath(); if (s.shape === 'oval') g.ellipse(W / 2, H / 2, W / 2 - 6, H / 2 - 6, 0, 0, Math.PI * 2); else g.roundRect(6, 6, W - 12, H - 12, s.paper ? 4 : 18); };
    board(); g.fillStyle = s.bg; g.fill();
    if (s.waves) { // a wave picture in blue tube under the name
      for (let k = 0; k < 4; k++) tube(() => { g.beginPath(); for (let x = 16; x <= W - 16; x += 4) { const y = H * 0.62 + k * 34 + Math.sin(x / 9 + k) * 9; x === 16 ? g.moveTo(x, y) : g.lineTo(x, y); } }, k % 2 ? '#ffffff' : '#3d8bff', 3);
    }
    tube(board, s.frame, s.paper ? 5 : 7);
    let top = 30, bottom = H - 30;
    if (s.small) {
      g.font = `800 ${s.small.length > 4 ? 15 : 22}px ${FONT}`;
      g.fillStyle = s.smallColor; g.shadowColor = s.smallColor; g.shadowBlur = s.paper ? 0 : 8;
      g.fillText(s.small, W / 2, s.below ? H - 44 : 42); g.shadowBlur = 0;
      if (s.below) bottom -= 40; else top += 34;
    }
    if (s.ring) { tube(() => { g.beginPath(); g.arc(W / 2, 74, 30, 0, Math.PI * 2); }, s.ring, 8); top += 90; }
    if (s.arrow) bottom -= 70;
    if (s.waves) bottom = H * 0.56;
    const chars = [...s.text];
    const step = Math.min(96, (bottom - top) / chars.length);
    g.font = `900 ${Math.round(step * (s.text === 'LPBAR' ? 0.82 : 0.86))}px ${FONT}`;
    chars.forEach((ch, k) => {
      const y = top + step * (k + 0.5);
      g.fillStyle = s.color; g.shadowColor = s.color; g.shadowBlur = s.paper ? 0 : 18;
      g.fillText(ch, W / 2, y);
      if (!s.paper) { g.shadowBlur = 0; g.fillStyle = '#ffffffaa'; g.font = g.font; g.globalAlpha = 0.35; g.fillText(ch, W / 2, y); g.globalAlpha = 1; }
    });
    if (s.arrow) tube(() => { g.beginPath(); g.moveTo(28, H - 76); g.lineTo(W - 28, H - 76); g.moveTo(W - 46, H - 92); g.lineTo(W - 28, H - 76); g.lineTo(W - 46, H - 60); }, '#ff3030', 6);
    g.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, rows: Math.ceil(SIGNS.length / COLS) };
}

// A point `s` metres along a line, its direction and its normal to `side`
// (+1: right going along; the same as scripts/build-neon-alley.mjs).
function along(line, s, side) {
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= L || i === line.length - 1) {
      const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
      return { x: a[0] + d[0] * s, z: a[1] + d[1] * s, d, n: [-d[1] * side, d[0] * side] };
    }
    s -= L;
  }
}
const lengthOf = (line) => line.reduce((t, q, i) => (i ? t + Math.hypot(q[0] - line[i - 1][0], q[1] - line[i - 1][1]) : 0), 0);

// game: { scene, labels, roadGraph, randomLook }
export function createNeonAlley(game) {
  const group = new THREE.Group();
  group.name = 'neon-alley';
  const { tex, rows } = signAtlas();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();

  // ---- Pieces, each baked into one of the merged meshes ----
  const props = [], tubes = [], pools = [], signs = [[], []]; // signs[1]: the flickering ones
  // A box sx × sy × sz at (x, y, z), turned ry, in a colour (vertex colours).
  const piece = (list, geo, x, y, z, ry, color, rx = 0) => {
    q.setFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ'));
    geo.applyMatrix4(m4.compose(v.set(x, y, z), q, sc.set(1, 1, 1)));
    col.set(color);
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) c.set([col.r, col.g, col.b], k * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    list.push(geo);
  };
  const box = (list, sx, sy, sz, x, y, z, ry, color, rx) => piece(list, new THREE.BoxGeometry(sx, sy, sz), x, y, z, ry, color, rx);
  // A thin rod from a to b (wires, pipes): a box stretched between them.
  const rod = (list, a, b, t, color) => {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length();
    const geo = new THREE.BoxGeometry(t, L, t);
    q.setFromUnitVectors(Y, d.normalize());
    geo.applyMatrix4(m4.compose(v.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, sc.set(1, 1, 1)));
    col.set(color);
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) c.set([col.r, col.g, col.b], k * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    list.push(geo.toNonIndexed());
  };

  // A blade sign: a thin board standing out from the wall (its face along
  // the lane, so you read it walking down), on a bracket.
  const W = NEON.width / 2;
  const blade = (line, s, side, cell, y, h, wd = 0.62) => {
    const a = along(line, s, side), out = 0.12 + wd / 2;
    const x = a.x + a.n[0] * (W - out), z = a.z + a.n[1] * (W - out), ry = Math.atan2(a.d[0], a.d[1]);
    const geo = new THREE.BoxGeometry(wd, h, 0.08);
    // Every face shows the sign's cell (the edges a sliver of it).
    const u0 = (cell % COLS) / COLS, u1 = u0 + 1 / COLS, v1 = 1 - Math.floor(cell / COLS) / rows, v0 = v1 - 1 / rows;
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
    geo.applyMatrix4(m4.compose(v.set(x, y + h / 2, z), q.setFromAxisAngle(Y, ry), sc.set(1, 1, 1)));
    signs[FLICKER.has(cell) ? 1 : 0].push(geo.toNonIndexed());
    // Its bracket: an arm from the wall over the top, and a rod down to it.
    const wx = a.x + a.n[0] * W, wz = a.z + a.n[1] * W;
    rod(props, [wx, y + h + 0.12, wz], [x - a.n[0] * (wd / 2), y + h + 0.12, z - a.n[1] * (wd / 2)], 0.05, '#2a2a2e');
    // A pool of its colour on the ground below.
    pools.push([x - a.n[0] * 0.5, z - a.n[1] * 0.5, SIGNS[cell].frame, 2.2]);
  };

  const lane = NEON.lane, LEN = lengthOf(lane);
  // Down both walls, staggered, at different heights (some high, stacked
  // over each other, like the photos). The hero sign hangs in the middle.
  const plan = [
    // [s, side, cell, bottom y, height, width]
    [2.2, -1, 9, 2.7, 1.5], [3.4, 1, 6, 2.9, 1.8], [4.6, -1, 14, 3.4, 1.9], [5.8, 1, 10, 2.6, 2.0],
    [7.2, -1, 7, 2.8, 1.5], [8.4, 1, 4, 3.6, 2.4, 0.78], [9.6, -1, 3, 2.8, 3.1, 1.15], // 을지모두, big (Yozi 2026-11-21)
    [11.2, 1, 0, 2.7, 2.9, 0.95], // 모두맥옥
    [12.4, -1, 1, 4.1, 2.6, 0.78], [12.6, -1, 2, 2.5, 1.5, 0.7], [13.8, 1, 5, 2.5, 1.2, 0.7],
    [15.0, -1, 11, 2.9, 2.0], [16.2, 1, 12, 3.3, 1.6], [17.4, -1, 15, 2.6, 1.4], [18.6, 1, 13, 2.4, 1.3, 0.6],
    [19.8, -1, 8, 3.0, 1.7], [21.0, 1, 1, 3.4, 2.2], [22.2, -1, 6, 2.7, 1.6],
    // higher up, the second layer
    [6.4, 1, 1, 5.2, 2.2, 0.7], [14.4, 1, 3, 4.9, 2.5, 1.0], [18.0, -1, 0, 4.9, 2.0, 0.7],
  ];
  for (const [s, side, cell, y, h, wd] of plan) if (s < LEN - 1) blade(lane, s, side, cell, y, h, wd);
  // A few on the diagonal lane, so it pulls you in from Eulji-ro.
  const cross = NEON.cross, CL = lengthOf(cross);
  const cw = NEON.crossWidth / 2;
  const crossBlade = (s, side, cell, y, h, wd = 0.7) => {
    const a = along(cross, s, side), out = 0.12 + wd / 2;
    const x = a.x + a.n[0] * (cw - out), z = a.z + a.n[1] * (cw - out), ry = Math.atan2(a.d[0], a.d[1]);
    const geo = new THREE.BoxGeometry(wd, h, 0.08);
    const u0 = (cell % COLS) / COLS, u1 = u0 + 1 / COLS, v1 = 1 - Math.floor(cell / COLS) / rows, v0 = v1 - 1 / rows;
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
    geo.applyMatrix4(m4.compose(v.set(x, y + h / 2, z), q.setFromAxisAngle(Y, ry), sc.set(1, 1, 1)));
    signs[0].push(geo.toNonIndexed());
    rod(props, [a.x + a.n[0] * cw, y + h + 0.12, a.z + a.n[1] * cw], [x - a.n[0] * (wd / 2), y + h + 0.12, z - a.n[1] * (wd / 2)], 0.05, '#2a2a2e');
    pools.push([x - a.n[0] * 0.5, z - a.n[1] * 0.5, SIGNS[cell].frame, 2.4]);
  };
  for (const [s, side, cell, y, h, wd] of [[3, 1, 14, 3.2, 2.0], [6, -1, 10, 2.8, 1.8], [9, 1, 7, 3.4, 1.6], [12, -1, 3, 2.9, 2.8, 1.05], [CL - 10, 1, 9, 2.8, 1.8], [CL - 6, -1, 15, 3.1, 1.6]]) {
    if (s > 1 && s < CL - 1) crossBlade(s, side, cell, y, h, wd);
  }

  // Shop fronts: a neon tube along the wall over each door, in pink, purple
  // and blue (the glow at street level in the photos).
  const TUBE = ['#ff4fd8', '#a259ff', '#4fd8ff', '#ff5f7a'];
  for (const side of [-1, 1]) {
    for (let s = 1.2, k = side > 0 ? 1 : 0; s < LEN - 2.5; s += 3.1, k++) {
      const a = along(lane, s, side), b = along(lane, s + 2.2, side), off = W - 0.04;
      rod(tubes, [a.x + a.n[0] * off, 2.35, a.z + a.n[1] * off], [b.x + b.n[0] * off, 2.35, b.z + b.n[1] * off], 0.06, TUBE[k % TUBE.length]);
      if (k % 3 === 0) { // and a door light under it
        const m = along(lane, s + 1.1, side);
        box(tubes, 1.0, 1.9, 0.02, m.x + m.n[0] * (W - 0.01), 1.0, m.z + m.n[1] * (W - 0.01), Math.atan2(m.n[0], m.n[1]), '#ffd9a0');
      }
    }
  }

  // Hanok-style lanterns up the west end of the south wall (photo 1): a dark
  // wooden frame round warm paper.
  for (const [s, y] of [[1.6, 4.4], [2.6, 3.7], [3.6, 3.0]]) {
    const a = along(lane, s, 1), off = W - 0.4, x = a.x + a.n[0] * off, z = a.z + a.n[1] * off, ry = Math.atan2(a.d[0], a.d[1]);
    box(tubes, 0.36, 0.46, 0.36, x, y, z, ry, '#ffcf7a');
    for (const dy of [-0.25, 0.25]) box(props, 0.44, 0.05, 0.44, x, y + dy, z, ry, '#3b2516');
    for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { // its corner posts
      const c = Math.cos(ry), sn = Math.sin(ry);
      box(props, 0.04, 0.5, 0.04, x + (ox * c + oz * sn) * 0.19, y, z + (-ox * sn + oz * c) * 0.19, ry, '#3b2516');
    }
    rod(props, [a.x + a.n[0] * W, y + 0.3, a.z + a.n[1] * W], [x, y + 0.3, z], 0.05, '#3b2516');
  }

  // Air-con units and ducts high on the north wall and here and there on the
  // south, and the grey wires strung back and forth over the lane.
  for (const side of [-1, 1]) {
    for (let s = 1.8 + (side > 0 ? 1.4 : 0), k = 0; s < LEN - 1.5; s += 2.8, k++) {
      const a = along(lane, s, side), y = 5.6 + (k % 3) * 0.9, off = W - 0.2;
      const x = a.x + a.n[0] * off, z = a.z + a.n[1] * off, face = Math.atan2(-a.n[0], -a.n[1]);
      box(props, 0.85, 0.62, 0.36, x, y, z, face, k % 4 === 3 ? '#cfd3d6' : '#e9ebec');
      piece(props, new THREE.CircleGeometry(0.22, 12), x - a.n[0] * 0.185, y, z - a.n[1] * 0.185, face, '#5a5f66');
      if (k % 3 === 1) { // a silver duct from it, up over the roof
        const dx = a.x + a.n[0] * (W - 0.1) + a.d[0] * 0.6, dz = a.z + a.n[1] * (W - 0.1) + a.d[1] * 0.6;
        rod(props, [dx, y - 0.1, dz], [dx, y + 3.2, dz], 0.16, '#aeb6be');
      }
    }
  }
  for (let s = 1.5, k = 0; s < LEN - 1; s += 2.1, k++) {
    const a = along(lane, s, 1), b = along(lane, s + 1.4 + (k % 3), -1);
    const y0 = 5.2 + (k % 4) * 0.45, y1 = 5.0 + ((k + 2) % 4) * 0.5;
    const pa = [a.x + a.n[0] * W, y0, a.z + a.n[1] * W], pb = [b.x + b.n[0] * W, y1, b.z + b.n[1] * W];
    const mid = [(pa[0] + pb[0]) / 2, Math.min(y0, y1) - 0.45, (pa[2] + pb[2]) / 2]; // it sags
    rod(props, pa, mid, 0.03, '#26272b');
    rod(props, mid, pb, 0.03, '#26272b');
  }
  for (const side of [-1, 1]) { // and bundles along each wall
    const a = along(lane, 0.5, side), b = along(lane, LEN - 0.5, side);
    for (const dy of [0, 0.12, 0.25]) rod(props, [a.x + a.n[0] * (W - 0.08), 4.7 + dy, a.z + a.n[1] * (W - 0.08)], [b.x + b.n[0] * (W - 0.08), 4.5 + dy, b.z + b.n[1] * (W - 0.08)], 0.04, '#2b2c30');
  }
  // The lane's ground, dark and a little wet-looking, so the colours show on it.
  for (const [line, wd] of [[lane, NEON.width], [cross, NEON.crossWidth]]) {
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      box(props, wd + 0.02, 0.02, L + 0.6, (a[0] + b[0]) / 2, 0.075, (a[1] + b[1]) / 2, Math.atan2(b[0] - a[0], b[1] - a[1]), '#3b3a44');
    }
  }
  // One lamp over the lane, a bright bulb on a bracket.
  {
    const a = along(lane, LEN * 0.42, -1), x = a.x + a.n[0] * 0.6, z = a.z + a.n[1] * 0.6;
    rod(props, [a.x + a.n[0] * W, 6.4, a.z + a.n[1] * W], [x, 6.4, z], 0.07, '#3a3c40');
    box(props, 0.45, 0.08, 0.22, x, 6.36, z, 0, '#3a3c40');
    box(tubes, 0.3, 0.06, 0.16, x, 6.3, z, 0, '#fffbe8');
    pools.push([x, z, '#fff3cf', 3.2]);
  }
  // Beer crates stacked against the walls (blue and green), kept tight in.
  for (const [s, side, n] of [[4.0, -1, 2], [10.2, 1, 3], [16.8, -1, 2], [20.4, 1, 1]]) {
    if (s > LEN - 1) continue;
    const a = along(lane, s, side), off = W - 0.24, ry = Math.atan2(a.d[0], a.d[1]);
    for (let k = 0; k < n; k++) box(props, 0.45, 0.3, 0.36, a.x + a.n[0] * off, 0.15 + k * 0.3, a.z + a.n[1] * off, ry + (k % 2) * 0.12, k % 2 ? '#2f8f4e' : '#2457b8');
  }

  // ---- The meshes ----
  const signMat = [0, 1].map(() => new THREE.MeshBasicMaterial({ map: tex }));
  signs.forEach((list, k) => { if (list.length) group.add(new THREE.Mesh(mergeGeometries(list), signMat[k])); });
  const propMesh = new THREE.Mesh(mergeGeometries(props), new THREE.MeshLambertMaterial({ vertexColors: true }));
  const tubeMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  group.add(propMesh, new THREE.Mesh(mergeGeometries(tubes), tubeMat));
  // Coloured pools on the ground: soft round glows, brighter after dark.
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.3)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const poolGeos = pools.map(([x, z, color, size]) => {
    const geo = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2).translate(x, 0.1, z);
    col.set(color);
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) c.set([col.r, col.g, col.b], k * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return geo;
  });
  const poolMat = new THREE.MeshBasicMaterial({ map: glowTex, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const poolMesh = new THREE.Mesh(mergeGeometries(poolGeos), poolMat);
  poolMesh.renderOrder = 1;
  group.add(poolMesh);
  game.scene.add(group);

  // People walking through, both lanes (kept to the middle: it is narrow).
  const near = (x, z, line, w) => {
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) < w) return true;
    }
    return false;
  };
  const homes = [lane[0], lane[1], lane[2], cross[0], cross[2]].map(([x, z]) => ({ id: 'neon-alley', x, z }));
  const npcs = game.roadGraph ? new StreetNpcs(game.scene, game.labels, game.roadGraph, homes, 1, {
    keepIn: (x, z) => near(x, z, lane, 2) || near(x, z, cross, 2.5),
    phrases: PHRASES.street,
    who: (i) => ({ name: ['Jiwoo', 'Minseo', 'Haru', 'Doyun', 'Yuna'][i % 5], look: game.randomLook?.() }),
  }) : null;
  for (const o of npcs?.list || []) o.side = Math.random() < 0.5 ? -0.55 : 0.55;

  // Brightness follows the dark; two signs buzz.
  let t = 0, tick = 0, dark = -1, buzz = 1;
  const setDark = (k) => {
    dark = k;
    const day = 0.62, lit = day + (1 - day) * k; // by day a painted board, at night full neon
    signMat[0].color.setScalar(lit);
    tubeMat.color.setScalar(0.45 + 0.55 * k);
    poolMat.opacity = 0.08 + 0.72 * k;
  };
  setDark(darkness());
  const [cx, cz] = NEON_CENTER;
  return {
    group,
    npcs,
    update(p, dt, camera, w, h) {
      const show = Math.hypot(p.x - cx, p.z - cz) < HIDE;
      if (group.visible !== show) { group.visible = show; npcs?.setVisible(show); }
      if (!show) return;
      t += dt; tick -= dt;
      if (tick <= 0) { tick = 0.25; const k = darkness(); if (Math.abs(k - dark) > 0.01) setDark(k); }
      // The buzzing pair: mostly on, now and then a quick stutter (only after dark).
      if (dark > 0.5) {
        const on = Math.sin(t * 0.7) > -0.92 || Math.sin(t * 37) > 0;
        buzz += ((on ? 1 : 0.25) - buzz) * Math.min(1, dt * 30);
      } else buzz = 1;
      signMat[1].color.setScalar((0.62 + 0.38 * dark) * buzz);
      npcs?.update(dt, camera, w, h);
    },
    nearest: (x, z) => npcs?.nearest(x, z) || null,
  };
}
