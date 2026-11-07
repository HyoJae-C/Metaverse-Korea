// Mini basketball court rules, no DOM (ui/basketball-ui.js draws the panel,
// core/basketball-court.js the court).
//
// Before each shot you pick one of four shots. A short gauge or tap game
// decides how well it goes (tier 1 to 3), the panel closes, and your
// character does that move: shotMove() gives the whole move as a timeline
// (where you are, how your limbs bend, where the ball is).
//
//   free   Free throw     needle: stop the swinging needle in the middle
//          1 miss (off the rim) · 2 make (rolls in) · 3 swish (all net)
//   dunk   Dunk           mash: tap as fast as you can to jump higher
//          1 two-hand dunk · 2 one-hand dunk · 3 back dunk
//   fade   Fadeaway       double: two timings, the top of the jump and the release
//          1 airball · 2 bank shot · 3 clean fadeaway
//   layup  Layup          rhythm: step, step, shoot on the beat
//          1 basic layup · 2 finger roll · 3 euro step
//
// A round is 5 shots. A made shot scores its points, a tier 3 move one
// style point more. Units: metres and seconds.
//
// The hoop frame: the origin is on the floor under the rim's centre, +y up,
// +z out into the court (the backboard is at -z). A yaw of 0 faces +z, so
// facing the hoop from the court is a yaw of about PI.

export const BASKET_GAME = 'basket'; // id for the grill's Medals
export const SHOTS_PER_ROUND = 5;
export const MEDAL_PTS = { gold: 13, silver: 9, bronze: 5 }; // of 15
export const HOOP = {
  h: 1.9, // rim height: a mini hoop for chibi players (about 1.1 m tall)
  r: 0.21, // rim radius
  ball: 0.09, // ball radius
  board: { z: -0.33, w: 1.1, h: 0.68, y0: 1.78, t: 0.04 }, // backboard: plane z, width, height, bottom edge, thickness
};

export function basketMedal(pts) {
  for (const m of ['gold', 'silver', 'bronze']) if (pts >= MEDAL_PTS[m]) return m;
  return null;
}

// The four shots. Tier 1-3 each have a move; `made` says if it goes in.
export const SHOTS = [
  { id: 'free', icon: '🎯', pts: 1, mode: 'needle', tiers: [{ id: 'miss', made: false }, { id: 'make', made: true }, { id: 'swish', made: true }] },
  { id: 'dunk', icon: '💥', pts: 2, mode: 'mash', tiers: [{ id: 'twohand', made: true }, { id: 'onehand', made: true }, { id: 'back', made: true }] },
  { id: 'fade', icon: '🌙', pts: 2, mode: 'double', tiers: [{ id: 'airball', made: false }, { id: 'bank', made: true }, { id: 'clean', made: true }] },
  { id: 'layup', icon: '🏃', pts: 2, mode: 'rhythm', tiers: [{ id: 'basic', made: true }, { id: 'finger', made: true }, { id: 'euro', made: true }] },
];
export const SHOT_BY_ID = Object.fromEntries(SHOTS.map((s) => [s.id, s]));

// Points for one shot: its points if it goes in, +1 for a tier 3 move.
export function shotPoints(shotId, tier) {
  const s = SHOT_BY_ID[shotId];
  if (!s || !(tier >= 1 && tier <= 3)) return 0;
  return (s.tiers[tier - 1].made ? s.pts : 0) + (tier === 3 ? 1 : 0);
}

// --- Gauges ---------------------------------------------------------------
// Each mode turns taps into a tier. They run on step(dt) and tap(); `done`
// turns true with `tier` set. Waiting too long counts as the worst try.

export const NEEDLE = { period: 1.5, speedUp: 0.18, great: 0.06, good: 0.17, timeout: 6 };
export const MASH = { time: 2.4, great: 16, good: 9 };
export const DOUBLE = { period: 1.2, great: 0.07, good: 0.18, timeout: 5 };
export const RHYTHM = { lead: 1.0, beat: 0.55, great: 0.08, good: 0.18 };

