// Myeongdong (명동), Jung-gu: the cathedral and part of the shopping
// streets, laid out by scripts/build-myeongdong.mjs (the streets and the
// cathedral grounds are in scripts/data/myeongdong-osm.json).
//
// Myeongdong Cathedral is drawn at 50% of the real church (Yozi 2026-11-11,
// like Gwanghwamun), its grounds at 1/4. Sizes in game metres, from the
// front elevation (front 28.997 m wide, 46.306 m to the top of the cross,
// roof ridge 22.5 m, belfry top 28.06 m, clock 18.4 m) and the real church's
// length of about 68 m. The model faces +z: the bell tower at +z, the apse
// at -z (src/core/cathedral-model.js).

export const CATHEDRAL = {
  scale: 0.5,
  length: 34, // bell tower front to apse
  width: 14.5, // the front: nave and both aisles
  nave: 7, // the nave between the aisles
  apse: 6, // how far the round east end reaches back from where it starts
  transept: { a0: -11, a1: -4, out: 1.4 }, // along the axis (from the middle), and how far it stands out
  tower: { w: 4.6, d: 1.5, body: 14, top: 23.15 }, // its square body up to the belfry top, then the spire and cross
  aisleEave: 4.7, // the aisles' outer walls
  eave: 8.6, // the nave's walls
  ridge: 11.25, // the roof's ridge
};
