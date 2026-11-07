// Hanok (한옥): map buildings marked "hanok": 1 (Bukchon) are drawn as small
// traditional houses instead of boxes. No two look quite alike: homes are
// ㄱ, ㄷ or ㅡ shaped round a little courtyard (마당) behind a tiled wall
// (담장) with a gate (대문); shops are a row of bays of different heights.
// Roofs curve up at the corners (처마), in grey, dark brown, brown or
// celadon tiles; walls vary in tone, some with a stone lower band (사괴석).
// Courtyards get a tree (pine, persimmon, maple) or a row of onggi jars.
// Up the hill the houses stand on stone terraces ("lv" on the building).
// The front faces the way "fr" points (set by scripts/build-bukchon.mjs).
//
// Everything is merged into two meshes with vertex colours, so a village of
// a few hundred stays cheap. Collision still comes from the outline
// (core/collision.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const HANOK = {
  base: 0.6, // stone base height
  wall: 2.7, // wall height above the base
  roof: 2.1, // roof height
  eave: 1.0, // how far the eaves reach past the walls
};

const PAL = {
  // Tile colours: mostly grey, with dark brown, brown and celadon roofs.
  roof: ['#4a5059', '#3f4650', '#5b6168', '#4a5059', '#5a3f33', '#6e4a36', '#7d5a40', '#3f6f68', '#4f8078'],
  wall: ['#f1e7d2', '#f6f0e3', '#eadcc0', '#efe3cc', '#f3e2c6'],
  wood: ['#6b4630', '#5a3a28', '#7a5236', '#4f3424'],
  base: ['#b9ae98', '#a9a08e', '#c4b8a0'],
  stone: ['#9a9284', '#8c8577', '#a59d8c'],
  lattice: '#8a6446', paper: '#f7eedb', door: '#7a5236',
  leaf: ['#6f8f45', '#5f7f3e', '#89a04a', '#c9762e', '#d9a23a', '#b8432f'],
  pine: '#3f6a3a', trunk: '#5e4330', fruit: '#f07a1a', jar: '#5a3422', jarLid: '#3d2418',
};

