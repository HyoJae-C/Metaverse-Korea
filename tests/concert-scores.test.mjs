import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONCERT_PROGRAM, SOURCES } from '../src/data/concert-scores.js';
import { VOICE_NAMES } from '../src/core/concert-player.js';
import { PIECES, build } from '../scripts/build-concert-scores.mjs';
import { readMidi } from '../scripts/midi-notes.mjs';

const N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const tune = (p, voice = 0, n = 9) => p.voices[voice].n.slice(0, n).map((x) => N[x[2] % 12]).join(' ');
const piece = (id) => CONCERT_PROGRAM.find((p) => p.id === id);

test('the concert programme: nine pieces, complete and in order', () => {
  assert.equal(CONCERT_PROGRAM.length, 9);
  for (const p of CONCERT_PROGRAM) {
    for (const lang of ['en', 'ko', 'ja', 'zh']) assert.ok(p.title[lang] && p.by[lang], `${p.id} ${lang}`);
    assert.ok(p.year <= 1905, `${p.id}: out of copyright (${p.year})`);
    assert.ok(['piano', 'orchestra'].includes(p.kind));
    const secs = (p.beats * 60) / p.bpm;
    assert.ok(secs >= 30 && secs <= 90, `${p.id} lasts ${secs.toFixed(0)} s`);
    for (const v of p.voices) {
      assert.ok(VOICE_NAMES.includes(v.inst), `${p.id}: ${v.inst}`);
      assert.ok(v.n.length > 0);
      v.n.forEach(([b, d, m, k], i) => {
        assert.ok(b >= 0 && d > 0 && b + d <= p.beats + 1e-6, `${p.id} ${v.inst}: note ${i} inside the piece`);
        assert.ok(m >= 24 && m <= 100 && k > 0 && k <= 1, `${p.id} ${v.inst}: note ${m}`);
        if (i) assert.ok(b >= v.n[i - 1][0], `${p.id} ${v.inst}: in order`);
      });
    }
  }
});

test('the famous openings are the right notes, in the original keys', () => {
  assert.equal(tune(piece('fur-elise')), 'E D# E D# E B D C A');
  assert.equal(tune(piece('moonlight'), 0, 6), 'G# C# E G# C# E'); // C sharp minor
  assert.equal(tune(piece('symphony-5'), 0, 8), 'G G G D# F F F D'); // C minor: G G G E flat, F F F D
  assert.equal(tune(piece('canon-in-d'), 0, 8), 'F# E D C# B A B C#');
  assert.equal(tune(piece('canon-in-d'), 3, 8), 'D A B F# G D G A'); // the ground bass
  assert.equal(tune(piece('air-on-the-g-string'), 0, 1), 'F#'); // the long first note
  assert.equal(tune(piece('ave-maria'), 0, 4), 'A# A A# D'); // B flat major
});

test('every piece says where its notes came from', () => {
  for (const p of CONCERT_PROGRAM) {
    const s = SOURCES[p.id];
    assert.ok(s?.by && s.id.startsWith('Mutopia-') && s.from === 'Mutopia Project', p.id);
    assert.ok(['Public Domain', 'Creative Commons Attribution 4.0'].includes(s.licence), `${p.id}: ${s.licence} (no share-alike editions)`);
  }
  const credits = readFileSync(new URL('../docs/CREDITS-MUSIC.md', import.meta.url), 'utf8');
  for (const p of PIECES) assert.ok(credits.includes(p.source.id), `${p.id} is credited in docs/CREDITS-MUSIC.md`);
});

test('the generated file is what the build script makes from the MIDI files', () => {
  for (const p of PIECES) {
    const made = build(p), have = piece(p.id);
    assert.equal(made.beats, have.beats, p.id);
    assert.equal(made.voices.reduce((s, v) => s + v.n.length, 0), have.voices.reduce((s, v) => s + v.n.length, 0), p.id);
    const m = readMidi(readFileSync(new URL(`../scripts/data/scores/${p.file}`, import.meta.url)));
    assert.ok(m.ppq > 0 && m.tracks.some((t) => t.notes.length));
  }
});
