// Myeongdong Cathedral (map landmark "cathedral", districts/myeongdong.json):
// a Gothic red-brick church with grey stone buttresses and green copper
// roofs; the bell tower with its clock, belfry and octagonal spire in front,
// the nave and two aisles, a transept, and the round apse at the back with
// its tall windows over a lower ring. Built at 50% of the real church
// (sizes: src/data/myeongdong.js). Its front (the bell tower) faces +z.
// Loaded with import() when the city is built (core/landmarks.js), so it is
// not in the first download. Visual only: collision comes from the map's
// buildings.
import * as THREE from 'three';
import { addBox } from './three-kit.js';
import { mergeStatic } from './bukchon-models.js';
import { CATHEDRAL as K } from '../data/myeongdong.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const box = (g, sx, sy, sz, x, y, z, c, ry = 0) => { const m = addBox(g, mat, sx, sy, sz, x, y, z, c); m.rotation.y = ry; return m; };
const C = {
  brick: '#b45a40', brickDark: '#9a4a35', stone: '#8f8c85', stoneLight: '#aaa69d', copper: '#7aa88f', copperDark: '#5e8c76',
  glass: '#2f3a52', door: '#3b2b24', clock: '#f1eee6', gold: '#c9a640',
};

// A prism from a closed outline in the x/z plane ([[x, z], …]), from y0 up h.
function prism(g, pts, y0, h, c) {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0, 0);
  g.add(new THREE.Mesh(geo, mat(c)));
}
// A roof from triangles given as [x, y, z] corners.
function tris(g, list, c) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(list.flat(2), 3));
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: c, flatShading: true, side: THREE.DoubleSide })));
}
// A pitched roof along z from z0 to z1: eaves at ±hw (height y0), ridge at
// x = 0 (height y1), closed gable ends.
function gable(g, hw, y0, y1, z0, z1, c, wall) {
  const a = [-hw, y0], b = [hw, y0], r = [0, y1];
  tris(g, [
    [[a[0], a[1], z0], [r[0], r[1], z0], [r[0], r[1], z1]], [[a[0], a[1], z0], [r[0], r[1], z1], [a[0], a[1], z1]],
    [[b[0], b[1], z0], [b[0], b[1], z1], [r[0], r[1], z1]], [[b[0], b[1], z0], [r[0], r[1], z1], [r[0], r[1], z0]],
  ], c);
  if (wall) for (const z of [z0, z1]) tris(g, [[[a[0] + 0.15, a[1], z], [b[0] - 0.15, b[1], z], [0, y1 - 0.1, z]]], wall);
}
// A lean-to roof over an aisle: from the outer wall (x = xo, height yo) up
// to the nave wall (x = xi, height yi), along z.
function leanTo(g, xo, yo, xi, yi, z0, z1, c) {
  tris(g, [[[xo, yo, z0], [xi, yi, z0], [xi, yi, z1]], [[xo, yo, z0], [xi, yi, z1], [xo, yo, z1]]], c);
}
// A pointed (lancet) window on a wall facing ±z, or ±x when face is 'x': a
// dark pane with a pointed top and a stone sill.
function lancet(g, x, y, z, w, h, face) {
  const ry = face === 'x' ? Math.PI / 2 : 0;
  box(g, w, h, 0.12, x, y + h / 2, z, C.glass, ry);
  const tip = box(g, w * 0.71, w * 0.71, 0.12, x, y + h, z, C.glass, ry);
  if (face === 'x') tip.rotation.set(0, Math.PI / 2, Math.PI / 4, 'YXZ'); else tip.rotation.z = Math.PI / 4;
  box(g, w + 0.2, 0.12, 0.2, x, y - 0.06, z, C.stoneLight, ry);
}
// A round (rose) window: a dark disc with a stone ring.
function rose(g, x, y, z, r, face) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.14, 12), mat(C.glass));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 4, 12), mat(C.stoneLight));
  for (const m of [disc, ring]) {
    m.position.set(x, y, z);
    if (face === 'x') { if (m === disc) m.rotation.z = Math.PI / 2; else m.rotation.y = Math.PI / 2; } else if (m === disc) m.rotation.x = Math.PI / 2;
    g.add(m);
  }
}
const cone = (g, r, h, x, y, z, c, seg = 8) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(c)); m.position.set(x, y + h / 2, z); g.add(m); return m; };
const cyl = (g, r, h, x, y, z, c, seg = 8) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(c)); m.position.set(x, y + h / 2, z); g.add(m); return m; };

