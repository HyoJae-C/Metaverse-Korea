// Gyeongbokgung's gardens (map landmarks written by
// scripts/build-gyeongbokgung.mjs, all "inner": built when you first walk in
// through the palace wall, and this file is downloaded then):
//   hyangwonjeong  Hyangwonjeong (향원정) on its round island in Hyangwonji,
//                  and Chwihyanggyo (취향교), the white arched bridge to the
//                  north bank. l.isle = [r, top], l.span = [dx, dz, w, rise],
//                  l.sc = [across, up]: the pavilion's size (1 = half the real one)
//                  (the bridge's shore end from the pavilion; the same
//                  numbers lift your feet: core/temple-terrace.js isleHeight)
//   pondbank       the dressed-stone banks of the ponds (l.rings: lines of corners),
//                  lotus leaves on the water (l.pads), the islets' turf
//                  (l.turf) and Yeolsangjinwon spring's basin (l.spring)
//   palacetrees    every tree inside the wall, as a handful of instanced
//                  meshes: l.t = [x, z, size, kind, ...] (KIND below);
//                  l.up = [[x, z, r, y]]: those within r of a spot stand
//                  y up (on Hyangwonjeong's island)
// The pavilion's model is half the real size (about 9 m high and 11 m
// across the eaves in Seoul); the map's l.sc makes it smaller, so its island
// has room round it as the real one has.
// Visual only: collision comes from the map's blockers.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { matCache, addBox } from './three-kit.js';
import { nameBoard } from './palace-model.js';
import { SEASON, MIX, leafColor, leafHash, ginkgoColor } from './season.js';
import { isleHeight } from './temple-terrace.js';

const mat = matCache({ flatShading: true });
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const C = {
  stone: '#d6cdb8', stoneDark: '#b1a690', post: '#a8392b', sill: '#8a3a2c', rail: '#9a4630', panel: '#3f9079', panelDark: '#2c705e', floor: '#8a5a3a', fence: '#5c4a3a',
  beam: '#2f8a68', bracket: '#2a6f5a', rafter: '#8a3a2c', roof: '#474c55', ridge: '#353a42', bronze: '#5f6a55', gold: '#d4a73a',
  white: '#f4f1ea', deck: '#e3d8c0', grass: '#a9d18a', rock: '#9a958a', pad: '#5f9a55', lotus: '#f29cb8', water: '#4d8fb5',
};
const FLAT = Math.PI / 6; // a six-sided cylinder turned so a flat side faces +z

// Everything in g as one mesh (one draw call, and one more for its shadow):
// each part's colour is written into its corners.
const paint = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
function bake(g, shadow = true) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), geos = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    for (const a of Object.keys(geo.attributes)) if (a !== 'position' && a !== 'normal') geo.deleteAttribute(a);
    const n = geo.attributes.position.count, col = new Float32Array(n * 3), c = o.material.color;
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(geo);
  });
  g.clear();
  const mesh = new THREE.Mesh(mergeGeometries(geos), paint);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  g.add(mesh);
}

// A six-sided slab or frustum, flat side to +z.
function hex(g, rTop, rBot, h, y, c) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 6), mat(c));
  m.position.y = y + h / 2;
  m.rotation.y = FLAT;
  g.add(m);
  return m;
}
// A bar from a to b ([x, y, z]), w wide and h thick.
function bar(g, a, b, w, h, c) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], flat = Math.hypot(dx, dz);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, Math.hypot(flat, dy)), mat(c));
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.rotation.set(-Math.atan2(dy, flat), Math.atan2(dx, dz), 0, 'YXZ'); // (turned, then tipped: its top stays level across)
  g.add(m);
  return m;
}
const corner = (k, r) => [Math.sin(FLAT + (k * Math.PI) / 3) * r, Math.cos(FLAT + (k * Math.PI) / 3) * r]; // side k runs from corner k - 1 to corner k; side 0 faces +z

