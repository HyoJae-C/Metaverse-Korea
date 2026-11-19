// The Namsan summit plaza, out on the real hilltop (game/namsan-walk.js
// loads this when you come near): paving round the look-out tower, the
// railing hung with love locks (open where the trail comes up and towards
// the cable car's upper station), the love-lock heart, binoculars and beds
// of pines, and Palgakjeong, the octagonal pavilion (seats on its floor
// edge, returned as `seats`). The tower is the namsan landmark's (core/landmarks.js); the
// Namsan stamp's stand is data/stamps.js's.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loveLockHeart } from '../core/cablecar.js';
import { NAMSAN_WALK, PALGAK } from './namsan-walk.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const LOCK_COLS = ['#ff5d8f', '#ffd23f', '#5dade2', '#58d68d', '#af7ac5', '#f5b041', '#ec7063', '#ffffff'];

// scene, collision; l the namsan landmark; tower [x, z]; station (the upper
// station's door) or null; trails: the lines [[x, z]...] that come up to the
// plaza (the railing opens where each crosses it); y the plaza's height.
export function buildNamsanSummit({ scene, collision, tower, station, trails = [], y, groundY }) {
  const W = NAMSAN_WALK, [tx, tz] = tower, Y = y + 0.06;
  const g = new THREE.Group();
  g.name = 'namsan-summit';
  g.position.set(tx, 0, tz);
  scene.add(g);
  const blocks = [];
  const block = (x, z, sx, sz) => blocks.push({ p: [[tx + x - sx / 2, tz + z - sz / 2], [tx + x + sx / 2, tz + z - sz / 2], [tx + x + sx / 2, tz + z + sz / 2], [tx + x - sx / 2, tz + z + sz / 2]] });
  const box = (sx, sy, sz, x, yy, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c)); m.position.set(x, yy, z); g.add(m); return m; };

  // Paving: a pale disc, a darker ring at its edge.
  const pave = new THREE.Mesh(new THREE.CircleGeometry(W.plazaR, 48).rotateX(-Math.PI / 2), mat('#d9d2c3'));
  pave.position.y = Y;
  g.add(pave);
  const edge = new THREE.Mesh(new THREE.RingGeometry(W.plazaR - 1.2, W.plazaR, 48).rotateX(-Math.PI / 2), mat('#b9ad98'));
  edge.position.y = Y + 0.01;
  g.add(edge);
  blocks.push({ p: Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * Math.PI * 2; return [tx + Math.cos(a) * W.towerR, tz + Math.sin(a) * W.towerR]; }) }); // the tower's terrace

  // The railing round the edge, with gaps for the trail and the station.
  const R = W.plazaR - 0.6;
  // The railing opens where a trail runs through it (within 3.2 m of its
  // line: a trail can cross the ring at a slant), and towards the station.
  // (The Sowol-ro trail and the city wall's west trail came up against it:
  // only the Sowol-ro trail's last point used to count. Yozi 2026-11-18)
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const trailD = (x, z) => { let d = Infinity; for (const p of trails) for (let i = 1; i < p.length; i++) d = Math.min(d, segD(x, z, p[i - 1], p[i])); return d; };
  const onTrail = (a, m) => trailD(tx + Math.cos(a) * R, tz + Math.sin(a) * R) < m;
  const gaps = [station].filter(Boolean).map(([x, z]) => Math.atan2(z - tz, x - tx));
  const GAP = 2.6 / R; // half a gap's angle (5 m wide)
  const inGap = (a) => gaps.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < GAP) || onTrail(a, 3.2);
  const STEP = 2.5 / R, N = Math.ceil((Math.PI * 2) / STEP);
  const locks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.18, 0.06), new THREE.MeshLambertMaterial({ color: '#ffffff' }), 1400);
  const lockCols = LOCK_COLS.map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  let nl = 0, seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const a0 = i * STEP, a1 = Math.min((i + 1) * STEP, Math.PI * 2);
    if (inGap(a0) || inGap(a1)) continue;
    const p0 = [Math.cos(a0) * R, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, Math.sin(a1) * R];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), cx = (p0[0] + p1[0]) / 2, cz = (p0[1] + p1[1]) / 2, ry = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);
    box(0.12, 1.1, 0.12, p0[0], Y + 0.55, p0[1], '#8a8f99');
    box(0.12, 0.1, len, cx, Y + 1.05, cz, '#8a8f99').rotation.y = ry;
    box(0.08, 0.08, len, cx, Y + 0.55, cz, '#8a8f99').rotation.y = ry;
    blocks.push({ p: [p0, p1, [p1[0] * 1.03, p1[1] * 1.03], [p0[0] * 1.03, p0[1] * 1.03]].map(([x, z]) => [tx + x, tz + z]), low: true });
    q.setFromAxisAngle(up, ry + Math.PI / 2);
    for (let s = 0.2; s < len && nl < 1400; s += 0.16) {
      if (rnd() < 0.35) continue;
      const k = s / len;
      m4.compose(new THREE.Vector3(p0[0] + (p1[0] - p0[0]) * k, Y + 0.62 + rnd() * 0.42, p0[1] + (p1[1] - p0[1]) * k), q, one);
      locks.setMatrixAt(nl, m4);
      locks.setColorAt(nl, lockCols[nl % lockCols.length]);
      nl++;
    }
  }
  locks.count = nl;
  g.add(locks);

  // A paved way from the plaza's edge to the upper station's door.
  if (station) {
    const sx = station[0] - tx, sz = station[1] - tz, d = Math.hypot(sx, sz), ux = sx / d, uz = sz / d, nx = -uz * 2, nz = ux * 2;
    const a0 = [ux * (W.plazaR - 1), uz * (W.plazaR - 1)], a1 = [sx + ux * 1.5, sz + uz * 1.5];
    const y0 = Y + 0.005, y1 = groundY(tx + a1[0], tz + a1[1]) + 0.06;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([
      a0[0] + nx, y0, a0[1] + nz, a1[0] + nx, y1, a1[1] + nz, a0[0] - nx, y0, a0[1] - nz,
      a0[0] - nx, y0, a0[1] - nz, a1[0] + nx, y1, a1[1] + nz, a1[0] - nx, y1, a1[1] - nz,
    ], 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: '#d9d2c3', side: THREE.DoubleSide })));
  }

  // The love-lock heart, on the west side, facing into the plaza.
  loveLockHeart(g, block, Y, { x: W.heart[0], z: W.heart[1] }, Math.PI / 2);

  // Binoculars looking out: south over Itaewon to the Han, north over Myeongdong.
  for (const a of [Math.PI / 2 + 0.25, -Math.PI / 2 + 0.35]) {
    const bx = Math.cos(a) * (R - 1.6), bz = Math.sin(a) * (R - 1.6);
    box(0.18, 1, 0.18, bx, Y + 0.5, bz, '#3a3f46');
    const head = box(0.6, 0.35, 0.5, bx, Y + 1.15, bz, '#2f6f8f');
    head.rotation.y = Math.atan2(bx, bz);
    block(bx, bz, 0.6, 0.6);
  }

  // Palgakjeong (north-west, on its real spot).
  const seats = palgakjeong(g, block, Y, W.palgak).map((q) => ({ ...q, x: tx + q.x, z: tz + q.z, y: q.y, stand: [tx + q.stand[0], tz + q.stand[1]], street: true }));

  // Beds of pines round the tower, clear of the ways in, the heart and Palgakjeong.
  for (const a of [0.9, 2.5, 3.9, 5.3]) {
    if (inGap(a)) continue;
    const bx = Math.cos(a) * 16, bz = Math.sin(a) * 16;
    if (Math.hypot(bx - W.palgak[0], bz - W.palgak[1]) < PALGAK.steps[0][0] + 4) continue;
    if (trailD(tx + bx, tz + bz) < 5.5) continue; // (not on a trail's way across the plaza)
    if (Math.hypot(bx - W.heart[0], bz - W.heart[1]) < 6) continue;
    box(5, 0.5, 5, bx, Y + 0.25, bz, '#b9ad98');
    box(4.6, 0.1, 4.6, bx, Y + 0.52, bz, '#7fb06a');
    block(bx, bz, 5, 5);
    for (let k = 1; k < 2; k++) { // (one pine a bed: Yozi 2026-11-17, a few left on the summit)
      const px = bx + (k - 1) * 1.5, pz = bz + ((k % 2) - 0.5) * 1.6;
      box(0.4, 1.6, 0.4, px, Y + 1.3, pz, '#7a5a3a');
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 7), mat('#3f7f49'));
      cone.position.set(px, Y + 3.8, pz);
      g.add(cone);
    }
  }

  collision?.add(blocks); // (all in world metres)
  return { group: g, seats };
}

