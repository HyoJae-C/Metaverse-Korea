// Bukhansan (북한산), the Baegundae course: how high the ground is at a
// point. scripts/build-bukhansan.mjs writes the Bukhansan map's `bukhansan`
// landmark; its grid, foot and trails work like Haneul Park's
// (core/skypark-ground.js), and the stops on the way are level pads:
//
//   pads [{ k, at: [x, z], r, y }]  the Visitor Support Center's plaza,
//        Harujae, the hut's yard, the gate and the top
import { skyparkHeight, skyparkBox } from './skypark-ground.js';

export const PAD_EASE = 3; // m round a pad over which the ground eases into it

// Height at (x, z) in landmark metres (0 off the mountain).
export function bukhanHeight(l, x, z) {
  let y = skyparkHeight(l, x, z);
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
