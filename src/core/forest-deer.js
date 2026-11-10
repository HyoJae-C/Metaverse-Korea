// Seoul Forest's sika deer (꽃사슴): a few chibi deer in their paddock
// (core/park-art.js deerpen). Brown with white spots, a white rump; they
// wander about, stop to graze and look up. Downloaded the first time the
// paddock's fence is on screen.
//
// Every deer shares three InstancedMeshes (bodies, heads, legs), so the whole
// herd is three draw calls however many deer there are.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const BROWN = '#b8743f', CREAM = '#f1dcc0', WHITE = '#fffaf0', DARK = '#2a201c';

// One geometry from parts, each part keeping its colour as a vertex colour.
function baked(parts) {
  const c = new THREE.Color(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const geos = parts.map(([geo, color, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]]) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    g.applyMatrix4(m4.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz)));
    c.set(color);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
  return mergeGeometries(geos);
}
const ball = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);

// The body (with neck, spots, rump and tail), from the ground; front is +z.
function bodyGeo() {
  const parts = [
    [ball(0.3, 12, 10), BROWN, [0, 0.78, 0], [0.8, 0.82, 1.45]],
    [ball(0.24, 10, 8), CREAM, [0, 0.7, 0.02], [0.82, 0.6, 1.3]], // the pale belly
    [ball(0.14), WHITE, [0, 0.8, -0.38], [1, 1.1, 0.7]], // the white rump
    [ball(0.06, 6, 5), DARK, [0, 0.9, -0.45], [0.8, 1.4, 0.8]], // the tail
    [new THREE.CylinderGeometry(0.08, 0.12, 0.42, 8), BROWN, [0, 1.0, 0.3], [1, 1, 1], [0.55, 0, 0]], // the neck
  ];
  // white spots in two rows along each side of the back
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const z = -0.26 + k * 0.13;
      for (const [a, off] of [[0.55, 0], [0.95, 0.06]]) {
        parts.push([ball(0.032, 6, 5), WHITE, [s * Math.sin(a) * 0.235, 0.78 + Math.cos(a) * 0.24, z + off], [1, 0.6, 1]]);
      }
    }
  }
  return baked(parts);
}
// The head, about its pivot at the top of the neck; it looks along +z.
function headGeo() {
  const parts = [
    [ball(0.12), BROWN, [0, 0, 0.04], [0.85, 0.9, 1.25]],
    [ball(0.07, 8, 6), CREAM, [0, -0.04, 0.17], [1, 0.85, 1]], // the muzzle
    [ball(0.026, 6, 5), DARK, [0, -0.02, 0.235]], // the nose
  ];
  for (const s of [-1, 1]) {
    parts.push([ball(0.06, 8, 6), BROWN, [0.12 * s, 0.07, -0.02], [1.5, 0.55, 0.75], [0, 0, 0.45 * s]]); // ears
    parts.push([ball(0.04, 6, 5), '#f2b7a8', [0.125 * s, 0.072, 0.0], [1.3, 0.45, 0.3], [0, 0, 0.45 * s]]); // pink inside
    parts.push([ball(0.024, 8, 6), DARK, [0.068 * s, 0.035, 0.12]]); // eyes
    parts.push([ball(0.009, 5, 4), WHITE, [0.076 * s, 0.045, 0.138]]); // a glint
  }
  return baked(parts);
}
// A leg hanging down from its hip (y 0 at the hip), with a dark hoof.
function legGeo() {
  return baked([
    [new THREE.CylinderGeometry(0.038, 0.03, 0.66, 6), BROWN, [0, -0.33, 0]],
    [new THREE.CylinderGeometry(0.032, 0.036, 0.08, 6), DARK, [0, -0.66, 0]],
  ]);
}

const HIPS = [[-0.11, 0.24], [0.11, 0.24], [-0.11, -0.22], [0.11, -0.22]];
const HIP_Y = 0.72, NECK = [0, 1.15, 0.43];

function inside(x, z, p) {
  let ok = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ok = !ok;
  }
  return ok;
}
// Distance from (x, z) to the polygon's edge (to keep the deer off the fence).
function edgeDist(x, z, p) {
  let d = Infinity;
  for (let i = 0; i < p.length; i++) {
    const [ax, az] = p[i], [bx, bz] = p[(i + 1) % p.length];
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    d = Math.min(d, Math.hypot(ax + t * dx - x, az + t * dz - z));
  }
  return d;
}

