import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BASE, BASE_MIN, PER_MIN, forestAreas, inForest, leftOwed, loadRent, owed, rentCost, saveRent, RENT_KEY } from '../src/core/tandem-rental.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/map.json', import.meta.url), 'utf8'));
const areas = forestAreas(map.areas);
const booth = map.landmarks.find((l) => l.type === 'tandemrental');

test('the meter: base fare covers the first minutes, then per started minute', () => {
  assert.equal(rentCost(0), BASE);
  assert.equal(rentCost(BASE_MIN * 60000), BASE);
  assert.equal(rentCost(BASE_MIN * 60000 + 1), BASE + PER_MIN);
  assert.equal(rentCost((BASE_MIN + 20) * 60000), BASE + 20 * PER_MIN);
  assert.equal(owed(5 * 60000), 0);
  assert.equal(owed((BASE_MIN + 2) * 60000), 2 * PER_MIN);
  assert.equal(BASE_MIN, 30); // generous on purpose (Yozi)
});

test('a rental left behind is settled up to when it was last seen riding', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  assert.equal(loadRent(storage), null);
  saveRent({ start: 1000, seen: 1000 + (BASE_MIN + 5) * 60000 }, storage);
  const r = loadRent(storage);
  assert.equal(leftOwed(r), 5 * PER_MIN);
  saveRent(null, storage);
  assert.equal(loadRent(storage), null);
  store.set(RENT_KEY, '{"start":5,"seen":1}'); // seen before start: broken, ignored
  assert.equal(loadRent(storage), null);
  assert.ok(!RENT_KEY.startsWith('mk.'), 'stays out of the cloud save');
});

test('Seoul Forest: its park pieces, crossable roads between them, not Seongsu', () => {
  assert.equal(areas.length, 4);
  assert.ok(inForest(-300, 50, areas)); // the main lawn
  assert.ok(inForest(-560, 10, areas)); // the west lawn
  assert.ok(inForest(-330, -100, areas)); // on the road between the north piece and the main one
  assert.ok(inForest(-425, -60, areas)); // on Gosanja-ro
  assert.ok(!inForest(-150, 50, areas)); // Seongsu, east of Wangsimni-ro
  assert.ok(!inForest(-300, 400, areas)); // the river
  assert.ok(!inForest(-270, 240, areas)); // the riverside path
});

test('the booth is in the park, by a path, not on a road or in a building', () => {
  assert.ok(booth);
  assert.ok(inForest(booth.x, booth.z, areas, 0));
  const seg = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; const t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0; return Math.hypot(ax + dx * t - x, az + dz * t - z); };
  let road = Infinity, walk = Infinity;
  for (const r of map.roads) for (let i = 1; i < r.p.length; i++) {
    const d = seg(booth.x, booth.z, r.p[i - 1], r.p[i]) - (r.w || 4) / 2;
    if (r.k === 'walk') walk = Math.min(walk, d); else road = Math.min(road, d);
  }
  assert.ok(walk > 2 && walk < 10, `near a path: ${walk}`);
  assert.ok(road > 10, `off the roads: ${road}`);
});
