import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The Han River Boat Taxi (scripts/build-boat-taxi.mjs, core/boat-taxi.js,
// game/boat-taxi.js): the real Han River Bus piers at 1/4 and the boat's trip.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { loadRegionMap } = await import('../src/core/districts.js');
const { CollisionMap, pointInPoly } = await import('../src/core/collision.js');
const { toGame } = await import('../src/core/seoul-grid.js');
const { BOAT_TAXI, lineLengths, pointAt, timetable, boatAt, boatPose, nextBoat, rideTime, pierAt } = await import('../src/core/boat-taxi.js');
const { buildBoatTaxi, PIERS, BOAT: BUILD_BOAT } = await import('../scripts/build-boat-taxi.mjs');
const { buildHanPark } = await import('../src/core/han-park.js');
const { clearBridges } = await import('../src/game/han-parks.js');

const R = new URL('../public/regions/another-seoul/', import.meta.url);
const rj = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = rj('region.json');
const data = rj('boat-taxi.json');
const map = await loadRegionMap(region, async (f) => rj(f));
const osm = JSON.parse(readFileSync(new URL('../scripts/data/hangang-bus-osm.json', import.meta.url), 'utf8'));
const stores = rj('stores.json').stores;
const water = map.areas.filter((a) => a.k === 'water');
const inWater = (x, z) => water.some((w) => pointInPoly(x, z, w.p));
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const CAR_FREE = new Set(['walk', 'footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track', 'corridor']);

test('boat-taxi.json is what the build script makes, in the region and joined to the map', async () => {
  assert.equal(region.boatTaxi, 'boat-taxi.json');
  assert.deepEqual(JSON.parse(JSON.stringify(await buildBoatTaxi())), data, 'run node scripts/build-boat-taxi.mjs');
  assert.match(data.credit, /OpenStreetMap/);
  assert.equal(map.boatTaxi.piers.length, data.piers.length);
  const decks = new Set(map.decks.map((q) => JSON.stringify(q)));
  for (const p of data.piers) assert.ok(decks.has(JSON.stringify(p.dock)) && decks.has(JSON.stringify(p.gang)), `${p.id}: its deck and gangway are walkable`);
});

test('the piers: the real ones in built districts, west to east (Yozi 2026-11-18)', () => {
  assert.deepEqual(data.piers.map((p) => p.id), ['mangwon', 'yeouido', 'apgujeong', 'seoul-forest', 'ttukseom', 'jamsil']);
  for (let i = 1; i < data.piers.length; i++) assert.ok(data.piers[i].s > data.piers[i - 1].s, 'in order along the line');
  assert.equal(BUILD_BOAT.l, 12);
  for (const p of data.piers) for (const k of ['ko', 'en', 'ja', 'zh']) assert.ok(p.name[k], `${p.id} ${k}`);
});

test('each pier is on its real Han River Bus terminal (within 15 m at 1/4)', () => {
  for (const p of data.piers) {
    const e = osm.elements.find((q) => q.id === p.osm);
    const g = e.geometry.map(([a, b]) => toGame(a, b));
    const cx = g.reduce((s, q) => s + q[0], 0) / g.length, cz = g.reduce((s, q) => s + q[1], 0) / g.length;
    const off = Math.hypot(p.at[0] - cx, p.at[1] - cz);
    assert.ok(off <= 15, `${p.id} ${off.toFixed(1)} m off`);
    if (off > 0.2) assert.ok(p.why, `${p.id}: why it moved`);
    assert.ok(p.l >= 10 && p.l <= 17 && p.w >= 4 && p.w <= 7, `${p.id}: about its real size at 1/4 (${p.l} x ${p.w})`);
  }
  const ids = new Set(PIERS.map((p) => p.osm));
  assert.ok(!ids.has(1418419418), 'not Oksu yet (no district there)');
});

test('each pier floats on the river, its gangway lands on open ground off the roads', () => {
  const col = new CollisionMap([...map.buildings.map((b) => ({ p: b.p })), ...map.blockers.map((b) => ({ p: b.p, low: true }))]);
  for (const d of map.decks) col.addDeck(d);
  for (const p of data.piers) {
    for (const [x, z] of p.dock) assert.ok(inWater(x, z), `${p.id}: deck corner in the river`);
    assert.ok(inWater(...p.berth), `${p.id}: the boat's berth on the river`);
    // The boat lies alongside, clear of the deck, and comes in parallel to it.
    const c = Math.cos(p.bry), sn = Math.sin(p.bry);
    const hull = [[-2, -6], [2, -6], [2, 6], [-2, 6], [0, 0]].map(([u, v]) => [p.berth[0] + u * c + v * sn, p.berth[1] - u * sn + v * c]);
    for (const q of hull) assert.ok(!pointInPoly(q[0], q[1], p.dock), `${p.id}: the boat clear of the deck`);
    for (const k of [-3, 3]) {
      const d = pointAt(data.route, lineLengths(data.route), p.s + k);
      if (p.s + k < 0 || p.s + k > lineLengths(data.route).at(-1)) continue;
      assert.ok(Math.abs(d.dx * sn + d.dz * c) > 0.99, `${p.id}: alongside the deck at ${k} m`);
    }
    for (let k = -BUILD_BOAT.l / 2; k <= BUILD_BOAT.l / 2; k += 1) {
      const d = pointAt(data.route, lineLengths(data.route), p.s + k);
      assert.ok(inWater(d.x, d.z), `${p.id}: the boat alongside is on the water`);
    }
    // Walk from the board spot to the bank: never blocked.
    const [ax, az] = p.board, [bx, bz] = p.land;
    for (let t = 0; t <= 1; t += 0.05) {
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      assert.ok(!col.blocked(x, z, 0.35), `${p.id}: walking ashore at ${t.toFixed(2)} (${x.toFixed(1)}, ${z.toFixed(1)})`);
    }
    assert.ok(!inWater(bx, bz), `${p.id}: the gangway's foot is on land`);
    for (const r of map.roads) {
      if (CAR_FREE.has(r.k)) continue;
      for (let i = 1; i < r.p.length; i++) assert.ok(segDist(bx, bz, r.p[i - 1], r.p[i]) > (r.w || 6) / 2 + 0.5, `${p.id}: the gangway lands on a ${r.k} road`);
    }
    for (const b of map.buildings) for (const [x, z] of [...p.dock, ...p.gang]) assert.ok(!pointInPoly(x, z, b.p), `${p.id}: not in a building`);
    assert.equal(pierAt(data.piers, ...p.board), data.piers.indexOf(p), `${p.id}: the button shows on its deck`);
  }
  assert.equal(pierAt(data.piers, 0, 0), -1, 'not at Seongsu Station');
});

test('the piers in Han River parks: the railing opens for the gangway, nothing of the park is in the way', () => {
  for (const d of region.districts) {
    const dm = rj(d.map);
    for (const l0 of dm.landmarks || []) {
      if (l0.type !== 'hanpark') continue;
      const l = { ...l0, x: l0.x + d.offset[0], z: l0.z + d.offset[1] };
      const c = Math.cos(l.ry || 0), s = Math.sin(l.ry || 0);
      const toLocal = (x, z) => { const dx = x - l.x, dz = z - l.z; return [dx * c - dz * s, dx * s + dz * c]; };
      const decks = map.decks.map((q) => q.map(([x, z]) => toLocal(x, z)));
      const store = stores.find((q) => q.id === l.store);
      const b = buildHanPark(store, clearBridges(l.layout || {}, decks));
      const col = new CollisionMap(b.colliders);
      for (const p of data.piers) {
        const [ax, az] = toLocal(...p.board), [bx, bz] = toLocal(...p.land);
        const [x0, z0, x1, z1] = l.bounds;
        if (Math.max(ax, bx) < x0 - 5 || Math.min(ax, bx) > x1 + 5 || Math.max(az, bz) < z0 - 5 || Math.min(az, bz) > z1 + 5) continue;
        for (let t = 0; t <= 1; t += 0.05) assert.ok(!col.blocked(ax + (bx - ax) * t, az + (bz - az) * t, 0.35), `${l.store}: ${p.id}'s gangway clear of the park at ${t.toFixed(2)}`);
        // Clear of the park's own fishing pier and duck dock.
        for (const dk of b.decks) for (const q of p.dock) assert.ok(!pointInPoly(...toLocal(...q), dk), `${p.id} clear of ${l.store}'s pier`);
        // Off the duck boats' water and the moored warship (Mangwon).
        const w = b.duckArea?.water;
        for (const q of [...p.dock, p.berth]) {
          const [u, v] = toLocal(...q);
          if (w) assert.ok(u < w.minX - 3 || u > w.maxX + 3 || v < w.minZ - 3, `${p.id} clear of ${l.store}'s duck boats (${u.toFixed(1)}, ${v.toFixed(1)})`);
          for (const [sx, sz, len = 40] of l.layout.ships || []) assert.ok(Math.abs(u - sx) > len / 2 + 8 || Math.abs(v - sz) > 3.5 + 8, `${p.id} clear of the warship`);
        }
      }
    }
  }
});

test('the line is the real route, on the water all the way, through each berth', () => {
  const lens = lineLengths(data.route);
  assert.ok(lens.at(-1) > 5000 && lens.at(-1) < 5600, `${lens.at(-1)} m from Mangwon to Jamsil`);
  for (let s = 0; s <= lens.at(-1); s += 4) { const d = pointAt(data.route, lens, s); assert.ok(inWater(d.x, d.z), `on the water at ${s} m (${d.x.toFixed(0)}, ${d.z.toFixed(0)})`); }
  for (const p of data.piers) { const d = pointAt(data.route, lens, p.s); assert.ok(Math.hypot(d.x - p.berth[0], d.z - p.berth[1]) < 0.2, `${p.id} berth on the line`); }
});

test('the timetable: a boat every 4 minutes each way at every pier (Yozi 2026-11-18), stopping at each', () => {
  const { piers } = data, tt = timetable(piers);
  assert.equal(BOAT_TAXI.every, 240);
  assert.ok(tt.boats >= 3 && tt.boats <= 6, `${tt.boats} boats`);
  assert.ok(tt.end >= BOAT_TAXI.minEnd, 'a wait at each end');
  assert.ok(Math.abs(tt.legs.at(-1).t1 - tt.round) < 1e-6);
  for (let i = 0; i < piers.length; i++) {
    for (const dir of [1, -1]) {
      if ((i === piers.length - 1 && dir === 1) || (i === 0 && dir === -1)) continue;
      // Over an hour, a boat that way calls here every 240 s.
      const calls = [];
      let was = true;
      for (let t = 0; t < 3600; t += 1) {
        const here = [...Array(tt.boats).keys()].some((b) => { const st = boatAt(tt, piers, b, 1e6 + t); return st.at === i && st.dir === dir; });
        if (here && !was) calls.push(t); // a boat comes in
        was = here;
      }
      assert.ok(calls.length >= 14, `pier ${i} dir ${dir}: ${calls.length} calls an hour`);
      for (let k = 1; k < calls.length; k++) assert.ok(Math.abs(calls[k] - calls[k - 1] - 240) <= 1, `pier ${i} dir ${dir}: ${calls[k] - calls[k - 1]}`);
      for (let t = 0; t < 600; t += 37) { const nb = nextBoat(tt, i, dir, 1e6 + t); assert.ok(nb.wait <= 240 && nb.leaves > nb.wait, 'never more than 4 minutes'); }
    }
  }
  const whole = rideTime(tt, 0, piers.length - 1);
  assert.ok(whole > 240 && whole < 360, `Mangwon to Jamsil ${Math.round(whole)} s aboard`);
  assert.ok(Math.abs(rideTime(tt, 2, 3) - rideTime(tt, 3, 2)) < 1e-6);
});

test('the boats glide (no jumps), keep apart, and stay on the water all round', () => {
  const { piers, route } = data, tt = timetable(piers), lens = lineLengths(route);
  const pose = (b, now) => { const st = boatAt(tt, piers, b, now); return { ...st, ...boatPose(route, lens, piers, st.s, st.dir) }; };
  const prev = [];
  for (let t = 0; t < tt.round; t += 0.5) {
    const ps = [...Array(tt.boats).keys()].map((b) => pose(b, 5e5 + t));
    ps.forEach((p, b) => {
      assert.ok(inWater(p.x, p.z), `boat ${b} on the water at ${t}`);
      for (const pr of piers) assert.ok(!pointInPoly(p.x, p.z, pr.dock), `boat ${b} not on ${pr.id}'s deck`);
      const q = prev[b];
      if (q && q.dir === p.dir) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) < BOAT_TAXI.speed * 0.5 * 1.5, `boat ${b} jumps at ${t}`); // (outside a bend, 7 m off the line, a boat goes a little faster)
    });
    for (let a = 0; a < ps.length; a++) for (let b = a + 1; b < ps.length; b++) assert.ok(Math.hypot(ps[a].x - ps[b].x, ps[a].z - ps[b].z) > 4, `boats ${a} and ${b} touch at ${t} (${ps[a].x.toFixed(0)}, ${ps[a].z.toFixed(0)})`);
    prev.splice(0, prev.length, ...ps);
  }
});
