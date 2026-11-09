import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { firstStopSpot } from '../src/game/first-stop.js';
import { BUKCHON } from '../src/data/bukchon.js';

const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));

test('new players start just inside Bukchon\'s gate, facing up into the village', () => {
  const f = firstStopSpot(region);
  assert.equal(f.district, 'bukchon');
  const off = region.districts.find((d) => d.id === 'bukchon').offset;
  const [lx, lz] = [f.x - off[0], f.z - off[1]];
  const [x0, z0, x1, z1] = BUKCHON.area;
  assert.ok(lx > x0 && lx < x1 && lz < z0 && lz > z1, 'inside the village');
  assert.ok(lz > BUKCHON.hill.foot, 'on the flat yard below the hill');
  const [qx0, qz0, qx1] = BUKCHON.quiet[0].concat(BUKCHON.quiet[1]);
  assert.ok(!(lx > qx0 && lx < qx1 && lz < qz0), 'not in the Quiet Zone');
  const gate = BUKCHON.gates.find((g) => g.main).at;
  assert.ok(Math.hypot(lx - gate[0], lz - gate[1]) < 20, 'a few steps from the gate');
  assert.ok(Math.abs(Math.sin(f.ry)) < 0.01 && Math.cos(f.ry) < 0, 'facing north (up the village)');
});

test('without a first stop, everyone starts at the square as before', () => {
  assert.equal(firstStopSpot({ spawn: {} }), null);
  assert.equal(firstStopSpot({ spawn: { first: { district: 'nowhere', at: [0, 0] } }, districts: [] }), null);
  assert.equal(firstStopSpot(null), null);
});
