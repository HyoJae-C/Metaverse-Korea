// Huwon, Changdeokgung's rear garden (map "landmarks" in
// districts/changdeokgung.json, laid out by scripts/build-changdeokgung.mjs):
//   jeongja   the small open pavilions (정자) by the ponds and the stream:
//             l.list of [x, z, ry, s, kind], s the side of its floor.
//             kinds: square (a pyramid roof), hex (Jondeokjeong: six sides,
//             a roof in two tiers), cross (Buyongjeong: two roofs crossing,
//             its front legs in the pond), fan (Gwallamjeong: a fan-shaped
//             floor), thatch (Cheonguijeong: a straw roof)
//   pondisle  Buyongji: the stone bank round the square pond and the round
//             island with its pine (l.w, l.d: the pond; l.r: the island)
// Loaded when you first walk in through Donhwamun (core/landmarks.js).
// Visual only: collision comes from the map's blockers.
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';
import { tiles } from './palace-model.js';
import { mergeStatic } from './bukchon-models.js';

const mat = matCache({ flatShading: true });
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const C = { stone: '#d6cdb8', stoneDark: '#b1a690', post: '#a8392b', floor: '#8a5a3a', beam: '#2f8a68', bracket: '#2a6f5a', roof: '#474c55', gold: '#d4a73a', straw: '#c9a85c', grass: '#8fae6a', pine: '#3f6b3a', trunk: '#6b4a32', pad: '#5f9a55' };
const FLOOR = 0.55; // the floor's height over the ground

function cone(g, r, h, sides, y, c, turn = 0, top = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(top, r, h, sides), mat(c));
  m.position.y = y + h / 2;
  m.rotation.y = turn;
  g.add(m);
}
// Posts on a ring, a rail between them, the beam over them.
function ring(g, r, sides, H, turn, rail = true) {
  for (let i = 0; i < sides; i++) {
    const a = turn + (i / sides) * Math.PI * 2, b = turn + ((i + 1) / sides) * Math.PI * 2;
    const x = Math.sin(a) * r, z = Math.cos(a) * r, x1 = Math.sin(b) * r, z1 = Math.cos(b) * r;
    box(g, 0.16, H, 0.16, x, FLOOR + H / 2, z, C.post);
    const seg = new THREE.Group(), len = Math.hypot(x1 - x, z1 - z);
    box(seg, len, 0.16, 0.14, 0, FLOOR + H - 0.08, 0, C.beam);
    if (rail && i !== 0) box(seg, len, 0.06, 0.06, 0, FLOOR + 0.42, 0, C.post); // (side 0, the front, is open)
    seg.position.set((x + x1) / 2, 0, (z + z1) / 2);
    seg.rotation.y = -Math.atan2(z1 - z, x1 - x);
    g.add(seg);
  }
}
const KINDS = {
  square(g, s) {
    const r = (s / 2) * Math.SQRT2;
    box(g, s + 0.4, 0.25, s + 0.4, 0, 0.12, 0, C.stone);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.3, FLOOR, 0.3, (sx * s) / 2, FLOOR / 2, (sz * s) / 2, C.stoneDark);
    box(g, s + 0.1, 0.1, s + 0.1, 0, FLOOR, 0, C.floor);
    ring(g, r, 4, 1.7, Math.PI / 4);
    cone(g, r + 0.75, 1.05, 4, FLOOR + 1.7, C.roof, Math.PI / 4);
    cone(g, 0.14, 0.28, 6, FLOOR + 2.75, C.gold);
  },
  hex(g, s) {
    const r = s / 2;
    cone(g, r + 0.5, 0.25, 6, 0, C.stone, 0, r + 0.5);
    cone(g, r + 0.1, 0.1, 6, FLOOR - 0.05, C.floor, 0, r + 0.1);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(g, 0.28, FLOOR, 0.28, Math.sin(a) * r, FLOOR / 2, Math.cos(a) * r, C.stoneDark); }
    ring(g, r, 6, 1.6, 0);
    ring(g, r * 0.62, 6, 2.3, 0, false); // the inner posts hold the upper roof
    cone(g, r + 0.8, 0.5, 6, FLOOR + 1.6, C.roof, 0, r * 0.6); // the lower roof, a skirt
    cone(g, r * 0.62 + 0.75, 1.0, 6, FLOOR + 2.3, C.roof);
    cone(g, 0.14, 0.28, 6, FLOOR + 3.3, C.gold);
  },
  cross(g, s) {
    const a = s * 0.56; // each arm's width
    box(g, s + 0.3, 0.25, a + 0.3, 0, 0.12, 0, C.stone);
    for (const [w, d] of [[s, a], [a, s]]) {
      box(g, w, 0.1, d, 0, FLOOR, 0, C.floor);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        box(g, 0.26, FLOOR + 0.5, 0.26, (sx * w) / 2, (FLOOR - 0.5) / 2, (sz * d) / 2, C.stoneDark); // (down into the water at the front)
        box(g, 0.15, 1.7, 0.15, (sx * w) / 2, FLOOR + 0.85, (sz * d) / 2, C.post);
      }
      box(g, w + 0.1, 0.16, d + 0.1, 0, FLOOR + 1.62, 0, C.beam);
      box(g, w, 0.05, 0.05, 0, FLOOR + 0.42, d / 2, C.post);
      box(g, w, 0.05, 0.05, 0, FLOOR + 0.42, -d / 2, C.post);
    }
    tiles(g, s + 1.3, a + 1.3, 0.9, FLOOR + 1.7, { hip: true, lift: 0.35, seg: 4, rows: 1 });
    tiles(g, s + 1.3, a + 1.3, 0.9, FLOOR + 1.7, { hip: true, lift: 0.35, seg: 4, rows: 1 }, 0, 0, Math.PI / 2);
  },
  fan(g, s) {
    // A fan-shaped floor: a 100° slice of a ring, opening to the front.
    const R = s * 1.05, th = (100 * Math.PI) / 180, t0 = -th / 2;
    const slice = (r, h, y, c, top = r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(top, r, h, 8, 1, false, t0, th), mat(c)); m.position.set(0, y + h / 2, -R * 0.55); g.add(m); };
    slice(R + 0.2, 0.25, 0, C.stone);
    slice(R, 0.1, FLOOR - 0.05, C.floor);
    for (let i = 0; i <= 4; i++) {
      const a = t0 + (i / 4) * th;
      for (const r of [R * 0.45, R]) {
        const x = Math.sin(a) * r, z = Math.cos(a) * r - R * 0.55;
        box(g, 0.26, FLOOR, 0.26, x, FLOOR / 2, z, C.stoneDark);
        box(g, 0.14, 1.6, 0.14, x, FLOOR + 0.8, z, C.post);
      }
    }
    slice(R + 0.1, 0.16, FLOOR + 1.54, C.beam);
    slice(R + 0.7, 0.75, FLOOR + 1.7, C.roof, R * 0.5);
  },
  thatch(g, s) {
    const r = (s / 2) * Math.SQRT2;
    box(g, s + 2.2, 0.06, s + 2.2, 0, 0.05, 0, '#7fae5c'); // its little rice paddy
    box(g, s + 0.2, 0.2, s + 0.2, 0, 0.1, 0, C.stone);
    box(g, s, 0.08, s, 0, FLOOR, 0, C.floor);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.24, FLOOR, 0.24, (sx * s) / 2, FLOOR / 2, (sz * s) / 2, C.stoneDark);
    ring(g, r, 4, 1.6, Math.PI / 4);
    cone(g, r + 0.8, 1.1, 10, FLOOR + 1.6, C.straw);
    cone(g, 0.18, 0.2, 8, FLOOR + 2.65, C.straw, 0, 0.1);
  },
};

