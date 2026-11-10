// Helpers for districts drawn on their real streets (OpenStreetMap lines at
// 1/4, in a district's local metres: x east, z south): rows of buildings
// along streets at any angle, kept off the roads, the open places and each
// other, with a shop lot in front of every building.
//
// Used by scripts/build-hongdae.mjs and scripts/build-yeonnam.mjs.

export const r1 = (v) => Math.round(v * 10) / 10;
export const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });

// Seeded random numbers, so a map comes out the same every time.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const segDist = (q, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / L)) : 0;
  return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz);
};
export const lineDist = (q, p) => p.reduce((m, _, i) => (i ? Math.min(m, segDist(q, p[i - 1], p[i])) : m), Infinity);

// The shortest distance between two segments.
export function segSegDist(a, b, c, d) {
  const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return 0;
  return Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b));
}

export function inPoly(x, z, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

// Two convex polygons overlap (separating axes).
export function overlap(a, b) {
  for (const p of [a, b]) {
    for (let i = 0; i < p.length; i++) {
      const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length], nx = z2 - z1, nz = x1 - x2;
      const pa = a.map(([x, z]) => x * nx + z * nz), pb = b.map(([x, z]) => x * nx + z * nz);
      if (Math.max(...pa) <= Math.min(...pb) + 0.3 || Math.max(...pb) <= Math.min(...pa) + 0.3) return false;
    }
  }
  return true;
}

// The nearest point on a line, how far along it (m), and its direction there.
export function nearestOn(q, p) {
  let best = null, s0 = 0;
  for (let i = 1; i < p.length; i++) {
    const [a, b] = [p[i - 1], p[i]], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    const t = L ? Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / (L * L))) : 0;
    const c = [a[0] + t * dx, a[1] + t * dz], d = Math.hypot(q[0] - c[0], q[1] - c[1]);
    if (!best || d < best.d) best = { d, at: c, s: s0 + t * L, dir: [dx / L, dz / L] };
    s0 += L;
  }
  return best;
}

// The point `s` metres along a line (past its ends: straight on).
export function pointAt(p, s) {
  let s0 = 0;
  for (let i = 1; i < p.length; i++) {
    const [a, b] = [p[i - 1], p[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= s0 + L || i === p.length - 1) {
      const t = (s - s0) / L;
      return { at: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], dir: [(b[0] - a[0]) / L, (b[1] - a[1]) / L] };
    }
    s0 += L;
  }
  return { at: p[0], dir: [1, 0] };
}
export const lengthOf = (p) => p.reduce((m, q, i) => (i ? m + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);

// Which side of a line a point is on: > 0 on its right going along it
// (seen on the map, north up), < 0 on its left.
export function sideOf(q, p) {
  const { at, dir } = nearestOn(q, p);
  return (q[0] - at[0]) * -dir[1] + (q[1] - at[1]) * dir[0];
}

// The part of a line on one side of another (`keep(q)` true), cut where it
// crosses: walks it in 0.5 m steps and keeps the longest run.
export function clip(p, keep) {
  const runs = [];
  let cur = [];
  for (let i = 1; i < p.length; i++) {
    const [a, b] = [p[i - 1], p[i]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const q = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      if (keep(q)) cur.push(q);
      else if (cur.length) { runs.push(cur); cur = []; }
    }
  }
  if (cur.length) runs.push(cur);
  const run = runs.reduce((a, r) => (lengthOf(r) > lengthOf(a) ? r : a), []);
  return simplify(run);
}

// Douglas-Peucker: drops points within `tol` metres of the line.
export function simplify(p, tol = 0.3) {
  if (p.length < 3) return p.map((q) => q.map(r1));
  const [a, b] = [p[0], p.at(-1)];
  let best = -1, bi = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = segDist(p[i], a, b);
    if (d > best) { best = d; bi = i; }
  }
  if (best < tol) return [a, b].map((q) => q.map(r1));
  return [...simplify(p.slice(0, bi + 1), tol).slice(0, -1), ...simplify(p.slice(bi), tol)];
}

// Goes from `from` along `dir` until it reaches one of `roads` (its edge);
// null if none within `max` metres.
export function reach(from, dir, roads, max = 120) {
  for (let s = 1; s < max; s += 0.5) {
    const q = [from[0] + dir[0] * s, from[1] + dir[1] * s];
    if (roads.some((r) => lineDist(q, r.p) < r.w / 2)) return q.map(r1);
  }
  return null;
}

