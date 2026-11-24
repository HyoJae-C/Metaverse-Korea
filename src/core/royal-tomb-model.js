// Seonjeongneung's royal tombs (districts/seonjeongneung.json, built by
// scripts/build-seonjeongneung.mjs): what stands at the tombs, at 50% of the
// real size on its real spot (Yozi 2026-11-24). Loaded with import() by the
// landmark builders (core/landmarks.js) when you first walk in through the
// main gate, so none of it is in the first download.
//
//   royaltomb   the hill (fenced), the mound with its stone screen and
//               railing, the curved wall behind (곡장), the stone sheep and
//               tigers, the offering table, the pillars, the lantern, the
//               civil and military officials with their horses
//   jeongjagak  the T-shaped shrine hall (정자각) on its stone platform
//   hongsalmun  the red spiked gate (홍살문)
//   chamdo      the stone path from the gate to the hall: the spirits' strip
//               a little higher than the king's (참도: 신도, 어도)
//   bigak       a stele shed (비각)
//   tombhall    a plain hall (수복방, 수라간, 재실)
//   oldginkgo   the 500-year-old ginkgo by the south wall
//
// Each model is merged into a few meshes (one per material). Visual only:
// collision is the map's blockers. Local frame: +z is the front.
import * as THREE from 'three';
import { curvedRoof } from './hanok.js';
import { mergeStatic } from './bukchon-models.js';
import { SEASON, ginkgoColor } from './season.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const tileMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
function box(g, sx, sy, sz, x, y, z, c, ry = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
  o.position.set(x, y, z);
  o.rotation.y = ry;
  g.add(o);
  return o;
}
function cyl(g, r0, r1, h, x, y, z, c, seg = 8) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat(c));
  o.position.set(x, y + h / 2, z);
  g.add(o);
  return o;
}
function roof(g, w, d, h, y, o = {}, x = 0, z = 0, ry = 0) {
  for (const geo of curvedRoof(w, d, h, { color: C.roof, end: C.roofEnd, ...o })) {
    const m = new THREE.Mesh(geo, tileMat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    g.add(m);
  }
}
const C = {
  grass: '#86b552', grassDark: '#6f9c45', stone: '#cfc8b6', stoneDark: '#a8a08e', stoneLight: '#e0dacb', granite: '#b9b3a4',
  red: '#a8392b', redDark: '#7f2a20', wall: '#d8cdb6', beam: '#2f7a62', fence: '#7a4f2e', gold: '#d2a640',
  roof: new THREE.Color('#4a4f57'), roofEnd: new THREE.Color('#8a3a2c'), trunk: '#6b5040',
};
const done = (g) => { mergeStatic(g); g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); };

