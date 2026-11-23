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

// Phones (Yozi, 2026-11-21): 30 while standing still, a slow phone stays at 30.
const fakeGfx = (opts = {}) => {
  let ratio = 1;
  const renderer = { getPixelRatio: () => ratio, setPixelRatio: (r) => { ratio = r; } };
  const sun = { castShadow: false, shadow: { mapSize: { x: 2048, set(a) { this.x = a; } }, map: null } };
  return createGraphicsQuality({ renderer, sun, capable: false, dpr: () => 3, ...opts });
};
// Runs a 60 Hz screen from t0 for ms; each frame takes `cost` ms to draw.
const run = (gfx, t0, ms, { cost = 0, onFrame } = {}) => {
  let n = 0, busy = 0;
  for (let t = t0; t < t0 + ms; t += 1000 / 60) {
    if (t < busy) continue; // (still drawing the last frame: this tick is missed)
    onFrame?.(t);
    if (gfx.frame(t)) { n++; busy = t + cost; }
  }
  return (n * 1000) / ms;
};

test('a phone draws 30 a second standing still, 60 as soon as it is touched or the view moves', () => {
  const gfx = fakeGfx({ phone: true });
  gfx.active(0);
  assert.ok(run(gfx, 0, 1500) > 58, 'touched just now: 60');
  const still = run(gfx, 3000, 5000);
  assert.ok(still > 28 && still < 31, 'hands off for 2 s: ' + still);
  gfx.active(8000);
  assert.ok(run(gfx, 8000, 1500) > 58, 'touched again: 60');
  const m = new Array(16).fill(0);
  const walking = run(gfx, 12000, 5000, { onFrame: (t) => { m[12] = t / 1000; gfx.watch(m, t); } });
  assert.ok(walking > 58, 'the camera moving: 60 (' + walking + ')');
});

test('a show in the sky keeps 60 while standing still', () => {
  const gfx = fakeGfx({ phone: true });
  gfx.setStill(false);
  assert.ok(run(gfx, 5000, 5000) > 58);
});

test('computers never drop to 30 for standing still', () => {
  const gfx = fakeGfx({ phone: false });
  assert.ok(run(gfx, 5000, 5000) > 58);
});

test('a phone that cannot keep up settles at a steady 30; a quick one does not', () => {
  const slow = fakeGfx({ phone: true });
  const keepBusy = { onFrame: (t) => slow.active(t), cost: 22 }; // (~40 fps while walking)
  run(slow, 0, 9000, keepBusy);
  assert.equal(slow.state().slow, false, 'not in the first 10 s');
  run(slow, 9000, 12000, keepBusy);
  assert.equal(slow.state().slow, true);
  assert.equal(slow.state().fps, 30);
  const fast = fakeGfx({ phone: true });
  run(fast, 0, 30000, { onFrame: (t) => fast.active(t), cost: 8 });
  assert.equal(fast.state().slow, false);
});

test('standing-still stretches at 30 do not count as a slow phone', () => {
  const gfx = fakeGfx({ phone: true });
  run(gfx, 0, 60000); // never touched: 30 the whole minute
  assert.equal(gfx.state().slow, false);
});
