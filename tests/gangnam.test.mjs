import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inPolygon, toGame } from '../src/core/seoul-grid.js';
import { wallNear } from '../src/core/wall-screen.js';
import { OSM, ROADS, EXITS, GROUPS, WHY, NEW_SHOPS, HAKDONG, GANGNAM_DAERO, osmStreet } from '../scripts/build-gangnam.mjs';
import { lineDist, nearestOn, lengthOf } from '../scripts/street-rows.mjs';

// Gangnam Station to Nonhyeon Station (scripts/build-gangnam.mjs): Gangnam-daero
// at 1/4 on its real line, Line 2's Gangnam Station, and the shops that moved
// here (Yozi 2026-11-24): no shop was made new.
const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json'), stores = read('stores.json').stores, seoul = read('seoul.json');
const district = region.districts.find((d) => d.id === 'gangnam');
const map = read('districts/gangnam.json');
const [ox, oz] = district.offset;
const local = ([x, z]) => [x - ox, z - oz];
const here = stores.filter((s) => s.district === 'gangnam');

test('Gangnam Station: the crossroads on its real spot, in Gangnam-gu\'s list', () => {
  const [x, z] = toGame(district.anchor.lat, district.anchor.lon);
  assert.ok(Math.hypot(x - ox, z - oz) < 1, 'no nudge');
  assert.ok(seoul.gu.find((g) => g.id === 'gangnam').districts.includes('gangnam'));
  assert.match(map.meta.source, /OpenStreetMap/);
  // the real station's 12 exits ring the crossroads
  for (const at of Object.values(OSM.exits.gangnam)) assert.ok(Math.hypot(...local(at)) < 50);
});

test('every street is on its real line: within 1 m of OpenStreetMap\'s (the middle of its two carriageways)', () => {
  assert.equal(map.roads.length, 7);
  for (const r of map.roads) {
    const real = osmStreet(r.n.en);
    // (a cross street's first point is on the avenue's middle line, where OSM's own line stops at the kerb)
    for (const q of r.p.slice(r === map.roads[0] ? 0 : 1)) assert.ok(lineDist(q, real) < 1, `${r.n.en} at ${q}: ${lineDist(q, real).toFixed(1)} m off`);
  }
  const len = lengthOf(GANGNAM_DAERO);
  assert.ok(len > 440 && len < 480, `Gangnam-daero is ${len.toFixed(0)} m: Gangnam Station to past Nonhyeon at 1/4`);
});

test('no building stands on a street, and none overlaps another', () => {
  for (const b of map.buildings) {
    for (const r of map.roads) for (const q of b.p) assert.ok(lineDist(q, r.p) > r.w / 2 + 1, `a building on ${r.n.en}`);
    const c = [b.p.reduce((m, q) => m + q[0], 0) / 4, b.p.reduce((m, q) => m + q[1], 0) / 4];
    for (const o of map.buildings) if (o !== b) assert.ok(!inPolygon(...c, o.p), 'two buildings overlap');
  }
});

test('Gangnam Station (Line 2): exits 10 and 11 on the pavement near the real ones, before Samseong on the loop', () => {
  const list = region.subway.stations, i = list.findIndex((s) => s.id === 'gangnam-station');
  assert.equal(list[i].code, '222');
  assert.equal(list[i + 1].id, 'samseong-station', 'the train goes Gangnam -> Samseong');
  assert.deepEqual(list[i].exits.map((e) => e.n), [10, 11]);
  list[i].exits.forEach((e, k) => {
    const q = local(e.at);
    assert.ok(Math.hypot(q[0] - EXITS[k].real[0], q[1] - EXITS[k].real[1]) < 15, `exit ${e.n} within 15 m of the real one`);
    for (const r of map.roads) assert.ok(lineDist(q, r.p) > r.w / 2 + 2.5, `exit ${e.n} clear of ${r.n.en}`);
    for (const b of map.buildings) for (const c of b.p) assert.ok(Math.hypot(c[0] - q[0], c[1] - q[1]) > 4, `exit ${e.n} clear of the buildings`);
  });
});

test('the shops moved here, none made new: clinics, clothes, the appliance mart and four furniture showrooms', () => {
  const moved = GROUPS.flatMap(([, ids]) => ids).filter((id) => id !== 'info-gangnam');
  assert.deepEqual(here.map((s) => s.id).sort(), [...moved, 'info-gangnam'].sort());
  assert.equal(moved.length, 14);
  for (const id of moved.filter((m) => !NEW_SHOPS.includes(m))) assert.match(stores.find((s) => s.id === id).why, /Moved here|moved here/, id);
  assert.deepEqual(Object.keys(WHY).sort(), [...moved].sort());
  // every shop's spot: on the pavement in front of a building, off the streets
  for (const s of here) {
    const q = local(s.at);
    for (const r of map.roads) assert.ok(lineDist(q, r.p) >= r.w / 2 + 0.5, `${s.id} is on ${r.n.en}`);
    for (const b of map.buildings) assert.ok(!inPolygon(...q, b.p), `${s.id} is inside a building`);
    assert.ok(wallNear(map.buildings, ...q, 4).d < 3, `${s.id} has a building behind it`);
  }
  // the cosmetic clinics are gone from Seongsu: these two are the game's only ones
  assert.deepEqual(stores.filter((s) => /^clinic/.test(s.workshop || '')).map((s) => s.district), ['gangnam', 'gangnam']);
});

test('shops gather in three places, with quiet buildings between', () => {
  const at = (id) => local(stores.find((s) => s.id === id).at);
  for (const id of ['wide-pants', 'tteugae-knit', 'cap-yard', 'teheran-appliances']) assert.ok(Math.hypot(...at(id)) < 50, `${id} by the crossroads`);
  for (const id of ['fullpower-gaming', 'fullpower-gaming-room']) assert.ok(Math.hypot(at(id)[0] - at('teheran-appliances')[0], at(id)[1] - at('teheran-appliances')[1]) < 45, `${id} by the appliance mart`);
  const sinnonhyeon = nearestOn(local(OSM.exits.sinnonhyeon['3']), GANGNAM_DAERO).at;
  for (const id of ['bitna-clinic', 'saebom-clinic']) {
    const q = at(id);
    assert.ok(Math.hypot(q[0] - sinnonhyeon[0], q[1] - sinnonhyeon[1]) < 70 && lineDist(q, GANGNAM_DAERO) < 20, `${id} on the avenue by Sinnonhyeon`);
  }
  // the furniture showrooms: on Hakdong-ro, the real Nonhyeon furniture street, east of Gangnam-daero
  for (const id of ['saebyeok-living', 'saebyeok-bedroom', 'kkotjam-beds', 'danjang-dressroom', 'white-mood-living', 'white-mood-interior']) assert.ok(lineDist(at(id), HAKDONG) < 12, `${id} on Hakdong-ro`);
  assert.ok(map.buildings.length - here.length > 40, 'most buildings have no shop');
});

test('the big screens are on walls round the crossroads and up the avenue', () => {
  const screens = region.screens.filter((s) => /build-gangnam screen/.test(s.note || ''));
  assert.equal(screens.length, 6);
  for (const s of screens) {
    const near = wallNear(map.buildings, ...local(s.at));
    assert.ok(near && near.d < 1 && near.len >= 12, 'on a long wall');
    assert.ok(ROADS.some((r) => lineDist(local(s.at), r.p) < r.w / 2 + 11), 'facing a street');
  }
  assert.ok(screens.filter((s) => Math.hypot(...local(s.at)) < 50).length >= 4, 'four round the crossroads');
});
