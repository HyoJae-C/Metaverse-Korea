// Friend requests from several people at once: the card asks about each in
// turn (core/friends.js nextAsk), and every language has its words.
import test from 'node:test';
import assert from 'node:assert/strict';
import { nextAsk } from '../src/core/friends.js';
import { STRINGS } from '../src/i18n/strings.js';

const reqs = [{ uid: 'a', name: 'A' }, { uid: 'b', name: 'B' }, { uid: 'c', name: 'C' }];

test('no requests: no card', () => {
  assert.equal(nextAsk([]), null);
  assert.equal(nextAsk(undefined), null);
});

test('several requests: oldest first, the rest counted', () => {
  assert.deepEqual(nextAsk(reqs), { ask: reqs[0], more: 2 });
});

test('put off or accepted ones step aside for the next', () => {
  assert.deepEqual(nextAsk(reqs, new Set(['a'])), { ask: reqs[1], more: 1 });
  assert.deepEqual(nextAsk(reqs, new Set(['a', 'b'])), { ask: reqs[2], more: 0 });
  assert.equal(nextAsk(reqs, new Set(['a', 'b', 'c'])), null);
});

test('card words in every language', () => {
  for (const [lang, s] of Object.entries(STRINGS)) {
    for (const k of ['friends.ask', 'friends.askMore', 'friends.later']) assert.ok(s[k], `${lang} ${k}`);
    assert.match(s['friends.ask'], /\{name\}/, lang);
    assert.match(s['friends.askMore'], /\{n\}/, lang);
  }
});
