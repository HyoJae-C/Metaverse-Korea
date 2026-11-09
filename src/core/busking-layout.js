// The layout of a busking zone (landmark "busking" + region.json "busking"),
// in metres from the zone's centre: +x east, +z south (down on the map).
// Shared by the scenery (core/landmarks.js), the performers and crowd
// (core/busking.js) and the ground height you walk on (main.js).
//
// West: long low steps the audience stands and sits on, facing east (→)
// towards the performers, like the stepped edges of the real walking street.
// Across the walking street, east: a K-pop girl group of five, and some way
// south of them a boy group of four. North of the dancers the singer plays
// guitar alone, with a mic stand and an open guitar case for tips; that's
// also the spot you stand on to busk yourself.

// The steps: a long rectangle, x from back to front, z from end to end.
// `n` low steps of `rise` each climb from the front edge (treads `tread`
// deep), from both ends (`endTread`) and, steeper, from the back
// (`backTread`), so you can walk up them from any side.
export const BANK = { back: -17, front: -9, z0: -16, z1: 14, n: 4, rise: 0.35, tread: 1.8, endTread: 0.6, backTread: 0.4 };
BANK.h = BANK.n * BANK.rise;

// Which step (0 = the street, n = the top) is at (x, z) from the zone's centre.
export function stepAt(x, z, B = BANK) {
  if (x <= B.back || x >= B.front || z <= B.z0 || z >= B.z1) return 0;
  return Math.min(B.n,
    Math.ceil((B.front - x) / B.tread), Math.ceil((x - B.back) / B.backTread),
    Math.ceil((z - B.z0) / B.endTread), Math.ceil((B.z1 - z) / B.endTread));
}

// Height of the step you stand on at (x, z) from the zone's centre (0 off it).
export function bankHeight(x, z, B = BANK) {
  return stepAt(x, z, B) * B.rise;
}

// Ground height at a world point from the busking landmarks (map.landmarks):
// up on the audience steps, 0 elsewhere. (The zones are not rotated.)
export function buskingGroundY(list = [], x, z) {
  for (const l of list) {
    if (l.type !== 'busking') continue;
    const y = bankHeight(x - l.x, z - l.z);
    if (y > 0) return y;
  }
  return 0;
}

// The audience on the steps: three rows, one step apart, low at the front.
export const CROWD = [
  ...[-12, -6, 0, 6, 11].map((z) => [-10.4, z]),
  ...[-13, -8, -3, 2, 7, 12].map((z) => [-12.3, z]),
  ...[-10, -4.5, 1, 6.5].map((z) => [-14.3, z]),
];

// Where the performers stand. Everyone faces west (the audience).
export const SINGER = [7, -13];
export const MIC = [5.9, -13];
export const CASE = [5.6, -11.2];
export const GIRLS = [[6.2, -3], [7.8, -5.4], [7.8, -0.6], [9.4, -7.8], [9.4, 1.8]];
export const BOYS = [[6.4, 8.6], [6.4, 11.6], [8.6, 7.1], [8.6, 13.1]];
export const FACE_AUDIENCE = -Math.PI / 2; // rotation.y facing -x

// The faint "BUSKING ZONE" lettering on the ground, in the street between.
export const GROUND_TEXT = { x: -1.5, z: 0, w: 22, d: 5.5 };
