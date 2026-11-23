// The Cactus & Succulent House in Seoul Botanic Park (stores.json
// "botanic-cactus-house", workshop "cactus-house"): what makes the shop room
// a desert house. A sand island in the middle with the big ones (a saguaro,
// barrel cacti, agaves, prickly pears, rocks) and a strip of sand with small
// cacti along the front wall, either side of the door. Made up: the real
// building is the park's forest school. Comes with the room builder
// (core/interior.js), not in the first download. One mesh a colour.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const CACTUS_ISLAND = { x: 0, z: 0.4, r: 2.3 }; // room metres

export function decorateCactusHouse(store, { scene, block, mat, w, d }) {
  const parts = new Map();
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  const geos = {};
  const prim = (k, make) => (geos[k] ||= make());
  const ball = () => prim('ball', () => new THREE.IcosahedronGeometry(1, 1));
  const low = () => prim('low', () => new THREE.IcosahedronGeometry(1, 0));
  const cyl = (n = 8) => prim('c' + n, () => new THREE.CylinderGeometry(1, 1, 1, n).translate(0, 0.5, 0)); // foot at the origin, 1 tall
  const cone = (n = 5) => prim('k' + n, () => new THREE.ConeGeometry(1, 1, n).translate(0, 0.5, 0));
  const put = (color, geo, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    m4.compose(v4.set(x, y, z), q4.setFromEuler(e4.set(rx, ry, rz, 'YXZ')), s4.set(sx, sy, sz));
    const g = geo.clone().applyMatrix4(m4), o = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(o.attributes)) if (k !== 'position' && k !== 'normal') o.deleteAttribute(k);
    if (!parts.has(color)) parts.set(color, []);
    parts.get(color).push(o);
  };
  const SAND = '#e6d3a3', EDGE = '#b9a98a', ROCK = '#9a8f82', GREEN = '#4f9a5c', DEEP = '#3f7f52', BLUE = '#6fa69a', GOLD = '#f0d060', PINK = '#e85a8a';
  const saguaro = (x, z, hgt, t) => {
    put(GREEN, cyl(), x, 0.1, z, 0.22, hgt, 0.22);
    put(GREEN, ball(), x, 0.1 + hgt, z, 0.22, 0.22, 0.22);
    for (const [s, y, up] of [[1, 0.45, 0.32], [-1, 0.58, 0.24]]) {
      const ax = Math.cos(t) * s, az = Math.sin(t) * s;
      put(GREEN, cyl(), x + ax * 0.2, hgt * y + 0.14, z + az * 0.2, 0.13, 0.42, 0.13, 0, -t, -s * Math.PI / 2);
      put(GREEN, cyl(), x + ax * 0.6, hgt * y, z + az * 0.6, 0.13, hgt * up, 0.13);
      put(GREEN, ball(), x + ax * 0.6, hgt * (y + up), z + az * 0.6, 0.13, 0.13, 0.13);
    }
  };
  const barrel = (x, z, r) => {
    put(DEEP, ball(), x, 0.1 + r * 0.85, z, r, r * 0.95, r);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; put(DEEP, ball(), x + Math.sin(a) * r * 0.86, 0.1 + r * 0.85, z + Math.cos(a) * r * 0.86, r * 0.16, r * 0.9, r * 0.22, 0, a); }
    put(GOLD, low(), x, 0.1 + r * 1.78, z, r * 0.4, r * 0.1, r * 0.4);
  };
  const agave = (x, z, s, t) => { for (let i = 0; i < 10; i++) { const a = t + i * 2.4, lean = 0.35 + (i / 10) * 0.85; put(BLUE, cone(4), x, 0.12, z, 0.1 * s, 0.9 * s, 0.045 * s, lean, a); } };
  const prickly = (x, z, s, t) => {
    const pad = (px, py, pz, r, tilt) => put(GREEN, ball(), px, py, pz, r, r * 1.25, r * 0.26, 0, t, tilt);
    const c = Math.cos(t), sn = Math.sin(t);
    pad(x, 0.1 + 0.3 * s, z, 0.26 * s, 0.05);
    pad(x - c * 0.22 * s, 0.1 + 0.72 * s, z + sn * 0.22 * s, 0.2 * s, 0.5);
    pad(x + c * 0.22 * s, 0.1 + 0.78 * s, z - sn * 0.22 * s, 0.21 * s, -0.45);
    pad(x + c * 0.36 * s, 0.1 + 1.14 * s, z - sn * 0.36 * s, 0.14 * s, -0.6);
    put(PINK, low(), x + c * 0.46 * s, 0.1 + 1.34 * s, z - sn * 0.46 * s, 0.05, 0.05, 0.05);
    put(PINK, low(), x - c * 0.3 * s, 0.1 + 1.0 * s, z + sn * 0.3 * s, 0.05, 0.05, 0.05);
  };
  const rock = (x, z, s, t) => put(ROCK, low(), x, 0.1 + s * 0.3, z, s, s * 0.6, s * 0.8, 0, t);

  // The island.
  const I = CACTUS_ISLAND;
  put(EDGE, cyl(20), I.x, 0, I.z, I.r, 0.16, I.r);
  put(SAND, cyl(20), I.x, 0.1, I.z, I.r - 0.14, 0.08, I.r - 0.14);
  saguaro(I.x - 0.3, I.z - 0.2, 2.5, 0.4);
  saguaro(I.x + 1.1, I.z - 0.9, 1.7, 2.2);
  barrel(I.x + 0.9, I.z + 0.9, 0.36);
  barrel(I.x + 0.2, I.z + 1.4, 0.26);
  barrel(I.x - 1.5, I.z + 0.3, 0.3);
  agave(I.x - 0.9, I.z + 1.2, 1, 0.3);
  agave(I.x + 1.5, I.z + 0.1, 0.8, 1.1);
  prickly(I.x - 1.1, I.z - 1.1, 1, 0.5);
  prickly(I.x + 0.1, I.z - 1.6, 0.8, 2.6);
  for (const [x, z, s, t] of [[-0.3, 0.9, 0.3, 0.2], [1.6, -0.3, 0.24, 1.4], [-1.7, -0.5, 0.26, 2.2], [0.6, 0.2, 0.2, 0.7]]) rock(I.x + x, I.z + z, s, t);
  for (let ang = 0; ang < 16; ang++) { const a = (ang / 16) * Math.PI * 2 + 0.2; block(I.x + Math.cos(a) * (I.r - 0.35), I.z + Math.sin(a) * (I.r - 0.35), 0.75, 0.75); }
  block(I.x, I.z, I.r * 1.3, I.r * 1.3);

  // Sand strips along the front wall, either side of the door.
  for (const s of [-1, 1]) {
    const x0 = s * 1.9, x1 = s * (w / 2 - 1.6), cx = (x0 + x1) / 2, len = Math.abs(x1 - x0), z = d / 2 - 0.75;
    put(EDGE, prim('box', () => new THREE.BoxGeometry(1, 1, 1)), cx, 0.08, z, len, 0.16, 0.9);
    put(SAND, prim('box', () => new THREE.BoxGeometry(1, 1, 1)), cx, 0.14, z, len - 0.2, 0.08, 0.7);
    const n = Math.max(3, Math.floor(len / 0.8));
    for (let i = 0; i < n; i++) {
      const x = Math.min(x0, x1) + (i + 0.5) * (len / n), k = (i + (s > 0 ? 2 : 0)) % 4;
      if (k === 0) barrel(x, z, 0.17); else if (k === 1) agave(x, z, 0.45, i); else if (k === 2) { put(GREEN, cyl(), x, 0.14, z, 0.09, 0.7 + (i % 2) * 0.3, 0.09); put(GREEN, ball(), x, 0.84 + (i % 2) * 0.3, z, 0.09, 0.09, 0.09); } else prickly(x, z, 0.45, i * 1.3);
    }
    block(cx, z, len, 0.9);
  }
  for (const [color, list] of parts) {
    const m = new THREE.Mesh(mergeGeometries(list), mat(color));
    m.matrixAutoUpdate = false;
    scene.add(m);
  }
}
