// 2D collision against building footprints using a uniform grid.

const CELL = 25;

export class CollisionMap {
  constructor(buildings) {
    this.cells = new Map();
    this.polys = [];
    this.decks = []; // walkable over what was there before (a pier over the river): addDeck
    this.add(buildings);
  }

  // More footprints after the map is built (a Han River park's kiosk, stalls
  // and railings, built when you first come near: game/han-parks.js).
  add(buildings) {
    for (const b of buildings) {
      if (b.m && b.m > 2) continue; // overhangs you can walk under
      const p = b.p;
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const [x, z] of p) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      const id = this.polys.push({ p, minX, minZ, maxX, maxZ, low: !!b.low }) - 1;
      for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++) {
        for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
          const k = cx + ',' + cz;
          if (!this.cells.has(k)) this.cells.set(k, []);
          this.cells.get(k).push(id);
        }
      }
    }
  }

  // A deck over footprints already here (a fishing pier over the river's
  // blocker): standing on it, those are ignored; footprints added later
  // (its railings) still count.
  addDeck(p) {
    const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
    const box = { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
    const skip = new Set();
    this.polys.forEach((q, id) => { if (q.minX <= box.maxX && q.maxX >= box.minX && q.minZ <= box.maxZ && q.maxZ >= box.minZ) skip.add(id); });
    this.decks.push({ p, ...box, skip });
  }

  // True if a circle at (x, z) with radius r overlaps any footprint (tall:
  // only the ones that would hide a camera, not low ones like a bench or a
  // railing, `low` when added).
  blocked(x, z, r, tall = false) {
    const seen = new Set();
    for (const d of this.decks) if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ && pointInPoly(x, z, d.p)) for (const id of d.skip) seen.add(id);
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++) {
      for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
        const ids = this.cells.get(cx + ',' + cz);
        if (!ids) continue;
        for (const id of ids) {
          if (seen.has(id)) continue;
          seen.add(id);
          const q = this.polys[id];
          if (tall && q.low) continue;
          if (x + r < q.minX || x - r > q.maxX || z + r < q.minZ || z - r > q.maxZ) continue;
          if (circleHitsPoly(x, z, r, q.p)) return true;
        }
      }
    }
    return false;
  }

  // Move from (x, z) by (dx, dz), sliding along walls. Returns [x, z].
  move(x, z, dx, dz, r) {
    if (!this.blocked(x + dx, z + dz, r)) return [x + dx, z + dz];
    if (!this.blocked(x + dx, z, r)) return [x + dx, z];
    if (!this.blocked(x, z + dz, r)) return [x, z + dz];
    return [x, z];
  }
}

export function pointInPoly(x, z, p) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i];
    const [xj, zj] = p[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function circleHitsPoly(x, z, r, p) {
  if (pointInPoly(x, z, p)) return true;
  const r2 = r * r;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if (distSqToSeg(x, z, p[j], p[i]) < r2) return true;
  }
  return false;
}

export function distSqToSeg(x, z, [x1, z1], [x2, z2]) {
  const dx = x2 - x1, dz = z2 - z1;
  const l2 = dx * dx + dz * dz;
  let t = l2 ? ((x - x1) * dx + (z - z1) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx - x, pz = z1 + t * dz - z;
  return px * px + pz * pz;
}

// Whether segment a–b properly crosses segment c–d (x/z pairs).
export function segmentsCross(ax, az, bx, bz, cx, cz, dx, dz) {
  const o = (px, pz, qx, qz, rx, rz) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
  const d1 = o(cx, cz, dx, dz, ax, az), d2 = o(cx, cz, dx, dz, bx, bz);
  const d3 = o(ax, az, bx, bz, cx, cz), d4 = o(ax, az, bx, bz, dx, dz);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
