import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUB_TRACKS, CLUB_GENRES, CLUB_FORM, songSeconds, playlistAt, sectionAt, songBars } from '../src/data/club-tracks.js';
import { songPatterns, scaleNote, seeded } from '../src/core/club-music.js';
import { taxiFare, TAXI_BASE } from '../src/core/taxi.js';

test('each club genre has 10 songs of 2 to 3 minutes', () => {
  for (const g of Object.keys(CLUB_GENRES)) {
    assert.equal(CLUB_TRACKS[g].length, 10, g);
    assert.ok(CLUB_FORM[g], g);
    for (const tr of CLUB_TRACKS[g]) {
      const s = songSeconds(g, tr);
      assert.ok(s >= 120 && s <= 180, `${tr.id}: ${s.toFixed(0)} s`);
      assert.equal(tr.prog.length, 4, tr.id);
      assert.ok(tr.name.en && tr.name.ko, tr.id);
    }
  }
  const ids = Object.values(CLUB_TRACKS).flat().map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'song ids are unique');
});

test('the playlist runs on the clock and loops', () => {
  const g = 'edm';
  const lens = CLUB_TRACKS[g].map((t) => songSeconds(g, t));
  const cycle = lens.reduce((a, b) => a + b, 0);
  assert.deepEqual(playlistAt(g, 0), { index: 0, pos: 0 });
  assert.equal(playlistAt(g, lens[0] + 1).index, 1);
  assert.ok(Math.abs(playlistAt(g, lens[0] + 1).pos - 1) < 1e-6);
  assert.equal(playlistAt(g, cycle * 3 + 5).index, 0);
  assert.equal(playlistAt(g, cycle - 1).index, 9);
});

test('sections cover every bar of a song', () => {
  for (const g of Object.keys(CLUB_FORM)) {
    assert.equal(sectionAt(g, 0).name, 'intro');
    assert.equal(sectionAt(g, songBars(g) - 1).name, 'outro');
    for (let b = 0; b < songBars(g); b++) assert.ok(sectionAt(g, b).energy > 0);
  }
});

test('song patterns come from the seed, so every player hears the same notes', () => {
  const tr = CLUB_TRACKS.kpop[3];
  assert.deepEqual(songPatterns('kpop', tr), songPatterns('kpop', tr));
  assert.notDeepEqual(songPatterns('edm', CLUB_TRACKS.edm[0]).lead, songPatterns('edm', CLUB_TRACKS.edm[1]).lead);
  const r = seeded(5);
  for (let i = 0; i < 100; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
  assert.equal(scaleNote(45, 0), 45);
  assert.equal(scaleNote(45, 2), 48); // minor third
  assert.equal(scaleNote(45, 2, true), 49); // major third
  assert.equal(scaleNote(45, 7), 57);
  assert.equal(scaleNote(45, -1), 43);
});

test('taxi fare grows with distance', () => {
  assert.equal(taxiFare(0, 0, 10, 0), TAXI_BASE);
  const near = taxiFare(0, 0, 300, 0), far = taxiFare(0, 0, 1300, 0);
  assert.ok(near > TAXI_BASE && far > near);
});
