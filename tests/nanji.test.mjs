import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { mergeDistricts } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';
import { skyparkHeight, inPoly } from '../src/core/skypark-ground.js';
import { createNanjiWalk } from '../src/game/nanji-walk.js';

// Haneul Park (하늘공원) and the Nanji Campground (scripts/build-nanji.mjs):
// at 1/4 on their real places, the hill's height its relief above the
// riverside at 1/4, every way up walkable, the pink muhly field the one part
// made bigger on purpose (Yozi 2026-11-21), invented lines marked.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = read('region.json');
const nj = read('districts/nanji.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/nanji-osm.json', import.meta.url), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'nanji').offset;
const sky = nj.landmarks.find((l) => l.type === 'skypark');
const camp = nj.landmarks.find((l) => l.type === 'nanjicamp');
const W = (p) => p.map(([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; });
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const ringDist = (x, z, p) => lineDist(x, z, [...p, p[0]]);
const len = (p) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);

test('Haneul Park and the campground are on their real places (OSM at 1/4)', () => {
  assert.match(osm.source, /OpenStreetMap/);
  const hill = W(osm.areas.haneul.outer), cg = W(osm.areas.camp.outer);
  for (const [x, z] of sky.foot) assert.ok(ringDist(x, z, hill) < 10 || inPoly(x, z, hill), `the hill's foot at ${x}, ${z} is on the park's outline (or inside it, off the road)`);
  const cx = camp.x, cz = camp.z;
  assert.ok(inPoly(cx, cz, cg), 'the campground is inside its real outline');
  for (const [x, z] of camp.pitches) assert.ok(inPoly(x + cx, z + cz, cg), `tent at ${x}, ${z} inside the campground`);
  for (const [x, z] of camp.fires) assert.ok(inPoly(x + cx, z + cz, cg), `fire at ${x}, ${z} inside the campground`);
  // Gangbyeon-buk-ro within 10 m of its real carriageways
  const road = nj.roads.find((r) => r.n.en === 'Gangbyeon-buk-ro');
  const real = osm.ways.trunk.map((w) => W(w.p));
  for (const [x, z] of road.p.slice(1)) assert.ok(Math.min(...real.map((p) => lineDist(x, z, p))) < 10, `Gangbyeon-buk-ro at ${x}, ${z}`);
});

test("the hill: its relief above the riverside at 1/4 (17-24 m), a level top, 0 at its foot", () => {
  assert.ok(sky.topH > 15 && sky.topH < 24, `top ${sky.topH} m (real ~95 m above the sea, ~17 m riverside)`);
  for (const [x, z] of sky.top) assert.equal(skyparkHeight(sky, x * 0.98, z * 0.98), sky.topH);
  let worst = 0;
  for (const [x, z] of sky.foot) worst = Math.max(worst, skyparkHeight(sky, x, z));
  assert.ok(worst < 0.6, `the foot meets the ground (${worst.toFixed(2)} m)`);
  let hi = 0;
  for (let x = -200; x <= 200; x += 3) for (let z = -200; z <= 200; z += 3) hi = Math.max(hi, skyparkHeight(sky, x, z));
  assert.ok(hi < sky.topH + 0.6, `nothing much above the top (${hi.toFixed(1)} m)`);
});

test('the ways up: 하늘길 under 22°, the stairs under 40°, each joined to the ground and the top', () => {
  assert.equal(sky.trails.length, 4);
  for (const t of sky.trails) {
    const max = t.steps ? 0.84 : 0.4;
    for (let i = 0; i < t.p.length; i++) for (let k = i + 1; k < t.p.length; k++) {
      const d = len(t.p.slice(i, k + 1));
      if (d < 2) continue;
      const g = Math.abs(t.p[k][2] - t.p[i][2]) / d;
      assert.ok(g < max, `${t.n}: ${(Math.atan(g) * 180 / Math.PI).toFixed(1)}° at ${t.p[i][0]}, ${t.p[i][1]}`);
      break;
    }
    assert.ok(t.p[0][2] < 0.3, `${t.n} starts on the ground`);
    const end = t.p.at(-1);
    const onTop = inPoly(end[0], end[1], sky.top), onTrail = sky.trails.some((o) => o !== t && lineDist(end[0], end[1], o.p) < o.w);
    assert.ok(onTop || onTrail, `${t.n} ends on the top or on another way up`);
    if (onTop) assert.ok(Math.abs(end[2] - sky.topH) < 0.35, `${t.n} meets the top level (${end[2]} vs ${sky.topH})`);
  }
});

