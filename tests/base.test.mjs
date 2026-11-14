import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';
import { toGame, inPolygon } from '../src/core/seoul-grid.js';
import { WIDTH, REACH, baseBoxes } from '../scripts/build-base.mjs';

// The base map (scripts/build-base.mjs): all of Seoul's big roads, water and
// green at 1/4 under the districts, from OpenStreetMap. Land with no district
// has only these roads, on their real lines, and is closed either side.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const rj = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = rj('region.json'), seoul = rj('seoul.json'), base = rj(region.base), green = rj(region.baseGreen);
const osm = JSON.parse(readFileSync(new URL('../scripts/data/seoul/roads.json', import.meta.url), 'utf8'));
const map = await loadRegionMap(region, async (f) => rj(f));
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const samples = (p, step) => p.slice(1).flatMap((b, i) => { const a = p[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); return Array.from({ length: n + 1 }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); });

test('the base map is in the region, credited, and small enough to fetch at the start', () => {
  assert.equal(region.base, 'base.json');
  assert.match(base.credit, /OpenStreetMap/);
  const gz = gzipSync(readFileSync(new URL(region.base, R))).length;
  assert.ok(gz < 75 * 1024, `base.json is ${Math.round(gz / 1024)} KB gzipped`);
  assert.ok(base.roads.length > 150 && base.decks.length > 20);
});

test('base roads are big streets inside Seoul, in the joined map as base roads', () => {
  const joined = map.roads.filter((r) => r.base);
  assert.equal(joined.length, base.roads.length);
  assert.ok(joined.every((r) => r.d === 'base'));
  for (const r of base.roads) {
    assert.ok(r.k in WIDTH && r.w === WIDTH[r.k], `${r.k} ${r.w}`);
    assert.ok(r.p.length > 1);
  }
  // Inside Seoul (a road may end a few metres over the border).
  const out = base.roads.flatMap((r) => r.p).filter(([x, z]) => !seoul.gu.some((g) => inPolygon(x, z, g.p)));
  assert.ok(out.length < base.roads.length * 0.25, `${out.length} points outside Seoul`);
});

test('base roads are on their real OpenStreetMap lines at 1/4 (but for the short joins to district roads)', () => {
  // The real lines in a grid of 50 m cells.
  const grid = new Map();
  for (const w of osm.roads) {
    const p = w.p.map(([lat, lon]) => toGame(lat, lon));
    for (let i = 1; i < p.length; i++) {
      for (let cx = Math.floor(Math.min(p[i - 1][0], p[i][0]) / 50) - 1; cx <= Math.floor(Math.max(p[i - 1][0], p[i][0]) / 50) + 1; cx++) for (let cz = Math.floor(Math.min(p[i - 1][1], p[i][1]) / 50) - 1; cz <= Math.floor(Math.max(p[i - 1][1], p[i][1]) / 50) + 1; cz++) {
        const k = cx + ',' + cz; if (!grid.has(k)) grid.set(k, []); grid.get(k).push([p[i - 1], p[i]]);
      }
    }
  }
  let n = 0, off = 0, worst = 0;
  for (const r of base.roads) for (const [x, z] of samples(r.p, 5)) {
    const d = Math.min(Infinity, ...(grid.get(Math.floor(x / 50) + ',' + Math.floor(z / 50)) || []).map(([a, b]) => segDist(x, z, a, b)));
    n++;
    if (d > 2) off++;
    if (d > worst) worst = d;
  }
  assert.ok(off / n < 0.03, `${((off / n) * 100).toFixed(1)}% of the base roads more than 2 m off the real line`);
  assert.ok(worst < 45, `farthest ${worst.toFixed(1)} m (a join reaches at most 45 m)`);
});

test('you can walk every base road: nothing closed, no water and no wall on it', () => {
  const solid = new CollisionMap(map.buildings.concat(map.blockers));
  for (const d of map.decks) solid.addDeck(d);
  const hits = [];
  for (const r of base.roads) for (const [x, z] of samples(r.p, 2)) if (solid.blocked(x, z, 0.5)) { hits.push(`${r.n?.en || r.n?.ko || r.k} at ${Math.round(x)}, ${Math.round(z)}`); break; }
  assert.deepEqual(hits, []);
});

