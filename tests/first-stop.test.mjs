import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { firstStopSpot, startList, startSpot, busiestStart, ANY } from '../src/game/first-stop.js';
import { BUKCHON } from '../src/data/bukchon.js';
import { TRIP_ROUTES } from '../src/core/quests.js';
import { EN } from '../src/i18n/en.js';

const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));

test('new players start just inside Bukchon\'s gate, facing up into the village, unless they pick another start', () => {
  const f = firstStopSpot(region);
  assert.equal(f.k, 'tour');
  assert.equal(f.district, 'bukchon');
  const off = region.districts.find((d) => d.id === 'bukchon').offset;
  const [lx, lz] = [f.x - off[0], f.z - off[1]];
  const [x0, z0, x1, z1] = BUKCHON.area;
  assert.ok(lx > x0 && lx < x1 && lz < z0 && lz > z1, 'inside the village');
  assert.ok(lz > BUKCHON.hill.foot, 'on the flat yard below the hill');
  const gate = BUKCHON.gates.find((g) => g.main).at;
  assert.ok(Math.hypot(lx - gate[0], lz - gate[1]) < 20, 'a few steps from the gate');
  assert.ok(Math.abs(Math.sin(f.ry)) < 0.01 && Math.cos(f.ry) < 0, 'facing north (up the village)');
});

test('the start screen offers sights, shopping, an outing and a quiet walk, each with a spot, a trip and words', () => {
  assert.deepEqual(startList(region).map((s) => s.k), ['tour', 'shop', 'activity', 'heal']);
  for (const s of startList(region)) {
    const sp = startSpot(region, s.k);
    assert.ok(sp, s.k);
    assert.ok(s.icon, s.k + ' icon');
    if (sp.square) continue; // beside the square guide, with the square's own trip
    assert.ok([sp.x, sp.z, sp.ry].every(Number.isFinite), s.k);
    assert.ok(TRIP_ROUTES.includes(sp.trip), s.k + ' trip');
  }
  for (const k of [...startList(region).map((s) => s.k), ANY, 'where']) assert.ok(EN['start.' + k], 'start.' + k);
  assert.equal(startSpot(region, 'shop').square, true);
});

test('"anywhere" goes where most people are; nobody about, any start at random', () => {
  const keys = ['tour', 'shop', 'activity', 'heal'];
  assert.equal(busiestStart(keys, [0, 3, 1, 0]), 'shop');
  assert.equal(busiestStart(keys, [2, 0, 5, 5], () => 0), 'activity');
  assert.equal(busiestStart(keys, [2, 0, 5, 5], () => 0.99), 'heal');
  assert.equal(busiestStart(keys, null, () => 0.5), 'activity');
  assert.equal(busiestStart([], [1]), null);
});

test('without starts, everyone starts at the square as before', () => {
  assert.equal(firstStopSpot({ spawn: {} }), null);
  assert.equal(startSpot({ spawn: { starts: [{ k: 'x', district: 'nowhere', at: [0, 0] }] }, districts: [] }, 'x'), null);
  assert.equal(firstStopSpot(null), null);
});