// Tier from how far a needle stopped from the middle (0..0.5).
export const needleTier = (off) => (off <= NEEDLE.great ? 3 : off <= NEEDLE.good ? 2 : 1);
export const mashTier = (taps) => (taps >= MASH.great ? 3 : taps >= MASH.good ? 2 : 1);
// Two timings, each 2 (great), 1 (good) or 0: both great is tier 3.
export const doubleTier = (a, b) => (a + b >= 4 ? 3 : a + b >= 2 ? 2 : 1);
// Three beats, each 2, 1 or 0.
export const rhythmTier = (q) => { const s = q.reduce((a, b) => a + b, 0); return s >= 5 ? 3 : s >= 3 ? 2 : 1; };
const grade = (off, great, good) => (off <= great ? 2 : off <= good ? 1 : 0);

// The needle swings 0..1 and back; the middle is 0.5.
export const needlePos = (t, period = NEEDLE.period) => 0.5 - 0.5 * Math.cos((t / period) * Math.PI * 2);

export class ShotMeter {
  constructor(mode) {
    this.mode = mode;
    this.t = 0; // seconds since the gauge started
    this.done = false;
    this.tier = 0;
    this.taps = 0;
    this.marks = []; // what each tap scored, for drawing: { at, q, off }
    this.phase = 0; // double: 0 jump, 1 release
    this.clock = 0; // needle / double: the swing's own clock (it speeds up)
    this.speed = 1;
  }
  get pos() { return needlePos(this.clock, this.mode === 'double' ? DOUBLE.period : NEEDLE.period); }
  // rhythm: when each beat should be tapped
  get beats() { return [0, 1, 2].map((i) => RHYTHM.lead + i * RHYTHM.beat); }
  // mash: 0..1 how high the jump gauge is
  get fill() { return Math.min(1, this.taps / MASH.great); }
  step(dt) {
    if (this.done) return;
    this.t += dt;
    if (this.mode === 'needle') {
      this.speed = 1 + Math.min(1.2, this.t * NEEDLE.speedUp);
      this.clock += dt * this.speed;
      if (this.t > NEEDLE.timeout) this._end(1);
    } else if (this.mode === 'double') {
      this.clock += dt;
      if (this.t > DOUBLE.timeout * (this.phase + 1)) this._tapDouble(0.5);
    } else if (this.mode === 'mash') {
      if (this.t >= MASH.time) this._end(mashTier(this.taps));
    } else if (this.mode === 'rhythm') {
      const last = this.beats[2] + RHYTHM.good + 0.1;
      // A beat that went by without a tap counts as a miss.
      while (this.marks.length < 3 && this.t > this.beats[this.marks.length] + RHYTHM.good + 0.05) this.marks.push({ at: this.t, q: 0, off: 1 });
      if (this.marks.length >= 3 || this.t > last) this._end(rhythmTier(this.marks.map((m) => m.q).concat([0, 0, 0]).slice(0, 3)));
    }
  }
  tap() {
    if (this.done) return null;
    this.taps++;
    if (this.mode === 'needle') {
      const off = Math.abs(this.pos - 0.5);
      this.marks.push({ at: this.t, q: grade(off, NEEDLE.great, NEEDLE.good), off });
      this._end(needleTier(off));
    } else if (this.mode === 'double') this._tapDouble(Math.abs(this.pos - 0.5));
    else if (this.mode === 'rhythm') {
      const i = this.marks.length;
      if (i < 3) {
        const off = Math.abs(this.t - this.beats[i]);
        if (this.t < this.beats[i] - RHYTHM.good - 0.15) { this.taps--; return null; } // far too early: ignore
        this.marks.push({ at: this.t, q: grade(off, RHYTHM.great, RHYTHM.good), off });
      }
    }
    return this.marks[this.marks.length - 1] || null;
  }
  _tapDouble(off) {
    this.marks.push({ at: this.t, q: grade(off, DOUBLE.great, DOUBLE.good), off });
    if (this.phase === 0) { this.phase = 1; this.clock = 0; } // the release swing starts from the edge again
    else this._end(doubleTier(this.marks[0].q, this.marks[1].q));
  }
  _end(tier) { this.done = true; this.tier = tier; }
}

