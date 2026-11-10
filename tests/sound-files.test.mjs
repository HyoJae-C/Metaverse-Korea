import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SOUND_FILES, soundUrl, SoundFiles } from '../src/core/sound-files.js';

test('every listed sound has its files in public/', () => {
  for (const [name, n] of Object.entries(SOUND_FILES)) {
    for (let i = 0; i < n; i++) assert.ok(existsSync(new URL(`../public/${soundUrl(name, i)}`, import.meta.url)), soundUrl(name, i));
  }
});

test('soundUrl builds the file path', () => {
  assert.equal(soundUrl('pay'), 'audio/sfx/pay.mp3');
  assert.equal(soundUrl('pay', 0, '/x/'), '/x/audio/sfx/pay.mp3');
  assert.equal(soundUrl('nope'), null);
});

test('play() says false while sound is off or not loaded, so the synth plays', () => {
  const sfx = { on: true, ctx: null };
  const f = new SoundFiles(sfx);
  assert.equal(f.play('pay'), false); // no audio context yet
  sfx.on = false;
  assert.equal(f.play('pay'), false);
});

test('footsteps are synthesised again, no recorded step files', () => {
  assert.ok(!Object.keys(SOUND_FILES).some((k) => k.startsWith('step')));
});
