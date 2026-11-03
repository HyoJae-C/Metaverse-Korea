import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UPDATES, updateText, hasNew } from '../src/data/updates.js';

test('every notice has an id, a time and Korean and English text', () => {
  const ids = new Set();
  for (const u of UPDATES) {
    assert.ok(u.id && !ids.has(u.id), 'unique id');
    ids.add(u.id);
    assert.match(u.at, /^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/);
    for (const l of ['ko', 'en']) {
      assert.ok(u.title[l]);
      assert.ok(u.items[l]?.length);
    }
  }
});

test('newest first', () => {
  for (let i = 1; i < UPDATES.length; i++) assert.ok(UPDATES[i - 1].at >= UPDATES[i].at);
});

test('other languages fall back to English', () => {
  const u = { title: { en: 'E', ko: 'K' }, items: { en: ['e'], ko: ['k'] } };
  assert.deepEqual(updateText(u, 'ja'), { title: 'E', items: ['e'] });
  assert.deepEqual(updateText(u, 'ko'), { title: 'K', items: ['k'] });
});

test('new dot until the latest notice is seen', () => {
  assert.equal(hasNew(null), UPDATES.length > 0);
  assert.equal(hasNew(UPDATES[0]?.id), false);
  assert.equal(hasNew('x', []), false);
});