export function buildCathedral(g) {
  const L2 = K.length / 2, HW = K.width / 2, NW = K.nave / 2;
  const front = L2 - K.tower.d, back = -L2 + K.apse; // the nave's front wall; where the apse starts
  const T = K.transept, TW = HW + T.out, A = K.aisleEave, E = K.eave, RG = K.ridge;
  // The low stone base under everything.
  box(g, K.width + 1, 0.5, front - back + 0.6, 0, 0.25, (front + back) / 2, C.stone);
  // Aisles and nave.
  box(g, K.width, A, front - back, 0, A / 2, (front + back) / 2, C.brick);
  box(g, K.nave, E, front - back, 0, E / 2, (front + back) / 2, C.brick);
  box(g, K.width + 0.1, 0.25, front - back + 0.1, 0, A - 0.12, (front + back) / 2, C.stone); // string course
  for (const sx of [-1, 1]) leanTo(g, sx * (HW + 0.3), A, sx * NW, A + 1.8, back, front, C.copper);
  gable(g, NW + 0.35, E, RG, back - 0.2, front + 0.1, C.copper, C.brick);
  // The transept: a cross wing to full height with its own gable ends.
  box(g, TW * 2, E, T.a1 - T.a0, 0, E / 2, (T.a0 + T.a1) / 2, C.brick);
  const tg = new THREE.Group();
  gable(tg, (T.a1 - T.a0) / 2 + 0.3, E, RG, -TW - 0.1, TW + 0.1, C.copper, C.brick);
  tg.rotation.y = Math.PI / 2;
  tg.position.z = (T.a0 + T.a1) / 2;
  g.add(tg);
  for (const sx of [-1, 1]) {
    rose(g, sx * (TW + 0.08), E + 0.9, (T.a0 + T.a1) / 2, 0.75, 'x'); // the gable's rose window
    lancet(g, sx * (TW + 0.08), 2.2, (T.a0 + T.a1) / 2, 1.5, 3.6, 'x'); // and the big window under it
    for (const z of [T.a0, T.a1]) box(g, 0.7, E + 0.6, 0.7, sx * (TW - 0.1), (E + 0.6) / 2, z, C.stone); // corner buttresses
  }
  // The apse: a low ring round the back (the ambulatory) and the tall
  // many-sided east end above it, with tall windows.
  const ring = (rx, rz, n = 10) => { const p = []; for (let i = 0; i <= n / 2; i++) { const t = (i / (n / 2)) * Math.PI; p.push([Math.cos(t) * rx, back - Math.sin(t) * rz]); } return p; };
  const lower = ring(HW, K.apse), upper = ring(NW + 0.4, K.apse * 0.62);
  prism(g, lower, 0, A, C.brick);
  prism(g, upper, A, E + 1.2 - A, C.brick);
  // the lower ring's roof: from its wall up to the upper apse
  const roofT = [];
  for (let i = 1; i < lower.length; i++) {
    const [a, b] = [lower[i - 1], lower[i]], [c, d] = [upper[i - 1], upper[i]];
    roofT.push([[a[0], A, a[1]], [b[0], A, b[1]], [d[0], A + 1.8, d[1]]], [[a[0], A, a[1]], [d[0], A + 1.8, d[1]], [c[0], A + 1.8, c[1]]]);
  }
  tris(g, roofT, C.copper);
  // the upper apse's roof: a half cone up to the ridge
  const top = [];
  for (let i = 1; i < upper.length; i++) top.push([[upper[i - 1][0], E + 1.2, upper[i - 1][1]], [upper[i][0], E + 1.2, upper[i][1]], [0, RG, back]]);
  tris(g, top, C.copper);
  for (let i = 0; i < upper.length; i++) {
    const [x, z] = upper[i];
    // buttresses at the upper apse's corners, windows between them
    box(g, 0.45, E + 1.6, 0.45, x, (E + 1.6) / 2, z, C.stone);
    if (i) {
      const [px, pz] = upper[i - 1], mx = (x + px) / 2, mz = (z + pz) / 2, a = Math.atan2(mx, mz - back);
      const w = new THREE.Group();
      lancet(w, 0, 0, 0, 0.8, 2.8);
      w.position.set(mx + Math.sin(a) * 0.1, A + 1.9, mz + Math.cos(a) * 0.1);
      w.rotation.y = a;
      g.add(w);
    }
    if (i < lower.length) {
      const [lx, lz] = lower[i];
      box(g, 0.5, A + 0.4, 0.5, lx, (A + 0.4) / 2, lz, C.stone);
      if (i) {
        const [px, pz] = lower[i - 1], mx = (lx + px) / 2, mz = (lz + pz) / 2, a = Math.atan2(mx, mz - back);
        const w = new THREE.Group();
        lancet(w, 0, 0, 0, 0.8, 1.6);
        w.position.set(mx + Math.sin(a) * 0.1, 1.3, mz + Math.cos(a) * 0.1);
        w.rotation.y = a;
        g.add(w);
      }
    }
  }
  // Along both sides: buttresses between the bays, a pointed window in each
  // aisle bay, small rose windows under them, and windows in the nave wall
  // (the clerestory) above the aisle roofs.
  const bays = [];
  for (let z = front - 1.6; z > back + 1; z -= 3.4) if (z < T.a0 - 0.6 || z > T.a1 + 0.6) bays.push(z);
  for (const sx of [-1, 1]) {
    for (const z of bays) {
      lancet(g, sx * (HW + 0.07), 1.7, z, 0.9, 1.9, 'x');
      rose(g, sx * (HW + 0.07), 0.95, z, 0.3, 'x');
      lancet(g, sx * (NW + 0.07), A + 2, z, 0.75, 1.6, 'x');
    }
    for (let z = front; z > back - 0.1; z -= 3.4) {
      if (z < T.a1 + 0.4 && z > T.a0 - 0.4) continue;
      box(g, 0.55, A + 0.5, 0.6, sx * (HW + 0.2), (A + 0.5) / 2, z - 0.3, C.stone);
      box(g, 0.4, E - A + 0.4, 0.45, sx * (NW + 0.15), A + (E - A + 0.4) / 2, z - 0.3, C.stone);
    }
  }
  // The front: stone piers at the corners of the nave and aisles, side doors
  // into the aisles, the aisles' sloping copings, and the turrets either
  // side of the tower with green caps.
  for (const sx of [-1, 1]) {
    box(g, 0.6, A + 0.8, 0.6, sx * (HW - 0.1), (A + 0.8) / 2, front + 0.1, C.stone);
    cone(g, 0.45, 1.3, sx * (HW - 0.1), A + 0.8, front + 0.1, C.copperDark);
    cyl(g, 0.75, 7.6, sx * (NW + 0.3), 0, front + 0.2, C.stone);
    cone(g, 0.9, 2.6, sx * (NW + 0.3), 7.6, front + 0.2, C.copperDark);
    box(g, 1.3, 2.2, 0.15, sx * (HW / 2 + NW / 2 + 0.3), 1.6, front + 0.08, C.door);
    const coping = box(g, Math.hypot(HW - NW, 1.8) + 0.3, 0.2, 0.4, sx * (HW + NW) / 2, A + 0.9, front + 0.1, C.stoneLight);
    coping.rotation.z = -sx * Math.atan2(1.8, HW - NW);
    lancet(g, sx * (HW / 2 + NW / 2 + 0.3), 3.1, front + 0.08, 0.8, 1.1);
  }
  // The nave's front gable behind the tower: brick, edged in stone.
  for (const sx of [-1, 1]) {
    const e = box(g, Math.hypot(NW, RG - E) + 0.4, 0.25, 0.5, sx * NW / 2, (E + RG) / 2, front + 0.1, C.stoneLight);
    e.rotation.z = -sx * Math.atan2(RG - E, NW);
  }
  // The bell tower: brick with stone corners, the pointed main door at its
  // foot, a tall window, the clock, two belfry openings on each side, a
  // parapet with four pinnacles, and the octagonal copper spire and cross.
  const TW2 = K.tower.w / 2, tz0 = front - K.tower.w + K.tower.d, tz = (tz0 + L2) / 2, TB = K.tower.body;
  box(g, K.tower.w, TB, L2 - tz0, 0, TB / 2, tz, C.brick);
  for (const sx of [-1, 1]) for (const z of [tz0, L2]) box(g, 0.6, TB + 0.3, 0.6, sx * (TW2 - 0.1), (TB + 0.3) / 2, z - Math.sign(z - tz) * 0.1, C.stone);
  // main door: a stone gablet over a pointed arch
  box(g, 2.2, 3.4, 0.3, 0, 1.7, L2 + 0.1, C.stoneLight);
  box(g, 1.5, 2.6, 0.2, 0, 1.3, L2 + 0.22, C.door);
  const dt = box(g, 1.06, 1.06, 0.2, 0, 2.6, L2 + 0.22, C.door); dt.rotation.z = Math.PI / 4;
  for (const sx of [-1, 1]) { const gb = box(g, 1.9, 0.22, 0.34, sx * 0.62, 4.0, L2 + 0.14, C.stoneLight); gb.rotation.z = -sx * 0.7; }
  lancet(g, 0, 5.2, L2 + 0.07, 1.1, 2.6);
  // the clock (one face on each side)
  for (const [x, z, ry] of [[0, L2 + 0.07, 0], [0, tz0 - 0.07, Math.PI], [TW2 + 0.07, tz, Math.PI / 2], [-TW2 - 0.07, tz, -Math.PI / 2]]) {
    const f = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16), mat(C.clock));
    face.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.07, 4, 16), mat(C.stone));
    f.add(face, rim);
    box(f, 0.06, 0.5, 0.06, 0, 0.2, 0.07, C.door); // the hands
    box(f, 0.4, 0.06, 0.06, 0.15, 0, 0.07, C.door);
    f.position.set(x, 9.2, z);
    f.rotation.y = ry;
    g.add(f);
  }
  // belfry openings
  for (const [x, z, face] of [[0, L2 + 0.07], [0, tz0 - 0.07], [TW2 + 0.07, tz, 'x'], [-TW2 - 0.07, tz, 'x']]) {
    for (const k of [-1, 1]) {
      if (face === 'x') lancet(g, x, 10.4, z + k * 0.75, 0.6, 2.4, 'x');
      else lancet(g, x + k * 0.75, 10.4, z, 0.6, 2.4);
    }
  }
  box(g, K.tower.w + 0.4, 0.4, L2 - tz0 + 0.4, 0, TB + 0.2, tz, C.stoneLight); // parapet
  for (const sx of [-1, 1]) for (const z of [tz0, L2]) {
    cyl(g, 0.3, 1.2, sx * (TW2 - 0.1), TB + 0.4, z - Math.sign(z - tz) * 0.1, C.stone);
    cone(g, 0.36, 2.2, sx * (TW2 - 0.1), TB + 1.6, z - Math.sign(z - tz) * 0.1, C.copperDark);
  }
  // the spire: a short octagonal drum with small gables, then the cone
  cyl(g, 1.75, 1.4, 0, TB + 0.4, tz, C.stone, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2, gx = Math.sin(a) * 1.7, gz = Math.cos(a) * 1.7;
    const lu = box(g, 0.9, 0.9, 0.2, gx, TB + 1.9, tz + gz, C.copperDark); lu.rotation.set(0, a, Math.PI / 4, 'YXZ');
  }
  const spireH = K.tower.top - 1.15 - (TB + 1.8);
  cone(g, 1.8, spireH, 0, TB + 1.8, tz, C.copper, 8);
  // the cross
  const cy = K.tower.top - 1.15;
  box(g, 0.1, 1.15, 0.1, 0, cy + 0.575, tz, C.door);
  box(g, 0.6, 0.1, 0.1, 0, cy + 0.8, tz, C.door);
  mergeStatic(g);
}
