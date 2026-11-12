// Bongeunsa (봉은사), the temple opposite KONEXT (map "landmarks" in
// districts/samseong.json, laid out by scripts/bongeunsa-layout.mjs):
//   bongeunsa  the halls (core/palace-model.js palacehalls), Beopwangru's two
//              storeys, the lantern canopy over Daeungjeon's courtyard and the
//              lanterns along the way in, the three-storey pagoda, Haesu
//              Gwaneum on her pond, the bell pavilion and Iljumun
//   maitreya   the Maitreya Buddha (미륵대불): a white granite standing Buddha
//              under a square canopy (보개) with bells, on a double lotus over
//              a hexagonal base with columns and carved panels, a curved wall
//              of small niches behind and stone lanterns in front
// Loaded with import() by the landmarks' stubs (core/landmarks.js), so none
// of it is in the first download. Every plain part is baked into one mesh per
// look (core/merge-static.js bakeColors); the lanterns are one InstancedMesh.
// The temple pieces (lanternCanopy, stonePagoda, stoneLantern, bellPavilion)
// are exported for other temples (Jogyesa).
import * as THREE from 'three';
import { bakeColors } from './merge-static.js';
import { curvedRoof } from './hanok.js';
import { PALACE_BUILD } from './palace-model.js';
import { farFree } from './far-textures.js';
import { glowAtNight } from './weather.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
function add(g, geo, c, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const box = (g, sx, sy, sz, x, y, z, c) => add(g, new THREE.BoxGeometry(sx, sy, sz), c, x, y, z);
const cyl = (g, rt, rb, h, x, y, z, c, seg = 10) => add(g, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z);
function ball(g, r, x, y, z, c, sx = 1, sy = 1, sz = 1, w = 10, hs = 7) {
  const m = add(g, new THREE.SphereGeometry(r, w, hs), c, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
const UP = new THREE.Vector3(0, 1, 0);
function limb(g, a, b, ra, rb, c, seg = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = add(g, new THREE.CylinderGeometry(rb, ra, d.length(), seg), c);
  m.position.copy(A).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}
const tileMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
const ROOF = new THREE.Color('#474c55'), ROOF_END = new THREE.Color('#8a3a2c');
function tiles(g, w, d, h, y, o = {}, x = 0, z = 0) {
  for (const geo of curvedRoof(w, d, h, { color: ROOF, end: ROOF_END, ...o })) {
    const m = new THREE.Mesh(geo, tileMat);
    m.position.set(x, y, z);
    g.add(m);
  }
}
// A name board, read from the right as on old Korean halls (法王樓 → 樓王法).
function nameBoard(han, w, h) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#1d2a3a'; x.fillRect(0, 0, 256, 96);
  x.strokeStyle = '#d4a73a'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 88);
  x.fillStyle = '#f2e6c4'; x.font = `bold ${han.length > 3 ? 46 : 58}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText([...han].reverse().join(''), 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  farFree(tex);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.userData.noShadow = true;
  return m;
}
const C = {
  stone: '#d6cdb8', stoneDark: '#b1a690', post: '#a8392b', door: '#7a2c22', wall: '#efe6d2',
  beam: '#2f8a68', beamBlue: '#3f6f9a', bracket: '#2a6f5a', bronze: '#5f6a55', gold: '#d4a73a',
  g0: '#efeee9', g1: '#e2dfd6', g2: '#cdc9be', g3: '#aaa59a', g4: '#8d887e', // white granite, light to dark
};
// The lanterns' paper: lit from inside after dark (weather.js glowAtNight).
function lanternMat() {
  const m = new THREE.MeshLambertMaterial({ emissive: '#ffb45e' });
  glowAtNight(m, 0.55);
  return m;
}
const LANTERN_COLORS = ['#f28cb1', '#ffd45c', '#e8483f', '#5b8fd9', '#5cbf72', '#a777d6', '#ff9a4a'].map((c) => new THREE.Color(c));

// --- temple pieces -------------------------------------------------------------

// Paper lanterns (연등) hung in rows: a canopy w × d over a courtyard (rows
// of one colour each, as Bongeunsa hangs them) at height y, on poles at the
// corners. Returns the InstancedMesh (one draw call) and adds the wires.
export function lanternCanopy(g, w, d, y = 3.4, gap = 0.5) {
  const nx = Math.max(2, Math.round(w / gap)), nz = Math.max(2, Math.round(d / gap));
  const geo = new THREE.SphereGeometry(0.17, 8, 6);
  geo.scale(1, 1.2, 1);
  const m = new THREE.InstancedMesh(geo, lanternMat(), nx * nz);
  const m4 = new THREE.Matrix4();
  let i = 0;
  for (let r = 0; r < nz; r++) {
    const z = -d / 2 + (r + 0.5) * (d / nz);
    box(g, w, 0.025, 0.025, 0, y + 0.22, z, C.g4); // the wire
    for (let k = 0; k < nx; k++, i++) {
      m.setMatrixAt(i, m4.makeTranslation(-w / 2 + (k + 0.5) * (w / nx), y, z));
      m.setColorAt(i, LANTERN_COLORS[r % LANTERN_COLORS.length]);
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.1, y + 0.3, 0.1, sx * w / 2, (y + 0.3) / 2, sz * d / 2, C.g4);
  m.userData.noShadow = true;
  g.add(m);
  return m;
}
// Two strings of lanterns either side of a path from a to b ([x, z]).
function lanternLane(g, a, b, y = 2.8, half = 1.3, gap = 0.5) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(L / gap));
  const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, sx = -uz, sz = ux;
  const geo = new THREE.SphereGeometry(0.17, 8, 6);
  geo.scale(1, 1.2, 1);
  const m = new THREE.InstancedMesh(geo, lanternMat(), n * 2);
  const m4 = new THREE.Matrix4(), lane = [LANTERN_COLORS[0], LANTERN_COLORS[1], LANTERN_COLORS[2]];
  let i = 0;
  for (const side of [-1, 1]) {
    const ox = sx * half * side, oz = sz * half * side;
    const wire = box(g, 0.025, 0.025, L, (a[0] + b[0]) / 2 + ox, y + 0.22, (a[1] + b[1]) / 2 + oz, C.g4);
    wire.rotation.y = Math.atan2(ux, uz);
    for (let k = 0; k < n; k++, i++) {
      const t = (k + 0.5) / n;
      m.setMatrixAt(i, m4.makeTranslation(a[0] + (b[0] - a[0]) * t + ox, y, a[1] + (b[1] - a[1]) * t + oz));
      m.setColorAt(i, lane[k % lane.length]);
    }
    for (let p = 0; p <= Math.ceil(L / 4); p++) {
      const t = Math.min(1, (p * 4) / L);
      box(g, 0.09, y + 0.3, 0.09, a[0] + (b[0] - a[0]) * t + ox, (y + 0.3) / 2, a[1] + (b[1] - a[1]) * t + oz, C.g4);
    }
  }
  m.userData.noShadow = true;
  g.add(m);
  return m;
}
// A three-storey granite pagoda (삼층석탑) on a two-tier base, about 1.9 m (1/4).
export function stonePagoda(g, x, z, s = 1) {
  const p = new THREE.Group();
  box(p, 1.0, 0.22, 1.0, 0, 0.11, 0, C.g2);
  box(p, 0.82, 0.32, 0.82, 0, 0.38, 0, C.g1);
  box(p, 0.9, 0.06, 0.9, 0, 0.57, 0, C.g2);
  let y = 0.6;
  for (const [w, h] of [[0.46, 0.34], [0.38, 0.24], [0.31, 0.2]]) {
    box(p, w, h, w, 0, y + h / 2, 0, C.g1);
    box(p, w * 1.75, 0.07, w * 1.75, 0, y + h + 0.035, 0, C.g2); // the roof stone
    box(p, w * 1.25, 0.05, w * 1.25, 0, y + h + 0.095, 0, C.g2);
    y += h + 0.12;
  }
  cyl(p, 0.03, 0.03, 0.42, 0, y + 0.21, 0, C.g3, 6); // the finial
  for (const yy of [y + 0.12, y + 0.24]) cyl(p, 0.07, 0.07, 0.04, 0, yy, 0, C.g3, 8);
  p.position.set(x, 0, z);
  p.scale.setScalar(s);
  g.add(p);
}
// A stone lantern (석등): base, shaft, the lamp box with its windows, a roof.
export function stoneLantern(g, x, z, h = 1.0) {
  const k = h / 1.0, p = new THREE.Group();
  cyl(p, 0.2, 0.22, 0.12, 0, 0.06, 0, C.g2, 8);
  cyl(p, 0.16, 0.2, 0.08, 0, 0.16, 0, C.g1, 8);
  cyl(p, 0.06, 0.07, 0.32, 0, 0.36, 0, C.g1, 8);
  cyl(p, 0.17, 0.12, 0.07, 0, 0.555, 0, C.g1, 8);
  cyl(p, 0.12, 0.12, 0.2, 0, 0.69, 0, C.g1, 8);
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; box(p, 0.07, 0.11, 0.02, Math.sin(a) * 0.12, 0.7, Math.cos(a) * 0.12, '#3b3a36').rotation.y = a; }
  const roof = add(p, new THREE.ConeGeometry(0.24, 0.14, 8), C.g2, 0, 0.86, 0);
  roof.rotation.y = Math.PI / 8;
  ball(p, 0.045, 0, 0.96, 0, C.g1, 1, 1.4, 1, 8, 6);
  p.scale.setScalar(k);
  p.position.set(x, 0, z);
  g.add(p);
}
// A bell pavilion (종루): four red posts, a tiled roof, the bronze bell.
export function bellPavilion(g, x, z, ry = 0, w = 2.8) {
  const p = new THREE.Group(), H = 2.3, hw = w / 2 - 0.2;
  box(p, w + 0.4, 0.3, w + 0.4, 0, 0.15, 0, C.stone);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(p, 0.22, H, 0.22, sx * hw, 0.3 + H / 2, sz * hw, C.post);
  box(p, w + 0.1, 0.22, w + 0.1, 0, 0.3 + H, 0, C.beam);
  box(p, w + 0.4, 0.18, w + 0.4, 0, 0.3 + H + 0.2, 0, C.bracket);
  tiles(p, w + 1.5, w + 1.5, 1.3, 0.3 + H + 0.3, { hip: true, lift: 0.5, seg: 4, rows: 2 });
  box(p, w - 0.4, 0.14, 0.14, 0, 0.3 + H - 0.2, 0, '#5a3a2a'); // the beam the bell hangs from
  cyl(p, 0.36, 0.42, 0.72, 0, 0.3 + H - 0.75, 0, C.bronze, 14);
  ball(p, 0.36, 0, 0.3 + H - 0.39, 0, C.bronze, 1, 0.45, 1, 14, 6);
  p.position.set(x, 0, z);
  p.rotation.y = ry;
  g.add(p);
}

// Beopwangru (법왕루): a two-storey pavilion, the upper storey set back, a
// balcony round it and one big hipped roof. [x, z, w, d, ry].
function beopwangru(g, [x, z, w, d, ry]) {
  const p = new THREE.Group(), hw = w / 2, hd = d / 2, H1 = 2.4, H2 = 1.9;
  box(p, w + 0.7, 0.45, d + 0.7, 0, 0.225, 0, C.stone);
  let y = 0.45;
  box(p, w - 0.5, H1, d - 0.5, 0, y + H1 / 2, 0, C.wall);
  box(p, w - 0.9, H1 * 0.8, 0.12, 0, y + H1 * 0.4, hd - 0.2, C.door);
  const nx = Math.max(2, Math.round(w / 1.7)), nz = Math.max(2, Math.round(d / 1.9));
  for (let i = 0; i <= nx; i++) for (const sz of [-1, 1]) box(p, 0.34, H1, 0.34, -hw + (i * w) / nx, y + H1 / 2, sz * hd, C.post);
  for (let i = 1; i < nz; i++) for (const sx of [-1, 1]) box(p, 0.34, H1, 0.34, sx * hw, y + H1 / 2, -hd + (i * d) / nz, C.post);
  y += H1;
  box(p, w + 0.3, 0.3, d + 0.3, 0, y + 0.15, 0, C.beam);
  box(p, w + 0.9, 0.18, d + 0.9, 0, y + 0.39, 0, C.post); // the balcony floor
  for (const sz of [-1, 1]) box(p, w + 0.9, 0.06, 0.06, 0, y + 0.95, sz * (hd + 0.42), C.post); // its rail
  for (const sx of [-1, 1]) box(p, 0.06, 0.06, d + 0.9, sx * (hw + 0.42), y + 0.95, 0, C.post);
  y += 0.48;
  const w2 = w - 1.0, d2 = d - 1.0;
  box(p, w2, H2, d2, 0, y + H2 / 2, 0, C.wall);
  box(p, w2 - 0.4, H2 * 0.75, 0.1, 0, y + H2 * 0.45, d2 / 2 + 0.02, C.door);
  for (let i = 0; i <= nx; i++) for (const sz of [-1, 1]) box(p, 0.3, H2, 0.3, -w2 / 2 + (i * w2) / nx, y + H2 / 2, sz * d2 / 2, C.post);
  y += H2;
  box(p, w2 + 0.3, 0.3, d2 + 0.3, 0, y + 0.15, 0, C.beam);
  box(p, w2 + 0.8, 0.32, d2 + 0.8, 0, y + 0.46, 0, C.bracket);
  box(p, w2 + 1.2, 0.14, d2 + 1.2, 0, y + 0.69, 0, C.beamBlue);
  tiles(p, w + 2.6, d + 2.6, 2.4, y + 0.76, { hip: true, lift: 1.0, seg: 6, rows: 3 });
  const sign = nameBoard('法王樓', 2.4, 0.9);
  sign.position.set(0, y - H2 * 0.25, d2 / 2 + 0.14);
  p.add(sign);
  p.position.set(x, 0, z);
  p.rotation.y = ry;
  g.add(p);
}
// Iljumun (일주문): the one-pillar gate, two posts in a line under a gable roof.
function iljumun(g, [x, z, ry]) {
  const p = new THREE.Group(), H = 2.6, s = 1.35;
  for (const sx of [-1, 1]) {
    box(p, 0.55, 0.35, 0.55, sx * s, 0.175, 0, C.stone);
    cyl(p, 0.17, 0.19, H, sx * s, 0.35 + H / 2, 0, C.post, 10);
  }
  box(p, 2 * s + 0.6, 0.3, 0.32, 0, 0.35 + H - 0.1, 0, C.beam);
  box(p, 2 * s + 1.2, 0.42, 0.7, 0, 0.35 + H + 0.26, 0, C.bracket); // the bracket sets, front and back
  box(p, 2 * s + 1.5, 0.12, 0.9, 0, 0.35 + H + 0.53, 0, C.beamBlue);
  tiles(p, 2 * s + 2.4, 2.2, 0.95, 0.35 + H + 0.6, { hip: false, lift: 0.5, seg: 5, rows: 2 });
  for (const zz of [0.17, -0.17]) {
    const sign = nameBoard('奉恩寺', 1.1, 0.42);
    sign.position.set(0, 0.35 + H - 0.42, zz);
    if (zz < 0) sign.rotation.y = Math.PI;
    p.add(sign);
  }
  p.position.set(x, 0, z);
  p.rotation.y = ry;
  g.add(p);
}
// Haesu Gwaneum (해수관음상): a white standing Bodhisattva holding a vase,
// on a rock in her pond (the water is the map's; here the rim, rock, figure).
function gwaneum(g, [x, z]) {
  const p = new THREE.Group();
  const rim = add(p, new THREE.TorusGeometry(1.75, 0.12, 4, 18), C.g2, 0, 0.08, 0);
  rim.rotation.x = Math.PI / 2;
  const rock = add(p, new THREE.DodecahedronGeometry(0.6, 0), C.g3, 0, 0.25, 0);
  rock.scale.set(1.1, 0.7, 1);
  cyl(p, 0.42, 0.48, 0.18, 0, 0.6, 0, C.g1, 10); // the lotus seat
  const body = add(p, new THREE.LatheGeometry([[0, 0], [0.3, 0], [0.32, 0.15], [0.26, 0.7], [0.27, 1.0], [0.3, 1.15], [0.12, 1.22], [0, 1.23]].map(([r, y]) => new THREE.Vector2(r, y)), 10), C.g0, 0, 0.69, 0);
  body.scale.z = 0.75;
  ball(p, 0.15, 0, 2.02, 0, C.g0, 0.95, 1.1, 0.95, 8, 6);
  cyl(p, 0.1, 0.13, 0.16, 0, 2.2, 0, C.g1, 8); // the crown
  limb(p, [0.27, 1.75, 0], [0.32, 1.42, 0.16], 0.07, 0.06, C.g0, 6);
  limb(p, [0.32, 1.42, 0.16], [0.2, 1.55, 0.3], 0.06, 0.05, C.g0, 6);
  ball(p, 0.07, 0.2, 1.62, 0.32, C.g1, 1, 1.5, 1, 8, 6); // the vase
  limb(p, [-0.27, 1.75, 0], [-0.3, 1.25, 0.08], 0.07, 0.06, C.g0, 6);
  p.position.set(x, 0, z);
  g.add(p);
}

export function buildTemple(g, l) {
  const halls = new THREE.Group();
  g.add(halls);
  PALACE_BUILD.palacehalls(halls, { halls: l.halls });
  const own = new THREE.Group();
  g.add(own);
  if (l.nu) beopwangru(own, l.nu);
  if (l.iljumun) iljumun(own, l.iljumun);
  if (l.gwaneum) gwaneum(own, l.gwaneum);
  if (l.pagoda) stonePagoda(own, ...l.pagoda);
  if (l.bell) bellPavilion(own, l.bell[0], l.bell[1], l.bell[2]);
  const lamps = [];
  if (l.canopy) {
    const [x, z, w, d, ry] = l.canopy, c = new THREE.Group();
    c.position.set(x, 0, z);
    c.rotation.y = ry;
    own.add(c);
    lamps.push(lanternCanopy(c, w, d));
  }
  if (l.lane) lamps.push(lanternLane(own, l.lane[0], l.lane[1]));
  bakeColors(own, lamps);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
}

// --- the Maitreya Buddha ---------------------------------------------------------

// The standing Buddha, built 12 m tall and scaled to l.h, facing +z: the
// statue's right hand raised at the chest (palm out), the left hanging down.
function buddha(g) {
  // The hexagonal base: three steps, a slab, the panels between six columns, two slabs.
  [[3.0, 0.09], [2.75, 0.27], [2.5, 0.45]].forEach(([r, y]) => cyl(g, r, r, 0.18, 0, y, 0, C.g2, 6));
  cyl(g, 2.35, 2.35, 0.25, 0, 0.665, 0, C.g1, 6);
  cyl(g, 1.95, 1.95, 1.5, 0, 1.54, 0, C.g3, 6);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, b = a + Math.PI / 6;
    cyl(g, 0.16, 0.16, 1.5, Math.sin(a) * 2.12, 1.54, Math.cos(a) * 2.12, C.g1, 8); // a column at each corner
    cyl(g, 0.22, 0.22, 0.12, Math.sin(a) * 2.12, 0.85, Math.cos(a) * 2.12, C.g2, 8);
    cyl(g, 0.22, 0.22, 0.12, Math.sin(a) * 2.12, 2.23, Math.cos(a) * 2.12, C.g2, 8);
    const panel = box(g, 1.55, 1.2, 0.08, Math.sin(b) * 1.72, 1.54, Math.cos(b) * 1.72, C.g2); // a carved panel on each face
    panel.rotation.y = b;
    const fig = box(g, 0.32, 0.9, 0.06, Math.sin(b) * 1.78, 1.5, Math.cos(b) * 1.78, C.g4); // the figure carved on it
    fig.rotation.y = b;
    ball(g, 0.14, Math.sin(b) * 1.79, 2.0, Math.cos(b) * 1.79, C.g4, 1, 1, 0.4, 8, 6);
  }
  cyl(g, 2.45, 2.45, 0.3, 0, 2.44, 0, C.g1, 6);
  cyl(g, 2.2, 2.2, 0.2, 0, 2.69, 0, C.g0, 6);
  // The double lotus: a drum, petals turned down, petals turned up, a seat.
  cyl(g, 1.25, 1.35, 0.35, 0, 2.965, 0, C.g1, 14);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const dn = ball(g, 0.42, Math.sin(a) * 1.4, 3.3, Math.cos(a) * 1.4, C.g1, 1, 0.55, 0.5, 8, 6);
    dn.rotation.y = a;
    const up = ball(g, 0.4, Math.sin(a + 0.22) * 1.42, 3.72, Math.cos(a + 0.22) * 1.42, C.g0, 1, 1.1, 0.42, 8, 6);
    up.rotation.set(0, a + 0.22, 0);
    up.rotateX(-0.35);
  }
  cyl(g, 1.32, 1.3, 0.16, 0, 4.04, 0, C.g0, 16);
  // The figure, its feet on the lotus at y0.
  const y0 = 4.12;
  const body = add(g, new THREE.LatheGeometry([[0, 0], [0.95, 0], [1.0, 0.35], [0.93, 1.6], [0.86, 3.0], [0.9, 3.9], [1.05, 4.55], [1.12, 4.85], [0.95, 5.1], [0.42, 5.25], [0, 5.27]].map(([r, y]) => new THREE.Vector2(r, y)), 14), C.g0, 0, y0, 0);
  body.scale.z = 0.66;
  const hem = add(g, new THREE.TorusGeometry(0.98, 0.05, 4, 16), C.g1, 0, y0 + 0.36, 0);
  hem.rotation.x = Math.PI / 2;
  hem.scale.y = 0.66;
  for (const sx of [-1, 1]) box(g, 0.3, 0.16, 0.42, sx * 0.3, y0 + 0.08, 0.62, C.g1); // the toes
  // Folds of the robe: U-shaped ridges down the front, a sash across the chest.
  for (let i = 0; i < 6; i++) {
    const r = 0.5 + i * 0.32, f = add(g, new THREE.TorusGeometry(r, 0.035, 4, 10, Math.PI * 0.7), C.g2, 0, y0 + 3.9 - i * 0.55, 0.62 - i * 0.01);
    f.rotation.z = -Math.PI / 2 - Math.PI * 0.35;
    f.scale.set(0.7, 0.32, 1);
  }
  for (const sx of [-0.45, -0.15, 0.15, 0.45]) { const v = box(g, 0.05, 1.7, 0.05, sx, y0 + 1.05, 0.63, C.g2); v.rotation.z = sx * 0.06; }
  const sash = box(g, 0.08, 1.9, 0.06, 0.15, y0 + 4.05, 0.6, C.g2);
  sash.rotation.z = -0.62;
  // The long sleeves hanging at both sides, almost to the feet.
  for (const sx of [-1, 1]) {
    const sl = box(g, 0.34, 2.9, 0.5, sx * 1.02, y0 + 2.2, 0.05, C.g1);
    sl.rotation.z = sx * 0.05;
    box(g, 0.3, 0.08, 0.52, sx * 1.04, y0 + 0.78, 0.05, C.g2);
  }
  // Arms: the right (−x) raised to the chest, palm out; the left down by the side.
  limb(g, [-1.0, y0 + 4.75, 0], [-1.06, y0 + 3.65, 0.22], 0.26, 0.22, C.g0);
  limb(g, [-1.06, y0 + 3.65, 0.22], [-0.62, y0 + 4.15, 0.72], 0.2, 0.15, C.g0);
  box(g, 0.3, 0.46, 0.11, -0.58, y0 + 4.42, 0.76, C.g0); // the palm
  for (let i = 0; i < 4; i++) box(g, 0.06, 0.2, 0.08, -0.69 + i * 0.075, y0 + 4.74, 0.76, C.g0);
  limb(g, [1.0, y0 + 4.75, 0], [1.08, y0 + 3.55, 0.12], 0.26, 0.22, C.g0);
  limb(g, [1.08, y0 + 3.55, 0.12], [0.96, y0 + 2.75, 0.4], 0.2, 0.15, C.g0);
  box(g, 0.26, 0.42, 0.14, 0.94, y0 + 2.52, 0.46, C.g0);
  // Neck, head, ears, the curls and the ushnisha (육계), the face.
  cyl(g, 0.3, 0.34, 0.34, 0, y0 + 5.38, 0, C.g0, 10);
  for (const yy of [5.33, 5.43]) { const t = add(g, new THREE.TorusGeometry(0.31, 0.02, 4, 12), C.g2, 0, y0 + yy, 0); t.rotation.x = Math.PI / 2; }
  ball(g, 0.58, 0, y0 + 5.98, 0, C.g0, 0.92, 1.1, 0.96, 12, 9);
  ball(g, 0.6, 0, y0 + 6.14, -0.06, C.g2, 0.95, 0.82, 0.95, 12, 8); // the curls
  ball(g, 0.3, 0, y0 + 6.68, -0.04, C.g2, 1, 0.9, 1, 10, 7);
  ball(g, 0.07, 0, y0 + 6.33, 0.5, C.g1, 1, 1, 0.6, 6, 5); // the jewel at the parting
  for (const sx of [-1, 1]) {
    box(g, 0.12, 0.62, 0.24, sx * 0.55, y0 + 5.85, -0.02, C.g0); // the long ears
    box(g, 0.2, 0.035, 0.05, sx * 0.19, y0 + 6.12, 0.5, C.g3); // brows
    box(g, 0.16, 0.025, 0.04, sx * 0.19, y0 + 6.01, 0.52, C.g4); // half-closed eyes
  }
  ball(g, 0.035, 0, y0 + 6.22, 0.54, C.g3, 1, 1, 0.5, 6, 4); // the urna
  box(g, 0.1, 0.24, 0.12, 0, y0 + 5.88, 0.53, C.g1); // nose
  box(g, 0.16, 0.025, 0.04, 0, y0 + 5.7, 0.5, C.g3); // mouth
  // The square canopy (보개) on a short post over the head, bells at its corners.
  const yc = y0 + 7.02;
  cyl(g, 0.1, 0.12, 0.22, 0, y0 + 6.92, 0, C.g1, 8);
  box(g, 2.3, 0.12, 2.3, 0, yc, 0, C.g0);
  box(g, 2.4, 0.05, 2.4, 0, yc - 0.08, 0, C.g2);
  const cap = add(g, new THREE.ConeGeometry(1.62, 0.42, 4), C.g1, 0, yc + 0.27, 0);
  cap.rotation.y = Math.PI / 4;
  cyl(g, 0.08, 0.1, 0.22, 0, yc + 0.58, 0, C.g1, 8);
  ball(g, 0.13, 0, yc + 0.76, 0, '#5f8f7c', 1, 1.3, 1, 8, 6); // the jewel on top
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(g, 0.025, 0.36, 0.025, sx * 1.12, yc - 0.26, sz * 1.12, C.g4);
    cyl(g, 0.05, 0.08, 0.16, sx * 1.12, yc - 0.5, sz * 1.12, '#6f7a66', 8);
  }
}
// The curved wall of niches behind the statue (r: its radius), with a carved
// guardian panel at each end; about 1.1 m high (1/4).
function nicheWall(g, r) {
  const H = 1.1, a0 = Math.PI - 1.55, a1 = Math.PI + 1.55, n = 16; // (round the back, −z)
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n, len = (r * (a1 - a0)) / n + 0.04;
    const seg = new THREE.Group();
    box(seg, len, H, 0.5, 0, H / 2, 0, C.g1);
    box(seg, len, 0.08, 0.6, 0, H + 0.04, 0, C.g0);
    for (const yy of [0.42, 0.78]) for (const k of [-0.3, 0.3]) {
      box(seg, 0.22, 0.24, 0.04, k * len, yy, 0.26, C.g4); // a niche
      ball(seg, 0.05, k * len, yy - 0.02, 0.27, C.g0, 1, 1.4, 0.6, 6, 4); // its little Buddha
    }
    seg.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    seg.rotation.y = a + Math.PI; // the niches face the statue
    g.add(seg);
  }
  for (const a of [a0, a1]) {
    const p = new THREE.Group();
    box(p, 0.9, 1.6, 0.55, 0, 0.8, 0, C.g1);
    box(p, 0.5, 1.15, 0.05, 0, 0.78, 0.28, C.g3); // the guardian carved on it
    ball(p, 0.12, 0, 1.28, 0.3, C.g3, 1, 1.1, 0.5, 6, 5);
    box(p, 1.0, 0.1, 0.65, 0, 1.65, 0, C.g0);
    p.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    p.rotation.y = a + Math.PI;
    g.add(p);
  }
}
export function buildMaitreya(g, l) {
  const all = new THREE.Group();
  g.add(all);
  // The plaza: pale paving in an oval reaching forward, the red mat for bows.
  const pave = add(all, new THREE.CircleGeometry(1, 28), C.g1, 0, 0.03, 2.2);
  pave.rotation.x = -Math.PI / 2;
  pave.scale.set(5.6, 6.6, 1);
  box(all, 2.6, 0.03, 2.1, 0, 0.05, 4.7, '#8e2a26');
  const statue = new THREE.Group();
  statue.scale.setScalar((l.h || 11.5) / 12);
  all.add(statue);
  buddha(statue);
  nicheWall(all, l.wallR || 4.6);
  for (const sx of [-1, 1]) {
    stoneLantern(all, sx * 2.9, 3.1, 1.0);
    // a small roofed offering table (공양대) either side of the mat
    const t = new THREE.Group();
    box(t, 0.8, 0.42, 0.5, 0, 0.21, 0, '#6b4a33');
    for (const px of [-0.36, 0.36]) box(t, 0.06, 0.75, 0.06, px, 0.62, -0.18, C.post);
    tiles(t, 1.15, 0.8, 0.25, 0.98, { hip: true, lift: 0.18, seg: 3, rows: 1 }, 0, -0.05);
    t.position.set(sx * 1.75, 0, 3.5);
    all.add(t);
  }
  bakeColors(all);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
}
