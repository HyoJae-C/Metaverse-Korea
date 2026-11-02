import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKS, bookById } from '../src/core/books.js';

test('ten Korean books, each with readable pages', () => {
  assert.equal(BOOKS.length, 10);
  assert.equal(new Set(BOOKS.map((b) => b.id)).size, 10);
  for (const b of BOOKS) {
    assert.ok(b.title.en && b.title.ko, b.id);
    assert.ok(b.pages.length >= 6, b.id);
    for (const p of b.pages) assert.ok(p.ko && p.rom && p.mean.en, `${b.id}: ${p.ko}`);
  }
  for (const id of ['hangul', 'greetings', 'idioms', 'slang', 'dadjokes']) assert.ok(bookById(id), id);
  assert.equal(bookById('nope'), null);
});
