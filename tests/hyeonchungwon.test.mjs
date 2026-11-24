import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { inPoly } from '../src/core/skypark-ground.js';
import { hyeonchungHeight, wayNear, flatAt } from '../src/core/hyeonchung-ground.js';
import { createHyeonchungwonWalk, hyeonchungSolids } from '../src/game/hyeonchungwon-walk.js';
import { plotStones, HC_PARK } from '../src/game/hyeonchungwon-park.js';
import { prayerSpots } from '../src/game/prayer.js';
import { HC } from '../scripts/build-hyeonchungwon.mjs';

// Seoul National Cemetery (국립서울현충원, scripts/build-hyeonchungwon.mjs):
// at 1/4 on its real place with Hyeonchungmun on its real spot, the court up
// to the Memorial Tower at 50% (Yozi), every road on its OSM line and
// walkable, plain headstones only, made-up things marked.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = read('region.json');
const hc = read('districts/hyeonchungwon.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/hyeonchungwon-osm.json', import.meta.url), 'utf8'));
const dist = region.districts.find((d) => d.id === 'hyeonchungwon');
const [ox, oz] = dist.offset;
const l = hc.landmarks.find((q) => q.type === 'hyeonchung');
const W = (p) => p.map(([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; });
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const ringDist = (x, z, p) => lineDist(x, z, [...p, p[0]]);
const mid = (p) => p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length], [0, 0]);
const area = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;

test('on its real place: Hyeonchungmun at the anchor, the hill inside the cemetery outline', () => {
  const [ax, az] = toGame(dist.anchor.lat, dist.anchor.lon);
  assert.ok(Math.hypot(ax - ox, az - oz) < 1, 'the offset puts Hyeonchungmun on its real spot');
  assert.deepEqual(l.gate.at, [0, 0]);
  const outer = W(osm.boundary.outer);
  for (const [x, z] of l.foot) assert.ok(inPoly(x, z, outer) || ringDist(x, z, outer) < 1, `the hill's foot at ${x}, ${z} is inside the cemetery`);
  const park = hc.areas.find((a) => a.k === 'park');
  for (const [x, z] of park.p) assert.ok(ringDist(x, z, outer) < 1, `the grounds' outline at ${x}, ${z} on OSM`);
  assert.equal(hc.blockers.length, 1);
  assert.ok(hc.blockers[0].low && hc.blockers[0].hill === 'hyeonchung');
});

test('every road, path and stair is on its OSM line (within 1 m); the terrace stairs are the only made-up way', () => {
  const real = new Map(osm.roads.map((t) => [t.id, W(t.p)]));
  assert.ok(l.trails.length >= 90, `${l.trails.length} ways`);
  for (const t of l.trails) {
    if (t.court) { assert.equal(t.id, 'terrace-stairs'); continue; }
    for (const [x, z] of t.p) assert.ok(lineDist(x, z, real.get(t.id)) < 1, `way ${t.id} at ${x}, ${z}`);
  }
  for (const r of hc.roads) for (const [x, z] of r.p) assert.ok(Math.min(...[...real.values()].map((p) => lineDist(x, z, p))) < 1, `entrance walk at ${x}, ${z}`);
});

test('the ground: level from the main gate to the court, walkable roads, 0 at the foot', () => {
  assert.ok(l.peak.y > 25 && l.peak.y < 40, `peak ${l.peak.y} m (SRTM above the valley floor at 1/4)`);
  let worst = 0;
  // (a road along the grounds' edge keeps its own height: a bank of up to 3.2 m over Hyeonchung-ro's side)
  for (const [x, z] of l.foot) { const n = wayNear(l, x, z); if (!n || n.e > 3) worst = Math.max(worst, hyeonchungHeight(l, x, z)); else assert.ok(hyeonchungHeight(l, x, z) < 3.5, `the edge road at ${x}, ${z}`); }
  assert.ok(worst < 0.5, `the foot meets the ground (${worst.toFixed(2)} m)`);
  const max = { steps: HC.stairMax, service: HC.roadMax, pedestrian: HC.roadMax };
  for (const t of l.trails) {
    const lim = max[t.k] ?? HC.pathMax; // (roads 14°, paths 18°, stairs 31°)
    for (let i = 1; i < t.p.length; i++) {
      const d = Math.hypot(t.p[i][0] - t.p[i - 1][0], t.p[i][1] - t.p[i - 1][1]);
      if (d < 1.5) continue;
      const g = Math.abs(t.p[i][2] - t.p[i - 1][2]) / d; // (heights are rounded to 0.1 m)
      assert.ok(g < lim + 0.11 / d, `way ${t.id} (${t.k}) climbs ${(Math.atan(g) * 180 / Math.PI).toFixed(0)}° at ${t.p[i]}`);
    }
  }
  assert.equal(hyeonchungHeight(l, l.fountain.at[0] + l.fountain.r + 2, l.fountain.at[1]), 0);
  assert.equal(hyeonchungHeight(l, Math.sin(l.gate.ry) * 30, Math.cos(l.gate.ry) * 30), 0, 'the lawn in front of the gate');
});

