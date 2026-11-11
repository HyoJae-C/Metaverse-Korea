// Reloading while holding something (a perfume, a coffee) with an errand
// running: setHeld() redraws the quest chip early in main.js's startup.
// Everything the chip text reads must exist by then, or the game stops
// loading and the world stays blank (2026-11-11). ROUTE_TIP lives in
// data/starter-quests.js for that reason.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROUTE_TIP, STARTER_TEXT } from '../src/data/starter-quests.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('the route tips are imported, not declared later in main.js', () => {
  assert.ok(!/^const ROUTE_TIP\b/m.test(main));
  for (const key of Object.values(ROUTE_TIP)) assert.ok(STARTER_TEXT[key], key);
});

test('quest chip helpers are function declarations (hoisted)', () => {
  for (const f of ['refreshQuestChip', 'questText', 'questCtx', 'questPlace']) {
    assert.match(main, new RegExp(`^function ${f}\\(`, 'm'), f);
  }
  // The held item is restored before the quest chip's code in the file.
  assert.ok(main.indexOf('if (held) setHeld(held);') < main.indexOf('function questText('));
});
