// Emotes swapped inside some rooms (data/emotes.js ROOM_EMOTES): inside
// Myeongdong Cathedral, crying, anger and laughing become a book, praying
// hands and a dove; everywhere else the basics stay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMOTE_PACKS, ROOM_EMOTES, emoteIn, getEmote } from '../src/data/emotes.js';

const basic = Object.fromEntries(EMOTE_PACKS[0].emotes.map((e) => [e.id, e]));

test('inside the cathedral: a book, praying hands and a dove instead of crying, anger and laughing', () => {
  assert.equal(emoteIn('cathedral', basic.cry).emoji, '📖');
  assert.equal(emoteIn('cathedral', basic.angry).emoji, '🙏');
  assert.equal(emoteIn('cathedral', basic.laugh).emoji, '🕊️');
  assert.equal(emoteIn('cathedral', basic.wave), basic.wave, 'the rest stay');
  for (const e of Object.values(basic)) assert.equal(emoteIn(null, e), e, 'outside nothing changes');
  const store = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores.find((s) => s.id === 'myeongdong-cathedral');
  assert.ok(ROOM_EMOTES[store.workshop], 'keyed by the cathedral room');
});

test('swapped emotes have their own ids, known to everyone who sees them', () => {
  const ids = new Set(Object.keys(basic));
  for (const swaps of Object.values(ROOM_EMOTES)) for (const [slot, e] of Object.entries(swaps)) {
    if (slot === '*') { assert.equal(e, null, '"*" only hides the other slots'); continue; }
    assert.ok(basic[slot], `${slot} is a basic emote`);
    assert.ok(!ids.has(e.id), `${e.id} is a new id`);
    ids.add(e.id);
    assert.equal(getEmote(e.id).emoji, e.emoji);
  }
});

test('the silent dharma hall: only the praying hands (Yozi 2026-11-15)', () => {
  const shown = Object.keys(basic).map((id) => emoteIn('dharmahall', basic[id])).filter(Boolean);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].emoji, '🙏');
  assert.equal(emoteIn(null, basic.wave), basic.wave, 'outside, nothing changes');
});
