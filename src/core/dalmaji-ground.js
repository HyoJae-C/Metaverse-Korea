// Dalmaji Park (달맞이근린공원) by Oksu Station: how high the ground is at a
// point. scripts/build-oksu.mjs writes the Oksu map's `dalmaji` landmark;
// its grid, foot and trails work like Haneul Park's (core/skypark-ground.js),
// and its photo islands are level decks:
//
//   islands [{ at: [x, z], y, ry, size: [w, d] }]  the look-outs over the Han
import { skyparkHeight, skyparkBox } from './skypark-ground.js';

// A photo island's deck as a ring of points, landmark metres.
export function islandRing(i) {
  const [w, d] = i.size, c = Math.cos(i.ry), s = Math.sin(i.ry), [x, z] = i.at;
  // (its near edge on the look-out spot's path, reaching out towards the view)
  return [[-w / 2, -0.6], [w / 2, -0.6], [w / 2, d - 0.6], [-w / 2, d - 0.6]].map(([u, v]) => [x + u * c + v * s, z - u * s + v * c]);
}

function inRing(x, z, p) {
  let r = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r;
  }
  return r;
}

const rings = new WeakMap();
const islandRings = (l) => { if (!rings.has(l)) rings.set(l, (l.islands || []).map((i) => ({ y: i.y, p: islandRing(i) }))); return rings.get(l); };

// Height at (x, z) in landmark metres (0 off the hill).
export function dalmajiHeight(l, x, z) {
  for (const r of islandRings(l)) if (inRing(x, z, r.p)) return r.y;
  return skyparkHeight(l, x, z);
}

export const dalmajiBox = skyparkBox;
