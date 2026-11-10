import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';

// The Han River bike paths (scripts/build-bike-paths.mjs, OpenStreetMap):
// the north bank from Mangwon to Seongsu, and the south bank from the
// Saetgang's mouth to Banpo and on to Jamsil Bridge, next to the region's
// river water. They must stay on dry land the whole way (the water is a
// blocker), open through the closed land, and meet the paths and roads they
// join.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const readJson = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = readJson('region.json');
const map = await loadRegionMap(region, async (f) => readJson(f));
const bike = map.roads.find((r) => r.d === 'link' && r.n?.en === 'Han River Bike Path');
const bikes = map.roads.filter((r) => r.bike);
const nodes = new Set(map.roads.filter((r) => r !== bike).flatMap((r) => r.p.map(([x, z]) => x + ',' + z)));

test('the Han River bike paths stay out of the water, off buildings and open through the closed land', () => {
  assert.ok(bike?.bike, 'link "Han River Bike Path" in region.json, drawn as a bike path');
  assert.equal(bikes.length, 4, 'the north bank either side of Seongsu, and the south bank either side of Banpo');
  const solid = new CollisionMap(map.buildings.concat(map.blockers || [])); // (the closed land's blockers too)
  const hits = [];
  for (const r of bikes) {
    for (let i = 1; i < r.p.length; i++) {
      const [x1, z1] = r.p[i - 1], [x2, z2] = r.p[i];
      const len = Math.hypot(x2 - x1, z2 - z1);
      for (let s = 0; s <= len; s += 2) {
        const x = x1 + ((x2 - x1) * s) / len, z = z1 + ((z2 - z1) * s) / len;
        if (solid.blocked(x, z, 1.2)) { hits.push([r.n.en, Math.round(x), Math.round(z)]); break; }
      }
    }
  }
  assert.deepEqual(hits, []);
});

test('the south bank bike path joins Banpo-Jamwon park\'s river path and ends on Jamsil Bridge', () => {
  const south = bikes.filter((r) => r !== bike);
  const banpo = map.roads.find((r) => r.d === 'banpo-jamwon' && r.n?.en === 'Han River path');
  for (const end of [banpo.p[0], banpo.p.at(-1)]) assert.ok(south.some((r) => r.p.some(([x, z]) => x === end[0] && z === end[1])), `meets Banpo's path at ${end}`);
  const daero = map.roads.find((r) => r.n?.en === 'Songpa-daero');
  const last = south.map((r) => r.p.at(-1)).find(([x]) => x > 0);
  const segDist = ([x, z], [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - t * dx, z - az - t * dz); };
  assert.ok(daero.p.some((q, i) => i > 0 && segDist(last, daero.p[i - 1], q) < 0.2), `ends on Songpa-daero (Jamsil Bridge): ${last}`);
});

test('it joins Mangwon\'s river path, the Jamsu Bridge road and Seongsu\'s Han River Path', () => {
  const jamsu = map.roads.find((r) => r.n?.en === 'Jamsu Bridge').p[0];
  for (const at of [[-3224.8, -8.4], jamsu, [-465, 119]]) {
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
  assert.equal(region.water.length, 3); // Mangwon past Yeouido to x -1420, on past Banpo Bridge to Seongsu, and Jamsil Bridge east along Songpa
  for (const w of region.water) assert.ok(w.p.length >= 4);
});
