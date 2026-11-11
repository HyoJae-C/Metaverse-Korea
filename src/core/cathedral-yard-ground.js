// Myeongdong Cathedral's hill (map landmark "cathedralyard",
// districts/myeongdong.json): how high the ground is at a point. The yard
// the church stands on is a terrace l.h above the street, held up by brick
// walls; from Myeongdong-gil you go up the wide straight stairs on the
// church's axis (the famous ones in front of the bell tower) or the ramp
// west of them (the real service road). Small, so main.js has it from the
// start; the meshes are core/cathedral-yard.js, loaded with the city.
//
// The landmark (district metres, relative to l.x, l.z, which is the
// church's middle):
//   f      [x, z] the church's front direction (towards the bell tower)
//   h      the terrace's height
//   yard   the grounds' outline (not "p": districts.js would move it)
//   cut    how far along f the terrace reaches (Myeongdong-gil's kerb)
//   stairs { a0, a1, w, n }: from a0 (top) to a1 (foot) along f, w wide,
//          n steps (drawn on a smooth slope: you walk up it without the
//          camera jolting at every step)
//   ramp   r0: where the slope west of the stairs starts going down
//          (it reaches the street at cut); blend: the width beside the
//          stairs where it rises across to them
// "side" is along s = (-f.z, f.x): east of the axis is +.
import { pointInPoly } from './collision.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// The local frame: [along, side] of a point relative to the landmark.
export function yardFrame(l, dx, dz) {
  const [fx, fz] = l.f;
  return [dx * fx + dz * fz, -dx * fz + dz * fx];
}

// Height at (along, side) inside the grounds.
export function yardHeightAt(l, along, side) {
  const { h, cut, stairs: { a0, a1, w }, ramp: { r0, blend } } = l;
  if (along > cut) return 0;
  const hw = w / 2;
  // The stairs' slope: h at the top, 0 at the foot.
  const Y = along <= a0 ? h : h * clamp01((a1 - along) / (a1 - a0));
  if (side >= -hw && side <= hw && along > a0) return Y;
  if (side > hw || along <= r0) return h; // the terrace (east of the stairs, and the yard)
  // West of the stairs: the slope down to the street (the ramp), rising
  // across to the stairs' height beside them.
  const R = h * clamp01((cut - along) / (cut - r0));
  const t = clamp01((side + hw + blend) / blend);
  return R + (Math.max(Y, R) - R) * t;
}

// (x, z) in the landmark's own metres -> height, or 0 off the grounds.
export function yardHeight(l, dx, dz) {
  if (!pointInPoly(dx, dz, l.yard)) return 0;
  const [a, s] = yardFrame(l, dx, dz);
  return yardHeightAt(l, a, s);
}

const boxes = new WeakMap(), yards = new WeakMap();
// World (x, z) -> the ground's height on a cathedral yard in the list.
// Called a lot (every frame, and for each guide arrow), so the yards are
// picked out of the list once and each has a box to test first.
export function yardY(list = [], x, z) {
  let ys = yards.get(list);
  if (!ys) yards.set(list, (ys = list.filter((l) => l.type === 'cathedralyard')));
  for (const l of ys) {
    let b = boxes.get(l);
    if (!b) {
      const xs = l.yard.map((q) => q[0]), zs = l.yard.map((q) => q[1]);
      boxes.set(l, (b = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]));
    }
    const dx = x - l.x, dz = z - l.z;
    if (dx < b[0] || dx > b[2] || dz < b[1] || dz > b[3]) continue;
    return yardHeight(l, dx, dz);
  }
  return 0;
}
