import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';

// The SQL files run in name order on a new database, so each number (with
// its letter: 030, 030b) is used once. Two 061 files once sat side by side.
test('supabase/ SQL files: one file per number', () => {
  const files = readdirSync(new URL('../supabase/', import.meta.url)).filter((f) => f.endsWith('.sql'));
  const seen = new Map();
  for (const f of files) {
    const m = /^(\d{3}[a-z]?)_[a-z0-9_]+\.sql$/.exec(f);
    assert.ok(m, `${f}: name is NNN_words.sql (or NNNb_…)`);
    assert.ok(!seen.has(m[1]), `${f} and ${seen.get(m[1])} share the number ${m[1]}`);
    seen.set(m[1], f);
  }
});
