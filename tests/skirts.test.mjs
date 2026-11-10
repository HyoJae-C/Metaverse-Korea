import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SKIRTS, SKIRT_LENGTHS, SKIRT_PATTERNS, skirtName } from '../src/data/skirts.js';
import { ITEMS, isWorn } from '../src/core/inventory.js';
import { RETIRED } from '../src/data/wearables.js';
import { sanitizeLook, DEFAULT_LOOK } from '../src/data/appearance.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const stores = read('stores.json').stores;
const region = read('region.json');
const hd = region.districts.find((d) => d.id === 'hongdae');
const hmap = read(hd.map);
const xs = hmap.buildings.flatMap((b) => b.p.map((q) => q[0] + hd.offset[0])), zs = hmap.buildings.flatMap((b) => b.p.map((q) => q[1] + hd.offset[1]));
const inHongdae = (s) => s.at[0] >= Math.min(...xs) && s.at[0] <= Math.max(...xs) && s.at[1] >= Math.min(...zs) && s.at[1] <= Math.max(...zs);
const inSeongsu = ([x, z]) => x >= -260 && x <= 260 && z >= -110 && z <= 410;

test('skirts: two lengths, many colours and patterns, named in four languages', () => {
  const all = Object.values(SKIRTS);
  for (const l of SKIRT_LENGTHS) assert.ok(all.filter((s) => s.length === l).length >= 10, l);
  for (const p of SKIRT_PATTERNS) assert.ok(all.some((s) => s.pattern === p), p);
  const names = new Set();
  for (const s of all) {
    const n = skirtName(s);
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(n[l], `${l} name`);
    names.add(n.en);
  }
  assert.equal(names.size, all.length, 'every skirt has its own name');
});

test('a skirt goes on over the trousers and comes off again; trousers take it off', () => {
  const skirt = ITEMS['skirt-pleats-mini-navy'];
  const look = sanitizeLook({ ...DEFAULT_LOOK, pants: 'denim', ...skirt.wear });
  assert.equal(look.skirt, 'pleats-mini-navy');
  assert.equal(look.pants, 'denim');
  assert.ok(isWorn(skirt, look));
  assert.ok(!isWorn(ITEMS['pants-denim'], look), 'jeans are not on under a skirt');
  const jeans = sanitizeLook({ ...look, ...ITEMS['pants-denim'].wear });
  assert.equal(jeans.skirt, null);
  assert.ok(isWorn(ITEMS['pants-denim'], jeans));
  assert.equal(sanitizeLook({ skirt: 'ballgown' }).skirt, null);
});

// Skirt shops spread by gu (Yozi, 2026-11-10): Hongdae 3, Dongdaemun 2
// (CHECK ROOM, Ttaengttaengi Dots), Sinchon 2 (Jureum Pleats, Nalgae Long
// Skirts), Jongno 1 (Kkotbat Skirts); none left in Seongsu.
test('skirt shops: three in Hongdae, the rest in Jung, Seodaemun and Jongno, every skirt sold somewhere but the retired ones', () => {
  const shops = stores.filter((s) => s.products?.length && s.products.every((p) => p.model === 'skirt'));
  assert.equal(shops.filter((s) => inSeongsu(s.at)).length, 0);
  assert.equal(shops.filter(inHongdae).length, 3);
  const by = (d) => shops.filter((s) => s.district === d).map((s) => s.id).sort();
  assert.deepEqual(by('euljiro'), ['check-room', 'ttaeng-dots']);
  assert.deepEqual(by('seodaemun'), ['jureum-pleats', 'nalgae-long']);
  assert.deepEqual(by('jongmyo'), ['kkotbat-skirt']);
  const sold = new Set(shops.flatMap((s) => s.products.map((p) => p.skirt)));
  assert.deepEqual([...sold].sort(), Object.keys(SKIRTS).filter((id) => !RETIRED.has('skirt-' + id)).sort());
  for (const s of shops) for (const p of s.products) {
    assert.equal(p.item, 'skirt-' + p.skirt);
    assert.deepEqual(p.tryOn, { skirt: p.skirt });
  }
});

test('the gym and the jjimjilbang are in Hongdae; the convenience store is DAILY MART', () => {
  for (const id of ['muscle-gym', 'onsaem-jjimjil']) assert.ok(inHongdae(stores.find((s) => s.id === id)), id);
  const mart = stores.find((s) => s.id === 'haru-mart');
  assert.equal(mart.name.en, 'DAILY MART');
  assert.equal(mart.name.ko, '데일리마트');
});
