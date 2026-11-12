// Seoul Station (서울역): the old station building (Culture Station Seoul
// 284), the glass station hall behind it and Seoul Square across
// Hangang-daero, laid out by scripts/build-seoul-station.mjs (the real lines
// are in scripts/data/seoul-station-osm.json).
//
// Sizes (Yozi 2026-11-12, after talking it through): the old station at
// 37.5% of the real building (a symbol to take photos of, between the 1/4
// map and the 50% landmarks), everything else at 1/4. Game metres.

// The old station: its footprint is OpenStreetMap's outline (way 759569673,
// about 139 m north-south and 28 m deep for real) at 37.5%, so 52 x 10.5 m.
// Heights from Yozi's photos (2026-11-12, the front taken straight on):
// with the wings' eaves as 1, the big arch's top is about 1.35, the two
// small domed towers 1.55 and the top of the big dome's lantern 1.82; the
// dome is about two thirds as wide as the arched middle. The wings' eaves
// about 18 m for real (two tall storeys over a stone ground floor).
// The model faces +z (its front, east onto the plaza); +x is north.
export const OLD_STATION = {
  scale: 0.375,
  wingEave: 6.8, // the wings' walls (brick over a stone ground floor)
  ground: 2.6, // the stone ground floor
  roof: 1.7, // the wings' grey slate roofs, eave to ridge
  arch: 9.2, // the arched middle: the top of its frame
  tower: { w: 1.6, top: 8.1, cap: 10.5, r: 0.62 }, // the square towers either side of the arch, their green cupolas' tips
  dome: { r: 2.7, drum: 8.4, top: 12.4, lantern: 0.5 }, // behind the arch: the drum's top, the lantern's tip
  gable: 1.8, // the curved gables over the end pavilions, above the eaves
};

// The station hall (relation 7307085, its main part 331947843): glass over
// the tracks, 6 storeys (about 38 m) for real, so 9.5 m.
// The sign: a stone box on the roof (Yozi's photo), about two storeys high.
export const HALL = { h: 9.5, rotunda: 11, sign: { w: 6.5, h: 3.4, d: 2.4 } };

// Seoul Square (서울스퀘어, way 216477743): 23 storeys, 91 m for real. Its
// west front, facing the station, is a media wall (region.json "screens").
export const SEOUL_SQUARE = { h: 22.8, wall: '#8a7666', roof: '#5f5650' };
