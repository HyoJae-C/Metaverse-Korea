// Cheong Wa Dae (청와대), seen from the street (map "landmarks" in
// districts/gyeongbokgung.json, laid out by scripts/build-cheongwadae.mjs):
//   bluehouse   the main hall (본관): the ground floor on its real outline,
//               the upper hall under the big hipped-and-gabled roof of blue
//               tiles, the two wings' blue roofs, the entrance porch. 50%
//               across, heights half the real ones (the numbers come from
//               OSM's building parts). Front: local +z.
//   bluegate    the main gate (정문), shut: granite piers with blue-tiled caps
//               and black iron leaves. l.w its opening. Front: local +z.
//   bhfence     the grounds' fence: a low granite wall with black railings
//               you see through (l.line, in the district's metres).
//   bhfountain  the fountain at the Hyoja-dong junction: a round basin, a
//               column with the phoenix on top, jets (l.r its basin).
// Loaded when the city is built (core/landmarks.js). Visual only:
// collision comes from the map's blockers.
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';
import { tiles } from './palace-model.js';
import { mergeStatic } from './bukchon-models.js';

const mat = matCache({ flatShading: true });
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const C = {
  wall: '#efece4', wallShade: '#dedad0', granite: '#cfcac0', graniteDark: '#a9a49a', column: '#f5f2ea',
  window: '#4a5a66', door: '#7a5a3c', beam: '#5f8fa6', iron: '#23272b', gold: '#c9a54a', water: '#6fb3d8', bronze: '#7c6a3c',
};
const BLUE = (c) => ({ color: new THREE.Color(c || '#398ea8'), end: new THREE.Color(c || '#398ea8').multiplyScalar(0.7) });

export function buildBlueHouse(g, l) {
  const blue = BLUE(l.colour);
  // The ground floor on its outline, on a granite plinth.
  const shape = new THREE.Shape(l.outline.map(([u, v]) => new THREE.Vector2(u, -v)));
  const plinth = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false }), mat(C.granite));
  plinth.rotation.x = -Math.PI / 2;
  g.add(plinth);
  const floor = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: l.base - 0.5, bevelEnabled: false }), mat(C.wall));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.5;
  g.add(floor);
  const vs = l.outline.map((p) => p[1]), front = Math.max(...vs);
  // The upper hall: white walls, tall windows between pilasters, the painted band under the eaves.
  const [u, v, w, d, y0, y1] = l.upper;
  box(g, w, y1 - y0, d, u, y0 + (y1 - y0) / 2, v, C.wall);
  const n = Math.max(5, Math.round(w / 2.6));
  for (let i = 0; i <= n; i++) {
    const x = u - w / 2 + (i * w) / n;
    box(g, 0.45, y1 - y0, 0.3, x, y0 + (y1 - y0) / 2, v + d / 2 + 0.1, C.column);
    if (i < n) box(g, (w / n) * 0.5, (y1 - y0) * 0.6, 0.1, x + w / n / 2, y0 + (y1 - y0) * 0.45, v + d / 2 + 0.08, C.window);
  }
  box(g, w + 0.6, 0.45, d + 0.6, u, y1 - 0.2, v, C.beam);
  // Its roof: blue tiles, hipped-and-gabled (팔작).
  {
    const [ru, rv, rw, rd, ry0, ry1] = l.roof;
    tiles(g, rw + 1.6, rd + 1.6, ry1 - ry0, ry0, { ...blue, hip: true, lift: 0.7 }, ru, rv);
  }
  // The wings: ground floor already drawn; each gets its own blue roof on a white storey.
  for (const [wu, wv, ww, wd, wy0, wy1] of l.wings) {
    const top = wy0 + (wy1 - wy0) * 0.45;
    box(g, ww - 0.4, top - wy0, wd - 0.4, wu, wy0 + (top - wy0) / 2, wv, C.wallShade);
    for (let k = -1; k <= 1; k++) box(g, ww * 0.18, (top - wy0) * 0.55, 0.1, wu + k * ww * 0.28, wy0 + (top - wy0) * 0.5, wv + wd / 2 - 0.15, C.window);
    tiles(g, ww + 1.2, wd + 1.2, wy1 - top, top, { ...blue, hip: true, lift: 0.5 }, wu, wv);
  }
  // The ground floor's front: windows, and the entrance with its porch on white columns.
  {
    const xs = l.outline.filter((p) => p[1] > front - 1.5).map((p) => p[0]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    for (let x = x0 + 1.5; x < x1 - 1; x += 2.2) box(g, 1.1, l.base * 0.45, 0.1, x, l.base * 0.48, front + 0.06, C.window);
    const [pu, pv, pw, pd, py0, py1] = l.porch;
    const pz = Math.max(pv + pd / 2, front) + 1.2;
    box(g, pw + 0.8, 0.35, pz - pv + pd / 2 + 0.4, pu, 0.17, (pv - pd / 2 + pz) / 2, C.granite); // its step
    for (const k of [-1.5, -0.5, 0.5, 1.5]) box(g, 0.55, py0 + 0.6, 0.55, pu + (k * pw) / 3.2, (py0 + 0.6) / 2, pz - 0.2, C.column);
    box(g, pw + 0.6, 0.35, pz - pv + pd / 2, pu, py0 + 0.6, (pv - pd / 2 + pz) / 2, C.beam);
    tiles(g, pw + 1.4, pz - pv + pd / 2 + 0.8, py1 - py0, py0 + 0.75, { ...blue, hip: false, lift: 0.3 }, pu, (pv - pd / 2 + pz) / 2, Math.PI / 2);
    box(g, pw * 0.5, py0 * 0.8, 0.12, pu, py0 * 0.4 + 0.35, front + 0.08, C.door);
    // the steps down to the forecourt
    for (let i = 0; i < 4; i++) box(g, pw + 2 - i * 0.2, 0.15, 0.5, pu, 0.08 + i * 0.12, pz + 1.8 - i * 0.45, C.granite);
  }
  mergeStatic(g);
}