// --- Moves ----------------------------------------------------------------
// shotMove(shotId, tier) → { dur, made, start, root(t), pose(t), ball(t),
// events, release }.
//   root(t): { x, y, z, yaw, spin, run } in the hoop frame. y is how high
//     the feet are off the floor; spin turns the body on top of yaw (the back
//     dunk); run 0..1 says to play the running clip.
//   pose(t): bone offsets in radians, as the dances use (core/model-pack.js):
//     armL/armR (-x forward and up, -2.8 overhead; y out to the side),
//     foreL/foreR (-x bends the elbow), spine, head, legL/legR (-x forward),
//     kneeL/kneeR (+x bends).
//   ball(t): [x, y, z] of the ball's centre in the hoop frame.
//   events: [{ t, kind }] for sounds and effects: 'bounce', 'rim', 'board',
//     'net' (through the net), 'dunk' (the rim shakes), 'floor', 'cheer'.

const clamp01 = (u) => Math.max(0, Math.min(1, u));
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const bump = (t, t0, t1) => (t <= t0 || t >= t1 ? 0 : Math.sin(((t - t0) / (t1 - t0)) * Math.PI));
// 0 before t0, eases to 1 by t1
const ramp = (t, t0, t1) => smooth((t - t0) / (t1 - t0));

// Root keyframes: [t, x, z, y, spin, run]; eased between keys. The yaw
// faces the rim from where you are (unless `face` is given).
function rootTrack(keys) {
  return (t) => {
    let i = 0;
    while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1] || a;
    const u = b[0] > a[0] ? clamp01((t - a[0]) / (b[0] - a[0])) : 1;
    const e = smooth(u);
    const x = lerp(a[1], b[1], e), z = lerp(a[2], b[2], e);
    // Height: jumps go up and come down on a curve, not eased in a line.
    const y = lerp(a[3], b[3], b[3] > a[3] ? Math.sin(u * Math.PI / 2) : 1 - Math.cos(u * Math.PI / 2));
    const spin = lerp(a[4] || 0, b[4] || 0, e);
    const run = u < 1 ? Math.max(a[5] || 0, 0) : b[5] || 0;
    return { x, y, z, yaw: Math.atan2(-x, -z), spin, run };
  };
}

// Ball segments: { t0, t1, kind: 'hand' | 'arc' | 'roll', ... }.
//   hand: held at `at` (player-local [x right, y up, z forward]); `to` blends there by t1
//   arc:  from a to b with a peak `h` above the straight line
//   roll: round the rim from angle a0 to a1 (radians) at the rim
function ballTrack(segs, root) {
  const local = (t, p) => {
    const r = root(t), yaw = r.yaw + r.spin;
    const s = Math.sin(yaw), c = Math.cos(yaw);
    // local x is to the character's left in three.js (+x when facing +z); we use x right
    return [r.x - p[0] * c + p[2] * s, r.y + p[1], r.z + p[0] * s + p[2] * c];
  };
  return (t) => {
    let seg = segs[0];
    for (const s of segs) { if (t >= s.t0) seg = s; }
    const u = clamp01((t - seg.t0) / Math.max(1e-6, seg.t1 - seg.t0));
    if (seg.kind === 'hand') return local(t, seg.to ? lerp3(seg.at, seg.to, smooth(u)) : seg.at);
    if (seg.kind === 'roll') {
      const a = lerp(seg.a0, seg.a1, smooth(u)), rr = HOOP.r - 0.02;
      return [Math.sin(a) * rr, HOOP.h + HOOP.ball * 0.6 - u * seg.drop, Math.cos(a) * rr];
    }
    const a = typeof seg.a === 'function' ? seg.a() : seg.a;
    const p = lerp3(a, seg.b, u);
    p[1] += seg.h * 4 * u * (1 - u);
    return p;
  };
}

