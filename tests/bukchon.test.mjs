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

test('the photo spots are four of the Bukchon 8 Views, on their real places', () => {
  const osm = JSON.parse(readFileSync(new URL('../scripts/data/bukchon-osm.json', import.meta.url)));
  assert.equal(BUKCHON.views.length, 4);
  const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; const t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz); };
  for (const v of BUKCHON.views) {
    const real = osm.views.find((o) => o.n === v.n - 10);
    assert.ok(real, `view ${v.n}`);
    assert.ok(Math.hypot(real.at[0] - v.at[0], real.at[1] - v.at[1]) < 0.5, `${v.name.en} is on its OSM spot`);
    assert.ok(Math.abs(Math.hypot(...v.face) - 1) < 0.01);
    for (const p of solids) assert.ok(!inside(v.at[0], v.at[1], p), `${v.name.en} is inside something`);
    const edge = Math.min(...map.roads.flatMap((r) => r.p.slice(1).map((q, i) => segDist(v.at[0], v.at[1], r.p[i], q) - r.w / 2)));
    assert.ok(edge < 2.5, `${v.name.en} is ${edge.toFixed(1)} m off a street`);
  }
  // the famous downhill alley of Gahoe-dong is in the Quiet Zone, up the hill
  const v5 = BUKCHON.views.find((v) => v.n === 15);
  assert.ok(inside(v5.at[0], v5.at[1], BUKCHON.quiet));
  assert.ok(ground(...v5.at) > 3);
});

