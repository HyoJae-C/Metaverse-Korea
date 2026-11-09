// A lake set down below the ground, the way Seokchon Lake's water lies a
// little under its lakeside walk: the water surface, stone banks round the
// shore and round each island, a railing along the shore, and along the walk
// lamps with flowers at their feet and benches facing the water. A road
// over the water (Songpa-daero over the channel joining the two lakes) gets
// a deck and parapets.
//
// Map data (a district landmark, local metres; x/z is the district origin,
// which mergeDistricts moves, so everything else stays in local metres):
//   { "type": "lakeshore", "x": 0, "z": 0, "depth": 1.1,
//     "lakes": [{ "shore": [[x, z], ...], "islands": [[[x, z], ...]] }],
//     "bridges": [{ "a": [x, z], "b": [x, z], "w": 10 }],  // a road over the water
//     "rails": [[[x, z], ...]], "lamps": [[x, z]], "benches": [[x, z, ry]] }
// The lake's water areas carry "sunk": true so the street doesn't draw them
// flat; the ground has the shores cut out (lakeHoles). Collision is the
// district's blockers. Everything still is baked into a few meshes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COLORS } from './world.js';

const C = {
  stone: '#bdb4a3', coping: '#d8d1c3', rail: '#4f5d57', wood: '#a8754a', woodDark: '#7d5535',
  pole: '#3f5a52', glow: '#fff1c4',
};
const FLOWERS = ['#ffd84a', '#8fd3ff', '#ffffff', '#ff9fc4', '#c9a8ff', '#ffb15c'];
const DEFAULT_DEPTH = 1.1;

// The shores to cut out of the ground, in world metres.
export function lakeHoles(landmarks = []) {
  return landmarks.filter((l) => l.type === 'lakeshore').flatMap((l) => l.lakes.map((k) => k.shore.map(([x, z]) => [x + (l.x || 0), z + (l.z || 0)])));
}

// A box with one colour, turned about y and placed: for baking.
function piece(list, sx, sy, sz, x, y, z, ry, color) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  paint(g, color);
  list.push(g);
}
function paint(g, color) {
  const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const clean = (g) => { const out = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(out.attributes)) if (!['position', 'normal', 'color'].includes(k)) out.deleteAttribute(k); return out; };

// Walls along a closed ring: the bank's face stands on the ring and the
// stone runs `side` (+1 or -1 of the segment's left normal) into the land.
function bank(list, ring, depth, outward) {
  // Ring orientation: on land to the left of each segment, or to the right.
  let area = 0;
  for (let i = 0; i < ring.length; i++) { const [x1, z1] = ring[i], [x2, z2] = ring[(i + 1) % ring.length]; area += x1 * z2 - x2 * z1; }
  const land = (area > 0 ? 1 : -1) * (outward ? -1 : 1);
  const h = depth + 0.5;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i], [x2, z2] = ring[(i + 1) % ring.length];
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.05) continue;
    const nx = (-(z2 - z1) / len) * land, nz = ((x2 - x1) / len) * land; // into the land
    const ry = -Math.atan2(z2 - z1, x2 - x1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    piece(list, len + 0.35, h, 0.5, mx + nx * 0.25, 0.04 - h / 2, mz + nz * 0.25, ry, C.stone);
    piece(list, len + 0.4, 0.14, 0.75, mx + nx * 0.3, 0.07, mz + nz * 0.3, ry, C.coping); // coping stones on top
  }
}

