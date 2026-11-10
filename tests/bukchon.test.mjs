import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUKCHON, ViewBook, PartBook, VIEW_REWARD, ALL_VIEWS_REWARD, inside, nearestAt, ground } from '../src/data/bukchon.js';
import { craftEntry, CRAFT } from '../src/ui/bukchon-ui.js';
import { districtBoxes, districtAt, mergeDistricts } from '../src/core/districts.js';
import { cleanEntry } from '../src/core/bag.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const map = read('districts/bukchon.json');
const stores = read('stores.json').stores;
const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };
const solids = map.buildings.map((b) => b.p).concat(map.blockers.map((b) => b.p));

test('Bukchon sits on its real spot at Anguk Station, next to Gyeongbokgung', () => {
  const d = region.districts.find((x) => x.id === 'bukchon');
  assert.ok(d?.anchor && d.anchor.place.includes('Anguk'));
  assert.ok(!d.anchor.nudge, 'no nudge: Anguk Station is on its real 1/4 spot');
  const st = region.subway.stations.find((s) => s.id === 'anguk-station');
  assert.equal(st.code, '328');
  assert.equal(st.prev.en, 'Gyeongbokgung');
});

test('the photo spot is at the top of the hill, looking down Bukchon-ro 11-gil', () => {
  const [v] = BUKCHON.views;
  assert.equal(BUKCHON.views.length, 1);
  assert.equal(v.name.ko, '북촌로11길 언덕');
  assert.deepEqual(v.face, [0, 1]); // looking south, down the alley to the city
  assert.equal(ground(...v.at), BUKCHON.hill.h); // at the top
  for (const p of solids) assert.ok(!inside(v.at[0], v.at[1], p), 'the spot is inside something');
  const alley = map.roads.find((r) => r.n?.en === 'Bukchon-ro 11-gil');
  assert.ok(Math.abs(alley.p[0][0] - v.at[0]) < 1, 'straight down the alley');
  assert.ok(inside(v.at[0], v.at[1], BUKCHON.quiet));
});

test('Bukchon is small and on a hill: flat by the gate, climbing to the top', () => {
  const [x0, z0, x1, z1] = BUKCHON.area;
  assert.ok(x1 - x0 <= 150 && z0 - z1 <= 180, 'small enough to walk round');
  assert.equal(ground(24, -30), 0); // by the gate and the shops
  assert.equal(ground(60, -84), 0);
  assert.ok(ground(60, -120) > 3 && ground(60, -120) < BUKCHON.hill.h);
  assert.equal(ground(60, -170), BUKCHON.hill.h);
  assert.equal(ground(200, -170), 0); // outside the wall
  // Houses up the hill stand on terraces as high as the ground at their top edge.
  for (const b of map.buildings) {
    const zs = b.p.map((q) => q[1]), xs = b.p.map((q) => q[0]);
    const want = ground((Math.min(...xs) + Math.max(...xs)) / 2, Math.min(...zs));
    assert.ok(Math.abs((b.lv || 0) - want) < 0.06);
  }
});

test('the Open House spots are in its courtyard, reachable through the gate', () => {
  const [x0, z0, x1, z1] = BUKCHON.openHouse.box;
  for (const p of [...BUKCHON.openHouse.parts, BUKCHON.openHouse.tree]) {
    assert.ok(p.at[0] > x0 && p.at[0] < x1 && p.at[1] < z0 && p.at[1] > z1, p.id || 'tree');
    for (const s of solids) assert.ok(!inside(p.at[0], p.at[1], s), `${p.id || 'tree'} is inside a wall`);
  }
  const [gx, gz] = BUKCHON.openHouse.gate;
  for (const s of solids) assert.ok(!inside(gx, gz - 1, s) && !inside(gx, gz + 1, s), 'the gate is open');
  assert.equal(BUKCHON.openHouse.parts.length, 5);
});

test('hanok houses keep off the streets', () => {
  const hanok = map.buildings.filter((b) => b.hanok);
  assert.ok(hanok.length > 30);
  const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; const t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz); };
  for (const b of hanok) {
    const cx = b.p.reduce((s, q) => s + q[0], 0) / 4, cz = b.p.reduce((s, q) => s + q[1], 0) / 4;
    for (const r of map.roads) for (let i = 1; i < r.p.length; i++) assert.ok(segDist(cx, cz, r.p[i - 1], r.p[i]) > r.w / 2, `a hanok on ${r.n?.en || r.k}`);
  }
});

