// Sai e's photo exhibition "내가 본 서울" (Seoul As I Saw It) in Seoul Forest's
// culture center: three floors (core/photo-show.js). The main photo stands
// in the middle of the 1F gallery; the 30 photos hang 10 to a floor, in this
// order (shuffled once, on the artist's wish for a random order, and kept so
// every visitor sees the same walls). The photos have no titles: only the
// main photo carries the artist's name. Images are under public/ and load
// only when you walk onto a floor.
export const PHOTO_SHOW = {
  store: 'seoul-forest-culture',
  title: { ko: '내가 본 서울', en: 'Seoul As I Saw It', ja: '私が見たソウル', zh: '我眼中的首尔' },
  artist: { ko: '사이에', en: 'Sai e' },
  dir: 'exhibitions/sai-e/',
  main: ['main', 960, 642],
  perFloor: 10,
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
};

export const PHOTO_FLOORS = [1, 2, 3];

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
// One photo as the museum card (ui/museum-ui.js) and the look-at prompt want it.
export function showPhoto([file, w, h], n) {
  const s = PHOTO_SHOW;
  return {
    id: 'sai-e-' + file, file: s.dir + file + '.webp', url: BASE + s.dir + file + '.webp', w, h, n,
    title: s.title, artist: s.artist, photo: true,
  };
}
export const photosOn = (floor) => PHOTO_SHOW.photos.slice((floor - 1) * PHOTO_SHOW.perFloor, floor * PHOTO_SHOW.perFloor).map((p, i) => showPhoto(p, (floor - 1) * PHOTO_SHOW.perFloor + i + 1));
export const mainPhoto = () => showPhoto(PHOTO_SHOW.main, 0);