// Palgakjeong after Yozi's photo (2026-11-19): a stepped granite base, eight
// red columns, beams painted in dancheong (green and teal with a red line),
// a grey tiled octagonal roof with upturned corners and a dark finial. Open
// between the columns: you walk in. g: the summit group (tower-relative);
// block(x, z, sx, sz): a collider; Y: the plaza's height; [px, pz]: where.
// Returns seats on the floor edge between the columns, facing out.
const PAL_MAT = {};
const palMat = (c) => (PAL_MAT[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
function palgakjeong(g, block, Y, [px, pz]) {
  const P = PALGAK, top = P.steps.at(-1)[1], fy = Y + top;
  const parts = {};
  const put = (c, geo) => (parts[c] ||= []).push(geo.index ? geo.toNonIndexed() : geo);
  const oct = (c, rt, rb, h, y, x = px, z = pz) => put(c, new THREE.CylinderGeometry(rt, rb, h, 8).translate(x, y + h / 2, z));
  // The base: three octagonal steps of granite.
  let y0 = Y;
  for (const [r, t] of P.steps) { oct('#cfcac0', r, r, Y + t - y0, y0); y0 = Y + t; }
  // Eight red columns at the corners (stand at the octagon's corners, θ = kπ/4).
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, cx = px + Math.sin(a) * P.colR, cz = pz + Math.cos(a) * P.colR;
    put('#b8322c', new THREE.CylinderGeometry(0.1, 0.11, P.colH, 8).translate(cx, fy + P.colH / 2, cz));
    block(cx, cz, 0.26, 0.26);
  }
  // The beams over them, painted: green, a red line, teal.
  const by = fy + P.colH;
  oct('#2f8a6a', P.colR + 0.12, P.colR + 0.12, 0.16, by - 0.16);
  oct('#c0392b', P.colR + 0.14, P.colR + 0.14, 0.05, by);
  oct('#3aa3a0', P.colR + 0.2, P.colR + 0.14, 0.18, by + 0.05);
  // The roof: the eaves' underside, the tiled roof, a ridge at each corner
  // with its end turned up, the finial.
  const ry = by + 0.23;
  oct('#365c52', P.eave, P.colR + 0.2, 0.18, ry); // the painted rafters under the eaves
  oct('#6e7176', P.eave * 0.32, P.eave + 0.05, 0.85, ry + 0.18); // the tiles
  oct('#5d6066', 0.22, P.eave * 0.32, 0.3, ry + 1.03);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, s = Math.sin(a), c = Math.cos(a);
    const ridge = new THREE.BoxGeometry(0.12, 0.12, P.eave * 0.75).translate(0, 0, P.eave * 0.62).rotateX(0.42).rotateY(a);
    put('#e6e2da', ridge.translate(px, ry + 1.2, pz)); // the white-mortared ridge down each corner
    const tip = new THREE.BoxGeometry(0.14, 0.14, 0.45).rotateX(-0.55).rotateY(a);
    put('#5d6066', tip.translate(px + s * (P.eave + 0.08), ry + 0.33, pz + c * (P.eave + 0.08))); // its end, turned up
  }
  put('#3b2f2a', new THREE.CylinderGeometry(0.12, 0.16, 0.35, 8).translate(px, ry + 1.48, pz));
  put('#3b2f2a', new THREE.SphereGeometry(0.15, 8, 6).translate(px, ry + 1.75, pz)); // the finial (jeolbyeongtong)
  for (const [c, list] of Object.entries(parts)) g.add(new THREE.Mesh(mergeGeometries(list), palMat(c)));
  // Seats: on the floor's edge between the columns, legs over the top step, facing out.
  const seats = [];
  const er = P.steps.at(-1)[0] * Math.cos(Math.PI / 8) - 0.15;
  for (const k of [1, 3, 5, 7]) {
    const a = Math.PI / 8 + (k * Math.PI) / 4, s = Math.sin(a), c = Math.cos(a);
    seats.push({ x: px + s * er, z: pz + c * er, y: fy, ry: a, stand: [px + s * (er - 0.9), pz + c * (er - 0.9)] });
  }
  return seats;
}
