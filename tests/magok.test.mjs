import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { GREENHOUSE, greenhouseLayout, wallPieces } from '../src/core/botanic-layout.js';
import { PLANTS, isRarePlant } from '../src/core/house-plants.js';
import { FURNITURE, buildFurniture, isSmall } from '../src/core/furniture.js';
import { ITEMS } from '../src/core/inventory.js';
import { CollisionMap } from '../src/core/collision.js';

// Seoul Botanic Park (scripts/build-magok.mjs): the garden, its water and
// paths on their real places at 1/4 (OpenStreetMap); the greenhouse alone
// 50% of real and moved off the road, marked as made up; inside it, walks
// from the doors to every pot stand; ten pot plants for the home.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = read('region.json');
const mg = read('districts/magok.json');
const { stores } = read('stores.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/magok-osm.json', import.meta.url), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'magok').offset;
const gh = mg.landmarks.find((l) => l.type === 'botanic');
const way = (id) => osm.ways.find((w) => w.id === id).p.map(([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; });
const named = (name) => osm.ways.filter((w) => w.tags.name === name).map((w) => w.p.map(([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; }));
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const ringDist = (x, z, p) => lineDist(x, z, [...p, p[0]]);
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const span = (p) => [Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1])) - Math.min(...p.map((q) => q[1]))];
const IDS = { garden: 465318366, greenhouse: 643248046, arts: 643261411, lake: 646325095, wetland: 465317447 };
const garden = mg.areas.find((a) => a.n?.en === 'Seoul Botanic Park');
const made = (re) => mg.meta.approx.some((a) => re.test(a.what));

test('the garden, the lake and the wetland are on their real outlines (OSM at 1/4, within 1 m)', () => {
  assert.match(osm.source, /OpenStreetMap/);
  for (const [a, id] of [[garden, IDS.garden], [mg.areas.find((q) => q.n?.en === 'Lake Garden'), IDS.lake], [mg.areas.find((q) => q.n?.en === 'Wetland Garden'), IDS.wetland]]) {
    const real = way(id);
    for (const [x, z] of a.p) assert.ok(ringDist(x, z, real) < 1, `${a.n.en} corner ${x}, ${z}`);
    for (const [x, z] of real) assert.ok(ringDist(x, z, a.p) < 1.5, `${a.n.en}: the real corner ${x.toFixed(1)}, ${z.toFixed(1)} is kept`);
  }
  const [w, d] = span(garden.p);
  assert.ok(w > 215 && w < 227 && d > 394 && d < 405, `the garden is about 221 x 400 m (real 884 x 1,595 m): ${w.toFixed(0)} x ${d.toFixed(0)}`);
});

test('the paths are the real footways (within 1 m); the made-up ones are marked', () => {
  const real = osm.ways.filter((w) => w.k === 'hw' && ['footway', 'path', 'pedestrian'].includes(w.tags.highway)).map((w) => w.p.map(([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; }));
  const walks = mg.roads.filter((r) => r.k === 'walk');
  assert.ok(walks.filter((r) => !r.approx).length >= 40);
  for (const r of walks.filter((q) => !q.approx)) for (const [x, z] of r.p) assert.ok(Math.min(...real.map((p) => lineDist(x, z, p))) < 1, `path point ${x}, ${z}`);
  const fake = walks.filter((r) => r.approx);
  assert.ok(fake.length >= 3 && made(/doors and the ring path/));
  for (const r of fake) for (const [x, z] of r.p) assert.ok(Math.hypot(x - gh.x, z - gh.z) < gh.r + 4, 'the made-up paths are the ones at the greenhouse');
  const j10 = mg.roads.find((r) => r.n?.en === 'Magokjungang 10-ro'), jReal = named('마곡중앙10로');
  for (const [x, z] of j10.p) assert.ok(Math.min(...jReal.map((p) => lineDist(x, z, p))) < 10, `Magokjungang 10-ro at ${x}, ${z}`);
});

test('the greenhouse: 50% of real, moved off Magokdong-ro, and both said so', () => {
  const real = way(IDS.greenhouse), cx = real.reduce((s, p) => s + p[0], 0) / real.length, cz = real.reduce((s, p) => s + p[1], 0) / real.length;
  assert.ok(Math.hypot(cx, cz) < 1, 'the real greenhouse is the district\'s (0, 0)');
  const r14 = real.reduce((s, [x, z]) => s + Math.hypot(x - cx, z - cz), 0) / real.length;
  assert.ok(Math.abs(gh.r - r14 * 2) < 0.2, `twice the 1/4 radius (${r14.toFixed(1)} m): ${gh.r}`);
  assert.ok(gh.r * 2 > 44 && gh.r * 2 < 48, `about 46 m across: ${gh.r * 2}`);
  const off = Math.hypot(gh.x - cx, gh.z - cz);
  assert.ok(off > 4 && off <= 15, `moved ${off.toFixed(1)} m: inside the 15 m a single spot may be off`);
  const road = named('마곡동로');
  assert.ok(Math.min(...road.map((p) => lineDist(gh.x, gh.z, p))) - gh.r - 5 >= 3.5, 'the glass is clear of Magokdong-ro (10 m wide)');
  assert.ok(made(/^the greenhouse$/) && made(/support building/) && made(/what is planted/));
  // all of it is inside the garden
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; assert.ok(inPoly(gh.x + Math.cos(a) * gh.r, gh.z + Math.sin(a) * gh.r, way(IDS.garden)), 'the glass stands in the garden'); }
});

