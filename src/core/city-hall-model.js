// Seoul City Hall, seen from Seoul Plaza (map "landmarks" in
// districts/gyeongbokgung.json, laid out by scripts/build-city-hall.mjs; the
// whole place at 37.5% of the real one):
//   oldcityhall  the old hall of 1926, now Seoul Metropolitan Library: a
//                stone building on its real outline, rows of tall windows,
//                the entrance in the middle of the front, and the clock
//                tower with its green dome (l.tower: u, v, w, d, top).
//   cityhall     the new hall of 2012 behind it: glass on a diagonal grid,
//                its front swelling out at the top like a wave breaking
//                over the old hall, solar panels on the roof, white
//                triangle panels and the oval glass room on its east side.
// Both face south (local +z), towards the lawn. Loaded when the city is
// built (core/landmarks.js). Visual only: collision comes from the map's
// blockers. Each is merged into a few meshes (one per material).
import * as THREE from 'three';
import { matCache, addBox, canvasTex } from './three-kit.js';
import { mergeStatic } from './bukchon-models.js';

const mat = matCache({ flatShading: true });
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const C = {
  stone: '#d2c4a2', stoneDark: '#b7a987', stoneLight: '#e2d7bb', window: '#3f4c58', door: '#6b4a30', roof: '#8fa58f',
  copper: '#6fa596', copperDark: '#4f8576', clock: '#f4f0e4', iron: '#2a2d31',
  glassTop: '#2f6f7e', panel: '#f1f3f1', solar: '#27406e', solarFrame: '#dfe5ea', pod: '#bfe0e6', steel: '#8fa0a6',
};

// A flat slab on a footprint (u, v: v is south), from y0 to y1.
function slab(g, outline, y0, y1, c, grow = 0) {
  const pts = grow ? outline.map(([u, v]) => { const l = Math.hypot(u, v) || 1; return [u + (u / l) * grow, v + (v / l) * grow]; }) : outline;
  const shape = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, -v)));
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false }), mat(c));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y0;
  g.add(m);
  return m;
}
const signedArea = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };

