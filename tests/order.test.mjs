import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkOrder, blocksFor, repeatBack, sentenceFor } from '../src/core/order-game.js';
import { MENUS, BLOCKS, LINES, ANSWERS } from '../src/data/order-missions.js';

const m = MENUS.bunsik[0]; // tteokbokki, 1 serving, mild

test('a correct order passes in any word order, ending with 주세요', () => {
  assert.equal(checkOrder(m, ['tteokbokki', 'oneServing', 'mild', 'please']).ok, true);
  assert.equal(checkOrder(m, ['mild', 'tteokbokki', 'oneServing', 'please']).ok, true);
});

test('a missing ending, missing word or extra word fails with a reason', () => {
  const noEnd = checkOrder(m, ['tteokbokki', 'oneServing', 'mild']);
  assert.equal(noEnd.ok, false);
  assert.equal(noEnd.noEnding, true);
  assert.equal(checkOrder(m, ['please', 'tteokbokki', 'oneServing', 'mild']).noEnding, true);
  assert.deepEqual(checkOrder(m, ['tteokbokki', 'oneServing', 'please']).missing, ['mild']);
  assert.deepEqual(checkOrder(m, ['tteokbokki', 'oneServing', 'mild', 'extraSpicy', 'please']).extra, ['extraSpicy']);
  assert.deepEqual(checkOrder(m, ['tteokbokki', 'tteokbokki', 'oneServing', 'mild', 'please']).extra, ['tteokbokki']);
});

test('blocks offered contain every needed word and the ending', () => {
  for (const mission of MENUS.bunsik) {
    const ids = blocksFor(mission);
    for (const id of [...mission.need, 'please']) assert.ok(ids.includes(id), `${mission.id} offers ${id}`);
    for (const id of ids) assert.ok(BLOCKS[id], `block ${id} exists`);
    assert.ok(LINES[mission.ask], `${mission.id} question exists`);
    for (const a of mission.options) assert.ok(ANSWERS[a], `answer ${a} exists`);
    assert.ok(mission.options.includes(mission.answer));
  }
});

test('every block and line has a meaning in each UI language', () => {
  for (const [id, b] of Object.entries(BLOCKS)) for (const l of ['ko', 'rom', 'en', 'ja', 'zh']) assert.ok(b[l], `${id}.${l}`);
  for (const [id, [ko, rom, tr]] of Object.entries({ ...LINES, ...ANSWERS })) {
    assert.ok(ko && rom, id);
    for (const l of ['en', 'ja', 'zh']) assert.ok(tr[l], `${id}.${l}`);
  }
  for (const mission of MENUS.bunsik) for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(mission.title[l], `${mission.id}.${l}`);
});

test('the clerk repeats the order back, and the practice sentence is complete', () => {
  assert.deepEqual(repeatBack(['tteokbokki', 'oneServing', 'mild', 'please']), { ko: '떡볶이 1인분 안 맵게요?', rom: 'tteokbokki il-inbun an maepgeyo?' });
  assert.equal(repeatBack(['please']), null);
  assert.equal(sentenceFor(m).ko, '떡볶이 1인분 안 맵게 주세요');
});
