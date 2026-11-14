// Modu Land's rides as numbers (no 3D, so main.js and the tests can use
// them without loading the park's models, which come with import() on the
// first visit: themepark.js). Prices, where each ride stands, where seat i is
// at time t, the rides' names for their signs and attendants, and the park's
// layout: the central plaza and each ride's gate.

// Every member of staff (ride attendants, the coaster's, the ticket booth)
// wears the park's uniform: a pink shirt with a white placket, navy
// trousers, white sneakers and a berry cap with a heart. Faces and hair stay
// their own (main.js lays this over a random look).
export const PARK_UNIFORM = { model: 'ranger', shirt: 'peach', pants: 'navy', shoes: 'white', head: 'cap', hatColor: 'berry', hatPatch: 'heart', face: null, ear: null, neck: null, back: null, skirt: null, tee: null };

// Ticket prices (won): the thrill rides cost more, the gentle ones less.
// The bumper cars' fare is BUMPER_COST in bumper-cars.js.
export const RIDE_PRICE = { coaster: 7000, flume: 5000, gyro: 5000, drop: 4000, viking: 4000, swing: 3000, wheel: 3000, carousel: 2000, teacups: 2000, train: 2000 };
// The ride-all day pass, sold at the ticket booth: every ride in the park
// (bumper cars and the coaster too) as often as you like, today.
export const RIDE_PASS = 20000;
export const RIDE_SECONDS = { carousel: 24, wheel: 90, viking: 22, drop: 15, swing: 26, teacups: 26, train: 44, flume: 40, gyro: 30 }; // (the wheel: one slow turn, time to take in the view)

// Which rides are out on the island (park-island.js, in the open over the
// lake) and which are in the room under it (themepark.js). Both are in the
// coaster's metres, so a ride's x, z below is where it stands in either.
export const ISLAND_RIDES = ['wheel', 'drop', 'swing', 'gyro'];
export const UNDER_RIDES = ['carousel', 'viking', 'teacups', 'train', 'flume'];
// Pure ride motion (unit-tested): where seat i is at time t (seconds).
export const RIDES = {
  // 8 horses on the outer ring, 4 on the inner one.
  carousel: { x: -16, z: 12, seats: 12, r: 3, inner: 1.85, outer: 8, speed: 0.55 },
  // 8 gondolas of 2 (seat = gondola * 2 + side); you board the one at the bottom.
  // (on the island, north by the bridge: the first thing you see)
  wheel: { x: -40, z: -44, cabins: 8, seats: 16, r: 7, hub: 10, drop: 2.5, face: 1, speed: -(Math.PI * 2) / RIDE_SECONDS.wheel }, // (turning clockwise from the south: up on the west side, down on the east; gondolas hang 1 m under the rim, between its two faces 2 m apart)
  // 4 benches of 2 along the ship, everyone facing the middle; the deck is
  // `arm` below the pivot, the end benches stand higher (to see over).
  viking: { x: -13, z: -9, seats: 8, pivot: 6.6, arm: 5, max: 1.2, rows: [-2.25, -1.1, 1.1, 2.25], bench: [1.05, 0.6, 0.6, 1.05], omega: 1.36 },
  // Drop tower: 8 seats round the pole, facing out; load, climb, hold, drop.
  // The climb, the hold at the top and the fall (free fall at `g`, then the
  // magnetic brakes from `brake` metres up) are DROP_T.
  // (on the island, between the long run and the little hill after the helix)
  drop: { x: -13.2, z: -28.5, seats: 8, r: 1.75, low: 0.55, top: 22, brake: 8, g: 15 },
  // Swing ride: 16 chairs on chains from a spinning crown; as it speeds up
  // they fly out (tilt up to `tilt` radians).
  // (on the island, inside the coaster's north-west loop)
  swing: { x: -57, z: -29, seats: 16, arm: 2.6, chain: 4.2, hub: 5, tilt: 1.05, speed: 2 },
  // Teacups: 5 cups of 3 on a turning floor, each cup spinning the other way.
  teacups: { x: 29.5, z: 28.2, seats: 15, cups: 5, per: 3, R: 2.6, cupR: 0.9, speed: 0.5, spin: 1.9 },
  // The park train: an engine and 3 cars of 4 (2 benches of 2) round an
  // oval track in the south-east corner; it boards at the west straight.
  train: { x: 54, z: 20, rx: 5.5, rz: 9.5, seats: 12, cars: 3, gap: 2.4 },
  // Log flume: one log boat of 4 round a water channel: out of the
  // station, up the lift, along the top, down the big drop with a splash.
  // (x, z: where the boat waits at the station)
  flume: { x: 54.1, z: -16, seats: 4 },
  // Gyro swing, on the island south of the middle, by the walk to the
  // station: a ring of 16 seats facing out at
  // the end of a long arm, spinning, while the arm swings like a pendulum
  // between two A-frames, higher each time, up past level (`max` radians).
  // The arm swings in the x-y plane (about the z axis, like the ship).
  gyro: { x: -11.5, z: -13, seats: 16, pivot: 7.4, arm: 6.6, ring: 2.1, max: 1.75, omega: 1.15, spin: 0.9, legs: 3.8, frame: 3.4 },
};
// The carousel, the pirate ship and the drop tower run on everyone's shared
// clock (like the coaster), in cycles: load (stopped, bars up: get on now), run, stop. So
// friends ride the same swing, and everyone sees the same ship.
export const RIDE_CYCLE = { carousel: { load: 9, run: RIDE_SECONDS.carousel, stop: 3 }, viking: { load: 9, run: RIDE_SECONDS.viking, stop: 3 }, drop: { load: 9, run: RIDE_SECONDS.drop, stop: 2 },
  swing: { load: 9, run: RIDE_SECONDS.swing, stop: 4 }, teacups: { load: 9, run: RIDE_SECONDS.teacups, stop: 3 }, train: { load: 10, run: RIDE_SECONDS.train, stop: 3 }, flume: { load: 10, run: RIDE_SECONDS.flume, stop: 3 },
  gyro: { load: 10, run: RIDE_SECONDS.gyro, stop: 4 } };
