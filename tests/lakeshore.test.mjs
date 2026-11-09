import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lakeHoles } from '../src/core/lakeshore.js';
import { inPoly } from '../src/core/geom.js';

const R = new URL('../public/regions/another-seoul/', import.meta.url);
const readJson = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));

// Seokchon Lake lies below the ground (core/lakeshore.js): the shore is cut
// out of the ground, the flat water areas are left to the lakeshore, and the
// lamps and benches stand on the walk's land, not over the water.
test('Seokchon Lake: sunk below the ground, lamps and benches on land', async () => {
  const map = readJson('districts/songpa.json');
  const shore = map.landmarks.find((l) => l.type === 'lakeshore');
  assert.ok(shore, 'a lakeshore landmark');
  const offset = readJson('region.json').districts.find((d) => d.id === 'songpa').offset;
  const [hole] = lakeHoles([{ ...shore, x: offset[0], z: offset[1] }]);
  assert.deepEqual(hole[0], [shore.lakes[0].shore[0][0] + offset[0], shore.lakes[0].shore[0][1] + offset[1]], 'holes in world metres');
  const lake = shore.lakes[0];
  const lakeWater = map.areas.filter((a) => a.k === 'water' && a.sunk);
  assert.ok(lakeWater.length && lakeWater.every((a) => a.sunk), 'the flat water is not drawn on the street');
  for (const [x, z] of [...shore.lamps, ...shore.benches]) assert.ok(!inPoly(x, z, lake.shore), `on land: ${x}, ${z}`);
  // The two lakes are one water, joined under Songpa-daero, which crosses on a bridge.
  const daero = map.roads.find((r) => r.n?.en === 'Songpa-daero');
  assert.ok(daero.p.some(([x, z]) => inPoly(x, z, lake.shore)), 'Songpa-daero runs over the water');
  assert.ok(shore.bridges.some((b) => b.w >= daero.w), 'on a bridge as wide as the road');
});
