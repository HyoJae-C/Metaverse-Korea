// The frame cap and the automatic quality steps (core/graphics-quality.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { FramePacer, AutoQuality, createGraphicsQuality, QUALITY } from '../src/core/graphics-quality.js';

const drawn = (hz, fps, seconds = 10) => {
  const p = new FramePacer(fps);
  let n = 0;
  for (let t = 0; t < seconds * 1000; t += 1000 / hz) if (p.ready(t)) n++;
  return n / seconds;
};

test('screens faster than 60 Hz get about 60 frames a second, 60 Hz screens all of theirs', () => {
  for (const hz of [120, 144, 165, 240]) {
    const fps = drawn(hz, 60);
    assert.ok(fps > 55 && fps <= 61, `${hz} Hz → ${fps}`);
  }
  assert.ok(drawn(60, 60) > 59.5);
  assert.ok(drawn(59.94, 60) > 59);
});

test('Battery saver: about 30 frames a second', () => {
  for (const hz of [60, 144]) {
    const fps = drawn(hz, 30);
    assert.ok(fps > 28 && fps <= 31, `${hz} Hz → ${fps}`);
  }
});

test('the quality steps down after the frame rate stays low, not for a short stall', () => {
  const a = new AutoQuality();
  for (let t = 0; t < 30000; t += 1000 / 60) a.frame(1000 / 60, 60);
  assert.equal(a.level, 0); // smooth: stays
  for (let i = 0; i < 20; i++) a.frame(200, 60); // a warp: a few slow frames
  for (let t = 0; t < 5000; t += 1000 / 60) a.frame(1000 / 60, 60);
  assert.equal(a.level, 0);
  let changed = 0;
  for (let t = 0; t < 9000; t += 40) changed += a.frame(40, 60); // 25 fps for 9 s
  assert.equal(a.level, 1);
  assert.equal(changed, 1);
  for (let t = 0; t < 60000; t += 40) a.frame(40, 60);
  assert.equal(a.level, QUALITY.length - 1); // and no further than the last step
});

test('nothing changes in the first seconds while the city loads', () => {
  const a = new AutoQuality();
  for (let t = 0; t < 9000; t += 50) a.frame(50, 60);
  assert.equal(a.level, 0);
});

test('levels and Battery saver set the resolution and shadows', () => {
  let ratio = 2;
  const renderer = { getPixelRatio: () => ratio, setPixelRatio: (r) => { ratio = r; } };
  const sun = { castShadow: true, shadow: { mapSize: { x: 2048, set(a) { this.x = a; } }, map: null } };
  const gfx = createGraphicsQuality({ renderer, sun, dpr: () => 2 });
  assert.deepEqual([ratio, sun.castShadow, sun.shadow.mapSize.x], [2, true, 2048]);
  gfx.setSaver(true);
  assert.deepEqual([ratio, sun.castShadow, gfx.state().fps], [1, false, 30]);
  gfx.setSaver(false);
  assert.deepEqual([ratio, sun.castShadow, gfx.state().fps], [2, true, 60]);
  const phone = createGraphicsQuality({ renderer, sun, capable: false, dpr: () => 3 });
  assert.deepEqual([ratio, sun.castShadow], [1, false]);
  assert.equal(phone.state().level, 0);
});
