// Namsan's shape (no three.js, so scripts and tests can use it too): a
// rounded hill on an ellipse (rx, rz) round its foot's centre, h metres
// high, leaning so that its top sits at (px, pz) from that centre, where
// N Seoul Tower stands. Real Namsan's summit is near its west end, with the
// long ridge running east, so the west slope is the steep one.
//
// A point of the hill: (u, v) on the unit disc of the foot, height
// y = h * (1 - u² - v²)^e, and x = rx u + px y/h, z = rz v + pz y/h.
// e is 0.5 by default (a round dome, steep as a wall at its foot); 1.5
// gives a mountain whose slope eases off to nothing at the foot, so a trail
// can start up it gently (scripts/build-namsan-real.mjs).
const lift = (l, s) => (s > 0 ? s ** (l.e || 0.5) : 0);

// Or a real outline (l.rad): N radii, metres from the top (px, pz), at
// angles 2πi/N (from +x towards +z), so the foot follows the real hill's
// edge (scripts/build-namsan-real.mjs). (u, v) is then a point of the unit
// disc round the top: r = |(u, v)|, along its angle.
export function namsanRadius(l, a) {
  const N = l.rad.length, t = ((((a / (2 * Math.PI)) % 1) + 1) % 1) * N, i = Math.floor(t) % N, f = t - Math.floor(t);
  return l.rad[i] * (1 - f) + l.rad[(i + 1) % N] * f;
}
// (x, z) from the foot's centre -> how far out from the top, 0..1 (1 at the foot)
// (l.flat: metres round the top kept level, for the summit plaza.)
const radial = (l, x, z) => {
  const dx = x - (l.px || 0), dz = z - (l.pz || 0), f = l.flat || 0;
  return Math.max(0, Math.hypot(dx, dz) - f) / (namsanRadius(l, Math.atan2(dz, dx)) - f);
};

export function namsanPoint(l, u, v) {
  if (l.rad) {
    const r = Math.hypot(u, v), R = r ? namsanRadius(l, Math.atan2(v, u)) : 0, f = l.flat || 0;
    const d = f + r * (R - f), k = r ? d / r : 0; // (the level top stretches the inner rings out)
    return [(l.px || 0) + u * k, l.h * lift(l, 1 - r * r), (l.pz || 0) + v * k];
  }
  const k = lift(l, 1 - u * u - v * v);
  return [l.rx * u + (l.px || 0) * k, l.h * k, l.rz * v + (l.pz || 0) * k];
}

// The ground height of the hill at (x, z) from its foot's centre (0 off the hill).
export function namsanGround(l, x, z) {
  if (l.rad) { const r = radial(l, x, z); return r < 1 ? l.h * lift(l, 1 - r * r) : 0; }
  let k = 0;
  for (let i = 0; i < 40; i++) {
    const u = (x - (l.px || 0) * k) / l.rx, v = (z - (l.pz || 0) * k) / l.rz;
    const next = lift(l, 1 - u * u - v * v);
    if (Math.abs(next - k) < 1e-6) { k = next; break; }
    k = (k + next) / 2;
  }
  return l.h * k;
}

// Is (x, z) (from the foot's centre) on the hill's foot, with a margin?
export const onNamsan = (l, x, z, m = 0) => {
  if (!l.rad) return (x / (l.rx + m)) ** 2 + (z / (l.rz + m)) ** 2 < 1;
  const dx = x - (l.px || 0), dz = z - (l.pz || 0);
  return Math.hypot(dx, dz) < namsanRadius(l, Math.atan2(dz, dx)) + m;
};
// How far the hill reaches from its foot's centre (for a quick box test).
export const namsanReach = (l) => (l.rad ? Math.max(...l.rad) + Math.hypot(l.px || 0, l.pz || 0) : Math.max(l.rx, l.rz));
