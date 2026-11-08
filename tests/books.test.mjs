import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKS, bookById } from '../src/core/books.js';

test('eleven Korean books, each with readable pages', () => {
  const plain = BOOKS.filter((b) => !b.textbook && !b.lit);
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

test('library stories and poems: built from the sources, every page in Korean and English, with source and copyright', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { parseBook } = await import('../scripts/build-library.mjs');
  const { LIBRARY } = await import('../src/data/library-shelf.js');
  const { LIT_KINDS, pageCount } = await import('../src/core/books.js');
  const files = readdirSync('scripts/library').filter((f) => f.endsWith('.txt'));
  assert.equal(LIBRARY.length, files.length, 'run node scripts/build-library.mjs');
  for (const f of files) {
    const src = parseBook(readFileSync('scripts/library/' + f, 'utf8'), f);
    const built = JSON.parse(readFileSync(`public/library/${src.id}.json`, 'utf8'));
    assert.deepEqual(built, src, `${f} changed: run node scripts/build-library.mjs`);
    const shelf = LIBRARY.find((b) => b.id === src.id);
    assert.equal(shelf.pages, src.pages.length, src.id);
    assert.ok(LIT_KINDS.includes(src.kind), src.id);
    assert.ok(src.title.en && src.title.ko && src.author.en && src.author.ko && src.about.en, src.id);
    assert.match(src.source, /wikisource\.org|folk tales/, src.id);
    assert.match(src.license, /Public domain|belong to everyone/, src.id);
    assert.match(src.license, /CC0/, src.id + ': say the translation is free to use');
    for (const [i, p] of src.pages.entries()) {
      assert.ok(p.ko.length > 10 && p.en.length > 10, `${src.id} page ${i + 1}`);
      assert.match(p.ko, /[가-힣]/, `${src.id} page ${i + 1} Korean`);
      assert.doesNotMatch(p.en, /[가-힣]/, `${src.id} page ${i + 1} English has Hangul`);
    }
    const b = bookById(src.id);
    assert.ok(b && b.lit && pageCount(b) === src.pages.length, src.id + ' on the shelf');
  }
  for (const k of LIT_KINDS) assert.ok(LIBRARY.some((b) => b.kind === k), 'a book of kind ' + k);
});

test('parseBook rejects a page without a translation', async () => {
  const { parseBook } = await import('../scripts/build-library.mjs');
  const head = '@id x\n@kind story\n@icon 📖\n@color #000\n@title.en X\n@title.ko 엑스\n@author.en A\n@author.ko 에이\n@about.en a\n@source s\n@license l\n';
  assert.throws(() => parseBook(head + '===\n한국어만 있어요\n'), /---/);
  assert.equal(parseBook(head + '===\n# 제목 | Title\n본문입니다\n---\nBody text\n').pages[0].heading.en, 'Title');
});
