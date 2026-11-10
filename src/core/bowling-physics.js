// Bowling ball and pin physics, no DOM so it can be unit-tested
// (panel: ui/activity-ui.js). Seen from above: x across the lane (+ right),
// z down the lane from the foul line, in metres, at real sizes.
//
// The ball skids straight through the oil on the front of the lane and hooks
// on the dry back end; a slower ball hooks more. At the pins it is a 7 kg
// ball hitting 1.5 kg pins: pins that are hit hard enough tip over and fly,
// knock other pins down, bounce off the side kickbacks or drop into the pit.
// So the pocket with a little hook strikes, a ball straight into the head pin
// leaves splits, and a weak ball deflects off the pins.

export const LANE_HALF = 0.527; // the lane is 1.054 m wide (39 boards)
export const LANE_LEN = 18.288; // foul line to the head pin
export const OIL_LEN = 12.2; // the oil pattern: no hook before this
export const BALL_R = 0.109, PIN_R = 0.0605, PIN_H = 0.381;
export const PIN_GAP = 0.3048, ROW_GAP = PIN_GAP * Math.sqrt(3) / 2;
export const BOARD = (LANE_HALF * 2) / 39;
const BALL_M = 7, PIN_M = 1.5;
const GUTTER_X = LANE_HALF + 0.118; // the middle of the gutter
const KICKBACK = LANE_HALF + 0.24; // the side walls by the pin deck
const DECK_END = LANE_LEN + 3 * ROW_GAP + 0.25; // the pit starts here
const FALL_R = 0.085; // a pin tumbling over sweeps a wider circle
const TIP_SPEED = 0.38; // a hit harder than this tips a pin over

// Pins 1-10 in the usual numbering: 1 at the front, 7-10 in the back row.
// x, z relative to the head pin's spot.
export const PINS = [[0], [-1, 1], [-2, 0, 2], [-3, -1, 1, 3]].flatMap((row, r) => row.map((k) => ({ x: (k * PIN_GAP) / 2, z: r * ROW_GAP, row: r })));
// Where each pin stands on a fresh rack.
export const rackSpot = (i) => ({ x: PINS[i].x, z: LANE_LEN + PINS[i].z });

// What the player picks, turned into a throw: where you stand (-1 left edge
// .. 1 right edge), the line you send it on (-1..1, a few degrees), how hard
// (0..1) and how much it hooks (-1 hooks left .. 1 hooks right).
export function throwFrom({ stance = 0, aim = 0, power = 0.75, spin = 0 }) {
  const cl = (v, a = 1) => Math.max(-a, Math.min(a, v));
  return {
    x: cl(stance) * (LANE_HALF - BALL_R - 0.02),
    angle: cl(aim, 1.3) * 0.055, // about ±3°, enough to cross the lane
    speed: 4.6 + Math.max(0, Math.min(1, power)) * 5.2, // 4.6 .. 9.8 m/s (10 .. 22 mph)
    spin: cl(spin),
  };
}