// After a ball reaches the floor at p with a sideways speed (vx, vz),
// a few bounces that die out.
function bounces(t0, p, vx, vz, n = 3, h = 0.5) {
  const out = [];
  let t = t0, q = [p[0], HOOP.ball, p[2]];
  for (let i = 0; i < n; i++) {
    const dur = 0.18 + h * 0.75;
    const nq = [q[0] + vx * dur, HOOP.ball, q[2] + vz * dur];
    out.push({ t0: t, t1: t + dur, kind: 'arc', a: q, b: nq, h, bounce: true });
    t += dur; q = nq; h *= 0.45;
  }
  out.push({ t0: t, t1: t + 1, kind: 'arc', a: q, b: [q[0] + vx * 0.4, HOOP.ball, q[2] + vz * 0.4], h: 0 });
  return out;
}

const H = HOOP.h, B = HOOP.ball;
// Hand spots (player-local): ball at the chest, cocked over the head, high reach
const CHEST = [0.02, 0.42, 0.2];
const SET = [0.1, 0.92, 0.12];
const P = (o) => o; // pose literal

// Standing shot pose: dip (knees), rise (arms set), release (arm extended).
function shooterPose(t, { dip, rise, rel, lean = 0, leg = 0 }) {
  const d = bump(t, dip - 0.25, rise + 0.05); // knees bend then straighten
  const up = ramp(t, dip, rise); // arms go up into the set
  const fl = ramp(t, rel - 0.05, rel + 0.12); // the flick
  const back = ramp(t, rise - 0.2, rel) * lean;
  const done = ramp(t, rel + 0.6, rel + 1.0); // arms come down again
  const k = 1 - done;
  return P({
    armR: [(-1.2 - 1.6 * up - 0.2 * fl) * k + -0.1 * done, 0.45 * up * k, 0], // out a little, so it shows beside the big head
    foreR: [(-0.7 - 0.7 * up + 1.4 * fl) * k, 0, 0],
    armL: [(-1.2 - 1.2 * up + 0.4 * fl) * k + -0.1 * done, -0.45 * up * k, 0],
    foreL: [(-0.7 - 0.4 * up) * k, 0, 0],
    spine: [0.18 * d - 0.4 * back, 0, 0],
    head: [-0.15 * up * k + 0.2 * back, 0, 0],
    kneeL: [0.7 * d, 0, 0], kneeR: [0.7 * d, 0, 0],
    legL: [-0.35 * d - leg * back, 0, 0], legR: [-0.35 * d, 0, 0],
  });
}
// Running with the ball held at the chest.
const carryPose = (t) => P({ armR: [-1.1, 0.1, 0], foreR: [-0.9, 0, 0], armL: [-1.1, -0.1, 0], foreL: [-0.9, 0, 0], spine: [0.15, 0, 0] });
const mix = (a, b, u) => {
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = lerp3(a[k] || [0, 0, 0], b[k] || [0, 0, 0], u);
  return o;
};

