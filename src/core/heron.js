// A grey heron (왜가리) that lives on a sunken stream (core/stream.js). It
// stands in the shallow water, wades a step or two and stabs at fish, then
// flies off over the street nearby and lands somewhere else on the water.
// It never lands anywhere but the water and ignores people.
//
// Everything runs off the wall clock and a seed, so every visitor sees the
// same heron in the same place without sending anything over the network.
// Coordinates are in the stream's frame: u along the channel from its west
// end, v across it (0 = the middle of the water), y up (0 = street level).
//
// Map data: "heron": true on a stream (or { "seed": 7 } for another bird).
import * as THREE from 'three';
import { matCache } from './three-kit.js';

export const HERON = { cycle: 60, minFly: 9, maxFly: 42, speed: 9, cruise: [6, 9], swing: 14 };

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const smooth = (x) => x * x * (3 - 2 * x);
// Share of the way flown at share x of the time: speeding up over the first
// 15% and slowing down over the last, an even pace in between.
const ACC = 0.15;
const pace = (x) => (x < ACC ? x * x / (2 * ACC * (1 - ACC)) : x > 1 - ACC ? 1 - pace(1 - x) : (x - ACC / 2) / (1 - ACC));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Water the heron may stand in: away from the waterfall and the east end,
// clear of the stepping stones and far enough from each bridge that the
// climb out (or the glide in) clears the deck. Ranges of u, sorted.
export function heronWater(s) {
  const len = s.len, gaps = [[-1, 12], [len - 10, len + 1]];
  for (const t of s.stones || []) gaps.push([t.u - 5, t.u + 5]);
  for (const b of s.bridges || []) gaps.push([b.u - b.w / 2 - 12, b.u + b.w / 2 + 12]);
  for (const f of s.lanterns?.figures || []) gaps.push([f.u - 6, f.u + 6]); // the lantern figures (core/lanterns.js)
  gaps.sort((p, q) => p[0] - q[0]);
  const out = [];
  let a = 0;
  for (const [g0, g1] of gaps) {
    if (g0 - a > 4) out.push([a, g0]);
    a = Math.max(a, g1);
  }
  if (len - a > 4) out.push([a, len]);
  return out;
}

// Feet height when standing: ankle-deep in the water.
const feetY = (s) => -(s.depth || 4) - 0.3;
// How far across the water it may stand (reeds grow along the edges).
const halfWater = (s) => (s.water || 8) / 2 - 1.6;

// Where the heron lands at the start of cycle k, and what it does there.
export function heronPlan(s, k, seed = 1) {
  const r = rng((k * 7919) ^ (seed * 104729));
  // It wanders up and down the stream over the hours: each landing is near a
  // slowly moving home spot, so one hop is never the whole stream long.
  const water = heronWater(s), lo = water[0][0], hi = water[water.length - 1][1];
  const home = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(k * 0.23 + seed + Math.sin(k * 0.07 + seed) * 2));
  const want = home + (r() * 2 - 1) * 45;
  // The nearest water it may stand in.
  let u = water[0][0], best = Infinity;
  for (const [a, b] of water) {
    const c = clamp(want, a, b);
    if (Math.abs(c - want) < best) { best = Math.abs(c - want); u = c; }
  }
  // Keep the spot (and its wade) inside its stretch of water.
  const [a, b] = water.find(([a, b]) => u >= a - 1e-6 && u <= b + 1e-6) || water[0];
  const wade = (r() < 0.5 ? -1 : 1) * (1.2 + r() * 1.5);
  u = clamp(u, a + 2.8, b - 2.8);
  const v = (r() * 2 - 1) * halfWater(s);
  return {
    u, v, yaw: r() * Math.PI * 2,
    wadeAt: 6 + r() * 6, wade: clamp(u + wade, a + 0.5, b - 0.5) - u,
    strikes: [3 + r() * 3, 13 + r() * 4],
    side: r() < 0.5 ? -1 : 1, swing: 0.5 + r() * 0.5, alt: HERON.cruise[0] + r() * (HERON.cruise[1] - HERON.cruise[0]),
  };
}