test('Bukchon is on its real hill at 1/4: flat by Anguk Station, as steep as the real slope', () => {
  const osm = JSON.parse(readFileSync(new URL('../scripts/data/bukchon-osm.json', import.meta.url)));
  assert.ok(ground(0, 0) < 0.05 && ground(14, -40) < 0.3, 'flat at the foot, where the shops are');
  assert.equal(ground(500, -100), 0); // outside Bukchon
  // Gahoe-dong 31 is about 29 m above Anguk Station's street (SRTM): ~6 m up at 1/4 (the foot's first 6 m are flat)
  const top = ground(-55, -186);
  assert.ok(top > 4 && top < 8, `Gahoe-dong 31 is ${top.toFixed(1)} m up`);
  // Bukchon-ro climbs gently (real: about 5 %), never a wall of a hill (the old one was 13 %)
  const ro = map.roads.find((r) => r.n?.en === 'Bukchon-ro' && r.p.length > 4);
  let worst = 0;
  for (let i = 1; i < ro.p.length; i++) {
    const [a, b] = [ro.p[i - 1], ro.p[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let t = 0; t + 4 <= L; t += 2) {
      const q = (s) => [a[0] + ((b[0] - a[0]) * s) / L, a[1] + ((b[1] - a[1]) * s) / L];
      worst = Math.max(worst, Math.abs(ground(...q(t + 4)) - ground(...q(t))) / 4);
    }
  }
  assert.ok(worst < 0.15, `Bukchon-ro is ${Math.round(worst * 100)} % steep in places`);
  assert.ok(osm.grid.h.length > 100);
  // Houses up the hill stand on stone terraces as high as the ground at their highest corner.
  for (const b of map.buildings.filter((x) => x.hanok)) {
    const want = Math.max(...b.p.map(([x, z]) => ground(x, z)));
    assert.ok(Math.abs((b.lv || 0) - want) < 0.11, `a hanok on a ${b.lv} m terrace, the ground is ${want.toFixed(2)}`);
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
  // The hands-on rooms all stand in Bukchon at the foot of the hill (Gyedong-gil,
  // Bukchon-ro, Yunboseon-gil), each on a hanok's long front (on a short gable
  // end the shop front sticks out past the eaves).
  const ids = ['info-bukchon', 'gahoe-hanbok', 'noeul-teahouse', 'giwa-photo', 'maeum-knot', 'saekji-paper', 'sonmat-kimchi', 'suragan-cooking', 'kimbap-class', 'tteok-class', 'bibimbap-class', 'matcha-garden'];
  const parts = region.districts.map((d) => ({ ...d, map: read(d.map) }));
  const boxes = districtBoxes(mergeDistricts(parts));
  for (const id of ids) {
    const s = stores.find((x) => x.id === id);
    assert.ok(s, id);
    assert.equal(s.front, 'hanok', id);
    assert.equal(districtAt(boxes, ...s.at), 'bukchon', id);
  }
  // The cooking classes stay together: within 30 m of each other but one.
  const [ox, oz] = region.districts.find((d) => d.id === 'bukchon').offset;
  const cls = ['bibimbap-class', 'sonmat-kimchi', 'tteok-class', 'suragan-cooking', 'kimbap-class'].map((id) => stores.find((x) => x.id === id).at);
  assert.ok(cls.filter((a) => cls.filter((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 30).length >= 3).length >= 4);
  // ... and near Anguk Station (within 100 m)
  for (const a of cls) assert.ok(Math.hypot(a[0] - ox, a[1] - oz) < 100);
  // Gwanghwamun and the north bank of Cheonggyecheon (Gyeongbokgung's map) take the rest.
  for (const id of ['dano-hanbok', 'haneul-drip', 'sagye-gelato', 'slow-brunch']) assert.equal(districtAt(boxes, ...stores.find((x) => x.id === id).at), 'gyeongbokgung', id);
  // No shop is left in the row on Samcheong-ro, up the palace's east side (hard to reach, Yozi).
  const [gx, gz] = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
  const row = stores.filter((s) => s.at[0] > gx + 120 && s.at[0] < gx + 180 && s.at[1] > gz - 460 && s.at[1] < gz && districtAt(boxes, ...s.at) === 'gyeongbokgung');
  assert.deepEqual(row.map((s) => s.id), []);
  // A second hanbok rental: the same sets as by the palace.
  const a = stores.find((x) => x.id === 'dano-hanbok').products.map((p) => p.rent);
  assert.deepEqual(stores.find((x) => x.id === 'gahoe-hanbok').products.map((p) => p.rent), a);
});

test('each Bukchon shop door stands in the middle of a hanok bay', async () => {
  // Off the middle, the shop front runs into the bay's corner post (Yozi).
  const { shopBays } = await import('../src/core/hanok.js');
  const [ox, oz] = region.districts.find((d) => d.id === 'bukchon').offset;
  let n = 0;
  for (const s of stores.filter((x) => x.front === 'hanok')) {
    const [x, z] = [s.at[0] - ox, s.at[1] - oz];
    // the hanok whose front the door is in front of (measured along its front and across it)
    const frame = (h) => {
      const [fx, fz] = h.fr, c = [h.p.reduce((t, q) => t + q[0], 0) / 4, h.p.reduce((t, q) => t + q[1], 0) / 4];
      const along = h.p.map(([px, pz]) => -(px - c[0]) * fz + (pz - c[1]) * fx), deep = h.p.map(([px, pz]) => (px - c[0]) * fx + (pz - c[1]) * fz);
      return { u: -(x - c[0]) * fz + (z - c[1]) * fx, v: (x - c[0]) * fx + (z - c[1]) * fz, L: Math.max(...along) - Math.min(...along), D: Math.max(...deep) - Math.min(...deep) };
    };
    const b = map.buildings.filter((h) => { if (!h.hanok || !h.fr) return false; const f = frame(h); return Math.abs(f.u) < f.L / 2 && f.v > f.D / 2 && f.v < f.D / 2 + 3; })
      .sort((g, h) => (frame(g).v - frame(g).D / 2) - (frame(h).v - frame(h).D / 2))[0];
    if (!b) continue; // (Jongmyo's and Ikseon-dong's hanok shops are on other maps)
    n++;
    const f = frame(b);
    const off = Math.min(...shopBays(f.L).map((m) => Math.abs(f.u - m)));
    assert.ok(off < 0.5, `${s.id} is ${off.toFixed(1)} m off the middle of its bay`);
  }
  assert.ok(n >= 12);
});

test('the photo spots pay once each, all four pay a bonus, and the Open House parts make a Hanok Explorer', () => {
  const st = mem();
  const book = new ViewBook(st);
  assert.equal(book.take(11), VIEW_REWARD);
  assert.equal(book.take(11), 0);
  assert.equal(book.take(13), VIEW_REWARD);
  assert.equal(book.take(15), VIEW_REWARD);
  assert.equal(book.take(18), VIEW_REWARD + ALL_VIEWS_REWARD);
  assert.ok(book.done);
  assert.equal(new ViewBook(st).count, 4); // saved
  assert.equal(book.take(9), 0);
  // an old save (the one hilltop spot, n 1) counts for none of them
  const old = mem(); old.setItem('mk.bukchonViews', '[1]');
  assert.equal(new ViewBook(old).count, 0);
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

test('Bukchon is open: no made-up wall or gate, every house on its ground', () => {
  const [x0, z0, x1, z1] = BUKCHON.area;
  assert.equal(map.meta.enclosure, undefined); // seen from the street, no entering step
  for (const b of map.buildings) for (const [x, z] of b.p) assert.ok(x > x0 && x < x1 && z < z0 && z > z1, 'a house outside Bukchon');
  assert.equal(map.landmarks.filter((l) => ['hanokwalls', 'bukchongate', 'terrace'].includes(l.type)).length, 0);
  assert.equal(BUKCHON.gates, undefined);
  // Gyeongbokgung's old placeholder row on Bukchon's ground is gone, and its box stops at Bukchon's edge.
  const gb = read('districts/gyeongbokgung.json'), gd = region.districts.find((d) => d.id === 'gyeongbokgung').offset, bd = region.districts.find((d) => d.id === 'bukchon').offset;
  for (const b of gb.buildings) {
    const cx = b.p.reduce((s, q) => s + q[0], 0) / b.p.length + gd[0] - bd[0], cz = b.p.reduce((s, q) => s + q[1], 0) / b.p.length + gd[1] - bd[1];
    assert.ok(!(cx > x0 && cx < x1 && cz < z0 && cz > z1), 'a Gyeongbokgung building on Bukchon');
  }
  // Gyeongbokgung's palace wall is still an enclosure you walk into.
  assert.deepEqual(gb.meta.enclosure.box, [-68, 0, 72, -216]); // (round the palace wall on its real line at 1/4: scripts/data/gyeongbokgung-wall.json)
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

test('the alleys are narrow and lined with hanok', () => {
  // Narrow (Bukchon's charm), but four or more people still pass side by side
  // (a person is 0.7 m across: PLAYER_R 0.35 in main.js); Bukchon-ro is the widest.
  for (const r of map.roads.filter((x) => x.k === 'walk')) assert.ok(r.w >= 4 * 0.7 && r.w <= 7, `a street ${r.w} m wide`);
  const hanok = map.buildings.filter((b) => b.hanok);
  assert.ok(hanok.length >= 140, `only ${hanok.length} hanok (Bukchon stays dense, Yozi 2026-11-10)`);
  // Walking up Bukchon-ro 11-gil, a hanok wall is beside you (one side at least) most of the way.
  const main = map.roads.filter((r) => r.n?.en === 'Bukchon-ro 11-gil').sort((a, b) => b.p.length - a.p.length)[0];
  const near = (x, z) => hanok.some((b) => inside(x, z, b.p));
  let n = 0, walled = 0;
  for (let i = 1; i < main.p.length; i++) {
    const [a, b] = [main.p[i - 1], main.p[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
    for (let t = 0; t < L; t += 1) {
      const x = a[0] + ((b[0] - a[0]) * t) / L, z = a[1] + ((b[1] - a[1]) * t) / L, o = main.w / 2 + 1.2;
      n++;
      if (near(x + nx * o, z + nz * o) || near(x - nx * o, z - nz * o)) walled++;
    }
  }
  // (a third at least: the lanes of Gahoe-dong cross it every few metres at 1/4,
  // and the photo spots keep a little room round them)
  assert.ok(walled / n > 0.3, `11-gil is lined with hanok only ${Math.round((walled / n) * 100)}% of the way`);
});

test('a few homes are open to visitors: a sign, an open gate and a yard you can walk into', () => {
  const homes = map.buildings.filter((b) => b.visit);
  assert.ok(homes.length >= 2 && homes.length <= 4);
  const signs = map.landmarks.filter((l) => l.visit);
  assert.equal(signs.length, homes.length);
  for (const s of signs) assert.equal(s.title.ko, '출입 가능');
  const blocks = map.blockers.map((b) => b.p);
  for (const b of homes) {
    const cx = b.p.reduce((t, q) => t + q[0], 0) / 4, cz = b.p.reduce((t, q) => t + q[1], 0) / 4;
    const D = Math.max(...b.p.map(([x, z]) => (x - cx) * b.fr[0] + (z - cz) * b.fr[1])) * 2;
    // from the alley, through the gate in the middle of the front, into the yard
    for (let t = D / 2 + 1; t > D * 0.15; t -= 0.25) {
      const x = cx + b.fr[0] * t, z = cz + b.fr[1] * t;
      assert.ok(!blocks.some((p) => inside(x, z, p)), `the way into the home at ${cx},${cz} is shut at ${t}`);
    }
    assert.ok(signs.some((s) => Math.hypot(s.x - (cx + b.fr[0] * D / 2), s.z - (cz + b.fr[1] * D / 2)) < 4), 'a sign by the gate');
  }
});

test('the hill you see is the hill you walk on (the shadow lands at your feet)', async () => {
  await import('../src/core/landmarks.js'); // (it loads bukchon-models.js in the right order)
  const { buildBukchonHill } = await import('../src/core/bukchon-models.js');
  const hill = buildBukchonHill([], [0, 0]);
  const earth = hill.children[0], pos = earth.geometry.attributes.position;
  // every vertex on ground() (the mesh is a 3 m grid over the 6 m height grid)
  let worst = 0;
  for (let i = 0; i < pos.count; i++) worst = Math.max(worst, Math.abs(pos.getY(i) - 0.02 - ground(pos.getX(i), pos.getZ(i))));
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
