// Photo shows on several floors (core/photo-show.js): the main photo stands
// in the middle of the 1F gallery and the photos hang 10 to a floor, in the
// order listed. The photos have no titles: only the main photo carries the
// show's title and the artist's name. Images are under public/ and load only
// when you walk onto a floor. A store is a photo show when stores.json gives
// it workshop "photo-show" and size "photoshow" and it has an entry here.
//   floors: how many (photos.length / perFloor)
//   look: the gallery's colours, 'dark' (default) or 'pastel' (core/photo-show.js)
export const PHOTO_SHOWS = {
  // Gallery A, Seoul Forest's culture center: Sai e's "내가 본 서울" (Seoul As
  // I Saw It), 30 photos on three floors, shuffled once on the artist's wish
  // for a random order and kept so every visitor sees the same walls.
  'seoul-forest-culture': {
    title: { ko: '내가 본 서울', en: 'Seoul As I Saw It', ja: '私が見たソウル', zh: '我眼中的首尔' },
    artist: { ko: '사이에', en: 'Sai e' },
    dir: 'exhibitions/sai-e/',
    main: ['main', 960, 642],
    perFloor: 10,
    floors: 3,
    // [file (no .webp), width, height]
    photos: [
    ['25', 645, 960],
    ['23', 960, 629],
    ['14', 680, 960],
    ['19', 960, 636],
    ['22', 960, 663],
    ['07', 727, 960],
    ['30', 960, 947],
    ['11', 528, 960],
    ['08', 648, 960],
    ['26', 649, 960],
    ['24', 960, 633],
    ['20', 960, 633],
    ['10', 683, 960],
    ['16', 960, 671],
    ['09', 657, 960],
    ['18', 644, 960],
    ['13', 684, 960],
    ['02', 542, 960],
    ['04', 960, 641],
    ['28', 644, 960],
    ['17', 960, 629],
    ['03', 655, 960],
    ['15', 960, 668],
    ['29', 960, 636],
    ['21', 649, 960],
    ['12', 683, 960],
    ['05', 648, 960],
    ['27', 635, 960],
    ['01', 960, 951],
    ['06', 649, 960],
    ],
  },
  // Gallery D (forest gallery 3): JH's "모두와 함께한 모두서울" (Modu Seoul,
  // Played Together), 20 screenshots from the game on two floors, no titles.
  'forest-gallery-3': {
    title: { ko: '모두와 함께한 모두서울', en: 'Modu Seoul, Played Together', ja: 'みんなと遊んだモドゥソウル', zh: '和大家一起的摩都首尔' },
    artist: { ko: 'JH', en: 'JH' },
    dir: 'exhibitions/jh/',
    look: 'pastel', // bright pastel walls for the game's own pictures (core/photo-show.js LOOKS)
    main: ['main', 888, 790],
    perFloor: 10,
    floors: 2,
    photos: [
      ['01', 960, 473], ['02', 960, 473], ['03', 960, 473], ['04', 960, 540], ['05', 960, 549],
      ['06', 960, 634], ['07', 960, 594], ['08', 960, 568], ['09', 929, 487], ['10', 861, 589],
      ['11', 871, 538], ['12', 960, 518], ['13', 764, 583], ['14', 960, 659], ['15', 513, 402],
      ['16', 529, 362], ['17', 637, 518], ['18', 960, 651], ['19', 960, 551], ['20', 960, 564],
    ],
  },
};

// The show in a store, or on one of its upper floors (core/museum.js museumFloorStore).
export const showOf = (store) => PHOTO_SHOWS[(store?.base || store)?.id];
export const floorsOf = (show) => Array.from({ length: show.floors }, (_, i) => i + 1);

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
// One photo as the museum card (ui/museum-ui.js) and the look-at prompt want it.
export function showPhoto(show, [file, w, h], n) {
  return {
    id: show.dir + file, file: show.dir + file + '.webp', url: BASE + show.dir + file + '.webp', w, h, n,
    title: show.title, artist: show.artist, photo: true, of: n ? show.photos.length : 0,
  };
}
export const photosOn = (show, floor) => show.photos.slice((floor - 1) * show.perFloor, floor * show.perFloor).map((p, i) => showPhoto(show, p, (floor - 1) * show.perFloor + i + 1));
export const mainPhoto = (show) => showPhoto(show, show.main, 0);