// --- The tomb --------------------------------------------------------------
// The hill: flat on top round the mound and the stone figures, sloping
// down to its foot (l.hill.p, the map's fenced outline, in metres from the
// mound, not turned).
function hill(g, l) {
  const H = l.hill.h, c = Math.cos(-l.ry), s = Math.sin(-l.ry);
  const ring = l.hill.p.map(([x, z]) => [x * c + z * s, -x * s + z * c]); // (into the tomb's own frame)
  const RINGS = 7, pos = [], col = [];
  const top = new THREE.Color(C.grass), side = new THREE.Color(C.grassDark);
  const at = (k, t) => { // point k of the outline, t of the way out from the middle
    const [x, z] = ring[k % ring.length], E = Math.hypot(x, z) || 1;
    const fwd = Math.max(0, z / E); // (the front slopes longer, where the hill steps down to the hall)
    const slope = Math.min(E * 0.6, 2.6 + fwd * 4.2), flat = Math.max(0, E - slope) / E;
    const y = t <= flat ? H : H * 0.5 * (1 + Math.cos(Math.PI * Math.min(1, (t - flat) / (1 - flat || 1))));
    return [x * t, y + 0.03, z * t];
  };
  for (let k = 0; k < ring.length; k++) for (let i = 0; i < RINGS; i++) {
    const t0 = i / RINGS, t1 = (i + 1) / RINGS;
    const a = at(k, t0), b = at(k + 1, t0), cc = at(k + 1, t1), d = at(k, t1);
    pos.push(...a, ...cc, ...b, ...a, ...d, ...cc);
    const k2 = a[1] > H - 0.01 && d[1] > H - 0.01 ? top : side;
    for (let n = 0; n < 6; n++) col.push(k2.r, k2.g, k2.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  // the low wooden fence round its foot
  const fence = new THREE.Group();
  for (let k = 0; k < ring.length; k++) {
    const [x0, z0] = ring[k], [x1, z1] = ring[(k + 1) % ring.length];
    const ox0 = x0 * 1.02, oz0 = z0 * 1.02, ox1 = x1 * 1.02, oz1 = z1 * 1.02, len = Math.hypot(ox1 - ox0, oz1 - oz0);
    if (len < 0.05) continue;
    const a = -Math.atan2(oz1 - oz0, ox1 - ox0);
    for (const y of [0.32, 0.62]) box(fence, len + 0.05, 0.06, 0.06, (ox0 + ox1) / 2, y, (oz0 + oz1) / 2, C.fence, a);
    for (let t = 0; t < len; t += 1.8) box(fence, 0.09, 0.72, 0.09, ox0 + ((ox1 - ox0) * t) / len, 0.36, oz0 + ((oz1 - oz0) * t) / len, C.fence);
  }
  g.add(fence);
  return H;
}
// A stone figure: a civil official (hands together, tall hat) or a
// military one (helmet, sword held in front).
function official(g, x, y, z, ry, military) {
  const o = new THREE.Group();
  box(o, 0.62, 0.12, 0.5, 0, 0.06, 0, C.stoneDark);
  box(o, 0.5, 1.0, 0.38, 0, 0.62, 0, C.granite); // robe
  box(o, 0.56, 0.18, 0.42, 0, 0.2, 0, C.granite); // hem
  box(o, 0.3, 0.32, 0.3, 0, 1.28, 0.02, C.stoneLight); // head
  if (military) { box(o, 0.36, 0.14, 0.36, 0, 1.5, 0.02, C.granite); box(o, 0.08, 0.7, 0.08, 0, 0.75, 0.24, C.stoneDark); } // helmet, sword
  else { box(o, 0.24, 0.24, 0.26, 0, 1.55, 0, C.granite); box(o, 0.12, 0.36, 0.08, 0, 0.9, 0.22, C.stoneLight); } // hat, tablet
  o.position.set(x, y, z); o.rotation.y = ry; g.add(o);
}
// The stone animals, from Yozi's photos (2026-11-24), at 50%: each stands
// on a slab, facing +z.
//   sheep  stocky, standing, the stone left in between its legs, a horn
//          curled round each side of the head, the head held low
//   horse  standing, taller, the neck forward and the head hanging
//   tiger  crouching: the round haunch high, the back sloping down to a big
//          round head held low, bulging eyes
function animal(g, x, y, z, ry, kind) {
  const o = new THREE.Group();
  if (kind === 'tiger') {
    box(o, 0.42, 0.06, 0.8, 0, 0.03, 0, C.stoneDark);
    const back = box(o, 0.34, 0.3, 0.56, 0, 0.27, -0.04, C.granite); back.rotation.x = 0.28; // the back, sloping down to the head
    cyl(o, 0.2, 0.22, 0.34, 0, 0.06, -0.22, C.granite, 8); // the haunch
    for (const sx of [-1, 1]) box(o, 0.1, 0.2, 0.12, sx * 0.12, 0.16, 0.2, C.granite); // forelegs
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), mat(C.stoneLight)); head.position.set(0, 0.3, 0.34); o.add(head);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), mat(C.stone)); e.position.set(sx * 0.08, 0.36, 0.5); o.add(e); box(o, 0.07, 0.06, 0.04, sx * 0.12, 0.47, 0.3, C.stoneLight); } // eyes, ears
    box(o, 0.2, 0.07, 0.08, 0, 0.22, 0.5, C.stone); // the jaw
  } else {
    const horse = kind === 'horse', L = horse ? 0.82 : 0.72, W = horse ? 0.26 : 0.3, leg = horse ? 0.3 : 0.2, Hb = horse ? 0.26 : 0.26, top = 0.06 + leg + Hb;
    box(o, W + 0.14, 0.06, L + 0.16, 0, 0.03, 0, C.stoneDark);
    box(o, W, Hb, L, 0, 0.06 + leg + Hb / 2, 0, C.granite); // body
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(o, 0.1, leg, 0.13, sx * (W / 2 - 0.05), 0.06 + leg / 2, sz * (L / 2 - 0.09), C.granite);
    box(o, W * 0.45, leg * 0.8, L - 0.3, 0, 0.06 + leg * 0.4, 0, C.stoneDark); // the stone left under the belly
    if (horse) {
      const neck = box(o, 0.17, 0.3, 0.2, 0, top - 0.02, L / 2 + 0.04, C.granite); neck.rotation.x = 0.7;
      const head = box(o, 0.15, 0.3, 0.16, 0, top - 0.17, L / 2 + 0.2, C.stoneLight); head.rotation.x = 0.25; // hanging
      for (const sx of [-1, 1]) box(o, 0.04, 0.07, 0.04, sx * 0.05, top + 0.08, L / 2 + 0.1, C.stoneLight); // ears
      box(o, 0.05, 0.08, 0.3, 0, top + 0.02, L / 2 - 0.14, C.stoneDark); // mane
      box(o, 0.07, 0.32, 0.06, 0, top - 0.2, -L / 2 - 0.02, C.stoneDark); // tail
    } else {
      box(o, 0.22, 0.24, 0.26, 0, top - 0.1, L / 2 + 0.1, C.stoneLight); // the head, low
      box(o, 0.16, 0.14, 0.12, 0, top - 0.19, L / 2 + 0.27, C.stoneLight); // muzzle
      for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.035, 4, 8), mat(C.stoneDark)); h.rotation.y = Math.PI / 2; h.position.set(sx * 0.13, top - 0.08, L / 2 + 0.08); o.add(h); } // the curled horns
    }
  }
  o.position.set(x, y, z); o.rotation.y = ry; g.add(o);
}
export function buildRoyalTomb(g, l) {
  const H = hill(g, l), r = l.mound / 2, Rw = l.wall * 0.85;
  // The mound (Yozi's photos, 2026-11-24): a twelve-sided stone screen
  // (병풍석) with a cap stone jutting at each corner, the grass dome on it,
  // and a twelve-post railing (난간석) round it. Queen Jeonghyeon's has the
  // railing only (l.screen 0).
  const S12 = 12, sh = l.screen !== 0 ? 0.62 : 0.12;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.grass));
  dome.scale.y = 0.7; dome.position.set(0, H + sh, 0); g.add(dome);
  if (l.screen !== 0) {
    cyl(g, r + 0.05, r + 0.05, sh - 0.1, 0, H, 0, C.stone, S12);
    cyl(g, r + 0.14, r + 0.14, 0.1, 0, H + sh - 0.1, 0, C.stoneLight, S12); // the cap course
    cyl(g, r + 0.3, r + 0.3, 0.08, 0, H, 0, C.stoneDark, S12); // the foot course
    for (let i = 0; i < S12; i++) { const a = ((i + 0.5) / S12) * Math.PI * 2; box(g, 0.3, 0.16, 0.42, Math.sin(a) * (r + 0.22), H + sh - 0.13, Math.cos(a) * (r + 0.22), C.stoneLight, a); } // the corner stones (인석)
  } else cyl(g, r + 0.05, r + 0.1, sh, 0, H, 0, C.stoneDark, S12);
  const Rr = r + 0.85;
  for (let i = 0; i < S12; i++) {
    const a = ((i + 0.5) / S12) * Math.PI * 2, a1 = ((i + 1.5) / S12) * Math.PI * 2, am = (a + a1) / 2;
    const x = Math.sin(a) * Rr, z = Math.cos(a) * Rr, len = 2 * Rr * Math.sin(Math.PI / S12), Rm = Rr * Math.cos(Math.PI / S12);
    box(g, 0.2, 0.62, 0.2, x, H + 0.31, z, C.stoneLight, a); cyl(g, 0.13, 0.09, 0.16, x, H + 0.62, z, C.stone, 6); // post and its round head
    box(g, len - 0.16, 0.1, 0.12, Math.sin(am) * Rm, H + 0.4, Math.cos(am) * Rm, C.stone, am); // the rail
    box(g, 0.14, 0.34, 0.14, Math.sin(am) * Rm, H + 0.17, Math.cos(am) * Rm, C.stoneDark, am); // the short post under it
  }
  // the curved wall (곡장) on three sides, open to the front: OSM's own line at 50%
  const cw = Math.cos(-l.ry), sw = Math.sin(-l.ry);
  const wallPts = l.wallP ? l.wallP.map(([x, z]) => [x * cw + z * sw, -x * sw + z * cw]) : [[-Rw, r * 0.6], [-Rw, -Rw * 0.8], [Rw, -Rw * 0.8], [Rw, r * 0.6]];
  for (let i = 1; i < wallPts.length; i++) {
    const [x0, z0] = wallPts[i - 1], [x1, z1] = wallPts[i], len = Math.hypot(x1 - x0, z1 - z0), a = -Math.atan2(z1 - z0, x1 - x0);
    box(g, len + 0.1, 0.9, 0.4, (x0 + x1) / 2, H + 0.45, (z0 + z1) / 2, C.wall, a);
    box(g, len + 0.25, 0.16, 0.66, (x0 + x1) / 2, H + 0.96, (z0 + z1) / 2, '#4a4f57', a);
  }
  // Stone sheep and tigers (2 pairs each), turn about, between the mound and
  // the wall, facing out.
  const Ra = Math.min(r + 1.9, (r + 0.85 + Math.min(...wallPts.map(([x, z]) => Math.hypot(x, z)))) / 2 + 0.3);
  [[-0.3, 'sheep'], [0.3, 'sheep'], [-0.52, 'tiger'], [0.52, 'tiger'], [-0.74, 'sheep'], [0.74, 'sheep'], [-0.93, 'tiger'], [0.93, 'tiger']].forEach(([f, kind]) => {
    const a = Math.PI * (1.5 + f * 0.82);
    animal(g, Math.cos(a) * Ra, H, Math.sin(a) * Ra, Math.atan2(Math.cos(a), Math.sin(a)), kind);
  });
  // In front, stepping down towards the hall (spaced to fit the hill's
  // top). Upper tier: the offering table before the mound, a pillar at each
  // side. Middle: the lantern on the axis, the civil officials facing each
  // other across it, a horse behind each. Lower: the military officials and
  // their horses. A long stone course marks each step.
  const room = Math.max(4, l.hill.front - (2.6 + 4.2) - r - 0.6), k = Math.min(1, room / 6.6);
  const F = (d) => r + 0.9 + d * k;
  // (the rows as wide as the hill's top has room for: Seolleung's is cut by the grounds' wall)
  const hp = l.hill.p.map(([x, z]) => [x * cw + z * sw, -x * sw + z * cw]);
  const on = (x, z) => { let in_ = false; for (let i = 0, j = hp.length - 1; i < hp.length; j = i++) { const [xi, zi] = hp[i], [xj, zj] = hp[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) in_ = !in_; } return in_; };
  let half = Math.min(4.6, r + 2);
  while (half > 2.2 && ![-1, 1].every((sx) => on(sx * (half * 0.93 + 2), F(3.5)) && on(sx * (half * 0.93 + 2), F(5.8)))) half -= 0.2;
  box(g, 1.5, 0.16, 0.95, 0, H + 0.3, F(0.75), C.stoneLight); // the offering table (혼유석) on its drum stones
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.17, 0.17, 0.3, sx * 0.5, H, F(0.75) + sz * 0.26, C.stoneDark, 8);
  for (const sx of [-1, 1]) { box(g, 0.34, 0.14, 0.34, sx * half * 0.78, H + 0.07, F(0.6), C.stoneDark); cyl(g, 0.11, 0.15, 1.25, sx * half * 0.78, H + 0.14, F(0.6), C.stoneLight, 8); cyl(g, 0.15, 0.11, 0.14, sx * half * 0.78, H + 1.39, F(0.6), C.stone, 8); cyl(g, 0.02, 0.1, 0.16, sx * half * 0.78, H + 1.53, F(0.6), C.stoneLight, 8); } // pillars (망주석)
  for (const d of [1.9, 4.3]) box(g, half * 2 + 0.8, 0.07, 0.3, 0, H + 0.035, F(d), C.stoneDark); // the steps' stone courses (장대석)
  const lz = F(2.9); // the lantern (장명등): eight-sided, roofed
  cyl(g, 0.34, 0.4, 0.26, 0, H, lz, C.stoneDark, 8); cyl(g, 0.2, 0.24, 0.42, 0, H + 0.26, lz, C.stone, 8);
  cyl(g, 0.3, 0.3, 0.4, 0, H + 0.68, lz, C.stoneLight, 8); cyl(g, 0.16, 0.5, 0.26, 0, H + 1.08, lz, C.stoneDark, 8); cyl(g, 0.05, 0.12, 0.26, 0, H + 1.34, lz, C.stone, 8);
  for (const sx of [-1, 1]) {
    official(g, sx * half * 0.62, H, F(3.1), -sx * Math.PI / 2, false); animal(g, sx * half * 0.93, H, F(3.5), -sx * Math.PI / 2, 'horse');
    official(g, sx * half * 0.62, H, F(5.4), -sx * Math.PI / 2, true); animal(g, sx * half * 0.93, H, F(5.8), -sx * Math.PI / 2, 'horse');
  }
  done(g);
}

