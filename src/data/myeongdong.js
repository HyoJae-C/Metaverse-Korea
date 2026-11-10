// Myeongdong (명동), Jung-gu: the cathedral and part of the shopping
// streets, laid out by scripts/build-myeongdong.mjs (the streets and the
// cathedral grounds are in scripts/data/myeongdong-osm.json).
//
// Myeongdong Cathedral is drawn at 50% of the real church (Yozi 2026-11-11,
// like Gwanghwamun), its grounds at 1/4. Sizes in game metres, from the
// front elevation (28.997 m across the transept, aisle fronts about 20 m,
// nave about 10.4 m between the turrets, 46.306 m to the top of the cross,
// roof ridge 22.5 m, belfry top 28.06 m, clock 18.4 m) and the real church's
// length of about 68 m. The model faces +z: the bell tower at +z, the apse
// at -z (src/core/cathedral-model.js).

export const CATHEDRAL = {
  scale: 0.5,
  length: 34, // bell tower front to apse
  width: 10, // the front: nave and both aisles (the transept stands out past them)
  nave: 5.2, // the nave between the aisles
  apse: 6, // how far the round east end reaches back from where it starts
  transept: { a0: -11, a1: -4, out: 1.75 }, // along the axis (from the middle), and how far it stands out
  // The bell tower (from the front elevation): a square body 7.3 m wide up
  // to 28 m, a stone crown with gablets (to 32.6 m) and corner pinnacles (to
  // 34.8 m), then a slender octagonal spire (3.5 m across at its foot) and
  // the cross. Clock at 19.3 m, belfry windows 22.8-26 m.
  tower: { w: 3.7, d: 1.5, body: 14, crown: 16.3, pinnacle: 17.4, spireR: 0.9, top: 23.15, clock: 9.65, belfry: 11.4 },
  turret: { x: 2.45, r: 0.5, h: 9.2, cap: 10.8 }, // the stone turrets either side of the tower
  aisleEave: 5, // the aisles' outer walls (side photo: about 62% of the nave's eave)
  aisleRoof: 6.3, // where the aisles' lean-to roofs meet the nave wall
  upperApse: { r: 2.6, top: 11 }, // the tall many-sided east end over the ambulatory
  eave: 8.6, // the nave's walls
  ridge: 11.25, // the roof's ridge
};
