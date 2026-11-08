import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstLoadFiles, BUDGET } from '../scripts/check-size.mjs';

test('first-load files: entry script, modulepreloads and stylesheet, once each', () => {
  const html = `<script type="module" crossorigin src="./assets/main-a.js"></script>
    <link rel="modulepreload" crossorigin href="./assets/three-b.js">
    <link rel="modulepreload" crossorigin href="./assets/three-b.js">
    <link rel="stylesheet" crossorigin href="./assets/main-c.css">
    <link rel="icon" href="./icon-192.png">`;
  assert.deepEqual(firstLoadFiles(html), ['assets/main-a.js', 'assets/three-b.js', 'assets/main-c.css']);
});

test('budgets are set', () => {
  assert.ok(BUDGET.firstLoad > 0 && BUDGET.chunk > 0 && BUDGET.chunk <= BUDGET.firstLoad);
});