const cycleLen = (c) => c.load + c.run + c.stop;
export function ridePhase(kind, t) {
  const c = RIDE_CYCLE[kind], len = cycleLen(c), n = Math.floor(t / len), p = t - n * len;
  const phase = p < c.load ? 'load' : p < c.load + c.run ? 'run' : 'stop';
  return { n, p, phase, s: p - c.load, left: phase === 'load' ? c.load - p : 0, next: phase === 'load' ? 0 : len - p };
}
// You can get on while it loads (not in its last second, when the bars come down).
export const canBoard = (kind, t) => { const r = ridePhase(kind, t); return r.phase === 'load' && r.left > 1.2; };
// The safety bars: 0 up, 1 down. They come down at the end of loading and
// go up once it has stopped.
export function barDown(kind, t) {
  const r = ridePhase(kind, t), c = RIDE_CYCLE[kind];
  if (r.phase === 'run') return 1;
  if (r.phase === 'load') return Math.min(1, Math.max(0, (1.2 - r.left) / 0.7));
  return Math.min(1, Math.max(0, 1 - (r.p - c.load - c.run - 1) / 0.7));
}
// The pirate ship's swing: builds up for 7 s, swings high, and dies down in
// the last 6 s, ending still.
export function vikingAngle(t) {
  const r = ridePhase('viking', t), V = RIDES.viking, run = RIDE_CYCLE.viking.run;
  if (r.phase !== 'run') return 0;
  const env = Math.min(1, r.s / 7, (run - r.s) / 6);
  return V.max * Math.max(0, env) * Math.sin(r.s * V.omega);
}
// The gyro swing's arm: pushed higher each swing for 10 s, swinging up past
// level, and let down in the last 8 s, ending still at the bottom.
export function gyroAngle(t) {
  const r = ridePhase('gyro', t), G = RIDES.gyro, run = RIDE_CYCLE.gyro.run;
  if (r.phase !== 'run') return 0;
  const env = Math.min(1, r.s / 10, (run - r.s) / 8);
  return G.max * Math.max(0, env) * Math.sin(r.s * G.omega);
}
// How fast the arm swings (radians a second), for the ride's thrill.
const gyroRate = (t) => (gyroAngle(t + 0.05) - gyroAngle(t - 0.05)) / 0.1;
// The carousel's turn: speeds up for 3 s, slows to a stop in the last 4 s.
const UP = 3, DOWN = 4;
function turned(s, run, w) {
  if (s <= 0) return 0;
  if (s < UP) return (w * s * s) / (2 * UP);
  const full = run - DOWN;
  if (s < full) return (w * UP) / 2 + w * (s - UP);
  const d = Math.min(s, run) - full;
  return (w * UP) / 2 + w * (full - UP) + w * d - (w * d * d) / (2 * DOWN);
}
// The gyro swing's ring: turns slowly the whole run (turned below), so each
// rider swings up facing a different way.
export function gyroSpin(t) {
  const c = RIDE_CYCLE.gyro, r = ridePhase('gyro', t), w = RIDES.gyro.spin;
  return r.n * turned(c.run, c.run, w) + turned(r.s, c.run, w);
}
export function carouselAngle(t) {
  const c = RIDE_CYCLE.carousel, r = ridePhase('carousel', t), w = RIDES.carousel.speed;
  return r.n * turned(c.run, c.run, w) + turned(r.s, c.run, w);
}
// How fast it's turning, 0..1 (the horses only bob while it turns).
export function carouselPace(t) {
  const c = RIDE_CYCLE.carousel, r = ridePhase('carousel', t);
  if (r.phase !== 'run') return 0;
  return Math.min(1, r.s / UP, (c.run - r.s) / DOWN);
}
// Height of the drop tower's seat ring at time t (seconds): still while it
// loads, a slow climb, a long, quiet hold at the top with your feet
// dangling, then the release: free fall (faster than real gravity, for the
// stomach), the magnetic brakes catching you low down, and a soft settle.
export const DROP_T = (() => {
  const { top, brake, g, low } = RIDES.drop, fall = Math.sqrt((2 * (top - brake)) / g), v = g * fall;
  const brakeS = (2 * (brake - low - 0.6)) / v; // (decelerating evenly to a crawl 0.6 m up)
  return { climb: 8, hold: 10.8, fall, v, brake: brakeS }; // hold: when it lets go (s into the run)
})();
export function dropY(t) {
  const { low, top, brake, g } = RIDES.drop, r = ridePhase('drop', t), T = DROP_T;
  if (r.phase !== 'run') return low;
  const s = r.s;
  if (s < T.climb) return low + (s / T.climb) * (top - low); // slow climb
  if (s < T.hold) return top; // hold at the top…
  const f = s - T.hold;
  if (f < T.fall) return top - 0.5 * g * f * f; // …free fall
  const b = f - T.fall, a = T.v / T.brake;
  if (b < T.brake) return brake - T.v * b + 0.5 * a * b * b; // the brakes
  return low + 0.6 * Math.max(0, 1 - (b - T.brake) / 1.5); // settle
}
// How fast it feels (the coaster's effects use it: coaster.js rideFx): k 0..1
// of the ride's top speed, v in m/s, and the coaster's phase names (the
// drop tower climbs like a chain lift, holds, drops; the swing runs).
export function rideSpeed(kind, t) {
  const r = ridePhase(kind, t);
  if (r.phase !== 'run') return { k: 0, v: 0, phase: r.phase === 'load' ? 'board' : 'unload' };
  if (kind === 'drop') {
    const T = DROP_T, s = r.s, f = s - T.hold;
    if (s < T.climb) return { k: 0.12, v: (RIDES.drop.top - RIDES.drop.low) / T.climb, phase: 'lift' };
    if (f < 0) return { k: 0, v: 0, phase: 'hold' };
    if (f < T.fall) { const v = RIDES.drop.g * f; return { k: v / T.v, v, phase: 'drop' }; }
    const b = f - T.fall, v = Math.max(0, T.v - (T.v / T.brake) * b);
    return { k: v / T.v, v, phase: b < T.brake ? 'run' : 'brake' };
  }
  if (kind === 'gyro') { // (fastest through the bottom of each swing)
    const G = RIDES.gyro, v = Math.abs(gyroRate(t)) * G.arm, top = G.max * G.omega * G.arm, a = Math.abs(gyroAngle(t));
    return { k: Math.min(1, v / top), v, phase: a > 1.2 ? 'hold' : 'run' }; // (up past level: that weightless moment)
  }
  if (kind === 'swing') {
    const k = Math.sqrt(swingTilt(t) / RIDES.swing.tilt), S = RIDES.swing;
    return { k, v: k * S.speed * (S.arm + S.chain * Math.sin(S.tilt)), phase: 'run' };
  }
  return { k: 0, v: 0, phase: 'run' };
}
// The Ferris wheel turns all the time, on the shared clock; gondola i's angle
// from the bottom. You get on at the bottom and ride one full turn.
export const wheelAngle = (i, t) => (i / RIDES.wheel.cabins) * Math.PI * 2 + t * RIDES.wheel.speed;
// The gondola nearest the bottom now (the one you board).
export function wheelBottom(t) {
  const n = RIDES.wheel.cabins, k = Math.round((-t * RIDES.wheel.speed) / ((Math.PI * 2) / n));
  return ((k % n) + n) % n;
}
// A gondola's door is open near the bottom (and its bar shut everywhere else).
export function wheelDoorOpen(i, t) {
  const a = (((wheelAngle(i, t) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return Math.abs(a) < 0.3;
}
// When a ride that starts now ends. The carousel, the ship and the drop
// tower: at the end of this cycle (you get on while it loads). The wheel:
// one full turn, back at the bottom.
export function rideUntil(kind, now) {
  if (RIDE_CYCLE[kind]) { const c = RIDE_CYCLE[kind], r = ridePhase(kind, now); return now - r.p + c.load + c.run + 0.6; }
  return now + RIDE_SECONDS[kind];
}
// Whether you're held in (bar down, or up in the air): the action button
// switches the view instead of letting you off.
export function rideLocked(kind, seat, t) {
  if (RIDE_CYCLE[kind]) return ridePhase(kind, t).phase === 'run';
  if (kind === 'wheel') return !wheelDoorOpen(seat >> 1, t);
  return false;
}
// Where a carousel horse is (in the carousel's own turning frame, angle 0).
export function horseSpot(i) {
  const R = RIDES.carousel, out = i < R.outer;
  const a = out ? (i / R.outer) * Math.PI * 2 : ((i - R.outer + 0.5) / (R.seats - R.outer)) * Math.PI * 2;
  return { a, r: out ? R.r : R.inner };
}
// The swing ride: how far the crown has turned, and how far out the chairs
// fly (0 hanging, up to RIDES.swing.tilt at full speed).
export function swingAngle(t) {
  const c = RIDE_CYCLE.swing, r = ridePhase('swing', t), w = RIDES.swing.speed;
  return -(r.n * turned(c.run, c.run, w) + turned(r.s, c.run, w)); // (round the other way to the carousel)
}
export function swingTilt(t) {
  const c = RIDE_CYCLE.swing, r = ridePhase('swing', t);
  if (r.phase !== 'run') return 0;
  const k = Math.min(1, r.s / 4, (c.run - r.s) / 5);
  return RIDES.swing.tilt * Math.max(0, k) * Math.max(0, k) * (1 + 0.06 * Math.sin(r.s * 1.7) * Math.min(1, k * 2)) / 1.06; // (a little rise and fall at full speed)
}
// Teacups: the floor turns one way, each cup spins the other (faster).
export function teacupFloor(t) {
  const c = RIDE_CYCLE.teacups, r = ridePhase('teacups', t), w = RIDES.teacups.speed;
  return r.n * turned(c.run, c.run, w) + turned(r.s, c.run, w);
}
export function teacupSpin(c, t) {
  const C = RIDE_CYCLE.teacups, r = ridePhase('teacups', t), w = RIDES.teacups.spin * (1 + (c % 3) * 0.18);
  return c * 1.3 - (r.n * turned(C.run, C.run, w) + turned(r.s, C.run, w));
}
export function teacupSpot(c, t) {
  const T = RIDES.teacups, a = teacupFloor(t) + (c / T.cups) * Math.PI * 2;
  return { x: T.x + Math.sin(a) * T.R, z: T.z + Math.cos(a) * T.R, a };
}

// A smooth closed path through control points: a centripetal Catmull-Rom
// spline (the coaster's kind of curve: round bends, no overshoot), walked
// by distance. pts: the curve every `step` m; ctrl: the control points;
// at(d): where you are d m along, which way it heads (ry) and how steeply
// (pitch, + nose down), read off the curve half a metre either side so they
// turn smoothly too; seg: the stretch (ctrl[seg] → ctrl[seg+1]) you're on.
function smoothLoop(ctrl, step = 0.25) {
  const n = ctrl.length, P = (i) => ctrl[((i % n) + n) % n];
  const knot = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])) || 1e-4;
  const fine = [], fineSeg = [];
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const t1 = knot(p0, p1), t2 = t1 + knot(p1, p2), t3 = t2 + knot(p2, p3);
    for (let k = 0; k < 40; k++) {
      const t = t1 + ((t2 - t1) * k) / 40, q = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        const a1 = ((t1 - t) * p0[c] + t * p1[c]) / t1, a2 = ((t2 - t) * p1[c] + (t - t1) * p2[c]) / (t2 - t1), a3 = ((t3 - t) * p2[c] + (t - t2) * p3[c]) / (t3 - t2);
        const b1 = ((t2 - t) * a1 + t * a2) / t2, b2 = ((t3 - t) * a2 + (t - t1) * a3) / (t3 - t1);
        q[c] = ((t2 - t) * b1 + (t - t1) * b2) / (t2 - t1);
      }
      fine.push(q); fineSeg.push(i);
    }
  }
  const fcum = [0];
  for (let i = 1; i <= fine.length; i++) { const a = fine[i - 1], b = fine[i % fine.length]; fcum.push(fcum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
  const len = fcum[fine.length], N = Math.round(len / step), ds = len / N, pts = [], segOf = [];
  for (let j = 0, i = 0; j < N; j++) {
    const d = j * ds;
    while (fcum[i + 1] < d) i++;
    const a = fine[i], b = fine[(i + 1) % fine.length], k = (d - fcum[i]) / (fcum[i + 1] - fcum[i] || 1);
    pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
    segOf.push(fineSeg[i]);
  }
  const pos = (d) => {
    d = ((d % len) + len) % len;
    const j = Math.min(N - 1, Math.floor(d / ds)), a = pts[j], b = pts[(j + 1) % N], k = d / ds - j;
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, z: a[2] + (b[2] - a[2]) * k, j };
  };
  const at = (d) => {
    const p = pos(d), f = pos(d + 0.5), r = pos(d - 0.5), dx = f.x - r.x, dy = f.y - r.y, dz = f.z - r.z;
    return { x: p.x, y: p.y, z: p.z, ry: Math.atan2(dx, dz), pitch: -Math.atan2(dy, Math.hypot(dx, dz)), seg: segOf[p.j] };
  };
  return { ctrl, pts, ds, len, at };
}
// The train's oval, from its west point (the station), heading south: a
// smooth curve through 32 points on the ellipse, like the flume's channel.
export const TRAIN_TRACK = smoothLoop(Array.from({ length: 32 }, (_, k) => {
  const u = -Math.PI / 2 + (k / 32) * Math.PI * 2, T = RIDES.train;
  return [T.x + T.rx * Math.sin(u), 0, T.z + T.rz * Math.cos(u)];
}), 0.5);
// Where the train's front is at t: stopped at the station while it loads,
// one lap, easing out of and back into the station.
export const TRAIN_STOP = 6; // m past the oval's south point: the engine stops here
export function trainDist(t) {
  const c = RIDE_CYCLE.train, r = ridePhase('train', t), L = TRAIN_TRACK.len;
  if (r.phase !== 'run') return TRAIN_STOP;
  const k = r.s / c.run, e = k < 0.12 ? (k * k) / (2 * 0.12 * 0.88) : k > 0.88 ? 1 - ((1 - k) * (1 - k)) / (2 * 0.12 * 0.88) : (k - 0.06) / 0.88;
  return TRAIN_STOP + L * e;
}
// Seat i: car (i >> 2), bench (i >> 1 & 1), side (i & 1); the cars trail
// the engine, a car's benches 0.9 m apart, 0.32 m either side.
export function trainSpot(i, t) {
  const T = RIDES.train, car = i >> 2, bench = (i >> 1) & 1, side = i & 1 ? 0.32 : -0.32;
  const p = TRAIN_TRACK.at(trainDist(t) - T.gap * (car + 1) - 0.45 + bench * 0.9);
  return { x: p.x + Math.cos(p.ry) * side, y: 0.27, z: p.z - Math.sin(p.ry) * side, ry: p.ry }; // (feet: the bench is 0.65 up)
}
// The log flume's channel in the north-east field, through these points
// ([x, y (water level), z]): from the station heading west, round and up
// the lift north, along the top, the big drop south, the splash pool and
// into the station again.
export const FLUME_TRACK = smoothLoop([
  [57.3, 0.38, -16.15], [55.6, 0.4, -16], [45.4, 0.4, -16], [43.2, 0.4, -16.6], [42.2, 0.4, -18.2], [42, 0.4, -20], // into the station (heading west), round the bend
  [42, 1.2, -21.5], [42, 5.6, -29], [42.6, 6, -31], [44.8, 6, -32.4], [55, 6, -32.4], [57.4, 6, -31], // the lift north, along the top
  [58, 5.9, -28.6], [58, 0.35, -20.6], [58, 0.3, -18.6], [58.2, 0.35, -17.4], // the big drop south, the splash pool
]);
const FLUME_START = 3.2; // m along: the boat's middle at the station
// How fast the boat goes all the way round, like the coaster's: the water
// carries it at 1.7 m/s; the lift's belt takes it up at a steady 1 m/s
// (easing on and off); down the drop gravity speeds it up and the water
// holds it back, hardest in the splash pool; it eases out of the station
// and back in to stop. v[k] is the speed k·ds past the start, time[k] when
// it gets there; a lap is scaled to the ride's run.
const FLUME_RUN = (() => {
  const T = FLUME_TRACK, ds = 0.1, n = Math.round(T.len / ds), v = [], time = [0];
  const W = 1.7, BELT = 1, ACC = 0.45, sOf = (i) => { let d = 0; while (T.at(FLUME_START + d).seg !== i) d += 0.1; return d; };
  const lift0 = sOf(5), lift1 = sOf(8), pool = sOf(14);
  let sp = 0.3, yPrev = T.at(FLUME_START).y, stopping = false;
  for (let k = 0; k <= n; k++) {
    const s = k * ds, y = T.at(FLUME_START + s).y;
    if (s > lift0 - 0.5 && s < lift1) sp += (BELT - sp) * Math.min(1, ds * 2); // on the belt
    else {
      sp = Math.sqrt(Math.max(0.04, sp * sp + 2 * 9.8 * 0.8 * (yPrev - y))); // down a slope: faster
      const drag = s > pool - 1.5 && s < pool + 4 ? 0.45 : sp > W ? 0.06 : 0.8; // (the splash pool stops it hard)
      sp += (W - sp) * Math.min(1, ds * drag);
    }
    yPrev = y;
    const easeIn = 0.3 + Math.sqrt(2 * ACC * s), easeOut = 0.15 + Math.sqrt(2 * ACC * Math.max(0, T.len - s));
    if (s > pool && sp <= easeOut) stopping = true; // (from where the two meet, it slows to a stop)
    v.push(Math.max(0.15, Math.min(sp, easeIn, stopping ? easeOut : 99)));
    if (k) time.push(time[k - 1] + (2 * ds) / (v[k - 1] + v[k]));
  }
  return { ds, v, time, lap: time[n] };
})();
// Where the boat (its middle) is along the channel at t: at the station
// while it loads, then one lap, scaled to the run.
export function flumeDist(t) {
  const c = RIDE_CYCLE.flume, r = ridePhase('flume', t), R = FLUME_RUN;
  if (r.phase !== 'run') return FLUME_START;
  const tt = Math.min(1, r.s / c.run) * R.lap;
  let lo = 0, hi = R.time.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R.time[m] <= tt) lo = m; else hi = m; }
  return FLUME_START + R.ds * (lo + Math.min(1, (tt - R.time[lo]) / (R.time[hi] - R.time[lo] || 1)));
}
// Seat i: two rows of two in the log, the front row 0.5 m ahead.
export function flumeSpot(i, t) {
  const row = i >> 1, side = i & 1 ? 0.28 : -0.28;
  const p = FLUME_TRACK.at(flumeDist(t) + (row ? -0.5 : 0.5));
  return { x: p.x + Math.cos(p.ry) * side, y: p.y - 0.08, z: p.z - Math.sin(p.ry) * side, ry: p.ry, pitch: p.pitch, seg: p.seg }; // (feet: the benches are 0.35 over the water line)
}

