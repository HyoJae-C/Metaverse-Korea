// Seoul National Cemetery (국립서울현충원): how high the ground is at a
// point. scripts/build-hyeonchungwon.mjs writes the numbers into the map's
// `hyeonchung` landmark (metres from the landmark's x, z); its grid, foot and
// trails are Haneul Park's kind (core/skypark-ground.js), and:
//
//   flats [{ p: [[x, z], ...], y }]  level ground: the court between
//         Hyeonchungmun and the tower, and the tower's terrace
//
// There are about 4 km of ways, so their pieces are kept in a grid of 16 m
// squares: a point looks only at the pieces near it.
import { inPoly, gridY, skyparkBox, footFade, SKYPARK_EASE } from './skypark-ground.js';

const CELL = 16;
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

const made = new WeakMap();
function index(l) {
  let ix = made.get(l);
  if (ix) return ix;
  const cells = new Map();
  for (const t of l.trails) {
    const reach = t.w / 2 + SKYPARK_EASE;
    for (let i = 1; i < t.p.length; i++) {
      const a = t.p[i - 1], b = t.p[i], s = { a, b, w: t.w };
      for (let cx = Math.floor((Math.min(a[0], b[0]) - reach) / CELL); cx <= Math.floor((Math.max(a[0], b[0]) + reach) / CELL); cx++) {
        for (let cz = Math.floor((Math.min(a[1], b[1]) - reach) / CELL); cz <= Math.floor((Math.max(a[1], b[1]) + reach) / CELL); cz++) {
          const k = cx * 4096 + cz;
          if (!cells.has(k)) cells.set(k, []);
          cells.get(k).push(s);
        }
      }
    }
  }
  const flats = (l.flats || []).map((f) => {
    const xs = f.p.map((q) => q[0]), zs = f.p.map((q) => q[1]);
    return { ...f, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  });
  made.set(l, (ix = { cells, flats, box: skyparkBox(l) }));
  return ix;
}

// The way under (x, z), landmark metres: { y, e (m past its edge; < 0 on it) }, or null when none is near.
export function wayNear(l, x, z) {
  const segs = index(l).cells.get(Math.floor(x / CELL) * 4096 + Math.floor(z / CELL));
  if (!segs) return null;
  let best = null;
  for (const s of segs) {
    const [ax, az, ay] = s.a, [bx, bz, by] = s.b, dx = bx - ax, dz = bz - az;
    let t = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const e = Math.hypot(x - ax - dx * t, z - az - dz * t) - s.w / 2;
    if (!best || e < best.e) best = { e, y: ay + (by - ay) * t };
  }
  return best;
}

// The level ground at (x, z), or null.
export function flatAt(l, x, z) {
  for (const f of index(l).flats) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && inPoly(x, z, f.p)) return f;
  return null;
}

// Height at (x, z) in landmark metres (0 off the grounds' hill).
export function hyeonchungHeight(l, x, z) {
  const [x0, z0, x1, z1] = index(l).box;
  if (x < x0 || x > x1 || z < z0 || z > z1) return 0;
  const f = flatAt(l, x, z);
  if (f) return f.y;
  let y = inPoly(x, z, l.foot) ? gridY(l.grid, x, z) * footFade(l.foot, x, z) : 0;
  const n = wayNear(l, x, z);
  if (n && n.e < SKYPARK_EASE) { const k = smooth(n.e / SKYPARK_EASE); y = n.y * (1 - k) + y * k; }
  return Math.max(0, y);
}

export const hyeonchungBox = skyparkBox;