const WADE = 4; // seconds it takes to wade
// Where it stands at time c into its stay at plan P.
function standPos(P, c) {
  const w = smooth(clamp((c - P.wadeAt) / WADE, 0, 1));
  return [P.u + P.wade * w, P.v];
}

// The flight from where plan A ends to plan B's spot: out of the channel,
// a wide swing over the street beside it and back down onto the water.
const curves = new Map();
function flightCurve(s, k, seed) {
  const key = `${s.id || ''}/${seed}/${k}`;
  if (curves.has(key)) return curves.get(key);
  const A = heronPlan(s, k, seed), B = heronPlan(s, k + 1, seed);
  const [au, av] = standPos(A, 1e9), y0 = feetY(s);
  const dir = Math.sign(B.u - au) || 1, d = Math.abs(B.u - au);
  const hw = s.w / 2, sw = HERON.swing * A.swing;
  // Short hops overshoot and loop back, so it always takes a lap overhead.
  const loop = d < 40;
  const m1 = au + dir * Math.max(18, d * 0.35), m2 = loop ? B.u + dir * 28 : au + dir * d * 0.7;
  const inDir = Math.sign(B.u - m2) || dir;
  const pts = [
    [au, y0, av], [au + dir * 2, y0 + 1.4, av], [au + dir * 8, 1.8, av * 0.5],
    [m1, A.alt, A.side * (hw + sw)], [m2, A.alt + 1, (loop ? A.side : -A.side) * (hw + sw * 0.8)],
    [B.u - inDir * 9, 2.2, B.v * 0.5], [B.u - inDir * 2.5, y0 + 1.2, B.v], [B.u, y0, B.v],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  if (curves.size > 8) curves.delete(curves.keys().next().value);
  curves.set(key, c);
  return c;
}

// Seconds the flight takes: an easy wingbeat pace over the whole path.
export const flyTime = (s, k, seed = 1) => clamp(3 + flightCurve(s, k, seed).getLength() / HERON.speed, HERON.minFly, HERON.maxFly);

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
// The heron at wall-clock time t (seconds): where it is, which way it faces
// and what it is doing. Pure, so tests can check it never lands off the water.
export function heronAt(s, t, seed = 1) {
  const k = Math.floor(t / HERON.cycle), c = t - k * HERON.cycle;
  const A = heronPlan(s, k, seed);
  const fly = flyTime(s, k, seed), stay = HERON.cycle - fly;
  if (c < stay) {
    const [u, v] = standPos(A, c);
    const wading = c > A.wadeAt && c < A.wadeAt + WADE;
    const strike = A.strikes.map((x) => c - x).find((x) => x >= 0 && x < 1.4);
    // It faces where it came from, settles towards its own yaw, and turns to wade.
    const prev = flightCurve(s, k - 1, seed).getTangentAt(1, tmp);
    const landYaw = Math.atan2(-prev.z, prev.x);
    let yaw = landYaw + (A.yaw - landYaw) * smooth(clamp(c / 3, 0, 1)) + Math.sin(c * 0.4) * 0.25;
    // Turn to face the way it wades, and back again after.
    const wb = Math.min(smooth(clamp((c - A.wadeAt + 0.6) / 0.6, 0, 1)), smooth(clamp((A.wadeAt + WADE + 0.6 - c) / 0.6, 0, 1)));
    if (wb > 0) {
      const to = A.wade > 0 ? 0 : Math.PI, dy = Math.atan2(Math.sin(to - yaw), Math.cos(to - yaw));
      yaw += dy * wb;
    }
    return { state: wading ? 'wade' : 'stand', u, y: feetY(s), v, yaw, pitch: 0, roll: 0, strike: strike ?? -1, since: c, until: stay - c };
  }
  const f = (c - stay) / fly, e = clamp(pace(f), 0, 1);
  const curve = flightCurve(s, k, seed);
  const p = curve.getPointAt(e, tmp), q = curve.getTangentAt(Math.min(0.999, e), tmp2);
  const ahead = curve.getTangentAt(Math.min(1, e + 0.03));
  const yaw = Math.atan2(-q.z, q.x), turn = Math.atan2(-ahead.z, ahead.x) - yaw;
  return {
    state: 'fly', u: p.x, y: p.y, v: p.z, yaw,
    pitch: Math.asin(clamp(q.y, -1, 1)) * 0.6, roll: clamp(Math.atan2(Math.sin(turn), Math.cos(turn)) * 3, -0.6, 0.6),
    f, since: c - stay, until: HERON.cycle - c,
  };
}

// ---------- 3D ----------
const mat = matCache({ flatShading: true });
const COL = { grey: '#8d969f', back: '#7a838d', white: '#ecebe6', black: '#2a2d31', bill: '#e3a63b', leg: '#c9a24a', primaries: '#3a3f46' };

// The bird faces +x; its feet are at y = 0.
export function makeHeron() {
  const root = new THREE.Group();
  root.name = 'heron';
  const body = new THREE.Group(); // pivots at the hips
  body.position.y = 0.62;
  root.add(body);
  const add = (parent, geo, c, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); parent.add(m); return m; };
  const torso = add(body, new THREE.SphereGeometry(0.2, 10, 8), COL.grey, 0.05, 0.05, 0);
  torso.scale.set(1.55, 0.95, 0.9);
  add(body, new THREE.BoxGeometry(0.34, 0.05, 0.16), COL.back, -0.24, 0.07, 0).rotation.z = 0.25; // tail
  // Folded wings: darker slabs along the sides.
  const folded = new THREE.Group();
  for (const sd of [-1, 1]) {
    const w = add(folded, new THREE.SphereGeometry(0.18, 8, 6), COL.back, -0.02, 0.08, sd * 0.13);
    w.scale.set(1.7, 0.7, 0.35);
    add(folded, new THREE.BoxGeometry(0.22, 0.04, 0.05), COL.primaries, -0.28, 0.07, sd * 0.1).rotation.z = 0.2;
  }
  body.add(folded);
  // Open wings: an inner and an outer panel each, hinged at the shoulder.
  const wings = [];
  for (const sd of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(0.08, 0.12, sd * 0.12);
    const inner = add(sh, new THREE.BoxGeometry(0.42, 0.025, 0.5), COL.grey, -0.07, 0, sd * 0.25);
    const tip = new THREE.Group();
    tip.position.set(0, 0, sd * 0.5);
    add(tip, new THREE.BoxGeometry(0.34, 0.02, 0.42), COL.primaries, -0.08, 0, sd * 0.21);
    sh.add(tip);
    body.add(sh);
    wings.push({ sh, tip, sd, inner });
  }
  // Neck: two segments to make the S, then the head with its black stripe,
  // crest and long yellow bill.
  const neck = new THREE.Group();
  neck.position.set(0.3, 0.1, 0);
  body.add(neck);
  const seg = (len) => new THREE.CylinderGeometry(0.045, 0.055, len, 6).translate(0, len / 2, 0);
  add(neck, seg(0.22), COL.white);
  const neck2 = new THREE.Group();
  neck2.position.y = 0.22;
  neck.add(neck2);
  add(neck2, seg(0.22), COL.white);
  const head = new THREE.Group();
  head.position.y = 0.22;
  neck2.add(head);
  add(head, new THREE.SphereGeometry(0.06, 8, 6), COL.white).scale.set(1.3, 1, 0.9);
  add(head, new THREE.BoxGeometry(0.1, 0.02, 0.125), COL.black, 0.0, 0.02, 0);
  const crest = add(head, new THREE.ConeGeometry(0.012, 0.18, 4).rotateZ(Math.PI / 2).translate(-0.12, 0, 0), COL.black, -0.02, 0.03, 0);
  crest.rotation.z = -0.25;
  add(head, new THREE.ConeGeometry(0.022, 0.22, 5).rotateZ(-Math.PI / 2).translate(0.17, 0, 0), COL.bill, 0.02, -0.01, 0);
  // Legs (hinged at the hips) with three forward toes.
  const legs = [];
  for (const sd of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(0.02, -0.08, sd * 0.06);
    add(hip, new THREE.CylinderGeometry(0.014, 0.014, 0.54, 5).translate(0, -0.27, 0), COL.leg);
    for (const a of [-0.45, 0, 0.45]) add(hip, new THREE.BoxGeometry(0.11, 0.012, 0.012).translate(0.05, 0, 0), COL.leg, 0, -0.54, 0).rotation.y = a;
    body.add(hip);
    legs.push(hip);
  }
  root.scale.setScalar(1.25); // a touch larger than life so it reads from the street
  root.userData = { body, folded, wings, neck, neck2, head, legs };
  return root;
}

