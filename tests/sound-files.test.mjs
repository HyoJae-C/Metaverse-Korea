import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SOUND_FILES, soundUrl, stepSound, SoundFiles } from '../src/core/sound-files.js';

test('every listed sound has its files in public/', () => {
  for (const [name, n] of Object.entries(SOUND_FILES)) {
    for (let i = 0; i < n; i++) assert.ok(existsSync(new URL(`../public/${soundUrl(name, i)}`, import.meta.url)), soundUrl(name, i));
  }
});

test('soundUrl numbers variants and wraps around', () => {
  assert.equal(soundUrl('pay'), 'audio/sfx/pay.mp3');
  assert.equal(soundUrl('step-wood', 2, '/x/'), '/x/audio/sfx/step-wood-2.mp3');
  assert.equal(soundUrl('step-wood', 5), 'audio/sfx/step-wood-0.mp3');
  assert.equal(soundUrl('nope'), null);
});

test('stepSound: wood indoors, snow outside when it snows, else pavement', () => {
  assert.equal(stepSound({ indoor: true, snow: true }), 'step-wood');
  assert.equal(stepSound({ snow: true }), 'step-snow');
  assert.equal(stepSound({}), 'step-concrete');
});

test('play() says false while sound is off or not loaded, so the synth plays', () => {
  const sfx = { on: true, ctx: null };
  const f = new SoundFiles(sfx);
  assert.equal(f.play('pay'), false); // no audio context yet
  sfx.on = false;
  assert.equal(f.play('pay'), false);
});