// Seat i at time t: where the rider sits (feet), which way they face (ry),
// and roll: how far the ride tips them (the ship's swing, about the z axis).
export function seatAt(kind, i, t) {
  const R = RIDES[kind];
  if (kind === 'carousel') {
    const h = horseSpot(i), a = h.a + carouselAngle(t);
    const bob = 0.22 * carouselPace(t) * Math.sin(t * 2.4 + i * 1.7);
    return { x: R.x + Math.sin(a) * h.r, y: 0.62 + bob, z: R.z + Math.cos(a) * h.r, ry: a + Math.PI / 2, roll: 0 };
  }
  if (kind === 'wheel') {
    const a = wheelAngle(i >> 1, t);
    // Gondolas hang below the rim; sit on its bench, looking out over the park (south).
    return { x: R.x + Math.sin(a) * R.r + (i % 2 ? 0.38 : -0.38), y: R.hub - Math.cos(a) * R.r - R.drop + 0.12, z: R.z + 0.2 - 0.3, ry: 0, roll: 0 };
  }
  if (kind === 'drop') {
    const a = (i / R.seats) * Math.PI * 2;
    return { x: R.x + Math.sin(a) * R.r, y: dropY(t) + 0.12, z: R.z + Math.cos(a) * R.r, ry: a, roll: 0 };
  }
  if (kind === 'swing') {
    const a = (i / R.seats) * Math.PI * 2 + swingAngle(t), th = swingTilt(t), out = R.arm + R.chain * Math.sin(th);
    return { x: R.x + Math.sin(a) * out, y: R.hub - R.chain * Math.cos(th) - 0.38 - 0.12, z: R.z + Math.cos(a) * out, ry: a - Math.PI / 2, roll: 0 }; // (facing the way round)
  }
  if (kind === 'teacups') {
    const c = Math.floor(i / R.per), j = i % R.per, cup = teacupSpot(c, t), b = teacupSpin(c, t) + (j / R.per) * Math.PI * 2;
    const sx = cup.x + Math.sin(b) * R.cupR * 0.55, sz = cup.z + Math.cos(b) * R.cupR * 0.55;
    return { x: sx, y: 0.2, z: sz, ry: b + Math.PI, roll: 0 }; // (facing the middle of the cup)
  }
  if (kind === 'gyro') {
    // Seat i on the ring (facing out), the ring turned by its spin, at the
    // arm's end, the arm swung about the pivot (about z: roll).
    const th = gyroAngle(t), a = (i / R.seats) * Math.PI * 2 + gyroSpin(t);
    const lx = Math.sin(a) * R.ring, ly = -R.arm + 0.12, lz = Math.cos(a) * R.ring; // (feet: the seats are 0.45 over the ring)
    const c = Math.cos(th), s = Math.sin(th);
    return { x: R.x + lx * c - ly * s, y: R.pivot + lx * s + ly * c, z: R.z + lz, ry: a, roll: th };
  }
  if (kind === 'train' || kind === 'flume') {
    const P = kind === 'train' ? trainSpot(i, t) : flumeSpot(i, t);
    return { x: P.x, y: P.y, z: P.z, ry: P.ry, roll: 0, pitch: P.pitch || 0 };
  }
  // viking: the bench's spot in the ship, turned about the pivot.
  const ang = vikingAngle(t), off = R.rows[i >> 1], side = i % 2 ? 0.45 : -0.45;
  const ly = -R.arm + R.bench[i >> 1] - 0.38; // (feet: the sitting pose's seat height below the bench)
  const c = Math.cos(ang), s = Math.sin(ang);
  return { x: R.x + off * c - ly * s, y: R.pivot + off * s + ly * c, z: R.z + side, ry: off < 0 ? Math.PI / 2 : -Math.PI / 2, roll: ang };
}

