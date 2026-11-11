// The Namsan summit plaza, out on the real hilltop (game/namsan-walk.js
// loads this when you come near): paving round the look-out tower, the
// railing hung with love locks (open where the trail comes up and towards
// the cable car's upper station), the love-lock heart, binoculars and beds
// of pines. The tower is the namsan landmark's (core/landmarks.js); the
// Namsan stamp's stand is data/stamps.js's.
import * as THREE from 'three';
import { loveLockHeart } from '../core/cablecar.js';
import { NAMSAN_WALK } from './namsan-walk.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const LOCK_COLS = ['#ff5d8f', '#ffd23f', '#5dade2', '#58d68d', '#af7ac5', '#f5b041', '#ec7063', '#ffffff'];

// scene, collision; l the namsan landmark; tower [x, z]; station (the upper
// station's door) and trailTop [x, z] or null; y the plaza's height.
export function buildNamsanSummit({ scene, collision, tower, station, trailTop, y, groundY }) {
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
  const gaps = [trailTop, station].filter(Boolean).map(([x, z]) => Math.atan2(z - tz, x - tx));
  const GAP = 2.6 / R; // half a gap's angle (5 m wide)
  const inGap = (a) => gaps.some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < GAP);
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

  // Beds of pines round the tower, clear of the ways in and the heart.
  for (const a of [0.9, 2.5, 3.9, 5.3]) {
    if (inGap(a)) continue;
    const bx = Math.cos(a) * 16, bz = Math.sin(a) * 16;
    if (Math.hypot(bx - W.heart[0], bz - W.heart[1]) < 6) continue;
    box(5, 0.5, 5, bx, Y + 0.25, bz, '#b9ad98');
    box(4.6, 0.1, 4.6, bx, Y + 0.52, bz, '#7fb06a');
    block(bx, bz, 5, 5);
    for (let k = 0; k < 3; k++) {
      const px = bx + (k - 1) * 1.5, pz = bz + ((k % 2) - 0.5) * 1.6;
      box(0.4, 1.6, 0.4, px, Y + 1.3, pz, '#7a5a3a');
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 7), mat('#3f7f49'));
      cone.position.set(px, Y + 3.8, pz);
      g.add(cone);
    }
  }

  collision?.add(blocks); // (all in world metres)
  return { group: g };
}