// One storey: six posts, green lattice doors in red frames between them (four
// leaves a side, a red sill below), a floor that runs out past the posts as a
// veranda, and a railing round it (open: the sides without a railing).
function storey(g, y, H, R, veranda, open = []) {
  hex(g, veranda, veranda, 0.07, y - 0.07, C.floor);
  hex(g, R - 0.05, R - 0.05, H, y, C.panel);
  const ap = R * Math.cos(Math.PI / 6);
  for (let k = 0; k < 6; k++) {
    const [px, pz] = corner(k, R);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, H, 8), mat(C.post));
    post.position.set(px, y + H / 2, pz);
    g.add(post);
    const side = new THREE.Group(); // (its own frame: +z out through the side's middle)
    side.rotation.y = (k * Math.PI) / 3;
    g.add(side);
    box(side, R - 0.16, 0.2, 0.05, 0, y + 0.1, ap, C.sill); // the sill (머름)
    box(side, R - 0.16, 0.08, 0.06, 0, y + H - 0.04, ap, C.post);
    box(side, R - 0.16, 0.03, 0.05, 0, y + H * 0.72, ap, C.panelDark); // (the lattice: a band across the leaves)
    box(side, R - 0.16, 0.03, 0.05, 0, y + H * 0.45, ap, C.panelDark);
    for (const u of [-1.5, -0.5, 0.5, 1.5]) box(side, 0.02, H - 0.3, 0.05, (u * (R - 0.16)) / 4, y + H / 2 + 0.08, ap, C.panelDark);
    for (const u of [-1, 0, 1]) box(side, 0.045, H - 0.26, 0.06, (u * (R - 0.16)) / 4, y + H / 2 + 0.08, ap, C.post);
    if (open.includes(k)) continue;
    // the veranda's railing (난간): two rails and short posts
    const va = veranda * Math.cos(Math.PI / 6) - 0.05;
    for (const ry of [0.36, 0.2]) box(side, veranda - 0.08, 0.04, 0.04, 0, y + ry, va, C.rail);
    box(side, veranda - 0.1, 0.1, 0.03, 0, y + 0.07, va, C.rail);
    for (const u of [-0.3, 0, 0.3]) box(side, 0.035, 0.34, 0.035, u * veranda, y + 0.17, va, C.rail);
  }
  for (let k = 0; k < 6; k++) { const [px, pz] = corner(k, veranda - 0.06); box(g, 0.06, 0.42, 0.06, px, y + 0.21, pz, C.rail); }
}

// The pavilion itself, its floor at y 0 (the island's top), front to +z.
function pavilion(g) {
  const R = 1.45, V = 1.95; // the posts' ring and the veranda's edge (corner radius)
  // three courses of dressed stone, and the steps up at the front
  hex(g, 2.55, 2.6, 0.14, 0, C.stoneDark);
  hex(g, 2.32, 2.36, 0.17, 0.14, C.stone);
  hex(g, 2.1, 2.14, 0.15, 0.31, C.stone);
  const y1 = 0.5, H1 = 1.3, y2 = y1 + H1 + 0.24, H2 = 1.12, ye = y2 + H2, front = 2.1 * Math.cos(Math.PI / 6);
  for (let i = 0; i < 3; i++) box(g, 0.9, 0.15, 0.24, 0, 0.385 - i * 0.15, front + 0.12 + i * 0.22, C.stone);
  storey(g, y1, H1, R, V, [0]);
  // between the storeys: the beam, and the brackets under the upper veranda
  hex(g, R + 0.1, R + 0.1, 0.1, y1 + H1, C.beam);
  hex(g, V + 0.02, R + 0.08, 0.14, y1 + H1 + 0.1, C.bracket);
  storey(g, y2, H2, R, V + 0.05);
  // the eaves: beam, painted brackets, the rafters' red ends under a green edge
  hex(g, R + 0.1, R + 0.1, 0.1, ye, C.beam);
  hex(g, R + 0.5, R + 0.08, 0.16, ye + 0.1, C.bracket);
  hex(g, 2.5, R + 0.5, 0.06, ye + 0.26, C.rafter);
  hex(g, 2.66, 2.5, 0.05, ye + 0.32, C.beam);
  // the roof: three slopes, flat at the eaves and steep at the top (the
  // tiled roof's curve), a ridge down each corner that turns up at the
  // eaves, and the bronze finial (절병통)
  const yr = ye + 0.37, tiers = [[2.82, 0], [1.9, 0.26], [0.95, 0.72], [0.16, 1.3]]; // [corner radius, height]
  for (let i = 0; i < 3; i++) hex(g, tiers[i + 1][0], tiers[i][0], tiers[i + 1][1] - tiers[i][1], yr + tiers[i][1], C.roof);
  for (let k = 0; k < 6; k++) {
    for (let i = 0; i < 3; i++) { const [ax, az] = corner(k, tiers[i][0]), [bx, bz] = corner(k, tiers[i + 1][0]); bar(g, [ax, yr + tiers[i][1] + 0.05, az], [bx, yr + tiers[i + 1][1] + 0.05, bz], 0.11, 0.1, C.ridge); }
    const [ex, ez] = corner(k, 2.82), [ux, uz] = corner(k, 3.2);
    bar(g, [ex, yr + 0.03, ez], [ux, yr + 0.3, uz], 0.16, 0.09, C.roof); // the corner's upturn
    bar(g, [ex, yr + 0.08, ez], [ux, yr + 0.36, uz], 0.09, 0.08, C.ridge);
  }
  const yt = yr + 1.3;
  hex(g, 0.13, 0.2, 0.14, yt - 0.02, C.ridge);
  for (const [r, sy, dy, c] of [[0.17, 0.75, 0.22, C.bronze], [0.11, 1, 0.42, C.bronze], [0.07, 1, 0.56, C.gold]]) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat(c));
    ball.scale.y = sy;
    ball.position.y = yt + dy;
    g.add(ball);
  }
  return { boardY: y2 + H2 - 0.2, boardZ: R * Math.cos(Math.PI / 6) + 0.07 };
}

