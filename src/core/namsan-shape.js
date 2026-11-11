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
// can start up it gently (scripts/build-namsan-walk.mjs).
const lift = (l, s) => (s > 0 ? s ** (l.e || 0.5) : 0);

export function namsanPoint(l, u, v) {
  const k = lift(l, 1 - u * u - v * v);
  return [l.rx * u + (l.px || 0) * k, l.h * k, l.rz * v + (l.pz || 0) * k];
}

// The ground height of the hill at (x, z) from its foot's centre (0 off the hill).
export function namsanGround(l, x, z) {
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
export const onNamsan = (l, x, z, m = 0) => (x / (l.rx + m)) ** 2 + (z / (l.rz + m)) ** 2 < 1;
