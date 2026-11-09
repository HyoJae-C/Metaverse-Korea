// The Cotton Candy Express (솜사탕 특급): Another Land's roller coaster.
// Pure track and timing (no DOM), so it can be unit-tested. Metres and
// seconds, in the island room's space (park-island.js); the model is
// coaster-model.js and riding it is in main.js.
//
// The track is one closed loop over Another Land's island (park-island.js):
// the station at the south end, a chain lift up to 18 m, a stop at the top
// with the front car hanging over the edge, a 17 m first drop, an airtime
// hill, a run east along the north shore and down into a helix tucked
// east of the station (so the island stays narrow), a tunnel and a smaller
// second drop, then the brakes and home.
//
// Timing runs on a shared clock (Date.now(), like the Namsan cable car), so
// everyone in the park sees the trains in the same place: two trains, one
// CYCLE apart / 2. A train's own clock p (0..CYCLE) is: board, depart, lift,
// hold at the top, drop and run, brakes, unload in the station.
import * as THREE from 'three';

export const CYCLE = 60; // s: one lap of a train, station to station
export const TRAINS = 2;
export const BOARD_S = 6; // s at the start of each lap to get on
export const HOLD_S = 2; // s stopped at the top before the drop
export const CARS = 4;
export const SEATS_PER_CAR = 2;
export const SEATS = CARS * SEATS_PER_CAR;
export const CAR_GAP = 1.75; // m between car centres
export const G = 9.8;
export const SPEED_K = 1; // speed scale (tune after riding it; 0.9..1.3)
const LIFT_V = 2.1; // chain lift speed, m/s
const DEPART_V = 3; // tyres push the train out of the station
const MIN_V = 2.2; // booster tyres keep it rolling on the flats
const DRAG = 0.03; // energy lost per metre, as a fraction of g (wheels, air)
const BRAKE_A = 3.2; // m/s² in the brakes
const HANG = 2.6; // how far past the crest the front car stops (looking down)

// The loop, in order. [x, y, z]: y is the rail height.
export const TRACK = [
  [-31, 0.45, 9], // station (the train heads north, -z)
  [-31, 0.45, 2],
  [-31, 0.45, -4],
  [-33, 0.6, -9.5],
  [-38.5, 0.9, -12], // out west, round onto the lift
  [-43, 1.6, -12],
  [-52, 9.5, -12], // chain lift, up to the west
  [-60, 16.6, -12],
  [-64, 18.3, -13.2], // turn north at the top
  [-66.2, 18.4, -17],
  [-66.4, 17.4, -20.5], // the crest: stop here, then drop north
  [-66.4, 8, -27.5],
  [-65.6, 1.6, -34],
  [-62.5, 1.3, -37.6], // pull out east along the north fence
  [-56, 2.2, -38.4],
  [-49, 8.6, -37.6], // airtime hill
  [-42, 2.4, -36.6],
  [-34, 3.4, -35.6],
  [-20, 5.6, -34.6], // long run east, behind the old park
  [-9, 8.2, -34.2],
  [-6.5, 9.8, -16.5], // helix round (-12, -10): dropping, tighter each turn
  [-4.2, 9.1, -7.5],
  [-11.4, 8.5, -2.2],
  [-18.7, 7.8, -6.7],
  [-17.3, 7.2, -14.7],
  [-9.8, 6.5, -16.4],
  [-5.6, 5.8, -10.4],
  [-9.4, 5.2, -4.5],
  [-15.8, 4.5, -5.8],
  [-17.0, 3.9, -11.8],
  [-12.2, 3.2, -15.0],
  [-18, 3.3, -17], // out of the helix, heading back west
  [-22, 3.2, -22.4], // second drop into the chocolate tunnel
  [-30, 1.3, -24],
  [-38, 1.4, -23],
  [-44, 2.6, -26.6], // zigzag
  [-50, 2, -22.6],
  [-54.2, 1.6, -16], // south, under the lift
  [-54.4, 1.4, -6],
  [-52, 1.1, 3], // round the west plaza, into the brakes
  [-46, 0.8, 10],
  [-39, 0.55, 12.4],
  [-33.4, 0.45, 11.6],
];
// Where the tunnel is (track distance, filled in below) and its walls.
export const TUNNEL = { from: [-24, -22], to: [-37, -23.2] };
// The train stops with its front car here.
export const STOP = [-31, 0.45, -3];
export const PLATFORM = { x: -28.3, z0: -4.5, z1: 8.5 }; // the boarding side, east of the rails
export const OFF = { x: -27.6, z: -1.6 }; // where you step off
export const GATE = { x: -27.4, z: 2.4 }; // stand here to board

