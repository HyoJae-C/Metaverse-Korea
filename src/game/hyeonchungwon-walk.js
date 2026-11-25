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
//   const hc = createHyeonchungwonWalk({ landmarks, collision, scene, toast, text, busy, sky });
//     sky()           { dark 0-1, wet }: how the sun and the moon over the hill show
//   hc.y(x, z)        ground height on the grounds (0 off them)
//   hc.update(p, dt)  every frame on the street
//   hc.tribute()      you paid your respects: incense burns at the altar
//   hc.group          what loaded (main.js FarCull), or null
import { hyeonchungHeight, hyeonchungBox } from '../core/hyeonchung-ground.js';

const inPolygonXZ = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };

// Hyeonchungmun's stone floor (drawn in hyeonchungwon-park.js): the open hall is `hall` of the gate's width, on a
// platform `plat` m up that reaches `out` m past the hall's front and back, with `steps` m of steps there, `stair` of the hall wide.
export const HC_LOOK = { gate: { range: 38, gain: 2.2 }, tower: { range: 45, gain: 3.6 } }; // (m from each; how far the view lifts: less than Namsan's tower, these are low and near)
export const HC_GATE = { hall: 0.52, plat: 0.45, side: 0.8, out: 0.7, steps: 1.2, stair: 0.7 };
// How high you stand at (x, z), landmark metres: on the platform, on its steps, or 0.
export function gateFloor(l, x, z) {
  const g = l.gate, G = HC_GATE, dx = x - g.at[0], dz = z - g.at[1], c = Math.cos(g.ry), sn = Math.sin(g.ry);
  const u = Math.abs(dx * c - dz * sn), v = Math.abs(dx * sn + dz * c), hallW = g.w * G.hall, edge = g.d / 2 + G.out;
  if (u > hallW / 2 + G.side || v > edge + G.steps) return 0;
  if (v <= edge) return G.plat;
  return u <= (hallW * G.stair) / 2 ? G.plat * (1 - (v - edge) / G.steps) : 0;
}

export const HC_NEAR = 480; // m: past the fog (it ends at 420 m), so it is there before you see it

// A box on the ground as a ring: middle (x, z), across w, deep d, turned ry.
export function boxRing(x, z, w, d, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [x + u * c + v * s, z - u * s + v * c]);
}

// What stands in the way (landmark metres): the gate's two wings, the tower,
// the altar, the terrace's front wall, the flagpole, the fountain.
export function hyeonchungSolids(l) {
  const out = [], g = l.gate, t = l.tower, c = Math.cos(g.ry), s = Math.sin(g.ry);
  const wing = (g.w - g.w * 0.52) / 2; // (the hall in the middle is open: you walk through)
  for (const k of [-1, 1]) { const u = k * (g.w / 2 - wing / 2); out.push(boxRing(g.at[0] + u * c, g.at[1] - u * s, wing, g.d * 0.62, g.ry)); }
  out.push(boxRing(t.at[0], t.at[1], t.w + 1.2, t.w + 1.2, t.ry));
  out.push(boxRing(l.altar.at[0], l.altar.at[1], 3.4, 3.2, l.altar.ry)); // (the burner and the stone, the verse wall behind)
  for (const [a, b] of l.walls) { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); out.push(boxRing((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len, 0.5, Math.atan2(-(b[1] - a[1]), b[0] - a[0]))); }
  if (l.flag) out.push(boxRing(l.flag.at[0], l.flag.at[1], 0.6, 0.6, 0));
  for (const m of l.memorials || []) out.push(boxRing(m.at[0], m.at[1], m.size[0], m.size[1], m.ry));
  const f = l.fountain, n = 10;
  out.push(Array.from({ length: n }, (_, i) => [f.at[0] + Math.cos((i / n) * Math.PI * 2) * f.r, f.at[1] + Math.sin((i / n) * Math.PI * 2) * f.r]));
  return out;
}

