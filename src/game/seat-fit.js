// Sitting on top of whatever the seat really is. Every seat used to put the
// feet at a fixed height (the sitting pose is made for a 0.38 m chair), so a
// taller seat — a 0.42 m stone step, a 0.445 m park bench — swallowed the
// legs. Now, when you sit, the seat's top is measured from its own mesh (a
// ray straight down at the spot and a few more along the thighs) and the
// body is lifted so its underside (`under`: the sitting pose's lowest point
// at each distance in front of the hips, from the character pack) rests on
// that top. And where the seat's front edge is behind the knees (a deep
// stone step), you sit forward to it so the shins hang over the edge
// instead of going into the seat. Only the meshes under the spot are read,
// once, as you sit down.
import * as THREE from 'three';

const UP = 1.2; // look for a seat top up to this far above the spot
const DOWN = 0.3; // ...and this far below it
const LEGS_IN = 0.03; // the legs may press this far into a seat (a gap under the hips shows more)
const MOST = 0.25; // never move more than this from the seat's own height (the ground found under a seat drawn some other way)
const TOO_HIGH = 0.06; // a top this far above the seat's is something else (a table the legs go under)
const HIPS = 0.12; // the hips need this much seat in front of the spot
const AHEAD = 0.2; // sit forward at most this far (others still find you on the seat: core/players.js, 0.3 m)
const STEP = 0.02, LOOK = 0.6; // how finely and how far ahead to look for the front edge

// How far forward to sit so the front edge (metres ahead of the spot, null:
// none found) is just in front of the knees.
export function seatAhead(edge, knee) {
  if (edge == null || edge <= knee) return 0;
  return Math.min(edge - knee, AHEAD, Math.max(0, edge - HIPS));
}

// The feet's height so the body's underside rests on the seat. tops[i]: the
// top found under[i][0] metres in front of the feet's spot (null: none, the
// seat ended there). Returns null if nothing was found at the spot itself.
export function seatLift(tops, under) {
  const at = under.findIndex(([d]) => d >= 0);
  const top0 = tops[at];
  if (top0 == null) return null;
  let lift = top0 - under[at][1];
  for (let i = 0; i < under.length; i++) {
    const top = tops[i];
    if (i === at || top == null || top > top0 + TOO_HIGH) continue;
    lift = Math.max(lift, top - under[i][1] - LEGS_IN);
  }
  return lift;
}

export function createSeatFit({ under, knee = 0.2 }) {
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3(), n = new THREE.Vector3(), inst = new THREE.Matrix4();
  const meshes = [];
  let skip = null;
  const collect = (o) => {
    if (!o.visible || skip.has(o)) return;
    if (o.isMesh && !o.isSkinnedMesh && !(o.material?.transparent && o.material.opacity < 0.3)) meshes.push(o);
    for (const c of o.children) collect(c);
  };
  // The highest upward-facing surface under (x, z) between y0 and y0 - far,
  // in `list`; every hit goes into `hits` (if given).
  function topAt(list, x, y0, z, far, hits = null) {
    from.set(x, y0, z);
    ray.set(from, down);
    ray.far = far;
    let top = null;
    for (const h of ray.intersectObjects(list, false)) {
      if (top == null && h.face) {
        n.copy(h.face.normal);
        if (h.instanceId != null) { h.object.getMatrixAt(h.instanceId, inst); n.transformDirection(inst); } // (an instanced prop: turned by its own matrix too)
        n.transformDirection(h.object.matrixWorld);
        if (n.y > 0.6) top = h.point.y;
      }
      hits?.push(h);
    }
    return top;
  }
  // Where the feet go for sitting on `seat` in `scene`: { x, y, z } (null:
  // the seat's own place). people: the characters' roots, not part of any seat.
  return function fit(scene, seat, people = []) {
    if (seat.lie || seat.mat || seat.bumper != null || seat.duck != null) return null; // (not a seat you sit up on)
    const base = seat.y || 0;
    skip = new Set(people);
    collect(scene);
    skip = null;
    // One ray through everything at the spot; the ones along the thighs only
    // through what it hit around the seat (the seat itself: a stone step, a
    // bench's slats), so a big merged block isn't read five times.
    const fx = Math.sin(seat.ry || 0), fz = Math.cos(seat.ry || 0), hits = [];
    const top0 = topAt(meshes, seat.x, base + UP, seat.z, UP + DOWN, hits);
    meshes.length = 0;
    if (top0 == null) return null;
    const near = [...new Set(hits.filter((h) => h.point.y >= top0 - DOWN).map((h) => h.object))];
    const at = (d) => topAt(near, seat.x + fx * d, top0 + TOO_HIGH, seat.z + fz * d, TOO_HIGH + DOWN);
    let edge = null;
    for (let d = STEP; d <= LOOK; d += STEP) { const t = at(d); if (t == null || t < top0 - 0.05) { edge = d; break; } }
    const ahead = seatAhead(edge, knee);
    const tops = under.map(([d]) => (d === 0 && !ahead ? top0 : at(d + ahead)));
    if (tops[0] == null) tops[0] = top0;
    const y = seatLift(tops, under);
    return y != null && Math.abs(y - base) <= MOST ? { y, x: seat.x + fx * ahead, z: seat.z + fz * ahead } : null;
  };
}
