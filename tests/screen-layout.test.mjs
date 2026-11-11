import test from 'node:test';
import assert from 'node:assert/strict';
import { placeOnScreen } from '../src/game/screen-layout.js';

test('a joystick put somewhere stays fully on screen when the screen turns or shrinks', () => {
  assert.deepEqual(placeOnScreen({ x: 0.5, y: 0.5 }, 400, 800), { x: 200, y: 400 });
  // Put at the far right bottom of a tall phone, then the phone turns sideways.
  const p = placeOnScreen({ x: 0.99, y: 0.99 }, 800, 400);
  assert.ok(p.x <= 800 - 62 && p.y <= 400 - 62);
  const q = placeOnScreen({ x: 0, y: 0 }, 400, 800);
  assert.deepEqual(q, { x: 62, y: 62 });
});
