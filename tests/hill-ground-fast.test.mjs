// The hills' ground heights (Haneul Park, the cemetery, Dalmaji Park) give the
// same numbers as before they were made quicker (Yozi 2026-11-25: the boat
// taxi stuttered while those hills were built), and a hill's ground grid asks
// each corner's height once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { skyparkHeight, gridY, inPoly, skyparkBox, SKYPARK_EASE } from '../src/core/skypark-ground.js';
import { hyeonchungHeight, wayNear, flatAt } from '../src/core/hyeonchung-ground.js';
import { dalmajiHeight } from '../src/core/dalmaji-ground.js';
import { heightGrid } from '../src/core/height-grid.js';

const mark = (file, type) => JSON.parse(readFileSync(new URL(`../public/regions/another-seoul/districts/${file}.json`, import.meta.url))).landmarks.find((l) => l.type === type);
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
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
// The way it was worked out before (every trail, every edge of the foot).
function oldSkypark(l, x, z) {
  const [x0, z0, x1, z1] = skyparkBox(l);
  if (x < x0 || x > x1 || z < z0 || z > z1) return 0;
  if (inPoly(x, z, l.top)) return l.topH;
  let y = inPoly(x, z, l.foot) ? gridY(l.grid, x, z) * Math.min(1, ringDist(x, z, l.foot) / 4) : 0;
  for (const t of l.trails) {
    let best = { d: Infinity, y: 0 };
    for (let i = 1; i < t.p.length; i++) {
      const [ax, az, ay] = t.p[i - 1], [bx, bz, by] = t.p[i], dx = bx - ax, dz = bz - az;
      let s = ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1);
      s = s < 0 ? 0 : s > 1 ? 1 : s;
      const d = Math.hypot(x - ax - dx * s, z - az - dz * s);
      if (d < best.d) best = { d, y: ay + (by - ay) * s };
    }
    const e = best.d - t.w / 2;
    if (e < SKYPARK_EASE) { const k = smooth(e / SKYPARK_EASE); y = best.y * (1 - k) + y * k; }
  }
  return Math.max(0, y);
}
function oldHyeonchung(l, x, z) {
  const [x0, z0, x1, z1] = skyparkBox(l);
  if (x < x0 || x > x1 || z < z0 || z > z1) return 0;
  const f = flatAt(l, x, z);
  if (f) return f.y;
  let y = inPoly(x, z, l.foot) ? gridY(l.grid, x, z) * Math.min(1, ringDist(x, z, l.foot) / 4) : 0;
  const n = wayNear(l, x, z);
  if (n && n.e < SKYPARK_EASE) { const k = smooth(n.e / SKYPARK_EASE); y = n.y * (1 - k) + y * k; }
  return Math.max(0, y);
}
const points = (l, n = 20000) => {
  const [x0, z0, x1, z1] = skyparkBox(l);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out = [];
  for (let i = 0; i < n; i++) out.push([x0 - 10 + r() * (x1 - x0 + 20), z0 - 10 + r() * (z1 - z0 + 20)]);
  for (const t of l.trails) for (const [x, z] of t.p) out.push([x + 0.3, z - 0.2]); // (right by the ways)
  for (const [x, z] of l.foot) out.push([x + 1, z + 1]); // (right by the foot)
  return out;
};
const close = (a, b) => Math.abs(a - b) < 1e-9;

test('Haneul Park: the same heights as before', () => {
  const l = mark('nanji', 'skypark');
  for (const [x, z] of points(l)) assert.ok(close(skyparkHeight(l, x, z), oldSkypark(l, x, z)), `${x}, ${z}`);
});
test('Dalmaji Park: the same heights as before', () => {
  const l = mark('oksu', 'dalmaji');
  for (const [x, z] of points(l)) { const h = dalmajiHeight(l, x, z); assert.ok(close(h, h === skyparkHeight(l, x, z) ? oldSkypark(l, x, z) : h), `${x}, ${z}`); }
});
test('the cemetery: the same heights as before', () => {
  const l = mark('hyeonchungwon', 'hyeonchung');
  for (const [x, z] of points(l)) assert.ok(close(hyeonchungHeight(l, x, z), oldHyeonchung(l, x, z)), `${x}, ${z}`);
});
test('a ground grid: the loop\'s own corners, each asked once', () => {
  let asked = 0;
  const g = heightGrid(-3.3, 1.1, 10, 7, 3, (x, z) => { asked++; return x * 10 + z; });
  const xs = []; for (let x = -3.3; x < 10; x += 3) xs.push(x);
  assert.deepEqual(g.xs.slice(0, -1), xs);
  assert.equal(g.xs.at(-1), xs.at(-1) + 3);
  for (let j = 0; j < g.zs.length - 1; j++) for (let i = 0; i < g.xs.length - 1; i++) for (const [a, b] of [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]) assert.equal(g.y(a, b), g.xs[a] * 10 + g.zs[b]);
  assert.equal(asked, g.xs.length * g.zs.length);
});
