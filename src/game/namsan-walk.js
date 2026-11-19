// Walking up Namsan (남산 산책로) and its summit plaza, out in the open:
// the trail from Sowol-ro, above Gyeongnidan-gil, up the hill to the plaza
// round the look-out tower, with the love locks, the Namsan stamp and the
// cable car's upper station at its north-west edge. The hill itself stays a
// blocker; the trail, the plaza and the way to the station are decks
// through it (core/collision.js addDeck), and on them you stand at the
// hill's height (core/namsan-shape.js). The trail's line is the namsan
// landmark's `trail` (scripts/build-namsan-real.mjs); core/landmarks.js
// draws it, game/namsan-summit.js the plaza (loaded when you come near).
// Small on purpose: this is in the first download (it is how you walk).
//
//   const walk = createNamsanWalk({ landmarks, collision, scene });
//   walk.y(x, z)            ground height on the hill (0 off it)
//   walk.update(p)          every frame on the street: loads the plaza nearby
//   walk.nearHeart(p)       at the love-lock heart?
//   walk.station            the cable car's upper station door [x, z] (game/namsan-cable.js)
//   walk.stationOut         where you step out of the cable car at the top
//
// The city wall's trail over the hill (l.wtrail, scripts/build-namsan-wall.mjs)
// is decks too; the wall itself (game/namsan-wall.js) loads when you come near.
import { namsanGround, onNamsan, namsanReach } from '../core/namsan-shape.js';

export const NAMSAN_WALK = {
  w: 3, // m: the trail's width (the landmark's trailW wins)
  plazaR: 26, // m round the tower: the summit plaza (inside the hill's level top, l.flat)
  towerR: 10.4, // m: the tower's terrace and its step (core/namsan-tower.js: 13.8 units × its 0.75 scale), with a little room
  footR: 6.2, // m: the tower's foot building (8 units × 0.75), the wall you bump into
  // The terrace you step up onto (core/namsan-tower.js NAMSAN_TOWER.step):
  // [its outer radius, its top over the plaza] m, the step then the terrace.
  terrace: [[10.2, 0.25], [9.25, 0.5]],
  heart: [-20, 0], // m from the tower: the love-lock heart, facing east into the plaza
  heartSpot: [-17.2, 0], // where you stand to hang a lock
  near: 480, // m: the plaza's models load this close (past the fog's 420 m)
  // Namsan Palgakjeong, the octagonal pavilion north-west of the tower (OSM
  // way 1555991263, scripts/data/namsan-osm.json palgakjeong): m from the
  // tower. The whole place at 50% (Yozi 2026-11-19): the pavilion ~3 m across
  // (real ~6 m), its stepped stone base ~9 m (real ~18 m, Naver map).
  palgak: [-12.6, -13.7],
  // Looking up at the tower (game/tower-look.js): within `range` m of it,
  // dragging the view up tilts up to its deck and antenna (Yozi 2026-11-19).
  lookUp: { range: 150, gain: 8 },
};
// The pavilion's base: three steps (outer radius of each octagon, its top),
// the columns' radius and height, the roof's eaves.
export const PALGAK = { steps: [[4.6, 0.15], [4.2, 0.3], [3.8, 0.45]], colR: 1.6, colH: 1.55, eave: 2.6 };
// How high the base is at (dx, dz) m from the pavilion's centre (0 off it):
// the octagons have flat faces at angles π/8 + kπ/4 (three.js cylinders).
export function palgakStep(dx, dz) {
  let ap = 0;
  for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k * Math.PI) / 4; ap = Math.max(ap, dx * Math.sin(a) + dz * Math.cos(a)); }
  let y = 0;
  for (const [r, top] of PALGAK.steps) if (ap < r * Math.cos(Math.PI / 8)) y = top;
  return y;
}

// How high the tower's terrace is at (dx, dz) m from the tower (0 off it).
export function terraceStep(dx, dz) {
  const d = Math.hypot(dx, dz);
  let y = 0;
  for (const [r, top] of NAMSAN_WALK.terrace) if (d < r) y = top;
  return y;
}

const ring = (cx, cz, r, n = 24) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });

