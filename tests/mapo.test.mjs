import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FISH, AVAILABLE_FISH, fishById } from '../src/core/fishing.js';

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

test('every park has the same catch: the Mangwon fish and the blue whale bite at all of them', () => {
  // One table for all parks (no park pays better). The kinds first met at
  // Mangwon are ordinary released fish now, the giant squid a ★5 beside the whale.
  const kinds = ['shrimp', 'wakame', 'rockfish', 'webfoot-octopus', 'cuttlefish', 'seahorse', 'giant-squid'].map(fishById);
  for (const f of kinds) assert.ok(f.released && f.chance > 0, f.id);
  assert.ok(fishById('whale').released);
  assert.ok(stores.every((s) => !('fishPlace' in s)), 'no park has a catch of its own');
  const legends = AVAILABLE_FISH.filter((f) => f.rarity === 5);
  assert.ok(Math.abs(legends.reduce((a, f) => a + f.chance, 0) - 0.4) < 1e-9, 'the ★5 share stays 0.4% of fish');
  assert.ok(FISH.every((f) => fishById(f.id)));
});
