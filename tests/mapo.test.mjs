import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FISH, fishById } from '../src/core/fishing.js';
import { FISH_PLACES, placeFish, fishPlaceOf, placeChance, rollPlaceCatch, rollPlaceAuto, usualChance, noBiteAt } from '../src/core/fish-places.js';
import { AVAILABLE_FISH } from '../src/core/fishing.js';
import { forceNextCatch, takeForcedCatch } from '../src/core/fish-luck.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + f, import.meta.url)));
const region = read('region.json');
const stores = read('stores.json').stores;

function placed(id) {
  const d = region.districts.find((x) => x.id === id);
  const map = read(d.map);
  const [ox, oz] = d.offset;
  const polys = map.buildings.map((b) => b.p.map(([x, z]) => [x + ox, z + oz]));
  const inside = (x, z) => polys.some((p) => {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; }
    return c;
  });
  const xs = polys.flat().map((q) => q[0]), zs = polys.flat().map((q) => q[1]);
  const box = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const here = stores.filter((s) => s.at[0] >= box[0] - 3 && s.at[0] <= box[1] + 3 && s.at[1] >= box[2] - 3 && s.at[1] <= box[3] + 3);
  return { map, inside, here, offset: d.offset };
}

test('Yeonnam-dong: the forest park runs on from Hongdae Walking Street, shops stand on the street', () => {
  const { map, inside, here, offset } = placed('yeonnam');
  const hongdae = region.districts.find((x) => x.id === 'hongdae');
  const path = map.roads.find((r) => r.n?.en === 'Gyeongui Line Forest Path');
  assert.ok(path && map.areas.some((a) => a.k === 'park' && a.trees), 'a wooded park with a path (picnic mats go there)');
  assert.equal(path.p[0][0] + offset[0], hongdae.offset[0], 'the path lines up with Hongdae Walking Street');
  assert.ok(map.landmarks.some((l) => l.type === 'tracks'), 'old rails in the grass');
  assert.ok(here.length >= 9, `${here.length} shops`);
  for (const s of here) assert.ok(!inside(...s.at), `${s.id} stands on the street`);
  assert.ok(here.some((s) => s.products?.some((p) => p.model === 'picnicmat')), 'somewhere to buy a picnic mat');
  assert.ok(here.some((s) => s.category === 'restaurant'), 'a restaurant');
});

test('Mangwon-dong: market under an arcade, the open river park and the fishing pier', () => {
  const { map, inside, here } = placed('mangwon');
  assert.ok(map.landmarks.some((l) => l.type === 'arcade'), 'Mangwon Market has its roof');
  assert.ok(map.areas.some((a) => a.k === 'water') && map.blockers.length, 'the river, and you cannot walk into it');
  assert.ok(map.landmarks.filter((l) => l.type === 'bench').length >= 5, 'benches by the river');
  const market = here.filter((s) => s.category === 'market');
  assert.ok(market.length >= 8, `${market.length} market stalls`);
  for (const s of here) assert.ok(!inside(...s.at), `${s.id} stands on the street`);
  const pier = stores.find((s) => s.id === 'mangwon-hangang');
  assert.equal(pier.category, 'park');
  assert.equal(pier.fishPlace, 'mangwon');
  assert.ok(here.includes(pier), 'the pier is in Mangwon');
  assert.ok(region.subway.stations.some((s) => s.id === 'mangwon-station' && s.line.name.en === 'Line 6'));
});

test('all the new shops are fictional sample data with names in four languages', () => {
  const ids = [...placed('yeonnam').here, ...placed('mangwon').here].map((s) => s.id);
  for (const id of ids) {
    const s = stores.find((x) => x.id === id);
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(s.name[l] && s.tagline[l], `${id}.${l}`);
    for (const p of s.products || []) assert.ok(p.name.en && p.name.ko && p.desc?.en, `${id}/${p.id}`);
  }
  assert.equal(new Set(stores.map((s) => s.id)).size, stores.length, 'store ids are unique');
});

test('Mangwon fish: seven journal kinds that only bite at the Mangwon pier', () => {
  const kinds = placeFish('mangwon');
  assert.equal(kinds.length, 7);
  for (const f of kinds) {
    assert.equal(f.released, false, `${f.id} stays out of the usual odds`);
    assert.equal(fishPlaceOf(f.id), 'mangwon');
  }
  assert.deepEqual(kinds.map((f) => f.rarity).sort(), [1, 1, 2, 2, 3, 3, 5]);
  // The ★5 legend of the pier (giant squid): about 1 in 500 bites there,
  // rarer than the blue whale anywhere (0.4%).
  const legend = kinds.find((f) => f.rarity === 5);
  assert.ok(placeChance(legend) > 0.1 && placeChance(legend) < 0.4, `${legend.id} ${placeChance(legend)}`);
  const total = kinds.reduce((a, f) => a + placeChance(f), 0);
  assert.ok(Math.abs(total - FISH_PLACES.mangwon.share * 100) < 1e-9);
  // Each ★3 Mangwon fish is about as rare as the usual ★3 kinds.
  for (const f of kinds.filter((q) => q.rarity === 3)) assert.ok(placeChance(f) > 0.5 && placeChance(f) < 2.5, `${f.id} ${placeChance(f)}`);
});

test('fishing elsewhere never lands a Mangwon fish; at Mangwon about a fifth of bites are', () => {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const local = new Set(placeFish('mangwon').map((f) => f.id));
  let n = 0;
  for (let i = 0; i < 4000; i++) assert.ok(!local.has(rollPlaceCatch(null, rand).id));
  for (let i = 0; i < 4000; i++) if (local.has(rollPlaceCatch('mangwon', rand).id)) n++;
  assert.ok(n > 4000 * 0.17 && n < 4000 * 0.23, `${n} of 4000`);
  for (let i = 0; i < 2000; i++) { const f = rollPlaceAuto('mangwon', rand); assert.ok(f.rarity <= 2, 'auto fishing never lands a rare one'); }
  for (let i = 0; i < 2000; i++) assert.ok(!local.has(rollPlaceAuto(null, rand).id));
  // A developer code still decides the next bite, even at Mangwon.
  forceNextCatch('whale');
  assert.equal(rollPlaceCatch('mangwon', () => 0).id, 'whale');
  takeForcedCatch();
  assert.ok(FISH.every((f) => fishById(f.id)));
});

test('the blue whale only bites at the Ttukseom Han River park, never at Mangwon', () => {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const whale = fishById('whale');
  assert.ok(noBiteAt('mangwon', whale) && !noBiteAt(null, whale));
  assert.equal(usualChance(whale, 'mangwon'), 0);
  assert.ok(Math.abs(usualChance(whale, null) - whale.chance) < 1e-9);
  // The other usual kinds fill its part, at the lucky spot too.
  for (const lucky of [false, true]) {
    const sum = AVAILABLE_FISH.reduce((a, f) => a + usualChance(f, 'mangwon', lucky), 0);
    assert.ok(Math.abs(sum - 100) < 1e-9, `${sum}`);
  }
  // Pick rolls that would be a whale (the top of the usual table) and many more.
  let whales = 0, home = 0;
  for (let i = 0; i < 200000; i++) {
    if (rollPlaceCatch('mangwon', rand, i % 2 === 0).id === 'whale') whales++;
    if (rollPlaceCatch(null, rand).id === 'whale') home++;
  }
  assert.equal(whales, 0, 'no whale at Mangwon');
  assert.ok(home > 400 && home < 1200, `${home} whales of 200000 at Ttukseom (0.4% of fish)`);
});
