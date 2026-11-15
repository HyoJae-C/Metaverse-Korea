// Bongeunsa's Maitreya Buddha stands up on a terrace (map landmark
// "maitreya" with `lift`, scripts/bongeunsa-layout.mjs): how high the ground
// is at a point. The plaza is l.lift above the yards; its stairs go down
// from the gap in the front kerb (l.stairs = [width, run]), drawn as a
// smooth slope so the camera doesn't jolt at every step. Small, so main.js
// has it from the start; the meshes are core/bongeunsa-model.js.
// The landmark's frame: the statue at (l.x, l.z), facing +v (turned l.ry);
// l.plaza = [w, length, the plaza's middle ahead of the statue].

export function terraceHeight(l, dx, dz) {
  const c = Math.cos(l.ry || 0), s = Math.sin(l.ry || 0);
  const u = dx * c - dz * s, v = dx * s + dz * c;
  const [pw, pl, pc] = l.plaza, front = pc + pl / 2;
  if (Math.abs(u) <= pw / 2 && v >= pc - pl / 2 && v <= front) return l.lift;
  const [sw, run] = l.stairs || [0, 0];
  if (Math.abs(u) <= sw / 2 && v > front && v < front + run) return l.lift * (1 - (v - front) / run);
  return 0;
}

const lists = new WeakMap();
// World (x, z) -> the ground's height on a raised temple plaza in the list.
export function terraceY(list = [], x, z) {
  let ts = lists.get(list);
  if (!ts) lists.set(list, (ts = list.filter((l) => l.type === 'maitreya' && l.lift)));
  for (const l of ts) {
    const dx = x - l.x, dz = z - l.z;
    if (dx * dx + dz * dz > 625) continue; // (25 m: the plaza and its stairs)
    const y = terraceHeight(l, dx, dz);
    if (y) return y;
  }
  return 0;
}
