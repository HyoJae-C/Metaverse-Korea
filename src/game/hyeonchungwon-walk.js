// Seoul National Cemetery (국립서울현충원, scripts/build-hyeonchungwon.mjs):
// a place of remembrance. You walk its roads, cross the lawn to
// Hyeonchungmun and pay your respects at the Memorial Tower; there is
// nothing to play and nothing to win here.
//
// The grounds' hill is a blocker in the map; its roads and paths, the court
// between the gate and the tower, the tower's terrace and the lawn are decks
// through it (core/collision.js addDeck), and on them you stand at the
// ground's height (core/hyeonchung-ground.js). What you see (the gate, the
// tower, the headstones, the woods) is game/hyeonchungwon-park.js, loaded
// with import() when you come near. Small on purpose: this is in the first
// download (it is how you walk).
//
//   const hc = createHyeonchungwonWalk({ landmarks, collision, scene, toast, text, busy });
//   hc.y(x, z)        ground height on the grounds (0 off them)
//   hc.update(p, dt)  every frame on the street
//   hc.tribute()      you paid your respects: white chrysanthemums on the altar
//   hc.group          what loaded (main.js FarCull), or null
import { hyeonchungHeight, hyeonchungBox } from '../core/hyeonchung-ground.js';

export const HC_NEAR = 480; // m: past the fog (it ends at 420 m), so it is there before you see it

// A box on the ground as a ring: middle (x, z), across w, deep d, turned ry.
export function boxRing(x, z, w, d, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [x + u * c + v * s, z - u * s + v * c]);
}

// What stands in the way (landmark metres): the gate's two wings, the tower,
// the altar, the terrace's front wall, the fountain.
export function hyeonchungSolids(l) {
  const out = [], g = l.gate, t = l.tower, c = Math.cos(g.ry), s = Math.sin(g.ry);
  const wing = (g.w - g.w * 0.52) / 2; // (the hall in the middle is open: you walk through)
  for (const k of [-1, 1]) { const u = k * (g.w / 2 - wing / 2); out.push(boxRing(g.at[0] + u * c, g.at[1] - u * s, wing, g.d * 0.62, g.ry)); }
  out.push(boxRing(t.at[0], t.at[1], t.w + 1.2, t.w + 1.2, t.ry));
  out.push(boxRing(l.altar.at[0], l.altar.at[1], 2.6, 1.2, l.altar.ry));
  for (const [a, b] of l.walls) { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); out.push(boxRing((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len, 0.5, Math.atan2(-(b[1] - a[1]), b[0] - a[0]))); }
  const f = l.fountain, n = 10;
  out.push(Array.from({ length: n }, (_, i) => [f.at[0] + Math.cos((i / n) * Math.PI * 2) * f.r, f.at[1] + Math.sin((i / n) * Math.PI * 2) * f.r]));
  return out;
}

export function createHyeonchungwonWalk({ landmarks = [], collision = null, scene = null, lowSpec = false, toast = null, text = null, busy = () => false }) {
  const l = landmarks.find((q) => q.type === 'hyeonchung');
  if (!l) return { y: () => 0, update() {}, tribute() {}, group: null, landmark: null };
  const [bx0, bz0, bx1, bz1] = hyeonchungBox(l);
  const x0 = l.x + bx0, z0 = l.z + bz0, x1 = l.x + bx1, z1 = l.z + bz1;
  const y = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 ? 0 : hyeonchungHeight(l, x - l.x, z - l.z));
  const W = ([x, z]) => [l.x + x, l.z + z];
  for (const f of l.flats) collision?.addDeck(f.p.map(W));
  for (const t of l.trails) {
    for (let i = 1; i < t.p.length; i++) {
      const a = W(t.p[i - 1]), b = W(t.p[i]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.01) continue;
      const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, w = t.w / 2, nx = -dz * w, nz = dx * w, e = t.court ? 0 : w; // (a little past both ends, so the bends join up)
      collision?.addDeck([[a[0] - dx * e + nx, a[1] - dz * e + nz], [b[0] + dx * e + nx, b[1] + dz * e + nz], [b[0] + dx * e - nx, b[1] + dz * e - nz], [a[0] - dx * e - nx, a[1] - dz * e - nz]]);
    }
  }
  // (after the decks, so they still stand in the way)
  collision?.add(hyeonchungSolids(l).map((p) => ({ p: p.map(W), low: true })));
  const near = (p) => Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
  // The note at the main gate: once each time you come up to it.
  const gx = l.x + l.mainGate.at[0], gz = l.z + l.mainGate.at[1], gr = l.note || 10;
  let shown = false, park = null, loading = false, flowers = 0;
  return {
    y,
    landmark: l,
    update(p, dt) {
      const d = Math.hypot(p.x - gx, p.z - gz);
      if (d < gr) { if (!shown && toast && !busy()) { shown = true; toast(text()); } } else if (shown && d > gr * 2.5) shown = false;
      if (park) { park.update(p, dt); return; }
      if (loading || !scene || near(p) > HC_NEAR) return;
      loading = true;
      import('./hyeonchungwon-park.js')
        .then(({ buildHyeonchungwonPark }) => { park = buildHyeonchungwonPark({ scene, l, y, lowSpec }); if (flowers) park.tribute(); })
        .catch((e) => { loading = false; console.warn('hyeonchungwon', e); });
    },
    tribute() { flowers++; park?.tribute(); },
    get park() { return park; },
    get group() { return park?.group || null; },
  };
}
