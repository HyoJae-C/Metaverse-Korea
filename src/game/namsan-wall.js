// The Seoul City Wall on Namsan, from the west slope over the summit and down
// through Jangchung-dong to Gwanghuimun: the wall with its parapet on the
// hill's ground, Gwanghuimun at 43.75%, and woods along the trail off the
// hill. The numbers come from scripts/build-namsan-wall.mjs (the namsan
// landmark's `wall` and `wtrail`; the trail's decks, the wall's blockers off
// the hill and the trail's roads are there from the start: game/namsan-walk.js,
// itaewon.json). game/namsan-walk.js loads this with import() when you come
// near.
import * as THREE from 'three';
import { stoneTexture, smallGate, MERLON, WALL_STONE } from './city-wall-parts.js';

const HIDE = 700; // m: past this from the wall, it is not drawn
const STEP = 2; // m: the wall follows the ground in pieces this long

// l: the namsan landmark (world x, z), y: (x, z) -> ground height,
// roads: the joined map's (the trail's are marked hw), buildings, blockers.
export function buildNamsanWall({ scene, l, y, roads = [], buildings = [] }) {
  const { thick: T, H, runs, gate } = l.wall;
  const group = new THREE.Group();
  group.name = 'namsan-wall';
  const W = (p) => p.map(([x, z]) => [l.x + x, l.z + z]);
  const lines = runs.map(W);
  const top = H - MERLON.h; // the body's top above the ground at its middle

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
    const U = 1 / 2.4, V = 1 / 1.2; // (texture: blocks 0.6 m long, a course every 0.3 m)
    for (const p of lines) {
      let u = 0;
      for (let i = 1; i < p.length; i++) {
        const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az);
        if (len < 0.01) continue;
        const ux = (bx - ax) / len, uz = (bz - az) / len, nx = uz * T / 2, nz = -ux * T / 2;
        const n = Math.max(1, Math.ceil(len / STEP));
        for (let k = 0; k < n; k++) {
          const e0 = k === 0 ? -0.2 : 0, e1 = k === n - 1 ? 0.2 : 0; // (a little past the bends)
          const s0 = (len * k) / n + e0, s1 = (len * (k + 1)) / n + e1;
          const at = (s) => {
            const x = ax + ux * s, z = az + uz * s;
            const g = y(x, z), lo = Math.min(y(x + nx, z + nz), y(x - nx, z - nz), g);
            return { x, z, y0: lo - 0.6, y1: g + top };
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
      // The stretch's ends: a face across the wall.
      for (const [k, o] of [[0, 1], [p.length - 1, p.length - 2]]) {
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
    wall.name = 'wall-namsan';
    wall.castShadow = wall.receiveShadow = true;
    group.add(wall);
    const block = new THREE.BoxGeometry(MERLON.len, MERLON.h, MERLON.t).translate(0, MERLON.h / 2, 0);
    const blocks = new THREE.InstancedMesh(block, new THREE.MeshLambertMaterial({ color: WALL_STONE, map: tex }), merlons.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    merlons.forEach(([x, z, yy, ry], i) => blocks.setMatrixAt(i, m4.compose(new THREE.Vector3(x, yy, z), q.setFromAxisAngle(up, ry), one)));
    blocks.castShadow = true;
    group.add(blocks);
  }

  { // Gwanghuimun (광희문), 43.75%, like Hyehwamun.
    const g = smallGate(gate, 'gwanghuimun');
    const gx = l.x + gate.x, gz = l.z + gate.z;
    g.position.set(gx, y(gx, gz), gz);
    g.rotation.y = gate.ry;
    group.add(g);
  }

  { // Woods along the trail where it is off the hill (Jangchung-dong, below
    // the Shilla's grounds), clear of the trail, the wall, the streets and
    // the buildings.
    const trail = roads.filter((r) => r.hw);
    const streets = roads.filter((r) => !r.hw);
    const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
    const lineD = (x, z, p) => { let b = Infinity; for (let i = 1; i < p.length; i++) b = Math.min(b, segD(x, z, p[i - 1], p[i])); return b; };
    const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
    const near = buildings.filter((b) => b.p.some(([x, z]) => trail.some((r) => lineD(x, z, r.p) < 40)));
    let seed = 23;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const spots = [];
    for (const r of trail) for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i], len = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < len; s += 3.2) {
        const t = s / len, cx = ax + (bx - ax) * t, cz = az + (bz - az) * t;
        if (y(cx, cz) > 0.05) continue; // (on the hill, the hill's own trees)
        for (const side of [-1, 1]) {
          const d = 3 + rnd() * 9, x = cx + (-(bz - az) / len) * d * side + (rnd() - 0.5) * 2, z = cz + ((bx - ax) / len) * d * side + (rnd() - 0.5) * 2;
          if (lineD(x, z, r.p) < 2.6 || trail.some((q) => lineD(x, z, q.p) < 2.6) || lines.some((p) => lineD(x, z, p) < T / 2 + 1.4)) continue;
          if (streets.some((q) => lineD(x, z, q.p) < q.w / 2 + 2) || near.some((b) => inPoly(x, z, b.p))) continue;
          if (Math.hypot(x - l.x - gate.x, z - l.z - gate.z) < 9) continue; // (Gwanghuimun in view)
          spots.push([x, z, 0.8 + rnd() * 0.6]);
        }
      }
    }
    const trunk = new THREE.CylinderGeometry(0.14, 0.2, 2.2, 4, 1, true).translate(0, 1.1, 0);
    const crown = new THREE.IcosahedronGeometry(1.7, 0).translate(0, 3.1, 0);
    const trunks = new THREE.InstancedMesh(trunk, new THREE.MeshLambertMaterial({ color: '#6b5440' }), spots.length);
    const crowns = new THREE.InstancedMesh(crown, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), spots.length);
    const greens = ['#5f9a4a', '#6fae55', '#4f8a43', '#7bb463'].map((c) => new THREE.Color(c));
    const m4 = new THREE.Matrix4(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), q = new THREE.Quaternion();
    spots.forEach(([x, z, sc], i) => {
      m4.compose(p3.set(x, -0.1, z), q, s3.set(sc, sc, sc));
      trunks.setMatrixAt(i, m4);
      crowns.setMatrixAt(i, m4);
      crowns.setColorAt(i, greens[i % greens.length]);
    });
    group.add(trunks, crowns);
  }
  scene.add(group);

  const pts = lines.flat();
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  return {
    group,
    update(p) {
      const dx = Math.max(x0 - p.x, 0, p.x - x1), dz = Math.max(z0 - p.z, 0, p.z - z1);
      const show = Math.hypot(dx, dz) < HIDE;
      if (group.visible !== show) group.visible = show;
    },
  };
}