// Adds n deer to group g (the paddock's group; pen: its corners in g's
// space). Returns a tick(t) to call every frame.
export function addDeer(g, pen, n = 4) {
  const xs = pen.map((q) => q[0]), zs = pen.map((q) => q[1]);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const spot = () => {
    for (let k = 0; k < 40; k++) {
      const x = Math.min(...xs) + rnd() * (Math.max(...xs) - Math.min(...xs)), z = Math.min(...zs) + rnd() * (Math.max(...zs) - Math.min(...zs));
      if (inside(x, z, pen) && edgeDist(x, z, pen) > 1.5 && Math.hypot(x, z) > 2.2) return [x, z]; // (off the fence and the hay rack)
    }
    return [0, 3];
  };
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const bodies = new THREE.InstancedMesh(bodyGeo(), material, n);
  const heads = new THREE.InstancedMesh(headGeo(), material, n);
  const legs = new THREE.InstancedMesh(legGeo(), material, n * 4);
  for (const m of [bodies, heads, legs]) {
    m.castShadow = true;
    m.frustumCulled = false; // (they move: no stale bounding sphere)
    m.userData.noSplit = true;
    g.add(m);
  }
  const herd = Array.from({ length: n }, (_, i) => {
    const [x, z] = spot();
    return { x, z, ry: rnd() * Math.PI * 2, s: i === n - 1 && n > 2 ? 0.68 : 0.95 + rnd() * 0.12, // the last one a fawn
      to: null, wait: rnd() * 4, graze: 0, phase: rnd() * 10, look: 0 };
  });
  const m4 = new THREE.Matrix4(), base = new THREE.Matrix4(), part = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();
  const e = new THREE.Euler();
  let last = null;
  return (t) => {
    const dt = last == null ? 0 : Math.min(0.1, t - last);
    last = t;
    herd.forEach((d, i) => {
      let moving = false;
      if (d.to) {
        const dx = d.to[0] - d.x, dz = d.to[1] - d.z, dist = Math.hypot(dx, dz);
        const want = Math.atan2(dx, dz);
        let turn = ((want - d.ry + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        d.ry += Math.max(-dt * 2.5, Math.min(dt * 2.5, turn));
        if (Math.abs(turn) < 0.6) {
          const step = Math.min(dist, dt * 0.7 * d.s);
          d.x += Math.sin(d.ry) * step; d.z += Math.cos(d.ry) * step;
          moving = true;
        }
        if (dist < 0.2) { d.to = null; d.wait = 3 + rnd() * 6; d.graze = rnd() < 0.7 ? 1 : 0; }
      } else if ((d.wait -= dt) <= 0) {
        d.to = spot();
        d.graze = 0;
      }
      d.look += ((d.graze ? 1 : 0) - d.look) * Math.min(1, dt * 2); // eases the head down to graze and up again
      const ph = t * 7 * (moving ? 1 : 0) + d.phase;
      const bob = moving ? Math.abs(Math.sin(ph)) * 0.025 : 0;
      base.compose(v.set(d.x, bob * d.s, d.z), q.setFromEuler(e.set(0, d.ry, 0)), sc.set(d.s, d.s, d.s));
      bodies.setMatrixAt(i, base);
      // the head: down to the grass while grazing, nibbling; otherwise looking about
      const pitch = d.look * 1.15 + Math.sin(t * 9 + d.phase) * 0.05 * d.look;
      const yaw = (1 - d.look) * Math.sin(t * 0.5 + d.phase) * 0.45;
      part.compose(v.set(NECK[0], NECK[1] - d.look * 0.22, NECK[2] + d.look * 0.08), q.setFromEuler(e.set(pitch, yaw, 0, 'YXZ')), one);
      heads.setMatrixAt(i, m4.multiplyMatrices(base, part));
      HIPS.forEach(([hx, hz], k) => {
        const swing = moving ? Math.sin(ph + (k === 0 || k === 3 ? 0 : Math.PI)) * 0.45 : 0;
        part.compose(v.set(hx, HIP_Y, hz), q.setFromEuler(e.set(swing, 0, 0)), one);
        legs.setMatrixAt(i * 4 + k, m4.multiplyMatrices(base, part));
      });
    });
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = legs.instanceMatrix.needsUpdate = true;
  };
}
