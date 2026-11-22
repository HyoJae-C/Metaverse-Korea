import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadRegionMap, districtBoxes } from '../src/core/districts.js';
import { DISTRICT_NAME } from '../src/ui/district-names.js';
import { wherePlaces, whereText, whereAt, PLACES, NOT_A_PLACE } from '../src/admin/where-name.js';
import { STAMPS } from '../src/data/stamps.js';

const dir = new URL('../public/regions/another-seoul/', import.meta.url);
const json = async (f) => JSON.parse(await readFile(new URL(f, dir), 'utf8'));
const region = await json('region.json');
const map = await loadRegionMap(region, json);
const boxes = districtBoxes(map);
const stores = (await json('stores.json')).stores;
const w = wherePlaces({ map, boxes, stores, stations: region.subway.stations, gu: (await json('seoul.json')).gu });

test('a player at Ttukseom park is not just "Seongsu"', () => {
  assert.equal(whereText(w, 283.8, 419.7), 'Ttukseom Han River Park · Gwangjin-gu');
  assert.equal(whereAt(w, -334.6, 92).place, 'Seoul Forest');
  assert.equal(whereAt(w, -1474.5, -187.3).place, 'N Seoul Tower'); // (Namsan, not "Itaewon")
  assert.equal(whereAt(w, -1300, -680).place, 'Cheonggyecheon Stream');
});

test('every district has a name (add new ones to ui/district-names.js)', () => {
  for (const d of region.districts) assert.ok(DISTRICT_NAME[d.id]?.en, `district "${d.id}" has no name in DISTRICT_NAME`);
});

test('every landmark type is named or listed as not a place', () => {
  const known = new Set([...PLACES.map((p) => p.lm).filter(Boolean), ...NOT_A_PLACE]);
  for (const l of map.landmarks) assert.ok(known.has(l.type), `landmark type "${l.type}": add it to PLACES (with its place name) or NOT_A_PLACE in src/admin/where-name.js`);
});

test('every place in PLACES is still on the map', () => {
  for (const p of PLACES) if (p.lm) assert.ok(map.landmarks.some((l) => l.type === p.lm && (!p.kind || l.kind === p.kind)), `no "${p.lm}" landmark for ${p.name}`);
});

test('every stamp spot and district info centre gets a name, and a gu', () => {
  const byId = new Map(stores.map((s) => [s.id, s]));
  const spots = STAMPS.map((s) => s.place.at && !s.place.room ? s.place.at : byId.get(s.place.store)?.at).filter(Boolean);
  for (const s of stores) if (s.category === 'info') spots.push(s.at);
  for (const [x, z] of spots) {
    const a = whereAt(w, x, z);
    assert.ok(a.place || a.district, `nothing named at ${x}, ${z}`);
    assert.ok(a.gu, `no gu at ${x}, ${z}`);
  }
});

test('outside every district it says so instead of the nearest district', () => {
  assert.match(whereText(w, -2000, 0), /^Between areas/);
});