// --- The shrine hall ---------------------------------------------------------
// 정자각: the main hall across the back, the open porch (배위청) reaching
// forward, both under gabled roofs, on a stone platform with steps.
export function buildJeongjagak(g, l) {
  const [bw, bd] = l.base, [hw, hd] = l.hall, B = 0.55, P = 1.75;
  box(g, bw, B - 0.04, bd, 0, (B - 0.04) / 2, 0, C.stone); // (its top under the cap course's: two faces at one height shimmer)
  box(g, bw + 0.2, 0.08, bd + 0.2, 0, B - 0.04, 0, C.stoneDark);
  for (const sx of [-0.25, 0.25]) for (let i = 0; i < 3; i++) box(g, 1.1, B - i * 0.18, 0.35, sx * bw, (B - i * 0.18) / 2, bd / 2 + 0.17 + i * 0.35, C.stoneLight); // the steps up, east and west
  const mainD = hd * 0.55, mainZ = -hd / 2 + mainD / 2, porchW = hw * 0.48, porchD = hd - mainD, porchZ = hd / 2 - porchD / 2;
  // main hall: red walls and doors between red posts
  box(g, hw - 0.3, P, mainD - 0.3, 0, B + P / 2, mainZ, C.redDark);
  for (let i = 0; i <= 3; i++) for (const z of [mainZ - mainD / 2, mainZ + mainD / 2]) cyl(g, 0.12, 0.13, P, -hw / 2 + (i * hw) / 3, B, z, C.red, 8);
  for (let i = 0; i < 3; i++) box(g, hw / 3 - 0.5, P * 0.78, 0.06, -hw / 3 + (i * hw) / 3, B + P * 0.42, mainZ + mainD / 2 - 0.12, i === 1 ? C.red : '#8f3326'); // doors
  // porch: open, posts only
  for (const sx of [-1, 1]) for (const z of [porchZ - porchD / 2 + 0.2, porchZ + porchD / 2 - 0.2]) cyl(g, 0.11, 0.12, P, sx * (porchW / 2 - 0.1), B, z, C.red, 8);
  box(g, porchW - 0.3, 0.04, porchD, 0, B + 0.02, porchZ, C.stoneLight);
  // the painted beams
  box(g, hw + 0.1, 0.26, mainD + 0.1, 0, B + P + 0.13, mainZ, C.beam);
  box(g, porchW + 0.05, 0.24, porchD + 0.1, 0, B + P + 0.12, porchZ, C.beam);
  // gabled roofs: the main hall's along its width, the porch's along its length
  roof(g, hw + 1.4, mainD + 1.4, 1.35, B + P + 0.24, { hip: false, lift: 0.3, seg: 4, rows: 3 }, 0, mainZ);
  roof(g, porchD + 1.2, porchW + 1.2, 1.1, B + P + 0.2, { hip: false, lift: 0.25, seg: 3, rows: 3 }, 0, porchZ + 0.15, Math.PI / 2);
  { // the red board under the porch's gable (풍판), what you see from the stone path
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 3), mat(C.redDark));
    t.rotation.x = -Math.PI / 2; t.scale.x = (porchW * 0.5) / (0.62 * 0.866); t.position.set(0, B + P + 0.24 + 0.36, porchZ + porchD / 2 + 0.45); g.add(t);
  }
  done(g);
}