// Roll one ball. standing: [{ i, x, z }] pins still up (z from the foul line).
// Returns { down: [pin indexes that fell], gutter, frames } where frames are
// snapshots every 1/60 s for the panel to play back:
//   { b: [x, z, roll], p: [[x, z, tilt 0..1, heading, gone]…] } (p in standing order)
export function simulateRoll({ x, angle, speed, spin }, standing, rand = Math.random) {
  const dt = 1 / 600, every = 10;
  const ball = { x, z: 0, vx: Math.sin(angle) * speed, vz: Math.cos(angle) * speed, roll: 0, gutter: false };
  const pins = standing.map((s) => ({ i: s.i, x: s.x, z: s.z, vx: 0, vz: 0, tilt: 0, fall: false, heading: 0, gone: false, gutter: false }));
  // Slower balls stay on the lane longer and so hook more (and hit softer),
  // though not as much more as the extra time alone would give.
  const hook = 1.3 * spin * Math.min(1.2, speed / 7.4);
  const frames = [];
  let t = 0, hitAt = null, step = 0;
  const snap = () => frames.push({ b: [ball.x, ball.z, ball.roll], p: pins.map((p) => [p.x, p.z, p.tilt, p.heading, p.gone ? 1 : 0]) });
  snap();
  while (t < 9) {
    t += dt; step++;
    // ── The ball ──
    if (!ball.gutter) {
      const dry = ball.z > OIL_LEN ? Math.min(1, (ball.z - OIL_LEN) / 1.5) : 0.06;
      ball.vx += hook * dry * dt;
      ball.vz -= (dry > 0.5 ? 0.45 : 0.12) * dt;
      if (Math.abs(ball.x) > LANE_HALF) { ball.gutter = true; ball.vx = 0; }
    } else {
      ball.x += (Math.sign(ball.x) * GUTTER_X - ball.x) * Math.min(1, 12 * dt);
      ball.vz -= 0.3 * dt;
    }
    ball.vz = Math.max(ball.vz, 0.3);
    if (ball.z < DECK_END + 0.5) { ball.x += ball.vx * dt; ball.z += ball.vz * dt; ball.roll += (Math.hypot(ball.vx, ball.vz) * dt) / BALL_R; }
    // ── Ball against pins ── (a gutter ball runs under the deck's edge)
    if (!ball.gutter) {
      for (const p of pins) {
        if (p.gone) continue;
        const r = BALL_R + (p.fall ? FALL_R * 0.6 : PIN_R);
        const dx = p.x - ball.x, dz = p.z - ball.z, d = Math.hypot(dx, dz);
        if (d >= r || d === 0) continue;
        hitAt ??= t;
        collide(ball, BALL_M, p, PIN_M, dx / d, dz / d, r - d, 0.7, rand);
      }
      // A ball deep in the pit stops counting.
      if (ball.z > DECK_END + 0.4) ball.vx = 0;
    }
    // ── Pins against pins and walls ──
    for (let a = 0; a < pins.length; a++) {
      const p = pins[a];
      if (p.gone) continue;
      for (let b = a + 1; b < pins.length; b++) {
        const q = pins[b];
        if (q.gone) continue;
        const r = (p.fall ? FALL_R : PIN_R) + (q.fall ? FALL_R : PIN_R);
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
        if (d >= r || d === 0) continue;
        collide(p, PIN_M, q, PIN_M, dx / d, dz / d, r - d, 0.55, rand);
      }
    }
    for (const p of pins) {
      if (p.gone) continue;
      const sp = Math.hypot(p.vx, p.vz);
      if (!p.fall && sp > TIP_SPEED) { p.fall = true; p.heading = Math.atan2(p.vx, p.vz); }
      if (p.fall) p.tilt = Math.min(1, p.tilt + dt * 4.5);
      // Standing pins barely slide; fallen ones skid along the deck.
      const fr = p.fall ? 1.6 : 5;
      if (sp > 0) { const k = Math.max(0, sp - fr * dt) / sp; p.vx *= k; p.vz *= k; }
      p.x += p.vx * dt; p.z += p.vz * dt;
      if (Math.abs(p.x) > KICKBACK - PIN_R) { p.x = Math.sign(p.x) * (KICKBACK - PIN_R); p.vx = -p.vx * 0.5; }
      if (Math.abs(p.x) > LANE_HALF + 0.03 && !p.fall) { p.fall = true; p.gutter = true; p.heading = Math.sign(p.x) * Math.PI / 2; }
      if (p.z > DECK_END) p.gone = true; // into the pit
      if (p.z < LANE_LEN - 0.6) { p.z = LANE_LEN - 0.6; p.vz = Math.abs(p.vz) * 0.3; }
    }
    if (step % every === 0) snap();
    // Done when the ball is gone and everything has settled.
    const moving = pins.some((p) => !p.gone && (Math.hypot(p.vx, p.vz) > 0.03 || (p.fall && p.tilt < 1)));
    if (ball.z > DECK_END && !moving && (hitAt == null || t - hitAt > 0.6)) break;
  }
  snap();
  const down = pins.filter((p) => p.fall || p.gone).map((p) => p.i).sort((a, b) => a - b);
  // Standing pins stay where they were nudged (the pinsetter puts them back
  // on the same spot), so the spare is thrown at what was left.
  const left = pins.filter((p) => !p.fall && !p.gone).map((p) => ({ i: p.i, x: p.x, z: p.z }));
  return { down, left, gutter: ball.gutter, frames, hitAt };
}

// An elastic-ish push between two circles along the normal (nx, nz) from a to b.
function collide(a, ma, b, mb, nx, nz, overlap, e, rand) {
  // Separate them first.
  const inv = 1 / (ma + mb);
  a.x -= nx * overlap * mb * inv; a.z -= nz * overlap * mb * inv;
  b.x += nx * overlap * ma * inv; b.z += nz * overlap * ma * inv;
  const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  if (rel <= 0) return;
  const j = ((1 + e) * rel) / (1 / ma + 1 / mb);
  // Pins are round only roughly: a little scatter off the true normal.
  const wob = (rand() - 0.5) * 0.3;
  const cx = nx - nz * wob, cz = nz + nx * wob, cl = Math.hypot(cx, cz);
  const ux = cx / cl, uz = cz / cl;
  a.vx -= (j / ma) * ux; a.vz -= (j / ma) * uz;
  b.vx += (j / mb) * ux; b.vz += (j / mb) * uz;
}

// A seeded random source, so a replay (or a test) comes out the same.
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
