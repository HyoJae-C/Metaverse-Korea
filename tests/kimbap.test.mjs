import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEPS, RICE, riceScore, riceNote, FILLINGS, CLASSIC, MIN_FILL, MAX_FILL, fillScore, fillNote, rollName,
  gimScore, ROWS, COLS, spreadScore, rollScore, rollWord, finishScore, sliceScore, totalScore, WORDS,
} from '../src/core/kimbap-game.js';
import { medalFor } from '../src/core/grill-game.js';
import { BT, KIMBAP_LINES } from '../src/ui/kimbap-text.js';

const LANGS = ['en', 'ko', 'ja', 'zh', 'es', 'id', 'vi', 'hi', 'ar'];
const pref = Object.fromEntries(FILLINGS.map((f) => [f.id, f.pref]));
const goodRice = { salt: 1, sesameoil: 1, sesame: 1 };
const fullSheet = () => { const c = []; for (let r = 0; r < ROWS - 1; r++) for (let k = 0; k < COLS; k++) c.push(`${r},${k}`); return c; };

test('rice: salt and sesame oil, not sushi vinegar', () => {
  assert.equal(riceScore(goodRice), 100);
  assert.equal(riceNote(goodRice), 'good');
  assert.ok(riceScore({ ...goodRice, vinegar: 2, sugar: 2 }) < 50);
  assert.equal(riceNote({ ...goodRice, vinegar: 1 }), 'sushi');
  assert.equal(riceNote({ sesameoil: 1 }), 'bland');
  assert.equal(riceNote({ salt: 3 }), 'salty');
});

test('hidden preference: classics high, polarizing low, clashing lowest', () => {
  for (const id of ['cucumber', 'fishcake', 'danmuji', 'carrot', 'egg', 'spinach']) assert.ok(pref[id] >= 90, id);
  for (const id of ['mala', 'cilantro']) assert.ok(pref[id] >= 25 && pref[id] <= 40, id);
  for (const id of ['ketchup', 'choco', 'chips', 'gummy']) assert.ok(pref[id] <= 15, id);
  assert.ok(CLASSIC.length >= MIN_FILL && CLASSIC.length <= MAX_FILL);
});

test('fillings: free choice, but many odd ones score low', () => {
  assert.ok(fillScore(CLASSIC) >= 90);
  assert.equal(fillNote(CLASSIC), 'classic');
  assert.ok(fillScore(['cucumber', 'fishcake', 'danmuji', 'carrot', 'tuna']) >= 90);
  assert.equal(fillNote(['cucumber', 'cheese', 'danmuji', 'tuna', 'kimchi']), 'tasty');
  const bold = ['danmuji', 'egg', 'carrot', 'spinach', 'mala'];
  assert.equal(fillNote(bold), 'bold');
  assert.ok(fillScore(bold) < fillScore(CLASSIC));
  const odd = ['ketchup', 'choco', 'chips', 'gummy', 'danmuji'];
  assert.equal(fillNote(odd), 'wild');
  assert.ok(fillScore(odd) < 30);
  // The more odd fillings go in, the lower the score.
  const base = ['danmuji', 'egg', 'carrot', 'spinach', 'fishcake'];
  let last = fillScore(base);
  for (let n = 1; n <= 3; n++) {
    const s = fillScore([...base, ...['ketchup', 'choco', 'gummy'].slice(0, n)]);
    assert.ok(s < last, `${n} odd`);
    last = s;
  }
  // A thin roll loses a little.
  assert.ok(fillScore(['danmuji', 'egg', 'carrot']) < fillScore(['danmuji', 'egg', 'carrot', 'spinach', 'ham']));
  assert.equal(fillScore([]), 0);
  assert.deepEqual(rollName(['choco', 'egg', 'cheese']), ['egg', 'cheese']);
});

test('gim, spread, roll, finish and slice', () => {
  assert.equal(gimScore(true), 100);
  assert.ok(gimScore(false) < 100);
  assert.equal(spreadScore(fullSheet()), 100);
  assert.equal(spreadScore([...fullSheet(), '3,0', '3,1']), 70);
  assert.equal(spreadScore([]), 0);
  assert.equal(rollScore([0.6, 0.7, 0.75]), 100);
  assert.ok(rollScore([0.1, 0.1, 0.1]) < 30);
  assert.deepEqual([0.2, 0.65, 0.98].map(rollWord), ['loose', 'firm', 'tight']);
  assert.equal(finishScore({ oil: true, seamDown: true }), 100);
  assert.ok(finishScore({ oil: false, seamDown: false }) < 50);
  assert.equal(sliceScore({ wet: true, slices: 9 }), 100);
  assert.equal(sliceScore({ wet: false, slices: 9 }), 70);
  assert.equal(sliceScore({ wet: true, slices: 4 }), 60);
});

test('a careful classic roll wins gold; a dessert roll does not', () => {
  const careful = { rice: 100, fill: fillScore(CLASSIC), gim: 100, spread: 100, roll: 100, finish: 100, slice: 100 };
  assert.equal(medalFor(totalScore(careful)), 'gold');
  const dessert = { ...careful, fill: fillScore(['choco', 'gummy', 'chips']) };
  assert.ok(totalScore(dessert) < totalScore(careful));
  assert.equal(totalScore({}), 0);
});

test('every kimbap text and word has all nine languages', () => {
  const keys = new Set(Object.keys(BT));
  for (const k of STEPS) { assert.ok(keys.has('s.' + k), k); assert.ok(keys.has('tip.' + k), k); }
  for (const g of RICE) assert.ok(keys.has('g.' + g.id), g.id);
  for (const f of FILLINGS) assert.ok(keys.has('f.' + f.id), f.id);
  for (const w of WORDS) assert.ok(keys.has('w.' + w.key), w.key);
  for (const k of ['next', 'done', 'again', 'quit', 'tryAgain', 'words']) assert.ok(keys.has(k), k);
  for (const [k, v] of Object.entries(BT)) for (const l of LANGS) assert.ok(v[l], `${k}.${l}`);
  for (const [k, [ko, rom, tr]] of Object.entries(KIMBAP_LINES)) {
    assert.ok(ko && rom, k);
    for (const l of LANGS.filter((x) => x !== 'ko')) assert.ok(tr[l], `${k}.${l}`);
  }
});

test('the hidden scores never show up in the player text', () => {
  const all = JSON.stringify(BT) + JSON.stringify(KIMBAP_LINES);
  assert.ok(!/pref|score \d|\d+ ?points/i.test(all));
});