test('buildings: real outlines, unnamed, clear of each other, the paths and the greenhouse', () => {
  const arts = mg.buildings.find((b) => b.p.length > 4 && span(b.p)[0] > 25);
  for (const [x, z] of arts.p) assert.ok(ringDist(x, z, way(IDS.arts)) < 1, 'the arts centre is on its real outline');
  for (const b of mg.buildings) {
    assert.ok(b.n === undefined || b.n === 'info', 'no real brand names on buildings');
    for (const [x, z] of b.p) {
      assert.ok(Math.hypot(x - gh.x, z - gh.z) > gh.r + 3, 'clear of the greenhouse');
      for (const o of mg.buildings) if (o !== b) assert.ok(!inPoly(x, z, o.p), `corner ${x}, ${z} is outside the other buildings`);
      for (const r of mg.roads) assert.ok(lineDist(x, z, r.p) > r.w / 2, `corner ${x}, ${z} is off the paths`);
    }
  }
});

test('the Information Center stands by the real visitor centre, on open ground', () => {
  const info = stores.find((s) => s.id === 'info-magok'), b = mg.buildings.find((q) => q.n === 'info');
  const v = osm.nodes.find((n) => n.tags.name === '방문자 센터'), [vx, vz] = toGame(v.lat, v.lon);
  assert.ok(info && b);
  assert.ok(Math.hypot(info.at[0] - vx, info.at[1] - vz) < 15, 'within 15 m of the real visitor centre');
  const [x, z] = [info.at[0] - ox, info.at[1] - oz];
  assert.ok(inPoly(x, z, garden.p) && !mg.buildings.some((q) => inPoly(x, z, q.p)) && !mg.blockers.some((q) => inPoly(x, z, q.p)), 'its door is on open ground');
  assert.ok(made(/Information Center/));
});

test('water you cannot walk into leaves the real paths open', () => {
  assert.ok(mg.blockers.length >= 3);
  const col = new CollisionMap(mg.blockers);
  for (const r of mg.roads.filter((q) => q.k === 'walk')) for (const [x, z] of r.p) assert.ok(!col.blocked(x, z, 0.4), `path point ${x}, ${z} is not in the water`);
});

test('inside the greenhouse: every stand, bench and door can be walked to from the main door', () => {
  const lay = greenhouseLayout(gh), walls = wallPieces(gh);
  assert.ok(walls.length < gh.sides * 2, 'the doors are open in the wall');
  const thick = ([x0, z0, x1, z1]) => { const d = Math.hypot(x1 - x0, z1 - z0), nx = -(z1 - z0) / d * 0.15, nz = (x1 - x0) / d * 0.15; return { p: [[x0 + nx, z0 + nz], [x1 + nx, z1 + nz], [x1 - nx, z1 - nz], [x0 - nx, z0 - nz]] }; };
  const pond = Array.from({ length: 14 }, (_, i) => [Math.cos((i / 14) * Math.PI * 2) * GREENHOUSE.pond, Math.sin((i / 14) * Math.PI * 2) * GREENHOUSE.pond]);
  const col = new CollisionMap([...walls.map(thick), ...lay.beds.map((b) => ({ p: b.p })), { p: pond }]);
  // flood fill on a 0.5 m grid from just outside the main door
  const main = gh.doors.find((d) => d.main), S = 0.5, key = (i, k) => i + ',' + k;
  const start = [Math.round((gh.doors.find((d) => d.main).out[0] - gh.x) / S), Math.round((main.out[1] - gh.z) / S)];
  const seen = new Set([key(...start)]), q = [start];
  while (q.length) { const [i, k] = q.pop(); for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = k + dk; if (seen.has(key(a, b)) || Math.hypot(a * S, b * S) > gh.r + 4 || col.blocked(a * S, b * S, 0.36)) continue; seen.add(key(a, b)); q.push([a, b]); } }
  const reach = (x, z) => seen.has(key(Math.round(x / S), Math.round(z / S)));
  assert.equal(lay.stands.length, 10);
  for (const s of lay.stands) {
    assert.ok(reach(...s.stand), `you can stand at the ${s.id} stand`);
    assert.ok(Math.hypot(s.stand[0] - s.x, s.stand[1] - s.z) < 1.5, 'close enough to look at it (game/botanic-near.js LOOK_NEAR)');
    assert.equal(lay.inBed(s.x, s.z), 'outer', 'the pot stands on a bed, off the walk');
  }
  for (const d of gh.doors) assert.ok(reach(d.out[0] - gh.x, d.out[1] - gh.z), 'each door leads in');
  assert.ok(reach(GREENHOUSE.pond + 1, 0), 'the walk round the pond');
  for (const c of lay.clerks) assert.ok(reach(c.x, c.z) && !lay.inBed(c.x, c.z), 'a gardener stands on the walk');
  // everyday plants by the main door, rare ones across the greenhouse
  const mx = Math.cos(main.a), mz = Math.sin(main.a);
  for (const s of lay.stands) assert.equal(s.x * mx + s.z * mz < 0, s.rare, `${s.id}: ${s.rare ? 'far from' : 'near'} the main door`);
  // plants stay in the beds and under the roof
  for (const [kind, x, z] of lay.plants) { assert.ok(lay.inBed(x, z), `${kind} grows in a bed`); assert.ok(Math.hypot(x, z) < gh.r - 0.8); }
  assert.ok(lay.plants.length > 90 && new Set(lay.plants.map((p) => p[0])).size >= 15, 'plenty of kinds');
  assert.ok(lay.roofAt(0) < lay.roofAt(gh.r), 'the roof is a dish: lowest in the middle');
});