function freeThrow(tier) {
  const sz = 2.7, rel = 1.25;
  const root = rootTrack([[0, 0, sz, 0], [0.9, 0, sz, 0], [1.15, 0, sz, 0.12], [1.4, 0, sz, 0], [9, 0, sz, 0]]);
  const segs = [
    { t0: 0, t1: 0.9, kind: 'hand', at: CHEST, to: CHEST },
    { t0: 0.9, t1: rel, kind: 'hand', at: CHEST, to: SET },
  ];
  const relPos = ballTrack(segs, root)(rel);
  const fly = 0.85;
  const events = [];
  let t = rel + fly;
  if (tier === 3) { // swish: straight through the middle
    segs.push({ t0: rel, t1: t, kind: 'arc', a: relPos, b: [0, H + 0.02, 0.01], h: 1.0 });
    segs.push({ t0: t, t1: t + 0.28, kind: 'arc', a: [0, H + 0.02, 0.01], b: [0, H - 0.45, 0.02], h: 0 });
    events.push({ t: t + 0.05, kind: 'net', swish: true });
    segs.push(...bounces(t + 0.4, [0, 0, 0.05], 0, 0.9));
    events.push({ t: t + 0.4, kind: 'bounce' }, { t: t + 0.2, kind: 'cheer' });
  } else if (tier === 2) { // front rim, a little hop, rolls round and drops in
    const front = [0, H + B, HOOP.r];
    segs.push({ t0: rel, t1: t, kind: 'arc', a: relPos, b: front, h: 0.95 });
    events.push({ t, kind: 'rim' });
    segs.push({ t0: t, t1: t + 0.32, kind: 'arc', a: front, b: [0.08, H + B * 0.6, HOOP.r - 0.04], h: 0.16 });
    events.push({ t: t + 0.32, kind: 'rim' });
    segs.push({ t0: t + 0.32, t1: t + 0.9, kind: 'roll', a0: 0.4, a1: 2.6, drop: 0 });
    segs.push({ t0: t + 0.9, t1: t + 1.15, kind: 'arc', a: [Math.sin(2.6) * 0.17, H, Math.cos(2.6) * 0.17], b: [0, H - 0.45, 0], h: 0 });
    events.push({ t: t + 0.95, kind: 'net' }, { t: t + 1.0, kind: 'cheer' });
    segs.push(...bounces(t + 1.3, [0, 0, 0], 0.1, 0.7));
    events.push({ t: t + 1.3, kind: 'bounce' });
    t += 0.9;
  } else { // off the back rim and out
    const back = [0.05, H + B, -HOOP.r + 0.02];
    segs.push({ t0: rel, t1: t, kind: 'arc', a: relPos, b: back, h: 0.9 });
    events.push({ t, kind: 'rim' });
    const out = [0.5, B, 1.1];
    segs.push({ t0: t, t1: t + 0.7, kind: 'arc', a: back, b: out, h: 0.55 });
    segs.push(...bounces(t + 0.7, out, 0.5, 0.9));
    events.push({ t: t + 0.7, kind: 'bounce' });
  }
  return {
    dur: t + 1.9, start: [0, sz], release: rel, root, events,
    pose: (tt) => shooterPose(tt, { dip: 0.85, rise: 1.15, rel }),
    ball: ballTrack(segs, root),
  };
}

function fadeaway(tier) {
  const sx = 1.4, sz = 2.4, rel = 1.15;
  // Jump up and back (away from the hoop), land a step behind.
  const back = 0.55, dx = sx / Math.hypot(sx, sz) * back, dz = sz / Math.hypot(sx, sz) * back;
  const root = rootTrack([[0, sx, sz, 0], [0.7, sx, sz, 0], [1.1, sx + dx * 0.6, sz + dz * 0.6, 0.42], [1.5, sx + dx, sz + dz, 0], [9, sx + dx, sz + dz, 0]]);
  const segs = [
    { t0: 0, t1: 0.7, kind: 'hand', at: CHEST },
    { t0: 0.7, t1: rel, kind: 'hand', at: CHEST, to: SET },
  ];
  const relPos = ballTrack(segs, root)(rel);
  const events = [];
  let t = rel + 0.9;
  if (tier === 3) {
    segs.push({ t0: rel, t1: t, kind: 'arc', a: relPos, b: [0, H + 0.02, 0], h: 1.15 });
    segs.push({ t0: t, t1: t + 0.28, kind: 'arc', a: [0, H + 0.02, 0], b: [0, H - 0.45, 0], h: 0 });
    events.push({ t: t + 0.05, kind: 'net', swish: true }, { t: t + 0.2, kind: 'cheer' });
    segs.push(...bounces(t + 0.4, [0, 0, 0], 0.2, 0.6));
    events.push({ t: t + 0.4, kind: 'bounce' });
  } else if (tier === 2) { // off the glass, into the rim
    const board = [0.18, H + 0.32, HOOP.board.z + B];
    segs.push({ t0: rel, t1: t, kind: 'arc', a: relPos, b: board, h: 0.9 });
    events.push({ t, kind: 'board' });
    segs.push({ t0: t, t1: t + 0.3, kind: 'arc', a: board, b: [0.03, H + 0.01, 0], h: 0.05 });
    segs.push({ t0: t + 0.3, t1: t + 0.58, kind: 'arc', a: [0.03, H + 0.01, 0], b: [0, H - 0.45, 0], h: 0 });
    events.push({ t: t + 0.34, kind: 'net' }, { t: t + 0.45, kind: 'cheer' });
    segs.push(...bounces(t + 0.7, [0, 0, 0], 0.3, 0.6));
    events.push({ t: t + 0.7, kind: 'bounce' });
    t += 0.3;
  } else { // airball: falls short, nothing but air
    const land = [sx * 0.25, B, 0.55];
    segs.push({ t0: rel, t1: t + 0.1, kind: 'arc', a: relPos, b: land, h: 1.25 });
    segs.push(...bounces(t + 0.1, land, -0.2, -0.3, 3, 0.45));
    events.push({ t: t + 0.1, kind: 'bounce' });
  }
  return {
    dur: t + 1.9, start: [sx, sz], release: rel, root, events,
    pose: (tt) => shooterPose(tt, { dip: 0.7, rise: 1.0, rel, lean: 1, leg: 0.5 }),
    ball: ballTrack(segs, root),
  };
}

