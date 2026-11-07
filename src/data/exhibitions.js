// What's on in Seoul Forest's culture center and the forest galleries
// (stores.json category "culture"; rooms drawn by core/culture.js).
// To put on a show, give the place a title and works. Each work hangs in the
// next frame on the walls:
//   { title: { ko, en }, by: { ko, en }, image: 'exhibitions/<file>.webp' }
// image is a path under public/ (optional: without it the frame shows the
// title on a plain card). A place with no works shows "coming soon" cards.
export const EXHIBITIONS = {
  'seoul-forest-culture': { title: null, works: [] },
  'forest-gallery-1': { title: null, works: [] },
  'forest-gallery-2': { title: null, works: [] },
  'forest-gallery-3': { title: null, works: [] },
};

export const COMING_SOON = {
  title: { ko: '다음 전시 준비 중', en: 'Next exhibition coming soon' },
  card: { ko: '작품 준비 중', en: 'Artwork coming soon' },
};
