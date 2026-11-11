// Walking up Namsan (남산 산책로): the trail from Sowol-ro, above
// Gyeongnidan-gil, up the hill to the summit, where it comes out on the
// summit plaza round the look-out tower (the cable car's room, entered from
// its back gate). The hill itself stays a blocker; the trail is a deck
// through it (core/collision.js addDeck), and on it you stand at the hill's
// height (core/namsan-shape.js). The trail's line is the namsan landmark's
// `trail` (scripts/build-namsan-real.mjs); core/landmarks.js draws it.
// Small on purpose: this is in the first download (it is how you walk).
//
//   const walk = createNamsanWalk({ landmarks, collision });
//   walk.y(x, z)          ground height on the hill (0 off it)
//   walk.atTop(p)         at the trail's top end, by the summit plaza's gate?
//   walk.topOut()         where you step out at the top when you walk down
import { namsanGround, onNamsan, namsanReach } from '../core/namsan-shape.js';

export const NAMSAN_WALK = {
  w: 3, // m: the trail's width (the landmark's trailW wins)
  topR: 3.5, // m from the trail's top end: the gate to the summit plaza
};

export function createNamsanWalk({ landmarks = [], collision }) {
  const l = landmarks.find((q) => q.type === 'namsan' && q.trail?.length > 1);
  if (!l) return { y: () => 0, atTop: () => false, topOut: () => null, line: null };
  const w = l.trailW || NAMSAN_WALK.w;
  const line = l.trail.map(([x, z]) => [l.x + x, l.z + z]); // world metres
  // One deck per stretch, a little past both ends so the bends join up.
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1], [bx, bz] = line[i], len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) continue;
    const dx = (bx - ax) / len, dz = (bz - az) / len, nx = -dz * w / 2, nz = dx * w / 2, e = w / 2;
    collision?.addDeck([
      [ax - dx * e + nx, az - dz * e + nz], [bx + dx * e + nx, bz + dz * e + nz],
      [bx + dx * e - nx, bz + dz * e - nz], [ax - dx * e - nx, az - dz * e - nz],
    ]);
  }
  const reach = namsanReach(l), x0 = l.x - reach, x1 = l.x + reach, z0 = l.z - reach, z1 = l.z + reach;
  const top = line.at(-1), below = line.at(-2);
  return {
    line,
    y(x, z) {
      if (x < x0 || x > x1 || z < z0 || z > z1 || !onNamsan(l, x - l.x, z - l.z)) return 0;
      return namsanGround(l, x - l.x, z - l.z);
    },
    atTop: (p) => Math.hypot(p.x - top[0], p.z - top[1]) < NAMSAN_WALK.topR,
    // A step down from the top, facing down the trail.
    topOut() {
      const len = Math.hypot(below[0] - top[0], below[1] - top[1]) || 1;
      const dx = (below[0] - top[0]) / len, dz = (below[1] - top[1]) / len;
      return { x: top[0] + dx * 2, z: top[1] + dz * 2, ry: Math.atan2(dx, dz) };
    },
  };
}