export function createNamsanWalk({ landmarks = [], collision, scene = null, roads = [], buildings = [], seats = null }) {
  const l = landmarks.find((q) => q.type === 'namsan' && q.rad);
  const none = { y: () => 0, update() {}, nearHeart: () => false, station: null, stationOut: null, tower: null };
  if (!l) return none;
  const W = NAMSAN_WALK;
  const tower = [l.x + l.px, l.z + l.pz];
  const y = (x, z) => namsanGround(l, x - l.x, z - l.z);
  const deck = (a, b, w) => { // a stretch, a little past both ends so the bends join up
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.01) return;
    const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, nx = -dz * w / 2, nz = dx * w / 2, e = w / 2;
    collision?.addDeck([
      [a[0] - dx * e + nx, a[1] - dz * e + nz], [b[0] + dx * e + nx, b[1] + dz * e + nz],
      [b[0] + dx * e - nx, b[1] + dz * e - nz], [a[0] - dx * e - nx, a[1] - dz * e - nz],
    ]);
  };
  // The trail.
  const line = (l.trail || []).map(([x, z]) => [l.x + x, l.z + z]);
  for (let i = 1; i < line.length; i++) deck(line[i - 1], line[i], l.trailW || W.w);
  // The city wall's trail.
  for (const run of l.wtrail || []) for (let i = 1; i < run.length; i++) deck([l.x + run[i - 1][0], l.z + run[i - 1][1]], [l.x + run[i][0], l.z + run[i][1]], l.wtrailW || W.w);
  // The plaza, and a path from its edge to the upper station.
  collision?.addDeck(ring(...tower, W.plazaR + 0.5, 32));
  const cable = landmarks.find((q) => q.type === 'cablecar');
  let station = null, stationOut = null;
  if (cable?.path?.length) {
    const e = cable.path.at(-1);
    station = [cable.x + e[0], cable.z + e[1]];
    const d = Math.hypot(station[0] - tower[0], station[1] - tower[1]) || 1;
    const ux = (station[0] - tower[0]) / d, uz = (station[1] - tower[1]) / d;
    // its door, at the station's end towards the tower (scripts/build-namsan-cable.mjs)
    const door = cable.door ? [cable.x + cable.door[0], cable.z + cable.door[1]] : [station[0] - ux * 7.5, station[1] - uz * 7.5];
    deck([tower[0] + ux * (W.plazaR - 2), tower[1] + uz * (W.plazaR - 2)], door, 4);
    station = door;
    stationOut = { x: door[0] - ux * 1.5, z: door[1] - uz * 1.5, ry: Math.atan2(-ux, -uz) }; // facing the tower
  }
  const at = ([dx, dz]) => [tower[0] + dx, tower[1] + dz];
  const heartSpot = at(W.heartSpot);
  const reach = namsanReach(l), x0 = l.x - reach, x1 = l.x + reach, z0 = l.z - reach, z1 = l.z + reach;
  const palgak = at(W.palgak);
  const walkY = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 || !onNamsan(l, x - l.x, z - l.z) ? 0 : y(x, z) + palgakStep(x - palgak[0], z - palgak[1]) + terraceStep(x - tower[0], z - tower[1]));
  let summit = null, loading = false;
  // The wall: its box, and when it has loaded.
  const wallPts = (l.wall?.runs || []).flat().map(([x, z]) => [l.x + x, l.z + z]);
  const wb = wallPts.length && [Math.min(...wallPts.map((q) => q[0])), Math.min(...wallPts.map((q) => q[1])), Math.max(...wallPts.map((q) => q[0])), Math.max(...wallPts.map((q) => q[1]))];
  let wall = null, wallLoading = false;
  return {
    line, tower, station, stationOut,
    lookUp: [{ x: tower[0], z: tower[1], ...W.lookUp }],
    y: walkY,
    // Every frame on the street: the plaza's models when you come near.
    update(p) {
      wall?.update(p);
      if (wb && !wall && !wallLoading && scene && Math.hypot(Math.max(wb[0] - p.x, 0, p.x - wb[2]), Math.max(wb[1] - p.z, 0, p.z - wb[3])) < W.near) {
        wallLoading = true;
        import('./namsan-wall.js')
          .then(({ buildNamsanWall }) => { wall = buildNamsanWall({ scene, l, y: walkY, roads, buildings }); })
          .catch((e) => { wallLoading = false; console.warn('namsan wall', e); });
      }
      if (summit || loading || !scene || Math.hypot(p.x - tower[0], p.z - tower[1]) > W.near) return;
      loading = true;
      import('./namsan-summit.js')
        .then(({ buildNamsanSummit }) => {
          summit = buildNamsanSummit({ scene, collision, l, tower, station, trails: [line, ...(l.wtrail || []).map((r) => r.map(([x, z]) => [l.x + x, l.z + z]))], y: y(...tower), groundY: y });
          if (seats) seats.push(...summit.seats); // (Palgakjeong's floor edge: main.js streetSeats)
        })
        .catch((e) => { loading = false; console.warn('namsan summit', e); });
    },
    get wallGroup() { return wall?.group || null; }, // (main.js FarCull)
    nearHeart: (p) => Math.hypot(p.x - heartSpot[0], p.z - heartSpot[1]) < 2.2,
    awayFromHeart: (p) => Math.hypot(p.x - heartSpot[0], p.z - heartSpot[1]) > 4.5,
  };
}
