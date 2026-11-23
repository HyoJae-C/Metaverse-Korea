import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every reward the game names (r: '...') must be in reward_rules (020_rewards.sql
// and the files after it), or the server pays nothing for it. 'code' and
// 'test' are left out on purpose: only operators get those.
const dir = new URL('../supabase/', import.meta.url).pathname;
const sqlFiles = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const sqlOf = (f) => readFileSync(join(dir, f), 'utf8');
const rules = new Set(sqlFiles.filter((f) => /insert into public\.reward_rules/.test(sqlOf(f)))
  .flatMap((f) => [...sqlOf(f).matchAll(/^\s*\('([a-z]+)',\s*\d+,\s*\d+,\s*\d+,/gm)].map((m) => m[1])));
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

// 036_gift_receipts.sql once wrote wallet_apply again from an older copy and
// the per-reward check was lost until 069 (found 2026-11-22).
test('the newest wallet_apply still pays each reward only up to its own limits', () => {
  const last = sqlFiles.filter((f) => /create or replace function public\.wallet_apply\b/.test(sqlOf(f))).pop();
  const body = sqlOf(last).split(/create or replace function public\.wallet_apply\b/).pop().split(/\nend \$\$;/)[0];
  assert.match(body, /from public\.reward_rules where r = v_r/, last);
  assert.match(body, /v_rule\.day_n/, last);
  assert.match(body, /insert into public\.coin_ledger \([^)]*\br\)/, last + ': the ledger keeps the reward');
});

test('cooking together: each person once a day, up to 5', () => {
  const sql = sqlOf(sqlFiles.filter((f) => /\('cook',/.test(sqlOf(f))).pop());
  assert.match(sql, /\('cook',\s*6000,\s*30000,\s*5,/);
});