// --- The red gate ---------------------------------------------------------------
export function buildHongsalmun(g, l) {
  const w = l.w, H = 4.2, hw = w / 2;
  for (const sx of [-1, 1]) { box(g, 0.5, 0.25, 0.5, sx * hw, 0.12, 0, C.stoneDark); cyl(g, 0.12, 0.14, H, sx * hw, 0.2, 0, C.red, 8); }
  box(g, w + 0.4, 0.16, 0.16, 0, 3.0, 0, C.red);
  box(g, w + 0.2, 0.14, 0.14, 0, 3.55, 0, C.red);
  for (let i = 1; i < 14; i++) box(g, 0.05, 1.05, 0.05, -hw + (i * w) / 14, 3.55 + 0.45, 0, C.red); // the spikes (홍살)
  // the taegeuk and the trident in the middle
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), mat('#2b4fa3'));
  disc.rotation.x = Math.PI / 2; disc.position.set(0, 4.0, 0.06); g.add(disc);
  const half = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 16, 1, false, 0, Math.PI), mat('#c8322a'));
  half.rotation.x = Math.PI / 2; half.position.set(0, 4.0, 0.07); g.add(half);
  for (const sx of [-0.14, 0, 0.14]) box(g, 0.05, sx ? 0.32 : 0.44, 0.05, sx, 4.45, 0, C.red);
  done(g);
}

