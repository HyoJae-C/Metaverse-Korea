import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every reward the game names (r: '...') must be in supabase/020_rewards.sql,
// or the server pays nothing for it. 'code' and 'test' are left out on
// purpose: only operators get those.
const sql = readFileSync(new URL('../supabase/020_rewards.sql', import.meta.url), 'utf8');
const rules = new Set([...sql.matchAll(/^\s*\('([a-z]+)',\s*\d+,\s*\d+,\s*\d+,/gm)].map((m) => m[1]));
const OPERATOR_ONLY = new Set(['code', 'test']);

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : [];
  });
}

test('every reward the game pays is known to the server', () => {
  const src = new URL('../src', import.meta.url).pathname;
  const used = new Set();
  for (const f of files(src)) for (const m of readFileSync(f, 'utf8').matchAll(/\br: '([a-z]+)'/g)) used.add(m[1]);
  assert.ok(used.size > 10, 'found the rewards');
  for (const r of used) assert.ok(rules.has(r) || OPERATOR_ONLY.has(r), r);
  for (const r of OPERATOR_ONLY) assert.ok(!rules.has(r), r);
});

test('every wallet earning in the game names its reward', () => {
  const src = new URL('../src', import.meta.url).pathname;
  for (const f of files(src)) {
    if (f.endsWith('core/wallet.js')) continue;
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (!/\ballet\??\.add\(/.test(line)) continue;
      if (/love-locks/.test(f)) continue; // a payment (negative), not an earning
      assert.match(line, /\br: '/, f + ': ' + line.trim());
    }
  }
});
