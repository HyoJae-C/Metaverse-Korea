// The Han River Boat Taxi (한강보트택시): the trip along the river from one
// pier to another, without anything 3D (game/boat-taxi.js draws it). The
// piers and the line come from public/regions/another-seoul/boat-taxi.json
// (scripts/build-boat-taxi.mjs: the real Han River Bus piers and route at 1/4).
//
// Always running (an everyday way to get about, Yozi 2026-11-18): a boat
// waits at every pier, you pick where to go and it leaves at once, straight
// there without stopping on the way.

export const BOAT_TAXI = {
  fare: 3000, // won a trip, any distance (the real Han River Bus fare)
  speed: 15, // m/s cruising (about 5 minutes end to end)
  fast: 2.5, // ⏩: this many times faster (under 40 m/s: others' screens still glide you along, core/players.js)
  accel: 1.5, // m/s² leaving and coming in
  near: 2.2, // m round the pier's deck: the button to board
  load: 260, // m from a pier: download the boats and piers
};

// The line's metres: s[i] along it at each point.
export function lineLengths(route) {
  const s = [0];
  for (let i = 1; i < route.length; i++) s.push(s[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
  return s;
}

// The point s metres along the line, and the way it runs there (dir: unit x, z).
export function pointAt(route, lens, s) {
  const n = route.length;
  if (s <= 0) return { x: route[0][0], z: route[0][1], s: 0, ...unit(route[0], route[1]) };
  if (s >= lens[n - 1]) return { x: route[n - 1][0], z: route[n - 1][1], s: lens[n - 1], ...unit(route[n - 2], route[n - 1]) };
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lens[m] <= s) lo = m; else hi = m; }
  const a = route[lo], b = route[hi], t = (s - lens[lo]) / (lens[hi] - lens[lo] || 1);
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, s, ...unit(a, b) };
}
function unit(a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], d = Math.hypot(dx, dz) || 1;
  return { dx: dx / d, dz: dz / d };
}

// A trip from pier i to pier j: { from, to, s0, s1, len, dir (+1 east / -1 west), time (s) }.
// Speeds up from the berth, cruises, slows into the other berth.
export function planTrip(piers, i, j, o = BOAT_TAXI) {
  const s0 = piers[i].s, s1 = piers[j].s, len = Math.abs(s1 - s0);
  const ramp = Math.min(len / 2, (o.speed * o.speed) / (2 * o.accel)); // metres speeding up (and slowing down)
  const tRamp = Math.sqrt((2 * ramp) / o.accel), top = o.accel * tRamp;
  const time = 2 * tRamp + (len - 2 * ramp) / (top || 1);
  return { from: i, to: j, s0, s1, len, dir: s1 >= s0 ? 1 : -1, ramp, tRamp, top, time };
}

// How far along the trip after t seconds (0 .. len), and the speed then.
export function tripAt(trip, t, o = BOAT_TAXI) {
  const { len, tRamp, top, time } = trip;
  if (t <= 0) return { d: 0, v: 0, done: false };
  if (t >= time) return { d: len, v: 0, done: true };
  if (t < tRamp) return { d: 0.5 * o.accel * t * t, v: o.accel * t, done: false };
  const tEnd = time - tRamp;
  if (t <= tEnd) return { d: trip.ramp + top * (t - tRamp), v: top, done: false };
  const left = time - t;
  return { d: len - 0.5 * o.accel * left * left, v: o.accel * left, done: false };
}

// Minutes the trip takes at the normal speed (for the list), at least 1.
export const tripMinutes = (trip) => Math.max(1, Math.round(trip.time / 60));

// The pier whose deck (or the water round it, `near` m) holds (x, z), or -1.
export function pierAt(piers, x, z, near = BOAT_TAXI.near) {
  for (let i = 0; i < piers.length; i++) {
    const p = piers[i], c = Math.cos(p.ry), s = Math.sin(p.ry);
    const dx = x - p.at[0], dz = z - p.at[1];
    const u = dx * s + dz * c, v = dx * c - dz * s; // along the deck, across it (out to the river +)
    if (Math.abs(u) <= p.l / 2 + near && Math.abs(v) <= p.w / 2 + near) return i;
  }
  return -1;
}

// The nearest pier's distance from (x, z) (to load the boats in time).
export function nearestPier(piers, x, z) {
  let best = Infinity;
  for (const p of piers) best = Math.min(best, Math.hypot(x - p.at[0], z - p.at[1]));
  return best;
}
