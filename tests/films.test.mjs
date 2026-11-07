import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILMS, youtubeId, parseFilm, filmMsg, nextFilm } from '../src/data/films.js';

test('any kind of YouTube link gives the video id', () => {
  for (const url of ['https://youtu.be/aqz-KE-bpKQ', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=3s',
    'https://youtube.com/shorts/aqz-KE-bpKQ?si=abc', 'https://www.youtube.com/embed/aqz-KE-bpKQ', 'aqz-KE-bpKQ']) {
    assert.equal(youtubeId(url), 'aqz-KE-bpKQ', url);
  }
  assert.equal(youtubeId('https://example.com/film.mp4'), null);
});

test('every film has an id and a title; messages round-trip; the programme wraps round', () => {
  assert.ok(FILMS.length > 0);
  for (const f of FILMS) { assert.match(f.id, /^[\w-]{11}$/); assert.ok(f.title.en || f.title.ko); }
  const id = FILMS[0].id;
  assert.deepEqual(parseFilm(filmMsg(id, 4.25)), { verb: 'play', id, at: 4.3 });
  assert.deepEqual(parseFilm(filmMsg(null)), { verb: 'stop' });
  assert.equal(parseFilm('film:play:dQw4w9WgXcQ:0'), null);
  assert.equal(parseFilm('kpop:stop'), null);
  assert.equal(nextFilm(FILMS[FILMS.length - 1].id).id, FILMS[0].id);
});

test('each cinema has its own programme; a film with no `in` plays in all of them', async () => {
  const { filmsFor, cinemaKey } = await import('../src/data/films.js');
  assert.equal(cinemaKey(true), 'byeolbit');
  for (const c of [true, 'doodle', 'silver']) {
    const list = filmsFor(c);
    assert.ok(list.length > 0, String(c));
    for (const f of list) assert.ok(!f.in || f.in.includes(cinemaKey(c)));
    assert.equal(nextFilm(list[list.length - 1].id, c).id, list[0].id);
  }
});
