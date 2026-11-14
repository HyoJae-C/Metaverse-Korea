// Inwangsan (인왕산) and Bugaksan (북악산), the wooded hills north and west
// of the palace with the Seoul City Wall on their crest: how high the ground
// is at a point. scripts/build-north-wall.mjs writes the numbers into the
// Gyeongbokgung map's `northwall` landmark:
//
//   line   [[x, z, h], ...]  the crest along the wall (landmark metres), with
//          its height above the plain (a game approximation of the real one)
//   reach  [a, b]  how far the slopes reach either side of it: a + b * h m
//   flat   [[x0, z0, x1, z1], ...]  where the city is (the districts' boxes):
//          the ground stays at 0 there, and rises from it no steeper than
//          `k` (a slope: rise per metre), smoothly
//
// So near the palace, Bukchon or Naksan the hill starts at the plain and
// climbs at most about 28°, and where the wall runs close by (Changuimun,
// the top of Hyoja-ro, behind Cheongwadae-ro) it stands low on the hill;
// away from the city it is on the crest.

const fall = (t) => (t >= 1 ? 0 : t <= 0 ? 1 : 1 - t * t * (3 - 2 * t));

// The landmark's numbers in world metres, and their box (once per landmark).
const cache = new WeakMap();
function prep(l) {
  let c = cache.get(l);
  if (c) return c;
  const line = l.line.map(([x, z, h]) => [l.x + x, l.z + z, h]);
  const flat = l.flat.map(([x0, z0, x1, z1]) => [l.x + x0, l.z + z0, l.x + x1, l.z + z1]);
  const H = Math.max(...line.map((p) => p[2]));
  const m = l.reach[0] + l.reach[1] * H;
  const xs = line.map((p) => p[0]), zs = line.map((p) => p[1]);
  c = { line, flat, box: [Math.min(...xs) - m, Math.min(...zs) - m, Math.max(...xs) + m, Math.max(...zs) + m] };
  cache.set(l, c);
  return c;
}

// The box the hills cover, world metres: [x0, z0, x1, z1].
export const northBox = (l) => prep(l).box;

// Height at (x, z), world metres; 0 off the hills.
export function northHeight(l, x, z) {
  const { line, flat, box } = prep(l);
  if (x < box[0] || x > box[2] || z < box[1] || z > box[3]) return 0;
  let dF = Infinity;
  for (const [x0, z0, x1, z1] of flat) {
    const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1);
    if (dx === 0 && dz === 0) return 0;
    dF = Math.min(dF, Math.hypot(dx, dz));
  }
  // (the highest of what each piece of the crest gives, so where two
  // stretches meet, as at Changuimun, the slopes run into each other smoothly)
  let y = 0;
  const [a, b] = l.reach;
  for (let i = 1; i < line.length; i++) {
    const [x1, z1, h1] = line[i - 1], [x2, z2, h2] = line[i];
    const dx = x2 - x1, dz = z2 - z1;
    let t = ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz || 1);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const h = h1 + (h2 - h1) * t;
    if (h <= y) continue;
    const d = Math.hypot(x - x1 - dx * t, z - z1 - dz * t);
    y = Math.max(y, h * fall(d / (a + b * h)));
  }
  // the lower of the hill and the slope up from the city, rounded where they meet
  const c = l.k * dF, r = 6, e = Math.max(r - Math.abs(y - c), 0) / r;
  return Math.max(0, Math.min(y, c) - (e * e * r) / 4);
}

// (x, z) -> height for the map's landmarks (0 when there is no northwall).
export function northGround(landmarks = []) {
  const l = landmarks.find((m) => m.type === 'northwall');
  return l ? (x, z) => northHeight(l, x, z) : () => 0;
}
