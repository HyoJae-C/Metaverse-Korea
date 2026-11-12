// Seoul Station's buildings (map landmarks, districts/seoul-station.json,
// laid out by scripts/build-seoul-station.mjs):
//   oldstation   the old station of 1925 (Culture Station Seoul 284) at 37.5%:
//                red brick over a stone ground floor, white stone bands,
//                grey slate roofs, curved gables over the end pavilions, the
//                big arched front with its clock and three doors, two small
//                domed towers either side of it and the green dome behind.
//                Proportions from Yozi's photos (sizes: src/data/seoul-station.js).
//                Its outline comes from OpenStreetMap; the model faces +z
//                (east), +x is north. The back (over the tracks) has the same
//                walls and windows but no doors.
//   stationhall  the glass station hall over the tracks (2004) at 1/4, with the
//                round entrance, the "서울역 Seoul Station" sign on its roof,
//                the wide steps down to the plaza and the round pillar.
//   yardfence    the fence round the tracks.
// Loaded with import() when the city is built (core/landmarks.js), so none
// of it is in the first download. Visual only: collision comes from the
// map's buildings and blockers.
import * as THREE from 'three';
import { addBox, canvasTex } from './three-kit.js';
import { mergeStatic } from './bukchon-models.js';
import { addBrickPattern } from './brick-pattern.js';
import { OLD_STATION as K, HALL } from '../data/seoul-station.js';

const C = {
  brick: '#b8604a', stone: '#e6dfd0', stoneDark: '#cfc6b4', slate: '#5d646e', copper: '#6fae8f', copperDark: '#5a9479',
  glass: '#2f3a4a', door: '#3a2c26', clock: '#f4f1ea', gold: '#c9a640',
  hall: '#8fc0d8', hallDark: '#5f8fa8', hallRoof: '#d9dee3', steps: '#c9c4bb', pillar: '#f2f2f2', pillarHead: '#2c3440', signBox: '#ddd2bd', hallBlock: '#b9bec4', blue: '#1f5fae', red: '#c8352b', fence: '#5a6470',
};
const mats = {};
const mat = (c) => (mats[c] ||= c === C.brick ? addBrickPattern(new THREE.MeshLambertMaterial({ color: c, flatShading: true }), { w: 0.5, h: 0.2, mortar: 0.035 }) : new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const box = (g, sx, sy, sz, x, y, z, c, ry = 0) => { const m = addBox(g, mat, sx, sy, sz, x, y, z, c); m.rotation.y = ry; return m; };
const cyl = (g, r, h, x, y, z, c, seg = 12, r2 = r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), mat(c)); m.position.set(x, y + h / 2, z); g.add(m); return m; };

// A prism from a closed outline in the x/z plane ([[x, z], …]), from y0 up h.
function prism(g, pts, y0, h, c) {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0, 0);
  const m = new THREE.Mesh(geo, mat(c));
  g.add(m);
  return m;
}
// An outline grown a little round its middle (bands that stand out of a wall).
const grow = (pts, d) => {
  const cx = pts.reduce((t, q) => t + q[0], 0) / pts.length, cz = pts.reduce((t, q) => t + q[1], 0) / pts.length;
  return pts.map(([x, z]) => { const L = Math.hypot(x - cx, z - cz) || 1; return [x + ((x - cx) / L) * d, z + ((z - cz) / L) * d]; });
};
// The part of a closed outline on one side of the line x = xc (side -1:
// x <= xc, side 1: x >= xc), cut straight along it.
function clipX(pts, xc, side) {
  const out = [], inside = (q) => (q[0] - xc) * side >= 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) { const t = (xc - a[0]) / (b[0] - a[0]); out.push([xc, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
// A flat shape with a round top (an arch, a curved gable), w wide, its
// straight sides h high, facing +z, t thick, its foot at (x, y, z).
function archShape(g, w, h, t, x, y, z, c, ry = 0) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h);
  s.absarc(0, h, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -t / 2);
  const m = new THREE.Mesh(geo, mat(c));
  m.position.set(x, y, z); m.rotation.y = ry;
  g.add(m);
  return m;
}
// A dome: a squashed half sphere of radius r and height h on top of y.
function dome(g, r, h, x, y, z, c, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(c));
  m.scale.y = h / r; m.position.set(x, y, z);
  g.add(m);
  return m;
}

