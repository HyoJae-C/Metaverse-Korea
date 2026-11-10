import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, trackById } from '../src/data/tracks.js';

test('every song is complete and described in each language', () => {
  const ids = new Set();
  for (const tr of TRACKS) {
    assert.ok(!ids.has(tr.id), `unique id ${tr.id}`);
    ids.add(tr.id);
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(tr.name[l] && tr.desc[l], `${tr.id}.${l}`);
    const bars = (tr.steps || 64) / 8; // (the loop: 8 bars, or `steps` eighths)
    assert.ok(tr.organ ? tr.chords.length === bars : tr.chords.length === 4, `${tr.id} has 4 bars (the organ: one chord per bar)`);
    assert.equal(tr.bass.length, tr.chords.length, `${tr.id} has a bass note per bar`);
    assert.ok(tr.bpm >= 40 && tr.bpm <= 160 && tr.swing >= 1 && tr.swing < 1.5, `${tr.id} tempo`);
    assert.ok(tr.organ || tr.walk || tr.octaveBass || tr.bassHits?.length, `${tr.id} has a bass line`);
    if (tr.tune) {
      assert.equal(tr.tune.reduce((n, [, len]) => n + len, 0), tr.steps || 64, `${tr.id}: the tune fills the loop exactly`);
      for (const [m] of tr.tune) assert.ok(Number.isInteger(m) && m > 20 && m < 100);
    }
    if (tr.walk) for (const c of tr.chords) assert.ok(c.length >= 4, `${tr.id} walking bass needs 4-note chords`);
    for (const m of [...tr.chords.flat(), ...tr.bass, ...tr.scale]) assert.ok(Number.isInteger(m) && m > 20 && m < 100);
  }
  assert.equal(trackById('nope').id, 'lofi');
});
