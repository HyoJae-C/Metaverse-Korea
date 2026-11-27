// Where to lie on a bed so the head is on the pillow (Yozi 2026-11-27: on
// every bed the head was half a metre short of the pillow). A lying body is
// laid flat about its spot (data/characters/kaykit2.js `lie`: feet 0.6 m
// towards the foot end, the top of the head 0.57 m towards the head end,
// measured in the game), and the middle of the big head is LIE_HEAD from the
// spot. So each bed gives its pillow, and the spot is worked out from it,
// instead of a fixed place on the bed.
export const LIE_HEAD = 0.33;

// The spot for lying with the middle of the head at (px, pz), facing ry
// (the head end is the bed's -z, the way furniture and rooms are built).
// Returns [x, z].
export function lieSpot(px, pz, ry = 0) {
  return [px + Math.sin(ry) * LIE_HEAD, pz + Math.cos(ry) * LIE_HEAD];
}
