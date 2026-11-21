// What Seoul Botanic Park looks like (loaded by game/botanic-near.js when
// you come near): the dish-shaped glass greenhouse you walk straight into
// (the map's "botanic" landmark, 50% of real on purpose), everything growing
// in it (core/botanic-layout.js: a tropical half and a Mediterranean half),
// the pot stands of its shop, and the park's trees, flower beds and reeds.
// The greenhouse and its plants are merged per colour, the park's trees are
// instanced: about 30 draw calls for the whole place.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex } from '../core/three-kit.js';
import { buildFurniture, furnitureById } from '../core/furniture.js';
import { GREENHOUSE, greenhouseLayout, wallPieces } from '../core/botanic-layout.js';
import { SEASON, MIX, leafColor, leafHash } from '../core/season.js';

const C = {
  frame: '#f4f6f4', path: '#d9cfbd', soil: '#6a4f3a', edge: '#b9b0a0', water: '#5fa7b8', lily: '#4f9a5a', lilyFlower: '#f6e9f0',
  trunk: '#7a5a3e', palm: '#3f8f4a', banana: '#6fb04a', ficus: '#2f7a48', fern: '#4f9e4a', olive: '#8fa88a', olTrunk: '#8a7a66', cactus: '#4f9a5c',
  agave: '#6fa69a', lavender: '#8f7ac8', citrus: '#3f8a45', orange: '#f29a2a', cypress: '#2f6a45', baobab: '#a08a78', bottle: '#9a8a70', dragon: '#4f8f6a',
  flowerA: '#f2668a', flowerB: '#f2c230', wood: '#b88a5a', pot: '#c97b52', white: '#f6f1f6', jaw: '#c8504a',
};
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