export function buildBlueGate(g, l) {
  const up = l.up || 0.5, hw = l.w / 2, H = 7 * up; // the piers: about 7 m real
  const blue = BLUE();
  for (const s of [-1, 1]) {
    const x = s * (hw + 0.8);
    box(g, 1.6, H, 1.6, x, H / 2, 0, C.granite);
    box(g, 1.9, 0.3, 1.9, x, 0.15, 0, C.graniteDark);
    box(g, 1.9, 0.25, 1.9, x, H + 0.12, 0, C.graniteDark);
    tiles(g, 2.6, 2.6, 0.9, H + 0.25, { ...blue, hip: true, lift: 0.25, seg: 3 }, x, 0);
    // the low walls running back to the fence either side
    box(g, 2.4, 1.2, 0.8, x + s * 1.9, 0.6, 0, C.granite);
  }
  // The iron leaves, shut: bars between two rails, a gold boss in each.
  const gh = H * 0.62;
  for (const y of [0.25, gh - 0.1, gh * 0.55]) box(g, l.w, 0.12, 0.12, 0, y, 0, C.iron);
  for (let x = -hw + 0.18; x < hw; x += 0.32) box(g, 0.05, gh, 0.05, x, gh / 2, 0, C.iron);
  box(g, 0.14, gh + 0.2, 0.2, 0, (gh + 0.2) / 2, 0, C.iron); // where the leaves meet
  for (const s of [-1, 1]) {
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16), mat(C.gold));
    boss.rotation.x = Math.PI / 2;
    boss.position.set(s * hw * 0.5, gh * 0.55, 0.1);
    g.add(boss);
  }
  mergeStatic(g);
}