// A district under construction. `inside(q)`: the point is in the district's
// area. `roads` (and `open`, places kept clear: {p} polygons or {line, w}
// strips) are read when a building is tried, so add to them as you go.
export function town(seed, { inside, roads, open = [] }) {
  const rand = rng(seed);
  const buildings = [], lots = {};
  const clearOf = (q, gap) => roads.every((r) => lineDist(q, r.p) > r.w / 2 + gap)
    && open.every((o) => (o.p ? !inPoly(q[0], q[1], o.p) : lineDist(q, o.line) > o.w / 2 + gap));
  function fits(p) {
    const probe = [...p, ...p.map((q, i) => { const n = p[(i + 1) % p.length]; return [(q[0] + n[0]) / 2, (q[1] + n[1]) / 2]; }),
      [p.reduce((m, q) => m + q[0], 0) / p.length, p.reduce((m, q) => m + q[1], 0) / p.length]];
    // (and no road line passes between the probes, across a corner)
    const edgesClear = roads.every((r) => {
      for (let i = 1; i < r.p.length; i++) for (let k = 0; k < p.length; k++) if (segSegDist(r.p[i - 1], r.p[i], p[k], p[(k + 1) % p.length]) < r.w / 2 + 1.2) return false;
      return !r.p.some((q) => inPoly(q[0], q[1], p));
    });
    return edgesClear && probe.every((q) => inside(q) && clearOf(q, 1.2))
      && open.every((o) => !o.p || !overlap(o.p, p))
      && buildings.every((b) => !overlap(b.p, p));
  }
  // A row along one side of a street: side +1 is on the right going along
  // the line, -1 on the left (WHY=<row id> in the environment prints why each
  // building that does not fit is left out). Fronts stand `off` metres from the middle of
  // the street, buildings `depth` deep; the shop's spot is the middle of each
  // front, `spot` metres out on the pavement. `from`/`to`: metres along.
  function row(id, line, side, { off, depth = 11, w = [8, 13], h = [6, 12], spot = 1.8, from = 0, to = Infinity, gap = 0 } = {}) {
    const list = (lots[id] ||= []);
    let s0 = 0;
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-d[1] * side, d[0] * side];
      let s = 1;
      while (s + w[0] < L - 1) {
        const len = Math.min(w[0] + rand() * (w[1] - w[0]), L - 1 - s);
        let placed = false;
        if (s0 + s >= from && s0 + s + len <= to) {
          const q = (t, o) => [r1(a[0] + d[0] * t + n[0] * o), r1(a[1] + d[1] * t + n[1] * o)];
          const p = [q(s, off), q(s + len, off), q(s + len, off + depth), q(s, off + depth)];
          if (process.env.WHY === id && !fits(p)) console.log(id, whyNot(p, { inside, roads, open, buildings }));
          if (fits(p)) {
            buildings.push({ h: Math.round(h[0] + rand() * (h[1] - h[0])), p });
            list.push(q(s + len / 2, off - spot));
            placed = true;
          }
        }
        s += placed ? len + gap : 1.5; // past a corner or a gap: slide on until one fits
      }
      s0 += L;
    }
    return list;
  }
  return { buildings, lots, row, fits, rand };
}

// Rotation (ry) of a thing that faces +z when unturned, so it faces along (dx, dz).
export const facing = (dx, dz) => Number(Math.atan2(dx, dz).toFixed(4));

// Boxes for the district overlap check (meta.parts): the map cut into strips
// `step` metres wide along x, each strip's box round what is in it, so two
// districts either side of a diagonal street don't seem to overlap.
export function strips(map, step = 25, why = 'strip') {
  const pts = [...map.buildings.flatMap((b) => b.p), ...map.roads.flatMap((r) => r.p), ...map.areas.flatMap((a) => a.p)];
  const x0 = Math.min(...pts.map((q) => q[0])), x1 = Math.max(...pts.map((q) => q[0]));
  const parts = [];
  for (let x = x0; x < x1; x += step) {
    // Road lines cross strips: sample them so a long straight piece counts in every strip it passes.
    const inStrip = [];
    for (const q of pts) if (q[0] >= x && q[0] <= x + step) inStrip.push(q);
    for (const r of map.roads) for (let i = 1; i < r.p.length; i++) {
      const [a, b] = [r.p[i - 1], r.p[i]];
      for (let t = 0; t <= 1; t += 0.02) { const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; if (q[0] >= x && q[0] <= x + step) inStrip.push(q); }
    }
    if (!inStrip.length) continue;
    const zs = inStrip.map((q) => q[1]);
    parts.push({ why, box: [r1(x), r1(Math.min(...zs)), r1(Math.min(x + step, x1)), r1(Math.max(...zs))] });
  }
  return parts;
}

// Why a building does not fit (for debugging a row).
export function whyNot(p, { inside, roads, open = [], buildings = [] }) {
  const probe = [...p, [p.reduce((m, q) => m + q[0], 0) / p.length, p.reduce((m, q) => m + q[1], 0) / p.length]];
  for (const q of probe) {
    if (!inside(q)) return `outside at ${q}`;
    const r = roads.find((r) => lineDist(q, r.p) <= r.w / 2 + 1.2);
    if (r) return `on ${r.n?.en || r.k} at ${q}`;
  }
  if (open.some((o) => o.p && overlap(o.p, p))) return 'open place';
  const hit = buildings.find((b) => overlap(b.p, p));
  if (hit) return `another building at ${hit.p[0]}`;
  return 'fits';
}