export function buildLakeshore(g, l) {
  const depth = l.depth || DEFAULT_DEPTH;
  const solid = [];
  // Water a little below the ground, the banks down to it.
  const water = [];
  for (const k of l.lakes || []) {
    const shape = new THREE.Shape(k.shore.map(([x, z]) => new THREE.Vector2(x, -z)));
    const w = new THREE.ShapeGeometry(shape);
    w.rotateX(-Math.PI / 2);
    w.translate(0, -depth, 0);
    water.push(w);
    bank(solid, k.shore, depth, false);
    for (const isl of k.islands || []) bank(solid, isl, depth, true);
  }
  if (water.length) {
    const m = new THREE.Mesh(mergeGeometries(water), new THREE.MeshLambertMaterial({ color: COLORS.water }));
    m.receiveShadow = true;
    m.name = 'lake-water';
    g.add(m);
  }
  // Railing along the shore: posts and two rails.
  for (const line of l.rails || []) {
    for (let i = 1; i < line.length; i++) {
      const [x1, z1] = line[i - 1], [x2, z2] = line[i];
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.05) continue;
      const ry = -Math.atan2(z2 - z1, x2 - x1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      piece(solid, len + 0.06, 0.07, 0.07, mx, 0.95, mz, ry, C.rail);
      piece(solid, len + 0.06, 0.05, 0.05, mx, 0.5, mz, ry, C.rail);
      const n = Math.max(1, Math.round(len / 2.4));
      for (let k = 0; k < n; k++) piece(solid, 0.08, 0.95, 0.08, x1 + ((x2 - x1) * k) / n, 0.48, z1 + ((z2 - z1) * k) / n, ry, C.rail);
    }
    const [x, z] = line[line.length - 1];
    piece(solid, 0.08, 0.95, 0.08, x, 0.48, z, 0, C.rail);
  }
  // Benches facing the water (ry: the way you look when sitting).
  for (const [x, z, ry] of l.benches || []) {
    const b = [];
    piece(b, 1.7, 0.08, 0.46, 0, 0.45, 0, 0, C.wood);
    piece(b, 1.7, 0.4, 0.07, 0, 0.72, -0.24, 0, C.wood);
    for (const sx of [-0.7, 0.7]) { piece(b, 0.07, 0.45, 0.42, sx, 0.22, 0, 0, C.woodDark); piece(b, 0.07, 0.55, 0.07, sx, 0.72, -0.25, 0, C.woodDark); }
    for (const p of b) { p.rotateY(ry); p.translate(x, 0, z); solid.push(p); }
  }
  // Lamps with a ring of flowers round each foot.
  const glow = [];
  (l.lamps || []).forEach(([x, z], i) => {
    piece(solid, 0.36, 0.3, 0.36, x, 0.15, z, 0, C.pole);
    piece(solid, 0.12, 3.3, 0.12, x, 1.8, z, 0, C.pole);
    piece(solid, 0.5, 0.08, 0.5, x, 3.45, z, 0, C.pole);
    const s = new THREE.SphereGeometry(0.32, 10, 8);
    s.translate(x, 3.78, z);
    glow.push(paint(s, C.glow));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + i, f = new THREE.IcosahedronGeometry(0.2, 0);
      f.scale(1, 0.7, 1);
      f.translate(x + Math.cos(a) * 0.6, 0.18, z + Math.sin(a) * 0.6);
      solid.push(paint(f, FLOWERS[(i + k) % FLOWERS.length]));
    }
  });
  // Bridges over the water (a road or path from a to b, w wide): a deck under
  // the road and a parapet each side.
  for (const { a: [x1, z1], b: [x2, z2], w } of l.bridges || []) {
    const len = Math.hypot(x2 - x1, z2 - z1), ry = -Math.atan2(z2 - z1, x2 - x1) + Math.PI / 2;
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2, ux = (z2 - z1) / len, uz = -(x2 - x1) / len; // across the deck
    piece(solid, w + 0.6, 0.45, len, mx, -0.2, mz, ry, C.coping);
    for (const s of [-1, 1]) {
      const px = mx + ux * s * (w / 2 + 0.15), pz = mz + uz * s * (w / 2 + 0.15);
      piece(solid, 0.3, 0.75, len, px, 0.38, pz, ry, C.stone);
      piece(solid, 0.4, 0.1, len, px, 0.8, pz, ry, C.coping);
    }
  }
  if (solid.length) {
    const m = new THREE.Mesh(mergeGeometries(solid.map(clean)), new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.castShadow = m.receiveShadow = true;
    m.name = 'lakeshore';
    g.add(m);
  }
  if (glow.length) {
    const m = new THREE.Mesh(mergeGeometries(glow.map(clean)), new THREE.MeshBasicMaterial({ vertexColors: true }));
    m.userData.noShadow = true;
    m.name = 'lake-lamps';
    g.add(m);
  }
}
