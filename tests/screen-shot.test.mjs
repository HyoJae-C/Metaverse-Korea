import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shotName } from '../src/game/screen-shot.js';

test('screenshot file name has the date and time', () => {
  assert.equal(shotName(new Date(2026, 10, 11, 9, 5, 7)), 'modu-seoul-20261111-090507.jpg');
});

test('the screenshot button loads after the street, not in the first download', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /import\('\.\/game\/screen-shot\.js'\)/);
  assert.doesNotMatch(main, /^import [^\n]*screen-shot/m);
});
