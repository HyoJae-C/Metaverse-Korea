// The wallpaper and floor patterns (core/home-finish.js names them), drawn on
// small canvases, and putting them on a home's walls and floor. Loads with
// the rooms (core/interior.js), not in the first download.
//
// A wall pattern is one strip of wall, TW metres wide and the whole wall high
// (so a half-height tile wall stays half height); a floor pattern is a square
// T metres across. Both repeat.
import * as THREE from 'three';
import { finishById } from './home-finish.js';

const WALL_H = 4; // the wall height a wall pattern is drawn for (the room stretches it)
let woodTrim = null; // a wooden skirting board under wallpaper, instead of the room's coloured one

function rand(seed) { // the same speckles every time
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Fine speckles over the whole canvas: paper, paint, concrete.
function speckle(g, w, h, n, color, size, seed) {
  const r = rand(seed);
  g.fillStyle = color;
  for (let i = 0; i < n; i++) g.fillRect(r() * w, r() * h, size * (0.5 + r()), size * (0.5 + r()));
}
// Draw something at x, y and again one canvas over in every direction, so a
// shape crossing the edge carries on at the other side.
function wrap(w, h, x, y, draw) { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) draw(x + dx, y + dy); }
function flower(g, x, y, r, petal, middle, n = 5) {
  g.fillStyle = petal;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, r * 0.3, a, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = middle;
  g.beginPath(); g.arc(x, y, r * 0.25, 0, Math.PI * 2); g.fill();
}