test('off a base road the land with nothing built is closed', () => {
  const solid = new CollisionMap(map.buildings.concat(map.blockers));
  for (const d of map.decks) solid.addDeck(d);
  // 40 m to the side of base roads, clear of every district: closed, most of the time (another road may run there).
  const boxes = baseBoxes(region, Object.fromEntries(region.districts.map((d) => [d.map, rj(d.map)])));
  const far = (x, z) => !boxes.some((b) => x >= b.x0 + REACH - 60 && x <= b.x1 - REACH + 60 && z >= b.z0 + REACH - 60 && z <= b.z1 - REACH + 60); // (60 m clear of every district's box)
  let n = 0, shut = 0;
  for (const r of base.roads) for (let i = 1; i < r.p.length; i++) {
    const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i], l = Math.hypot(bx - ax, bz - az);
    if (l < 60) continue;
    const mx = (ax + bx) / 2 - ((bz - az) / l) * 40, mz = (az + bz) / 2 + ((bx - ax) / l) * 40;
    if (!far(mx, mz) || !seoul.gu.some((g) => inPolygon(mx, mz, g.p))) continue;
    n++;
    if (solid.blocked(mx, mz, 0.5)) shut++;
  }
  assert.ok(n > 50 && shut / n > 0.7, `${shut} of ${n} spots beside base roads are closed`);
});

test('bridges: a deck wherever a base road is over water, and the Han can be crossed far from the districts', () => {
  const water = map.areas.filter((a) => a.k === 'water');
  const wet = (x, z) => water.some((a) => inPolygon(x, z, a.p) && !(a.holes || []).some((h) => inPolygon(x, z, h)));
  let over = 0;
  for (const r of base.roads) for (const [x, z] of samples(r.p, 3)) if (wet(x, z)) { over++; assert.ok(map.decks.some((d) => inPolygon(x, z, d)), `no deck at ${x.toFixed(0)}, ${z.toFixed(0)}`); }
  assert.ok(over > 300, `${over} samples over water`);
  // A bridge between two gu that have districts is whole;
  // one into a gu with nothing built (Gayang Bridge, Mapo to Gangseo) is left out, not half built.
  assert.ok(base.roads.some((r) => samples(r.p, 3).filter(([px, pz]) => wet(px, pz)).length > 60), 'a whole bridge over the Han');
  const [gx, gz] = toGame(37.5725, 126.862); // (mid-river)
  assert.ok(!base.roads.some((r) => samples(r.p, 3).some(([px, pz]) => Math.hypot(px - gx, pz - gz) < 100 && wet(px, pz))), 'no half of Gayang Bridge');
});

test('the base is only near what is built: no base road or green far from every district, and an empty gu is closed', () => {
  const boxes = baseBoxes(region, Object.fromEntries(region.districts.map((d) => [d.map, rj(d.map)])));
  const near = (x, z, pad) => boxes.some((b) => x >= b.x0 - pad && x <= b.x1 + pad && z >= b.z0 - pad && z <= b.z1 + pad);
  assert.equal(REACH, 200);
  // (A cut end may join or round off a few metres on.)
  for (const r of base.roads) for (const [x, z] of r.p) assert.ok(near(x, z, 50), `${r.n?.ko || r.k} at ${Math.round(x)}, ${Math.round(z)} is far from every district`);
  for (const a of green.areas) for (const [x, z] of a.p) assert.ok(near(x, z, 5), `green at ${Math.round(x)}, ${Math.round(z)}`);
  const empty = seoul.gu.filter((g) => !(g.districts || []).length);
  assert.ok(empty.length > 5);
  const solid = new CollisionMap(map.buildings.concat(map.blockers));
  for (const g of empty) {
    const n = g.p.length, x = g.p.reduce((t, q) => t + q[0], 0) / n, z = g.p.reduce((t, q) => t + q[1], 0) / n;
    if (!inPolygon(x, z, g.p) || near(x, z, 0)) continue;
    assert.ok(solid.blocked(x, z, 0.5) || map.areas.some((a) => a.k === 'water' && inPolygon(x, z, a.p)), `${g.id}'s middle is open`);
  }
});

test('no base road lies on a sunken stream or crosses it (Cheonggyecheon: its trench and bridges are the district\'s)', () => {
  assert.ok(map.streams.length > 0);
  for (const st of map.streams) {
    const line = st.path.map(([x, z]) => [st.at[0] + x, st.at[1] + z]);
    for (const r of base.roads) for (const [x, z] of samples(r.p, 2)) {
      const d = Math.min(...line.slice(1).map((b, i) => segDist(x, z, line[i], b)));
      assert.ok(d > st.w / 2 + 2, `${r.n?.ko || r.k} is ${d.toFixed(1)} m from the middle of ${st.id} at ${Math.round(x)}, ${Math.round(z)}`);
    }
  }
});

test('base water and green keep out of the districts (their own maps rule there)', () => {
  // (Water comes with the base; parks and woods in their own file after the start: game/base-green.js.)
  assert.ok(base.areas.length && base.areas.every((a) => a.k === 'water'));
  assert.ok(green.areas.length && green.areas.every((a) => a.k === 'park'));
  const seongsu = [0, 0], gwanghwamun = map.meta.districts.find((d) => d.id === 'gyeongbokgung').offset;
  for (const [x, z] of [seongsu, gwanghwamun]) assert.ok(![...base.areas, ...green.areas].some((a) => inPolygon(x, z, a.p)), `base area over ${x}, ${z}`);
});
