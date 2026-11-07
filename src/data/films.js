// Cinema programme: short films streamed from YouTube into the cinema's big
// screen (nothing is bundled with the game). Everyone in the cinema watches
// the same film, and when one ends the next one starts by itself.
//
// To add a film:
//   1. Upload it to YouTube. "Unlisted" is fine (it won't show in search),
//      but keep "Allow embedding" on. Shorts work too.
//   2. Add one line below with its link and a title. Newest first.
//        { url: 'https://youtu.be/XXXXXXXXXXX', title: { en: 'My film', ko: '내 영화' }, by: 'Yozi' },
//      Any YouTube link works: youtu.be/…, youtube.com/watch?v=…, youtube.com/shorts/….
//      A title in one language is enough; other languages show English.
//   3. Seodaemun has three cinemas. A film plays in all of them unless it
//      names some with `in`: 'byeolbit' (Byeolbit Cinema), 'doodle' (the
//      2D cinema, good for drawn animation) or 'silver' (the black-and-white
//      cinema, which shows every film in black and white).
//        { url: '…', title: { … }, in: ['doodle'] },
//      Korean-language films, or films with little or no talking, suit
//      visitors who don't share a language best.
//
// The two entries marked `sample` are placeholders (Blender Foundation open
// movies, CC BY) until the first films are up: delete them then.
const LIST = [
  { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: { en: 'Big Buck Bunny', ko: '빅 벅 버니' }, by: 'Blender Foundation (CC BY)', sample: true },
  { url: 'https://www.youtube.com/watch?v=WhWc3b3KhnY', title: { en: 'Spring', ko: '스프링' }, by: 'Blender Foundation (CC BY)', sample: true },
];

// The 11-character video id in a YouTube link (or a bare id).
export function youtubeId(url) {
  const s = String(url || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = /(?:youtu\.be\/|[?&]v=|\/(?:shorts|embed|live)\/)([\w-]{11})(?![\w-])/.exec(s);
  return m ? m[1] : null;
}

export const FILMS = LIST.map((f) => ({ ...f, id: youtubeId(f.url) })).filter((f) => f.id);
export const filmById = (id) => FILMS.find((f) => f.id === id) || null;
// One cinema's programme (a store's "cinema" value in stores.json: true is
// Byeolbit Cinema, or 'doodle' / 'silver'). No cinema given: every film.
export const cinemaKey = (c) => (typeof c === 'string' ? c : 'byeolbit');
export const filmsFor = (cinema) => (cinema == null ? FILMS : FILMS.filter((f) => !f.in || f.in.includes(cinemaKey(cinema))));
// The film after this one in a cinema's programme (wrapping round), for
// back-to-back showings.
export const nextFilm = (id, cinema) => {
  const list = filmsFor(cinema);
  const i = list.findIndex((f) => f.id === id);
  return list.length ? list[(i + 1) % list.length] : null;
};

// Room messages, like the K-POP café's: "film:play:<id>:<tenths in>" and
// "film:stop". Only films on the list are accepted.
export function parseFilm(e) {
  const m = /^film:(play|stop)(?::([\w-]{11}):(\d{1,6}))?$/.exec(String(e));
  if (!m) return null;
  if (m[1] === 'stop') return { verb: 'stop' };
  if (!m[2] || !filmById(m[2])) return null;
  return { verb: 'play', id: m[2], at: Number(m[3]) / 10 };
}
export const filmMsg = (id, at) => (id ? `film:play:${id}:${Math.max(0, Math.round(at * 10))}` : 'film:stop');
