import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineHz, hearGain, honkKind, honkMsg, parseHonk, HEAR_RADIUS, STEP_GAP, STEP_VOL, WIND_MAX, ENGINE_MAX, HORN_VOL, BELL_VOL } from '../src/core/motion-sound.js';

test('bicycles ring a bell, motor vehicles beep', () => {
  assert.equal(honkKind(1), 'bell');
  assert.equal(honkKind(2), 'bell');
  assert.equal(honkKind(4), 'horn');
  assert.equal(honkKind(5), 'horn');
  assert.equal(honkKind(0), null);
});

test('honk messages round-trip and reject anything else', () => {
  assert.equal(parseHonk(honkMsg('bell')), 'bell');
  assert.equal(parseHonk(honkMsg('horn')), 'horn');
  assert.equal(parseHonk('honk:siren'), null);
  assert.equal(parseHonk('hi5:abc'), null);
});

test('others hear a honk less the farther they are, nothing past the radius', () => {
  assert.equal(hearGain(0), 1);
  assert.ok(hearGain(10) > hearGain(20));
  assert.equal(hearGain(HEAR_RADIUS), 0);
  assert.equal(hearGain(HEAR_RADIUS + 5), 0);
});

test('engine pitch rises with speed', () => {
  assert.ok(engineHz(1) > engineHz(0));
  assert.ok(engineHz(0.5, true) < engineHz(0.5));
  assert.equal(engineHz(2), engineHz(1)); // clamped
});

test('sounds stay quiet and running steps come faster', () => {
  assert.ok(STEP_GAP.run < STEP_GAP.walk);
  for (const v of [STEP_VOL.walk, STEP_VOL.run, WIND_MAX, ENGINE_MAX, HORN_VOL, BELL_VOL]) assert.ok(v > 0 && v <= 0.1);
});
