import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inviteLink, refFromSearch, tickMinute, ASK_AFTER_MIN } from '../src/game/share-invite.js';
import { cleanName } from '../src/core/identity.js';
import { STRINGS } from '../src/i18n/strings.js';

test('the invite link carries my name and marks the friend as invited', () => {
  const link = inviteLink('https://moduseoul.com/', '여행자 101');
  assert.equal(link, 'https://moduseoul.com/?ref=%EC%97%AC%ED%96%89%EC%9E%90%20101&src=friend');
  assert.equal(inviteLink('https://moduseoul.com/', '  '), null);
  // ...and the start screen reads the same name back out of it.
  assert.equal(refFromSearch(new URL(link).search, cleanName), '여행자 101');
  assert.equal(refFromSearch('?ref=<b>Mina</b>', cleanName), 'bMinab');
  assert.equal(refFromSearch('', cleanName), '');
});

test('the card is due after 15 minutes in all, and never again once asked', () => {
  let m = 0;
  let due = false;
  for (let i = 0; i < ASK_AFTER_MIN - 1; i++) ({ minutes: m, due } = tickMinute(m, false));
  assert.equal(due, false);
  ({ minutes: m, due } = tickMinute(m, false));
  assert.equal(m, 15);
  assert.equal(due, true);
  assert.deepEqual(tickMinute(45, true), { minutes: 45, due: false });
});

test('the counter and the "asked" mark follow the cloud save, the card loads on demand', () => {
  const src = readFileSync(new URL('../src/game/share-invite.js', import.meta.url), 'utf8');
  assert.match(src, /'mk\.playMin'/);
  assert.match(src, /'mk\.shareAsked'/);
  assert.match(src, /import\('\.\.\/ui\/share-invite-ui\.js'\)/);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /share-invite-ui/);
  assert.match(main, /refFromSearch\(location\.search, cleanName\)/);
});

test('invite text in every language', () => {
  const keys = ['invite.title', 'invite.why', 'invite.message', 'invite.share', 'invite.copy', 'invite.copied', 'invite.later'];
  for (const [lang, s] of Object.entries(STRINGS)) {
    for (const k of keys) assert.ok(s[k], `${lang} ${k}`);
  }
});
