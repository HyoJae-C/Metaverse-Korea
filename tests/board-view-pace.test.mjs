// The board games' own small 3D pictures on phones (ui/board-view-pace.js)
// and the cards' two-part shape (ui/board-thief-3d.js cardGeometry).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewPace, STILL_AFTER } from '../src/ui/board-view-pace.js';
import { cardGeometry } from '../src/ui/board-thief-3d.js';

const count = (pace, t0, ms, onFrame) => { let n = 0; for (let t = t0; t < t0 + ms; t += 1000 / 120) { onFrame?.(t); if (pace.ready(t)) n++; } return (n * 1000) / ms; };

test('phones: 30 frames on a 120 Hz screen, resolution 1.5 at most, no smoothing; computers 60 at 2', () => {
  const phone = createViewPace({ phone: true, dpr: () => 3 });
  const fps = count(phone, 0, 4000);
  assert.ok(fps > 28 && fps < 31, 'phone ' + fps);
  assert.equal(phone.ratio(), 1.5);
  assert.equal(phone.smooth, false);
  const pc = createViewPace({ phone: false, dpr: () => 3 });
  const pcFps = count(pc, 0, 4000);
  assert.ok(pcFps > 58 && pcFps < 61, 'computer ' + pcFps);
  assert.equal(pc.ratio(), 2);
});

test('a still picture is not drawn again until something changes or moves', () => {
  const pace = createViewPace({ phone: true, idle: true });
  pace.wake(0);
  assert.ok(count(pace, 0, STILL_AFTER) > 28, 'just changed');
  assert.equal(count(pace, STILL_AFTER + 100, 5000), 0, 'nothing moving');
  pace.wake(8000);
  assert.ok(count(pace, 8000, 1000) > 28, 'woken');
  pace.moving = true;
  assert.ok(count(pace, 12000, 3000) > 28, 'a face bobbing keeps it drawn');
});

test('a card is two draws: the back on the +z face, the rest in one', () => {
  const g = cardGeometry();
  assert.equal(g.groups.length, 2);
  assert.deepEqual(g.groups.map((x) => [x.count, x.materialIndex]), [[30, 0], [6, 1]]);
  const pos = g.attributes.position, idx = g.index;
  for (let i = 30; i < 36; i++) assert.ok(pos.getZ(idx.getX(i)) > 0, 'the back faces +z');
});
