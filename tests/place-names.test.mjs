import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STAMPS } from '../src/data/stamps.js';
import { STAMP_ORDER } from '../src/core/stamp-book.js';
import { TRAILS } from '../src/data/trails.js';
import { STARTER } from '../src/core/quests.js';
import { VISIT_FARE, REWARD, missionsFor } from '../src/core/daily.js';
import { HELP as HELP_KO } from '../src/help/ko.js';
import { HELP as HELP_EN } from '../src/help/en.js';

// Missions, stamps and the guide book name places. When a shop is renamed
// (수라간 → 김치만들기체험) or a rule changes (3 daily missions → 5), the old
// words stayed behind and players were sent looking for a place that isn't
// on the map (Yozi 2026-11-20).
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const rj = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const stores = [...rj('stores.json').stores, ...(rj('homes.json').homes || [])];
const byId = new Map(stores.map((s) => [s.id, s]));
const stampIds = new Set(STAMPS.map((s) => s.id));

test('a stamp at a shop goes by the shop\'s name, in every language it has', () => {
  const bad = [];
  for (const s of STAMPS.filter((x) => x.place.store)) {
    const store = byId.get(s.place.store);
    if (!store) { bad.push(`${s.id}: no shop ${s.place.store}`); continue; }
    for (const [lang, name] of Object.entries(s.name)) {
      const shop = store.name[lang];
      // the stamp may be shorter (효재대학교 for 효재대학교 어학당), never different
      if (shop && !shop.startsWith(name)) bad.push(`${s.id} ${lang}: stamp "${name}", shop "${shop}"`);
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

test('stamp courses and the stamp note order only name stamps that exist', () => {
  assert.deepEqual(STAMP_ORDER.filter((id) => !stampIds.has(id)), []);
  assert.deepEqual(TRAILS.flatMap((t) => t.stamps).filter((id) => !stampIds.has(id)), []);
});

test('errands and paid visits only send you to shops that exist', () => {
  assert.deepEqual(STARTER.filter((q) => q.target && !byId.has(q.target)).map((q) => q.target), []);
  assert.deepEqual(Object.keys(VISIT_FARE).filter((id) => !byId.has(id)), []);
});

test('the guide book says how many daily missions there are and what each pays', () => {
  const n = missionsFor('2026-11-20', { npcs: ['a'], stores: [{ id: 'x' }] }).length;
  const pay = REWARD.mission.toLocaleString('en-US');
  const ko = HELP_KO.sections.flatMap((s) => s.lines).find((l) => l.startsWith('📅'));
  assert.ok(ko.includes(`미션 ${n}개`) && ko.includes(pay), ko);
  const words = { 5: 'five', 4: 'four', 3: 'three' };
  const en = HELP_EN.sections.flatMap((s) => s.lines).find((l) => l.startsWith('📅'));
  assert.ok(en.includes(`${words[n] || n} missions`) && en.includes(pay), en);
});
