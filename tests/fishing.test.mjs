import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FISH, AVAILABLE_FISH, rollFish, rollCatch, TRASH, TRASH_CHANCE, tapsFor, escapeChance, fishById, FishBag, FishDex, BAG_MAX } from '../src/core/fishing.js';

const memory = () => {
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};

test('49 stable catalogue entries, 27 released, nine stamps per page and four special catches', () => {
  assert.equal(FISH.length, 49);
  assert.equal(new Set(FISH.map(f => f.id)).size, 49);
  assert.equal(AVAILABLE_FISH.length, 27);
  assert.deepEqual(Array.from({ length: 6 }, (_, page) => FISH.filter(f => f.page === page).length), [9,9,9,9,9,4]);
  assert.equal(fishById('whale').ko, '흰수염고래');
  assert.equal(fishById('shark').ko, '백상아리');
  assert.equal(FISH.filter(f => f.ko.endsWith('돔')).length, 1);
  for (const f of FISH) assert.ok(f.name.en && f.ko && f.rom);
});

test('normalized lottery never selects unreleased entries and follows every probability boundary', () => {
  assert.ok(Math.abs(AVAILABLE_FISH.reduce((sum,f) => sum + f.chance,0) - 100) < 1e-9);
  let cumulative = 0;
  for (const f of AVAILABLE_FISH) {
    assert.equal(rollFish(() => (cumulative + f.chance / 2) / 100).id, f.id);
    cumulative += f.chance;
  }
  for (const f of FISH.filter(f => !f.released)) assert.equal(f.chance, 0);
  assert.equal(rollCatch(() => 0), TRASH);
  assert.equal(rollCatch(() => TRASH_CHANCE - 0.00001), TRASH);
  assert.equal(rollCatch(() => TRASH_CHANCE).id, AVAILABLE_FISH[0].id);
  assert.equal(rollCatch(() => 0.999999).id, AVAILABLE_FISH.at(-1).id);
});

test('difficulty is bounded for all 49 species and trash cannot escape', () => {
  for (const f of FISH) {
    assert.ok(tapsFor(f) >= 5 && tapsFor(f) <= 18);
    assert.ok(escapeChance(f) >= 0 && escapeChance(f) <= 0.28);
    assert.equal(escapeChance(f, 1), escapeChance(f) / 2);
    assert.equal(tapsFor({...f}), tapsFor(f));
  }
  assert.equal(escapeChance(TRASH), 0);
});

test('old bag and dex IDs survive renaming and sales, while trash is never counted', () => {
  const st=memory();
  st.setItem('mk.fish', JSON.stringify({whale:1,shark:2,crab:1}));
  const bag=new FishBag(st), dex=new FishDex(st,bag);
  assert.equal(bag.size,4);
  assert.equal(dex.kinds,3);
  assert.equal(bag.add(TRASH.id),false);
  assert.equal(dex.add(TRASH.id),false);
  assert.equal(bag.sellAll(),424);
  assert.equal(new FishDex(st,bag).total,4);
  assert.equal(dex.add('whale'),false);
  assert.equal(dex.count('whale'),2);
  assert.equal(dex.add('carp'),true);
  for(let i=0;i<BAG_MAX+1;i++)bag.add('crucian');
  assert.equal(bag.size,BAG_MAX);
  assert.equal(bag.add('whale'),false);
});

test('available collection can finish before the full catalogue, and future records persist', () => {
  const st=memory(), dex=new FishDex(st);
  for(const f of AVAILABLE_FISH)dex.add(f.id);
  assert.equal(dex.availableComplete,true);
  assert.equal(dex.complete,false);
  dex.add('giant-squid');
  assert.equal(new FishDex(st).count('giant-squid'),1);
  for(const f of FISH)dex.add(f.id);
  assert.equal(dex.complete,true);
  st.setItem('mk.fishdex','broken');
  assert.equal(new FishDex(st).kinds,0);
});

test('three bite lines for each of the five rarities; auto fishing never rolls a rare fish', async () => {
  const { BITE_LINES, AUTO_FISH, rollAutoCatch, isRare, drainFor } = await import('../src/core/fishing.js');
  for (const r of [1, 2, 3, 4, 5]) {
    assert.equal(BITE_LINES[r].length, 3, `rarity ${r}`);
    for (const l of BITE_LINES[r]) assert.ok(l.ko && l.en, `rarity ${r}`);
  }
  assert.ok(AUTO_FISH.length && AUTO_FISH.every(f => f.released && !isRare(f)));
  for (let i = 0; i < 200; i++) assert.ok(!isRare(rollAutoCatch()));
  assert.deepEqual([1, 2, 3, 4, 5].map(r => drainFor({ rarity: r })), [0, 0, 1.2, 2, 2.8]);
});

test('every kind has a picture, and saves with swapped-out kinds keep their counts', async () => {
  const { RENAMED } = await import('../src/core/fishing.js');
  const ui = await import('node:fs').then(fs => fs.readFileSync(new URL('../src/ui/fishing-ui.js', import.meta.url), 'utf8'));
  const sheet = ui.slice(ui.indexOf('new Map(['), ui.indexOf('].map((id, index)')).match(/'[a-z-]+'/g).map(x => x.slice(1, -1));
  assert.deepEqual([...sheet].sort(), FISH.map(f => f.id).sort());
  const st = memory();
  st.setItem('mk.fish', JSON.stringify({ bass: 2, squid: 1, carp: 1 }));
  st.setItem('mk.fishdex', JSON.stringify({ bass: 3, scallop: 1, swordfish: 1 }));
  const bag = new FishBag(st), dex = new FishDex(st, bag);
  assert.equal(bag.count('scallop'), 2);
  assert.equal(bag.count('marlin'), 1);
  assert.equal(bag.size, 4);
  assert.equal(dex.count('scallop'), 4);
  assert.equal(dex.count('giant-squid'), 1);
  for (const id of Object.values(RENAMED)) assert.ok(fishById(id), id);
  for (const id of Object.keys(RENAMED)) assert.equal(fishById(id), null, id);
});
