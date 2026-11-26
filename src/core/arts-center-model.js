// Seoul Arts Center (map landmark "artscenter", districts/arts-center.json,
// scripts/build-arts-center.mjs): what you see from the street.
//
//   The Opera House: a round hall of cream stone under a 갓 (the Korean
//     horsehair hat): a ring of columns before dark glass, a wide low brim
//     of grey-green copper, a second drum, and the hat's tall crown in dark
//     bronze on top. A sloping glass skirt runs round its foot; the stage
//     house stands behind it. Its door faces the lawn.
//   The Music Hall: the folding fan, cream walls with a band of glass and a
//     copper roof, a smaller rose-grey top.
//   Hangaram Art Museum, Hangaram Design Museum, the Calligraphy Museum
//     and the practice hall: plain cream blocks with a glass band.
//   The World Music Fountain: its rim and a row of jets that rise and fall.
//   Conifers along the hill side and round the lawn (evergreen: the city's
//     cone trees do not turn in autumn).
//
// The whole place is 50% of the real one. Loaded with import() when the city
// is built (core/landmarks.js), so it is not in the first download. Visual
// only: collision comes from the map's buildings. About 9k triangles, 9 draw
// calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex } from './three-kit.js';

export const C = {
  stone: '#e9e1cf', stoneDark: '#cfc5ae', glass: '#2b3a4c', skirt: '#8fa3ad', copper: '#8a9a8c', copperDark: '#6f8172',
  bronze: '#4a4038', bronzeLight: '#6a5a4a', rose: '#cdb0a6', door: '#2a2420', rim: '#d8d2c6', jet: '#eaf6ff', trunk: '#6b4a32', leaf: '#3f6f4a', leafDark: '#345f40',
};

// Collects plain coloured geometry and merges it per colour.
class Parts {
  constructor() { this.m = new Map(); }
  add(geo, color, x = 0, y = 0, z = 0, ry = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!this.m.has(color)) this.m.set(color, []);
    this.m.get(color).push(g);
  }
  // A drum (or a cone's slice) standing on y0.
  drum(r0, r1, y0, y1, color, x = 0, z = 0, seg = 40, open = false) { this.add(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, open), color, x, (y0 + y1) / 2, z); }
  box(w, h, d, x, y, z, color, ry = 0) { this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, ry); }
  // A prism from an outline in the x/z plane, from y0 up to y1.
  prism(pts, y0, y1, color) {
    const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    this.add(geo, color, 0, y0, 0);
  }
  flush(parent) {
    for (const [color, geos] of this.m) parent.add(new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ color, flatShading: true })));
    this.m.clear();
  }
}

const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
// An outline moved in or out from its middle: k times its size, then m metres.
const scaled = (p, k, m = 0) => { const [cx, cz] = centroid(p); return p.map(([x, z]) => { const d = Math.hypot(x - cx, z - cz) || 1, n = d * k + m; return [cx + ((x - cx) / d) * n, cz + ((z - cz) / d) * n]; }); };

// The Opera House's shape, as parts of its radius R and heights between the
// ground, the brim (eave) and the hat's tip (top). Exported for the tests.
export function operaShape({ r: R, eave, top }) {
  const upper = eave + (top - eave) * 0.3, crown0 = eave + (top - eave) * 0.42, crown1 = top - 0.7;
  return {
    foot: { r: R * 0.86, y1: eave * 0.36 }, // the stone foot
    skirt: { r0: R * 0.995, r1: R * 0.86, y0: eave * 0.16, y1: eave * 0.36 }, // the glass skirt
    glass: { r: R * 0.78, y0: eave * 0.36, y1: eave * 0.94 }, // the glass wall behind the columns
    columns: { n: 36, at: R * 0.9, r: 0.42, y0: eave * 0.36, y1: eave * 0.94 },
    brim: { r0: R * 1.03, r1: R * 0.6, y0: eave * 0.94, y1: eave * 1.12 }, // the hat's wide brim
    drum: { r: R * 0.57, y0: eave * 1.08, y1: upper }, // the second storey
    roof: { r0: R * 0.63, r1: R * 0.29, y0: upper, y1: crown0 },
    crownFoot: { r: R * 0.27, y0: crown0 - 0.2, y1: crown0 + (crown1 - crown0) * 0.3 },
    crown: { r0: R * 0.25, r1: R * 0.14, y0: crown0 + (crown1 - crown0) * 0.3, y1: crown1 }, // the hat's crown
    cap: { r: R * 0.15, y0: crown1, y1: top },
  };
}

function nameBoard(ko, en, w = 8) {
  const tex = canvasTex(512, 96, (g) => {
    g.fillStyle = '#efe8d8'; g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#231d18'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 54px sans-serif'; g.fillText(ko, 256, 38);
    g.font = 'bold 20px sans-serif'; g.fillText(en, 256, 80);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), new THREE.MeshBasicMaterial({ map: tex }));
}

