import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextShow, showNoticeText } from '../src/core/show-notice.js';
import { showStarts, FIREWORKS, DRONES, CYCLE_MS } from '../src/core/show-clock.js';

const t = (k, v = {}) => k + JSON.stringify(v);
const clock = () => '21:30';

test('the pinned show notice names the show on now, or the soonest one', () => {
  const now = Date.UTC(2026, 10, 10, 18);
  const fw = showStarts(now, FIREWORKS).find((s) => s > now);
  const dr = showStarts(now, DRONES).find((s) => s > now);
  const first = Math.min(fw, dr);
  assert.deepEqual(nextShow(now), { kind: first === fw ? 'fireworks' : 'drones', start: first, on: false });
  // Five minutes into the fireworks: on now, 15 minutes left.
  const on = nextShow(fw + 5 * 60e3);
  assert.deepEqual(on, { kind: 'fireworks', start: fw, on: true });
  assert.equal(showNoticeText(on, fw + 5 * 60e3, t, clock).text, 'show.now{"m":15}');
  // Right after it ends, the next one is the drone show, a whole game day later.
  const after = nextShow(fw + 21 * 60e3);
  assert.equal(after.kind, 'drones');
  assert.equal(after.start, fw + CYCLE_MS);
});

test('the countdown reads minutes, or hours and minutes, with the local time', () => {
  const start = 10 * 3600e3;
  const s = { kind: 'drones', start, on: false };
  assert.deepEqual(showNoticeText(s, start - 9.5 * 60e3, t, clock), { label: 'show.drones{}', text: 'show.inM{"m":10,"at":"21:30"}' });
  assert.equal(showNoticeText(s, start - 125 * 60e3, t, clock).text, 'show.inHM{"h":2,"m":5,"at":"21:30"}');
});
