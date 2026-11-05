import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TAROT_CARDS, POSITIONS, ROMAN, shuffleDeck } from '../src/data/tarot.js';
import { tipsLeft, takeTip, TIPS_PER_DAY } from '../src/core/busking.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + f, import.meta.url)));
const region = read('region.json');

test('tarot: 22 major and 56 minor arcana, named and explained in each language', () => {
  assert.equal(TAROT_CARDS.length, 78);
  assert.equal(ROMAN.length, 22);
  TAROT_CARDS.forEach((c, i) => {
    assert.equal(c.n, i);
    assert.ok(c.icon);
    for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(c.name[l] && c.mean[l] && c.love[l] && c.money[l], `${c.name.en}.${l}`);
  });
  assert.equal(TAROT_CARDS.filter((c) => c.suit).length, 56);
  assert.equal(TAROT_CARDS[22].name.en, 'Ace of Wands');
  assert.equal(TAROT_CARDS[77].name.en, 'King of Pentacles');
  assert.equal(new Set(TAROT_CARDS.map((c) => c.name.en)).size, 78);
  assert.equal(POSITIONS.length, 3);
});

test('tarot: a shuffle is a permutation of the deck', () => {
  let seed = 3;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const deck = shuffleDeck(rand);
  assert.deepEqual([...deck].sort((a, b) => a - b), TAROT_CARDS.map((c) => c.n));
  assert.notDeepEqual(deck, TAROT_CARDS.map((c) => c.n));
});

test('busking tips: a few a day, counted again the next day', () => {
  let s = null;
  for (let i = 0; i < TIPS_PER_DAY; i++) { s = takeTip(s, '2026-11-05'); assert.ok(s); }
  assert.equal(tipsLeft(s, '2026-11-05'), 0);
  assert.equal(takeTip(s, '2026-11-05'), null);
  assert.equal(tipsLeft(s, '2026-11-06'), TIPS_PER_DAY);
  assert.deepEqual(takeTip(s, '2026-11-06'), { day: '2026-11-06', n: 1 });
});

test('Hongdae: district, station, busking zone and an even mix of shops and cafés', () => {
  const d = region.districts.find((x) => x.id === 'hongdae');
  assert.ok(d);
  const map = read(d.map);
  const [ox, oz] = d.offset;
  const inside = (x, z) => map.buildings.some((b) => {
    let c = false;
    const p = b.p.map(([a, q]) => [a + ox, q + oz]);
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; }
    return c;
  });
  assert.ok(region.subway.stations.some((s) => s.id === 'hongik-univ-station'));
  const spot = region.busking.find((b) => b.id === 'hongdae-busking');
  assert.ok(spot && !inside(...spot.at), 'the stage stands in the open');
  assert.ok(map.landmarks.some((l) => l.type === 'busking' && l.x + ox === spot.at[0] && l.z + oz === spot.at[1]), 'stage model where the zone is');
  // Stores whose spot is inside Hongdae's bounds.
  const xs = map.buildings.flatMap((b) => b.p.map((q) => q[0] + ox)), zs = map.buildings.flatMap((b) => b.p.map((q) => q[1] + oz));
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const stores = read('stores.json').stores.filter((s) => Array.isArray(s.at) && s.at[0] >= x0 && s.at[0] <= x1 && s.at[1] >= z0 && s.at[1] <= z1);
  const cafes = stores.filter((s) => s.category === 'cafe').length;
  const shops = stores.filter((s) => ['fashion', 'beauty', 'lifestyle'].includes(s.category)).length;
  // Hongdae has more clothes and beauty shops than cafés now (hair salons,
  // skirt shops), but cafés stay a big part of the street.
  assert.ok(cafes >= 4 && shops >= 4 && cafes - shops <= 3 && shops - cafes <= 4, `cafés ${cafes}, shops ${shops}`);
  assert.ok(stores.some((s) => s.workshop === 'tarot'), 'a tarot café');
  for (const s of stores) assert.ok(!inside(...s.at), `${s.id} stands on the street`);
});

test('animal cafés: Seongsu keeps only the cat café, the rest are in Hongdae with a second cat café', () => {
  const d = region.districts.find((x) => x.id === 'hongdae');
  const map = read(d.map);
  const [ox, oz] = d.offset;
  const xs = map.buildings.flatMap((b) => b.p.map((q) => q[0] + ox)), zs = map.buildings.flatMap((b) => b.p.map((q) => q[1] + oz));
  const inHongdae = (s) => s.at[0] >= Math.min(...xs) && s.at[0] <= Math.max(...xs) && s.at[1] >= Math.min(...zs) && s.at[1] <= Math.max(...zs);
  const pets = read('stores.json').stores.filter((s) => s.pets);
  const hongdae = pets.filter(inHongdae).map((s) => s.pets).sort();
  assert.deepEqual(hongdae, ['bigdogs', 'gogocats', 'hamsters', 'raccoons']);
  assert.deepEqual(pets.filter((s) => !inHongdae(s)).map((s) => s.id), ['nyang-cat-cafe']);
});
