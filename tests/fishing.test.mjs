import { test } from 'node:test';
import assert from 'node:assert/strict';
import { biteWait } from '../src/core/fishing.js';
import { FISH, AVAILABLE_FISH, rollFish, rollCatch, TRASH, TRASH_CHANCE, tapsFor, escapeChance, fishById, FishBag, FishDex, BAG_MAX } from '../src/core/fishing.js';

const memory = () => {
  const m = new Map();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};

test('49 stable catalogue entries, 34 released, nine stamps per page and four special catches', () => {
  assert.equal(FISH.length, 49);
  assert.equal(new Set(FISH.map(f => f.id)).size, 49);
  assert.equal(AVAILABLE_FISH.length, 34);
  assert.deepEqual(Array.from({ length: 6 }, (_, page) => FISH.filter(f => f.page === page).length), [9,9,9,9,9,4]);
  assert.equal(fishById('whale').ko, '흰수염고래');
  assert.equal(fishById('shark').ko, '백상아리');
  assert.equal(FISH.filter(f => f.ko.endsWith('돔')).length, 1);
  for (const f of FISH) assert.ok(f.name.en && f.ko && f.rom);
});

test('tiers follow the agreed fish book: 14/14/11/6/4, legends alone on the last page', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(r => FISH.filter(f => f.rarity === r).length), [14, 14, 11, 6, 4]);
  assert.deepEqual(FISH.filter(f => f.page === 5).map(f => f.id).sort(), ['blobfish', 'giant-squid', 'manta', 'whale']);
  for (let i = 1; i < FISH.length; i++) assert.ok(FISH[i].rarity >= FISH[i - 1].rarity, FISH[i].id);
  assert.equal(fishById('shark').rarity, 4);
  assert.equal(fishById('tuna').ko, '참다랑어');
  assert.equal(fishById('trout').ko, '송어');
  assert.equal(fishById('anglerfish').ko, '초롱아귀');
  // Higher tiers always pay more than lower ones.
  for (let r = 2; r <= 5; r++) assert.ok(Math.min(...FISH.filter(f => f.rarity === r).map(f => f.price)) > Math.max(...FISH.filter(f => f.rarity === r - 1).map(f => f.price)), `tier ${r}`);
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
    assert.ok(escapeChance(f) >= 0 && escapeChance(f) <= 0.3);
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
  assert.equal(bag.sellAll(), fishById('whale').price + 2 * fishById('shark').price + fishById('crab').price);
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
  dex.add('blobfish');
  assert.equal(new FishDex(st).count('blobfish'),1);
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
  const { RENAMED, FISH_SHEET } = await import('../src/core/fishing.js');
  assert.deepEqual([...FISH_SHEET].sort(), FISH.map(f => f.id).sort());
  // The book, the stamp pop-up, catch cards, the guide and the market all draw
  // the fish with fishStampIcon (the sheet), never the emoji directly.
  const fs = await import('node:fs');
  const ui = fs.readFileSync(new URL('../src/ui/fishing-ui.js', import.meta.url), 'utf8');
  assert.equal(ui.match(/\bf\.emoji\b/g).length, 1, 'only fishStampIcon\'s fallback uses the emoji');
  const rig = fs.readFileSync(new URL('../src/core/fishing-rig.js', import.meta.url), 'utf8');
  assert.ok(rig.includes('FISH_SHEET_URL') && !/\.emoji\b/.test(rig), 'the fish on the line uses the sheet too');
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

test('a bite comes after 2.5 to 8.5 seconds', () => {
  assert.equal(biteWait(() => 0), 2.5);
  assert.equal(biteWait(() => 0.999999).toFixed(2), '8.50');
});

test('rarer catches stay up longer over your head', async () => {
  const { SHOW_MS } = await import('../src/ui/fishing-ui.js');
  for (let r = 2; r <= 5; r++) assert.ok(SHOW_MS[r] > SHOW_MS[r - 1]);
  assert.equal(SHOW_MS[5], 12000);
});

