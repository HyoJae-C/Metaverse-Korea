import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LANDMARK_SEARCH, landmarkPlaces, landmarkMatches } from '../src/game/landmark-search.js';
import { loadRegionMap } from '../src/core/districts.js';
import { inPoly } from '../src/core/geom.js';

const base = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(fs.readFileSync(new URL(f, base)));
const map = await loadRegionMap(read('region.json'), async (f) => read(f));
const places = landmarkPlaces(map.landmarks);
const find = (q) => places.filter((p) => landmarkMatches(p, q)).map((p) => p.key);

test('every searchable landmark is on the map', () => {
  assert.equal(places.length, LANDMARK_SEARCH.length, 'a landmark in the search list is missing from the map');
});

test('Sungnyemun, Bosingak and the Gwanghwamun statues can be searched in English and Korean', () => {
  for (const q of ['숭례문', '남대문', 'Sungnyemun', 'namdaemun']) assert.deepEqual(find(q), ['sungnyemun'], q);
  for (const q of ['보신각', 'Bosingak', 'bosin gak']) assert.deepEqual(find(q), ['bosingak'], q);
  assert.deepEqual(find('세종대왕'), ['statue:king']);
  assert.deepEqual(find('Yi Sun-sin'), ['statue:admiral']);
  assert.deepEqual(find('흥인지문'), ['heunginjimun']);
  assert.deepEqual(find(''), [], 'landmarks are not listed until searched for');
});

test('guidance to a landmark ends on open ground, not inside a building or blocker', () => {
  const solid = [...(map.blockers || []), ...map.buildings].filter((b) => b.p);
  for (const p of places) {
    const hit = solid.find((b) => inPoly(p.x, p.z, b.p));
    assert.ok(!hit, `${p.key} ends inside ${JSON.stringify(hit?.why || hit?.k || 'a building')}`);
  }
});

// Yozi 2026-11-16: picking Bongeunsa or Jogyesa on the map led into the middle
// of the main hall (its door ring is where the guide ended, and stepping on it
// walks you into the hall). The map, a taxi and the search take you to the
// temple's way in instead: inside its first gate, Iljumun.
test('the temples are reached at their gate, not at the main hall', () => {
  const stores = read('stores.json').stores;
  const solid = [...(map.blockers || []), ...map.buildings].filter((b) => b.p);
  const gate = {
    'bongeunsa-daeungjeon': (() => { const l = map.landmarks.find((m) => m.type === 'bongeunsa'); return [l.x + l.iljumun[0], l.z + l.iljumun[1]]; })(),
    'jogyesa-daeungjeon': [-1741 + 127.9, -871 + 57.3], // src/data/jogyesa.js iljumun, in the Gyeongbokgung district's offset
  };
  for (const [id, [gx, gz]] of Object.entries(gate)) {
    const s = stores.find((x) => x.id === id);
    assert.ok(Array.isArray(s.go), `${id} has no "go"`);
    const [x, z] = s.go;
    assert.ok(Math.hypot(x - gx, z - gz) < 6, `${id}: guidance ends ${Math.hypot(x - gx, z - gz).toFixed(1)} m from Iljumun`);
    assert.ok(Math.hypot(x - s.at[0], z - s.at[1]) > 20, `${id}: still next to the hall`);
    assert.ok(!solid.find((b) => inPoly(x, z, b.p)), `${id}: "go" is inside a building or blocker`);
  }
  for (const key of ['bongeunsa', 'jogyesa']) {
    const p = places.find((q) => q.key === key), s = stores.find((x) => x.id === `${key}-daeungjeon`);
    assert.ok(Math.hypot(p.x - s.go[0], p.z - s.go[1]) < 0.5, `${key}: the search and the map end in different places`);
  }
  assert.deepEqual(find('조계사'), ['jogyesa']);
  assert.deepEqual(find('봉은사'), ['bongeunsa']);
});