// The park's layout (room metres; the gate is at the south, z = 34).
// Main Street runs north from the gate to the round central plaza with its
// fountain. The rides are spread round it, a short walk apart along winding
// paths (park-grounds.js), each in its own fenced yard with a gate on the
// side its path comes from: the carousel and the pirate ship west, by the
// coaster's avenue; the teacups south of the food truck lane; the bumper
// cars past the food trucks, south-east. Up on the island (park-island.js)
// the Ferris wheel, the drop tower, the swing ride and the gyro swing have
// yards and gates of their own, off the island's walks.
export const PLAZA = { x: 0, z: 4, r: 6 };
// Where you board each ride (at its yard's gate) and where its attendant stands.
export const RIDE_GATES = {
  carousel: { x: RIDES.carousel.x + 5.6, z: RIDES.carousel.z, ry: Math.PI / 2, staff: { x: RIDES.carousel.x + 5.2, z: RIDES.carousel.z - 1.9, ry: Math.PI / 2 } },
  viking: { x: RIDES.viking.x + 4.6, z: RIDES.viking.z + 3.8, ry: 0, staff: { x: RIDES.viking.x + 2.6, z: RIDES.viking.z + 3.7, ry: 0 } },
  wheel: { x: RIDES.wheel.x - 2, z: RIDES.wheel.z + 4.2, ry: 0, staff: { x: RIDES.wheel.x - 4, z: RIDES.wheel.z + 3.7, ry: 0 } },
  drop: { x: RIDES.drop.x - 4.7, z: RIDES.drop.z, ry: -Math.PI / 2, staff: { x: RIDES.drop.x - 4.2, z: RIDES.drop.z + 1.9, ry: -Math.PI / 2 } },
  // The swing ride: its gate on the east side, where the walk comes in
  // under the airtime hill; the gyro swing: on the south side.
  swing: { x: RIDES.swing.x + 7.7, z: RIDES.swing.z, ry: Math.PI / 2, staff: { x: RIDES.swing.x + 7.3, z: RIDES.swing.z - 1.9, ry: Math.PI / 2 } },
  gyro: { x: RIDES.gyro.x, z: RIDES.gyro.z + 5.9, ry: 0, staff: { x: RIDES.gyro.x - 2, z: RIDES.gyro.z + 5.4, ry: 0 } },
  // The teacups: their gate on the north side, off the food truck lane.
  teacups: { x: RIDES.teacups.x, z: RIDES.teacups.z - 5.9, ry: Math.PI, staff: { x: RIDES.teacups.x - 1.9, z: RIDES.teacups.z - 5.4, ry: Math.PI } },
  // The train: on its station's platform (west of the oval), the flume: on its boarding platform.
  train: { x: 47.1, z: 24, ry: -Math.PI / 2, staff: { x: 47.1, z: 22.1, ry: -Math.PI / 2 } },
  flume: { x: 54.5, z: -14.3, ry: 0, staff: { x: 52.6, z: -14.6, ry: 0 } },
};
// The Mirror Maze (free, walk in): a grid of 2 m cells north of the east
// promenade, its way in on the south side (from the promenade) and its way
// out on the east. The walls are a fixed maze (a seeded walk, so it's the
// same for everyone): [x0, z0, x1, z1] lines of mirror.
export const MAZE = (() => {
  const cols = 5, rows = 4, cell = 2, x0 = 30.5, z0 = -12, doorCol = 2, exitRow = 0;
  const h = Array.from({ length: rows + 1 }, () => Array(cols).fill(true)); // h[r][c]: the line z = z0 + r·cell over cell c
  const v = Array.from({ length: rows }, () => Array(cols + 1).fill(true)); // v[r][c]: the line x = x0 + c·cell beside row r
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const seen = new Set(['0,0']), stack = [[0, 0]];
  while (stack.length) {
    const [c, r] = stack[stack.length - 1];
    const next = [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rows && !seen.has(a + ',' + b));
    if (!next.length) { stack.pop(); continue; }
    const [a, b] = next[Math.floor(rnd() * next.length)];
    if (a !== c) v[r][Math.max(a, c)] = false; else h[Math.max(b, r)][c] = false;
    seen.add(a + ',' + b);
    stack.push([a, b]);
  }
  h[rows][doorCol] = false; // the way in (south)
  v[exitRow][cols] = false; // the way out (east)
  // Join each line's neighbouring pieces into one wall.
  const walls = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c < cols; c++) {
    if (!h[r][c]) continue;
    let e = c;
    while (e + 1 < cols && h[r][e + 1]) e++;
    walls.push([x0 + c * cell, z0 + r * cell, x0 + (e + 1) * cell, z0 + r * cell]);
    for (let k = c; k <= e; k++) h[r][k] = false;
  }
  for (let c = 0; c <= cols; c++) for (let r = 0; r < rows; r++) {
    if (!v[r][c]) continue;
    let e = r;
    while (e + 1 < rows && v[e + 1][c]) e++;
    walls.push([x0 + c * cell, z0 + r * cell, x0 + c * cell, z0 + (e + 1) * cell]);
    for (let k = r; k <= e; k++) v[k][c] = false;
  }
  const w = cols * cell, d = rows * cell;
  return { cols, rows, cell, x0, z0, x1: x0 + w, z1: z0 + d, w, d, x: x0 + w / 2, z: z0 + d / 2, walls,
    door: [x0 + (doorCol + 0.5) * cell, z0 + d], exit: [x0 + w, z0 + (exitRow + 0.5) * cell] };
})();
// How far (x, z) is from a ride's track or channel, on the ground plan
// (so trees and lamps keep off it).
export function trackDist(track, x, z) {
  let best = Infinity;
  const p = track.pts;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz;
    const k = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / L2)) : 0;
    best = Math.min(best, Math.hypot(x - a[0] - dx * k, z - a[2] - dz * k));
  }
  return best;
}
// The flume's splash pool, at the foot of the big drop.
export const FLUME_POOL = { x: 58.6, z: -19.4, r: 3, sz: 1.4 };

