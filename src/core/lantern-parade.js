// The lantern parade (연등행렬): when it is, and where everyone in it walks.
// Pure, no DOM; the marchers and floats are drawn by game/lantern-parade.js,
// downloaded when you come near around show time.
//
// Like the real Lotus Lantern Festival's parade, which ends at Jogyesa, it
// starts down on the Cheonggyecheon walkway among the festival's lanterns,
// walks west along the water, climbs the stairs by Jangtonggyo, crosses
// Bosingak's square and Jong-ro, and goes up Ujeongguk-ro and in through
// Iljumun into the temple's yard, where the lantern canopy lights up row by
// row as the first marchers arrive. The big lantern floats are too wide for
// the stairs: they wait on Cheonggyecheon-ro and roll in behind their part
// of the column, then stop on Ujeongguk-ro in front of the gate.
//
// It is one of the three night shows (show-clock.js), every 9 hours. Before
// the start (the notice window) the column stands ready on the walkway.

import { showStarts, LANTERNS } from './show-clock.js';
import { frameOf } from './stream.js';
import { JOGYESA as J } from '../data/jogyesa.js';

export const SHOW_SECONDS = 20 * 60; // from setting off to the end (t = 0 … 1200)
export const ALERT_SECONDS = 600; // the game-wide "in 10 minutes" notice
export const AFTER_SECONDS = 120; // they stay in the yard a little after
export const SPEED = 0.55; // m/s, a slow festival walk
export const ROWS = 24, PER_ROW = 2, ROW_GAP = 1.6, SIDE = 0.55; // the column: rows of two
export const FLOATS = ['lotus', 'carp', 'tiger', 'moon']; // core/lanterns.js figures, one behind every sixth row
export const LIGHT_SECONDS = 40; // the canopy lights up over this long, from the gate side

// The parade around `now`, from the notice until it's over: { start (ms),
// t (seconds from the start, negative before), on (walking) }. null otherwise.
export function paradeAt(now = Date.now()) {
  for (const start of showStarts(now, LANTERNS)) {
    const t = (now - start) / 1000;
    if (t >= -ALERT_SECONDS && t < SHOW_SECONDS + AFTER_SECONDS) return { start, t, on: t >= 0 && t < SHOW_SECONDS };
  }
  return null;
}
export function nextParade(now = Date.now()) {
  return showStarts(now, LANTERNS).find((s) => s > now);
}

// ---------- The way (Gyeongbokgung district metres; streams in world metres) ----------
// The walkers: down on the north walkway (v -8) from Gwansugyo westward, out
// through the landing of the stairs at u 124 (side -1) and up them; then the
// street. The floats: along Cheonggyecheon-ro to the same corner.
const WALK = { from: 380, to: 113.5, v: -8 }; // (the column queues from u 300 back to ~u 345 before the start)
const STAIRS = [[113.5, -13.2, -4], [115, -13.2, -4], [124, -13.2, 0], [126, -13.2, 0]]; // [u, v, y]
const STREET = [[160, 177.5], [134, 173.3], [133, 146], [133.5, J.iljumun.z], [J.iljumun.x - J.iljumun.d / 2 - 0.6, J.iljumun.z]]; // ends just inside the gate
const FLOAT_ROAD = [[262, 194.5], [221.1, 194.5], [160, 177.5], [138, 173.6], [137.5, 146], [137.5, J.iljumun.z]]; // (Ujeongguk-ro's east lane, beside the walkers)
export const GATE_BACK = 3; // the floats stop in a queue from 3 m short of the gate

// A route: points [x, y, z] with the length so far.
function route(pts) {
  const out = [];
  let L = 0;
  pts.forEach((p, i) => { if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[2] - pts[i - 1][2]); out.push({ p, L }); });
  return { pts: out, len: L };
}
// The point `s` metres along (clamped), and the way it heads (radians, 0 = +z).
export function along(r, s) {
  const P = r.pts;
  if (s <= 0) { const a = P[0].p, b = P[1].p; return [a[0] + (a[0] - b[0]) * (-s / Math.max(1e-6, P[1].L)), a[1], a[2] + (a[2] - b[2]) * (-s / Math.max(1e-6, P[1].L)), Math.atan2(b[0] - a[0], b[2] - a[2])]; }
  let i = 1;
  while (i < P.length - 1 && P[i].L < s) i++;
  const a = P[i - 1], b = P[i], k = Math.min(1, (s - a.L) / Math.max(1e-6, b.L - a.L));
  return [a.p[0] + (b.p[0] - a.p[0]) * k, a.p[1] + (b.p[1] - a.p[1]) * k, a.p[2] + (b.p[2] - a.p[2]) * k, Math.atan2(b.p[0] - a.p[0], b.p[2] - a.p[2])];
}

