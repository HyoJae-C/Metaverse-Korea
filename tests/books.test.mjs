import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKS, bookById } from '../src/core/books.js';

test('eleven Korean books, each with readable pages', () => {
  const plain = BOOKS.filter((b) => !b.textbook);
  assert.equal(plain.length, 11);
  assert.equal(new Set(BOOKS.map((b) => b.id)).size, BOOKS.length);
  for (const b of plain) {
    assert.ok(b.title.en && b.title.ko, b.id);
    assert.ok(b.pages.length >= 6, b.id);
    for (const p of b.pages) assert.ok(p.ko && p.rom && p.mean.en, `${b.id}: ${p.ko}`);
  }
  for (const id of ['hangul', 'greetings', 'idioms', 'slang', 'netslang', 'dadjokes']) assert.ok(bookById(id), id);
  assert.equal(bookById('nope'), null);
});

test('TOPIK grammar textbooks: every page image is there, in all three editions', async () => {
  const { existsSync } = await import('node:fs');
  const { EDITIONS, pageUrl, pageCount } = await import('../src/core/books.js');
  const tbs = BOOKS.filter((b) => b.textbook);
  assert.deepEqual(tbs.map((b) => b.id), ['topik1', 'topik2', 'topik3-4', 'topik5-6']);
  for (const b of tbs) {
    for (const e of EDITIONS) {
      for (let i = 0; i < pageCount(b); i++) assert.ok(existsSync('public/' + pageUrl(b, e.id, i)), pageUrl(b, e.id, i));
      assert.ok(!existsSync('public/' + pageUrl(b, e.id, pageCount(b))), b.id + ' has more pages than listed');
    }
  }
  assert.equal(EDITIONS.find((e) => e.id === 'hans').title, '韩语文法教材');
  assert.equal(EDITIONS.find((e) => e.id === 'hant').title, '韓語文法教材');
});
