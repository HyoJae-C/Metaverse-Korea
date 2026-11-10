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