export function buildHyangwonjeong(g, l) {
  const [r, top] = l.isle, [sx, sz, w] = l.span, L = Math.hypot(sx, sz), ux = sx / L, uz = sz / L, sc = l.sc || [1, 1];
  const th = Math.atan2(ux, uz), dir = (deg) => { const a = th + (deg * Math.PI) / 180; return [Math.sin(a), Math.cos(a)]; }; // (0°: towards the bridge)
  // The island: two courses of stone round it, turf on top, rocks at the
  // water's edge, a low wooden fence round its rim (open at the bridge) and
  // stone steps down to the water.
  const cyl = (rt, rb, h, y, c, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c)); m.position.y = y + h / 2; g.add(m); };
  cyl(r + 0.08, r + 0.16, top * 0.55, 0, C.stoneDark);
  cyl(r, r + 0.04, top * 0.45 + 0.02, top * 0.55, C.stone);
  cyl(r - 0.3, r - 0.3, 0.05, top, C.grass);
  for (let i = 0; i < 8; i++) {
    const a = i * 0.83 + 0.4, s = 0.2 + leafHash(i, 3) * 0.2;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat(C.rock));
    rock.position.set(Math.sin(a) * (r + 0.3), 0.08, Math.cos(a) * (r + 0.3));
    rock.scale.y = 0.6;
    g.add(rock);
  }
  const fr = r - 0.22, N = Math.round((2 * Math.PI * fr) / 0.8), gap = (w / 2 + 0.35) / fr; // the fence: a post every 0.8 m
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2, off = (a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    const p = (a, y) => [Math.sin(th + a) * fr, top + y, Math.cos(th + a) * fr];
    if (off(a0) < gap) continue;
    box(g, 0.06, 0.36, 0.06, p(a0, 0)[0], top + 0.2, p(a0, 0)[2], C.fence);
    if (off(a1) < gap) continue;
    for (const y of [0.33, 0.18]) bar(g, p(a0, y), p(a1, y), 0.035, 0.04, C.fence);
  }
  { // the steps down to the water, on the side
    const [dx, dz] = dir(115), step = new THREE.Group();
    step.rotation.y = Math.atan2(dx, dz);
    g.add(step);
    for (let i = 0; i < 3; i++) box(step, 0.9, 0.13, 0.26, 0, top - 0.06 - i * 0.13, r + 0.05 + i * 0.24, C.stone);
  }
  const P = new THREE.Group();
  P.position.y = top + 0.03;
  P.rotation.y = th; // its front to the bridge
  P.scale.set(sc[0], sc[1], sc[0]);
  g.add(P);
  const { boardY, boardZ } = pavilion(P);
  // Chwihyanggyo: a white wooden bridge in a low arch, on trestles in the
  // water, its railing filled with crossed slats.
  const B = new THREE.Group();
  g.add(B);
  const M = 12, t0 = (r - 0.15) / L, at = (t) => { const v = (t0 + (1 - t0) * t) * L; return [ux * v, isleHeight(l, ux * v, uz * v) + 0.03, uz * v]; };
  const side = (p, s, up = 0) => [p[0] + uz * s, p[1] + up, p[2] - ux * s];
  for (let i = 0; i < M; i++) {
    const a = at(i / M), b = at((i + 1) / M);
    bar(B, a, b, w, 0.07, C.deck);
    for (const s of [-1, 1]) {
      bar(B, side(a, (s * w) / 2, 0.02), side(b, (s * w) / 2, 0.02), 0.09, 0.12, C.white); // the deck's edge beam
      bar(B, side(a, (s * w) / 2, 0.52), side(b, (s * w) / 2, 0.52), 0.07, 0.06, C.white);
      bar(B, side(a, (s * w) / 2, 0.12), side(b, (s * w) / 2, 0.46), 0.03, 0.035, C.white); // the crossed slats
      bar(B, side(a, (s * w) / 2, 0.46), side(b, (s * w) / 2, 0.12), 0.03, 0.035, C.white);
    }
  }
  for (let i = 0; i <= M; i++) {
    const p = at(i / M), end = i === 0 || i === M;
    for (const s of [-1, 1]) {
      const [x, y, z] = side(p, (s * w) / 2);
      box(B, end ? 0.13 : 0.07, end ? 0.72 : 0.58, end ? 0.13 : 0.07, x, y + (end ? 0.36 : 0.29), z, C.white);
      if (end) box(B, 0.17, 0.05, 0.17, x, y + 0.74, z, C.white);
      if (!end && i % 3 === 0) box(B, 0.11, y + 0.1, 0.11, x, y / 2 - 0.05, z, C.white); // a trestle's leg down into the water
    }
    if (i > 0 && i < M && i % 3 === 0) bar(B, side(p, -w / 2, -0.12), side(p, w / 2, -0.12), 0.08, 0.08, C.white);
  }
  bake(g);
  const sign = nameBoard('香遠亭', 0.62 * sc[0], 0.25 * sc[0]);
  sign.position.set(Math.sin(th) * boardZ * sc[0], P.position.y + boardY * sc[1], Math.cos(th) * boardZ * sc[0]);
  sign.rotation.y = th;
  g.add(sign);
}

