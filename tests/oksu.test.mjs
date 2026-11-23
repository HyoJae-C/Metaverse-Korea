import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { inPoly, trailNear } from '../src/core/skypark-ground.js';
import { dalmajiHeight, islandRing } from '../src/core/dalmaji-ground.js';
import { createOksuWalk } from '../src/game/oksu-walk.js';
import { forsythiaInBloom } from '../src/game/oksu-park.js';

// Dalmaji Park (달맞이근린공원) by Oksu Station (scripts/build-oksu.mjs): at
// 1/4 on its real place, the hill its relief above Ttukseom-ro at 1/4,
// every way up on its OSM line and walkable, made-up things marked.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = read('region.json');
const ok = read('districts/oksu.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/oksu-osm.json', import.meta.url), 'utf8'));
const dist = region.districts.find((d) => d.id === 'oksu');
const [ox, oz] = dist.offset;
const l = ok.landmarks.find((q) => q.type === 'dalmaji');
const W = (p) => p.map(([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; });
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const ringDist = (x, z, p) => lineDist(x, z, [...p, p[0]]);

test('on its real place: the entrance stairs at the anchor, the wood and Ttukseom-ro on OSM at 1/4', () => {
  const [ax, az] = toGame(dist.anchor.lat, dist.anchor.lon);
  assert.ok(Math.hypot(ax - ox, az - oz) < 1, 'the offset puts the entrance on its real spot');
  const wood = W(osm.wood.outer);
  for (const [x, z] of l.foot) assert.ok(ringDist(x, z, wood) < 1 || inPoly(x, z, wood), `the hill's foot at ${x}, ${z} is the wood's outline (or inside it, off the road)`);
  const road = ok.roads.find((r) => r.n.en === 'Ttukseom-ro');
  const real = osm.road.map((w) => W(w.p));
  for (const [x, z] of road.p.slice(1)) assert.ok(Math.min(...real.map((p) => lineDist(x, z, p))) < 1, `Ttukseom-ro at ${x}, ${z} on its OSM line`);
  for (const [x, z] of road.p) assert.ok(!inPoly(x, z, l.foot) && ringDist(x, z, l.foot) > road.w / 2, `the road at ${x}, ${z} is off the hill`);
});

test('every way up is on its OSM line (within 1 m)', () => {
  const real = new Map(osm.trails.map((t) => [t.id, W(t.p)]));
  assert.ok(l.trails.length >= 25, `${l.trails.length} ways`);
  for (const t of l.trails) for (const [x, z] of t.p) assert.ok(lineDist(x, z, real.get(t.id)) < 1, `way ${t.id} at ${x}, ${z}`);
  assert.ok(l.trails.some((t) => t.id === 1548280367 && t.steps), 'the entrance stairs from Ttukseom-ro');
});

test("the hill: its relief above the road at 1/4 (10-20 m), walkable everywhere you can go, 0 at its foot", () => {
  assert.ok(Math.abs(l.peak.y - 14.5) < 0.2, `peak ${l.peak.y} m (Yozi 2026-11-23: halfway between SRTM 13 m and the articles 16 m)`);
  let worst = 0;
  for (const [x, z] of l.foot) worst = Math.max(worst, dalmajiHeight(l, x, z));
  assert.ok(worst < 0.5, `the foot meets the ground (${worst.toFixed(2)} m)`);
  for (const t of l.trails) {
    const max = t.steps ? 0.66 : 0.38; // (about 33° and 21°, with rounding)
    for (let i = 1; i < t.p.length; i++) {
      const d = Math.hypot(t.p[i][0] - t.p[i - 1][0], t.p[i][1] - t.p[i - 1][1]);
      if (d < 1.5) continue;
      const g = Math.abs(t.p[i][2] - t.p[i - 1][2]) / d;
      assert.ok(g < max, `way ${t.id} (${t.n}) climbs ${(Math.atan(g) * 180 / Math.PI).toFixed(0)}° at ${t.p[i]}`);
    }
  }
});

test('where two ways meet they are at one height', () => {
  const ends = [];
  for (const t of l.trails) for (const q of [t.p[0], t.p[t.p.length - 1]]) ends.push(q);
  for (const a of ends) for (const t of l.trails) {
    const n = trailNear(t, a[0], a[1]);
    if (n.d < 0.3) assert.ok(Math.abs(n.y - a[2]) < 0.35, `a way end at ${a} is ${a[2]} m, the way it meets ${n.y.toFixed(2)} m`);
  }
});

test('Photo Island A and B over the Han, gazebos and the name stone; made-up things listed', () => {
  const views = osm.pois.filter((p) => p.tags.tourism === 'viewpoint');
  assert.equal(l.islands.length, 2);
  for (const v of views) {
    const [x, z] = W([[v.lat, v.lon]])[0];
    assert.ok(l.islands.some((i) => Math.hypot(i.at[0] - x, i.at[1] - z) < 0.5), `${v.tags.name} on its OSM spot`);
  }
  for (const i of l.islands) {
    const n = l.trails.reduce((b, t) => Math.min(b, trailNear(t, i.at[0], i.at[1]).d), Infinity);
    assert.ok(n < l.trails[0].w, `${i.name} is reached from a way (${n.toFixed(1)} m)`);
    const [cx, cz] = islandRing(i).reduce((s, q) => [s[0] + q[0] / 4, s[1] + q[1] / 4], [0, 0]);
    assert.equal(dalmajiHeight(l, cx, cz), i.y, 'you stand on the deck');
  }
  assert.equal(l.gazebos.length, osm.pois.filter((p) => p.tags.amenity === 'shelter').length);
  assert.ok(l.stone && inPoly(l.stone.at[0], l.stone.at[1], l.foot), 'the name stone stands by the entrance stairs');
  for (const what of ['photo island', 'name stone', 'forsythia', 'Information Center']) assert.ok(ok.meta.approx.some((a) => a.what.includes(what) && a.why), what);
});

test('the walk: decks on the ways and islands, height on the hill, nothing off it', () => {
  const decks = [];
  const collision = { addDeck: (p) => decks.push(p) };
  const landmarks = ok.landmarks.map((q) => ({ ...q, x: q.x + ox, z: q.z + oz }));
  const walk = createOksuWalk({ landmarks, collision });
  assert.ok(decks.length > l.trails.length);
  const t = l.trails.find((q) => q.id === 1548280367);
  const mid = t.p[Math.floor(t.p.length / 2)];
  assert.ok(Math.abs(walk.y(mid[0] + ox, mid[1] + oz) - mid[2]) < 0.05, 'on the entrance stairs at their height');
  assert.equal(walk.y(ox + 300, oz + 300), 0);
});

test('forsythia bloom in spring only (the real date, Seoul time)', () => {
  assert.equal(forsythiaInBloom(Date.UTC(2027, 3, 5)), true);
  assert.equal(forsythiaInBloom(Date.UTC(2026, 10, 23)), false);
  assert.equal(forsythiaInBloom(Date.UTC(2027, 6, 1)), false);
});