// The rides' names, on the signs over their gates and in their attendants'
// name tags (the coaster's own sign is coaster-model.js).
export const COASTER_NAME = { ko: '솜사탕 특급', en: 'Cotton Candy Express', ja: 'わたあめ特急', zh: '棉花糖特快', es: 'Expreso Algodón de Azúcar', id: 'Ekspres Gulali', vi: 'Tàu Lượn Kẹo Bông', hi: 'कॉटन कैंडी एक्सप्रेस', fr: 'Express Barbe à Papa', th: 'สายไหมเอ็กซ์เพรส', ar: 'قطار غزل البنات السريع' };
export const RIDE_NAME = {
  carousel: { ko: '사탕 회전목마', en: 'Candy Carousel', ja: 'キャンディ・メリーゴーランド', zh: '糖果旋转木马', es: 'Carrusel de Caramelo', id: 'Komidi Putar Permen', vi: 'Vòng Quay Ngựa Kẹo', hi: 'कैंडी कैरोसेल', fr: 'Carrousel Bonbon', th: 'ม้าหมุนลูกกวาด', ar: 'دوّامة الحلوى' },
  viking: { ko: '초코 바이킹', en: 'Choco Viking', ja: 'チョコ・バイキング', zh: '巧克力海盗船', es: 'Vikingo de Chocolate', id: 'Viking Cokelat', vi: 'Thuyền Viking Sô-cô-la', hi: 'चॉको वाइकिंग', fr: 'Drakkar Chocolat', th: 'ไวกิ้งช็อกโก', ar: 'سفينة الشوكولاتة' },
  wheel: { ko: '무지개 관람차', en: 'Rainbow Wheel', ja: 'にじいろ観覧車', zh: '彩虹摩天轮', es: 'Noria Arcoíris', id: 'Bianglala Pelangi', vi: 'Đu Quay Cầu Vồng', hi: 'रेनबो व्हील', fr: 'Grande Roue Arc-en-ciel', th: 'ชิงช้าสวรรค์สายรุ้ง', ar: 'عجلة قوس قزح' },
  drop: { ko: '롤리팝 드롭', en: 'Lollipop Drop', ja: 'ロリポップ・ドロップ', zh: '棒棒糖跳楼机', es: 'Caída Piruleta', id: 'Menara Lolipop', vi: 'Tháp Rơi Kẹo Mút', hi: 'लॉलीपॉप ड्रॉप', fr: 'Chute Sucette', th: 'ลูกอมดิ่งพสุธา', ar: 'برج المصاصة' },
  swing: { ko: '슈가 회전그네', en: 'Sugar Swing', ja: 'シュガー・スイング', zh: '砂糖旋转秋千', es: 'Sillas Voladoras de Azúcar', id: 'Ayunan Gula', vi: 'Đu Quay Dây Đường', hi: 'शुगर स्विंग', fr: 'Chaises Volantes Sucre', th: 'ชิงช้าหมุนน้ำตาล', ar: 'أرجوحة السكر' },
  teacups: { ko: '찻잔 파티', en: 'Teacup Party', ja: 'ティーカップ・パーティー', zh: '茶杯派对', es: 'Fiesta de las Tazas', id: 'Pesta Cangkir Teh', vi: 'Tiệc Tách Trà', hi: 'टीकप पार्टी', fr: 'Fête des Tasses', th: 'ปาร์ตี้ถ้วยชา', ar: 'حفلة فناجين الشاي' },
  train: { ko: '캔디 기차', en: 'Candy Train', ja: 'キャンディ・トレイン', zh: '糖果小火车', es: 'Tren de Caramelo', id: 'Kereta Permen', vi: 'Tàu Hỏa Kẹo', hi: 'कैंडी ट्रेन', fr: 'Petit Train Bonbon', th: 'รถไฟลูกกวาด', ar: 'قطار الحلوى' },
  gyro: { ko: '마카롱 자이로스윙', en: 'Macaron Gyro Swing', ja: 'マカロン・ジャイロスイング', zh: '马卡龙大摆锤', es: 'Péndulo Macarón', id: 'Ayunan Giro Makaron', vi: 'Đu Quay Con Lắc Macaron', hi: 'मैकरॉन जाइरो स्विंग', fr: 'Pendule Macaron', th: 'ไจโรสวิงมาการง', ar: 'بندول الماكرون' },
  flume: { ko: '젤리 후룸라이드', en: 'Jelly Flume', ja: 'ゼリー・フルーム', zh: '果冻激流勇进', es: 'Troncos de Gelatina', id: 'Arung Jeram Jeli', vi: 'Thuyền Gỗ Thạch', hi: 'जेली फ्लूम', fr: 'Bûches Gelée', th: 'ล่องแก่งเยลลี่', ar: 'قناة الجيلي المائية' },
  maze: { ko: '거울 미로', en: 'Mirror Maze', ja: 'ミラー迷路', zh: '镜子迷宫', es: 'Laberinto de Espejos', id: 'Labirin Cermin', vi: 'Mê Cung Gương', hi: 'शीशों की भूलभुलैया', fr: 'Labyrinthe des Miroirs', th: 'เขาวงกตกระจก', ar: 'متاهة المرايا' },
  bumper: { ko: '젤리 범퍼카', en: 'Jelly Bumper Cars', ja: 'ゼリー・バンパーカー', zh: '果冻碰碰车', es: 'Autos Chocones de Gominola', id: 'Bom-bom Car Jeli', vi: 'Xe Điện Đụng Thạch', hi: 'जेली बंपर कार', fr: 'Autos Tamponneuses Gelée', th: 'รถบั๊มเยลลี่', ar: 'سيارات الجيلي المتصادمة' },
  coaster: COASTER_NAME,
};
// The food trucks on the lane from the plaza to the bumper cars, serving
// window to the lane (+z): ice cream cones, churros and hot dogs. Each sells
// one snack, eaten from the hand (held 'food:<snack>'). Prices in won.
export const FOOD_TRUCKS = [
  { id: 'icecream', x: 12.5, z: 8.2, color: '#8fd0ff', awning: '#fffaf3', price: 3000,
    name: { ko: '아이스크림 콘', en: 'Ice Cream Cone', ja: 'ソフトクリーム', zh: '冰淇淋甜筒', es: 'Cono de helado', id: 'Es Krim Cone', vi: 'Kem ốc quế', hi: 'आइसक्रीम कोन', fr: 'Cornet de glace', th: 'ไอศกรีมโคน', ar: 'آيس كريم بالبسكويت' },
    truck: { ko: '말랑 아이스크림', en: 'Mallang Ice Cream', ja: 'マルラン・アイス', zh: '软软冰淇淋' } },
  { id: 'churro', x: 18.5, z: 9.7, color: '#ffad6b', awning: '#ff5a5f', price: 3500,
    name: { ko: '츄러스', en: 'Churros', ja: 'チュロス', zh: '吉事果', es: 'Churros', id: 'Churros', vi: 'Churros', hi: 'चुरोस', fr: 'Churros', th: 'ชูโรส', ar: 'تشوروس' },
    truck: { ko: '바삭 츄러스', en: 'Basak Churros', ja: 'バサク・チュロス', zh: '酥脆吉事果' } },
  { id: 'hotdog', x: 24.5, z: 11, color: '#ffe27a', awning: '#ff5f9e', price: 4000,
    name: { ko: '핫도그', en: 'Hot Dog', ja: 'ホットドッグ', zh: '热狗', es: 'Perrito caliente', id: 'Hot Dog', vi: 'Xúc xích kẹp bánh mì', hi: 'हॉट डॉग', fr: 'Hot-dog', th: 'ฮอทดอก', ar: 'هوت دوج' },
    truck: { ko: '통통 핫도그', en: 'Tongtong Hot Dogs', ja: 'トントン・ホットドッグ', zh: '胖胖热狗' } },
];
export const FOOD_TRUCK = { w: 4, d: 2.2 }; // the body, long side along x
// Where you stand to buy (in front of the window) and where the seller is.
export const truckWindow = (f) => ({ x: f.x, z: f.z + FOOD_TRUCK.d / 2 + 0.9 });
// (sitting on a stool inside, high enough to be seen over the counter)
export const SELLER_Y = 0.62; // m: the seller's feet (the stool's top is the sitting pose's 0.38 above)
export const truckSeller = (f) => ({ x: f.x - 0.3, y: SELLER_Y, z: f.z + 0.15, ry: 0, sit: true });
// The balloon clown on tall stilt shoes, by Main Street (game/balloon-clown.js).
export const CLOWN = { x: 4.8, z: 14, ry: -Math.PI / 2 };

export const RIDE_EMOJI = { carousel: '🎠', wheel: '🎡', viking: '🏴‍☠️', drop: '🍭', swing: '🎪', teacups: '☕', train: '🚂', flume: '🪵', gyro: '🌀', maze: '🪞', bumper: '🚗', coaster: '🎢' };
