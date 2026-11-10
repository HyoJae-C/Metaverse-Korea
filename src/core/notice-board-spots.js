// Where the notice boards stand on the main square (main.js): at the far end
// of the paved square, either side of the middle, facing back down it.
// Buildings can reach over the far end of the pave (Seongsu Square's north
// end is under a row of shops since the Yeonmujang-gil rebuild, and the
// boards stood inside them), so this walks from a quarter of the way out
// back towards the middle until every board, the ground behind it and the
// spot you read it from are clear.
export const BOARD_SIDES = [['news', -8.2], ['free', -4.8], ['ask', 4.8]]; // metres across the square
const HALF_W = 1.5; // half the board's roof
const READ = 1.2; // you read it from this far in front

// square: { x, z, zone: { pave: { l, ry } } }; blocked(x, z, r): a wall there.
// Returns [{ board, x, z, ry, ux, uz }] (ux, uz: where you stand to read it).
export function noticeBoardSpots(square, blocked) {
  const pv = square.zone.pave;
  const ry = pv?.ry || 0;
  const ax = Math.sin(ry), az = Math.cos(ry), nx = az, nz = -ax; // along / across the square
  const far = pv ? pv.l / 4 : 10;
  const at = (d) => BOARD_SIDES.map(([board, side]) => {
    const x = square.x + ax * d + nx * side, z = square.z + az * d + nz * side;
    return { board, x, z, ry: Math.atan2(-ax, -az), ux: x - ax * READ, uz: z - az * READ };
  });
  const clear = (b) => {
    for (let s = -HALF_W; s <= HALF_W; s += 0.5) for (const back of [-0.4, 0, 0.8]) {
      if (blocked(b.x + nx * s + ax * back, b.z + nz * s + az * back, 0.3)) return false;
    }
    return !blocked(b.ux, b.uz, 0.6);
  };
  for (let d = far; d >= -far; d -= 0.5) {
    const spots = at(d);
    if (spots.every(clear)) return spots;
  }
  return at(far); // nowhere clear: where it always was
}