test('Bukchon shops stand in Bukchon, with hanok fronts', () => {
  // The hands-on rooms all stand in Bukchon, along Bukchon-ro 2-gil, each on a
  // hanok's long front (on a short gable end the shop front sticks out past the eaves).
  const ids = ['info-bukchon', 'gahoe-hanbok', 'noeul-teahouse', 'giwa-photo', 'maeum-knot', 'saekji-paper', 'sonmat-kimchi', 'suragan-cooking', 'matcha-garden'];
  const parts = region.districts.map((d) => ({ ...d, map: read(d.map) }));
  const boxes = districtBoxes(mergeDistricts(parts));
  for (const id of ids) {
    const s = stores.find((x) => x.id === id);
    assert.ok(s, id);
    assert.equal(s.front, 'hanok', id);
    assert.equal(districtAt(boxes, ...s.at), 'bukchon', id);
  }
  // Gwanghwamun and the north bank of Cheonggyecheon (Gyeongbokgung's map) take the rest.
  for (const id of ['dano-hanbok', 'haneul-drip', 'sagye-gelato', 'slow-brunch']) assert.equal(districtAt(boxes, ...stores.find((x) => x.id === id).at), 'gyeongbokgung', id);
  // No shop is left in the row on Samcheong-ro, up the palace's east side (hard to reach, Yozi).
  const [gx, gz] = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
  const row = stores.filter((s) => s.at[0] > gx + 120 && s.at[0] < gx + 180 && s.at[1] > gz - 460 && s.at[1] < gz);
  assert.deepEqual(row.map((s) => s.id), []);
  // A second hanbok rental: the same sets as by the palace.
  const a = stores.find((x) => x.id === 'dano-hanbok').products.map((p) => p.rent);
  assert.deepEqual(stores.find((x) => x.id === 'gahoe-hanbok').products.map((p) => p.rent), a);
});

test('each Bukchon shop door stands in the middle of a hanok bay', async () => {
  // Off the middle, the shop front runs into the bay's corner post (Yozi).
  const { shopBays } = await import('../src/core/hanok.js');
  const [ox, oz] = region.districts.find((d) => d.id === 'bukchon').offset;
  for (const s of stores.filter((x) => x.front === 'hanok')) {
    const [x, z] = [s.at[0] - ox, s.at[1] - oz];
    const b = map.buildings.find((h) => {
      const xs = h.p.map((q) => q[0]), zs = h.p.map((q) => q[1]);
      return h.hanok && h.fr && x > Math.min(...xs) && x < Math.max(...xs) && zs.some((v) => Math.abs(v - z) < 3);
    });
    if (!b) continue; // (Jongmyo's and Ikseon-dong's hanok shops are on other maps)
    const xs = b.p.map((q) => q[0]), cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const off = Math.min(...shopBays(Math.max(...xs) - Math.min(...xs)).map((m) => Math.abs(x - cx - m)));
    assert.ok(off < 0.5, `${s.id} is ${off.toFixed(1)} m off the middle of its bay`);
  }
});

test('the photo spot pays once, and the Open House parts make a Hanok Explorer', () => {
  const st = mem();
  const book = new ViewBook(st);
  assert.equal(book.take(1), VIEW_REWARD + ALL_VIEWS_REWARD);
  assert.equal(book.take(1), 0);
  assert.ok(book.done);
  assert.equal(new ViewBook(st).count, 1); // saved
  assert.equal(book.take(9), 0);
  const parts = new PartBook(mem());
  const ids = BUKCHON.openHouse.parts.map((p) => p.id);
  assert.deepEqual(ids.map((id) => parts.read(id)), [false, false, false, false, true]);
  assert.equal(parts.read(ids[0]), false);
});

test('spots are found near their place, with the district offset', () => {
  const off = [-1547, -891];
  const v = BUKCHON.views[0];
  assert.equal(nearestAt(BUKCHON.views, v.at[0] + off[0] + 1, v.at[1] + off[1], off, 2.4), v);
  assert.equal(nearestAt(BUKCHON.views, v.at[0] + off[0] + 5, v.at[1] + off[1], off, 2.4), null);
});

