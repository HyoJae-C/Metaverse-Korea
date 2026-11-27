// A thicket: a big mass of leaves as one shape, for woods you look at more
// than walk in (Yozi 2026-11-27: "instead of drawing trees one by one, a huge
// thicket can be one shape"). A tree here costs about 30 triangles (trunk and
// crown) and covers 2 m; a thicket costs 40 and covers 8-12 m, so a wood drawn
// with them is a quarter of the triangles or less. Made for Bukhansan
// (game/bukhansan-park.js); any park or hill can use it: draw the geometry
// with an InstancedMesh, one instance a thicket, at thicketSpots().
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The shape, about 1 m in radius and 1 m high (scale each instance: x and z
// its radius, y its height), its foot at y = 0: a mound of two rounded lumps.
export function thicketGeometry() {
  // (rounded lumps: wide flat octahedra read as tents, not leaves)
  const lump = (r, h, x, z, turn) => new THREE.IcosahedronGeometry(1, 0).rotateY(turn).scale(r, h, r).translate(x, h * 0.4, z);
  const g = mergeGeometries([lump(0.78, 1, -0.12, 0, 0.6), lump(0.6, 0.7, 0.5, 0.22, 1.4)]);
  g.computeVertexNormals();
  return g;
}

const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// Where thickets stand beside ways: both sides of each line (points [x, z]),
// one every `every` m, `from` to `to` m off it. ok(x, z): may one stand
// there. → [[x, z, radius, height, turn]]
export function thicketSpots(lines, { every = 7, from = 12, to = 24, r = [3.5, 6], h = [2.2, 3.6], ok = () => true } = {}) {
  const out = [];
  let n = 0;
  for (const p of lines) {
    let left = every / 2;
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az);
      if (len < 0.01) continue;
      const ux = (bx - ax) / len, uz = (bz - az) / len;
      for (; left <= len; left += every) {
        for (const side of [1, -1]) {
          n++;
          const off = from + hash(n, 1) * (to - from), slide = (hash(n, 2) - 0.5) * every;
          const x = ax + ux * (left + slide) - uz * side * off, z = az + uz * (left + slide) + ux * side * off;
          if (ok(x, z)) out.push([x, z, r[0] + hash(n, 3) * (r[1] - r[0]), h[0] + hash(n, 4) * (h[1] - h[0]), hash(n, 5) * 6]);
        }
      }
      left -= len;
    }
  }
  return out;
}