export function buildBotanicSite(l, store) {
  const K = GREENHOUSE, R = l.r, lay = greenhouseLayout(l);
  const group = new THREE.Group();
  group.name = 'botanic';
  group.position.set(l.x, 0, l.z);

  // --- Geometry buckets, one mesh a colour -----------------------------------
  const parts = new Map();
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  const clean = (g) => { const o = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(o.attributes)) if (k !== 'position' && k !== 'normal') o.deleteAttribute(k); return o; };
  const add = (color, g) => { if (!parts.has(color)) parts.set(color, []); parts.get(color).push(clean(g)); };
  const geos = {};
  const prim = (k, make) => (geos[k] ||= make());
  const ball = () => prim('ball', () => new THREE.IcosahedronGeometry(1, 1));
  const lowBall = () => prim('low', () => new THREE.IcosahedronGeometry(1, 0));
  const cyl = (a, b, n = 7) => prim(`c${a},${b},${n}`, () => new THREE.CylinderGeometry(a, b, 1, n).translate(0, 0.5, 0)); // foot at the origin, 1 tall
  const cone = (n = 6) => prim('k' + n, () => new THREE.ConeGeometry(1, 1, n).translate(0, 0.5, 0));
  const blade = () => prim('blade', () => { // a leaf or frond: a long diamond, bent down toward its tip, from the origin along +z
    const g = new THREE.BufferGeometry();
    const v = [0, 0, 0, 0.5, 0.06, 0.45, -0.5, 0.06, 0.45, 0.5, 0.06, 0.45, 0, -0.18, 1, -0.5, 0.06, 0.45];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  });
  // Put a shared shape into a colour's bucket: at (x, y, z), sized (sx, sy, sz), turned (rx, ry, rz) in 'YXZ' order.
  const put = (color, geo, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    m4.compose(v4.set(x, y, z), q4.setFromEuler(e4.set(rx, ry, rz, 'YXZ')), s4.set(sx, sy, sz));
    add(color, geo.clone().applyMatrix4(m4));
  };
  // A ring of n blades round (x, y, z): len long, wide across, dipping by `dip` radians.
  const fronds = (color, x, y, z, n, len, wide, dip, turn = 0) => { for (let i = 0; i < n; i++) put(color, blade(), x, y, z, wide, len, len, dip + (i % 2) * 0.12, turn + (i / n) * Math.PI * 2, 0); };

  // --- The plants (all sizes in metres; s scales the whole plant) ---------------
  const roofRoom = (x, z) => lay.roofAt(Math.hypot(x, z)) - 0.8;
  const PLANT = {
    palm(x, z, s, t) {
      const h = Math.min(roofRoom(x, z) - 1.2, 6.8 * s), lx = Math.sin(t) * 0.5, lz = Math.cos(t) * 0.5;
      put(C.trunk, cyl(0.6, 1), x, 0, z, 0.24, h, 0.24, 0.07 * Math.cos(t), 0, -0.07 * Math.sin(t));
      fronds(C.palm, x + lx * h * 0.14, h, z + lz * h * 0.14, 9, 2.7 * s, 0.75, 0.35, t);
    },
    banana(x, z, s, t) {
      put(C.banana, cyl(0.7, 1), x, 0, z, 0.2, 1.7 * s, 0.2);
      for (let i = 0; i < 6; i++) put(i % 2 ? C.banana : C.fern, blade(), x, 1.5 * s, z, 0.85, 2.3 * s, 2.3 * s, -0.75 + (i % 3) * 0.3, t + i * 1.05, 0);
    },
    ficus(x, z, s, t) { // a big rubber fig: a thick trunk, hanging roots, a wide dark crown
      const h = Math.min(roofRoom(x, z) - 2.2, 5.2 * s);
      put(C.trunk, cyl(0.7, 1), x, 0, z, 0.42, h, 0.42);
      for (let i = 0; i < 4; i++) { const a = t + i * 1.57; put(C.trunk, cyl(1, 1, 4), x + Math.cos(a) * 1.1, 0, z + Math.sin(a) * 1.1, 0.045, h * 0.9, 0.045); }
      for (const [dx, dy, dz, r] of [[0, 0.6, 0, 2.3], [1.4, 0, 0.5, 1.6], [-1.3, 0.1, -0.6, 1.7], [0.2, 0.2, -1.5, 1.5], [-0.3, 0, 1.5, 1.5]]) put(C.ficus, lowBall(), x + dx * s, h + dy, z + dz * s, r * s, r * 0.62 * s, r * s, 0, t);
    },
    treefern(x, z, s, t) {
      const h = 2.3 * s;
      put('#5a4a3a', cyl(0.8, 1), x, 0, z, 0.16, h, 0.16);
      fronds(C.fern, x, h, z, 10, 1.9 * s, 0.5, 0.1, t);
    },
    fern(x, z, s, t) { fronds(C.fern, x, 0.12, z, 8, 0.75 * s, 0.32, -0.45, t); },
    monstera(x, z, s, t) { for (let i = 0; i < 6; i++) put(C.ficus, blade(), x, 0.1, z, 0.75 * s, 1.05 * s, 1.05 * s, -0.7 + (i % 3) * 0.25, t + i * 1.05, 0); },
    paradise(x, z, s, t) {
      for (let i = 0; i < 7; i++) put(C.palm, blade(), x, 0.05, z, 0.42 * s, 1.7 * s, 1.7 * s, -1.2 + (i % 2) * 0.12, t + i * 0.9, 0);
      for (let i = 0; i < 2; i++) put(C.orange, cone(4), x + Math.cos(t + i * 3) * 0.3, 1.25 * s, z + Math.sin(t + i * 3) * 0.3, 0.07, 0.34, 0.07, 1.1, t + i * 3, 0);
    },
    flower(x, z, s, t) {
      put(C.fern, lowBall(), x, 0.18, z, 0.5 * s, 0.26, 0.5 * s, 0, t);
      for (let i = 0; i < 5; i++) put(i % 2 ? C.flowerA : C.flowerB, lowBall(), x + Math.cos(t + i * 1.26) * 0.3 * s, 0.42, z + Math.sin(t + i * 1.26) * 0.3 * s, 0.11, 0.09, 0.11);
    },
    olive(x, z, s, t) {
      const h = 2.1 * s;
      put(C.olTrunk, cyl(0.6, 1, 6), x, 0, z, 0.2, h, 0.2, 0.12 * Math.cos(t), 0, 0.12 * Math.sin(t));
      for (const [dx, dy, dz, r] of [[0, 0.7, 0, 1.25], [0.8, 0.2, 0.3, 0.85], [-0.75, 0.3, -0.3, 0.9], [0.1, 1.2, -0.3, 0.75]]) put(C.olive, lowBall(), x + dx * s, h + dy * s, z + dz * s, r * s, r * 0.75 * s, r * s, 0, t);
    },
    cactus(x, z, s, t) {
      const h = 3.2 * s;
      put(C.cactus, cyl(0.92, 1, 8), x, 0, z, 0.26, h, 0.26);
      put(C.cactus, ball(), x, h, z, 0.24, 0.24, 0.24);
      for (const [sd, y, len] of [[1, 0.45, 0.32], [-1, 0.6, 0.24]]) {
        const ax = x + Math.cos(t) * 0.6 * sd * s, az = z + Math.sin(t) * 0.6 * sd * s;
        put(C.cactus, cyl(1, 1, 6), (x + ax) / 2, h * y, (z + az) / 2, 0.15, 0.6 * s, 0.15, Math.PI / 2, Math.atan2(ax - x, az - z) + Math.PI, 0);
        put(C.cactus, cyl(0.9, 1, 6), ax, h * y - 0.1, az, 0.16, h * len, 0.16);
        put(C.cactus, ball(), ax, h * (y + len) - 0.1, az, 0.15, 0.15, 0.15);
      }
    },
    cactusball(x, z, s, t) { put(C.cactus, ball(), x, 0.3 * s, z, 0.38 * s, 0.34 * s, 0.38 * s, 0, t); put(C.flowerB, lowBall(), x, 0.63 * s, z, 0.07, 0.05, 0.07); },
    agave(x, z, s, t) { for (let i = 0; i < 9; i++) put(C.agave, blade(), x, 0.05, z, 0.26 * s, 0.9 * s, 0.9 * s, -0.5 - (i % 3) * 0.32, t + i * 0.7, 0); },
    lavender(x, z, s, t) { put('#7f9a78', lowBall(), x, 0.2, z, 0.48 * s, 0.26, 0.48 * s, 0, t); for (let i = 0; i < 7; i++) put(C.lavender, cone(4), x + Math.cos(t + i * 0.9) * 0.3 * s, 0.3, z + Math.sin(t + i * 0.9) * 0.3 * s, 0.05, 0.42 * s, 0.05, 0.25 * Math.cos(i), i, 0.25 * Math.sin(i)); },
    citrus(x, z, s, t) {
      const h = 1.5 * s;
      put(C.trunk, cyl(0.7, 1, 6), x, 0, z, 0.12, h, 0.12);
      put(C.citrus, lowBall(), x, h + 0.75 * s, z, 1.05 * s, 0.95 * s, 1.05 * s, 0, t);
      for (let i = 0; i < 7; i++) { const a = t + i * 0.9, y = h + (0.35 + (i % 3) * 0.35) * s; put(C.orange, ball(), x + Math.cos(a) * 0.95 * s, y, z + Math.sin(a) * 0.95 * s, 0.11, 0.11, 0.11); }
    },
    cypress(x, z, s) { const h = Math.min(roofRoom(x, z) - 0.6, 6 * s); put(C.trunk, cyl(1, 1, 5), x, 0, z, 0.1, 0.5, 0.1); put(C.cypress, cone(7), x, 0.4, z, 0.55 * s, h, 0.55 * s); },
    // The rare ones, grown big, behind the stand that sells them.
    baobab(x, z, s, t) {
      const h = Math.min(roofRoom(x, z) - 2.6, 5.6 * s);
      put(C.baobab, cyl(0.62, 1, 10), x, 0, z, 1.0 * s, h, 1.0 * s);
      put(C.baobab, ball(), x, h, z, 0.66 * s, 0.4 * s, 0.66 * s);
      for (let i = 0; i < 7; i++) {
        const a = t + i * 0.9, bx = x + Math.cos(a) * 1.25 * s, bz = z + Math.sin(a) * 1.25 * s;
        put(C.baobab, cyl(0.5, 1, 5), x + Math.cos(a) * 0.3, h, z + Math.sin(a) * 0.3, 0.13, 1.5 * s, 0.13, 0.85, Math.atan2(Math.cos(a), Math.sin(a)), 0);
        put('#6f9a4a', lowBall(), bx, h + 1.0 * s, bz, 0.5 * s, 0.26 * s, 0.5 * s, 0, a);
      }
    },
    bottle(x, z, s, t) {
      const h = 3.4 * s;
      put(C.bottle, cyl(0.36, 1, 10), x, 0, z, 0.78 * s, h * 0.6, 0.78 * s);
      put(C.bottle, ball(), x, h * 0.2, z, 0.82 * s, 0.6 * s, 0.82 * s);
      put(C.bottle, cyl(0.7, 1, 8), x, h * 0.58, z, 0.26 * s, h * 0.42, 0.26 * s);
      fronds('#6fa85a', x, h, z, 12, 1.5 * s, 0.22, -0.15, t);
      fronds('#6fa85a', x, h + 0.1, z, 8, 1.1 * s, 0.2, -0.7, t + 0.4);
    },
    dragon(x, z, s, t) {
      const h = 2.5 * s;
      put(C.trunk, cyl(0.7, 1, 7), x, 0, z, 0.3 * s, h, 0.3 * s);
      for (let i = 0; i < 6; i++) {
        const a = t + i * 1.05, bx = x + Math.cos(a) * 1.3 * s, bz = z + Math.sin(a) * 1.3 * s;
        put(C.trunk, cyl(0.7, 1, 5), x, h - 0.1, z, 0.14 * s, 1.75 * s, 0.14 * s, 0.75, Math.atan2(Math.cos(a), Math.sin(a)), 0);
        for (let k = 0; k < 7; k++) put(C.dragon, cone(4), bx, h + 1.15 * s, bz, 0.07, 0.95 * s, 0.07, 0.95, k * 0.9, 0);
      }
    },
    orchids(x, z, s, t) { // a mossy log hung with moth orchids
      put('#5a4a3a', cyl(1, 1, 6), x, 0, z, 0.2, 1.5, 0.2, 0.2, t, 0);
      put(C.fern, lowBall(), x, 0.25, z, 0.7, 0.3, 0.7);
      for (let i = 0; i < 9; i++) { const a = t + i * 0.7, y = 0.6 + (i % 4) * 0.28; put(C.white, lowBall(), x + Math.cos(a) * 0.36, y, z + Math.sin(a) * 0.36, 0.13, 0.13, 0.05, 0, -a + Math.PI / 2); put('#d94f9a', lowBall(), x + Math.cos(a) * 0.4, y, z + Math.sin(a) * 0.4, 0.04, 0.04, 0.04); }
    },
    flytraps(x, z, s, t) { // a bog patch of flytraps, bigger than life
      put('#4f6a4a', lowBall(), x, 0.06, z, 0.95, 0.12, 0.95);
      for (let i = 0; i < 8; i++) {
        const a = t + i * 0.8, r = 0.25 + (i % 3) * 0.24, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, h = 0.35 + (i % 4) * 0.12;
        put('#7fb24a', cyl(0.6, 1, 4), px, 0, pz, 0.035, h, 0.035, 0.2 * Math.cos(a), 0, 0.2 * Math.sin(a));
        put('#8fc25a', lowBall(), px, h + 0.06, pz, 0.16, 0.04, 0.11, 0, a, 0.5);
        put(C.jaw, lowBall(), px, h + 0.06, pz, 0.16, 0.04, 0.11, 0, a, -0.5);
      }
    },
  };
  for (const [kind, x, z, s, t] of lay.plants) PLANT[kind]?.(x, z, s, t);

  // --- The floor: paving, the beds' soil with a low stone edge, the pond ---------
  const shape = (p) => new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
  const flat = (p, y, h = 0) => { const g = h ? new THREE.ExtrudeGeometry(shape(p), { depth: h, bevelEnabled: false }) : new THREE.ShapeGeometry(shape(p)); return g.rotateX(-Math.PI / 2).translate(0, y, 0); };
  const circle = (r, n = 40) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r]);
  add(C.path, flat(circle(R - 0.1, 48), 0.03));
  for (const b of lay.beds) { add(C.edge, flat(b.p, 0.03, 0.22)); const c = [b.p.reduce((s, q) => s + q[0], 0) / b.p.length, b.p.reduce((s, q) => s + q[1], 0) / b.p.length]; add(C.soil, flat(b.p.map(([x, z]) => [c[0] + (x - c[0]) * 0.965, c[1] + (z - c[1]) * 0.965]), 0.27)); }
  add(C.edge, new THREE.CylinderGeometry(K.pond, K.pond, 0.42, 28, 1, true).translate(0, 0.21, 0));
  add(C.edge, new THREE.RingGeometry(K.pond - 0.3, K.pond, 28).rotateX(-Math.PI / 2).translate(0, 0.42, 0));
  add(C.water, flat(circle(K.pond - 0.3, 28), 0.3));
  for (let i = 0; i < 7; i++) { // giant water lilies: flat pads with an upturned rim, a flower on some
    const a = i * 0.9, r = i ? 1.1 + (i % 3) * 0.55 : 0, px = Math.cos(a) * r, pz = Math.sin(a) * r, s = 0.42 + (i % 3) * 0.1;
    put(C.lily, cyl(1, 0.9, 12), px, 0.3, pz, s, 0.07, s);
    if (i % 2 === 0) put(C.lilyFlower, cone(6), px + 0.5, 0.33, pz + 0.3, 0.14, 0.16, 0.14, Math.PI);
  }
  for (const b of lay.benches) { put(C.wood, prim('box', () => new THREE.BoxGeometry(1, 1, 1)), b.x, 0.42, b.z, 1.7, 0.08, 0.5, 0, b.ry); for (const s of [-0.7, 0.7]) put('#6a6f76', prim('box', () => new THREE.BoxGeometry(1, 1, 1)), b.x + Math.cos(b.ry) * s, 0.21, b.z - Math.sin(b.ry) * s, 0.08, 0.4, 0.44, 0, b.ry); }

  // --- The glass house: a white frame of triangles, leaning out, under a dished roof ---
  const N = l.sides, wall = wallPieces(l);
  const ringAt = (i, r) => [Math.cos((i / N) * Math.PI * 2) * r, Math.sin((i / N) * Math.PI * 2) * r];
  const beam = (a, b, w) => { // a white bar from a to b ([x, y, z])
    const d = v4.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
    q4.setFromUnitVectors(s4.set(0, 1, 0), d.normalize());
    m4.compose(v4.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q4, s4.set(w, len, w));
    add(C.frame, prim('bar', () => new THREE.BoxGeometry(1, 1, 1)).clone().applyMatrix4(m4));
  };
  const top = R * K.lean, glass = [];
  const tri = (a, b, c) => glass.push(...a, ...b, ...c);
  const isDoor = (i) => { const mid = ((i + 0.5) / N) * Math.PI * 2; return l.doors.find((d) => Math.abs(Math.atan2(Math.sin(mid - d.a), Math.cos(mid - d.a))) * R < d.w / 2 + R * Math.PI / N); };
  const DOOR_H = 3.2;
  for (let i = 0; i < N; i++) {
    const [x0, z0] = ringAt(i, R), [x1, z1] = ringAt(i + 1, R), [tx0, tz0] = ringAt(i, top), [tx1, tz1] = ringAt(i + 1, top), [mx, mz] = ringAt(i + 0.5, (R + top) / 2);
    const open = isDoor(i), y0 = open ? DOOR_H : 0, k = y0 / K.rim;
    const a = [x0 + (tx0 - x0) * k, y0, z0 + (tz0 - z0) * k], b = [x1 + (tx1 - x1) * k, y0, z1 + (tz1 - z1) * k], c = [tx1, K.rim, tz1], d = [tx0, K.rim, tz0], mid = [mx, (y0 + K.rim) / 2 + 0.6, mz];
    tri(a, b, mid); tri(b, c, mid); tri(c, d, mid); tri(d, a, mid);
    beam([x0, 0, z0], d, 0.16); beam(a, mid, 0.09); beam(b, mid, 0.09); beam(c, mid, 0.09); beam(d, mid, 0.09); beam(d, c, 0.2);
    if (open) { beam(a, b, 0.22); } else beam([x0, 0.12, z0], [x1, 0.12, z1], 0.24);
    // the roof: from the rim in and down to a ring over the pond, then a flat eye
    const [ix0, iz0] = ringAt(i, 4), [ix1, iz1] = ringAt(i + 1, 4), yi = lay.roofAt(4), [hx, hz] = ringAt(i + 0.5, R * 0.55), hy = lay.roofAt(R * 0.55);
    const e = [ix0, yi, iz0], f = [ix1, yi, iz1], h = [hx, hy, hz];
    tri(d, c, h); tri(c, f, h); tri(f, e, h); tri(e, d, h); tri(e, f, [0, yi, 0]);
    beam(d, e, 0.14); if (i % 2 === 0) { beam(d, h, 0.08); beam(c, h, 0.08); beam(e, h, 0.08); beam(f, h, 0.08); } beam(e, f, 0.12);
  }
  const glassGeo = new THREE.BufferGeometry();
  glassGeo.setAttribute('position', new THREE.Float32BufferAttribute(glass, 3));
  glassGeo.computeVertexNormals();
  const glassMesh = new THREE.Mesh(glassGeo, new THREE.MeshLambertMaterial({ color: '#cfeee8', transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  glassMesh.renderOrder = 3;
  glassMesh.matrixAutoUpdate = false;
  group.add(glassMesh);

  // --- The shop: a pot plant on a wooden stand, the same piece you take home ------
  const products = [];
  const one = new THREE.Matrix4();
  for (const s of lay.stands) {
    const def = furnitureById(s.id);
    put(C.wood, prim('box', () => new THREE.BoxGeometry(1, 1, 1)), s.x, 0.52, s.z, K.stand + 0.25, 0.5, K.stand + 0.25, 0, s.ry);
    put(s.rare ? '#d9b24a' : '#f1ece2', prim('box', () => new THREE.BoxGeometry(1, 1, 1)), s.x, 0.79, s.z, K.stand + 0.35, 0.05, K.stand + 0.35, 0, s.ry);
    const piece = buildFurniture(s.id);
    piece.position.set(s.x, 0.815, s.z);
    piece.rotation.y = s.ry;
    piece.updateMatrixWorld(true);
    piece.traverse((o) => { if (o.isMesh) add('#' + o.material.color.getHexString(), o.geometry.clone().applyMatrix4(one.copy(o.matrixWorld))); });
    const product = store?.products?.find((p) => p.furniture === s.id) || { id: 'buy-' + s.id, model: 'furniture', furniture: s.id, name: def.name, price: 0 };
    products.push({ product, rare: s.rare, pos: new THREE.Vector3(l.x + s.stand[0], 0, l.z + s.stand[1]), at: [l.x + s.x, l.z + s.z] });
  }
  // A board over each group of stands.
  const board = (text, sub, a, color) => {
    const tex = canvasTex(512, 160, (g) => {
      g.fillStyle = color; g.fillRect(0, 0, 512, 160);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `800 70px ${FONT}`; g.fillText(text, 256, 62);
      g.font = '700 34px system-ui, sans-serif'; g.fillText(sub, 256, 124);
    });
    const r = K.outer + 1.5, m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.82), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(Math.cos(a) * r, 2.75, Math.sin(a) * r);
    m.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    group.add(m);
    for (const sd of [-1.2, 1.2]) put(C.wood, cyl(1, 1, 5), m.position.x + Math.cos(m.rotation.y) * sd, 0.25, m.position.z - Math.sin(m.rotation.y) * sd, 0.05, 2.5, 0.05);
  };
  const main = l.doors.find((d) => d.main) || l.doors[0], deg = Math.PI / 180;
  board('화분 가게', 'POT PLANTS', main.a - 22 * deg, '#2f8a4f');
  board('화분 가게', 'POT PLANTS', main.a + 27 * deg, '#2f8a4f');
  board('희귀 식물', 'RARE PLANTS', main.a + Math.PI - 20 * deg, '#b8862a');
  board('희귀 식물', 'RARE PLANTS', main.a + Math.PI + 25 * deg, '#b8862a');
  // The name over the main door.
  {
    const tex = canvasTex(1024, 200, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1024, 200);
      g.fillStyle = '#2f8a4f'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `800 92px ${FONT}`; g.fillText('서울식물원 온실', 512, 74);
      g.font = '800 46px system-ui, sans-serif'; g.fillText('SEOUL BOTANIC PARK GREENHOUSE', 512, 152);
    });
    const r = R + 0.75, m = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.17), new THREE.MeshBasicMaterial({ map: tex })); // (one-sided: not read backwards from inside)
    m.position.set(Math.cos(main.a) * r, DOOR_H + 0.75, Math.sin(main.a) * r);
    m.rotation.y = Math.atan2(Math.cos(main.a), Math.sin(main.a));
    group.add(m);
  }

  for (const [color, list] of parts) {
    const m = new THREE.Mesh(mergeGeometries(list), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
    m.matrixAutoUpdate = false;
    group.add(m);
  }

  // --- The park: trees, flower beds, reeds (instanced) -----------------------------
  const up = new THREE.Vector3(0, 1, 0), inst = (geo, color, n) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), n); group.add(m); return m; };
  const P = (x, z) => v4.set(x, 0, z); // (the map's spots are in metres from the greenhouse's middle)
  const trees = l.trees || [], leafy = trees.filter((t) => !t[3]), pines = trees.filter((t) => t[3]);
  if (trees.length) {
    const trunks = inst(new THREE.CylinderGeometry(0.2, 0.3, 3, 6).translate(0, 1.5, 0), '#6b4a32', trees.length);
    trees.forEach(([x, z, s], i) => trunks.setMatrixAt(i, m4.compose(P(x, z), q4.setFromAxisAngle(up, i), s4.set(s, s, s))));
    const crowns = inst(new THREE.IcosahedronGeometry(2.1, 0).translate(0, 4.3, 0), SEASON === 'autumn' ? '#e6e6e6' : '#5d8f4a', Math.max(1, leafy.length));
    const greens = ['#5d8f4a', '#6f9a52', '#4f8045', '#7aa35a'].map((c) => new THREE.Color(c));
    leafy.forEach(([x, z, s], i) => { crowns.setMatrixAt(i, m4.compose(P(x, z), q4.setFromAxisAngle(up, i * 0.7), s4.set(s, s * 0.92, s))); crowns.setColorAt(i, leafColor(greens[i % 4], leafHash(i, 9), MIX.park)); });
    crowns.count = leafy.length;
    const cones = inst(new THREE.ConeGeometry(1.7, 4.6, 7).translate(0, 4.6, 0), '#3c6b3e', Math.max(1, pines.length));
    pines.forEach(([x, z, s], i) => cones.setMatrixAt(i, m4.compose(P(x, z), q4.setFromAxisAngle(up, i), s4.set(s, s * 1.1, s))));
    cones.count = pines.length;
  }
  const beds = l.beds || [];
  if (beds.length) {
    const FL = ['#f2668a', '#f2c230', '#a06ad8', '#f08a4a', '#fbf7f2'].map((c) => new THREE.Color(c));
    const soil = inst(new THREE.CylinderGeometry(1, 1.05, 0.18, 14).translate(0, 0.09, 0), '#7a5a40', beds.length), per = 14;
    const blooms = inst(new THREE.IcosahedronGeometry(0.22, 0).translate(0, 0.42, 0), '#ffffff', beds.length * per);
    beds.forEach(([x, z, r, c], i) => {
      soil.setMatrixAt(i, m4.compose(P(x, z), q4.identity(), s4.set(r, 1, r)));
      for (let k = 0; k < per; k++) { const a = k * 2.4, d = r * 0.86 * Math.sqrt((k + 0.5) / per); blooms.setMatrixAt(i * per + k, m4.compose(v4.set(x + Math.cos(a) * d, 0, z + Math.sin(a) * d), q4.identity(), s4.set(1, 1 + (k % 3) * 0.25, 1))); blooms.setColorAt(i * per + k, FL[(c + (k % 4 === 0 ? 4 : 0)) % 5]); }
    });
  }
  const reeds = l.reeds || [];
  if (reeds.length) {
    const tuft = mergeGeometries([0, 1, 2, 3, 4].map((k) => new THREE.ConeGeometry(0.07, 1.5 + (k % 3) * 0.3, 4).translate(Math.cos(k * 1.3) * 0.25, 0.8, Math.sin(k * 1.3) * 0.25)));
    const r = inst(tuft, '#b8a45a', reeds.length);
    reeds.forEach(([x, z], i) => r.setMatrixAt(i, m4.compose(P(x, z), q4.setFromAxisAngle(up, i * 1.7), s4.set(1, 0.85 + (i % 4) * 0.12, 1))));
  }
  group.traverse((o) => { if (o.isInstancedMesh) { o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true; o.computeBoundingSphere(); } });
  group.updateMatrixWorld(true);

  // --- What you can't walk through (the district's metres) -------------------------
  const W = (p) => p.map(([x, z]) => [l.x + x, l.z + z]);
  const thick = (x0, z0, x1, z1, t = 0.3) => { const d = Math.hypot(x1 - x0, z1 - z0) || 1, nx = -(z1 - z0) / d * t / 2, nz = (x1 - x0) / d * t / 2; return [[x0 + nx, z0 + nz], [x1 + nx, z1 + nz], [x1 - nx, z1 - nz], [x0 - nx, z0 - nz]]; };
  const colliders = [
    ...wall.map(([x0, z0, x1, z1]) => W(thick(x0, z0, x1, z1))),
    ...lay.beds.map((b) => W(b.p)),
    W(circle(K.pond, 14)),
    ...lay.benches.map((b) => { const c = Math.cos(b.ry), s = Math.sin(b.ry); return W([[-0.85, -0.25], [0.85, -0.25], [0.85, 0.25], [-0.85, 0.25]].map(([u, v]) => [b.x + u * c + v * s, b.z - u * s + v * c])); }),
  ];
  const seats = lay.benches.flatMap((b) => { const c = Math.cos(b.ry), s = Math.sin(b.ry); return [-0.45, 0.45].map((u) => ({ x: l.x + b.x + u * c, z: l.z + b.z - u * s, ry: b.ry, stand: [l.x + b.x + u * c + 0.85 * s, l.z + b.z - u * s + 0.85 * c], street: true })); });
  const clerks = lay.clerks.map((c) => ({ x: l.x + c.x, z: l.z + c.z, ry: c.ry, rare: c.rare }));
  return { group, colliders, products, clerks, seats, layout: lay };
}