test('workshop pieces are bag goods', () => {
  for (const kind of Object.keys(CRAFT)) {
    if (CRAFT[kind].wear) continue; // worn, not carried (Sunra Silver Studio's pendants: tests/jongmyo.test.mjs)
    const e = craftEntry(kind, 0, 0);
    assert.deepEqual(cleanEntry(e), e);
    assert.ok(e.name.length <= 40);
  }
  assert.equal(craftEntry('knot', 9, 0), null);
  assert.equal(craftEntry('knot', 0, 0).name, 'red butterfly knot charm');
});

test('Bukchon is open on the field, with a low retaining wall: a gap at each gate, every house inside', () => {
  const [x0, z0, x1, z1] = BUKCHON.area;
  assert.equal(map.meta.enclosure, undefined); // seen from the street, no entering step
  for (const b of map.buildings) for (const [x, z] of b.p) assert.ok(x > x0 && x < x1 && z < z0 && z > z1, 'a house outside the wall');
  const walls = map.landmarks.find((l) => l.type === 'hanokwalls').segs; // one landmark, one step per segment
  assert.ok(walls.length >= 4);
  for (const g of BUKCHON.gates) {
    // a step through the gate, from outside to inside, is clear
    const [gx, gz] = g.at, [dx, dz] = g.ry ? [1, 0] : [0, 1];
    for (const s of solids) assert.ok(!inside(gx + dx * 1.5, gz + dz * 1.5, s) && !inside(gx - dx * 1.5, gz - dz * 1.5, s), `gate at ${g.at} is shut`);
  }
  assert.equal(map.landmarks.filter((l) => l.type === 'bukchongate').length, BUKCHON.gates.length);
  // Gyeongbokgung's palace wall is still an enclosure you walk into.
  assert.deepEqual(read('districts/gyeongbokgung.json').meta.enclosure.box, [-68, 0, 72, -216]); // (round the palace wall on its real line at 1/4: scripts/data/gyeongbokgung-wall.json)
});

test('inside the wall is only drawn while you are in; the houses are built on the first visit', async () => {
  const THREE = await import('three');
  const { Enclosure, FarCull } = await import('../src/core/enclosure.js');
  const hall = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  hall.position.set(50, 1, -50);
  const gate = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 2));
  gate.position.set(50, 2, 0); // on the wall line
  const root = new THREE.Group();
  root.add(hall, gate);
  root.updateMatrixWorld(true);
  let built = 0;
  const houses = new THREE.Group();
  const e = new Enclosure({ box: [0, 0, 100, -100], onFirstEnter: () => { built++; return [houses]; } });
  assert.equal(e.collect([root]), 1);
  assert.equal(e.update({ x: 50, z: 10 }), null); // first look: outside
  assert.equal(hall.visible, false);
  assert.equal(gate.visible, true);
  assert.equal(built, 0);
  assert.equal(e.update({ x: 50, z: -5 }), 'enter');
  assert.ok(hall.visible && houses.visible);
  assert.equal(e.update({ x: 50, z: 5 }), 'leave');
  assert.ok(!hall.visible && !houses.visible);
  e.update({ x: 50, z: -5 });
  assert.equal(built, 1); // built once
  // Past the fog: not drawn, and back when near; an enclosure's hiding still holds.
  const far = new FarCull([hall], () => 300);
  far.update(1, { x: 50, z: 1000 });
  assert.equal(hall.visible, false);
  far.update(1, { x: 50, z: -40 });
  assert.equal(hall.visible, true);
  e.update({ x: 50, z: 10 });
  far.update(1, { x: 50, z: 10 });
  assert.equal(hall.visible, false);
});