// The ponds' banks: a kerb of dressed stone along each outline.
export function buildPondBank(g, l) {
  for (const run of l.rings || []) { // (each a line of corners; a closed one repeats its first)
    for (let i = 1; i < run.length; i++) {
      const [ax, az] = run[i - 1], [bx, bz] = run[i], L = Math.hypot(bx - ax, bz - az);
      if (L < 0.05) continue;
      const ex = ((bx - ax) / L) * 0.2, ez = ((bz - az) / L) * 0.2; // (run on past the corner, so two meet without a gap)
      bar(g, [ax - ex, 0.11, az - ez], [bx + ex, 0.11, bz + ez], 0.42, 0.22, C.stoneDark);
      bar(g, [ax - ex, 0.24, az - ez], [bx + ex, 0.24, bz + ez], 0.5, 0.05, C.stone);
    }
  }
  for (const p of l.turf || []) { // an islet's top: a low slab of turf inside its kerb
    const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
    box(g, Math.max(...xs) - Math.min(...xs), 0.2, Math.max(...zs) - Math.min(...zs), (Math.min(...xs) + Math.max(...xs)) / 2, 0.1, (Math.min(...zs) + Math.max(...zs)) / 2, C.grass);
  }
  if (l.spring) { // Yeolsangjinwon (열상진원샘): the spring's stone basin, the water running out to the pond
    const [x, z] = l.spring;
    box(g, 1.3, 0.3, 1.0, x, 0.15, z, C.stone);
    box(g, 0.8, 0.04, 0.5, x, 0.31, z, C.water);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.14, 10), mat(C.stoneDark));
    lid.position.set(x - 0.2, 0.37, z - 0.1);
    g.add(lid);
  }
  bake(g, false);
  const pads = l.pads || [];
  if (pads.length) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const leaf = new THREE.CylinderGeometry(0.42, 0.42, 0.02, 9, 1, false, 0.5, Math.PI * 2 - 0.7); // (a notch in each leaf)
    const mesh = new THREE.InstancedMesh(leaf, new THREE.MeshLambertMaterial({ color: '#ffffff' }), pads.length);
    const greens = ['#5f9a55', '#6eaa5c', '#548c4f'].map((c) => new THREE.Color(c));
    pads.forEach(([x, z, s], i) => {
      m4.compose(v.set(x, 0.045, z), q.setFromAxisAngle(up, i * 2.1), sc.set(s, 1, s));
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, greens[i % 3]);
    });
    g.add(mesh);
    if (SEASON === 'summer') { // the lotus in flower
      const n = Math.ceil(pads.length / 4), flowers = new THREE.InstancedMesh(new THREE.ConeGeometry(0.16, 0.3, 6).rotateX(Math.PI).translate(0, 0.3, 0), mat(C.lotus), n);
      for (let i = 0; i < n; i++) { const [x, z] = pads[i * 4]; m4.compose(v.set(x + 0.2, 0, z + 0.1), q.identity(), sc.set(1, 1, 1)); flowers.setMatrixAt(i, m4); }
      g.add(flowers);
    }
  }
}