const curve = new THREE.CatmullRomCurve3(TRACK.map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, 'centripetal');
export const LENGTH = curve.getLength();
const N = 2400;
const pts = curve.getSpacedPoints(N); // pts[N] === pts[0]
const DS = LENGTH / N;
const wrap = (s) => ((s % LENGTH) + LENGTH) % LENGTH;
const nearest = ([x, y, z]) => {
  let best = 0, bd = Infinity;
  for (let i = 0; i < N; i++) { const p = pts[i], d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i; } }
  return best * DS;
};
export const S_STOP = nearest(STOP);
export const S_LIFT = nearest(TRACK[5]); // chain starts
let crest = 0;
for (let i = 0; i < N; i++) if (pts[i].y > pts[crest].y) crest = i;
export const S_CREST = crest * DS;
export const S_TUNNEL = [nearest([...TUNNEL.from.slice(0, 1), 2.4, TUNNEL.from[1]]), nearest([TUNNEL.to[0], 1.4, TUNNEL.to[1]])];
export const S_AIR = nearest(TRACK[15]); // the airtime hill's top
export const S_BRAKE = nearest([-52, 1.1, 3]); // brakes from here to the station
export const TOP_Y = pts[crest].y;

const lerp = (a, b, u) => a + (b - a) * u;
// Track height at distance s.
export function heightAt(s) {
  const f = wrap(s) / DS, i = Math.floor(f) % N;
  return lerp(pts[i].y, pts[i + 1].y, f - Math.floor(f));
}
const ahead = (s) => wrap(s - S_STOP); // distance travelled since the stop

// One lap, worked out once: front-car distance and speed every STEP s.
const STEP = 1 / 50;
const prof = (() => {
  const s = [], v = [], ph = [];
  let d = 0, sp = 0, t = 0, held = 0, phase = 'board', top = null;
  const liftEnd = ahead(S_CREST + HANG);
  const brakeAt = ahead(S_BRAKE);
  while (t < CYCLE + 1e-9) {
    if (phase === 'board') { if (t >= BOARD_S) phase = 'depart'; }
    else if (phase === 'depart') { sp = Math.min(DEPART_V, sp + 1.6 * STEP); if (d >= ahead(S_LIFT)) phase = 'lift'; }
    else if (phase === 'lift') { sp += (LIFT_V - sp) * Math.min(1, STEP * 3); if (d >= liftEnd) { phase = 'hold'; sp = 0; held = 0; } }
    else if (phase === 'hold') { held += STEP; if (held >= HOLD_S) { phase = 'drop'; top = { d, h: heightAt(S_STOP + d - 1.4), v: 0.6 }; sp = 0.6; } }
    else if (phase === 'drop' || phase === 'run') {
      // Energy from the top, less what the wheels and the air took.
      const h = heightAt(S_STOP + d - 1.4); // (the second car: most of the train's weight)
      const v2 = top.v ** 2 + 2 * G * (top.h - h) - 2 * DRAG * G * (d - top.d);
      sp = Math.max(MIN_V, Math.sqrt(Math.max(0, v2))) * SPEED_K;
      if (phase === 'drop' && t > 0 && h < TOP_Y - 15.5 && heightAt(S_STOP + d + 2) > h) phase = 'run';
      if (d >= brakeAt) phase = 'brake';
    } else if (phase === 'brake') {
      const left = LENGTH - d;
      sp = Math.min(sp, Math.max(left > 0.4 ? 1.1 : 0, Math.sqrt(2 * BRAKE_A * Math.max(0, left))));
      if (left <= 0.02) { phase = 'unload'; sp = 0; d = LENGTH; }
    }
    s.push(phase === 'unload' ? 0 : d); v.push(sp); ph.push(phase);
    if (phase !== 'unload' && phase !== 'board' && phase !== 'hold') d = Math.min(LENGTH, d + sp * STEP);
    t += STEP;
  }
  return { s, v, ph };
})();
const PHASE_T = {}; // when each phase starts in a lap
prof.ph.forEach((p, i) => { if (!(p in PHASE_T)) PHASE_T[p] = i * STEP; });
export const PHASES = PHASE_T;
export const TOP_SPEED = Math.max(...prof.v);

// A train's own clock (0..CYCLE) at shared time t, for train k.
export const lapTime = (t, k = 0) => (((t - (k * CYCLE) / TRAINS) % CYCLE) + CYCLE) % CYCLE;
// Where train k is at shared time t: front-car distance s, speed v (m/s),
// k01 = v / top speed, and the phase name.
export function trainAt(t, k = 0) {
  const p = lapTime(t, k), i = Math.min(prof.s.length - 1, Math.floor(p / STEP));
  return { s: wrap(S_STOP + prof.s[i]), v: prof.v[i], k01: prof.v[i] / TOP_SPEED, phase: prof.ph[i], p };
}
// Seconds until train k's next boarding starts (0 while it boards).
export const boardIn = (t, k) => { const p = lapTime(t, k); return p < BOARD_S ? 0 : CYCLE - p; };
// The train now boarding at shared time t, or -1; and how long till the next.
export function boarding(t) {
  for (let k = 0; k < TRAINS; k++) if (boardIn(t, k) === 0) return { train: k, left: BOARD_S - lapTime(t, k), wait: 0 };
  const wait = Math.min(...Array.from({ length: TRAINS }, (_, k) => boardIn(t, k)));
  return { train: -1, left: 0, wait };
}
// When the ride that train k is boarding at t ends (the doors open again).
export const rideEnds = (t, k) => t - lapTime(t, k) + PHASE_T.unload + 0.6;

