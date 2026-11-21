// Gimpo Airport's flights (scripts/build-gimpo.mjs, game/gimpo-site.js):
// one plane every 20 minutes, a takeoff and then, 20 minutes later, a
// landing back at the same stand (Yozi 2026-11-21: "3시간이 하루니까 20분에
// 1대씩"). None at night, as the real Gimpo has no flights from 23:00 to
// 6:00. The clock is the real time, so everyone sees the same plane.
// Pure logic, no three.js: tests/gimpo.test.mjs.
//
//   const fl = gimpoFlights(landmark)
//   fl.at(now)    the plane moving now: { kind, stand, x, y, z, yaw, pitch } or null
//   fl.empty(now) the stand whose plane is away (or -1)
//   fl.next(now)  the next flight: { kind, start (ms) }
import { cycleMs, NIGHT_FROM } from './show-clock.js';

export const EVERY = 20 * 60e3; // ms between flights
const FILLET = 12; // m: the radius planes turn on the ground

// A night slot: its start falls in the game's night.
export const nightAt = (ms) => cycleMs(ms) >= NIGHT_FROM;
// A pair (takeoff, then landing) flies only if neither starts at night.
export const pairFlies = (pair) => !nightAt(pair * 2 * EVERY) && !nightAt((pair * 2 + 1) * EVERY);

// Round a polyline's corners (in u, v, with y carried along).
function fillet(pts, r) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const d1 = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], d2 = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2];
    const turn = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1])));
    if (turn < 0.01) { out.push(b); continue; }
    const cut = Math.min(r * Math.tan(turn / 2), l1 / 2, l2 / 2);
    const p0 = [b[0] - d1[0] * cut, b[1] - d1[1] * cut], p1 = [b[0] + d2[0] * cut, b[1] + d2[1] * cut];
    for (let k = 0; k <= 8; k++) { // a quadratic curve from p0 through near b to p1
      const t = k / 8, m = 1 - t;
      out.push([m * m * p0[0] + 2 * m * t * b[0] + t * t * p1[0], m * m * p0[1] + 2 * m * t * b[1] + t * t * p1[1], b[2] || 0]);
    }
  }
  out.push(pts.at(-1));
  return out;
}

// A leg: a path walked from speed v0 to v1 (m/s), or a pause (hold, s).
function leg(pts, v0, v1, o = {}) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = s.at(-1);
  const T = o.hold ?? (len > 0 ? (2 * len) / (v0 + v1) : 0);
  return { pts: pts.map((p) => [p[0], p[1], p[2] || 0]), s, len, T, v0, v1, back: !!o.back, hold: o.hold != null, y: o.y || null };
}

function legAt(g, t, prev) { // { u, v, y, du, dv, dy } at t seconds into the leg (a pause keeps the way it faced: prev)
  if (g.pts.length < 2) return { u: g.pts[0][0], v: g.pts[0][1], y: g.pts[0][2], du: prev?.du ?? 1, dv: prev?.dv ?? 0, dy: 0 };
  const a = g.T > 0 ? (g.v1 - g.v0) / g.T : 0;
  const d = g.hold ? 0 : Math.min(g.len, g.v0 * t + 0.5 * a * t * t);
  let i = 1; while (i < g.s.length - 1 && g.s[i] < d) i++;
  const p = g.pts[i - 1], q = g.pts[i], seg = g.s[i] - g.s[i - 1] || 1, k = Math.min(1, Math.max(0, (d - g.s[i - 1]) / seg));
  const f = g.len ? d / g.len : 0;
  const y = g.y ? g.y(f) : p[2] + (q[2] - p[2]) * k;
  const dy = g.y ? (g.y(Math.min(1, f + 0.01)) - g.y(Math.max(0, f - 0.01))) / (0.02 * g.len || 1) : (q[2] - p[2]) / seg;
  return { u: p[0] + (q[0] - p[0]) * k, v: p[1] + (q[1] - p[1]) * k, y, du: (q[0] - p[0]) / seg, dv: (q[1] - p[1]) / seg, dy };
}

