// A ridge with a city wall on its top (district meta "ridge"): how high the
// ground is at a point. Used for Naksan (낙산), where the Seoul City Wall
// runs along the hill from Heunginjimun to Hyehwamun
// (scripts/build-naksan.mjs writes the numbers into districts/dongmyo.json).
//
//   line  [[x, z, h, step], ...]  the wall's middle line (district metres),
//         with the ridge's height there and how much lower the ground is
//         at the wall's outer foot (0 where the wall has a gap)
//   ins   1 or -1: which side of the line is inside the old city (left of
//         the line's direction for 1)
//   wi, wo [a, b]: how far the slope reaches inside / outside: a + b * h m
//
// Inside the wall the ground is at the ridge's height right up to the wall,
// so its parapet is only chest high there; outside it starts `step` lower,
// so the outer face stands taller (the real wall is like that on Naksan).
// Off the ridge the ground is 0, like the rest of the city.

const fall = (t) => (t >= 1 ? 0 : t <= 0 ? 1 : 1 - t * t * (3 - 2 * t));

// The nearest point of the line: { h, step, d } with d the distance, signed
// (+ inside the city).
export function ridgeNear(r, x, z) {
  const L = r.line;
  let best = Infinity, h = 0, step = 0, d = 0;
  for (let i = 1; i < L.length; i++) {
    const [x1, z1, h1, s1] = L[i - 1], [x2, z2, h2, s2] = L[i];
    const dx = x2 - x1, dz = z2 - z1, len2 = dx * dx + dz * dz || 1;
    let t = ((x - x1) * dx + (z - z1) * dz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = x1 + dx * t, pz = z1 + dz * t, dd = Math.hypot(x - px, z - pz);
    if (dd < best) {
      best = dd;
      h = h1 + (h2 - h1) * t;
      step = s1 + (s2 - s1) * t;
      const side = dx * (z - z1) - dz * (x - x1); // > 0: right of the line (x east, z south)
      d = side < 0 === r.ins > 0 ? dd : -dd;
    }
  }
  return { h, step, d };
}

// Height at (x, z) in the district's own metres.
export function ridgeHeightRel(r, x, z) {
  const { h, step, d } = ridgeNear(r, x, z);
  const [ia, ib] = r.wi, [oa, ob] = r.wo;
  if (d >= 0) return h * fall(d / (ia + ib * h));
  const top = Math.max(0, h - step);
  return top * fall(-d / (oa + ob * top));
}

// The box the ridge covers, in world metres: [x0, z0, x1, z1].
export function ridgeBox(r, [ox, oz] = [0, 0]) {
  const H = Math.max(...r.line.map((p) => p[2]));
  const m = Math.max(r.wi[0] + r.wi[1] * H, r.wo[0] + r.wo[1] * H);
  const xs = r.line.map((p) => p[0]), zs = r.line.map((p) => p[1]);
  return [Math.min(...xs) + ox - m, Math.min(...zs) + oz - m, Math.max(...xs) + ox + m, Math.max(...zs) + oz + m];
}

// (x, z) in world metres -> ground height, for a district's ridge at `offset`.
export function ridgeGround(r, [ox, oz] = [0, 0]) {
  const [x0, z0, x1, z1] = ridgeBox(r, [ox, oz]);
  return (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 ? 0 : ridgeHeightRel(r, x - ox, z - oz));
}

// Height on one side of the wall (+1 inside, -1 outside) at (x, z), district
// metres: the ground mesh uses it so a cell never ramps up the wall's face.
export function ridgeHeightSide(r, x, z, side) {
  const { h, step, d } = ridgeNear(r, x, z);
  const [ia, ib] = r.wi, [oa, ob] = r.wo, ad = Math.abs(d);
  if (side > 0) return h * fall(ad / (ia + ib * h));
  const top = Math.max(0, h - step);
  return top * fall(ad / (oa + ob * top));
}
