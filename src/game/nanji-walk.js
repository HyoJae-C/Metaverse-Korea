// Haneul Park (하늘공원) and the Nanji Campground (난지캠핑장), west of
// Mangwon (scripts/build-nanji.mjs). The hill is a blocker in the map; its
// level top and its ways up (하늘길, the stairs) are decks through it
// (core/collision.js addDeck), and on them you stand at the hill's height
// (core/skypark-ground.js). The grass fields, the hill's ground, the wind
// turbines and the campground (tents, fire pits and their camp chairs) are
// game/nanji-park.js, loaded with import() when you come near.
// Small on purpose: this is in the first download (it is how you walk).
//
//   const nanji = createNanjiWalk({ landmarks, collision, scene, seats });
//   nanji.y(x, z)      ground height on the hill (0 off it)
//   nanji.update(p, dt) every frame on the street
//   nanji.group        what loaded (main.js FarCull), or null
import { skyparkHeight, skyparkBox } from '../core/skypark-ground.js';

export const NANJI_NEAR = 480; // m: past the fog (it ends at 420 m), so it is there before you see it

export function createNanjiWalk({ landmarks = [], collision = null, scene = null, seats = null, lowSpec = false }) {
  const l = landmarks.find((q) => q.type === 'skypark');
  const camp = landmarks.find((q) => q.type === 'nanjicamp');
  if (!l) return { y: () => 0, update() {}, group: null, landmark: null };
  const [bx0, bz0, bx1, bz1] = skyparkBox(l);
  const x0 = l.x + bx0, z0 = l.z + bz0, x1 = l.x + bx1, z1 = l.z + bz1;
  const y = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 ? 0 : skyparkHeight(l, x - l.x, z - l.z));
  const W = ([x, z]) => [l.x + x, l.z + z];
  // The top and the ways up: decks through the hill's blocker.
  collision?.addDeck(l.top.map(W));
  for (const t of l.trails) {
    for (let i = 1; i < t.p.length; i++) {
      const a = W(t.p[i - 1]), b = W(t.p[i]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.01) continue;
      const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, w = t.w / 2, nx = -dz * w, nz = dx * w, e = w; // (a little past both ends, so the bends join up)
      collision?.addDeck([[a[0] - dx * e + nx, a[1] - dz * e + nz], [b[0] + dx * e + nx, b[1] + dz * e + nz], [b[0] + dx * e - nx, b[1] + dz * e - nz], [a[0] - dx * e - nx, a[1] - dz * e - nz]]);
    }
  }
  // (the nearest the hill or the campground is to you)
  const near = (p) => {
    const dHill = Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
    return camp ? Math.min(dHill, Math.hypot(p.x - camp.x, p.z - camp.z) - 40) : dHill;
  };
  let park = null, loading = false;
  return {
    y,
    landmark: l,
    update(p, dt) {
      if (park) { park.update(p, dt); return; }
      if (loading || !scene || near(p) > NANJI_NEAR) return;
      loading = true;
      import('./nanji-park.js')
        .then(({ buildNanjiPark }) => {
          park = buildNanjiPark({ scene, l, camp, y, lowSpec });
          if (seats) seats.push(...park.seats); // the camp chairs round the fires (main.js streetSeats)
        })
        .catch((e) => { loading = false; console.warn('nanji', e); });
    },
    get group() { return park?.group || null; },
  };
}
