// Inwangsan and Bugaksan with the Seoul City Wall on their crest, from
// Sajik-ro up over Inwangsan, through Changuimun, over Bugaksan past
// Sukjeongmun to Waryong Park; and where the wall is gone in the city, a
// line of stones in the ground past Donuimun's and Sowuimun's sites. The
// numbers come from scripts/build-north-wall.mjs (the Gyeongbokgung map's
// `northwall` landmark; the height is core/north-ground.js, the wall's
// blockers are map items, both there from the start). game/north-wall-near.js
// loads this with import() when you come near.
import * as THREE from 'three';
import { stoneTexture, smallGate, MERLON, WALL_STONE } from './city-wall-parts.js';
import { addSnowCover } from '../core/snow-cover.js';
import { northBox } from '../core/north-ground.js';

const CELL = 8; // m: the hills' ground grid
const SINK = 0.15; // the grid is drawn this much lower (you walk on the true height)
const STEP = 2; // m: the wall follows the ground in pieces this long
const HIDE = 700; // m: past this from the hills, they are not drawn
const WOOD = 15; // m: one tree in each square this big
const TILE = 120; // m: the woods are drawn in tiles this big

// l: the northwall landmark (world x, z), y: (x, z) -> ground height.
export function buildNorthWall({ scene, l, y }) {
  const group = new THREE.Group();
  group.name = 'north-wall';
  const W = (p) => p.map(([x, z]) => [l.x + x, l.z + z]);
  const runs = l.runs.map(W);
  const T = l.thick, top = l.H - MERLON.h;
  const [bx0, bz0, bx1, bz1] = northBox(l);
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const nearWall = (x, z, m) => runs.some((p) => { for (let i = 1; i < p.length; i++) if (segD(x, z, p[i - 1], p[i]) < m) return true; return false; });

  { // The ground: a grid over the hills, only where they are above the plain.
    const pos = [];
    for (let z = bz0; z < bz1; z += CELL) for (let x = bx0; x < bx1; x += CELL) {
      const q = [[x, z], [x + CELL, z], [x + CELL, z + CELL], [x, z + CELL]].map(([a, b]) => [a, y(a, b), b]);
      if (Math.max(q[0][1], q[1][1], q[2][1], q[3][1]) < SINK) continue;
      for (const k of [0, 3, 2, 0, 2, 1]) pos.push(q[k][0], q[k][1] - SINK, q[k][2]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color: 0x9cc583 })));
    ground.name = 'ground-north';
    ground.receiveShadow = true;
    group.add(ground);
  }

  const merlons = []; // [x, z, y, ry]
  { // The wall: a stone body from below the ground on its low side to its
    // top, following the slope, and the parapet's blocks along its top.
    const pos = [], uv = [], idx = [];
    const quad = (a, b, c, d, ua, ub, va, vb) => {
      const s = pos.length / 3;
      pos.push(...a, ...b, ...c, ...d);
      uv.push(ua, va, ub, va, ub, vb, ua, vb);
      idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    };
    const U = 1 / 2.4, V = 1 / 1.2;
    for (const p of runs) {
      let u = 0;
      for (let i = 1; i < p.length; i++) {
        const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az);
        if (len < 0.01) continue;
        const ux = (bx - ax) / len, uz = (bz - az) / len, nx = uz * T / 2, nz = -ux * T / 2;
        const n = Math.max(1, Math.ceil(len / STEP));
        for (let k = 0; k < n; k++) {
          const s0 = (len * k) / n - (k === 0 ? 0.2 : 0), s1 = (len * (k + 1)) / n + (k === n - 1 ? 0.2 : 0);
          const at = (s) => {
            const x = ax + ux * s, z = az + uz * s, g = y(x, z);
            return { x, z, y0: Math.min(y(x + nx, z + nz), y(x - nx, z - nz), g) - 0.6, y1: g + top };
          };
          const A = at(s0), B = at(s1);
          const L = [A.x + nx, A.z + nz], Lb = [B.x + nx, B.z + nz], Rg = [A.x - nx, A.z - nz], Rb = [B.x - nx, B.z - nz];
          const ua = (u + s0) * U, ub = (u + s1) * U;
          quad([Rg[0], A.y0, Rg[1]], [Rb[0], B.y0, Rb[1]], [Rb[0], B.y1, Rb[1]], [Rg[0], A.y1, Rg[1]], ua, ub, A.y0 * V, A.y1 * V);
          quad([Lb[0], B.y0, Lb[1]], [L[0], A.y0, L[1]], [L[0], A.y1, L[1]], [Lb[0], B.y1, Lb[1]], ub, ua, B.y0 * V, B.y1 * V);
          quad([Rg[0], A.y1, Rg[1]], [Rb[0], B.y1, Rb[1]], [Lb[0], B.y1, Lb[1]], [L[0], A.y1, L[1]], ua, ub, 0, T * V);
        }
        for (let s = 0.6; s + MERLON.len / 2 < len; s += MERLON.len + MERLON.gap) {
          const x = ax + ux * (s + MERLON.len / 2), z = az + uz * (s + MERLON.len / 2);
          merlons.push([x, z, y(x, z) + top, Math.atan2(-uz, ux)]);
        }
        u += len;
      }
      for (const [k, o] of [[0, 1], [p.length - 1, p.length - 2]]) { // the stretch's ends
        const [x0, z0] = p[k], [x1, z1] = p[o], len = Math.hypot(x0 - x1, z0 - z1) || 1;
        const ux = (x0 - x1) / len, uz = (z0 - z1) / len, nx = uz * T / 2, nz = -ux * T / 2, ex = x0 + ux * 0.2, ez = z0 + uz * 0.2;
        const g = y(ex, ez), y0 = Math.min(g, y(ex + nx, ez + nz), y(ex - nx, ez - nz)) - 0.6, y1 = g + top;
        quad([ex - nx, y0, ez - nz], [ex + nx, y0, ez + nz], [ex + nx, y1, ez + nz], [ex - nx, y1, ez - nz], 0, T * U, y0 * V, y1 * V);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = stoneTexture();
    const wall = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: tex ? 0xffffff : WALL_STONE, map: tex, side: THREE.DoubleSide }));
    wall.name = 'wall-north';
    wall.castShadow = wall.receiveShadow = true;
    group.add(wall);
    const block = new THREE.BoxGeometry(MERLON.len, MERLON.h, MERLON.t).translate(0, MERLON.h / 2, 0);
    const blocks = new THREE.InstancedMesh(block, new THREE.MeshLambertMaterial({ color: WALL_STONE, map: tex }), merlons.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    merlons.forEach(([x, z, yy, ry], i) => blocks.setMatrixAt(i, m4.compose(new THREE.Vector3(x, yy, z), q.setFromAxisAngle(up, ry), one)));
    blocks.castShadow = true;
    group.add(blocks);
  }

  // Changuimun and Sukjeongmun, 43.75% like Hyehwamun.
  for (const gt of l.gates) {
    const g = smallGate(gt, gt.n.en.toLowerCase());
    const gx = l.x + gt.x, gz = l.z + gt.z;
    g.position.set(gx, y(gx, gz), gz);
    g.rotation.y = gt.ry;
    group.add(g);
  }
  // (m: room either side of the gate, f: in front of and behind it)
  const inGate = (x, z, m, f) => l.gates.some((gt) => {
    const c = Math.cos(gt.ry), s = Math.sin(gt.ry), dx = x - l.x - gt.x, dz = z - l.z - gt.z;
    return Math.abs(dx * c - dz * s) < gt.W / 2 + m && Math.abs(dx * s + dz * c) < gt.D / 2 + f;
  });

  { // Woods over the hills: none on the wall or on the way through the gates.
    // Fewer, bigger trees than Namsan's (the hills are big), in tiles so the
    // ones behind you are not drawn.
    let seed = 41;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const tiles = new Map();
    for (let z = bz0; z < bz1; z += WOOD) for (let x = bx0; x < bx1; x += WOOD) {
      const px = x + rnd() * WOOD, pz = z + rnd() * WOOD, h = y(px, pz), sc = 1 + rnd() * 0.6;
      if (h < 1.2 || nearWall(px, pz, T / 2 + 3) || inGate(px, pz, 4, 22)) continue;
      const k = `${Math.floor((px - bx0) / TILE)},${Math.floor((pz - bz0) / TILE)}`;
      if (!tiles.has(k)) tiles.set(k, []);
      tiles.get(k).push([px, h, pz, sc]);
    }
    const crown = new THREE.IcosahedronGeometry(2.4, 0).translate(0, 2.6, 0);
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true });
    const greens = ['#5c9648', '#6aa852', '#4c8540', '#78b060', '#567f3e'].map((c) => new THREE.Color(c));
    const m4 = new THREE.Matrix4(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), q = new THREE.Quaternion();
    let n = 0;
    for (const spots of tiles.values()) {
      const crowns = new THREE.InstancedMesh(crown, mat, spots.length);
      spots.forEach(([x, h, z, sc], i) => {
        crowns.setMatrixAt(i, m4.compose(p3.set(x, h - 0.5, z), q, s3.set(sc, sc * (0.9 + (n % 5) * 0.08), sc)));
        crowns.setColorAt(i, greens[n++ % greens.length]);
      });
      crowns.computeBoundingSphere();
      crowns.name = 'woods-north';
      group.add(crowns);
    }
  }

  { // Where the wall is gone: a line of dark stones in the ground, and a
    // marker stone at each lost gate's site.
    const pos = [];
    const w = l.markW / 2;
    for (const p of (l.marks || []).map(W)) for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az) || 1;
      const nx = -(bz - az) / len * w, nz = (bx - ax) / len * w, e = 0.05;
      const a = [ax + nx, e, az + nz], b = [ax - nx, e, az - nz], c = [bx - nx, e, bz - nz], d = [bx + nx, e, bz + nz];
      pos.push(...a, ...d, ...b, ...b, ...d, ...c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const line = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: '#6d6a63', polygonOffset: true, polygonOffsetFactor: -2 }));
    line.name = 'wall-line';
    line.receiveShadow = true;
    group.add(line);
    const stone = new THREE.MeshLambertMaterial({ color: '#9b958a' });
    for (const s of l.sites || []) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.35), stone);
      m.position.set(l.x + s.x, 0.45, l.z + s.z);
      m.castShadow = true;
      group.add(m);
    }
  }
  scene.add(group);

  return {
    group,
    update(p) {
      const dx = Math.max(bx0 - p.x, 0, p.x - bx1), dz = Math.max(bz0 - p.z, 0, p.z - bz1);
      const show = Math.hypot(dx, dz) < HIDE;
      if (group.visible !== show) group.visible = show;
    },
  };
}