// A small seeded random from the building's position (same look every visit).
function rng(x, z) {
  let s = (Math.imul(Math.round(x * 10), 73856093) ^ Math.imul(Math.round(z * 10), 19349663)) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const tint = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

// Footprint of an outline: centre, width along x, depth along z, turn (rad).
// Outlines are rectangles; the longer side sets the ridge direction.
export function footprint(p) {
  const [a, b, , d] = p;
  const ex = [b[0] - a[0], b[1] - a[1]], ez = [d[0] - a[0], d[1] - a[1]];
  const w = Math.hypot(...ex), dep = Math.hypot(...ez);
  const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cz = p.reduce((s, q) => s + q[1], 0) / p.length;
  let ry = -Math.atan2(ex[1], ex[0]);
  return w >= dep ? { cx, cz, w, d: dep, ry } : { cx, cz, w: dep, d: w, ry: ry + Math.PI / 2 };
}

// The lot in front-facing terms: L across the front, D front to back, and the
// turn that points local +z at the front ("fr": a direction on the map).
function lot(b) {
  const f = footprint(b.p);
  if (!b.fr) return { cx: f.cx, cz: f.cz, L: f.w, D: f.d, ry: f.ry };
  const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
  const ex = Math.max(...xs) - Math.min(...xs), ez = Math.max(...zs) - Math.min(...zs);
  const alongX = Math.abs(b.fr[0]) > Math.abs(b.fr[1]);
  return { cx: f.cx, cz: f.cz, L: alongX ? ez : ex, D: alongX ? ex : ez, ry: Math.atan2(b.fr[0], b.fr[1]) };
}

function paint(g, c) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// A tiled roof with a concave slope and corners that turn up. w × d at the
// eaves, h high, its eaves at y = 0. hip: 팔작/우진각 style (four slopes),
// else a gable (맞배: two slopes and triangle ends in `end` colour).
export function curvedRoof(w, d, h, { hip = true, lift = 0.5, seg = 6, rows = 2, color, end, ridgeEnds = true }) {
  const hw = w / 2, hd = d / 2, r = hip ? Math.max(0.4, hw - hd * 0.95) : hw;
  const pos = [], col = [];
  const dark = color.clone().multiplyScalar(0.82), ridgeC = color.clone().multiplyScalar(0.62);
  const Y = (u, v) => h * Math.pow(v, 1.4) + lift * Math.pow(Math.abs(u), 3) * (1 - v) * (1 - v);
  const slope = (eave, ridge, n, stripes) => {
    for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
      const P = (ii, jj) => {
        const u = -1 + (2 * ii) / n, v = jj / rows, e = eave(u), q = ridge(u);
        return [e[0] + (q[0] - e[0]) * v, Y(u, v), e[1] + (q[1] - e[1]) * v];
      };
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), dd = P(i, j + 1);
      pos.push(...a, ...b, ...c, ...a, ...c, ...dd);
      const k = stripes && i % 2 ? dark : j === 0 ? dark : color; // tile rows, and a darker eave edge
      for (let t = 0; t < 6; t++) col.push(k.r, k.g, k.b);
    }
  };
  slope((u) => [u * hw, hd], (u) => [u * r, 0], seg * 2, true);
  slope((u) => [-u * hw, -hd], (u) => [-u * r, 0], seg * 2, true);
  if (hip) {
    slope((u) => [hw, -u * hd], () => [r, 0], seg, true);
    slope((u) => [-hw, u * hd], () => [-r, 0], seg, true);
  } else {
    const e = end || color, y0 = Y(1, 0) + 0.15, x = hw - 0.7;
    for (const sx of [-1, 1]) {
      pos.push(sx * x, y0, hd - 0.6, sx * x, y0, -hd + 0.6, sx * x, h - 0.1, 0);
      for (let t = 0; t < 3; t++) col.push(e.r, e.g, e.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // The ridge (용마루), a little higher at the ends.
  const ridge = [new THREE.BoxGeometry(2 * r + 0.5, h * 0.14, h * 0.18).translate(0, h + h * 0.05, 0)];
  if (ridgeEnds) for (const sx of [-1, 1]) ridge.push(new THREE.BoxGeometry(0.35, h * 0.3, h * 0.2).translate(sx * (r + 0.2), h + h * 0.12, 0));
  return [g, ...ridge.map((b) => paint(b.toNonIndexed(), ridgeC))];
}

// Collects coloured pieces under a stack of transforms.
// Wall textures, drawn once: squared granite blocks (사괴석) with pale
// mortar, and red-brown brick. One tile is TILE metres.
const TILE = { w: 1.2, h: 0.6 };
const texCache = {};
export function wallTexture(kind) {
  if (kind in texCache) return texCache[kind];
  if (typeof document === 'undefined') return (texCache[kind] = null);
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  const stone = kind === 'stone';
  x.fillStyle = stone ? '#e6e0d3' : '#d9cfbf'; // mortar
  x.fillRect(0, 0, 256, 128);
  const rows = stone ? 2 : 8, cols = stone ? 4 : 5, m = stone ? 5 : 3;
  const tones = stone ? ['#9b968e', '#a9a39a', '#8f8a83', '#b1aba1', '#97928a'] : ['#9a4a3a', '#a65440', '#8c4234', '#b05f48', '#93473a'];
  for (let r = 0; r < rows; r++) {
    const h = 128 / rows, off = (r % 2) * (256 / cols) / 2;
    for (let i = -1; i < cols; i++) {
      const w = 256 / cols;
      x.fillStyle = tones[(r * 3 + i * 7 + 20) % tones.length];
      x.fillRect(off + i * w + m / 2, r * h + m / 2, w - m, h - m);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return (texCache[kind] = t);
}

class Kit {
  constructor() { this.body = []; this.roof = []; this.stone = []; this.brick = []; this.m = new THREE.Matrix4(); }
  at(x, y, z, ry, fn) {
    const keep = this.m.clone();
    this.m.multiply(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
    fn();
    this.m.copy(keep);
  }
  add(list, g, c) {
    if (g.index) g = g.toNonIndexed();
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (c) paint(g, c instanceof THREE.Color ? c : new THREE.Color(c));
    list.push(g.applyMatrix4(this.m));
  }
  box(c, sx, sy, sz, x, y, z) { this.add(this.body, new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), c); }
  // A flat face (2 triangles, not a box's 12) facing +z, or -z when back.
  quad(c, w, h, x, y, z, back = false) { const g = new THREE.PlaneGeometry(w, h); if (back) g.rotateY(Math.PI); this.add(this.body, g.translate(x, y, z), c); }
  // A textured face (stone blocks or brick, see wallTexture): w × h, facing
  // +z (or -z with back), its texture at true size whatever the face's size.
  face(kind, w, h, x, y, z, back = false) {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / TILE.w, uv.getY(i) * h / TILE.h);
    if (back) g.rotateY(Math.PI);
    g.translate(x, y, z);
    (kind === 'brick' ? this.brick : this.stone).push(g.toNonIndexed().applyMatrix4(this.m));
  }
  // The four sides of a box (sx × sy × sz centred at x, y, z) in one texture.
  faces(kind, sx, sy, sz, x, y, z) {
    this.face(kind, sx, sy, x, y, z + sz / 2 + 0.01);
    this.face(kind, sx, sy, x, y, z - sz / 2 - 0.01, true);
    this.at(x, 0, z, Math.PI / 2, () => { this.face(kind, sz, sy, 0, y, sx / 2 + 0.01); this.face(kind, sz, sy, 0, y, -sx / 2 - 0.01, true); });
  }
  roofAt(y, w, d, h, o) { for (const g of curvedRoof(w, d, h, o)) this.add(this.roof, g.translate(0, y, 0)); }
}

// One wing: L long (x), D deep (z), front at +z. o: look of the house.
function wing(k, L, D, o, { doors = true, tall = 0 } = {}) {
  const B = o.base, W = o.wall + tall, top = B + W;
  k.box(o.baseC, L + 0.7, B, D + 0.7, 0, B / 2, 0);
  k.box(o.wallC, L, W, D, 0, B + W / 2, 0);
  // The lower wall: squared stones (사괴석) or brick, all round; brick houses
  // are brick up to the eaves at the back and the ends.
  k.faces(o.band, L, 1.1, D, 0, B + 0.55, 0);
  if (o.band === 'brick' && o.tallBrick) {
    k.face('brick', L, W - 1.1, 0, B + 1.1 + (W - 1.1) / 2, -D / 2 - 0.01, true);
    k.at(0, 0, 0, Math.PI / 2, () => { for (const s of [-1, 1]) k.face('brick', D, W - 1.1, 0, B + 1.1 + (W - 1.1) / 2, s * (L / 2 + 0.01), s < 0); });
  }
  // Frame: corner posts, posts between bays, a beam under the eaves.
  const bays = Math.max(1, Math.round(L / 2.6));
  for (let i = 0; i <= bays; i++) {
    const x = -L / 2 + (i * L) / bays;
    for (const sz of [-1, 1]) k.box(o.woodC, 0.26, W, 0.22, x, B + W / 2, sz * (D / 2 + 0.03));
  }
  k.box(o.woodC, L + 0.3, 0.3, D + 0.3, 0, top - 0.15, 0);
  // Front: lattice doors and windows (paper behind a wooden grid); back: small windows.
  for (let i = 0; i < bays; i++) {
    const x = -L / 2 + ((i + 0.5) * L) / bays, bw = (L / bays) * 0.62;
    const door = doors && (i + o.seed) % 3 !== 1, hgt = door ? Math.min(2.1, W - 0.5) : 1.0, y = door ? B + 0.1 + hgt / 2 : B + 1.6;
    const zf = D / 2 + 0.03;
    k.quad(PAL.lattice, bw + 0.14, hgt + 0.14, x, y, zf);
    k.quad(PAL.paper, bw, hgt, x, y, zf + 0.01);
    for (let g = 1; g < 3; g++) k.quad(PAL.lattice, 0.06, hgt, x - bw / 2 + (g * bw) / 3, y, zf + 0.02);
    k.quad(PAL.lattice, bw, 0.06, x, y, zf + 0.02);
    if ((i + o.seed) % 2 === 0) k.quad(PAL.paper, bw * 0.6, 0.6, x, B + 1.9, -D / 2 - 0.03, true);
  }
  if (doors) k.box(o.baseC, L * 0.8, 0.22, 0.5, 0, 0.11, D / 2 + 0.6); // a stepping stone (댓돌)
  const e = o.eave;
  k.roofAt(top, L + 2 * e, D + 2.2 * e, o.roofH + tall * 0.4, { hip: o.hip, lift: o.lift, color: o.roofC, end: o.wallC, seg: Math.max(3, Math.round(L / 3)) });
}

// A courtyard wall (담장) from (x0, z) to (x1, z) along x, with a tiled cap.
function fence(k, x0, x1, z, o, ry = 0) {
  const len = Math.abs(x1 - x0);
  if (len < 0.4) return;
  k.at((x0 + x1) / 2, 0, z, ry, () => {
    k.box(o.stoneC, len, 0.9, 0.55, 0, 0.45, 0);
    for (const s of [-1, 1]) k.face(o.band, len, 0.9, 0, 0.45, s * 0.285, s < 0); // stones (or brick) both sides
    k.box(o.wallC, len, 0.8, 0.45, 0, 1.3, 0);
    k.roofAt(1.7, len + 0.3, 1.1, 0.35, { hip: false, lift: 0.04, color: o.roofC, end: o.wallC, seg: Math.max(1, Math.round(len / 4)), rows: 1, ridgeEnds: false });
  });
}

// A gate (대문): two posts, wooden doors, a little roof. Centre (x, z), facing +z.
function gate(k, x, z, o, ry = 0) {
  k.at(x, 0, z, ry, () => {
    for (const sx of [-1, 1]) k.box(o.woodC, 0.3, 2.6, 0.3, sx * 1.15, 1.3, 0);
    k.box(o.woodC, 2.6, 0.25, 0.35, 0, 2.5, 0);
    if (o.visit) for (const sx of [-1, 1]) k.box(PAL.door, 0.08, 2.1, 1.0, sx * 1.0, 1.15, -0.75); // open, swung inwards
    else {
      k.box(PAL.door, 1.0, 2.1, 0.08, -0.55, 1.15, -0.2);
      k.box(PAL.door, 1.0, 2.1, 0.08, 0.55, 1.15, -0.2);
    }
    k.box(o.baseC, 2.4, 0.18, 0.9, 0, 0.09, 0.4);
    k.roofAt(2.65, 3.6, 1.9, 0.8, { hip: false, lift: 0.18, color: o.roofC, end: o.wallC, seg: 2, rows: 2 });
  });
}

function tree(k, x, z, r) {
  const kind = r();
  k.at(x, 0, z, r() * 6, () => {
    if (kind < 0.3) { // a pine (소나무): a leaning trunk, flat dark tiers
      k.box(PAL.trunk, 0.35, 3.6, 0.35, 0.2, 1.8, 0);
      for (const [y, s] of [[3.2, 2.4], [4.1, 1.8], [4.8, 1.1]]) {
        const g = new THREE.IcosahedronGeometry(1, 0).scale(s, 0.45, s * 0.8).translate(0.4, y, 0);
        k.add(k.body, g, PAL.pine);
      }
      return;
    }
    const c = pick(r, PAL.leaf), s = 1.6 + r() * 0.9;
    k.box(PAL.trunk, 0.32, 2.6, 0.32, 0, 1.3, 0);
    k.add(k.body, new THREE.IcosahedronGeometry(s, 0).scale(1, 0.85, 1).translate(0, 2.6 + s * 0.6, 0), c);
    if (kind < 0.6) for (let i = 0; i < 7; i++) { // a persimmon tree (감나무) with fruit
      const a = i * 2.3;
      k.box(PAL.fruit, 0.24, 0.24, 0.24, Math.cos(a) * s * 0.85, 2.4 + s * 0.4 + (i % 3) * 0.4, Math.sin(a) * s * 0.85);
    }
  });
}

function jars(k, x, z, r) { // jangdokdae (장독대): a stone step with onggi jars
  k.box(PAL.stone[0], 3.0, 0.35, 1.5, x, 0.18, z);
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const s = 0.7 + r() * 0.35, jx = x - 1.1 + (i * 2.2) / Math.max(1, n - 1);
    k.add(k.body, new THREE.IcosahedronGeometry(0.5 * s, 0).scale(1, 1.15, 1).translate(jx, 0.35 + 0.55 * s, z), PAL.jar);
    k.box(PAL.jarLid, 0.6 * s, 0.1, 0.6 * s, jx, 0.35 + 1.12 * s, z);
  }
}

// A home round a courtyard: L across the front, D deep, front at +z.
function home(k, L, D, o, r) {
  const t = r(), back = Math.min(5.5, D * 0.48), side = Math.min(4.6, L * 0.34);
  const zb = -D / 2 + back / 2 + 0.4; // the main wing (안채) along the back
  const shape = o.visit ? 'ㄷ' : L < 10 ? 'ㅡ' : t < 0.42 ? 'ㄱ' : t < 0.72 ? 'ㄷ' : 'ㅡ'; // (open to visitors: always ㄷ, gate in the middle)
  wing(k, L - 0.8, back, o);
  const yard = { x0: -L / 2 + 0.6, x1: L / 2 - 0.6, z0: zb + back / 2 + 0.8, z1: D / 2 - 0.6 };
  const left = r() < 0.5;
  const sideWing = (sx) => {
    const len = D - back - 1.6, x = sx * (L / 2 - side / 2 - 0.4), z = zb + back / 2 + 0.4 + len / 2;
    k.at(x, 0, z, -sx * Math.PI / 2, () => wing(k, len, side, { ...o, roofH: o.roofH * 0.85 }, { doors: true }));
    if (sx < 0) yard.x0 = x + side / 2 + 0.6; else yard.x1 = x - side / 2 - 0.6;
  };
  if (shape === 'ㄱ') sideWing(left ? -1 : 1);
  if (shape === 'ㄷ') { sideWing(-1); sideWing(1); }
  // The wall round the front and the open sides, a gate in the front wall.
  const zf = D / 2 - 0.3, gx = shape === 'ㄷ' ? 0 : (yard.x0 + yard.x1) / 2 + (left ? 1 : -1) * Math.max(0, (yard.x1 - yard.x0) / 2 - 2);
  fence(k, -L / 2 + 0.3, gx - 1.3, zf, o);
  fence(k, gx + 1.3, L / 2 - 0.3, zf, o);
  gate(k, gx, zf, o);
  const sideFence = (sx) => k.at(sx * (L / 2 - 0.3), 0, (zb + back / 2 + zf) / 2, Math.PI / 2, () => fence(k, -(zf - zb - back / 2) / 2, (zf - zb - back / 2) / 2, 0, o));
  if (shape !== 'ㄷ') { if (shape === 'ㅡ' || left) sideFence(1); if (shape === 'ㅡ' || !left) sideFence(-1); }
  // In the courtyard: a tree, or the jars, or both.
  const w = yard.x1 - yard.x0, d = yard.z1 - yard.z0;
  if (w > 2.5 && d > 1.8) {
    const u = r();
    if (u < 0.65) tree(k, yard.x0 + w * (left ? 0.75 : 0.25), yard.z0 + d * 0.5, r);
    if (u > 0.45 && w > 4) jars(k, yard.x0 + w * (left ? 0.3 : 0.7), yard.z0 + Math.min(1.2, d * 0.4), r);
  }
}

// A shop: bays of different heights across the front, a wing behind, a yard.
function shop(k, L, D, o, r) {
  const n = L > 16 ? 3 : 2, front = Math.min(7.5, D * 0.42), z = D / 2 - front / 2 - 0.4;
  const big = Math.floor(r() * n);
  for (let i = 0; i < n; i++) {
    const bw = (L - 0.6) / n, x = -L / 2 + 0.3 + (i + 0.5) * bw;
    const look = { ...o, seed: o.seed + i, roofC: i === big ? o.roofC : tint(pick(r, PAL.roof), 1), stone: i !== big && o.stone };
    k.at(x, 0, z, 0, () => wing(k, bw - 1.0, front, look, { tall: i === big ? 0.9 : r() * 0.3 }));
  }
  const back = Math.min(6, D * 0.32);
  k.at(0, 0, -D / 2 + back / 2 + 0.4, 0, () => wing(k, L * 0.7, back, { ...o, seed: o.seed + 5 }, { doors: true }));
  for (const sx of [-1, 1]) k.at(sx * (L / 2 - 0.3), 0, 0, Math.PI / 2, () => fence(k, -D / 2 + back + 0.6, D / 2 - front - 0.6, 0, o));
  const yard = D - front - back - 1.6;
  if (yard > 2.5) tree(k, (r() - 0.5) * L * 0.5, -D / 2 + back + 0.8 + yard / 2, r);
}

function house(k, b, i) {
  const { cx, cz, L, D, ry } = lot(b);
  const r = rng(cx, cz);
  const lv = b.lv || 0;
  const o = {
    seed: i,
    base: 0.45 + r() * 0.35,
    wall: HANOK.wall - 0.25 + r() * 0.5,
    roofH: HANOK.roof - 0.2 + r() * 0.6,
    eave: HANOK.eave + r() * 0.25,
    lift: 0.45 + r() * 0.35,
    hip: r() < 0.8,
    roofC: tint(pick(r, PAL.roof), 0.95 + r() * 0.1),
    wallC: tint(pick(r, PAL.wall), 1),
    woodC: tint(pick(r, PAL.wood), 1),
    baseC: tint(pick(r, PAL.base), 1),
    stoneC: tint(pick(r, PAL.stone), 1),
    stone: r() < 0.45,
  };
  o.band = o.stone || r() < 0.6 ? 'stone' : 'brick';
  o.tallBrick = r() < 0.5;
  o.visit = !!b.visit;
  k.at(cx, 0, cz, ry, () => {
    if (lv > 0.05) { k.box(o.stoneC, L, lv, D, 0, lv / 2, 0); k.faces('stone', L, lv, D, 0, lv / 2, 0); } // the stone terrace (축대) up the hill
    k.at(0, lv, 0, 0, () => (b.h >= 6 ? shop(k, L, D, o, r) : home(k, L, D, o, r)));
  });
}

export function buildHanoks(buildings) {
  const group = new THREE.Group();
  group.name = 'hanok';
  if (!buildings.length) return group;
  const k = new Kit();
  buildings.forEach((b, i) => { if (b.p && b.p.length >= 4) house(k, b, i); });
  for (const [name, list, side] of [['walls', k.body, THREE.FrontSide], ['walls', k.roof, THREE.DoubleSide]]) {
    if (!list.length) continue;
    const geo = mergeGeometries(list.map((g) => { for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(a)) g.deleteAttribute(a); return g; }));
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side }));
    mesh.name = name; // (walls cast shadows)
    group.add(mesh);
  }
  for (const kind of ['stone', 'brick']) {
    const list = k[kind];
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(list), new THREE.MeshLambertMaterial({ map: wallTexture(kind), color: wallTexture(kind) ? 0xffffff : kind === 'brick' ? 0x9a4a3a : 0x9a9284 }));
    mesh.name = 'walls';
    group.add(mesh);
  }
  return group;
}
