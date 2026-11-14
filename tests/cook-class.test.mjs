import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepScore, totalScore, amountsNote, pickNote, meterWord } from '../src/core/cook-class.js';
import { medalFor } from '../src/core/grill-game.js';
import * as tteok from '../src/core/tteok-game.js';
import * as bibimbap from '../src/core/bibimbap-game.js';
import { CT, CLASS_LINES } from '../src/ui/cook-class-text.js';
import { TK, TTEOK_LINES } from '../src/ui/tteok-text.js';
import { BK, BIBIMBAP_LINES } from '../src/ui/bibimbap-text.js';
import { GIFT_LOOKS } from '../src/core/held.js';

const LANGS = ['en', 'ko', 'ja', 'zh', 'es', 'id', 'vi', 'hi', 'fr', 'th', 'ar'];
const CLASSES = [['tteok', tteok, TK, TTEOK_LINES], ['bibimbap', bibimbap, BK, BIBIMBAP_LINES]];

// The best answer for each step: the card amounts, the classic picks, the
// middle of the zone, the best option, the right ticks.
function best(st) {
  if (st.type === 'amounts') return Object.fromEntries(st.items.filter((g) => !g.decoy).map((g) => [g.id, g.ok[1]]));
  if (st.type === 'pick') return st.items.filter((f) => f.classic).slice(0, st.max).map((f) => f.id);
  if (st.type === 'meter') return Array(st.times).fill((st.zone[0] + st.zone[1]) / 2);
  if (st.type === 'choice') return [...st.options].sort((a, b) => b.score - a.score)[0].id;
  return st.items.filter((c) => c.pts > 0).map((c) => c.id);
}
function worst(st) {
  if (st.type === 'amounts') return Object.fromEntries(st.items.map((g) => [g.id, g.decoy ? st.max : 0]));
  if (st.type === 'pick') return [...st.items].sort((a, b) => a.pref - b.pref).slice(0, st.min).map((f) => f.id);
  if (st.type === 'meter') return Array(st.times).fill(0);
  if (st.type === 'choice') return [...st.options].sort((a, b) => a.score - b.score)[0].id;
  return st.items.filter((c) => c.pts < 0).map((c) => c.id);
}

for (const [name, g, T, LINES] of CLASSES) {
  test(`${name}: a careful class wins gold, a careless one no medal`, () => {
    const good = Object.fromEntries(g.STEPS.map((st) => [st.id, stepScore(st, best(st))]));
    for (const [k, v] of Object.entries(good)) assert.ok(v >= 90, `${k} ${v}`);
    assert.equal(medalFor(totalScore(g.STEPS, good)), 'gold');
    const bad = Object.fromEntries(g.STEPS.map((st) => [st.id, stepScore(st, worst(st))]));
    assert.equal(medalFor(totalScore(g.STEPS, bad)), null);
    assert.equal(totalScore(g.STEPS, {}), 0);
  });

  test(`${name}: the teacher's notes follow what you did`, () => {
    for (const st of g.STEPS) {
      if (st.type === 'amounts') {
        assert.equal(amountsNote(st, best(st)), 'a.good');
        assert.equal(amountsNote(st, worst(st)), 'a.decoy');
      }
      if (st.type === 'pick') {
        assert.equal(pickNote(st, best(st)), 'p.classic');
        assert.equal(pickNote(st, worst(st)), 'p.wild');
      }
      if (st.type === 'meter') assert.deepEqual([0, (st.zone[0] + st.zone[1]) / 2, 1].map((v) => meterWord(st, v)), ['low', 'ok', 'high']);
    }
  });

  test(`${name}: every text has all languages, and the hidden scores stay hidden`, () => {
    const need = ['title', 'intro', 'start', 'finish', 'result', 'gift', 'bagFull', 'share', 'item', 'open', 'hint'];
    for (const st of g.STEPS) {
      need.push('s.' + st.id, 'tip.' + st.id);
      if (st.type === 'amounts' || st.type === 'meter') need.push('act.' + st.id);
      if (st.type === 'meter') need.push(st.id + '.low', st.id + '.ok', st.id + '.high');
      for (const it of st.items || st.options || []) need.push('i.' + it.id);
    }
    for (const w of g.WORDS) need.push('w.' + w.key);
    for (const k of need) assert.ok(T[k], k);
    for (const [k, v] of Object.entries({ ...CT, ...T })) for (const l of LANGS) assert.ok(v[l], `${k}.${l}`);
    for (const [k, [ko, rom, tr]] of Object.entries({ ...CLASS_LINES, ...LINES })) {
      assert.ok(ko && rom, k);
      for (const l of LANGS.filter((x) => x !== 'ko')) assert.ok(tr[l], `${k}.${l}`);
    }
    assert.ok(!/pref|score \d|\d+ ?points/i.test(JSON.stringify(T) + JSON.stringify(LINES)));
  });

  test(`${name}: the dish is held as itself`, () => {
    assert.ok(GIFT_LOOKS.includes(name));
  });
}