// The wooded ridge behind (l.ridge, seen only): where it stands you can't
// walk. One rectangle for each run of its cells along a row. They go in
// before the decks, so a way that runs along the ridge's foot stays whole.
export function ridgeSolids(k) {
  const out = [];
  if (!k) return out;
  const c = k.cell / 2;
  for (let j = 0; j < k.h; j++) {
    for (let i = 0; i < k.w;) {
      if (!k.m[j * k.w + i]) { i++; continue; }
      let e = i;
      while (e < k.w && k.m[j * k.w + e]) e++;
      const x0 = k.x0 + i * k.cell - c, x1 = k.x0 + (e - 1) * k.cell + c, z0 = k.z0 + j * k.cell - c, z1 = z0 + k.cell;
      out.push([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
      i = e;
    }
  }
  return out;
}

export function createHyeonchungwonWalk({ landmarks = [], collision = null, scene = null, lowSpec = false, toast = null, text = null, busy = () => false, sky = null, music = null, riding = null, getOff = null, noRide = null }) {
  const l = landmarks.find((q) => q.type === 'hyeonchung');
  if (!l) return { y: () => 0, update() {}, tribute() {}, group: null, landmark: null, inside: false };
  const [bx0, bz0, bx1, bz1] = hyeonchungBox(l);
  const x0 = l.x + bx0, z0 = l.z + bz0, x1 = l.x + bx1, z1 = l.z + bz1;
  const y = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 ? 0 : gateFloor(l, x - l.x, z - l.z) || hyeonchungHeight(l, x - l.x, z - l.z)); // (the gate's stone floor is 0.45 m up: you stand on it, not in it)
  const W = ([x, z]) => [l.x + x, l.z + z];
  collision?.add(ridgeSolids(l.ridge).map((p) => ({ p: p.map(W), low: true })));
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
  let inside = false; // (on the grounds, on the street)
  let songBefore = null; // (the song that was on before you came onto the grounds)
  return {
    y,
    landmark: l,
    // Near the gate and the tower, dragging the view up tilts it up at them (game/tower-look.js; Yozi 2026-11-25).
    lookUp: [{ x: l.x + l.gate.at[0], z: l.z + l.gate.at[1], ...HC_LOOK.gate }, { x: l.x + l.tower.at[0], z: l.z + l.tower.at[1], ...HC_LOOK.tower }],
    update(p, dt) {
      const d = Math.hypot(p.x - gx, p.z - gz);
      if (d < gr) { if (!shown && toast && !busy()) { shown = true; toast(text()); } } else if (shown && d > gr * 2.5) shown = false;
      // The cemetery's own quiet music while you are on the grounds (only if music is on; your song comes back as you leave).
      // On the grounds: no bikes or cars (you get off at the edge; a seat in a friend's car is theirs to stop). Running is fine: it is a big place.
      inside = near(p) < 12 && inPolygonXZ(p.x - l.x, p.z - l.z, l.foot);
      const r = riding?.();
      if (inside && r && r !== 3) { getOff?.(); if (toast && noRide) toast(noRide()); }
      const mu = music?.();
      if (mu) {
        const inside = near(p) < 12;
        if (inside && !songBefore && mu.on && mu.track.id !== 'hyeonchung') { songBefore = mu.track.id; mu.setTrack('hyeonchung'); }
        else if (!inside && songBefore && near(p) > 40) { if (mu.track.id === 'hyeonchung') mu.setTrack(songBefore); songBefore = null; }
      }
      if (park) { park.update(p, dt); return; }
      if (loading || !scene || near(p) > HC_NEAR) return;
      loading = true;
      import('./hyeonchungwon-park.js')
        .then(({ buildHyeonchungwonPark }) => { park = buildHyeonchungwonPark({ scene, l, y, lowSpec, sky }); if (flowers) park.tribute(); })
        .catch((e) => { loading = false; console.warn('hyeonchungwon', e); });
    },
    tribute() { flowers++; park?.tribute(); },
    get inside() { return inside; },
    get park() { return park; },
    get group() { return park?.group || null; },
  };
}
