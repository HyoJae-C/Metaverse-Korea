// Where to put someone who'd otherwise be shut in by furniture (Yozi
// 2026-11-20: getting up from a friend's sofa into a gap between other
// pieces, stuck). A spot counts only if you can walk from it to the door:
// the floor is laid out in small steps, everything reachable from the door
// is marked, and the reachable spot nearest the one wanted wins. Nothing
// reachable at all (the door itself boxed in): the door.
const STEP = 0.25;

// The floor laid out in small steps, and every step someone of radius r can
// walk to from the door marked. null when the door itself is boxed in.
function walkFromDoor(col, door, room, r) {
  const free = (x, z) => !col.blocked(x, z, r);
  const minX = -room.w / 2 + r, maxX = room.w / 2 - r, minZ = -room.d / 2 + r, maxZ = room.d / 2 - r;
  const nx = Math.max(1, Math.floor((maxX - minX) / STEP) + 1), nz = Math.max(1, Math.floor((maxZ - minZ) / STEP) + 1);
  const cell = (x, z) => [Math.round((x - minX) / STEP), Math.round((z - minZ) / STEP)];
  const at = (i, k) => [minX + i * STEP, minZ + k * STEP];
  const inside = (i, k) => i >= 0 && k >= 0 && i < nx && k < nz;
  // Start from the door's nearest open step (it may sit a little inside a doorframe).
  let start = null;
  const [di, dk] = cell(door[0], door[1]);
  for (let ring = 0; ring <= 4 && !start; ring++) {
    for (let i = di - ring; i <= di + ring && !start; i++) for (let k = dk - ring; k <= dk + ring && !start; k++) {
      if (inside(i, k) && free(...at(i, k))) start = [i, k];
    }
  }
  if (!start) return null;
  const seen = new Uint8Array(nx * nz);
  const queue = [start];
  seen[start[0] * nz + start[1]] = 1;
  for (let q = 0; q < queue.length; q++) {
    const [i, k] = queue[q];
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + a, kk = k + b;
      if (!inside(ii, kk) || seen[ii * nz + kk]) continue;
      seen[ii * nz + kk] = 1;
      if (free(...at(ii, kk))) queue.push([ii, kk]);
    }
  }
  return { queue, at, free, nx, nz };
}

// col: something with blocked(x, z, r). want: [x, z]. door: [x, z].
// room: { w, d }, centred on 0. r: the body's radius. Returns [x, z].
export function freeSpot(col, want, door, room, r) {
  const walk = walkFromDoor(col, door, room, r);
  if (!walk) return door.slice();
  let best = null, bd = Infinity;
  for (const [i, k] of walk.queue) {
    const [x, z] = walk.at(i, k);
    const d = Math.hypot(x - want[0], z - want[1]);
    if (d < bd) { bd = d; best = [x, z]; }
  }
  // The wanted spot itself, when it's open and next to a reachable step.
  if (bd <= STEP && walk.free(want[0], want[1])) return want.slice();
  return best;
}

// Floor (m²) someone of radius r could stand on but can't walk to from the
// door: shut in behind furniture. A room divider may not make this grow
// (game/decor.js), so there is always a way round it. Door boxed in: Infinity.
export function shutInArea(col, door, room, r) {
  const walk = walkFromDoor(col, door, room, r);
  if (!walk) return Infinity;
  let open = 0;
  for (let i = 0; i < walk.nx; i++) for (let k = 0; k < walk.nz; k++) if (walk.free(...walk.at(i, k))) open++;
  return (open - walk.queue.length) * STEP * STEP;
}
