import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaunaLog, COMBO_WINDOW } from '../src/core/sauna.js';

test('ice room combo only right after the kiln', () => {
  let t = new Date(2026, 10, 2, 10).getTime();
  const log = new SaunaLog(() => new Date(t));
  assert.deepEqual(log.finishIce(), { combo: false });
  log.finishHot();
  t += 30 * 1000;
  assert.deepEqual(log.finishIce(), { combo: true });
  assert.deepEqual(log.finishIce(), { combo: false }); // once per kiln
  log.finishHot();
  t += (COMBO_WINDOW + 1) * 1000;
  assert.equal(log.finishIce().combo, false);
});
