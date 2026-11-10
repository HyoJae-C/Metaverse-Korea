// Walking routes that never go through walls: a 1 m grid of the open ground
// (buildings, rivers and walls ruled out, with room for a person's width),
// searched with A*. Cells on or next to a street cost less, so the route
// still follows the streets the way people walk, and only leaves them for
// the last few metres to a door or across a square.
//
// The grid is built once from the collision map. A route is planned once per
// destination and re-planned only when the player wanders off it.

import { distSqToSeg } from './collision.js';

const SQ2 = Math.SQRT2;
const ROAD_COST = 1, OPEN_COST = 1.7;

export class NavGrid {
  // polys: wall footprints ([[x, z], ...]); r: a person's radius. roads:
  // map roads ({ p, w }). bounds: { minX, minZ, maxX, maxZ }.
  constructor(polys, roads, bounds, { cell = 1, r = 0.45 } = {}) {
    this.cell = cell;
    this.x0 = Math.floor(bounds.minX) - 2;
    this.z0 = Math.floor(bounds.minZ) - 2;
    this.w = Math.ceil((bounds.maxX - this.x0) / cell) + 3;
    this.h = Math.ceil((bounds.maxZ - this.z0) / cell) + 3;
    const N = this.w * this.h;
    this.cost = new Float32Array(N).fill(OPEN_COST); // 0 = blocked
    const r2 = r * r;
    // Each wall: fill the cells whose centre is inside it row by row (the
    // same even-odd rule as pointInPoly), then the cells within a person's
    // radius of each edge. Checking every cell of a wall's bounding box
    // against every edge took over a minute on phones for the long river
    // outlines (hundreds of corners, a kilometre across).
    const xs = [];
    for (const p of polys) {
      let minZ = Infinity, maxZ = -Infinity;
      for (const [, z] of p) { minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      const j0 = Math.max(0, this._j(minZ)), j1 = Math.min(this.h - 1, this._j(maxZ));
      for (let j = j0; j <= j1; j++) {
        const z = this.z0 + (j + 0.5) * cell;
        xs.length = 0;
        for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
          const [xi, zi] = p[a], [xj, zj] = p[b];
          if (zi > z !== zj > z) xs.push(((xj - xi) * (z - zi)) / (zj - zi) + xi);
        }
        xs.sort((u, v) => u - v);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          // centres x with xs[k] <= x < xs[k + 1]
          const i0 = Math.max(0, Math.ceil((xs[k] - this.x0) / cell - 0.5));
          const i1 = Math.min(this.w - 1, Math.ceil((xs[k + 1] - this.x0) / cell - 0.5) - 1);
          for (let i = i0; i <= i1; i++) this.cost[j * this.w + i] = 0;
        }
      }
      // Walk along each edge and rule out the cells near it.
      const R = Math.ceil(r / cell) + 1;
      for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
        const A = p[b], B = p[a];
        const n = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / cell));
        for (let s = 0; s <= n; s++) {
          const ci = this._i(A[0] + ((B[0] - A[0]) * s) / n), cj = this._j(A[1] + ((B[1] - A[1]) * s) / n);
          for (let j = Math.max(0, cj - R); j <= Math.min(this.h - 1, cj + R); j++) {
            for (let i = Math.max(0, ci - R); i <= Math.min(this.w - 1, ci + R); i++) {
              const id = j * this.w + i;
              if (this.cost[id] && distSqToSeg(this.x0 + (i + 0.5) * cell, this.z0 + (j + 0.5) * cell, A, B) < r2) this.cost[id] = 0;
            }
          }
        }
      }
    }
    for (const r of roads || []) {
      const half = Math.max(1.5, (r.w || 6) / 2);
      for (let k = 1; k < r.p.length; k++) {
        const [x1, z1] = r.p[k - 1], [x2, z2] = r.p[k];
        const n = Math.ceil(Math.hypot(x2 - x1, z2 - z1) / (cell * 0.5));
        for (let s = 0; s <= n; s++) {
          const x = x1 + ((x2 - x1) * s) / n, z = z1 + ((z2 - z1) * s) / n;
          const ci = this._i(x), cj = this._j(z), rad = Math.ceil(half / cell);
          for (let dj = -rad; dj <= rad; dj++) for (let di = -rad; di <= rad; di++) {
            const i = ci + di, j = cj + dj;
            if (i < 0 || j < 0 || i >= this.w || j >= this.h) continue;
            const id = j * this.w + i;
            if (this.cost[id] && Math.hypot(di, dj) * cell <= half) this.cost[id] = ROAD_COST;
          }
        }
      }
    }
    this.g = new Float32Array(N);
    this.from = new Int32Array(N);
    this.stamp = new Uint32Array(N);
    this.closed = new Uint32Array(N);
    this.run = 0;
  }

  _i(x) { return Math.floor((x - this.x0) / this.cell); }
  _j(z) { return Math.floor((z - this.z0) / this.cell); }
  _x(id) { return this.x0 + ((id % this.w) + 0.5) * this.cell; }
  _z(id) { return this.z0 + (Math.floor(id / this.w) + 0.5) * this.cell; }
  open(x, z) {
    const i = this._i(x), j = this._j(z);
    return i >= 0 && j >= 0 && i < this.w && j < this.h && this.cost[j * this.w + i] > 0;
  }

  // The nearest open cell to (x, z), searching outwards up to `max` metres.
  nearestOpen(x, z, max = 12) {
    const ci = this._i(x), cj = this._j(z);
    const R = Math.ceil(max / this.cell);
    for (let r = 0; r <= R; r++) {
      let best = -1, bd = Infinity;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= this.w || j >= this.h || !this.cost[j * this.w + i]) continue;
        const d = di * di + dj * dj;
        if (d < bd) { bd = d; best = j * this.w + i; }
      }
      if (best >= 0) return best;
    }
    return -1;
  }

  // Polyline [[x, z], ...] from a to b around every wall, or null when b
  // can't be reached (or the search gives up after `limit` cells).
  route(ax, az, bx, bz, limit = 600000) {
    const s = this.nearestOpen(ax, az), e = this.nearestOpen(bx, bz);
    if (s < 0 || e < 0) return null;
    // A far place the search gave up on is not searched again for 10 s: the
    // guide re-plans every half second while you walk off its line, and
    // a search that runs to the limit (about 0.4 s on a laptop) each time
    // stalled phones and made them hot.
    const now = performance.now();
    if (this.miss && this.miss.e === e && this.miss.until > now) return null;
    const ids = this._search(s, e, limit);
    if (!ids) { this.miss = { e, until: now + 10000 }; return null; }
    const pts = ids.map((id) => [this._x(id), this._z(id)]);
    pts[0] = [ax, az];
    const out = this._simplify(pts);
    // End at the real destination when it's a step away (a door in a wall).
    const last = out[out.length - 1];
    if (Math.hypot(bx - last[0], bz - last[1]) < 3) out.push([bx, bz]);
    return out;
  }

  _search(s, e, limit) {
    const { w, cost, g, from, stamp, closed } = this;
    const run = ++this.run;
    const ex = e % w, ez = Math.floor(e / w);
    const h = (id) => {
      const dx = Math.abs((id % w) - ex), dz = Math.abs(Math.floor(id / w) - ez);
      return (Math.max(dx, dz) + (SQ2 - 1) * Math.min(dx, dz)) * ROAD_COST;
    };
    const heap = new MinHeap();
    stamp[s] = run; g[s] = 0; from[s] = -1;
    heap.push(h(s), s);
    let seen = 0;
    while (heap.size) {
      const cur = heap.pop();
      if (closed[cur] === run) continue;
      if (cur === e) break;
      closed[cur] = run;
      if (++seen > limit) return null;
      const ci = cur % w, cj = Math.floor(cur / w);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= w || j >= this.h) continue;
        const nb = j * w + i;
        if (!cost[nb]) continue;
        // No cutting a corner between two walls.
        if (di && dj && (!cost[cj * w + i] || !cost[j * w + ci])) continue;
        const ng = g[cur] + (di && dj ? SQ2 : 1) * (cost[cur] + cost[nb]) / 2;
        if (stamp[nb] !== run || ng < g[nb]) {
          stamp[nb] = run; g[nb] = ng; from[nb] = cur;
          heap.push(ng + h(nb), nb);
        }
      }
    }
    if (stamp[e] !== run) return null;
    const path = [e];
    while (path[path.length - 1] !== s) path.push(from[path[path.length - 1]]);
    return path.reverse();
  }

  // True when the straight line a-b crosses only open cells.
  clear(ax, az, bx, bz) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (this.cell * 0.4));
    for (let k = 0; k <= n; k++) {
      if (!this.open(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n)) return false;
    }
    return true;
  }

  // Fewer points, same walk: drop points that lie close to a straight,
  // clear line between their neighbours (Douglas-Peucker, 0.8 m).
  _simplify(pts) {
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      if (b - a < 2) continue;
      const [x1, z1] = pts[a], [x2, z2] = pts[b];
      const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz) || 1;
      let worst = -1, wd = 0;
      for (let k = a + 1; k < b; k++) {
        const d = Math.abs((pts[k][0] - x1) * dz - (pts[k][1] - z1) * dx) / L;
        if (d > wd) { wd = d; worst = k; }
      }
      if (wd > 0.8 || !this.clear(x1, z1, x2, z2)) {
        keep[worst] = 1;
        stack.push([a, worst], [worst, b]);
      }
    }
    return pts.filter((_, k) => keep[k]);
  }
}