// ---------- Trees ----------
// Kinds, told apart by shape (core/season.js: the round ones turn in autumn,
// the pines stay green):
export const KIND = { round: 0, pine: 1, maple: 2, willow: 3, ginkgo: 4, bush: 5 };
const soft = (geo) => { geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); const s = mergeVertices(geo); s.computeVertexNormals(); return s; };
const clumps = (list) => mergeGeometries(list.map(([x, y, z, r, w, h]) => soft(new THREE.IcosahedronGeometry(r, 0)).scale(w, h, w).rotateY(x * 2).translate(x, y, z)));
const plain = (geo) => { geo.deleteAttribute('uv'); return geo.index ? geo.toNonIndexed() : geo; };
let GEO = null;
const geos = () => (GEO ||= {
  trunk: new THREE.CylinderGeometry(0.16, 0.22, 1.6, 6).translate(0, 0.8, 0),
  round: new THREE.IcosahedronGeometry(1.25, 1).translate(0, 2.5, 0),
  // A red pine (소나무): a leaning red-brown trunk, flat clouds of needles.
  pineTrunk: mergeGeometries([
    plain(new THREE.CylinderGeometry(0.13, 0.2, 1.7, 6).rotateZ(-0.16).translate(0.14, 0.85, 0)),
    plain(new THREE.CylinderGeometry(0.09, 0.13, 1.7, 6).rotateZ(0.2).translate(0.1, 2.45, 0)),
    plain(new THREE.CylinderGeometry(0.05, 0.08, 1.0, 5).rotateZ(-0.9).translate(0.55, 2.5, 0)),
  ]),
  pine: clumps([[-0.1, 3.5, 0, 1.15, 1.1, 0.42], [0.95, 2.85, 0.2, 0.8, 1.05, 0.4], [-0.75, 2.9, -0.5, 0.7, 1.0, 0.4], [0.2, 4.05, -0.1, 0.7, 1.0, 0.45]]),
  // A maple (단풍나무): low and wide, a few light clumps.
  maple: clumps([[0, 2.1, 0, 0.95, 1.15, 0.8], [0.8, 1.85, 0.3, 0.7, 1.1, 0.75], [-0.75, 1.9, -0.3, 0.72, 1.1, 0.75], [0.1, 2.65, -0.2, 0.62, 1.05, 0.8]]),
  // A weeping willow (버드나무): a crown on top and a long skirt of hanging branches.
  willow: mergeGeometries([
    soft(new THREE.IcosahedronGeometry(1.25, 1)).scale(1, 0.8, 1).translate(0, 3.5, 0),
    soft(plain(new THREE.CylinderGeometry(1.2, 1.5, 2.0, 9, 1, true))).translate(0, 2.3, 0),
  ]),
  ginkgo: clumps([[0, 3.0, 0, 1.45, 1.15, 1.0], [1.3, 2.55, 0.4, 1.05, 1.05, 0.9], [-1.25, 2.65, -0.4, 1.1, 1.05, 0.9], [0.1, 4.3, 0.1, 1.15, 1.0, 0.95]]), // (the city's ginkgo shape: core/world.js)
  bush: new THREE.IcosahedronGeometry(0.8, 1).scale(1, 0.75, 1).translate(0, 0.45, 0),
});
const GREENS = ['#8fcf7a', '#7cc46e', '#a3d98a', '#95c97d'].map((c) => new THREE.Color(c));
const PINES = ['#4f8f4f', '#5a9a56', '#467f49'].map((c) => new THREE.Color(c));
const BUSHES = ['#7fbf68', '#6db35c', '#93c97a'].map((c) => new THREE.Color(c));
const WILLOW = [new THREE.Color('#a9cf6a'), new THREE.Color('#c7c95a')]; // summer, autumn
const MAPLE = { green: 0, yellow: 0.08, orange: 0.27, red: 0.65, brown: 0 };