// Both routes in world metres. `stream`: Cheonggyecheon from the merged map
// (world metres), `off`: the Gyeongbokgung district's offset.
export function paradeRoutes(stream, off) {
  const F = frameOf(stream), D = stream.depth || 4;
  const W = (x, z, y = 0) => [x + off[0], y, z + off[1]];
  const S = (u, v, y) => { const [x, z] = F.toWorld(u, v); return [x, y, z]; };
  const walk = [];
  for (let u = WALK.from; u > WALK.to; u -= 8) walk.push(S(u, WALK.v, -D)); // (following the stream's bends)
  walk.push(S(WALK.to, WALK.v, -D));
  for (const [u, v, y] of STAIRS) walk.push(S(u, v, y < 0 ? -D : 0));
  for (const [x, z] of STREET) walk.push(W(x, z));
  const walkers = route(walk);
  const floats = route(FLOAT_ROAD.map(([x, z]) => W(x, z)));
  // Where the two ways meet (Cheonggyecheon-ro, at the top of the stairs):
  // a float keeps its place in the column by the distance past this corner.
  const meet = (r) => r.pts.find((q) => Math.hypot(q.p[0] - off[0] - STREET[0][0], q.p[2] - off[1] - STREET[0][1]) < 0.01).L;
  return { walkers, floats, meet: { w: meet(walkers), f: meet(floats) } };
}

// Where each marcher stands in the yard once in: rows facing Daeungjeon.
export function yardSpot(i) {
  const cols = 8, r = Math.floor(i / cols), c = i % cols;
  return [J.canopy.x0 + 10 + c * 2.1, J.canopy.z0 + 6 + r * 1.8]; // (clear of the pagoda tree, the baby Buddha and the stele)
}

// Everyone's place at t seconds (negative: the column waits at the start).
// → { walkers: [{ x, y, z, ry, walking }], floats: [{ x, y, z, ry, kind }], lead }
// lead: how far the first row is from the gate's inner side (≤ 0: arrived).
export function paradeState(R, off, t) {
  const v = SPEED * Math.max(0, t);
  const startS = WALK.from - 300; // the first row starts at u 300
  const walkers = [];
  const gate = R.walkers.len;
  for (let row = 0; row < ROWS; row++) {
    const s = startS + v - row * ROW_GAP - Math.floor(row / 6) * 7; // a gap where a float rolls along up above
    for (let k = 0; k < PER_ROW; k++) {
      const i = row * PER_ROW + k, side = (k - (PER_ROW - 1) / 2) * 2 * SIDE;
      if (s < gate) {
        const [x, y, z, ry] = along(R.walkers, s);
        walkers.push({ x: x + Math.cos(ry) * side, y, z: z - Math.sin(ry) * side, ry, walking: t > 0 });
      } else { // inside: on to my spot in the yard, then stand facing Daeungjeon
        const [gx, , gz] = along(R.walkers, gate), [sx, sz] = yardSpot(i), wx = sx + off[0], wz = sz + off[1];
        const d = Math.hypot(wx - gx, wz - gz), k2 = Math.min(1, (s - gate) / Math.max(0.1, d));
        walkers.push({ x: gx + (wx - gx) * k2, y: 0, z: gz + (wz - gz) * k2, ry: k2 < 1 ? Math.atan2(wx - gx, wz - gz) : Math.PI, walking: k2 < 1 && t > 0 });
      }
    }
  }
  // The floats follow the row in front of their gap, by distance to the gate;
  // before their turn they wait at the start of the road; they stop in a
  // queue before the gate.
  const floats = FLOATS.map((kind, f) => {
    const row = (f + 1) * 6 - 1;
    const past = startS + v - row * ROW_GAP - Math.floor(row / 6) * 7 - R.meet.w - 3.5; // 3.5 m behind its row
    const s = Math.min(R.floats.len - GATE_BACK - f * 8, R.meet.f + past);
    const [x, y, z, ry] = along(R.floats, Math.max(-f * 8, s)); // (waiting in a queue back along the road)
    return { x, y, z, ry, kind };
  });
  return { walkers, floats, lead: gate - (startS + v) };
}
