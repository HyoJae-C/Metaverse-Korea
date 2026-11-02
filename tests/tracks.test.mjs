import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, trackById } from '../src/data/tracks.js';

test('every song is complete and described in each language', () => {
  const ids = new Set();
  for (const tr of TRACKS) {
    assert.ok(!ids.has(tr.id), `unique id ${tr.id}`);
    ids.add(tr.id);
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(tr.name[l] && tr.desc[l], `${tr.id}.${l}`);
    assert.equal(tr.chords.length, 4, `${tr.id} has 4 bars`);
    assert.equal(tr.bass.length, 4, `${tr.id} has a bass note per bar`);
    assert.ok(tr.bpm >= 40 && tr.bpm <= 160 && tr.swing >= 1 && tr.swing < 1.5, `${tr.id} tempo`);
    assert.ok(tr.walk || tr.octaveBass || tr.bassHits?.length, `${tr.id} has a bass line`);
    if (tr.walk) for (const c of tr.chords) assert.ok(c.length >= 4, `${tr.id} walking bass needs 4-note chords`);
    for (const m of [...tr.chords.flat(), ...tr.bass, ...tr.scale]) assert.ok(Number.isInteger(m) && m > 20 && m < 100);
  }
  assert.equal(trackById('nope').id, 'lofi');
});