// Pose the model from heronAt(): t is the wall clock for the wing beats.
export function poseHeron(m, h, t) {
  const { body, folded, wings, neck, neck2, head, legs } = m.userData;
  m.position.set(h.u, h.y, h.v);
  m.rotation.set(0, h.yaw, 0);
  if (h.state === 'fly') {
    const up = clamp(h.since / 1.2, 0, 1), down = clamp(h.until / 1.4, 0, 1), air = Math.min(up, down);
    body.rotation.set(h.roll * air, 0, h.pitch * air + (1 - air) * 0.5);
    const open = Math.min(clamp(h.since / 0.35, 0, 1), clamp(h.until / 0.25, 0, 1));
    folded.visible = open < 0.5;
    // Deep fast beats taking off and landing, slow ones with glides in between.
    const rate = air < 1 ? 9 : 5.2, glide = air >= 1 && Math.sin(t * 0.7 + h.u * 0.05) > 0.55;
    const beat = glide ? 0.05 : Math.sin(t * rate) * (air < 1 ? 0.8 : 0.5);
    for (const w of wings) {
      w.sh.visible = open >= 0.5;
      w.sh.scale.set(1, 1, Math.max(0.2, open));
      w.sh.rotation.set(-w.sd * beat, 0, 0);
      w.tip.rotation.set(-w.sd * beat * 0.4, 0, 0);
    }
    // Neck pulled back in an S, legs trailing behind; swung forward to land.
    neck.rotation.z = 0.9 * air + 0.2;
    neck2.rotation.z = -1.9 * air;
    head.rotation.z = 1.0 * air;
    for (const l of legs) l.rotation.z = -Math.PI / 2 * air;
    return;
  }
  folded.visible = true;
  for (const w of wings) w.sh.visible = false;
  // Standing: body tilted up, neck in a tall S. Every so often it lunges at a
  // fish, and it bobs its head now and then while wading.
  let tilt = 0.35, a1 = -0.15, a2 = -0.35, a3 = -0.3;
  if (h.strike >= 0) {
    // Lean in, shoot the neck out forward and down, bill pointing at the water.
    const x = h.strike < 0.35 ? smooth(h.strike / 0.35) : 1 - smooth(clamp((h.strike - 0.5) / 0.9, 0, 1));
    tilt -= 0.7 * x; a1 += -1.7 * x; a2 += 0.35 * x; a3 += 0.6 * x;
  }
  body.rotation.set(0, 0, tilt);
  if (h.state === 'wade') a1 += Math.sin(h.since * 5) * 0.12;
  a1 += Math.sin(t * 0.9 + h.u) * 0.04;
  neck.rotation.z = a1;
  neck2.rotation.z = a2;
  head.rotation.z = a3 + 0.35;
  const step = h.state === 'wade' ? Math.sin(h.since * 4) * 0.35 : 0;
  legs[0].rotation.z = -tilt + step;
  legs[1].rotation.z = -tilt - step;
}

// Build the heron for stream s inside its group g; returns the per-frame tick.
export function buildHeron(g, s) {
  const seed = typeof s.heron === 'object' ? s.heron.seed || 1 : 1;
  const m = makeHeron();
  g.add(m);
  return () => {
    const t = Date.now() / 1000;
    poseHeron(m, heronAt(s, t, seed), t);
  };
}
