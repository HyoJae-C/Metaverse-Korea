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
//   bukhan.on(x, z)      on the mountain: no bikes, cars or taxis
//   bukhan.pace(p)       how fast you go here (1 on the flat, less the steeper it is)
//   bukhan.noRun(p)      on the hiking paths and steps (running there you may trip)
//   bukhan.run(p, dt, running), bukhan.fallen   the tripping
//   bukhan.update(p, dt) every frame on the street
//   bukhan.acts(p)       at the top: the button that opens the view
//   bukhan.group         what loaded (main.js FarCull), or null
import { bukhanHeight, bukhanBox, padRing } from '../core/bukhan-ground.js';
import { inPoly, trailNear } from '../core/skypark-ground.js';

export const BUKHAN_NEAR = 480; // m: past the fog (it ends at 420 m), so it is there before you see it
export const RUN_NEAR = 6; // m beside the road (and round the plaza) where running is safe
// Running on the hiking paths and steps you may trip (Yozi 2026-11-27: "you can run, but by chance you fall and can't move for a
// while; the chance and the time both random"): each run has its own chance a second, more the steeper it is, and each fall its own rest.
export const TRIP = { chance: [0.02, 0.12], steep: 2, rest: [2, 8] };
export const CAM_OVER = 0.8; // m over the mountain's ground the camera keeps (main.js): the slope uphill of you is higher than you are
export const SUMMIT_R = 4; // m from the flag: where the view's button shows
// The steeper the way, the slower you go (Yozi 2026-11-27): full pace up to
// about 7°, 60% on the steepest paths (18°), 45% on the steps up the rock.
export const CLIMB = { easy: 0.12, path: 0.33, pathPace: 0.6, steps: 0.55, stepsPace: 0.45 };
export function climbPace(g) {
  if (g <= CLIMB.easy) return 1;
  if (g <= CLIMB.path) return 1 - (1 - CLIMB.pathPace) * (g - CLIMB.easy) / (CLIMB.path - CLIMB.easy);
  return Math.max(CLIMB.stepsPace, CLIMB.pathPace - (CLIMB.pathPace - CLIMB.stepsPace) * (g - CLIMB.path) / (CLIMB.steps - CLIMB.path));
}

export function createBukhansanWalk({ landmarks = [], collision = null, scene = null, seats = null, lowSpec = false, text = (k) => k, lang = () => 'en', busy = () => false, toast = null, riding = null, getOff = null, daylight = () => 1, sfx = () => null, weather = () => null }) {
  const l = landmarks.find((q) => q.type === 'bukhansan');
  if (!l) return { y: () => 0, pace: () => 1, noRun: () => false, run() {}, fallen: false, on: () => false, camOver: CAM_OVER, update() {}, acts: () => [], group: null, landmark: null, summit: null };
  const [bx0, bz0, bx1, bz1] = bukhanBox(l);
  const x0 = l.x + bx0, z0 = l.z + bz0, x1 = l.x + bx1, z1 = l.z + bz1;
  const y = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 ? 0 : bukhanHeight(l, x - l.x, z - l.z));
  const W = ([x, z]) => [l.x + x, l.z + z];
  for (const p of l.pads) collision?.addDeck(padRing(p).map(W));
  if (l.summit.rock) collision?.addDeck(l.summit.rock.map(W)); // (the bare rock round the top)
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
  // The ground's own slope where you stand (the ground under the way is the way: core/bukhan-ground.js).
  let risk = null, restUntil = 0; // this run's chance a second; when you get up (performance.now())
  const slope = (p) => { const d = 1.5; return Math.hypot((y(p.x + d, p.z) - y(p.x - d, p.z)) / (2 * d), (y(p.x, p.z + d) - y(p.x, p.z - d)) / (2 * d)); };
  const pace = (p) => {
    if (performance.now() < restUntil) return 0; // (down: you can't move)
    if (p.x < x0 || p.x > x1 || p.z < z0 || p.z > z1) return 1;
    const d = 1.5, gx = (y(p.x + d, p.z) - y(p.x - d, p.z)) / (2 * d), gz = (y(p.x, p.z + d) - y(p.x, p.z - d)) / (2 * d);
    return climbPace(Math.hypot(gx, gz));
  };
  // On the mountain (inside its outline): you go on foot (Yozi 2026-11-27: no bikes, no taxis).
  const on = (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1 && inPoly(x - l.x, z - l.z, l.foot);
  // The hiking paths and the steps (not the road up from the station, nor the Visitor Center's plaza): running there you may trip, and the altitude shows.
  const roadWay = l.trails.filter((t) => t.k === 'road'), plaza = l.pads.find((q) => q.k === 'center');
  const noRun = (p) => {
    if (!on(p.x, p.z)) return false;
    const lx = p.x - l.x, lz = p.z - l.z;
    if (plaza && Math.hypot(lx - plaza.at[0], lz - plaza.at[1]) < plaza.r + RUN_NEAR) return false;
    return !roadWay.some((t) => trailNear(t, lx, lz).d < t.w / 2 + RUN_NEAR);
  };
  return {
    y,
    pace,
    noRun,
    // Every frame on the street: running on the paths, you may trip.
    run(p, dt, running, rnd = Math.random) {
      if (performance.now() < restUntil) return;
      if (!running || !noRun(p)) { risk = null; return; }
      if (risk == null) risk = TRIP.chance[0] + rnd() * (TRIP.chance[1] - TRIP.chance[0]);
      if (rnd() >= risk * (1 + slope(p) * TRIP.steep) * dt) return;
      restUntil = performance.now() + (TRIP.rest[0] + rnd() * (TRIP.rest[1] - TRIP.rest[0])) * 1000;
      risk = null;
      toast?.(text('bukhan.fell'));
    },
    get fallen() { return performance.now() < restUntil; },
    on,
    camOver: CAM_OVER,
    landmark: l,
    summit,
    update(p, dt) {
      const r = riding?.();
      if (r && r !== 3 && on(p.x, p.z)) { getOff?.(); toast?.(text('bukhan.noRide')); } // (you get off at the mountain's edge; a seat in a friend's car is theirs to stop)
      if (park) { park.update(p, dt, noRun(p)); return; }
      if (loading || !scene || near(p) > BUKHAN_NEAR) return;
      loading = true;
      import('./bukhansan-park.js')
        .then(({ buildBukhansanPark }) => {
          park = buildBukhansanPark({ scene, l, y, lowSpec, daylight, sfx, weather, text });
          if (seats) seats.push(...park.seats); // the benches at Harujae and the hut (main.js streetSeats)
        })
        .catch((e) => { loading = false; console.warn('bukhansan', e); });
    },
    // At the top, by the flag: look out over Seoul (a painted view).
    acts: (p) => (Math.hypot(p.x - summit[0], p.z - summit[1]) < SUMMIT_R ? [{ key: 'bukhan-view', label: text('bukhan.view'), run: openView }] : []),
    get viewOpen() { return !!view?.open; },
    get group() { return park?.group || null; },
    get park() { return park; },
  };
}
