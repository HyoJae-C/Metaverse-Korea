// Dalmaji Park (달맞이근린공원) on its hill by Oksu Station
// (scripts/build-oksu.mjs). The hill is a blocker in the map; its ways up
// (the entrance stairs, the decks, the park road) and the two photo islands
// are decks through it (core/collision.js addDeck), and on them you stand at
// the hill's height (core/dalmaji-ground.js). The woods, railings, lamps,
// gazebos and forsythia are game/oksu-park.js, loaded with import() when you
// come near. Small on purpose: this is in the first download (it is how
// you walk).
//
//   const oksu = createOksuWalk({ landmarks, collision, scene });
//   oksu.y(x, z)       ground height on the hill (0 off it)
//   oksu.update(p, dt) every frame on the street
//   oksu.group         what loaded (main.js FarCull), or null
import { dalmajiHeight, dalmajiBox, islandRing } from '../core/dalmaji-ground.js';

export const OKSU_NEAR = 480; // m: past the fog (it ends at 420 m), so it is there before you see it

export function createOksuWalk({ landmarks = [], collision = null, scene = null, lowSpec = false }) {
  const l = landmarks.find((q) => q.type === 'dalmaji');
  if (!l) return { y: () => 0, update() {}, group: null, landmark: null };
  const [bx0, bz0, bx1, bz1] = dalmajiBox(l);
  const x0 = l.x + bx0, z0 = l.z + bz0, x1 = l.x + bx1, z1 = l.z + bz1;
  const y = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 ? 0 : dalmajiHeight(l, x - l.x, z - l.z));
  const W = ([x, z]) => [l.x + x, l.z + z];
  for (const i of l.islands || []) collision?.addDeck(islandRing(i).map(W));
  for (const t of l.trails) {
    for (let i = 1; i < t.p.length; i++) {
      const a = W(t.p[i - 1]), b = W(t.p[i]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.01) continue;
      const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, w = t.w / 2, nx = -dz * w, nz = dx * w, e = w; // (a little past both ends, so the bends join up)
      collision?.addDeck([[a[0] - dx * e + nx, a[1] - dz * e + nz], [b[0] + dx * e + nx, b[1] + dz * e + nz], [b[0] + dx * e - nx, b[1] + dz * e - nz], [a[0] - dx * e - nx, a[1] - dz * e - nz]]);
    }
  }
  const near = (p) => Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
  let park = null, loading = false;
  return {
    y,
    landmark: l,
    update(p, dt) {
      if (park) { park.update(p, dt); return; }
      if (loading || !scene || near(p) > OKSU_NEAR) return;
      loading = true;
      import('./oksu-park.js')
        .then(({ buildOksuPark }) => { park = buildOksuPark({ scene, l, y, lowSpec }); })
        .catch((e) => { loading = false; console.warn('oksu', e); });
    },
    get group() { return park?.group || null; },
  };
}