// [width of the strip (walls) or square (floors) in metres, canvas w, h, draw]
const ART = {
  // --- walls (canvas top = top of the wall) ---
  'wall-hanji': [1.2, 128, 256, (g, w, h) => {
    g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, h);
    const r = rand(3);
    g.strokeStyle = 'rgba(170,140,90,0.22)'; g.lineWidth = 1;
    for (let i = 0; i < 160; i++) { const x = r() * w, y = r() * h, a = r() * Math.PI; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.stroke(); } // the paper's fibres
    speckle(g, w, h, 120, 'rgba(190,165,120,0.18)', 2, 4);
    g.fillStyle = 'rgba(160,130,90,0.12)'; g.fillRect(0, 0, 2, h); // the sheets' seams
  }],
  'wall-changho': [0.9, 128, 512, (g, w, h) => {
    g.fillStyle = '#f6efdc'; g.fillRect(0, 0, w, h); // paper behind
    g.fillStyle = '#8a6440';
    for (let x = 4; x < w; x += 14) g.fillRect(x, 0, 4, h); // 띠살: the close vertical slats
    for (const y of [70, 250, 430]) for (let k = 0; k < 3; k++) g.fillRect(0, y + k * 12, w, 4); // and three bands of three across
    g.fillStyle = '#6e4c2e'; g.fillRect(0, 0, 6, h); g.fillRect(0, h - 10, w, 10); // the door's frame
  }],
  'wall-maehwa': [2.2, 256, 512, (g, w, h) => {
    g.fillStyle = '#f3eee2'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 140, 'rgba(180,160,120,0.15)', 2, 7);
    const r = rand(11);
    g.strokeStyle = 'rgba(40,34,32,0.85)'; g.lineCap = 'round';
    const branch = (x, y, a, len, wd, depth) => { // ink branches that fork
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * len * 0.5, y + Math.sin(a + 0.4) * len * 0.5, x2, y2); g.stroke();
      if (depth > 0) { branch(x2, y2, a - 0.5 - r() * 0.3, len * 0.7, wd * 0.65, depth - 1); branch(x2, y2, a + 0.3 + r() * 0.3, len * 0.6, wd * 0.6, depth - 1); }
      else for (let i = 0; i < 3; i++) flower(g, x2 + (r() - 0.5) * 16, y2 + (r() - 0.5) * 16, 7, 'rgba(232,120,140,0.9)', '#f6d860');
    };
    branch(0, 360, -0.6, 90, 7, 3); // from the left edge, up and across
    branch(w, 120, Math.PI + 0.5, 70, 5, 2); // a second spray, from the right
    for (let i = 0; i < 10; i++) flower(g, 30 + r() * (w - 60), 80 + r() * 380, 5, 'rgba(232,120,140,0.75)', '#f6d860'); // loose petals
  }],
  'wall-flower70': [0.8, 128, 256, (g, w, h) => {
    g.fillStyle = '#f6e2b0'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) for (const [x, k] of [[32, 0], [96, 32]]) {
      wrap(w, h, x, y + k, (fx, fy) => {
        g.fillStyle = '#8a9a3a'; g.beginPath(); g.ellipse(fx + 14, fy + 12, 9, 4, 0.6, 0, Math.PI * 2); g.fill(); // a leaf
        flower(g, fx, fy, 22, '#d9653a', '#7a3a1a', 6);
        flower(g, fx, fy, 10, '#f2a04a', '#7a3a1a', 6);
      });
    }
  }],
  'wall-check': [0.6, 128, 128, (g, w, h) => {
    g.fillStyle = '#efe2c6'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(176,88,58,0.35)'; g.fillRect(0, 0, 40, h); g.fillRect(0, 0, w, 40);
    g.fillStyle = 'rgba(176,88,58,0.25)'; g.fillRect(0, 0, 40, 40);
    g.fillStyle = 'rgba(90,60,40,0.4)'; g.fillRect(70, 0, 3, h); g.fillRect(0, 70, w, 3); // a thin line between
  }],
  'wall-greentile': [0.6, 128, 512, (g, w, h) => {
    g.fillStyle = '#f2eee0'; g.fillRect(0, 0, w, h); // plaster above
    speckle(g, w, h * 0.7, 80, 'rgba(160,150,120,0.15)', 2, 9);
    const top = Math.round(h * 0.7); // tiles up to 1.2 m
    g.fillStyle = '#e8e4d8'; g.fillRect(0, top, w, h - top); // grout
    const s = 32;
    for (let y = top + 2; y < h; y += s) for (let x = 0; x < w; x += s) {
      g.fillStyle = (x / s + (y - top) / s) % 2 < 1 ? '#3f8a6a' : '#46946f';
      g.fillRect(x + 2, y, s - 4, s - 4);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 4, y + 2, s - 10, 4); // a glaze shine
    }
    g.fillStyle = '#2f6a52'; g.fillRect(0, top - 6, w, 8); // the top row's rounded edge
  }],
  'wall-white': [1.5, 128, 256, (g, w, h) => {
    g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 60, 'rgba(200,195,185,0.12)', 3, 13);
  }],
  'wall-sage': [1.5, 128, 256, (g, w, h) => {
    g.fillStyle = '#b8c8b0'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 60, 'rgba(120,140,110,0.12)', 3, 17);
  }],
  'wall-stripe': [0.6, 128, 64, (g, w, h) => {
    g.fillStyle = '#efe6d6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d6c6a8'; g.fillRect(0, 0, 40, h);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(44, 0, 3, h); g.fillRect(124, 0, 3, h);
  }],
  // --- floors ---
  'floor-kongdam': [1.8, 256, 256, (g, w, h) => {
    g.fillStyle = '#e2b45a'; g.fillRect(0, 0, w, h);
    const r = rand(21);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${170 + r() * 40},${110 + r() * 30},40,0.12)`; g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 30, 0, Math.PI * 2); g.fill(); } // the oil's patches
    g.strokeStyle = 'rgba(140,90,30,0.45)'; g.lineWidth = 3;
    for (const p of [0, 128]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.moveTo(0, p + 64); g.lineTo(w, p + 64); g.stroke(); } // the sheets overlap
  }],
  'floor-maru': [2, 256, 256, (g, w, h) => {
    g.fillStyle = '#b88250'; g.fillRect(0, 0, w, h);
    for (const y of [0, 128]) { // 우물마루: short boards between long beams
      g.fillStyle = '#8a5a32'; g.fillRect(0, y, w, 22);
      for (let x = 0; x < w; x += 32) {
        g.fillStyle = (x / 32 + y / 128) % 2 ? '#b88250' : '#c08c5a';
        g.fillRect(x + 1, y + 23, 30, 104);
        g.fillStyle = 'rgba(90,55,25,0.25)'; g.fillRect(x + 8, y + 30, 2, 80); g.fillRect(x + 20, y + 50, 2, 60); // grain
      }
    }
  }],
  'floor-wanggol': [1, 256, 256, (g, w, h) => {
    g.fillStyle = '#d9c890'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { g.fillStyle = (y / 4) % 2 ? 'rgba(160,140,80,0.35)' : 'rgba(255,250,220,0.25)'; g.fillRect(0, y, w, 2); } // woven sedge
    for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(140,120,70,0.25)'; g.fillRect(x, 0, 1, h); } // the warp
    g.fillStyle = '#5a6a3a'; g.fillRect(0, 0, w, 10); g.fillRect(0, 0, 10, h); // the mat's border
    g.fillStyle = '#b8a468'; g.fillRect(0, 10, w, 3); g.fillRect(10, 0, 3, h);
  }],
  // Checkerboard: 0.8 m squares (Yozi 2026-11-18: 0.4 m was hard on the eyes).
  'floor-checker': [1.6, 128, 128, (g, w, h) => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#2a2a2e' : '#f2ede2'; g.fillRect(x * 64, y * 64, 64, 64); }
    g.strokeStyle = 'rgba(120,120,120,0.4)'; g.lineWidth = 2; g.strokeRect(0, 0, 64, 64); g.strokeRect(64, 64, 64, 64);
  }],
  'floor-terrazzo': [1.2, 256, 256, (g, w, h) => {
    g.fillStyle = '#d8d2c4'; g.fillRect(0, 0, w, h);
    const r = rand(31), chips = ['#7a7266', '#a89a88', '#5a5650', '#c8b8a0', '#e8e2d6', '#8a8a7a'];
    for (let i = 0; i < 420; i++) {
      const x = r() * w, y = r() * h, s = 2 + r() * 6, c = chips[(r() * chips.length) | 0], a = r() * Math.PI;
      wrap(w, h, x, y, (cx, cy) => { g.fillStyle = c; g.beginPath(); g.moveTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); g.lineTo(cx + Math.cos(a + 2.1) * s * 0.8, cy + Math.sin(a + 2.1) * s * 0.8); g.lineTo(cx + Math.cos(a + 4.2) * s * 0.7, cy + Math.sin(a + 4.2) * s * 0.7); g.fill(); });
    }
    g.fillStyle = 'rgba(160,140,90,0.6)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); // brass strips
  }],
  'floor-flowermat': [1.2, 256, 256, (g, w, h) => {
    g.fillStyle = '#e8c890'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
      const ox = (y / 64) % 2 ? 32 : 0;
      flower(g, x + ox + 16, y + 16, 18, 'rgba(192,80,58,0.8)', '#f2d07a', 4);
      g.fillStyle = 'rgba(120,140,60,0.5)'; g.fillRect(x + ox + 36, y + 40, 10, 4);
    }
  }],
  'floor-herringbone': [1.6, 256, 256, (g, w, h) => {
    // 2:1 planks in a staircase; strips four planks apart fill the floor.
    g.fillStyle = '#8a5a32'; g.fillRect(0, 0, w, h);
    const W = 32, shades = ['#c89a66', '#b88a56', '#d0a470', '#a87a4a'];
    const plank = (x, y, pw, ph, k) => wrap(w, h, x, y, (px, py) => {
      g.fillStyle = shades[k & 3]; g.fillRect(px + 1, py + 1, pw - 2, ph - 2);
      g.fillStyle = 'rgba(90,55,25,0.18)'; if (pw > ph) g.fillRect(px + 4, py + ph / 2, pw - 8, 1); else g.fillRect(px + pw / 2, py + 4, 1, ph - 8);
    });
    for (let j = 0; j < 2; j++) for (let k = 0; k < 8; k++) {
      const x = k * W, y = (k + j * 4) * W % h;
      plank(x, y, 2 * W, W, k + j);
      plank(x, (y + W) % h, W, 2 * W, k + j + 1);
    }
  }],
  'floor-concrete': [2.4, 256, 256, (g, w, h) => {
    g.fillStyle = '#b4b2ae'; g.fillRect(0, 0, w, h);
    const r = rand(41);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${120 + r() * 60},${120 + r() * 60},${118 + r() * 60},0.12)`; g.beginPath(); g.arc(r() * w, r() * h, 12 + r() * 40, 0, Math.PI * 2); g.fill(); }
    speckle(g, w, h, 300, 'rgba(80,80,80,0.15)', 1.5, 43);
    g.fillStyle = 'rgba(90,90,90,0.25)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); // saw cuts
  }],
  'floor-marble': [1.2, 256, 256, (g, w, h) => {
    g.fillStyle = '#f0eeea'; g.fillRect(0, 0, w, h);
    const r = rand(51);
    g.lineCap = 'round';
    for (let i = 0; i < 7; i++) { // grey veins
      g.strokeStyle = `rgba(140,138,136,${0.25 + r() * 0.35})`; g.lineWidth = 0.8 + r() * 1.6;
      let x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (r() - 0.3) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
    g.fillStyle = '#d8d6d2'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(0, 127, w, 2); g.fillRect(127, 0, 2, h); // four tiles a square
  }],
};
export const FINISH_ART_IDS = Object.keys(ART);