test('where two ways meet they are at one height', () => {
  for (const t of l.trails) for (const a of [t.p[0], t.p[t.p.length - 1]]) {
    if (flatAt(l, a[0], a[1])) continue;
    const n = wayNear(l, a[0], a[1]);
    assert.ok(n && Math.abs(n.y - a[2]) < 0.6, `a way end at ${a}: the nearest way is at ${n?.y.toFixed(2)} m`);
  }
});

test('the court at 50%: gate, tower and court scaled together about the gate; the terrace and its stairs', () => {
  const k = HC.court / 1; // (times the 1/4 map)
  const gate = W(osm.buildings.find((b) => b.id === 154112554).p);
  const xs = gate.map((q) => q[0] * Math.cos(l.gate.ry) - q[1] * Math.sin(l.gate.ry));
  assert.ok(Math.abs(l.gate.w - (Math.max(...xs) - Math.min(...xs)) * k) < 1.5, `the gate is ${l.gate.w} m across: twice its 1/4 size`);
  const fwd = [-Math.sin(l.gate.ry), -Math.cos(l.gate.ry)];
  const u = l.tower.at[0] * fwd[0] + l.tower.at[1] * fwd[1], v = Math.abs(l.tower.at[0] * fwd[1] - l.tower.at[1] * fwd[0]);
  assert.ok(u > 38 && u < 46 && v < 1.5, `the tower stands ${u.toFixed(1)} m straight behind the gate (21 m at 1/4)`);
  const flats = Object.fromEntries(l.flats.map((f) => [f.k, f]));
  assert.equal(flats.court.y, 0);
  assert.equal(flats.terrace.y, HC.terraceH);
  assert.ok(inPoly(l.tower.at[0], l.tower.at[1], flats.terrace.p), 'the tower stands on the terrace');
  assert.ok(inPoly(l.tribute.at[0], l.tribute.at[1], flats.terrace.p) && l.tribute.y === HC.terraceH);
  const [a, b] = l.stairs.p, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const y = hyeonchungHeight(l, m[0], m[1]);
  assert.ok(y > 0.3 && y < HC.terraceH - 0.3, `halfway up the stairs you stand at ${y.toFixed(2)} m`);
  assert.ok((b[2] - a[2]) / Math.hypot(b[0] - a[0], b[1] - a[1]) < HC.stairMax);
  // straight through the gate's open hall and on to the stairs: nothing in the way
  const solids = hyeonchungSolids(l);
  for (let s = -10; s <= u - 8; s += 0.5) {
    const x = fwd[0] * s, z = fwd[1] * s;
    if (s > u - 12) continue; // (the altar stands before the tower)
    assert.ok(!solids.some((p) => inPoly(x, z, p)), `clear on the axis ${s} m past the gate`);
  }
  assert.ok(solids.some((p) => inPoly(l.tower.at[0], l.tower.at[1], p)), 'the tower stands in the way');
});

