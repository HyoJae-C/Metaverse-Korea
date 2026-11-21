// Euljiro 3-ga's neon alley ("Hipjiro", Yozi 2026-11-21): the narrow lane
// south of Euljiro 3-ga Station where vertical neon signs hang one over
// another (photos from Yozi; the real anchor is a beer hall at Euljiro 3-ga
// 344-17). Shared by scripts/build-neon-alley.mjs (the lane, its two rows of
// buildings) and game/neon-alley.js (the signs, wires, lanterns, people).
//
// World metres (x east, z south; core/seoul-grid.js), real Seoul at 1/4.
// approx: the lanes are read off Yozi's Naver capture (scale bar 30 m), not
// OSM yet: west end by Chungmu-ro, east end where the lane meets the
// diagonal lane north-north-east to Eulji-ro (and south-south-west to
// Mareunnae-ro). Redo from an OSM export when it comes.
//
// The lane is 3.5 m wide, not 1/4 (its real 2-3 m would be 0.6 m: too narrow
// to walk; Yozi 2026-11-21 "응 예외로"). Its length and the block stay 1/4.

export const NEON = {
  approx: true,
  why: 'Lanes traced from a Naver map capture (30 m scale bar), not OSM; to be redone from an OSM export.',
  width: 3.5, // m (an exception to 1/4: see above)
  // The neon lane, west (by Chungmu-ro) to east (the diagonal lane).
  lane: [[-1383.5, -585.4], [-1371, -583.3], [-1359, -581.2]],
  // The diagonal lane: Eulji-ro (north-north-east) down through the east
  // end of the neon lane to Mareunnae-ro (south-south-west).
  cross: [[-1351.6, -598.6], [-1359, -581.2], [-1367.4, -555.2]],
  crossWidth: 4,
  // Where the photo is: the neon lane's west mouth, looking east and up.
  photo: { x: -1381.5, z: -585, look: [1, -0.1] },
};

// The middle of it all and how far it reaches (game/neon-alley-near.js).
export const NEON_CENTER = [-1367, -581];
export const NEON_REACH = 30;