// One canvas per pattern, made once and shared (each use clones the texture
// for its own repeat; the picture is uploaded once).
const textures = new Map();
function baseTexture(id) {
  if (!textures.has(id)) {
    const [, cw, ch, draw] = ART[id];
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    draw(c.getContext('2d'), cw, ch);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    textures.set(id, t);
  }
  return textures.get(id);
}
// The pattern for a surface w × h metres (a wall pattern always spans the
// height it's given).
export function finishTexture(id, w, h) {
  const art = ART[id], f = finishById(id);
  if (!art || !f) return null;
  const t = baseTexture(id).clone();
  if (f.kind === 'wall') t.repeat.set(w / art[0], 1);
  else t.repeat.set(w / art[0], h / art[0]);
  if (id === 'floor-herringbone') t.rotation = Math.PI / 4; // planks at 45°, like a real herringbone floor
  return t;
}

// Put a choice ({ wall, floor }, ids or null) on a home built by
// core/interior.js (built.homeWalls, built.homeFloor). Null: the room's own look.
export function applyFinish(built, sel) {
  const walls = built.homeWalls, floor = built.homeFloor;
  if (!walls || !floor) return;
  const base = (built.finishBase ||= { wall: walls[0].mesh.material, trim: walls[0].trim?.material, floor: floor.material, now: {} });
  if (base.now.wall !== sel.wall) {
    for (const wl of walls) {
      const old = wl.mesh.material;
      if (old !== base.wall) { old.map?.dispose(); old.dispose(); }
      wl.mesh.material = sel.wall ? new THREE.MeshLambertMaterial({ map: finishTexture(sel.wall, wl.len, WALL_H) }) : base.wall;
      if (wl.trim) wl.trim.material = sel.wall ? (woodTrim ||= new THREE.MeshLambertMaterial({ color: '#8a6a4a' })) : base.trim;
    }
    base.now.wall = sel.wall;
  }
  if (base.now.floor !== sel.floor) {
    const old = floor.material;
    if (old !== base.floor) { old.map?.dispose(); old.dispose(); }
    const { w, d } = built.room;
    floor.material = sel.floor ? new THREE.MeshLambertMaterial({ map: finishTexture(sel.floor, w, d) }) : base.floor;
    base.now.floor = sel.floor;
  }
}