export function buildJeongja(g, l) {
  for (const [x, z, ry, s, kind] of l.list) {
    const one = new THREE.Group();
    (KINDS[kind] || KINDS.square)(one, s);
    one.position.set(x, 0, z);
    one.rotation.y = ry;
    g.add(one);
  }
  mergeStatic(g);
}

export function buildPondIsle(g, l) {
  const w = l.w, d = l.d;
  const bank = new THREE.Group();
  for (const sz of [-1, 1]) box(bank, w + 0.9, 0.34, 0.45, 0, 0.1, sz * (d / 2 + 0.22), C.stoneDark);
  for (const sx of [-1, 1]) box(bank, 0.45, 0.34, d + 0.9, sx * (w / 2 + 0.22), 0.1, 0, C.stoneDark);
  bank.rotation.y = l.ry || 0;
  g.add(bank);
  cone(g, l.r + 0.15, 0.4, 16, 0, C.stoneDark, 0, l.r);
  cone(g, l.r - 0.1, 0.12, 16, 0.36, C.grass, 0, l.r - 0.2);
  cone(g, 0.2, 2.2, 6, 0.4, C.trunk, 0, 0.13);
  cone(g, 1.25, 2.6, 7, 2.2, C.pine);
  // Lotus leaves on the water.
  const pads = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const u = (((i * 37) % 17) / 17 - 0.5) * (w - 2.4), v = (((i * 53) % 13) / 13 - 0.5) * (d - 2.4);
    if (Math.hypot(u, v) < l.r + 0.9) continue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 7), mat(C.pad));
    m.position.set(u, 0.05, v);
    pads.add(m);
  }
  pads.rotation.y = l.ry || 0;
  g.add(pads);
  mergeStatic(g);
}
