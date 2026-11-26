// Bukhansan (북한산), the Baegundae course from Bukhansan Ui Station
// (scripts/build-bukhansan.mjs). The mountain is a blocker in the map; the
// way up (the valley road, the paths, the steps up the rock) and its stops
// (the Visitor Support Center's plaza, Harujae, the hut's yard, the gate,
// the top) are decks through it (core/collision.js addDeck), and on them you
// stand at the mountain's height (core/bukhan-ground.js). The ground, the
// rock, the woods and the buildings are game/bukhansan-park.js, loaded with
// import() when you come near; the painted view from the top is
// game/bukhansan-view.js, loaded when you ask for it. Small on purpose: this
// is in the first download (it is how you walk).
//
//   const bukhan = createBukhansanWalk({ landmarks, collision, scene, text, lang });
//   bukhan.y(x, z)       ground height on the mountain (0 off it)
//   bukhan.update(p, dt) every frame on the street
//   bukhan.acts(p)       at the top: the button that opens the view
//   bukhan.group         what loaded (main.js FarCull), or null
import { bukhanHeight, bukhanBox, padRing } from '../core/bukhan-ground.js';

export const BUKHAN_NEAR = 480; // m: past the fog (it ends at 420 m), so it is there before you see it
export const SUMMIT_R = 4; // m from the flag: where the view's button shows

export function createBukhansanWalk({ landmarks = [], collision = null, scene = null, seats = null, lowSpec = false, text = (k) => k, lang = () => 'en', busy = () => false }) {
  const l = landmarks.find((q) => q.type === 'bukhansan');
  if (!l) return { y: () => 0, update() {}, acts: () => [], group: null, landmark: null, summit: null };
  const [bx0, bz0, bx1, bz1] = bukhanBox(l);
  const x0 = l.x + bx0, z0 = l.z + bz0, x1 = l.x + bx1, z1 = l.z + bz1;
  const y = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 ? 0 : bukhanHeight(l, x - l.x, z - l.z));
  const W = ([x, z]) => [l.x + x, l.z + z];
  for (const p of l.pads) collision?.addDeck(padRing(p).map(W));
  for (const t of l.trails) {
    for (let i = 1; i < t.p.length; i++) {
      const a = W(t.p[i - 1]), b = W(t.p[i]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.01) continue;
      const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, w = t.w / 2, nx = -dz * w, nz = dx * w, e = w; // (a little past both ends, so the bends join up)
      collision?.addDeck([[a[0] - dx * e + nx, a[1] - dz * e + nz], [b[0] + dx * e + nx, b[1] + dz * e + nz], [b[0] + dx * e - nx, b[1] + dz * e - nz], [a[0] - dx * e - nx, a[1] - dz * e - nz]]);
    }
  }
  const near = (p) => Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
  const summit = W(l.summit.at);
  let park = null, loading = false, view = null, opening = false;
  const openView = () => {
    if (opening || view?.open || busy()) return;
    opening = true;
    import('./bukhansan-view.js')
      .then(({ openBukhanView }) => { view = openBukhanView({ text, lang: lang(), onClose: () => { view = null; } }); })
      .catch((e) => console.warn('bukhansan view', e))
      .finally(() => { opening = false; });
  };
  return {
    y,
    landmark: l,
    summit,
    update(p, dt) {
      if (park) { park.update(p, dt); return; }
      if (loading || !scene || near(p) > BUKHAN_NEAR) return;
      loading = true;
      import('./bukhansan-park.js')
        .then(({ buildBukhansanPark }) => {
          park = buildBukhansanPark({ scene, l, y, lowSpec });
          if (seats) seats.push(...park.seats); // the benches at Harujae and the hut (main.js streetSeats)
        })
        .catch((e) => { loading = false; console.warn('bukhansan', e); });
    },
    // At the top, by the flag: look out over Seoul (a painted view).
    acts: (p) => (Math.hypot(p.x - summit[0], p.z - summit[1]) < SUMMIT_R ? [{ key: 'bukhan-view', label: text('bukhan.view'), run: openView }] : []),
    get viewOpen() { return !!view?.open; },
    get group() { return park?.group || null; },
  };
}