// ---------- The old station ----------
export function buildOldStation(g, l) {
  const P = l.outline, [m0, m1] = l.mid, mc = (m0 + m1) / 2, mw = m1 - m0;
  const xs = P.map((q) => q[0]), zs = P.map((q) => q[1]);
  const X0 = Math.min(...xs), X1 = Math.max(...xs), Z0 = Math.min(...zs), Z1 = Math.max(...zs);
  const frontAt = (x) => { // the front wall's z at x (the outline's furthest east point near x)
    let best = Z0;
    for (let i = 0; i < P.length; i++) {
      const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length];
      if ((ax - x) * (bx - x) <= 0 && Math.abs(az - bz) < 0.3) best = Math.max(best, (az + bz) / 2);
    }
    return best;
  };
  // The main block is symmetric about the arched middle (Yozi's photo): its
  // south half sets its length. What the outline has past that at the north
  // end is a lower wing (one storey over the stone ground floor).
  const xa = Math.min(X1, mc + (mc - X0));
  const PM = xa < X1 - 0.5 ? clipX(P, xa, -1) : P, PA = xa < X1 - 0.5 ? clipX(P, xa, 1) : null;
  const annexEave = K.ground + 2.6;
  // Walls: the stone ground floor, brick above, a white band between and a
  // cornice on top; windows on every long wall, two rows, white stone piers
  // between the bays (none where the arched front is).
  const walls = (Q, eave, attic) => {
    prism(g, Q, 0, K.ground, C.stone);
    prism(g, Q, K.ground, eave - K.ground, C.brick);
    prism(g, grow(Q, 0.12), K.ground - 0.1, 0.28, C.stone);
    prism(g, grow(Q, 0.18), eave - 0.35, 0.4, C.stone);
    for (let i = 0; i < Q.length; i++) {
      const [ax, az] = Q[i], [bx, bz] = Q[(i + 1) % Q.length];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 1.4 || (Math.abs(ax - xa) < 0.01 && Math.abs(bx - xa) < 0.01)) continue; // (the cut between the main block and the wing)
      const dx = (bx - ax) / L, dz = (bz - az) / L;
      let nx = dz, nz = -dx; // outward: away from the middle of the outline
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      if (nx * (mx - (X0 + X1) / 2) + nz * (mz - (Z0 + Z1) / 2) < 0) { nx = -nx; nz = -nz; }
      const ry = Math.atan2(nx, nz);
      const n = Math.max(1, Math.floor(L / 1.55));
      for (let k = 0; k < n; k++) {
        const s = (k + 0.5) * (L / n), x = ax + dx * s, z = az + dz * s;
        if (nz > 0.7 && x > m0 - K.tower.w - 0.2 && x < m1 + K.tower.w + 0.2) continue; // (the arched front)
        box(g, 0.62, 1.15, 0.1, x + nx * 0.05, 1.25, z + nz * 0.05, C.glass, ry); // ground floor
        box(g, 0.66, 1.75, 0.1, x + nx * 0.05, 3.8, z + nz * 0.05, C.glass, ry); // upper floor
        box(g, 0.8, 0.12, 0.16, x + nx * 0.08, 4.75, z + nz * 0.08, C.stone, ry); // its lintel
        if (attic && nz > 0.7 && k % 2 === 0) box(g, 0.66, 0.9, 0.1, x + nx * 0.05, 5.4, z + nz * 0.05, C.glass, ry); // the attic's small windows (front)
      }
      for (let k = 0; k <= n; k += 2) { // stone piers
        const s = k * (L / n), x = ax + dx * s, z = az + dz * s;
        box(g, 0.32, eave - K.ground, 0.14, x + nx * 0.07, K.ground + (eave - K.ground) / 2, z + nz * 0.07, C.stone, ry);
      }
    }
  };
  walls(PM, K.wingEave, true);
  if (PA) walls(PA, annexEave, false);
  // The slate roofs: a low hipped roof over the main block (back wall to the
  // main front wall), smaller ones over the parts that stand forward and
  // over the north wing.
  const hipped = (x0, x1, z0, z1, h, y = K.wingEave) => {
    const w = x1 - x0, d = z1 - z0;
    if (w < 0.8 || d < 0.8) return;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(C.slate));
    roof.geometry.translate(0, h / 2, 0);
    const pos = roof.geometry.attributes.position; // pull the top in: a hipped look
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > h / 2) { pos.setX(i, pos.getX(i) * Math.max(0.3, 1 - 1.6 / w)); pos.setZ(i, pos.getZ(i) * 0.45); }
    roof.geometry.computeVertexNormals();
    roof.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    g.add(roof);
  };
  const samples = [];
  for (let x = X0 + 0.25; x < xa; x += 0.5) samples.push([x, frontAt(x)]);
  const fronts = samples.map((q) => q[1]).sort((a, b) => a - b), zMain = fronts[Math.floor(fronts.length / 2)];
  hipped(X0 + 0.2, xa - 0.2, Z0 + 0.1, zMain + 0.2, K.roof);
  let run = null; const runs = []; // the parts standing forward of the main front
  for (const [x, z] of [...samples, [xa + 1, zMain]]) {
    if (z > zMain + 0.8 && !(x > m0 - 0.5 && x < m1 + 0.5)) { if (!run) run = { x0: x, x1: x, z }; run.x1 = x; run.z = Math.min(run.z, z); }
    else if (run) { hipped(run.x0 - 0.15, Math.min(run.x1 + 0.15, xa - 0.1), zMain - 0.4, run.z + 0.15, K.roof * 0.8); runs.push(run); run = null; }
  }
  if (PA) {
    const az = PA.map((q) => q[1]), ax = PA.map((q) => q[0]);
    hipped(xa, Math.max(...ax) - 0.2, Math.min(...az) + 0.1, Math.max(...az) - 0.1, K.roof * 0.7, annexEave);
  }
  // The end pavilions: curved gables over the eaves of the parts that stand
  // forward of the front.
  for (const r of runs) {
    const w = r.x1 - r.x0 + 0.3, x = (r.x0 + r.x1) / 2, zf = r.z;
    if (w < 3) continue;
    const gw = Math.min(4.4, w - 0.4);
    archShape(g, gw, K.gable - 1.1, 0.4, x, K.wingEave - 0.3, zf + 0.22, C.brick);
    archShape(g, 3.4, K.gable - 1.2, 0.42, x, K.wingEave - 0.1, zf + 0.26, C.stone).scale.set(0.35, 0.6, 1); // (a stone window in it)
    box(g, gw + 0.2, 0.3, 0.5, x, K.wingEave + K.gable - 0.1, zf + 0.22, C.stone);
  }
  // The arched middle: a stone frame with a round top, the big window, the
  // clock under it and three doors.
  const zf = Math.max(frontAt(mc), Z1 - 0.3);
  const spring = K.arch - mw / 2;
  box(g, mw, spring, 1.6, mc, spring / 2, zf - 0.8, C.stone); // the lower front (stone)
  archShape(g, mw, spring, 1.2, mc, 0, zf - 1.2, C.stone, 0); // the frame with its round top
  const win0 = 3.7; // the big window's foot (the clock under it, the doors under that)
  archShape(g, mw - 1.5, spring - win0, 0.12, mc, win0, zf + 0.02, C.glass); // the big arched window
  for (const dx of [-1, 0, 1]) box(g, 0.12, mw / 2 + spring - win0 - 0.4, 0.08, mc + dx * (mw - 1.5) / 4, win0 + (mw / 2 + spring - win0 - 0.4) / 2, zf + 0.1, C.stone); // its mullions
  box(g, mw - 1.5, 0.12, 0.08, mc, spring + 0.3, zf + 0.1, C.stone);
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 16), mat(C.clock));
  clock.rotation.x = Math.PI / 2; clock.position.set(mc, 3.05, zf + 0.12); g.add(clock);
  box(g, 0.05, 0.38, 0.04, mc, 3.15, zf + 0.18, C.door); box(g, 0.3, 0.05, 0.04, mc + 0.1, 3.05, zf + 0.18, C.door); // its hands
  box(g, mw - 0.8, 0.22, 0.6, mc, 2.15, zf + 0.25, C.stoneDark); // the canopy over the doors
  for (const dx of [-1.7, 0, 1.7]) archShape(g, 1.2, 1.3, 0.1, mc + dx, 0, zf + 0.04, C.door);
  // The square towers either side, with green cupolas.
  for (const x of [m0 - K.tower.w / 2, m1 + K.tower.w / 2]) {
    const tz = zf - 1.0;
    box(g, K.tower.w, K.tower.top, K.tower.w, x, K.tower.top / 2, tz, C.brick);
    for (const sx of [-1, 1]) box(g, 0.22, K.tower.top, 0.22, x + sx * (K.tower.w / 2 - 0.05), K.tower.top / 2, tz + K.tower.w / 2 - 0.05, C.stone); // stone corners
    box(g, K.tower.w + 0.25, 0.3, K.tower.w + 0.25, x, K.tower.top, tz, C.stone);
    box(g, 0.5, 0.9, 0.08, x, 6.6, tz + K.tower.w / 2 + 0.02, C.glass);
    cyl(g, K.tower.r * 0.95, 0.7, x, K.tower.top + 0.3, tz, C.stone, 10);
    dome(g, K.tower.r, K.tower.cap - K.tower.top - 1.4, x, K.tower.top + 1.0, tz, C.copper, 10);
    cyl(g, 0.04, 0.5, x, K.tower.cap - 0.5, tz, C.gold, 4);
  }
  // The big dome behind the arch: a drum with arched windows, the copper
  // dome and a little lantern with a spike.
  const dz = zf - 1.2 - K.dome.r * 0.9;
  cyl(g, K.dome.r, K.dome.drum - K.wingEave, mc, K.wingEave, dz, C.brick, 16);
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    archShape(g, 2.0, 0.3, 0.3, mc + Math.sin(a) * (K.dome.r - 0.05), K.dome.drum - 0.05, dz + Math.cos(a) * (K.dome.r - 0.05), C.stone, a); // the dormer arches round the dome's foot
  }
  box(g, 0.1, 0.1, 0.1, mc, K.dome.drum, dz, C.stone);
  cyl(g, K.dome.r + 0.15, 0.25, mc, K.dome.drum - 0.25, dz, C.stone, 16);
  const domeTop = K.dome.top - K.dome.lantern - 0.6;
  dome(g, K.dome.r, domeTop - K.dome.drum, mc, K.dome.drum, dz, C.copper, 18);
  cyl(g, 0.45, 0.45, mc, domeTop - 0.1, dz, C.copperDark, 8);
  dome(g, 0.5, 0.35, mc, domeTop + 0.35, dz, C.copper, 8);
  cyl(g, 0.04, K.dome.lantern, mc, K.dome.top - K.dome.lantern, dz, C.gold, 4);
  mergeStatic(g);
}