// A sample in the wallpaper shop: a wall panel standing up, or a patch of
// floor with a low edge. Returns a group, about 1.5 m across, facing +z.
export function finishSample(id) {
  const f = finishById(id), g = new THREE.Group();
  if (!f) return g;
  const frame = new THREE.MeshLambertMaterial({ color: '#6a5a4a' });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  if (f.kind === 'wall') {
    add(new THREE.BoxGeometry(1.5, 2.4, 0.06), new THREE.MeshLambertMaterial({ map: finishTexture(id, 1.5, WALL_H) }), 0, 1.25, 0);
    add(new THREE.BoxGeometry(1.6, 0.06, 0.12), frame, 0, 2.48, 0); // top rail
    add(new THREE.BoxGeometry(1.7, 0.08, 0.5), frame, 0, 0.04, 0); // foot
  } else {
    add(new THREE.BoxGeometry(1.5, 0.04, 1.2), new THREE.MeshLambertMaterial({ map: finishTexture(id, 1.5, 1.2) }), 0, 0.03, 0);
    for (const [w, d, x, z] of [[1.56, 0.04, 0, 0.61], [1.56, 0.04, 0, -0.61], [0.04, 1.2, 0.77, 0], [0.04, 1.2, -0.77, 0]]) add(new THREE.BoxGeometry(w, 0.06, d), frame, x, 0.03, z);
    // A little board behind it, tilted up, so it can be seen from the door.
    const board = add(new THREE.BoxGeometry(0.9, 0.6, 0.03), new THREE.MeshLambertMaterial({ map: finishTexture(id, 0.9, 0.6) }), 0, 0.5, -0.55);
    board.rotation.x = -0.35;
  }
  return g;
}
