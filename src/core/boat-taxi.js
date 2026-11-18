// The Han River Boat Taxi (한강보트택시): its timetable, without anything 3D
// (game/boat-taxi.js draws it). The piers and the line come from
// public/regions/another-seoul/boat-taxi.json (scripts/build-boat-taxi.mjs:
// the real Han River Bus piers and route at 1/4).
//
// Like the real Han River Bus, the boats run to a timetable (Yozi
// 2026-11-18): every BOAT_TAXI.every seconds a boat calls at each pier in
// each direction, stopping at every pier on the way. Everyone's screen works
// out the same boats from the same clock (like the cable car), so people who
// bought a ticket get on the same boat. The real one comes about once an
// hour (16 a day); a game day is 3 hours, so that would be one every 7.5
// minutes: Yozi chose half, 4 minutes.
//
// One boat's round: wait at the west end, sail east stopping at each pier,
// wait at the east end, sail back west stopping at each pier. The boats go
// round one after another, BOAT_TAXI.every seconds apart.

export const BOAT_TAXI = {
  fare: 3000, // won a ticket, any distance (the real Han River Bus fare)
  every: 240, // s between boats at a pier, each way (Yozi 2026-11-18: 4 minutes)
  speed: 30, // m/s cruising (Yozi 2026-11-18: twice the first 15)
  accel: 3, // m/s² leaving and coming in
  dwell: 20, // s at each pier on the way
  minEnd: 30, // s at least at each end before turning back
  pass: 7, // m: boats heading west keep this far to the side of the line, so two boats pass each other
  near: 2.2, // m round the pier's deck: where you wait for the boat
  load: 260, // m from a pier: download the boats and piers
};

let skew = 0;
export const clock = () => Date.now() / 1000 + skew;
export const skewClock = (s) => { skew += s; }; // (tests only: bring the next boat nearer)

// A phone whose clock is off by seconds would sail its own boats ahead of or
// behind everyone else's (Yozi 2026-11-18: some riders got off and arrived
// early). So set the clock by the web server's (its Date header): the
// quickest of three asks, put right only when it is off by more than 2 s
// (the header has whole seconds; a good clock stays as it is).
export async function syncClock(url = location.href) {
  let best = null;
  for (let i = 0; i < 3; i++) {
    try {
      const t0 = Date.now();
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      const t1 = Date.now(), d = Date.parse(r.headers.get('date') || '');
      if (!Number.isFinite(d)) continue;
      const off = (d + 500 + (t1 - t0) / 2 - t1) / 1000;
      if (!best || t1 - t0 < best.rtt) best = { rtt: t1 - t0, off };
    } catch { /* offline: keep this clock */ }
  }
  if (best && Math.abs(best.off) > 2) skew += best.off;
  return best?.off ?? null;
}

