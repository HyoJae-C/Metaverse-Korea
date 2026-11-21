// What's on in Seoul Forest's one-room galleries B and C (forest galleries 1
// and 2; stores.json category "culture"; rooms drawn by core/culture.js).
// Galleries A (the culture center) and D (forest gallery 3) are photo shows
// on several floors (data/photo-show.js, core/photo-show.js).
// To put on a show, give the place a title, the artist, a look for the room
// and its works: 4 on each side wall and 2 on the back wall (core/culture.js).
//   theme: 'colorful' (bright walls, coloured frames) or 'dark' (dark walls)
//   works: [file (no .webp, under dir), width, height, title?]
// Images are under public/ and load only when you walk in; they are not kept
// on the player's device (public/sw.js). When a show ends, delete its folder
// under public/exhibitions so the site doesn't carry it either. A place with no
// works shows "coming soon" cards.
export const EXHIBITIONS = {
  // Gallery B: ACIRE's illustrations: no titles, on the artist's wish only the show's.
  'forest-gallery-1': {
    title: { ko: 'colorful', en: 'colorful' }, artist: { ko: 'ACIRE', en: 'ACIRE' }, theme: 'colorful',
    dir: 'exhibitions/acire/',
    works: [['01', 960, 960], ['02', 960, 720], ['03', 960, 960], ['04', 960, 960], ['05', 720, 960], ['06', 960, 960], ['07', 960, 960], ['08', 960, 960], ['09', 960, 960], ['10', 960, 960]],
  },
  // Gallery C: KimPD's photos, each titled 시네마틱01 to 10.
  'forest-gallery-2': {
    title: { ko: '시네마틱', en: 'Cinematic' }, artist: { ko: 'KimPD', en: 'KimPD' }, theme: 'dark',
    dir: 'exhibitions/kimpd/',
    works: [
      ['01', 640, 960, { ko: '시네마틱01', en: 'Cinematic01' }],
      ['02', 640, 960, { ko: '시네마틱02', en: 'Cinematic02' }],
      ['03', 640, 960, { ko: '시네마틱03', en: 'Cinematic03' }],
      ['04', 640, 960, { ko: '시네마틱04', en: 'Cinematic04' }],
      ['05', 640, 960, { ko: '시네마틱05', en: 'Cinematic05' }],
      ['06', 640, 960, { ko: '시네마틱06', en: 'Cinematic06' }],
      ['07', 640, 960, { ko: '시네마틱07', en: 'Cinematic07' }],
      ['08', 640, 960, { ko: '시네마틱08', en: 'Cinematic08' }],
      ['09', 640, 960, { ko: '시네마틱09', en: 'Cinematic09' }],
      ['10', 640, 960, { ko: '시네마틱10', en: 'Cinematic10' }],
    ],
  },
};

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
// One work as the photo card (ui/museum-ui.js) and the look-at prompt want it.
export const showWork = (show, [file, w, h, title], i) => ({
  id: show.dir + file, url: BASE + show.dir + file + '.webp', w, h, n: i + 1, of: show.works.length,
  title: title || show.title, show: show.title, artist: show.artist, photo: true,
});

export const COMING_SOON = {
  title: { ko: '다음 전시 준비 중', en: 'Next exhibition coming soon' },
  card: { ko: '작품 준비 중', en: 'Artwork coming soon' },
};
