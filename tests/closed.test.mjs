import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeDistricts } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';
import { inPoly } from '../src/core/geom.js';
import { GU } from '../scripts/build-closed.mjs';
import { STAMPS } from '../src/data/stamps.js';

const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R)));
const region = read('region.json');
const seoul = read('seoul.json');
const stores = read('stores.json').stores;
const map = mergeDistricts(region.districts.map((d) => ({ ...d, map: read(d.map) })), region.links, region.water, region.closed.rects);
const rects = region.closed.rects;
const collision = new CollisionMap(map.buildings.concat(map.blockers));

// How far (x, z) is from a rectangle (0 inside).
const rectDist = (x, z, [x0, z0, x1, z1]) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
const nearest = (x, z) => Math.min(...rects.map((r) => rectDist(x, z, r)));
const CLEAR = 15; // m: scripts/build-closed.mjs keeps 30

test('only empty land in Seocho, Gangnam and Dongjak is closed', () => {
  assert.ok(rects.length > 20);
  const gu = seoul.gu.filter((g) => GU.includes(g.id));
  for (const [x0, z0, x1, z1] of rects) {
    assert.ok(x1 > x0 && z1 > z0);
    // (A rectangle's cells each have their centre in one of the gu.)
    assert.ok(gu.some((g) => inPoly(x0 + 5, z0 + 5, g.p)) || gu.some((g) => inPoly(x1 - 5, z1 - 5, g.p)), `rect ${x0},${z0} in ${GU}`);
  }
});

test('roads, buildings, parks and shops stay open, with room around them', () => {
  for (const r of map.roads) for (const [x, z] of r.p) assert.ok(nearest(x, z) > CLEAR + (r.w || 6) / 2, `road ${r.n?.en || r.k} at ${x},${z}`);
  for (const b of map.buildings) for (const [x, z] of b.p) assert.ok(nearest(x, z) > CLEAR, `building at ${x},${z}`);
  for (const a of map.areas) if (a.k !== 'water') for (const [x, z] of a.p) assert.ok(nearest(x, z) > CLEAR, `${a.k} at ${x},${z}`);
  for (const s of stores) if (s.at) assert.ok(nearest(...s.at) > CLEAR, `store ${s.id}`);
  for (const st of region.subway.stations) for (const e of st.exits || []) if (e.at) assert.ok(nearest(...e.at) > CLEAR, `exit ${st.id}`);
  for (const s of STAMPS) if (s.place.at && !s.place.store) assert.ok(nearest(...s.place.at) > CLEAR, `stamp ${s.id}`);
  for (const sc of region.screens) assert.ok(nearest(...sc.at) > CLEAR, sc.note);
});

test('you cannot walk into closed land, but Samseong and Banpo are open', () => {
  assert.ok(map.closed.length === rects.length);
  assert.ok(map.blockers.filter((b) => b.d === 'closed').every((b) => b.low)); // the camera looks over it
  assert.ok(collision.blocked(-800, 1200, 0.3)); // Seocho, south of Banpo
  assert.ok(collision.blocked(0, 1400, 0.3)); // Gangnam, south of Samseong
  assert.ok(collision.blocked(-2000, 1100, 0.3)); // Dongjak's bank
  assert.ok(!collision.blocked(163, 990, 0.3)); // Samseong Station corner
  assert.ok(!collision.blocked(-1284, 894.2, 0.3)); // Banpo Bridge's south end
});
