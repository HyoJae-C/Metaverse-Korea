import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAROT_CARDS, TOPICS, PAIR_POSITIONS, topicById, cardText, cardMark, shuffleDeck, seeded } from '../src/data/tarot.js';
import { TarotQueue, TURN_MS, parseTarot, tarotMsg } from '../src/core/tarot-queue.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));

test('tarot: four kinds of reading, dating and love can be read together', () => {
  assert.deepEqual(TOPICS.map((t) => t.id), ['today', 'dating', 'friend', 'money']);
  assert.deepEqual(TOPICS.filter((t) => t.pairable).map((t) => t.id), ['dating', 'friend']);
  for (const t of TOPICS) {
    assert.equal(t.positions.length, 3);
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(t.name[l] && t.positions.every((p) => p.name[l]));
  }
  assert.equal(PAIR_POSITIONS.length, 3);
  const fool = TAROT_CARDS[0];
  assert.equal(cardText(fool, 'today'), fool.mean);
  assert.equal(cardText(fool, 'dating'), fool.love);
  assert.equal(cardText(fool, 'friend'), fool.mean);
  assert.equal(cardText(fool, 'money'), fool.money);
  assert.equal(topicById('nope').id, 'today');
  assert.equal(cardMark(TAROT_CARDS[21]), 'XXI');
  assert.equal(cardMark(TAROT_CARDS[22]), 'A');
  assert.equal(cardMark(TAROT_CARDS[35]), 'K');
});

test('tarot: the same seed shuffles the same deck on both screens', () => {
  const a = shuffleDeck(seeded(12345)), b = shuffleDeck(seeded(12345));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, shuffleDeck(seeded(54321)));
  assert.deepEqual([...a].sort((x, y) => x - y), TAROT_CARDS.map((c) => c.n));
});

test('tarot messages round-trip and reject anything else', () => {
  assert.deepEqual(parseTarot(tarotMsg('invite', 'abc-1', 'friend')), { verb: 'invite', to: 'abc-1', a: 'friend', b: null });
  assert.deepEqual(parseTarot(tarotMsg('deal', 'abc-1', 'dating', 987654321)), { verb: 'deal', to: 'abc-1', a: 'dating', b: 987654321 });
  assert.deepEqual(parseTarot(tarotMsg('pick', 'x', '7')), { verb: 'pick', to: 'x', a: '7', b: null });
  assert.equal(parseTarot('tarot:steal:x'), null);
  assert.equal(parseTarot('tandem:invite:x'), null);
  assert.equal(parseTarot('tarot:invite:<b>'), null);
});

test('tarot queue: first come first served, ten seconds to sit, then the next one', () => {
  let now = 0;
  const q = new TarotQueue(() => now);
  // Nobody waiting: anyone may sit at a free table.
  let r = q.update([], 1);
  assert.ok(q.maySit('me', r));
  // Two people waiting, no table free: nobody is called.
  const line = [{ id: 'b', tq: 200 }, { id: 'a', tq: 100 }];
  r = q.update(line, 0);
  assert.deepEqual(r.order, ['a', 'b']);
  assert.deepEqual(r.callable, []);
  assert.ok(!q.maySit('me', r), 'someone who did not wait can\'t jump the line');
  // A table frees up: the first in line is called and has ten seconds.
  now = 1000;
  r = q.update(line, 1);
  assert.deepEqual(r.callable, ['a']);
  assert.ok(q.maySit('a', r) && !q.maySit('b', r));
  assert.equal(q.secondsLeft('a'), 10);
  now = 1000 + TURN_MS - 1;
  assert.deepEqual(q.update(line, 1).callable, ['a']);
  // Too slow: their number is cleared and the next one is called.
  now = 1000 + TURN_MS + 1;
  r = q.update(line, 1);
  assert.deepEqual(r.expired, ['a']);
  assert.deepEqual(r.order, ['b']);
  assert.deepEqual(r.callable, ['b']);
  // The old number stays cleared; a new number joins at the back.
  r = q.update([...line, { id: 'c', tq: 300 }], 1);
  assert.deepEqual(r.order, ['b', 'c']);
  r = q.update([{ id: 'b', tq: 200 }, { id: 'a', tq: 400 }], 1);
  assert.deepEqual(r.order, ['b', 'a']);
  // Two tables free: two people are called.
  assert.deepEqual(q.update([{ id: 'b', tq: 200 }, { id: 'a', tq: 400 }], 2).callable, ['b', 'a']);
});

test('tarot cafés: one more in Seongsu and one more in Hongdae, the new ones with two readers', () => {
  const tarot = read('stores.json').stores.filter((s) => s.workshop === 'tarot');
  assert.deepEqual(tarot.map((s) => s.id), ['starlight-tarot', 'moon-rose-tarot', 'lucky-piggy-tarot']);
  const seongsu = ([x, z]) => x >= -260 && x <= 260 && z >= -110 && z <= 410;
  assert.equal(tarot.filter((s) => seongsu(s.at)).length, 1);
  assert.equal(tarot.filter((s) => s.at[0] < -2800).length, 2);
  for (const s of tarot.filter((x) => x.id !== 'starlight-tarot')) {
    assert.equal(s.readers, 2);
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(s.name[l] && s.tagline[l]);
  }
});

test('tarot readings say they are just for fun, with no scientific basis', async () => {
  const src = readFileSync(new URL('../src/ui/tarot-ui.js', import.meta.url), 'utf8');
  assert.match(src, /no scientific basis/);
  assert.match(src, /과학적 근거가 전혀 없어요/);
});

test('tarot summary: about ten lines and a one-word verdict for any three cards', async () => {
  const { readingSummary, readingVerdict, cardKey, SUMMARY_LANGS } = await import('../src/data/tarot-summary.js');
  for (const card of TAROT_CARDS) {
    const k = cardKey(card);
    assert.ok([-1, 0, 1].includes(k.mood), card.name.en);
    for (const l of SUMMARY_LANGS) assert.ok(k.key[l] && !k.key[l].includes('{'), card.name.en + ' ' + l);
  }
  const rand = seeded(7);
  for (let i = 0; i < 200; i++) {
    const cards = shuffleDeck(rand).slice(0, 3);
    for (const topic of ['today', 'dating', 'friend', 'money']) {
      for (const pair of [null, { a: 'Mina', b: 'Leo' }]) {
        const lines = readingSummary(cards, topic, pair);
        assert.ok(lines.length >= 9 && lines.length <= 10, String(lines.length));
        const v = readingVerdict(cards, topic, pair);
        for (const line of [...lines, v.label, v.word]) for (const l of SUMMARY_LANGS) assert.ok(line[l] && !/[{}]|undefined/.test(line[l]), line.en);
        if (pair) assert.ok(lines.some((x) => x.en.includes('Mina')) && lines.some((x) => x.en.includes('Leo')));
      }
    }
  }
  // Both screens of a reading together get the same words.
  assert.deepEqual(readingVerdict([0, 6, 19], 'friend', { a: 'A', b: 'B' }), readingVerdict([0, 6, 19], 'friend', { a: 'A', b: 'B' }));
  assert.match(readingVerdict([6, 19, 21], 'dating', { a: 'A', b: 'B' }).label.ko, /궁합/);
  assert.match(readingVerdict([6, 19, 21], 'friend').label.ko, /우정/);
  assert.match(readingVerdict([6, 19, 21], 'friend').word.ko, /사이/);
});