function dunk(tier) {
  // Run in from the left wing, take off about 1 m out, rise to the rim.
  const s = [-1.3, 3.6], off = [-0.35, 1.0];
  const up = 1.2; // feet off the floor at the top
  const top = tier === 3 ? [0.02, 0.32] : [-0.04, 0.28];
  const tOff = 1.15, tTop = 1.55, tSlam = 1.68, tLand = 2.2;
  // tier 3: turn round in the air so your back is to the rim, and slam it backwards
  const spinTop = tier === 3 ? Math.PI : 0;
  const root = rootTrack([
    [0, s[0], s[1], 0, 0, 1], [tOff - 0.15, off[0], off[1], 0, 0, 1], [tOff, off[0], off[1] - 0.05, 0, 0, 0],
    [tTop, top[0], top[1] + 0.12, up, spinTop], [tSlam, top[0], top[1] + 0.12, up - 0.05, spinTop],
    [tLand, top[0] * 0.5, 0.9, 0, spinTop], [9, top[0] * 0.5, 0.9, 0, spinTop],
  ]);
  const hand = tier === 1 ? [0, 1.02, 0.3] : [0.12, 1.08, 0.3];
  const handBack = [0, 1.08, -0.3]; // over the head, behind you (facing away)
  const reach = tier === 3 ? handBack : hand;
  const segs = [
    { t0: 0, t1: tOff - 0.1, kind: 'hand', at: CHEST },
    { t0: tOff - 0.1, t1: tTop, kind: 'hand', at: CHEST, to: reach },
    { t0: tTop, t1: tSlam, kind: 'arc', a: () => ballTrack(segs.slice(0, 2), root)(tTop), b: [0, H + 0.03, 0.02], h: 0.05 },
    { t0: tSlam, t1: tSlam + 0.22, kind: 'arc', a: [0, H + 0.03, 0.02], b: [0, H - 0.5, 0.05], h: 0 },
    ...bounces(tSlam + 0.4, [0, 0, 0.05], 0.1, 1.0, 3, 0.6),
  ];
  const events = [{ t: tOff - 0.4, kind: 'bounce' }, { t: tSlam, kind: 'dunk' }, { t: tSlam + 0.05, kind: 'net' }, { t: tSlam + 0.15, kind: 'cheer' }, { t: tSlam + 0.4, kind: 'bounce' }];
  const pose = (t) => {
    const run = carryPose(t);
    const lift = ramp(t, tOff - 0.2, tTop - 0.05);
    const slam = ramp(t, tSlam - 0.05, tSlam + 0.1);
    const down = ramp(t, tLand - 0.15, tLand + 0.4);
    const knee = bump(t, tOff - 0.25, tOff + 0.1) + bump(t, tLand - 0.05, tLand + 0.35);
    let air;
    if (tier === 1) { // both hands up, slam down
      air = P({ armR: [-2.9 + 1.0 * slam, 0.5, 0], armL: [-2.9 + 1.0 * slam, -0.5, 0], foreR: [-0.3, 0, 0], foreL: [-0.3, 0, 0], spine: [-0.1 + 0.35 * slam, 0, 0], kneeL: [0.9, 0, 0], kneeR: [0.9, 0, 0], legL: [-0.5, 0, 0], legR: [-0.5, 0, 0] });
    } else if (tier === 2) { // one hand high, the other out for balance, one knee up
      air = P({ armR: [-3.0 + 1.2 * slam, 0.5, 0], foreR: [-0.1, 0, 0], armL: [-0.7, -0.9, 0], foreL: [-0.3, 0, 0], spine: [-0.05 + 0.35 * slam, 0, 0], legL: [-1.2, 0, 0], kneeL: [1.4, 0, 0], legR: [0.15, 0, 0], kneeR: [0.3, 0, 0] });
    } else { // back dunk: back to the rim, both hands over the head, arching back
      air = P({ armR: [-3.1 - 0.4 * slam, 0.55, 0], armL: [-3.1 - 0.4 * slam, -0.55, 0], foreR: [-0.2, 0, 0], foreL: [-0.2, 0, 0], spine: [-0.35 - 0.2 * slam, 0, 0], head: [-0.3, 0, 0], kneeL: [1.1, 0, 0], kneeR: [1.1, 0, 0], legL: [0.2, 0, 0], legR: [0.2, 0, 0] });
    }
    const p = mix(run, air, lift * (1 - down));
    p.kneeL = [(p.kneeL?.[0] || 0) + 0.7 * knee, 0, 0];
    p.kneeR = [(p.kneeR?.[0] || 0) + 0.7 * knee, 0, 0];
    if (down > 0) { p.armR = lerp3(p.armR, [-0.4, 0, 0], down); p.armL = lerp3(p.armL, [-0.4, 0, 0], down); }
    return p;
  };
  return { dur: tLand + 2.0, start: s, release: tSlam, root, events, pose, ball: ballTrack(segs, root) };
}