export function gimpoFlights(l) {
  const { runways, stands, fly } = l;
  const U = l.u, V = l.v;
  const world = (u, v) => [l.x + u * U[0] + v * V[0], l.z + u * U[1] + v * V[1]];
  const standUV = stands.map((s) => [s.u, s.v]);
  const rL = runways[fly.depart.runway], rR = runways[fly.land.runway];

  const departure = (n) => {
    const [su, svv] = standUV[n];
    const lineUp = fly.holdU;
    return [
      leg([[su, svv], [su, fly.taxiV]], 1.6, 1.6, { back: true }), // pushed back from the bridge
      leg([[su, fly.taxiV]], 0, 0, { hold: 5 }),
      leg(fillet([[su, fly.taxiV], [lineUp - 30, fly.taxiV], [lineUp - 30, rL.v], [lineUp, rL.v]], FILLET), 3, 6),
      leg([[lineUp, rL.v]], 0, 0, { hold: 8 }),
      leg([[lineUp, rL.v], [fly.depart.rotateU, rL.v]], 0, 40), // the takeoff run
      leg([[fly.depart.rotateU, rL.v], [fly.depart.outU, rL.v]], 40, 58, { y: (f) => fly.depart.climbTo * Math.pow(f, 1.4) }), // up and away
    ];
  };
  const landing = (n) => {
    const [su, svv] = standUV[n];
    const touch = fly.land.touchU, slow = fly.exitU - 30;
    return [
      leg([[fly.land.fromU, rR.v, fly.land.fromY], [touch, rR.v, 0]], 46, 38),
      leg([[touch, rR.v], [slow, rR.v]], 38, 7),
      leg(fillet([[slow, rR.v], [fly.exitU, rR.v], [fly.exitU, fly.taxiV], [su, fly.taxiV], [su, fly.taxiV + 1]], FILLET), 7, 5),
      leg([[su, fly.taxiV + 1], [su, svv]], 4, 0.5), // into the stand
    ];
  };
  const plans = { takeoff: stands.map((_, n) => departure(n)), landing: stands.map((_, n) => landing(n)) };
  const length = (legs) => legs.reduce((s, g) => s + g.T, 0) * 1000;
  const durations = { takeoff: Math.max(...plans.takeoff.map(length)), landing: Math.max(...plans.landing.map(length)) };

  // The flight of slot k (k even: a takeoff, odd: its landing).
  const slot = (k) => {
    const pair = Math.floor(k / 2);
    if (!pairFlies(pair)) return null;
    return { kind: k % 2 ? 'landing' : 'takeoff', stand: ((pair % stands.length) + stands.length) % stands.length, start: k * EVERY };
  };

  return {
    durations,
    world,
    slot,
    at(now) {
      const k = Math.floor(now / EVERY), f = slot(k);
      if (!f) return null;
      let t = (now - f.start) / 1000;
      const legs = plans[f.kind][f.stand];
      let prev = null, back = false;
      for (const g of legs) {
        if (t > g.T) { prev = legAt(g, g.T, prev); back = g.back; t -= g.T; continue; }
        const p = legAt(g, t, prev);
        if (g.hold) g.back = back; // (a pause after the pushback still faces the bridge)
        const [x, z] = world(p.u, p.v);
        const dx = p.du * U[0] + p.dv * V[0], dz = p.du * U[1] + p.dv * V[1];
        let yaw = Math.atan2(dx, dz);
        if (g.back) yaw += Math.PI;
        return { kind: f.kind, stand: f.stand, x, y: p.y, z, yaw, pitch: Math.atan(p.dy) };
      }
      return null; // gone (out of sight) or parked
    },
    // The stand with no plane: from its takeoff until the landing has parked.
    empty(now) {
      const f = slot(Math.floor(now / EVERY));
      if (!f) return -1;
      if (f.kind === 'takeoff' || now - f.start < durations.landing) return f.stand;
      return -1;
    },
    next(now) {
      for (let k = Math.floor(now / EVERY) + 1, n = 0; n < 40; k++, n++) {
        const f = slot(k);
        if (f) return { kind: f.kind, start: f.start, stand: f.stand };
      }
      return null;
    },
  };
}
