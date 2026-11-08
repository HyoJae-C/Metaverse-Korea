// Download budget for the first visit. Run after `npm run build`:
//   node scripts/check-size.mjs
//
// It adds up everything index.html makes the browser fetch before the game can
// start (the entry script, every modulepreload and the stylesheet), gzipped as
// a server would send it, and fails when that passes the budget. New features
// should load with import() when they are first used, so this number stays
// flat while the game grows. See docs/PERFORMANCE.md.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

// Budgets in KB (gzipped). Raise one only on purpose, in its own commit, and
// say why in the message.
export const BUDGET = {
  firstLoad: 1400, // was 1,324 KB on 2026-11-09
  chunk: 1000, // any single script (the main bundle was about 930 KB)
};

const KB = (n) => Math.round(n / 1024);

export function firstLoadFiles(html) {
  const files = new Set();
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)) files.add(m[1]);
  return [...files];
}

export function measure(dist = 'dist') {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  return firstLoadFiles(html).map((f) => {
    const buf = readFileSync(join(dist, f));
    return { file: f, raw: buf.length, gz: gzipSync(buf, { level: 9 }).length };
  }).sort((a, b) => b.gz - a.gz);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync('dist/index.html')) { console.error('Run `npm run build` first.'); process.exit(1); }
  const rows = measure();
  const total = rows.reduce((s, r) => s + r.gz, 0);
  console.log('First visit download (gzipped):');
  for (const r of rows) console.log(`  ${String(KB(r.gz)).padStart(5)} KB  (${KB(r.raw)} KB raw)  ${r.file}`);
  console.log(`  ${String(KB(total)).padStart(5)} KB  total, budget ${BUDGET.firstLoad} KB`);
  const problems = [];
  if (KB(total) > BUDGET.firstLoad) problems.push(`first load is ${KB(total)} KB, over the ${BUDGET.firstLoad} KB budget`);
  for (const r of rows) if (KB(r.gz) > BUDGET.chunk) problems.push(`${r.file} is ${KB(r.gz)} KB, over the ${BUDGET.chunk} KB per-script budget`);
  if (problems.length) {
    console.error('\nOver budget:\n  ' + problems.join('\n  '));
    console.error('\nLoad the new feature with import() when it is first used instead of a static import. See docs/PERFORMANCE.md.');
    process.exit(1);
  }
}
