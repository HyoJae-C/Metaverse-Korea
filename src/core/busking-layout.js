// The layout of a busking zone (landmark "busking" + region.json "busking"),
// in metres from the zone's centre: +x east, +z south (down on the map).
// Shared by the scenery (core/landmarks.js), the performers and crowd
// (core/busking.js) and the ground height you walk on (main.js).
//
// West: a long grassy bank the audience stands on, facing east (→) towards
// the performers. Across the walking street, east: a K-pop girl group of
// five, and some way south of them a boy group of four. North of the dancers
// the singer plays guitar alone, with a mic stand and an open guitar
// case for tips; that's also the spot you stand on to busk yourself.

// The bank: a long rectangle, x from back to front, z from end to end. It
// rises from the front edge to a flat top, then drops off at the back.
export const BANK = { back: -17, top0: -15, top1: -13.5, front: -9, z0: -16, z1: 14, h: 2, end: 2.5 };

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Height of the bank's grass at (x, z) from the zone's centre (0 off it).
export function bankHeight(x, z, B = BANK) {
  if (x <= B.back || x >= B.front || z <= B.z0 || z >= B.z1) return 0;
  const across = x < B.top0 ? smooth((x - B.back) / (B.top0 - B.back))
    : x > B.top1 ? smooth((B.front - x) / (B.front - B.top1)) : 1;
  const along = Math.min(smooth((z - B.z0) / B.end), smooth((B.z1 - z) / B.end));
  return B.h * across * along;
}

// Ground height at a world point from the busking landmarks (map.landmarks):
// up on the audience bank, 0 elsewhere. (The zones are not rotated.)
export function buskingGroundY(list = [], x, z) {
  for (const l of list) {
    if (l.type !== 'busking') continue;
    const y = bankHeight(x - l.x, z - l.z);
    if (y > 0) return y;
  }
  return 0;
}

// The audience on the bank: three rows, low at the front, high at the back.
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