export function buildOldCityHall(g, l) {
  const P = l.outline, H = l.h, floors = 3, fh = (H - 1.2) / floors;
  slab(g, P, 0, 0.9, C.stoneDark, 0.12); // the plinth
  slab(g, P, 0.9, H, C.stone);
  slab(g, P, H, H + 0.35, C.stoneLight, 0.18); // the cornice
  slab(g, P, H + 0.35, H + 0.45, C.roof, -0.5); // the roof garden
  // Windows along every wall: three rows, tall and narrow, between stone piers.
  const out = signedArea(P) > 0 ? 1 : -1; // which way is outside
  let front = null; // the longest wall facing south: the entrance goes in its middle
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1.6) continue;
    const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = uz * out, nz = -ux * out; // outward
    if (nz > 0.9 && (!front || L > front.L)) front = { a, b, L };
    const wall = new THREE.Group();
    const n = Math.max(1, Math.floor((L - 0.6) / 1.25));
    for (let k = 0; k < n; k++) {
      const x = -L / 2 + ((k + 0.5) * L) / n;
      for (let f = 0; f < floors; f++) box(wall, 0.55, fh * 0.62, 0.08, x, 1.25 + f * fh + fh * 0.36, 0.03, C.window);
    }
    box(wall, L, 0.14, 0.14, 0, 1.0 + fh, 0.05, C.stoneLight); // a string course over the ground floor
    wall.position.set((a[0] + b[0]) / 2 + nx * 0.02, 0, (a[1] + b[1]) / 2 + nz * 0.02);
    wall.rotation.y = Math.atan2(nx, nz);
    g.add(wall);
  }
  // The entrance: a stone porch with three doors, steps down to the plaza.
  if (front) {
    const fx = (front.a[0] + front.b[0]) / 2, fz = Math.max(front.a[1], front.b[1]);
    box(g, 5.4, fh + 1.3, 1.1, fx, (fh + 1.3) / 2, fz + 0.5, C.stoneLight);
    box(g, 5.8, 0.3, 1.4, fx, fh + 1.45, fz + 0.5, C.stoneDark);
    for (const k of [-1, 0, 1]) box(g, 1.1, fh * 0.95, 0.12, fx + k * 1.6, 0.5 + (fh * 0.95) / 2, fz + 1.06, k ? C.window : C.door);
    for (let i = 0; i < 3; i++) box(g, 6.6 - i * 0.3, 0.14, 0.4, fx, 0.07 + i * 0.13, fz + 2.0 - i * 0.38, C.stoneDark);
  }
  // The clock tower: a square shaft above the roof, a clock on each face, the green copper dome and its lantern.
  if (l.tower) {
    const [u, v, w, d, top] = l.tower;
    box(g, w, top - H, d, u, H + (top - H) / 2, v, C.stone);
    box(g, w + 0.5, 0.3, d + 0.5, u, top + 0.15, v, C.stoneLight);
    const cr = Math.min(w, top - H) * 0.3;
    for (const [dx, dz, ry] of [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) {
      const face = new THREE.Mesh(new THREE.CylinderGeometry(cr, cr, 0.08, 20), mat(C.clock));
      face.rotation.set(Math.PI / 2, 0, 0);
      const hold = new THREE.Group();
      hold.add(face);
      box(hold, 0.07, cr * 0.8, 0.04, 0, cr * 0.35, 0.06, C.iron); // the hands, at about ten past ten
      const hand = box(hold, 0.07, cr * 0.55, 0.04, cr * 0.2, cr * 0.18, 0.06, C.iron);
      hand.rotation.z = -1.0;
      hold.position.set(u + dx * (w / 2 + 0.03), H + (top - H) * 0.55, v + dz * (d / 2 + 0.03));
      hold.rotation.y = ry;
      g.add(hold);
    }
    const dr = Math.min(w, d) * 0.52;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(dr, dr, 0.5, 12), mat(C.copperDark));
    drum.position.set(u, top + 0.55, v);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(dr, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.copper));
    dome.position.set(u, top + 0.8, v);
    dome.scale.y = 0.9;
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(dr * 0.22, dr * 0.26, dr * 0.5, 8), mat(C.copperDark));
    lantern.position.set(u, top + 0.8 + dr * 0.9 + dr * 0.2, v);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(dr * 0.3, dr * 0.45, 8), mat(C.copper));
    cap.position.set(u, top + 0.8 + dr * 0.9 + dr * 0.67, v);
    g.add(drum, dome, lantern, cap);
  }
  mergeStatic(g);
}

// The glass: a diagonal grid of panes in a few greens and blues (one small picture, repeated).
let glass = null;
function glassMat() {
  if (glass) return glass;
  const tex = canvasTex(128, 128, (c, w, h) => {
    const tones = ['#3f8794', '#357b8a', '#4a93a0', '#2f6f80', '#57a2ab', '#3b8190'];
    const n = 4, s = w / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * s, y = j * s, flip = (i + j) % 2;
      const tri = (pts, k) => { c.fillStyle = tones[(i * 3 + j * 5 + k) % tones.length]; c.beginPath(); c.moveTo(...pts[0]); c.lineTo(...pts[1]); c.lineTo(...pts[2]); c.closePath(); c.fill(); };
      if (flip) { tri([[x, y], [x + s, y], [x, y + s]], 0); tri([[x + s, y], [x + s, y + s], [x, y + s]], 1); } else { tri([[x, y], [x + s, y], [x + s, y + s]], 2); tri([[x, y], [x + s, y + s], [x, y + s]], 3); }
    }
    c.strokeStyle = 'rgba(225, 240, 240, 0.75)';
    c.lineWidth = 1.5;
    for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = i * s, y = j * s; c.beginPath(); if ((i + j) % 2) { c.moveTo(x + s, y); c.lineTo(x, y + s); } else { c.moveTo(x, y); c.lineTo(x + s, y + s); } c.stroke(); }
  }, { repeat: [1 / 6, 1 / 6], anisotropy: 4 });
  glass = new THREE.MeshLambertMaterial({ map: tex, emissive: '#16343a', emissiveIntensity: 0.6 });
  return glass;
}

