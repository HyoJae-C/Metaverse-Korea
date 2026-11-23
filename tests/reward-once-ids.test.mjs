import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { onceId } from '../src/core/wallet.js';
import { STAMPS } from '../src/data/stamps.js';
import { TRAILS } from '../src/data/trails.js';

// Stamps and courses pay once each, and the server pays only the op ids it
// keeps in reward_once_ids (075_real_stamps_only.sql): a made-up id gets
// nothing (Yozi 2026-11-24). A new stamp or course needs its row there, or
// the server pays nothing for it.
const dir = new URL('../supabase/', import.meta.url).pathname;
const sqlFiles = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const sqlOf = (f) => readFileSync(join(dir, f), 'utf8');
const kept = new Map();
for (const f of sqlFiles) {
  for (const m of sqlOf(f).matchAll(/\('([a-z]+)', '([a-z0-9-]+)', '([0-9a-f-]{36})'\)/g)) kept.set(m[3], m[1]);
}

test('every stamp and course the game pays is on the server list', () => {
  const want = [...STAMPS.map((s) => ['stamp', s.id]), ...TRAILS.map((t) => ['trail', t.id])];
  for (const [r, id] of want) {
    const op = onceId(r + ':' + id);
    assert.equal(kept.get(op), r, `add to a new supabase file: insert into public.reward_once_ids (r, what, op_id) values ('${r}', '${id}', '${op}');`);
  }
});

test('the newest wallet_apply still checks the list', () => {
  const last = sqlFiles.filter((f) => /create or replace function public\.wallet_apply\b/.test(sqlOf(f))).pop();
  const body = sqlOf(last).split(/create or replace function public\.wallet_apply\b/).pop().split(/\nend \$\$;/)[0];
  assert.match(body, /from public\.reward_once_ids o where o\.r = v_r and o\.op_id = v_id/, last);
});