// ---------- The station hall ----------
function signTexture() {
  return canvasTex(1024, 448, (ctx, w, h) => {
    ctx.fillStyle = '#ddd2bd'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2b4a8a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 200px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    ctx.fillText('서울역', w / 2, h * 0.36);
    ctx.font = '700 100px system-ui, sans-serif';
    ctx.fillText('Seoul Station', w / 2, h * 0.8);
  });
}
export function buildStationHall(g, l) {
  const P = l.outline;
  // Glass all round, white bands at each floor, a pale roof slab.
  prism(g, P, 0, HALL.h, C.hall);
  for (const y of [3.2, 6.4]) prism(g, grow(P, 0.1), y, 0.25, C.hallRoof);
  prism(g, grow(P, 0.25), HALL.h, 0.5, C.hallRoof);
  // Mullions: dark stripes up the walls every 2.5 m.
  for (let i = 0; i < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 2.5) continue;
    const ry = Math.atan2(bx - ax, bz - az) + Math.PI / 2;
    for (let s = 1.25; s < L; s += 2.5) box(g, 0.14, HALL.h, 0.14, ax + ((bx - ax) * s) / L, HALL.h / 2, az + ((bz - az) * s) / L, C.hallDark, ry);
  }
  // The round entrance: a taller glass drum with a flat roof.
  const [rx, rz, rr] = l.rotunda;
  cyl(g, rr, HALL.rotunda, rx, 0, rz, C.hall, 20);
  cyl(g, rr + 0.3, 0.4, rx, HALL.rotunda, rz, C.hallRoof, 20);
  for (const y of [3.2, 6.4, 9.6]) cyl(g, rr + 0.08, 0.22, rx, y, rz, C.hallRoof, 20);
  // The steps down to the plaza: rising to the west, to the doors.
  const S = l.steps, n = S.n, run = (S.x1 - S.x0) / n, rise = 1.2 / n;
  for (let k = 0; k < n; k++) box(g, run * (n - k), rise, S.z1 - S.z0, S.x0 + (run * (n - k)) / 2, rise * k + rise / 2, (S.z0 + S.z1) / 2, C.steps);
  for (const z of [S.z0 + 0.15, S.z1 - 0.15]) box(g, S.x1 - S.x0, 0.9, 0.3, (S.x0 + S.x1) / 2, 0.75, z, C.hallRoof); // the side walls
  // The round pillar on the plaza (Yozi's photo): a white shaft with a red
  // ring low down and a blue band up top, a dark drum head with round
  // lamps, a white rim and a blue cap.
  const [px, pz] = l.pillar;
  cyl(g, 0.42, 6.4, px, 0, pz, C.pillar, 14);
  cyl(g, 0.5, 0.4, px, 0.9, pz, C.red, 14);
  cyl(g, 0.56, 1.1, px, 4.0, pz, C.blue, 14);
  cyl(g, 0.5, 0.18, px, 5.15, pz, C.red, 14);
  cyl(g, 0.78, 1.0, px, 6.2, pz, C.pillarHead, 16);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cyl(g, 0.2, 0.05, px + Math.sin(a) * 0.79, 6.5, pz + Math.cos(a) * 0.79, C.pillar, 10).rotation.set(Math.PI / 2, a, 0, 'YXZ'); }
  cyl(g, 0.84, 0.14, px, 7.2, pz, C.pillar, 16);
  cyl(g, 0.7, 0.3, px, 7.34, pz, C.blue, 16, 0.5);
  // A blue strip up the glass front under the sign (the photo).
  const [sx, sz, sry] = l.sign;
  const along = [Math.cos(sry), -Math.sin(sry)], out = [-Math.sin(sry), -Math.cos(sry)]; // the box's long side, and outward from the front
  box(g, 1.1, HALL.h - 0.4, 0.2, sx + along[0] * 2.4 + out[0] * 1.62, (HALL.h - 0.4) / 2, sz + along[1] * 2.4 + out[1] * 1.62, C.blue, sry);
  // The sign: a stone box standing on the roof at the front's north end,
  // a taller grey block behind it.
  const { w, h, d } = HALL.sign;
  box(g, w * 0.8, h + 1.6, d + 2.5, sx - along[0] * 0.6 - out[0] * 2.4, HALL.h + (h + 1.6) / 2, sz - along[1] * 0.6 - out[1] * 2.4, C.hallBlock, sry);
  box(g, w, h, d, sx, HALL.h + h / 2, sz, C.signBox, sry);
  mergeStatic(g);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, h * 0.8), new THREE.MeshBasicMaterial({ map: signTexture() }));
  face.rotation.y = sry + Math.PI;
  face.position.set(sx + out[0] * (d / 2 + 0.03), HALL.h + h / 2, sz + out[1] * (d / 2 + 0.03));
  g.add(face);
}

// ---------- The fence round the tracks ----------
export function buildYardFence(g, l) {
  for (const line of l.lines) {
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1], [bx, bz] = line[i];
      const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
      for (const y of [0.55, 1.45]) box(g, 0.08, 0.08, L, (ax + bx) / 2, y, (az + bz) / 2, C.fence, ry);
      const n = Math.max(1, Math.round(L / 3));
      for (let k = 0; k <= n; k++) box(g, 0.12, 1.6, 0.12, ax + ((bx - ax) * k) / n, 0.8, az + ((bz - az) * k) / n, C.fence);
    }
  }
  mergeStatic(g);
}
