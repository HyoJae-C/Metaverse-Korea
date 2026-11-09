// The zoo's rooms, as numbers only (so main.js and interior.js can name them
// without loading the zoo, which comes on the first visit: core/zoo-park.js).
//   ZOO_PARK_ROOM: the zoo grounds (scripts/build-grand-park.mjs ZOO_ROOM, in
//   the street district's metres), entered through the entrance building's
//   door on the gate plaza ("cgp-zoo"); you come in, and go back out, at its
//   west edge (ZOO_PARK_ENTRY, facing into the zoo).
//   SEA_ROOM: the Sea Animals hall (core/zoo-sea-hall.js), entered from the
//   zoo through the hall's door (SEA_STORE: a store that is not on the street).
export const ZOO_PARK_ROOM = { w: 150, d: 175, h: 8, x0: 50, x1: 200, z0: -80, z1: 95 };
export const ZOO_PARK_EXIT = { x: 52.5, z: 0 };
export const ZOO_PARK_ENTRY = { x: 55, z: 0, ry: Math.PI / 2 }; // (facing +x, into the zoo)
export const SEA_ROOM = { w: 26, d: 24, h: 7.5 };
export const SEA_STORE = {
  id: 'cgp-sea-hall',
  category: 'play',
  workshop: 'zoo-sea',
  size: 'zoosea',
  name: { en: 'Sea Animals', ko: '바다동물관', ja: '海の動物館', zh: '海洋动物馆' },
  tagline: { en: "The zoo's indoor hall: seals, a walrus and a polar bear behind glass", ko: '동물원 실내관: 유리 너머 물개, 바다코끼리, 북극곰', ja: '動物園の屋内館：ガラス越しのアザラシ、セイウチ、ホッキョクグマ', zh: '动物园室内馆：玻璃后的海豹、海象和北极熊' },
  colors: { sign: '#3f86b8', awning: '#bfe3f2', accent: '#eaf7ff' },
  products: [],
};
