// Bukhansan (북한산), the Baegundae course: how high the ground is at a
// point. scripts/build-bukhansan.mjs writes the Bukhansan map's `bukhansan`
// landmark; its grid, foot and trails work like Haneul Park's
// (core/skypark-ground.js), and the stops on the way are level pads:
//
//   pads [{ k, at: [x, z], r, y }]  the Visitor Support Center's plaza,
//        Harujae, the hut's yard, the gate and the top
import { skyparkHeight, skyparkBox, trailNear } from './skypark-ground.js';

export const ON_EASE = 0.6; // m beside the way over which the ground comes back to its own height
export const PAD_EASE = 3; // m round a pad over which the ground eases into it

// The way's own surface at (x, z), or null off it: each stretch of the way is
// a strip, level across, running on at its own slope a little past both its ends (game/bukhansan-park.js
// draws exactly these); where two overlap, at a bend, the higher one is on
// top. Steps are blocks set along the line itself, with nothing past the ends;
// where the steps turn hard, the upper flight's blocks stand over the lower
// flight's edge, and you step up onto them there.
// (skyparkHeight alone eases the ground towards every way near by, one
// after another: at a bend, or where one way ends and the next starts, the
// later one pulled the ground up to half a metre off the strip you stood on,
// and you sank into the path: Yozi 2026-11-27.)
export const WAY_PAST = 1.2; // m a strip runs past its ends, at most (half its width if that is less)
export function wayTop(l, x, z) {
  let top = null;
  for (const t of l.trails || []) {
    const p = t.p, h = t.w / 2;
    for (let i = 1; i < p.length; i++) {
      const [ax, az, ay] = p[i - 1], [bx, bz, by] = p[i], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      const e = t.steps ? 0 : Math.min(h, WAY_PAST) / len, s = ((x - ax) * dx + (z - az) * dz) / (len * len);
      if (s < -e || s > 1 + e || Math.abs((x - ax) * dz - (z - az) * dx) / len > h) continue;
      const yy = ay + (by - ay) * s;
      if (top == null || yy > top) top = yy;
    }
  }
  return top;
}

// Height at (x, z) in landmark metres (0 off the mountain).
export function bukhanHeight(l, x, z) {
  let y = skyparkHeight(l, x, z);
  // On the way you stand on what is drawn (wayTop); just beside it the ground comes back to its own height.
  const top = wayTop(l, x, z);
  if (top != null) y = top;
  else {
    let on = null;
    for (const t of l.trails || []) { const n = trailNear(t, x, z), e = n.d - t.w / 2; if (e < ON_EASE && (!on || e < on.e)) on = { e, y: n.y }; }
    if (on) { const k = Math.max(0, on.e) / ON_EASE; y = on.y * (1 - k) + y * k; }
  }
  for (const p of l.pads || []) {
    const d = Math.hypot(x - p.at[0], z - p.at[1]) - p.r;
    if (d >= PAD_EASE) continue;
    if (d <= 0) return p.y;
    const k = d / PAD_EASE, s = k * k * (3 - 2 * k);
    y = p.y * (1 - s) + y * s;
  }
  return y;
}

export const bukhanBox = skyparkBox;

// A pad as a ring of points (landmark metres), for the deck through the blocker.
export const padRing = (p, n = 20) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [p.at[0] + Math.cos(a) * p.r, p.at[1] + Math.sin(a) * p.r]; });