function layup(tier) {
  // From the right wing, two steps in, up off one foot near the rim.
  const s = [2.4, 3.2];
  const tA = 0.75, tB = 1.05, tUp = 1.35, tRel = 1.6, tLand = 2.0;
  let mid1 = [1.5, 2.0], mid2 = [0.95, 1.3];
  if (tier === 3) { mid1 = [1.7, 1.6]; mid2 = [0.55, 1.35]; } // euro step: step one way, then the other
  const peak = tier === 3 ? [0.15, 0.62] : [0.4, 0.62];
  const root = rootTrack([
    [0, s[0], s[1], 0, 0, 1], [tA, mid1[0], mid1[1], 0, 0, 1], [tB, mid2[0], mid2[1], 0, 0, 1],
    [tUp, (mid2[0] + peak[0]) / 2, (mid2[1] + peak[1]) / 2, 0.15], [tRel, peak[0], peak[1], 0.62],
    [tLand, peak[0] * 0.8, peak[1] + 0.35, 0], [9, peak[0] * 0.8, peak[1] + 0.35, 0],
  ]);
  const reach = tier === 2 ? [0.1, 0.95, 0.32] : [0.1, 1.0, 0.18];
  const segs = [
    { t0: 0, t1: tUp - 0.15, kind: 'hand', at: CHEST },
    { t0: tUp - 0.15, t1: tRel, kind: 'hand', at: CHEST, to: reach },
  ];
  const relPos = ballTrack(segs, root)(tRel);
  const events = [{ t: 0.35, kind: 'bounce' }];
  let t;
  if (tier === 1) { // up off the glass
    t = tRel + 0.4;
    const board = [0.12, H + 0.25, HOOP.board.z + B];
    segs.push({ t0: tRel, t1: t, kind: 'arc', a: relPos, b: board, h: 0.25 });
    events.push({ t, kind: 'board' });
    segs.push({ t0: t, t1: t + 0.28, kind: 'arc', a: board, b: [0.02, H + 0.01, 0], h: 0.04 });
    segs.push({ t0: t + 0.28, t1: t + 0.55, kind: 'arc', a: [0.02, H + 0.01, 0], b: [0, H - 0.45, 0], h: 0 });
    t += 0.28;
  } else { // finger roll and euro step: a soft roll straight in
    t = tRel + 0.45;
    segs.push({ t0: tRel, t1: t, kind: 'arc', a: relPos, b: [0, H + 0.02, 0], h: tier === 2 ? 0.4 : 0.32 });
    segs.push({ t0: t, t1: t + 0.27, kind: 'arc', a: [0, H + 0.02, 0], b: [0, H - 0.45, 0], h: 0 });
  }
  events.push({ t: t + 0.05, kind: 'net', swish: tier > 1 }, { t: t + 0.15, kind: 'cheer' });
  segs.push(...bounces(t + 0.4, [0, 0, 0], 0.3, 0.6));
  events.push({ t: t + 0.4, kind: 'bounce' });
  const pose = (tt) => {
    const run = carryPose(tt);
    const lift = ramp(tt, tUp - 0.2, tRel - 0.05);
    const down = ramp(tt, tLand - 0.1, tLand + 0.35);
    const fl = ramp(tt, tRel - 0.05, tRel + 0.1);
    let air;
    if (tier === 2) { // finger roll: arm out long, palm up, the ball rolls off the fingers
      air = P({ armR: [-2.2 - 0.3 * fl, 0.2, 0], foreR: [0, 0, 0], armL: [-0.6, -0.6, 0], foreL: [-0.4, 0, 0], spine: [-0.1, 0, 0], legL: [-1.3, 0, 0], kneeL: [1.5, 0, 0], legR: [0.2, 0, 0] });
    } else { // reach up with the right hand, left knee up
      air = P({ armR: [-2.7 - 0.2 * fl, 0.5, 0], foreR: [-0.5 + 0.5 * fl, 0, 0], armL: [-1.4, -0.3, 0], foreL: [-0.6, 0, 0], spine: [-0.05, 0, 0], legL: [-1.3, 0, 0], kneeL: [1.5, 0, 0], legR: [0.15, 0, 0] });
    }
    const p = mix(run, air, lift * (1 - down));
    if (tier === 3) { // the euro step: lean into each step
      const sw = bump(tt, tA - 0.3, tA + 0.15) - bump(tt, tB - 0.15, tB + 0.2);
      p.spine = [(p.spine?.[0] || 0), 0, 0.35 * sw];
      p.head = [0, 0, -0.2 * sw];
    }
    return p;
  };
  return { dur: t + 2.3, start: s, release: tRel, root, events, pose, ball: ballTrack(segs, root) };
}

const MOVES = { free: freeThrow, fade: fadeaway, dunk, layup };
export function shotMove(shotId, tier) {
  const s = SHOT_BY_ID[shotId];
  if (!s || !(tier >= 1 && tier <= 3)) return null;
  const m = MOVES[shotId](tier);
  return { ...m, shot: shotId, tier, tierId: s.tiers[tier - 1].id, made: s.tiers[tier - 1].made, points: shotPoints(shotId, tier) };
}

// A round of 5 shots.
export class BasketRound {
  constructor() { this.shots = []; }
  get n() { return this.shots.length; }
  get over() { return this.n >= SHOTS_PER_ROUND; }
  get points() { return this.shots.reduce((a, s) => a + s.points, 0); }
  get made() { return this.shots.filter((s) => s.made).length; }
  add(shotId, tier) {
    if (this.over || !SHOT_BY_ID[shotId]) return null;
    const s = SHOT_BY_ID[shotId];
    const r = { shot: shotId, tier, made: s.tiers[tier - 1].made, points: shotPoints(shotId, tier) };
    this.shots.push(r);
    return r;
  }
}