test('the lucky spot moves around, boosts ★2 and up a little and halves the boot', async () => {
  const { luckySpot, luckyChance, LUCKY_BOOST, LUCKY_MINUTES, LUCKY_TRASH_CHANCE } = await import('../src/core/fishing.js');
  const slot = LUCKY_MINUTES * 60000, seen = new Set();
  for (let k = 0; k < 200; k++) {
    const i = luckySpot(4, k * slot);
    assert.ok(i >= 0 && i < 4);
    assert.equal(luckySpot(4, k * slot + slot - 1), i); // steady within a slot
    seen.add(i);
  }
  assert.equal(seen.size, 4); // every spot gets its turn
  assert.ok(Math.abs(AVAILABLE_FISH.reduce((a, f) => a + luckyChance(f), 0) - 100) < 1e-9);
  for (const f of AVAILABLE_FISH) {
    if (f.rarity >= 2) assert.ok(luckyChance(f) > f.chance && luckyChance(f) < f.chance * LUCKY_BOOST, f.id);
    else assert.ok(luckyChance(f) < f.chance, f.id);
  }
  assert.equal(rollCatch(() => LUCKY_TRASH_CHANCE - 1e-6, true), TRASH);
  assert.notEqual(rollCatch(() => LUCKY_TRASH_CHANCE, true), TRASH);
  assert.equal(rollCatch(() => 0.999999, true).id, AVAILABLE_FISH.at(-1).id);
});

test('fishing counters: casts, misses and escapes by rarity, saved as mk.fishstats', async () => {
  const { FishStats } = await import('../src/core/fishing.js');
  const m = memory();
  const s = new FishStats(m, 1000);
  s.add('cast'); s.add('cast'); s.add('miss');
  s.add('bite', fishById('whale')); s.add('escape', fishById('whale'));
  s.add('land', TRASH); s.add('land', fishById('loach'));
  s.add('since'); s.add('nope'); s.add('bite');
  const again = new FishStats(m, 5000);
  assert.equal(again.get('since'), 1000);
  assert.equal(again.get('cast'), 2);
  assert.equal(again.get('miss'), 1);
  assert.deepEqual(again.get('bite'), [0, 0, 0, 0, 0, 1]);
  assert.deepEqual(again.get('escape'), [0, 0, 0, 0, 0, 1]);
  assert.deepEqual(again.get('land'), [1, 1, 0, 0, 0, 0]);
  assert.deepEqual(again.get('got'), { loach: 1 });
  again.add('auto', fishById('carp'));
  assert.equal(again.get('auto'), 1);
  assert.deepEqual(new FishStats(m).get('gotAuto'), { carp: 1 });
  m.setItem('mk.fishstats', '{broken');
  assert.equal(new FishStats(m, 7).get('cast'), 0);
});

test('each star tier bites less often in total than the one below it', () => {
  const tier = (r) => AVAILABLE_FISH.filter(f => f.rarity === r).reduce((a, f) => a + f.chance, 0);
  for (let r = 2; r <= 5; r++) assert.ok(tier(r) < tier(r - 1), `★${r} ${tier(r)} < ★${r - 1} ${tier(r - 1)}`);
  // and every ★4 kind is rarer than any ★3 kind
  assert.ok(Math.max(...AVAILABLE_FISH.filter(f => f.rarity === 4).map(f => f.chance)) < Math.min(...AVAILABLE_FISH.filter(f => f.rarity === 3).map(f => f.chance)));
});

test('better rods cut the escape chance a little but never change which fish bite', async () => {
  const { ROD_SKINS, rodSkin } = await import('../src/core/rod-skins.js');
  assert.equal(rodSkin('basic').hold, 0);
  assert.equal(rodSkin('nope').hold, 0); // unknown skins fall back to the basic rod
  for (let i = 1; i < ROD_SKINS.length; i++) {
    assert.ok(ROD_SKINS[i].price > ROD_SKINS[i - 1].price);
    assert.ok(ROD_SKINS[i].hold > ROD_SKINS[i - 1].hold, ROD_SKINS[i].id); // pricier holds better
  }
  assert.ok(ROD_SKINS.at(-1).hold <= 0.25); // a small edge, not a sure catch
  const shark = AVAILABLE_FISH.find(f => f.rarity === 5 && escapeChance(f) > 0);
  assert.equal(escapeChance(shark, 0, 0), escapeChance(shark));
  assert.ok(Math.abs(escapeChance(shark, 0, 0.25) - 0.3 * 0.75) < 1e-12); // ★5: 30% → 22.5%
  assert.ok(Math.abs(escapeChance(shark, 1, 0.2) - 0.3 * 0.5 * 0.8) < 1e-12); // stacks with spare time
  assert.equal(escapeChance(TRASH, 0, 0.5), 0);
});