test('burial plots: inside OSM plots, off the court, no presidential graves, plain stones only', () => {
  const real = osm.plots.map((p) => ({ name: p.name || '', p: W(p.p) }));
  assert.ok(l.plots.length >= 55, `${l.plots.length} plots`);
  for (const pl of l.plots) {
    const [x, z] = mid(pl.p);
    const home = real.filter((r) => inPoly(x, z, r.p));
    assert.ok(home.length, `the plot at ${x.toFixed(0)}, ${z.toFixed(0)} is an OSM plot`);
    assert.ok(!home.some((r) => /대통령/.test(r.name)), 'no president\'s grave is shown');
    for (const [sx, sz] of plotStones(pl)) assert.ok(!flatAt(l, sx, sz), `a stone at ${sx.toFixed(1)}, ${sz.toFixed(1)} is off the court and the lawn`);
    assert.deepEqual(Object.keys(pl).sort(), ['a', 'p'], 'a plot carries no name');
  }
  const big = l.plots.slice().sort((a, b) => area(b.p) - area(a.p))[0];
  const stones = plotStones(big);
  assert.ok(stones.length > area(big.p) / (HC_PARK.rows * HC_PARK.stones) * 0.5, `${stones.length} stones on the biggest plot`);
  for (const [x, z] of stones) assert.ok(inPoly(x, z, big.p) && ringDist(x, z, big.p) > HC_PARK.edge - 0.01);
  assert.equal(plotStones(big, {}, () => false).length, 0);
  // rows: stones in a row are closer than rows are apart
  assert.ok(HC_PARK.stones < HC_PARK.rows);
});

test('made-up things are listed with why', () => {
  for (const what of ['50%', 'plots cut', 'forecourt', 'shapes', 'Fountain', 'headstones', 'lawn', 'entrance', 'bank']) assert.ok(hc.meta.approx.some((a) => a.what.includes(what) && a.why), what);
});

test('the walk: decks on the ways and the court, solids after them, height on the grounds, the note at the main gate', () => {
  const decks = [], solid = [], said = [];
  const collision = { addDeck: (p) => decks.push(p), add: (list) => solid.push(...list) };
  const landmarks = hc.landmarks.map((q) => ({ ...q, x: q.x + ox, z: q.z + oz }));
  const walk = createHyeonchungwonWalk({ landmarks, collision, toast: (m) => said.push(m), text: () => 'note' });
  assert.ok(decks.length > l.trails.length);
  assert.equal(solid.length, hyeonchungSolids(l).length);
  assert.ok(solid.every((s) => s.low));
  const t = l.trails.filter((q) => !q.court).sort((a, b) => b.p[0][2] - a.p[0][2])[0], q = t.p[0];
  assert.ok(Math.abs(walk.y(q[0] + ox, q[1] + oz) - q[2]) < 0.05, 'on a hill road at its height');
  assert.equal(walk.y(ox + 900, oz + 900), 0);
  const g = [ox + l.mainGate.at[0], oz + l.mainGate.at[1]];
  walk.update({ x: g[0], z: g[1] }, 0.1);
  walk.update({ x: g[0] + 1, z: g[1] }, 0.1);
  assert.deepEqual(said, ['note'], 'once as you come up');
  walk.update({ x: g[0] + 60, z: g[1] }, 0.1);
  walk.update({ x: g[0], z: g[1] }, 0.1);
  assert.equal(said.length, 2, 'again the next time');
  assert.equal(createHyeonchungwonWalk({ landmarks: [] }).y(0, 0), 0);
});

test('paying respects: one spot before the altar, a silent bow, no reward', () => {
  const landmarks = hc.landmarks.map((q) => ({ ...q, x: q.x + ox, z: q.z + oz }));
  const spot = prayerSpots(landmarks).find((s) => s.tribute);
  assert.ok(spot, 'the tribute spot');
  assert.ok(Math.hypot(spot.x - ox - l.tribute.at[0], spot.z - oz - l.tribute.at[1]) < 0.01);
  assert.equal(spot.pose, 'prayc');
});

test('Dongjak Station (Line 4) at the main gate: exits on their OSM spots, off the hill', () => {
  const st = region.subway.stations.find((s) => s.id === 'dongjak-station');
  assert.ok(st, 'the station');
  const exits = osm.pois.filter((p) => p.tags.railway === 'subway_entrance');
  for (const e of st.exits) {
    const at = e.at || e.p || [e.x, e.z];
    const lx = at[0] - ox, lz = at[1] - oz;
    assert.ok(exits.some((p) => { const [x, z] = W([[p.lat, p.lon]])[0]; return Math.hypot(x - lx, z - lz) < 15; }), `exit ${e.n ?? e.no ?? ''} within 15 m of an OSM entrance`);
    assert.ok(!inPoly(lx, lz, l.foot), 'off the hill');
  }
});