// The instanced meshes for a flat list [x, z, size, kind, ...]; up: [[x, z, r, y]].
export function treeMeshes(t, up = []) {
  const G = geos(), by = [[], [], [], [], [], []];
  const lift = (x, z) => { for (const [ux, uz, r, y] of up) if (Math.hypot(x - ux, z - uz) < r) return y; return 0; };
  for (let i = 0; i + 3 < t.length; i += 4) (by[t[i + 3]] || by[0]).push([t[i], t[i + 1], t[i + 2], lift(t[i], t[i + 1])]);
  const out = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), axis = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const tint = new THREE.MeshLambertMaterial({ color: '#ffffff' }), trunkMat = new THREE.MeshLambertMaterial({ color: '#a47a55' }), pineMat = new THREE.MeshLambertMaterial({ color: '#9a5a3c' });
  const add = (list, geo, material, color, shadow = true) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach(([x, z, s, y, fat = 1, tall = 1], i) => {
      m4.compose(v.set(x, y, z), q.setFromAxisAngle(axis, leafHash(x, z) * 6.283), sc.set(s * fat, s * tall, s * fat));
      mesh.setMatrixAt(i, m4);
      if (color) mesh.setColorAt(i, color(x, z, i));
    });
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.name = 'trees';
    out.push(mesh);
  };
  const [round, pine, maple, willow, ginkgo, bush] = by;
  add(round.concat(maple, willow, ginkgo.map(([x, z, s, y]) => [x, z, s, y, 1.6, 1.45])), G.trunk, trunkMat); // (a ginkgo's trunk: fatter and taller)
  add(round, G.round, tint, (x, z, i) => leafColor(GREENS[i % 4], leafHash(x * 1.3, z * 0.7), MIX.park));
  add(maple, G.maple, tint, (x, z, i) => leafColor(GREENS[i % 4], leafHash(x * 0.9, z * 1.9), MAPLE));
  add(willow, G.willow, tint, () => WILLOW[SEASON === 'autumn' ? 1 : 0]);
  add(ginkgo, G.ginkgo, tint, (x, z, i) => ginkgoColor(GREENS[i % 4], leafHash(x, z)));
  add(pine, G.pineTrunk, pineMat);
  add(pine, G.pine, tint, (x, z, i) => PINES[i % 3]);
  add(bush, G.bush, tint, (x, z, i) => leafColor(BUSHES[i % 3], leafHash(x, z), MIX.bush), false);
  return out;
}

export function buildPalaceTrees(g, l) {
  for (const m of treeMeshes(l.t || [], l.up)) g.add(m);
}
