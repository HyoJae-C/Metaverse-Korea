// Frisbee (원반) for playing fetch with your pet, only where picnic mats go:
// the Han River park lawns and the street's wooded parks (Seoul Forest).
// Bought next to the mats, kept in the bag. Throw it across open grass: a
// dog races after it and, if it gets there in time, leaps and snatches it
// out of the air, then brings it back. Other pets just watch it fly.
//
// The maths (where it lands, its flight, whether the dog catches it) is
// here without the game, so it can be unit-tested.
import * as THREE from 'three';

export const THROW_MAX = 11; // metres, a full throw
export const THROW_MIN = 4; // closer than this there's no room to play
export const HAND_Y = 1.1; // where it leaves the hand
export const DISC_R = 0.14; // a dog-size frisbee (radius, m)

// Is (x, z) open grass, with a little room around it? room: the park as in
// picnic.js ({ lawns, colliders, blocked(rect) }).
export function clearGrass(room, x, z, r = 0.35) {
  const rect = { x0: x - r, x1: x + r, z0: z - r, z1: z + r };
  if (!room?.lawns?.some((l) => rect.x0 >= l.x0 && rect.x1 <= l.x1 && rect.z0 >= l.z0 && rect.z1 <= l.z1)) return false;
  for (const c of room.colliders || []) {
    if (!c.p) continue;
    const xs = c.p.map((q) => q[0]), zs = c.p.map((q) => q[1]);
    if (rect.x0 < Math.max(...xs) && Math.min(...xs) < rect.x1 && rect.z0 < Math.max(...zs) && Math.min(...zs) < rect.z1) return false;
  }
  return !room.blocked?.(rect);
}

// Where a throw from (x, z) facing ry lands: as far as `power` (0..1) of a
// full throw, shortened until it comes down on open grass with grass on the
// way too (not into a tree or over a path). null: no room this way.
export function throwTarget(room, x, z, ry, power = 1) {
  const sx = Math.sin(ry), sz = Math.cos(ry);
  const far = THROW_MIN + (THROW_MAX - THROW_MIN) * Math.max(0, Math.min(1, power));
  for (let d = far; d >= THROW_MIN; d -= 0.5) {
    const tx = x + sx * d, tz = z + sz * d;
    if (clearGrass(room, tx, tz) && clearGrass(room, x + sx * d / 2, z + sz * d / 2, 0.2)) return { x: tx, z: tz, d };
  }
  return null;
}

// Seconds in the air: a longer throw floats a bit longer.
export const flightTime = (d) => 0.6 + d / 6;

// The disc s (0..1) of the way through its flight: a floaty arc from the
// hand down to the grass. ground: the lawn's height.
export function discAt(from, to, s, ground = 0) {
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  return {
    x: from.x + (to.x - from.x) * s,
    z: from.z + (to.z - from.z) * s,
    y: ground + HAND_Y * (1 - s) + 0.03 * s + Math.sin(Math.PI * s) * (0.5 + d * 0.06),
  };
}

// How fast a pet runs after it (m/s): big dogs are fastest, small round
// pets slowest.
export function chaseSpeed(kind, scale = 1) {
  if (kind !== 'dog') return kind === 'cat' ? 4 : 2.5;
  return 6 + 2 * bigness(scale); // 6 (small) .. 8 (big)
}
const bigness = (scale) => Math.min(1, Math.max(0, (scale - 0.8) / 0.9));

// How often a dog that gets there in time makes the catch (rolled once per
// throw): a Maltese about half the time, a big retriever most times.
export const catchChance = (scale = 1) => 0.5 + 0.35 * bigness(scale);

// Can a dog under the disc snatch it out of the air? Close enough, and
// low enough to reach with a leap (bigger dogs reach higher).
export const canCatch = (dx, dz, y, scale = 1) => Math.hypot(dx, dz) < 0.6 && y < 0.75 + 0.35 * scale;

// The frisbee: a bright disc with a rim, flat side up.
export function makeDisc(color = '#ff6b4a') {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(DISC_R, DISC_R * 0.9, 0.025, 20), new THREE.MeshLambertMaterial({ color }));
  g.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(DISC_R * 0.93, 0.012, 6, 20).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  rim.position.y = 0.006;
  g.add(rim);
  g.userData.noSnow = true;
  return g;
}