class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const { k, v } = this;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p];
      i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const { k, v } = this;
    const top = v[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= k.length) break;
        if (c + 1 < k.length && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c];
        i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

// Where (x, z) is nearest to a polyline: distance, segment index, and how
// far along that segment (0-1).
export function nearestOnPoly(poly, x, z) {
  let best = { d: Infinity, seg: 0, t: 0 };
  for (let i = 1; i < poly.length; i++) {
    const [x1, z1] = poly[i - 1], [x2, z2] = poly[i];
    const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2)) : 0;
    const d = Math.hypot(x1 + dx * t - x, z1 + dz * t - z);
    if (d < best.d) best = { d, seg: i - 1, t };
  }
  return best;
}

// The rest of the route from where (x, z) is now: starts at (x, z) and
// skips the part already walked.
export function trimPoly(poly, x, z) {
  if (poly.length < 2) return poly;
  const { seg } = nearestOnPoly(poly, x, z);
  return [[x, z], ...poly.slice(seg + 1)];
}

// The point `ahead` metres further along the route than (x, z).
export function pointAhead(poly, x, z, ahead) {
  const { seg, t } = nearestOnPoly(poly, x, z);
  let [px, pz] = [poly[seg][0] + (poly[seg + 1][0] - poly[seg][0]) * t, poly[seg][1] + (poly[seg + 1][1] - poly[seg][1]) * t];
  let left = ahead;
  for (let i = seg + 1; i < poly.length; i++) {
    const [qx, qz] = poly[i];
    const L = Math.hypot(qx - px, qz - pz);
    if (L >= left) return [px + ((qx - px) * left) / L, pz + ((qz - pz) * left) / L];
    left -= L;
    [px, pz] = [qx, qz];
  }
  return poly[poly.length - 1];
}
