// The Han River parks open to the street (stores.json "open", core/park.js):
// each lies on a real bank of the world's river. Its lawn must be dry land
// with nothing standing on it, its pier and duck boats must float on the
// street's water, and a taxi or the map drops you just behind the lawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inPolygon } from '../src/core/seoul-grid.js';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const stores = read('stores.json').stores;
const map = await loadRegionMap(region, async (f) => read(f));
const water = map.areas.filter((a) => a.k === 'water').map((a) => a.p);
const wet = (x, z) => water.some((p) => inPolygon(x, z, p));
const solid = new CollisionMap(map.buildings.concat(map.blockers));
const open = stores.filter((s) => s.open);

test('the Han River parks are open to the street', () => {
  assert.ok(open.length >= 1, `${open.length} open parks`); // (the rest are laid on the street: tests/han-park.test.mjs)
  for (const s of open) assert.equal(s.category, 'park', s.id);
});

for (const park of open) {
  test(`${park.id}: its lawn on the bank, its pier and boats on the river`, () => {
    const { at: [ox, oz], ry } = park.open;
    // The park's own metres (its bank is z = -4) → world, and back.
    const toWorld = (x, z) => [ox + x * Math.cos(ry) + z * Math.sin(ry), oz - x * Math.sin(ry) + z * Math.cos(ry)];
    const toLocal = (x, z) => { const dx = x - ox, dz = z - oz; return [dx * Math.cos(ry) - dz * Math.sin(ry), dx * Math.sin(ry) + dz * Math.cos(ry)]; };
    const buildings = map.buildings.map((b) => b.p);
    for (let x = -26; x <= 26; x += 2) for (let z = -3.5; z <= 14; z += 1.5) {
      const [wx, wz] = toWorld(x, z);
      assert.ok(!wet(wx, wz), `lawn ${x},${z} is on land`);
      assert.ok(!buildings.some((p) => inPolygon(wx, wz, p)), `lawn ${x},${z} has no building on it`);
    }
    // The pier's end, the duck boats' dock and the water off the railing.
    for (const [x, z] of [[0, -11.5], [7.6, -5.7], [15.4, -5.7], [-10, -5], [20, -5]]) assert.ok(wet(...toWorld(x, z)), `${x},${z} is on the river`);
    // No street bench, sign or arch on the lawn.
    for (const l of map.landmarks.filter((q) => ['bench', 'sign', 'arch'].includes(q.type) && Number.isFinite(q.x))) {
      const [lx, lz] = toLocal(l.x, l.z);
      assert.ok(Math.abs(lx) > 27 || lz > 15 || lz < -4, `${l.type} at ${l.x},${l.z} stands on the lawn (${lx.toFixed(1)}, ${lz.toFixed(1)})`);
    }
    // A taxi or the map drops you just behind the lawn, where you can stand.
    const [bx, bz] = toWorld(0, 15);
    assert.ok(Math.hypot(park.at[0] - bx, park.at[1] - bz) < 1.5, 'its "at" is just behind the lawn');
    assert.ok(!solid.blocked(...park.at, 0.4), 'you can stand where you are dropped');
  });
}