export function buildCityHall(g, l) {
  const us = l.outline.map((p) => p[0]), vs = l.outline.map((p) => p[1]);
  const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs), w = u1 - u0, H = l.h;
  const over = Math.min(3.4, (v1 - v0) * 0.18); // how far the wave hangs out over the old hall
  // The body: one profile (south is +v) pulled along the building. Back wall straight, the roof rising to the
  // front, the front leaning in at the foot and swelling out to a crest under the roof's edge.
  const prof = [
    [v0, 0], [v0, H * 0.92], [v0 + (v1 - v0) * 0.55, H], [v1 + over * 0.55, H * 0.985], [v1 + over, H * 0.93],
    [v1 + over * 1.04, H * 0.85], [v1 + over * 0.86, H * 0.74], [v1 + over * 0.5, H * 0.63], [v1 + over * 0.12, H * 0.52],
    [v1 - 0.35, H * 0.4], [v1 - 0.6, H * 0.22], [v1 - 0.45, 0],
  ];
  const shape = new THREE.Shape(prof.map(([v, y]) => new THREE.Vector2(v, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  // (the profile is drawn in x = v, y = up; turn it so x runs east-west and z south)
  geo.rotateY(-Math.PI / 2);
  geo.translate(u1, 0, 0);
  const body = new THREE.Mesh(geo, glassMat());
  body.name = 'glass';
  g.add(body);
  // A steel edge along the crest and the roof's rim.
  box(g, w + 0.3, 0.25, 0.35, (u0 + u1) / 2, H * 0.93, v1 + over, C.steel);
  box(g, w + 0.3, 0.22, 0.3, (u0 + u1) / 2, H * 0.92 + 0.05, v0, C.steel);
  // The entrance at the foot of the glass: a dark band of doors under a thin canopy.
  box(g, w * 0.3, 2.6, 0.2, (u0 + u1) / 2 + w * 0.2, 1.3, v1 - 0.4, C.iron);
  box(g, w * 0.34, 0.18, 2.2, (u0 + u1) / 2 + w * 0.2, 2.8, v1 + 0.5, C.steel);
  // Solar panels on the roof: three fields in white frames, tilted with the roof.
  const tilt = Math.atan2(H * 0.08, (v1 - v0) * 0.55);
  for (const k of [-1, 0, 1]) {
    const p = new THREE.Group();
    box(p, w * 0.27, 0.25, (v1 - v0) * 0.42, 0, 0, 0, C.solarFrame);
    box(p, w * 0.27 - 0.6, 0.27, (v1 - v0) * 0.42 - 0.6, 0, 0.02, 0, C.solar);
    p.position.set((u0 + u1) / 2 + k * w * 0.31, H * 0.96 + 0.25, v0 + (v1 - v0) * 0.3);
    p.rotation.x = -tilt;
    g.add(p);
  }
  // The east and west ends: white triangle panels over the glass, low down.
  // (all ten in one mesh: [x, y, z] corners gathered here)
  const corners = [];
  const tri = (pts, x) => { for (const [v, y] of pts) corners.push(x, y, v); };
  const d = v1 - v0;
  for (const [x, s] of [[u1 + 0.06, 1], [u0 - 0.06, -1]]) {
    const at = (a, y) => [v0 + d * (s > 0 ? a : 1 - a), H * y];
    tri([at(0.05, 0), at(0.3, 0), at(0.16, 0.34)], x);
    tri([at(0.3, 0), at(0.52, 0), at(0.44, 0.5)], x);
    tri([at(0.52, 0), at(0.8, 0), at(0.7, 0.3)], x);
    tri([at(0.16, 0.34), at(0.44, 0.5), at(0.24, 0.62)], x);
    tri([at(0.62, 0.18), at(0.9, 0.36), at(0.66, 0.56)], x);
  }
  const panelGeo = new THREE.BufferGeometry();
  panelGeo.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
  panelGeo.computeVertexNormals();
  const panels = new THREE.Mesh(panelGeo, new THREE.MeshLambertMaterial({ color: C.panel, side: THREE.DoubleSide }));
  panels.name = 'panels';
  g.add(panels);
  // The oval glass room high on the east end (the sky lounge).
  const pod = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat(C.pod));
  pod.scale.set(1.1, H * 0.09, d * 0.3);
  pod.position.set(u1 + 0.35, H * 0.74, v0 + d * 0.55);
  g.add(pod);
  // (keep the glass and the white panels as they are; merge the rest)
  const keep = g.children.filter((o) => o.material?.map || o.name === 'panels');
  for (const o of keep) g.remove(o);
  mergeStatic(g);
  g.add(...keep);
}