test('the shop: ten pot plants for the home, each one a piece of furniture with a price', () => {
  const s = stores.find((x) => x.id === 'seoul-botanic-greenhouse');
  assert.ok(s && s.carts && s.district === 'magok', 'sold on the street, no shop front');
  const main = gh.doors.find((d) => d.main);
  assert.ok(Math.hypot(s.at[0] - ox - main.out[0], s.at[1] - oz - main.out[1]) < 0.2, 'the map takes you to the main door');
  assert.equal(PLANTS.length, 10);
  assert.equal(PLANTS.filter((p) => p[3]).length, 5);
  for (const [id, emoji, size, rare, name] of PLANTS) {
    const pr = s.products.find((p) => p.furniture === id);
    assert.ok(pr && pr.model === 'furniture' && pr.price > 0, `${id} is for sale`);
    for (const k of ['en', 'ko', 'ja', 'zh']) assert.ok(name[k], `${id} name ${k}`);
    assert.deepEqual(pr.name, name);
    assert.ok(pr.desc.en && pr.desc.ko);
    assert.equal(/only in the greenhouse/i.test(pr.desc.en), rare, `${id}: the rare ones say where they are sold`);
    assert.ok(ITEMS[id]?.furniture && emoji, `${id} is in the bag's list`);
    const f = FURNITURE.find((q) => q.id === id);
    assert.ok(f && f.item === id, `${id} is a piece you place only once bought`);
    assert.ok(size[0] <= 0.8 && size[1] <= 0.8);
    const g = buildFurniture(id);
    let top = 0, wide = 0; g.updateMatrixWorld(true);
    g.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); top = Math.max(top, b.max.y); wide = Math.max(wide, b.max.x, -b.min.x, b.max.z, -b.min.z); } });
    assert.ok(top > 0.3 && top < 2.2, `${id} is ${top.toFixed(2)} m tall`);
    assert.ok(wide < 1.1, `${id} reaches ${wide.toFixed(2)} m from its middle`);
    assert.equal(isRarePlant(id), rare);
  }
  const prices = (rare) => s.products.filter((p) => isRarePlant(p.furniture) === rare).map((p) => p.price);
  assert.ok(Math.max(...prices(false)) < Math.min(...prices(true)), 'every rare plant costs more than every everyday one');
  assert.ok(isSmall('plant-orchid') && isSmall('plant-flytrap') && !isSmall('plant-baobab'), 'the two small ones can stand on a table');
});

test('the planting outside: in the garden, off the water and the buildings', () => {
  const W = ([x, z]) => [gh.x + x, gh.z + z];
  assert.ok(gh.trees.length > 150 && gh.beds.length >= 15 && gh.reeds.length > 20);
  for (const t of [...gh.trees, ...gh.beds, ...gh.reeds]) {
    const [x, z] = W(t);
    assert.ok(inPoly(x, z, garden.p), `in the garden: ${x.toFixed(1)}, ${z.toFixed(1)}`);
    assert.ok(!mg.buildings.some((b) => inPoly(x, z, b.p)) && Math.hypot(x - gh.x, z - gh.z) > gh.r + 3);
    assert.ok(!mg.areas.some((a) => a.k === 'water' && inPoly(x, z, a.p)), 'not in the water');
  }
});
