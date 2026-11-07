import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { districtBoxes, districtAt } from '../src/core/districts.js';
import { AREA, GAME_TOPICS, PLACE_TOPICS } from '../src/ui/info-ui.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + f, import.meta.url)));
const region = read('region.json');
const stores = read('stores.json').stores;

test('every district has one Information Center, and the guide knows its name', () => {
  const ids = region.districts.map((d) => d.id);
  for (const id of ids) {
    const here = stores.filter((s) => s.workshop === 'info' && s.district === id);
    assert.equal(here.length, 1, id);
    assert.ok(AREA[id]?.name?.en && AREA[id]?.intro?.en, id);
  }
  assert.equal(stores.filter((s) => s.workshop === 'info').length, ids.length);
});

test('each Information Center stands in its own district', () => {
  const map = { meta: { districts: region.districts }, buildings: [], areas: [] };
  for (const d of region.districts) {
    const m = read(d.map);
    for (const k of ['buildings', 'areas']) for (const b of m[k] || []) map[k].push({ d: d.id, k: b.k, p: b.p.map(([x, z]) => [x + d.offset[0], z + d.offset[1]]) });
  }
  const boxes = districtBoxes(map);
  for (const s of stores.filter((x) => x.workshop === 'info')) assert.equal(districtAt(boxes, ...s.at), s.district, s.id);
});

test('name tag workshops in Seongsu and Hongdae: same tags, different names and looks', () => {
  const tags = stores.filter((s) => s.workshop === 'emblem');
  assert.equal(tags.length, 2);
  assert.notEqual(tags[0].name.en, tags[1].name.en);
  assert.notEqual(tags[0].name.ko, tags[1].name.ko);
  assert.deepEqual(tags.map((s) => s.theme).sort(), ['leather', 'neon']);
});

test('the game guide and the area guide have their own topics', () => {
  assert.ok(GAME_TOPICS.length >= 6);
  assert.ok(PLACE_TOPICS.every((tp) => tp.to && (tp.to.store || tp.to.zone)));
  assert.ok(GAME_TOPICS.some((tp) => tp.to?.workshop === 'emblem')); // nearest name tag workshop
});

test('entering a park, station or train (no shop stations) does not break on the area guide', () => {
  // Those rooms come from park.js / subway.js and have no `stations`, so
  // enterStore must read it with ?. (Ttukseom Han River Park went blank).
  const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.deepEqual(src.match(/if \(built\.stations\.\w+/g) || [], []);
});
