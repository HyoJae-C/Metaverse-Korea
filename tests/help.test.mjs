// The game guide (❓): every language's book has the same topics as the
// English one, and the button stays out of the first download.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { HELP as EN } from '../src/help/en.js';

const files = readdirSync(new URL('../src/help/', import.meta.url)).filter((f) => f.endsWith('.js'));

test('every guide language matches the English topics and line counts', async () => {
  assert.ok(files.length >= 4, 'en, ko, ja, zh at least');
  for (const f of files) {
    const { HELP } = await import(`../src/help/${f}`);
    assert.ok(HELP.title && HELP.intro, f);
    assert.equal(HELP.sections.length, EN.sections.length, f);
    HELP.sections.forEach((s, i) => {
      const e = EN.sections[i];
      assert.equal(s.icon, e.icon, `${f} section ${i}`);
      assert.ok(s.title, `${f} section ${i} title`);
      assert.equal(s.lines.length, e.lines.length, `${f} ${e.title}`);
      for (const l of s.lines) assert.ok(typeof l === 'string' && l.trim().length > 5, `${f} ${e.title}`);
    });
  }
});

test('the guide file list in help-book.js matches src/help', () => {
  const src = readFileSync(new URL('../src/game/help-book.js', import.meta.url), 'utf8');
  const langs = JSON.parse(src.match(/HELP_LANGS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  assert.deepEqual([...langs].sort(), files.map((f) => f.replace('.js', '')).sort());
});

test('the guide text and panel load only when ❓ is tapped', () => {
  const book = readFileSync(new URL('../src/game/help-book.js', import.meta.url), 'utf8');
  assert.doesNotMatch(book, /^import .*help\/|^import .*help-ui/m);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /from '\.\/help\/|from '\.\/ui\/help-ui/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="help-btn"/);
  assert.match(html, /id="help-panel"/);
});