export function buildFence(g, l) {
  const P = l.line;
  const postGeo = new THREE.BoxGeometry(0.06, 1.2, 0.06);
  const spots = [];
  for (let i = 1; i < P.length; i++) {
    const [ax, az] = P[i - 1], [bx, bz] = P[i], L = Math.hypot(bx - ax, bz - az);
    if (L < 0.05) continue;
    const seg = new THREE.Group();
    box(seg, L + 0.5, 0.6, 0.55, 0, 0.3, 0, C.granite); // the stone base
    box(seg, L + 0.55, 0.08, 0.6, 0, 0.64, 0, C.graniteDark);
    box(seg, L, 0.06, 0.08, 0, 1.78, 0, C.iron); // the top rail
    seg.position.set((ax + bx) / 2, 0, (az + bz) / 2);
    seg.rotation.y = -Math.atan2(bz - az, bx - ax);
    g.add(seg);
    const n = Math.max(1, Math.round(L / 0.22));
    for (let k = 0; k < n; k++) spots.push([ax + ((bx - ax) * (k + 0.5)) / n, az + ((bz - az) * (k + 0.5)) / n]);
    const m = Math.max(1, Math.round(L / 4)); // stone pillars every ~4 m
    for (let k = 0; k <= m; k++) box(g, 0.5, 1.95, 0.5, ax + ((bx - ax) * k) / m, 0.98, az + ((bz - az) * k) / m, C.granite);
  }
  mergeStatic(g);
  // the railings' bars: one instanced mesh
  const bars = new THREE.InstancedMesh(postGeo, mat(C.iron), spots.length);
  const M = new THREE.Matrix4();
  spots.forEach(([x, z], i) => bars.setMatrixAt(i, M.makeTranslation(x, 1.2, z)));
  bars.userData.noShadow = true;
  g.add(bars);
}

export function buildFountain(g, l) {
  const r = l.r;
  const ring = (r0, r1, h, y, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 28), mat(c)); m.position.y = y + h / 2; g.add(m); return m; };
  ring(r + 0.35, r + 0.35, 0.55, 0, C.granite); // the basin's rim
  ring(r + 0.5, r + 0.5, 0.12, 0, C.graniteDark);
  ring(r, r, 0.05, 0.45, C.water); // the water
  ring(r * 0.42, r * 0.36, 0.5, 0.45, C.granite); // the upper bowl's foot
  ring(r * 0.55, r * 0.55, 0.18, 0.95, C.granite);
  ring(r * 0.5, r * 0.5, 0.04, 1.1, C.water);
  ring(0.32, 0.26, 2.2, 1.1, C.granite); // the column
  // The phoenix (봉황) on top, wings raised: bronze.
  const bird = new THREE.Group();
  box(bird, 0.35, 0.4, 0.75, 0, 0.2, 0, C.bronze);
  box(bird, 0.22, 0.45, 0.22, 0, 0.55, 0.3, C.bronze);
  for (const s of [-1, 1]) { const wg = box(bird, 0.9, 0.08, 0.5, s * 0.5, 0.55, -0.05, C.bronze); wg.rotation.z = s * 0.6; }
  const tail = box(bird, 0.2, 0.06, 0.9, 0, 0.35, -0.75, C.bronze);
  tail.rotation.x = -0.5;
  bird.position.y = 3.35;
  g.add(bird);
  mergeStatic(g);
  // Jets: thin, see-through, rising round the upper bowl.
  const jetMat = new THREE.MeshBasicMaterial({ color: '#dff1fb', transparent: true, opacity: 0.55, depthWrite: false });
  const jets = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, j = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 1.4, 6), jetMat);
    j.position.set(Math.cos(a) * r * 0.75, 1.1, Math.sin(a) * r * 0.75);
    j.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    j.userData.noShadow = true;
    jets.add(j);
  }
  g.add(jets);
  return (t) => { jets.scale.y = 0.85 + Math.sin(t * 2.2) * 0.15; };
}
