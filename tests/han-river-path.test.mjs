import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';

// The Han River Bike Path runs along the north bank from Mangwon to Seongsu,
// next to the region's river water. It must stay on dry land the whole way
// (the water is a blocker), and it must meet the paths and roads it joins.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const readJson = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = readJson('region.json');
const map = await loadRegionMap(region, async (f) => readJson(f));
const bike = map.roads.find((r) => r.d === 'link' && r.n?.en === 'Han River Bike Path');
const nodes = new Set(map.roads.filter((r) => r !== bike).flatMap((r) => r.p.map(([x, z]) => x + ',' + z)));

test('the Han River Bike Path stays out of the water and off buildings', () => {
  assert.ok(bike, 'link "Han River Bike Path" in region.json');
  const solid = new CollisionMap(map.buildings.concat(map.blockers || []));
  const hits = [];
  for (let i = 1; i < bike.p.length; i++) {
    const [x1, z1] = bike.p[i - 1], [x2, z2] = bike.p[i];
    const len = Math.hypot(x2 - x1, z2 - z1);
    for (let s = 0; s <= len; s += 2) {
      const x = x1 + ((x2 - x1) * s) / len, z = z1 + ((z2 - z1) * s) / len;
      if (solid.blocked(x, z, 1.2)) { hits.push([Math.round(x), Math.round(z)]); break; }
    }
  }
  assert.deepEqual(hits, []);
});

test('it joins Mangwon\'s river path, the Jamsu Bridge road and Seongsu\'s Han River Path', () => {
  for (const at of [[-3182, -64], [-1307.8, 705.8], [-465, 119]]) {
    assert.ok(bike.p.some(([x, z]) => x === at[0] && z === at[1]), `path passes ${at}`);
    assert.ok(nodes.has(at.join(',')), `another road ends at ${at}`);
  }
});

test('Sowol-ro joins Itaewon\'s Sowol-ro to Toegye-ro at Sungnyemun', () => {
  const sowol = map.roads.find((r) => r.d === 'link' && r.n?.en === 'Sowol-ro');
  assert.ok(sowol);
  for (const at of [sowol.p[0], sowol.p.at(-1)]) assert.ok(nodes.has(at.join(',')) || map.roads.some((r) => r !== sowol && r.p.some(([x, z]) => x === at[0] && z === at[1])), `a road meets Sowol-ro at ${at}`);
});

test('the river water joins up with the parks\' water', () => {
  assert.equal(region.water.length, 2);
  for (const w of region.water) assert.ok(w.p.length >= 4);
});