// --- The stone path -------------------------------------------------------------
// l.p in world metres. The spirits' strip (신도) on the left going up is a
// little higher and wider than the king's (어도).
export function buildChamdo(g, l) {
  const w = l.w;
  for (let i = 1; i < l.p.length; i++) {
    const [x0, z0] = l.p[i - 1], [x1, z1] = l.p[i], len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.05) continue;
    const a = -Math.atan2(z1 - z0, x1 - x0), ux = (x1 - x0) / len, uz = (z1 - z0) / len, nx = uz, nz = -ux; // (n: to the left going up)
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ws = w * 0.53, wk = w * 0.47;
    box(g, len + 0.05, 0.1, ws, mx + nx * (w / 2 - ws / 2), 0.05, mz + nz * (w / 2 - ws / 2), C.stoneLight, a);
    box(g, len + 0.05, 0.06, wk, mx - nx * (w / 2 - wk / 2), 0.03, mz - nz * (w / 2 - wk / 2), C.stone, a);
    for (let t = 0.6; t < len; t += 0.9) box(g, 0.05, 0.11, w, x0 + ux * t, 0.055, z0 + uz * t, C.stoneDark, a + Math.PI / 2); // joints
  }
  done(g);
}

// --- Small halls ------------------------------------------------------------------
export function buildBigak(g, l) {
  const w = Math.max(2.2, l.w), d = Math.max(2.2, l.d), P = 1.6;
  box(g, w, 0.35, d, 0, 0.17, 0, C.stone);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.1, 0.11, P, sx * (w / 2 - 0.3), 0.35, sz * (d / 2 - 0.3), C.red, 8);
  box(g, w - 0.7, P * 0.8, d - 0.7, 0, 0.35 + P * 0.42, 0, C.redDark); // lattice walls round the stele
  box(g, w - 0.4, 0.22, d - 0.4, 0, 0.35 + P + 0.11, 0, C.beam);
  roof(g, w + 1.1, d + 1.1, 1.0, 0.35 + P + 0.2, { hip: true, lift: 0.25, seg: 3, rows: 2 });
  done(g);
}
export function buildTombHall(g, l) {
  const w = Math.max(2.4, l.w), d = Math.max(2, l.d), P = l.big ? 1.9 : 1.6;
  box(g, w, 0.35, d, 0, 0.17, 0, C.stone);
  box(g, w - 0.3, P, d - 0.3, 0, 0.35 + P / 2, 0, C.wall);
  const bays = Math.max(2, Math.round(w / 1.4));
  for (let i = 0; i <= bays; i++) for (const z of [-d / 2 + 0.1, d / 2 - 0.1]) box(g, 0.18, P, 0.18, -w / 2 + 0.1 + (i * (w - 0.2)) / bays, 0.35 + P / 2, z, C.red);
  for (let i = 0; i < bays; i++) box(g, (w - 0.2) / bays - 0.35, P * 0.7, 0.05, -w / 2 + 0.1 + ((i + 0.5) * (w - 0.2)) / bays, 0.35 + P * 0.42, d / 2 - 0.08, '#8a5a3a'); // doors
  box(g, w + 0.1, 0.18, d + 0.1, 0, 0.35 + P + 0.09, 0, l.big ? C.beam : C.trunk);
  roof(g, w + 1.2, d + 1.1, 1.0, 0.35 + P + 0.15, { hip: false, lift: 0.3, seg: 3, rows: 2 });
  done(g);
}

// --- The old ginkgo -------------------------------------------------------------------
export function buildOldGinkgo(g) {
  cyl(g, 0.45, 0.7, 4.2, 0, 0, 0, C.trunk, 9);
  for (const [x, z, ry] of [[0.5, 0.2, 0.6], [-0.4, 0.3, -0.7], [0.1, -0.5, 2.6]]) { const b = cyl(g, 0.16, 0.26, 2.2, x * 0.6, 3.2, z * 0.6, C.trunk, 6); b.rotation.set(Math.cos(ry) * 0.5, 0, Math.sin(ry) * 0.5); }
  const crown = new THREE.Color(ginkgoColor(new THREE.Color('#6f9a3e'), 0.5, SEASON));
  for (const [x, y, z, s] of [[0, 6.6, 0, 3.2], [1.4, 5.6, 0.6, 2.2], [-1.3, 5.8, -0.4, 2.3], [0.3, 5.4, -1.4, 2.1], [-0.4, 5.3, 1.4, 2.0]]) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat('#' + crown.getHexString()));
    m.position.set(x, y, z); g.add(m);
  }
  done(g);
}