// The line's metres: s[i] along it at each point.
export function lineLengths(route) {
  const s = [0];
  for (let i = 1; i < route.length; i++) s.push(s[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
  return s;
}

// The point s metres along the line, and the way it runs there (dx, dz: unit, east).
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

// One hop between two piers: speeds up, cruises, slows in. { len, time, ramp, tRamp, top }
export function hop(len, o = BOAT_TAXI) {
  const ramp = Math.min(len / 2, (o.speed * o.speed) / (2 * o.accel));
  const tRamp = Math.sqrt((2 * ramp) / o.accel), top = o.accel * tRamp;
  return { len, ramp, tRamp, top, time: 2 * tRamp + (len - 2 * ramp) / (top || 1) };
}
// Metres covered t seconds into a hop.
export function hopAt(h, t, o = BOAT_TAXI) {
  if (t <= 0) return 0;
  if (t >= h.time) return h.len;
  if (t < h.tRamp) return 0.5 * o.accel * t * t;
  if (t <= h.time - h.tRamp) return h.ramp + h.top * (t - h.tRamp);
  const left = h.time - t;
  return h.len - 0.5 * o.accel * left * left;
}

// The timetable of one round: legs [{ t0, t1, dir, at (the pier it waits at) | from, to, h (a hop) }],
// the round's length, how many boats go round, and the wait at each end.
export function timetable(piers, o = BOAT_TAXI) {
  const n = piers.length;
  const hops = [];
  for (let i = 0; i + 1 < n; i++) hops.push(hop(piers[i + 1].s - piers[i].s, o));
  const sail = hops.reduce((a, h) => a + h.time, 0) + (n - 2) * o.dwell; // one way, with the stops on the way
  const boats = Math.ceil((2 * sail + 2 * o.minEnd) / o.every);
  const round = boats * o.every, end = (round - 2 * sail) / 2;
  const legs = [];
  let t = 0;
  const leg = (x, len) => { legs.push({ ...x, t0: t, t1: t + len }); t += len; };
  leg({ at: 0, dir: 1 }, end);
  for (let i = 0; i + 1 < n; i++) {
    leg({ from: i, to: i + 1, dir: 1, h: hops[i] }, hops[i].time);
    if (i + 1 < n - 1) leg({ at: i + 1, dir: 1 }, o.dwell);
  }
  leg({ at: n - 1, dir: -1 }, end);
  for (let i = n - 1; i > 0; i--) {
    leg({ from: i, to: i - 1, dir: -1, h: hops[i - 1] }, hops[i - 1].time);
    if (i - 1 > 0) leg({ at: i - 1, dir: -1 }, o.dwell);
  }
  return { legs, round, boats, end, sail, every: o.every };
}

const phase = (tt, b, now) => (((now + b * tt.every) % tt.round) + tt.round) % tt.round;

// Boat b at time `now`: { s (along the line), dir, at (the pier it waits at, or -1), next, left / into (s left in this leg, s into it) }.
export function boatAt(tt, piers, b, now) {
  const ph = phase(tt, b, now);
  let lo = 0, hi = tt.legs.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (tt.legs[m].t1 <= ph) lo = m + 1; else hi = m; }
  const leg = tt.legs[lo];
  if (leg.at != null) return { s: piers[leg.at].s, dir: leg.dir, at: leg.at, next: leg.at + leg.dir, left: leg.t1 - ph, into: ph - leg.t0 };
  return { s: piers[leg.from].s + leg.dir * hopAt(leg.h, ph - leg.t0), dir: leg.dir, at: -1, next: leg.to, left: leg.t1 - ph };
}

// The next boat heading `dir` that waits at pier i: { boat, wait (s until it
// is there, 0 if it is there now), leaves (s until it sets off) }.
export function nextBoat(tt, i, dir, now) {
  const l = tt.legs.find((q) => q.at === i && q.dir === dir);
  if (!l) return null;
  let best = null;
  for (let b = 0; b < tt.boats; b++) {
    const ph = phase(tt, b, now);
    const here = ph >= l.t0 && ph < l.t1;
    const wait = here ? 0 : (l.t0 - ph + tt.round) % tt.round;
    const leaves = here ? l.t1 - ph : wait + (l.t1 - l.t0);
    if (!best || leaves < best.leaves) best = { boat: b, wait, leaves };
  }
  return best;
}

// Seconds of sailing from pier i to pier j once aboard (with the stops between).
export function rideTime(tt, i, j) {
  const dir = j > i ? 1 : -1;
  let t = 0;
  for (let k = i; k !== j; k += dir) {
    const l = tt.legs.find((q) => q.from === k && q.to === k + dir);
    t += l.t1 - l.t0;
    if (k + dir !== j) t += BOAT_TAXI.dwell;
  }
  return t;
}

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

// Where a boat is on the water: (x, z) and its heading ry. Heading east it
// keeps to the line (and the berths beside the decks); heading west it keeps
// `pass` m to the side so two boats pass each other, and at a pier it ties
// up outside the berth (one boat's width further out).
export function boatPose(route, lens, piers, s, dir, boatW = 4, o = BOAT_TAXI) {
  const w = pointAt(route, lens, s);
  let x = w.x, z = w.z;
  if (dir < 0) {
    let ox = w.dz * o.pass, oz = -w.dx * o.pass; // (left of the line eastward: the right-hand side heading west)
    for (const p of piers) {
      const d = Math.abs(s - p.s);
      if (d >= 110) continue;
      const k = d <= 15 ? 1 : 1 - (d - 15) / 95, f = k * k * (3 - 2 * k);
      const ux = Math.cos(p.ry) * (boatW + 0.6), uz = -Math.sin(p.ry) * (boatW + 0.6); // (the deck's river side)
      ox += (ux - ox) * f; oz += (uz - oz) * f;
    }
    x += ox; z += oz;
  }
  return { x, z, ry: Math.atan2(w.dx * dir, w.dz * dir) };
}
