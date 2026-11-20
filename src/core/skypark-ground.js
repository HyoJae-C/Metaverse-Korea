// Haneul Park (하늘공원), the grassy hill on the old Nanji landfill: how high
// the ground is at a point. scripts/build-nanji.mjs writes the numbers into
// the Nanji map's `skypark` landmark (metres from the landmark's x, z):
//
//   grid  { x0, z0, cell, w, h, m }  heights in decimetres on a square grid,
//         from the real ground (SRTM) at 1/4 above the riverside, eased where
//         the ways up cut into the slope; 0 at the hill's foot
//   top   [[x, z], ...]  the level top (the silver grass fields), at `topH` m
//   trails [{ w, p: [[x, z, y], ...] }]  the ways up (하늘길 and the stairs):
//         you walk on their own even climb, and the ground eases into them
//   foot  [[x, z], ...]  the hill's outline (a blocker; the top and the
//         trails are decks through it: game/skypark-walk.js)
//
// The name is "skypark" in the code: "haneul" is the Songpa department store
// (core/haneul.js).

export const SKYPARK_EASE = 4; // m beside a trail where the ground eases into it

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function inPoly(x, z, p) {
  let r = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r;
  }
  return r;
}

function ringDist(x, z, p) {
  let d = Infinity;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [ax, az] = p[j], [bx, bz] = p[i], dx = bx - ax, dz = bz - az;
    let t = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}

// The grid's height at (x, z), landmark metres (bilinear).
export function gridY(g, x, z) {
  const u = (x - g.x0) / g.cell, v = (z - g.z0) / g.cell;
  if (u < 0 || v < 0 || u > g.w - 1 || v > g.h - 1) return 0;
  const i = Math.min(Math.floor(u), g.w - 2), j = Math.min(Math.floor(v), g.h - 2), fu = u - i, fv = v - j;
  const at = (a, b) => g.m[b * g.w + a] / 10;
  return (at(i, j) * (1 - fu) + at(i + 1, j) * fu) * (1 - fv) + (at(i, j + 1) * (1 - fu) + at(i + 1, j + 1) * fu) * fv;
}

// The nearest point of a trail: { d (m from its middle line), y (its height there) }.
export function trailNear(t, x, z) {
  let best = { d: Infinity, y: 0 };
  const p = t.p;
  for (let i = 1; i < p.length; i++) {
    const [ax, az, ay] = p[i - 1], [bx, bz, by] = p[i], dx = bx - ax, dz = bz - az;
    let s = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1);
    s = s < 0 ? 0 : s > 1 ? 1 : s;
    const d = Math.hypot(x - ax - dx * s, z - az - dz * s);
    if (d < best.d) best = { d, y: ay + (by - ay) * s };
  }
  return best;
}

// The landmark's box, landmark metres: [x0, z0, x1, z1].
export const skyparkBox = (l) => [l.grid.x0, l.grid.z0, l.grid.x0 + (l.grid.w - 1) * l.grid.cell, l.grid.z0 + (l.grid.h - 1) * l.grid.cell];

// Height at (x, z) in landmark metres (0 off the hill).
export function skyparkHeight(l, x, z) {
  const [x0, z0, x1, z1] = skyparkBox(l);
  if (x < x0 || x > x1 || z < z0 || z > z1) return 0;
  if (inPoly(x, z, l.top)) return l.topH;
  // (the grid's cells are 6 m: right at the foot it comes down to 0 within 4 m)
  let y = inPoly(x, z, l.foot) ? gridY(l.grid, x, z) * Math.min(1, ringDist(x, z, l.foot) / 4) : 0;
  for (const t of l.trails) {
    const n = trailNear(t, x, z), e = n.d - t.w / 2;
    if (e < SKYPARK_EASE) { const k = smooth(e / SKYPARK_EASE); y = n.y * (1 - k) + y * k; }
  }
  return Math.max(0, y);
}

// (x, z) world -> height, for the map's landmarks (0 when there is no skypark).
export function skyparkGround(landmarks = []) {
  const l = landmarks.find((m) => m.type === 'skypark');
  return l ? (x, z) => skyparkHeight(l, x - l.x, z - l.z) : () => 0;
}
