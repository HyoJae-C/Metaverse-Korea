// Small 2D helpers shared by the whole-city map scripts (points are [x, z]).

export function polyArea(p) {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += p[j][0] * p[i][1] - p[i][0] * p[j][1];
  return Math.abs(a / 2);
}

export function polyLength(p) {
  let d = 0;
  for (let i = 1; i < p.length; i++) d += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return d;
}

const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
};
export { segDist };

// Douglas-Peucker: drops points nearer than tol to the line through their
// neighbours. ring: a closed outline (its first point is not repeated).
export function simplify(p, tol, ring = false) {
  if (ring) {
    if (p.length < 4) return p;
    // Split at the two points farthest apart, simplify each half.
    let far = 0, fd = -1;
    for (let i = 1; i < p.length; i++) { const d = Math.hypot(p[i][0] - p[0][0], p[i][1] - p[0][1]); if (d > fd) { fd = d; far = i; } }
    const a = simplify(p.slice(0, far + 1), tol), b = simplify(p.slice(far).concat([p[0]]), tol);
    return a.slice(0, -1).concat(b.slice(0, -1));
  }
  if (p.length < 3) return p;
  const keep = new Uint8Array(p.length);
  keep[0] = keep[p.length - 1] = 1;
  const stack = [[0, p.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let m = -1, md = tol;
    for (let k = i + 1; k < j; k++) { const d = segDist(p[k], p[i], p[j]); if (d > md) { md = d; m = k; } }
    if (m >= 0) { keep[m] = 1; stack.push([i, m], [m, j]); }
  }
  return p.filter((_, i) => keep[i]);
}