// g: the landmark's group (at the district's origin). Returns a tick(t) for
// the fountain's jets.
export function buildArtsCenter(g, l) {
  const P = new Parts();

  // --- The Opera House ---------------------------------------------------------
  const O = l.opera, [ox, oz] = O.at, S = operaShape(O);
  P.drum(S.foot.r, S.foot.r, 0, S.foot.y1, C.stone, ox, oz);
  P.drum(S.skirt.r0, S.skirt.r1, S.skirt.y0, S.skirt.y1, C.skirt, ox, oz, 40, true);
  P.drum(S.skirt.r0, S.skirt.r0, 0, S.skirt.y0, C.stoneDark, ox, oz, 40, true); // the low wall the skirt sits on
  P.drum(S.glass.r, S.glass.r, S.glass.y0, S.glass.y1, C.glass, ox, oz, 40, true);
  for (let i = 0; i < S.columns.n; i++) {
    const a = ((i + 0.5) / S.columns.n) * Math.PI * 2;
    P.add(new THREE.CylinderGeometry(S.columns.r, S.columns.r, S.columns.y1 - S.columns.y0, 8), C.stone, ox + Math.cos(a) * S.columns.at, (S.columns.y0 + S.columns.y1) / 2, oz + Math.sin(a) * S.columns.at);
  }
  P.drum(S.columns.at + 0.7, S.columns.at + 0.7, S.columns.y0 - 0.25, S.columns.y0, C.stoneDark, ox, oz); // the terrace the columns stand on
  P.drum(S.brim.r0, S.brim.r0, S.brim.y0 - 0.45, S.brim.y0, C.copperDark, ox, oz); // the brim's edge
  P.drum(S.brim.r0, S.brim.r1, S.brim.y0, S.brim.y1, C.copper, ox, oz);
  P.drum(S.drum.r, S.drum.r, S.drum.y0, S.drum.y1, C.stone, ox, oz);
  P.drum(S.drum.r + 0.08, S.drum.r + 0.08, S.drum.y0 + (S.drum.y1 - S.drum.y0) * 0.3, S.drum.y0 + (S.drum.y1 - S.drum.y0) * 0.72, C.glass, ox, oz, 40, true); // its band of windows
  P.drum(S.roof.r0, S.roof.r1, S.roof.y0, S.roof.y1, C.copper, ox, oz);
  P.drum(S.crownFoot.r, S.crownFoot.r, S.crownFoot.y0, S.crownFoot.y1, C.stone, ox, oz, 28);
  P.drum(S.crownFoot.r + 0.1, S.crownFoot.r + 0.1, S.crownFoot.y1 - 0.5, S.crownFoot.y1, C.bronzeLight, ox, oz, 28);
  P.drum(S.crown.r0, S.crown.r1, S.crown.y0, S.crown.y1, C.bronze, ox, oz, 28);
  P.drum(S.cap.r, S.cap.r * 0.92, S.cap.y0, S.cap.y1, C.bronzeLight, ox, oz, 28);
  // The stage house behind it.
  P.prism(O.back, 0, O.backH, C.stone);
  P.prism(scaled(O.back, 1, 0.25), O.backH - 0.9, O.backH - 0.3, C.stoneDark);
  // The door (towards the lawn): a porch through the skirt, glass doors, three steps.
  const f = O.face, fx = Math.sin(f), fz = Math.cos(f), at = (d, s = 0) => [ox + fx * d + fz * s, oz + fz * d - fx * s];
  { const [x, z] = at(S.skirt.r0 - 1.2); P.box(9, 3.3, 3.4, x, 1.65, z, C.stone, f); }
  { const [x, z] = at(S.skirt.r0 + 0.56); P.box(7.2, 2.5, 0.1, x, 1.3, z, C.door, f); }
  { const [x, z] = at(S.skirt.r0 + 0.3); P.box(9.6, 0.3, 4.2, x, 3.45, z, C.copperDark, f); }
  for (const s of [-2.4, 0, 2.4]) { const [x, z] = at(S.skirt.r0 + 0.63, s); P.box(0.12, 2.5, 0.06, x, 1.3, z, C.stone, f); } // the door frames
  const board = nameBoard('오페라하우스', 'OPERA HOUSE', 6.4);
  { const [x, z] = at(S.skirt.r0 + 2.3); board.position.set(x, 3.6 + 0.6, z); board.rotation.y = f; } // (standing on the porch roof's front edge: under it the roof hid half the name)
  { const [x, z] = at(S.skirt.r0 + 2.24); P.box(6.5, 1.24, 0.1, x, 3.6 + 0.6, z, C.stoneDark, f); } // its back

  // --- The Music Hall ------------------------------------------------------------
  const M = l.music;
  P.prism(M.p, 0, M.wall, C.stone);
  P.prism(scaled(M.p, 1, 0.14), M.wall * 0.32, M.wall * 0.72, C.glass);
  P.prism(scaled(M.p, 1, 1.3), M.wall, M.wall + 0.7, C.copper); // the fan's roof, a little over the walls
  P.prism(scaled(M.p, 0.62), M.wall + 0.7, M.top - 0.5, C.rose);
  P.prism(scaled(M.p, 0.62, 0.6), M.top - 0.5, M.top, C.copperDark);
  const mf = M.face, mx = Math.sin(mf), mz = Math.cos(mf);
  P.box(6.4, 2.6, 0.5, M.door[0] - mx * 1.5, 1.3, M.door[1] - mz * 1.5, C.door, mf);
  P.box(8, 0.3, 2.6, M.door[0] - mx * 0.7, 2.9, M.door[1] - mz * 0.7, C.copperDark, mf);
  for (const w of [-1.6, 0, 1.6]) P.box(0.12, 2.6, 0.06, M.door[0] - mx * 1.22 + mz * w, 1.3, M.door[1] - mz * 1.22 - mx * w, C.stone, mf); // the door frames
  const board2 = nameBoard('음악당', 'MUSIC HALL', 5.2);
  board2.position.set(M.door[0] + mx * 0.55, 3.05 + 0.5, M.door[1] + mz * 0.55); // (on the porch roof's front edge)
  P.box(5.3, 1.02, 0.1, M.door[0] + mx * 0.49, 3.05 + 0.5, M.door[1] + mz * 0.49, C.stoneDark, mf);
  board2.rotation.y = mf;

  // --- The museums and the practice hall --------------------------------------------
  for (const h of l.halls) {
    P.prism(h.p, 0, h.h, C.stone);
    P.prism(scaled(h.p, 1, 0.12), h.h * 0.3, h.h * 0.62, C.glass);
    P.prism(scaled(h.p, 1, 0.3), h.h, h.h + 0.35, C.stoneDark);
  }

  // --- The fountain: a stone rim, and jets along its middle ----------------------------
  const F = l.fountain, [fcx, fcz] = centroid(F);
  for (let i = 0; i < F.length; i++) {
    const a = F[i], b = F[(i + 1) % F.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    P.box(len + 0.5, 0.4, 0.5, (a[0] + b[0]) / 2, 0.2, (a[1] + b[1]) / 2, C.rim, -Math.atan2(b[1] - a[1], b[0] - a[0]));
  }
  // (its long side: the longest edge)
  let long = [1, 0], ll = 0;
  for (let i = 0; i < F.length; i++) { const a = F[i], b = F[(i + 1) % F.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len > ll) { ll = len; long = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]; } }
  const JETS = 9, jetGeo = new THREE.CylinderGeometry(0.07, 0.12, 1, 6).translate(0, 0.5, 0);
  const jets = new THREE.InstancedMesh(jetGeo, new THREE.MeshBasicMaterial({ color: C.jet, transparent: true, opacity: 0.75 }), JETS);
  jets.userData.noShadow = true;
  const jetAt = Array.from({ length: JETS }, (_, i) => { const s = ((i + 0.5) / JETS - 0.5) * ll * 0.82; return [fcx + long[0] * s, fcz + long[1] * s]; });
  const dummy = new THREE.Object3D();
  const setJets = (t) => {
    for (let i = 0; i < JETS; i++) {
      // a wave running along the row, and all of them up together now and then
      const h = 1.2 + 1.5 * (0.5 + 0.5 * Math.sin(t * 1.6 - i * 0.7)) + 1.6 * Math.max(0, Math.sin(t * 0.35)) ** 4;
      dummy.position.set(jetAt[i][0], 0.1, jetAt[i][1]);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      jets.setMatrixAt(i, dummy.matrix);
    }
    jets.instanceMatrix.needsUpdate = true;
  };
  setJets(0);

  // --- Trees: conifers ----------------------------------------------------------------------
  const T = l.trees || [];
  if (T.length) {
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 6).translate(0, 0.6, 0), new THREE.MeshLambertMaterial({ color: C.trunk }), T.length);
    const cone = mergeGeometries([new THREE.ConeGeometry(1.5, 2.6, 8).translate(0, 2.3, 0), new THREE.ConeGeometry(1.15, 2.2, 8).translate(0, 3.7, 0), new THREE.ConeGeometry(0.75, 1.8, 8).translate(0, 4.9, 0)]);
    const leaves = new THREE.InstancedMesh(cone, new THREE.MeshLambertMaterial({ color: C.leaf, flatShading: true }), T.length);
    T.forEach(([x, z], i) => {
      const k = 0.85 + ((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1 + 1) % 1 * 0.5;
      // (map rule 13, Yozi 2026-11-26: real height / 4 like the halls, real 10 to
      // 16 m, 2.5 to 3.9 m here; were 4.9 to 7.8 m. Sideways a little fuller.)
      dummy.position.set(x, 0, z); dummy.scale.set(k * 0.5 ** 0.6, k * 0.5, k * 0.5 ** 0.6); dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix); leaves.setMatrixAt(i, dummy.matrix);
    });
    g.add(trunk, leaves);
  }

  P.flush(g);
  g.add(board, board2, jets);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
  return setJets;
}
