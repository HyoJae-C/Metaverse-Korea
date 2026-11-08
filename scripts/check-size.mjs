// Download budget for the first visit. Run after `npm run build`:
//   node scripts/check-size.mjs
//
// Two numbers, gzipped as a server sends them:
//   - start screen: what index.html makes the browser fetch before the
//     language step shows (src/boot.js and what it imports, plus the CSS);
//   - game: that plus src/main.js and everything it imports statically,
//     i.e. what must arrive before "Next" works.
// New features should load with import() when first used, so both stay flat
// while the game grows. See docs/PERFORMANCE.md.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

// Budgets in KB (gzipped). Raise one only on purpose, in its own commit, and
// say why in the message.
export const BUDGET = {
  start: 80, // ~50 KB on 2026-11-09 (the whole 1.3 MB before boot.js)
  game: 1150, // 1,098 KB on 2026-11-09 (1,324 before languages and panels loaded on demand)
  chunk: 1000, // any single script (main.js's chunk was about 850 KB)
};

const KB = (n) => Math.round(n / 1024);

export function firstLoadFiles(html) {
  const files = new Set();
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)) files.add(m[1]);
  return [...files];
}

// Files a manifest entry needs before it runs: itself, its static imports
// (recursively) and their CSS.
export function staticClosure(manifest, key, out = new Set()) {
  const e = manifest[key];
  if (!e || out.has(e.file)) return out;
  out.add(e.file);
  for (const c of e.css || []) out.add(c);
  for (const k of e.imports || []) staticClosure(manifest, k, out);
  return out;
}

function sizes(dist, files) {
  return [...files].map((f) => {
    const buf = readFileSync(join(dist, f));
    return { file: f, raw: buf.length, gz: gzipSync(buf, { level: 9 }).length };
  }).sort((a, b) => b.gz - a.gz);
}

export function measure(dist = 'dist') {
  const start = new Set(firstLoadFiles(readFileSync(join(dist, 'index.html'), 'utf8')));
  const game = new Set(start);
  const mf = join(dist, '.vite', 'manifest.json');
  if (existsSync(mf)) staticClosure(JSON.parse(readFileSync(mf, 'utf8')), 'src/main.js', game);
  return { start: sizes(dist, start), game: sizes(dist, game) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync('dist/index.html')) { console.error('Run `npm run build` first.'); process.exit(1); }
  const { start, game } = measure();
  const total = (rows) => rows.reduce((s, r) => s + r.gz, 0);
  const show = (title, rows, budget) => {
    console.log(`${title} (gzipped):`);
    for (const r of rows.slice(0, 12)) console.log(`  ${String(KB(r.gz)).padStart(5)} KB  (${KB(r.raw)} KB raw)  ${r.file}`);
    if (rows.length > 12) console.log(`        … and ${rows.length - 12} more`);
    console.log(`  ${String(KB(total(rows))).padStart(5)} KB  total, budget ${budget} KB\n`);
  };
  show('Start screen', start, BUDGET.start);
  show('Game (before "Next" works)', game, BUDGET.game);
  const problems = [];
  if (KB(total(start)) > BUDGET.start) problems.push(`start screen is ${KB(total(start))} KB, over the ${BUDGET.start} KB budget`);
  if (KB(total(game)) > BUDGET.game) problems.push(`game download is ${KB(total(game))} KB, over the ${BUDGET.game} KB budget`);
  for (const r of game) if (KB(r.gz) > BUDGET.chunk) problems.push(`${r.file} is ${KB(r.gz)} KB, over the ${BUDGET.chunk} KB per-script budget`);
  if (problems.length) {
    console.error('Over budget:\n  ' + problems.join('\n  '));
    console.error('\nLoad the new feature with import() when it is first used instead of a static import. See docs/PERFORMANCE.md.');
    process.exit(1);
  }
}