test('you can walk up: the hill is a blocker, the top and the ways up are decks', () => {
  const parts = region.districts.map((d) => ({ id: d.id, map: read(d.map), offset: d.offset }));
  const map = mergeDistricts(parts, region.links);
  const col = new CollisionMap([...map.buildings, ...map.blockers]);
  const walk = createNanjiWalk({ landmarks: map.landmarks, collision: col });
  const l = walk.landmark;
  // the middle of a slope, off the ways, is blocked
  const mid = l.trails[0].p[Math.floor(l.trails[0].p.length / 2)];
  assert.ok(col.blocked(l.x + mid[0] + 12, l.z + mid[1] + 12, 0.35) || col.blocked(l.x + mid[0] - 12, l.z + mid[1] - 12, 0.35), 'the slope beside 하늘길 is blocked');
  // along every way up you can stand, at its height
  for (const t of l.trails) for (let i = 1; i < t.p.length; i++) {
    const [ax, az] = t.p[i - 1], [bx, bz] = t.p[i];
    for (const f of [0.25, 0.75]) {
      const x = l.x + ax + (bx - ax) * f, z = l.z + az + (bz - az) * f;
      assert.ok(!col.blocked(x, z, 0.3), `${t.n} open at ${x.toFixed(0)}, ${z.toFixed(0)}`);
    }
  }
  const [tx, tz] = l.top[0].map((v, i) => v * 0.5 + (i ? l.z : l.x));
  assert.ok(!col.blocked(tx, tz, 0.3), 'the top is open');
  assert.equal(walk.y(tx, tz), l.topH);
});

test('the pink muhly field: north-west on the top, bigger than real on purpose and marked', () => {
  const [cx, cz] = [sky.muhly.reduce((s, q) => s + q[0], 0) / 4, sky.muhly.reduce((s, q) => s + q[1], 0) / 4];
  for (const [x, z] of sky.muhly) assert.ok(inPoly(x, z, sky.top), 'inside the top');
  const tcx = sky.top.reduce((s, q) => s + q[0], 0) / sky.top.length, tcz = sky.top.reduce((s, q) => s + q[1], 0) / sky.top.length;
  assert.ok(cx < tcx && cz < tcz, 'in the top\'s north-west');
  assert.ok(nj.meta.approx.some((a) => /muhly/.test(a.what) && /Yozi/.test(a.why)), 'marked as made bigger, with why');
  assert.equal(sky.turbines.length, 5);
  for (const [x, z] of sky.turbines) assert.ok(inPoly(x, z, sky.top), 'turbines on the top');
});

test('the campground: fire pits to sit round with friends, tents, and an Information Center', () => {
  assert.ok(camp.fires.length >= 2, `${camp.fires.length} fire pits`);
  assert.ok(camp.pitches.length >= 12, `${camp.pitches.length} tents`);
  for (let i = 0; i < camp.fires.length; i++) for (let k = i + 1; k < camp.fires.length; k++) assert.ok(Math.hypot(camp.fires[i][0] - camp.fires[k][0], camp.fires[i][1] - camp.fires[k][1]) > 5, 'room round each fire');
  for (const [px, pz] of camp.pitches) for (const [fx, fz] of camp.fires) assert.ok(Math.hypot(px - fx, pz - fz) > 4, 'no tent in a fire ring');
  const stores = read('stores.json').stores;
  assert.ok(stores.some((s) => s.workshop === 'info' && s.district === 'nanji'));
});

test('the hill stays off the roads, and made-up lines are listed', () => {
  for (const r of nj.roads) {
    if (r.k === 'walk') continue;
    for (const [x, z] of r.p) assert.ok(!inPoly(x, z, sky.foot) || ringDist(x, z, sky.foot) > r.w / 2, `${r.n.en} at ${x}, ${z} is not under the hill`);
  }
  for (const r of nj.roads.filter((q) => q.approx)) assert.ok(nj.meta.approx.some((a) => a.what.includes(r.n.en)), `${r.n.en} is listed as made up`);
});