test('the alleys are narrow and lined with house walls', () => {
  const main = map.roads.find((r) => r.n?.en === 'Bukchon-ro 11-gil');
  // Narrow (Bukchon's charm), but six or more people still pass side by side
  // (a person is 0.7 m across: PLAYER_R 0.35 in main.js).
  for (const r of map.roads.filter((x) => x.k === 'walk')) assert.ok(r.w >= 6 * 0.7 && r.w <= 5.5, `an alley ${r.w} m wide`);
  // No wide open squares beside the alleys: up the hill, walking along an
  // alley, a house wall is right beside you (on one side at least) most of the way.
  const hill = map.buildings.filter((b) => b.lv);
  const walled = (x, z) => hill.some((b) => { const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]); return x >= Math.min(...xs) && x <= Math.max(...xs) && z >= Math.min(...zs) && z <= Math.max(...zs); });
  let n = 0, near = 0;
  for (let z = -90; z > -138; z -= 1) for (const s of [-1, 1]) { n++; if (walled(main.p[0][0] + s * (main.w / 2 + 0.6), z)) near++; }
  assert.ok(near / n > 0.8, `11-gil is walled only ${Math.round((near / n) * 100)}% of the way`);
  const edge = main.p[0][0] + main.w / 2, edgeW = main.p[0][0] - main.w / 2;
  const lining = map.buildings.filter((b) => b.p.some(([x]) => Math.abs(x - edge) < 0.4 || Math.abs(x - edgeW) < 0.4));
  assert.ok(lining.length >= 8, `only ${lining.length} houses line 11-gil`);
});

test('a few homes are open to visitors: a sign, an open gate and a yard you can walk into', () => {
  const homes = map.buildings.filter((b) => b.visit);
  assert.ok(homes.length >= 2 && homes.length <= 4);
  const signs = map.landmarks.filter((l) => l.visit);
  assert.equal(signs.length, homes.length);
  for (const s of signs) assert.equal(s.title.ko, '출입 가능');
  const blocks = map.blockers.map((b) => b.p);
  for (const b of homes) {
    const xs = b.p.map((q) => q[0]), zs = b.p.map((q) => q[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2, D = Math.max(...xs) - Math.min(...xs);
    // from the alley, through the gate in the middle of the front, into the yard
    for (let t = D / 2 + 1; t > 0.5; t -= 0.25) {
      const x = cx + b.fr[0] * t;
      assert.ok(!blocks.some((p) => inside(x, cz, p)), `the way into the home at ${cx},${cz} is shut at ${x}`);
    }
    assert.ok(signs.some((s) => Math.hypot(s.x - (cx + b.fr[0] * D / 2), s.z - cz) < 4), 'a sign by the gate');
  }
});

test('the hill you see is the hill you walk on (the shadow lands at your feet)', async () => {
  await import('../src/core/landmarks.js'); // (it loads bukchon-models.js in the right order)
  const { buildBukchonHill } = await import('../src/core/bukchon-models.js');
  const hill = buildBukchonHill([], [0, 0]);
  const earth = hill.children[0], pos = earth.geometry.attributes.position;
  const [x0, , x1, z1] = BUKCHON.area;
  // between the mesh's vertices too: sample the walkable hillside and compare
  // with the triangle under each point (the mesh is a grid, so a nearest
  // vertex is close enough when it is fine)
  let worst = 0;
  for (let i = 0; i < pos.count; i++) worst = Math.max(worst, Math.abs(pos.getY(i) - 0.02 - ground(Math.min(Math.max(pos.getX(i), x0 + 0.01), x1 - 0.01), Math.max(pos.getZ(i), z1 + 0.01))));
  assert.ok(worst < 0.01, `the hill mesh is ${worst.toFixed(2)} m off the ground`);
  // and it is fine across: no vertex row far from any point you can stand on
  const xs = new Set(); for (let i = 0; i < pos.count; i++) xs.add(Math.round(pos.getX(i)));
  assert.ok(xs.size > 20);
});

test('hanok shops get a hanok sign under the eaves, not a street board through the roof', async () => {
  const { hanokSignStyle, addHanokSign, HANOK_SIGNS } = await import('../src/core/hanok-signs.js');
  const THREE = await import('three');
  const { HANOK } = await import('../src/core/hanok.js');
  const shops = stores.filter((s) => s.front === 'hanok');
  assert.ok(shops.length >= 6);
  const styles = new Set(shops.map((s) => hanokSignStyle(s)));
  for (const st of styles) assert.ok(HANOK_SIGNS[st], st);
  assert.ok(styles.size >= 2, 'more than one kind of sign along the street');
  // The lowest hanok wall (base + wall) is where the eaves start.
  const eaves = 0.45 + HANOK.wall - 0.25;
  for (const st of Object.keys(HANOK_SIGNS)) {
    const g = new THREE.Group();
    const { top } = addHanokSign(g, st, null);
    assert.ok(top <= eaves, `${st} reaches ${top} m, the eaves start at ${eaves} m`);
  }
});
