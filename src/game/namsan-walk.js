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
  towerR: 9.5, // m: the tower's terrace (12 m × its 0.75 scale), with a little room
  heart: [-20, 0], // m from the tower: the love-lock heart, facing east into the plaza
  heartSpot: [-17.2, 0], // where you stand to hang a lock
  near: 480, // m: the plaza's models load this close (past the fog's 420 m)
};

const ring = (cx, cz, r, n = 24) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });

export function createNamsanWalk({ landmarks = [], collision, scene = null, roads = [], buildings = [] }) {
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
    const door = [station[0] - ux * 7.5, station[1] - uz * 7.5]; // in front of the station (10 × 8 m), on the plaza side
    deck([tower[0] + ux * (W.plazaR - 2), tower[1] + uz * (W.plazaR - 2)], door, 4);
    station = door;
    stationOut = { x: door[0] - ux * 1.5, z: door[1] - uz * 1.5, ry: Math.atan2(-ux, -uz) }; // facing the tower
  }
  const at = ([dx, dz]) => [tower[0] + dx, tower[1] + dz];
  const heartSpot = at(W.heartSpot);
  const reach = namsanReach(l), x0 = l.x - reach, x1 = l.x + reach, z0 = l.z - reach, z1 = l.z + reach;
  const walkY = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 || !onNamsan(l, x - l.x, z - l.z) ? 0 : y(x, z));
  let summit = null, loading = false;
  // The wall: its box, and when it has loaded.
  const wallPts = (l.wall?.runs || []).flat().map(([x, z]) => [l.x + x, l.z + z]);
  const wb = wallPts.length && [Math.min(...wallPts.map((q) => q[0])), Math.min(...wallPts.map((q) => q[1])), Math.max(...wallPts.map((q) => q[0])), Math.max(...wallPts.map((q) => q[1]))];
  let wall = null, wallLoading = false;
  return {
    line, tower, station, stationOut,
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
        .then(({ buildNamsanSummit }) => { summit = buildNamsanSummit({ scene, collision, l, tower, station, trailTop: line.at(-1), y: y(...tower), groundY: y }); })
        .catch((e) => { loading = false; console.warn('namsan summit', e); });
    },
    nearHeart: (p) => Math.hypot(p.x - heartSpot[0], p.z - heartSpot[1]) < 2.2,
    awayFromHeart: (p) => Math.hypot(p.x - heartSpot[0], p.z - heartSpot[1]) > 4.5,
  };
}
