import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FISH, AVAILABLE_FISH, fishById } from '../src/core/fishing.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
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
  const { map, inside, here, offset } = placed('mangwon');
  assert.ok(map.landmarks.some((l) => l.type === 'arcade'), 'Mangwon Market has its roof');
  assert.ok(map.areas.some((a) => a.k === 'water') && map.blockers.length, 'the river, and you cannot walk into it');
  assert.ok(map.landmarks.filter((l) => l.type === 'bench').length >= 5, 'benches by the river');
  const market = here.filter((s) => s.category === 'market');
  assert.ok(market.length >= 8, `${market.length} market stalls`);
  for (const s of here) assert.ok(!inside(...s.at), `${s.id} stands on the street`);
  const pier = stores.find((s) => s.id === 'mangwon-hangang');
  assert.equal(pier.category, 'park');
  // The park is laid on the street on the bank (tests/han-park.test.mjs), past the last houses.
  assert.ok(pier.hanpark && map.landmarks.some((l) => l.type === 'hanpark' && l.store === pier.id), 'the park is laid on the street');
  const land = map.areas.filter((x) => x.k !== 'water').flatMap((x) => x.p).map(([x, z]) => [x + offset[0], z + offset[1]]);
  const [lx0, lx1, lz0, lz1] = [Math.min(...land.map((q) => q[0])), Math.max(...land.map((q) => q[0])), Math.min(...land.map((q) => q[1])), Math.max(...land.map((q) => q[1]))];
  assert.ok(pier.at[0] > lx0 && pier.at[0] < lx1 && pier.at[1] > lz0 && pier.at[1] < lz1, 'the pier is in Mangwon');
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

test('every park has the same catch except its ★5 legend, and every park pays the same', async () => {
  const { chanceAt, rollCatch, PARK_LEGENDS, legendPark, TRASH_CHANCE } = await import('../src/core/fishing.js');
  // The kinds first met at Mangwon are ordinary released fish now.
  for (const id of ['shrimp', 'wakame', 'rockfish', 'webfoot-octopus', 'cuttlefish', 'seahorse', 'giant-squid']) assert.ok(fishById(id).released, id);
  assert.ok(stores.every((s) => !('fishPlace' in s)));
  for (const id of Object.keys(PARK_LEGENDS)) assert.ok(stores.some((s) => s.id === id && s.category === 'park'), `${id} is a park`);
  const legends = FISH.filter((f) => f.rarity === 5);
  assert.equal(new Set(legends.map((f) => f.price)).size, 1, 'every legend sells for the same');
  assert.equal(legendPark('whale').name.en, 'Ttukseom');
  assert.equal(legendPark('giant-squid').name.en, 'Mangwon');
  const parks = [...Object.keys(PARK_LEGENDS), null];
  const income = (park) => AVAILABLE_FISH.reduce((a, f) => a + chanceAt(f, park) * f.price, 0);
  for (const park of parks) {
    const sum = AVAILABLE_FISH.reduce((a, f) => a + chanceAt(f, park), 0);
    assert.ok(Math.abs(sum - 100) < 1e-9, `${park} ${sum}`);
    const five = legends.reduce((a, f) => a + chanceAt(f, park), 0);
    assert.ok(Math.abs(five - 0.4) < 1e-9, `${park}: ★5 keeps 0.4%`);
    assert.ok(Math.abs(income(park) - income(null)) < 1e-9, `${park} pays the same`);
  }
  assert.equal(chanceAt(fishById('whale'), 'mangwon-hangang'), 0);
  assert.equal(chanceAt(fishById('giant-squid'), 'ttukseom-hangang'), 0);
  // Rolls: Mangwon never lands a whale, Ttukseom never a giant squid.
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let squid = 0;
  for (let i = 0; i < 100000; i++) {
    const a = rollCatch(rand, i % 2 === 0, 'mangwon-hangang'), b = rollCatch(rand, i % 2 === 0, 'ttukseom-hangang');
    assert.notEqual(a.id, 'whale'); assert.notEqual(b.id, 'giant-squid');
    if (a.id === 'giant-squid') squid++;
  }
  assert.ok(squid > 200 && squid < 700, `${squid} giant squid in 100000 (about 0.4%)`);
  assert.ok(FISH.every((f) => fishById(f.id)));
  assert.ok(TRASH_CHANCE > 0);
});