// The track's frame at s: position, forward, up (banked into the curves)
// and right. Bank follows the turn, a little more the faster the train goes.
const T = [], B = [];
{
  for (let i = 0; i < N; i++) {
    const a = pts[(i - 6 + N) % N], c = pts[(i + 6) % N];
    T.push(new THREE.Vector3().subVectors(c, a).normalize());
  }
  const v = new Array(N).fill(MIN_V);
  for (let j = 0; j < prof.s.length; j++) v[Math.floor(wrap(S_STOP + prof.s[j]) / DS) % N] = Math.max(MIN_V, prof.v[j]);
  for (let i = 0; i < N; i++) {
    const t0 = T[(i - 8 + N) % N], t1 = T[(i + 8) % N];
    const turn = Math.atan2(t0.x * t1.z - t0.z * t1.x, t0.x * t1.x + t0.z * t1.z); // + turning left (seen from above, x→-z)
    const k = turn / (16 * DS); // horizontal curvature, 1/m
    B.push(Math.max(-0.75, Math.min(0.75, Math.atan((v[i] ** 2 * k) / G))));
  }
  for (let pass = 0; pass < 3; pass++) { const c = B.slice(); for (let i = 0; i < N; i++) { let sum = 0; for (let j = -10; j <= 10; j++) sum += c[(i + j + N) % N]; B[i] = sum / 21; } }
}
const _p = new THREE.Vector3(), _f = new THREE.Vector3(), _u = new THREE.Vector3(), _r = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
export function frameAt(s, out = {}) {
  const f = wrap(s) / DS, i = Math.floor(f) % N, u = f - Math.floor(f), j = (i + 1) % N;
  _p.lerpVectors(pts[i], pts[i + 1], u);
  _f.lerpVectors(T[i], T[j], u).normalize();
  const bank = lerp(B[i], B[j], u);
  _r.crossVectors(_f, UP).normalize(); // right of the direction of travel
  _u.crossVectors(_r, _f).normalize();
  _u.applyAxisAngle(_f, -bank); // lean into the turn
  _r.crossVectors(_f, _u).normalize();
  out.x = _p.x; out.y = _p.y; out.z = _p.z;
  out.fx = _f.x; out.fy = _f.y; out.fz = _f.z;
  out.ux = _u.x; out.uy = _u.y; out.uz = _u.z;
  out.rx = _r.x; out.ry = _r.y; out.rz = _r.z;
  out.yaw = Math.atan2(_f.x, _f.z); // characters face (sin yaw, cos yaw)
  out.pitch = -Math.asin(Math.max(-1, Math.min(1, _f.y))); // rotation.x (nose up is negative)
  out.bank = bank; // rotation.z
  return out;
}
// Seat i (0..SEATS-1) of a train whose front car is at s: where the rider
// sits. Car 0 is the front; even seats on the left.
export const SEAT_H = 0.42; // seat above the rails
export function seatPose(sFront, i, out = {}) {
  const car = Math.floor(i / SEATS_PER_CAR), side = i % SEATS_PER_CAR ? 1 : -1;
  frameAt(sFront - 0.9 - car * CAR_GAP, out);
  const o = side * 0.3;
  out.x += out.ux * SEAT_H + out.rx * o; out.y += out.uy * SEAT_H + out.ry * o; out.z += out.uz * SEAT_H + out.rz * o;
  return out;
}
// The sampled loop (for the model: rails, sleepers and supports).
export const trackPoints = () => pts.slice(0, N).map((p, i) => ({ x: p.x, y: p.y, z: p.z, s: i * DS }));

// Ride effects, all from one number: k = speed / top speed (0..1).
// fov: the camera's field of view (narrow and tense on the lift, wide in the
// drop); shake: how far the camera trembles (k², so only when fast);
// lines: the speed lines' opacity (from k 0.4). soft: the "gentle" setting.
export function rideFx(k, phase, soft = false) {
  const m = soft ? 0.5 : 1;
  const base = 62;
  let fov = base;
  if (phase === 'lift' || phase === 'hold') fov = base - 6 * m;
  else if (phase !== 'board' && phase !== 'unload') fov = base + (85 - base) * Math.min(1, k) * m;
  return {
    fov,
    shake: (phase === 'hold' ? 0.006 : 0.09 * k * k) * m,
    lines: Math.max(0, Math.min(1, (k - 0.4) / 0.45)),
    vignette: phase === 'hold' ? 0.3 : Math.max(0, (k - 0.3) / 0.7) * 0.6,
  };
}
