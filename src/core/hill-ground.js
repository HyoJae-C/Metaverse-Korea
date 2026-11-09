// A hillside street (district meta "hill"): how high the ground is at a
// point. Used for Itaewon's Gyeongnidan-gil, which climbs from
// Noksapyeong-daero east towards Namsan (scripts/build-gyeongnidan.mjs writes
// the numbers into districts/itaewon.json).
//
// All in metres relative to the foot of the street, `at` (district metres):
//   prof  [[x, h], ...]  height of the main road going east (x)
//   road  [[x, z], ...]  where the main road is (its z for each x)
//   flat  half width of the band along the road that is level across
//   kN    how fast the lanes north of the road climb (m per m)
//   zs    the south edge: the lanes south of the road go down to 0 there
//   ramp  [x0, x1]: the climb north starts between these (flat by the foot)
//   win   [x0, z0, x1, z1]: the built part; past its east and north edges
//         the hill falls back to the plain over `fade` metres
//
// Off the hill the ground is 0, like the rest of the city.

const lerpAt = (pts, x) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    if (x <= x1) {
      const [x0, y0] = pts[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  }
  return pts[pts.length - 1][1];
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Height at (x, z) relative to the foot (no bounds check beyond the hill's own).
export function hillHeightRel(hill, x, z) {
  const { prof, road, flat = 6, kN = 0.08, zs, ramp = [20, 70], win, fade = 60 } = hill;
  const [wx0, wz0, wx1] = win;
  if (x < wx0 || z > zs) return 0;
  const cx = Math.min(x, wx1); // past the east edge: as at the edge, then fading
  const m = lerpAt(prof, cx), zr = lerpAt(road, cx);
  let h;
  if (z >= zr - flat && z <= zr + flat) h = m;
  else if (z > zr) h = m * clamp01((zs - z) / (zs - zr - flat)); // down to the south edge
  else h = m + kN * clamp01((cx - ramp[0]) / (ramp[1] - ramp[0])) * (zr - flat - Math.max(z, wz0)); // up the lanes north
  if (x > wx1) h *= clamp01(1 - (x - wx1) / fade);
  if (z < wz0) h *= clamp01(1 - (wz0 - z) / fade);
  return h > 0 ? h : 0;
}

// (x, z) in world metres -> ground height, for a district's hill at `offset`.
export function hillGround(hill, [ox, oz] = [0, 0]) {
  const [ax, az] = hill.at;
  const [wx0, wz0, wx1] = hill.win, f = hill.fade ?? 60;
  // A quick box test first: most of the city is nowhere near the hill.
  const bx0 = ax + ox + wx0, bx1 = ax + ox + wx1 + f, bz0 = az + oz + wz0 - f, bz1 = az + oz + hill.zs;
  return (x, z) => (x < bx0 || x > bx1 || z < bz0 || z > bz1 ? 0 : hillHeightRel(hill, x - ax - ox, z - az - oz));
}

// The box the hill covers, in world metres: [x0, z0, x1, z1].
export function hillBox(hill, [ox, oz] = [0, 0]) {
  const [ax, az] = hill.at, [wx0, wz0, wx1] = hill.win, f = hill.fade ?? 60;
  return [ax + ox + wx0, az + oz + wz0 - f, ax + ox + wx1 + f, az + oz + hill.zs];
}
