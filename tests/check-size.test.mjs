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
  assert.ok(BUDGET.start > 0 && BUDGET.game > BUDGET.start && BUDGET.chunk <= BUDGET.game);
});

test('game download: main.js and its static imports, recursively, with CSS', async () => {
  const { staticClosure } = await import('../scripts/check-size.mjs');
  const manifest = {
    'src/main.js': { file: 'assets/main-1.js', imports: ['_three.js', '_shared.js'], dynamicImports: ['src/ui/kimchi-ui.js'], css: ['assets/main.css'] },
    '_three.js': { file: 'assets/three.js' },
    '_shared.js': { file: 'assets/shared.js', imports: ['_three.js'] },
    'src/ui/kimchi-ui.js': { file: 'assets/kimchi-ui.js' },
  };
  assert.deepEqual([...staticClosure(manifest, 'src/main.js')].sort(), ['assets/main-1.js', 'assets/main.css', 'assets/shared.js', 'assets/three.js']);
});
