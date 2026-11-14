// The craft studios (Bukchon's Maeum Knot and Saekji Paper, Jongno
// Geumeunbang, Gyeol Ring Studio in Seongsu) are
// workshops, not shops: a big wooden work bench in the middle of the room
// with the craftsman standing behind it, the materials of the craft on it
// and on the wall behind. Souvenirs, if any, sit on the side walls only.
import * as THREE from 'three';
import { mat } from './product-model.js';

const BENCH_H = 0.62; // (as low as a shop counter: the chibi's face shows over it)
const WOOD = '#b07a4a', LEG = '#7a5134';

// Materials per craft: what lies on the bench and hangs on the wall.
const CORDS = ['#c8323c', '#2f5fa8', '#2f8a57', '#e0a82e', '#8a3f9a'];
const PAPERS = ['#f2c1c8', '#f5e3a1', '#bfe0c8', '#c9d8f2', '#f0a35a'];

function benchProps(kind, add, cyl, y) {
  if (kind.startsWith('pendant')) {
    add(0.34, 0.16, 0.2, -0.75, y + 0.08, 0.05, '#4a4d55'); // bench block (anvil)
    add(0.12, 0.06, 0.14, -0.53, y + 0.13, 0.05, '#4a4d55'); // its horn
    add(0.5, 0.012, 0.32, 0.05, y + 0.006, 0.12, '#d9dde2'); // silver sheet
    add(0.4, 0.012, 0.26, 0.05, y + 0.018, -0.25, '#e8b84a'); // gold sheet
    for (let k = 0; k < 3; k++) add(0.03, 0.02, 0.36, 0.55 + k * 0.08, y + 0.01, 0.1, '#8a8f99'); // files
    cyl(0.025, 0.5, 0.75, y + 0.25, -0.3, '#3a3d44'); // lamp post
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 14, 1, true), mat('#3a3d44', { side: THREE.DoubleSide }));
    shade.position.set(0.75, y + 0.52, -0.18);
    shade.rotation.x = 0.5;
    return [shade];
  }
  if (kind === 'knot') {
    CORDS.forEach((c, k) => cyl(0.07, 0.14, -0.9 + k * 0.22, y + 0.07, -0.25, c)); // spools of silk cord
    add(0.5, 0.04, 0.4, 0.45, y + 0.02, 0.1, '#e9dcc4'); // knotting board
    for (let k = 0; k < 3; k++) {
      cyl(0.035, 0.18, 0.3 + k * 0.15, y + 0.13, 0.1, CORDS[k]); // a tassel on the board
    }
    return [];
  }
  // hanji
  PAPERS.forEach((c, k) => add(0.42, 0.03 + k * 0.004, 0.32, -0.75, y + 0.015 + k * 0.034, 0, c)); // a stack of coloured paper
  add(0.34, 0.42, 0.34, 0.6, y + 0.21, -0.2, '#f7ecd2'); // a finished lantern
  cyl(0.08, 0.1, 0.05, y + 0.05, 0.15, '#eae4d8'); // glue pot
  add(0.03, 0.03, 0.28, 0.2, y + 0.015, 0.2, '#6b4a34'); // brush
  return [];
}

// The wall behind the bench: hanging cords, sheets of paper, or a pegboard of
// tools.
function wallRack(kind, add, z, h) {
  const y0 = Math.min(1.9, h - 1.6);
  add(3.2, 1.3, 0.06, 0, y0, z, kind.startsWith('pendant') ? '#c9a77a' : '#8a6a4a'); // board
  if (kind.startsWith('pendant')) {
    for (let k = 0; k < 7; k++) add(0.06, 0.34 + (k % 3) * 0.1, 0.04, -1.2 + k * 0.4, y0 + 0.15, z + 0.05, '#5a5e66'); // saws, files, pliers
    for (let k = 0; k < 5; k++) add(0.16, 0.16, 0.04, -1.0 + k * 0.5, y0 - 0.38, z + 0.05, k % 2 ? '#e8b84a' : '#d9dde2'); // finished pieces
  } else if (kind === 'knot') {
    add(3, 0.05, 0.08, 0, y0 + 0.55, z + 0.06, '#5a3e2a'); // rail
    for (let k = 0; k < 10; k++) add(0.05, 0.9, 0.03, -1.35 + k * 0.3, y0 + 0.08, z + 0.07, CORDS[k % CORDS.length]); // cords hanging
  } else {
    for (let k = 0; k < 5; k++) add(0.5, 0.7, 0.02, -1.2 + k * 0.6, y0, z + 0.06, PAPERS[k]); // paper sheets drying
  }
}

// Adds the bench and returns where the craftsman stands.
export function buildCraftBench(store, room, scene, block) {
  const { w, d, h } = room;
  const kind = store.craft;
  const bw = Math.min(3.2, w - 5), bd = 1.2, bz = -d * 0.08;
  const g = new THREE.Group();
  g.position.set(0, 0, bz);
  const add = (sx, sy, sz, x, y, z, c) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const cyl = (r, ht, x, y, z, c) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, ht, 14), mat(c));
    m.position.set(x, y, z);
    g.add(m);
  };
  add(bw, 0.08, bd, 0, BENCH_H - 0.04, 0, WOOD); // top
  for (const lx of [-bw / 2 + 0.12, bw / 2 - 0.12]) for (const lz of [-bd / 2 + 0.12, bd / 2 - 0.12]) add(0.1, BENCH_H - 0.08, 0.1, lx, (BENCH_H - 0.08) / 2, lz, LEG);
  for (const extra of benchProps(kind, add, cyl, BENCH_H)) g.add(extra);
  // Two stools on the visitors' side.
  for (const sx of [-0.7, 0.7]) {
    cyl(0.2, 0.05, sx, 0.36, bd / 2 + 0.55, WOOD);
    cyl(0.04, 0.34, sx, 0.17, bd / 2 + 0.55, LEG);
  }
  scene.add(g);
  // The rack on the back wall, behind the craftsman.
  const wallG = new THREE.Group();
  const addW = (sx, sy, sz, x, y, z, c) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
    m.position.set(x, y, z);
    wallG.add(m);
  };
  wallRack(kind, addW, -d / 2 + 0.06, h);
  scene.add(wallG);
  // A warm work lamp over the bench.
  const lamp = new THREE.PointLight(0xffe0b0, 6, 6);
  lamp.position.set(0, 2.4, bz);
  scene.add(lamp);
  block(0, bz, bw, bd);
  return { x: 0, z: bz - bd / 2 - 0.45, ry: 0 };
}
