// Children's Grand Park zoo: a room you walk into from the gate plaza; the
// pens fit it and keep off the paths, feeding times take turns, and the
// hippo eats its watermelon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildMap, zooGrounds, PENS, ZOO_OPEN, ZOO_ROOM, ZOO_GATE, ZOO_FENCE, ZOO_ENTRANCE, ZOO_STORE, SEA_DOOR, PLAZA, WALKS } from '../scripts/build-grand-park.mjs';
import { Zoo, feedPhase, fenceLines, FEED_CYCLE, FOOD_CUP } from '../src/core/zoo.js';
import { makeZooAnimal, ZOO_LOOKS } from '../src/core/zoo-animals.js';
import { inPolygon } from '../src/core/seoul-grid.js';

// (name boards and signs draw on a canvas; tests don't look at them)
globalThis.document ??= { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ width: 0 }) }) }) };

const map = buildMap(); // the street district
const G = zooGrounds(); // the zoo's room
const walks = G.walks; // the zoo's paths
const box = (p) => [p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2];
const overlap = (a, b, m = 0) => a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m;

test('pens sit inside the zoo, apart from each other and off the walking paths', () => {
  const { x0: px0, z0: pz0, x1: px1, z1: pz1 } = ZOO_ROOM;
  for (const p of PENS) {
    const b = box(p);
    assert.ok(b[0] >= px0 && b[2] <= px1 && b[1] >= pz0 && b[3] <= pz1, `${p.id} inside the zoo`);
    for (const q of PENS) {
      if (q === p) continue;
      if (p.in === q.id || q.in === p.id) { // a tank inside its hall: wholly inside
        const [inner, outer] = p.in ? [b, box(q)] : [box(q), b];
        assert.ok(inner[0] >= outer[0] && inner[2] <= outer[2] && inner[1] >= outer[1] && inner[3] <= outer[3], `${p.id} inside ${q.id}`);
      } else if (p.in && p.in === q.in) assert.ok(!overlap(b, box(q), 0.3), `${p.id} and ${q.id} apart`);
      else assert.ok(!overlap(b, box(q), 1), `${p.id} and ${q.id} apart`);
    }
    for (const r of walks) {
      for (let i = 1; i < r.p.length; i++) {
        const [[x1, z1], [x2, z2]] = [r.p[i - 1], r.p[i]];
        const seg = [Math.min(x1, x2) - r.w / 2, Math.min(z1, z2) - r.w / 2, Math.max(x1, x2) + r.w / 2, Math.max(z1, z2) + r.w / 2];
        assert.ok(!overlap(b, seg), `${p.id} keeps off the path ${JSON.stringify(r.p)}`);
      }
    }
  }
});

test('every fence line is a blocker, and the petting pen has a gate onto the main path', () => {
  const lines = PENS.reduce((n, p) => n + fenceLines(p).length + (p.solid || []).length, 0);
  assert.equal(G.blockers.length, lines + 1, 'one blocker per fence line and solid prop, and the Sea Animals hall');
  assert.equal(map.blockers.length, 2 + ZOO_FENCE.length - 1, 'on the street: the gate pillars and the zoo fence');
  const pet = PENS.find((p) => p.pet);
  assert.equal(pet.gate.side, 'n');
  assert.ok(pet.z - pet.d / 2 > 0 && pet.z - pet.d / 2 < 8, 'the gate opens just south of the main path (z 0)');
});

test('feeding times take turns, about one every two minutes', () => {
  const offs = PENS.filter((p) => p.feed).map((p) => p.feed.offset).sort((a, b) => a - b);
  assert.ok(offs.length >= 4);
  assert.equal(new Set(offs).size, offs.length, 'no two pens feed at once');
  for (let i = 1; i < offs.length; i++) assert.ok(offs[i] - offs[i - 1] >= 60, 'a feeding ends before the next starts');
  const pen = { feed: { offset: 120 } };
  assert.equal(feedPhase(pen, 120 + 10).now, true);
  assert.equal(feedPhase(pen, 120 + 70).now, false);
  assert.ok(Math.abs(feedPhase(pen, 120 - 30).until - 30) < 1e-6);
  assert.equal(feedPhase(pen, 120 + FEED_CYCLE + 5).now, true);
});

test('the hippo comes to the front, opens wide and crunches the watermelon', () => {
  const hip = { ...PENS.find((p) => p.id === 'hippos'), name: null };
  const P0 = G.pens.find((l) => l.id === 'hippos');
  assert.ok(P0.melon, 'the hippo pen has a watermelon spot');
  const notices = [];
  const zoo = new Zoo(new THREE.Scene(), [hip], (n) => notices.push(n.kind));
  const [mx, mz] = hip.melon;
  const P = zoo.melonSpot(hip.x + mx, hip.z + mz);
  assert.ok(P, 'standing on the spot');
  assert.equal(zoo.melonSpot(hip.x + mx + 6, hip.z + mz), null, 'not from further away');
  assert.ok(zoo.feedMelon(P, hip.x + mx, hip.z + mz));
  assert.equal(zoo.melonSpot(hip.x + mx, hip.z + mz), null, 'one watermelon at a time');
  const eater = zoo.melon.a;
  let opened = 0;
  for (let i = 0; i < 400 && zoo.melon; i++) {
    zoo.update(0.1, { x: hip.x + mx, z: hip.z + mz });
    opened = Math.max(opened, eater.jaw.rotation.x);
  }
  assert.equal(zoo.melon, null, 'finished');
  assert.ok(opened > 0.8, 'the mouth opened wide');
  assert.ok(notices.includes('crunch'));
});

test('the Sea Animals hall is a closed building on the path: its door leads into a room of its own', async () => {
  const hall = PENS.find((p) => p.id === 'sea');
  assert.equal(hall.fence, 'hall');
  assert.ok(hall.closed && !hall.gate, 'no way in through the walls');
  assert.ok(!PENS.some((p) => p.in === 'sea'), 'the tanks are in the room, not in the zoo');
  const zoo = new Zoo(new THREE.Scene(), [hall]);
  assert.equal(zoo.pens[0].roof, null, 'the roof never lifts away');
  zoo.update(0.1, { x: hall.x, z: hall.z });
  assert.equal(zoo.indoors, false);
  // Its walls are a blocker; its door is on the north side, onto the north path.
  const [x0, z0, x1, z1] = box(hall);
  assert.ok(G.blockers.some((bl) => JSON.stringify(bl.p) === JSON.stringify([[x0, z0], [x1, z0], [x1, z1], [x0, z1]])));
  assert.ok(SEA_DOOR.x > x0 + 3 && SEA_DOOR.x < x1 - 3 && SEA_DOOR.z === z0, 'the door is in the north wall');
  const out = SEA_DOOR.out;
  assert.ok(out.z < z0 && Math.abs(out.z - -38) < 2.5, 'you step out onto the north path');
  for (const bl of G.blockers) assert.ok(!inPolygon(out.x, out.z, bl.p), 'nothing in front of the door');
  const { SEA_STORE } = await import('../src/core/zoo-rooms.js');
  assert.equal(SEA_STORE.workshop, 'zoo-sea');
  const { readFileSync } = await import('node:fs');
  const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
  assert.ok(!stores.some((st) => st.id === SEA_STORE.id), 'not a door on the street');
});

test('inside the Sea Animals hall: three tanks behind glass, seals, a walrus and a polar bear, benches to watch from', async () => {
  const { buildInterior, roomOf, setZooBuilders, needsZoo } = await import('../src/core/interior.js');
  const { SEA_TANKS } = await import('../src/core/zoo-sea-hall.js');
  const { SEA_STORE: store } = await import('../src/core/zoo-rooms.js');
  if (needsZoo(store)) setZooBuilders(await import('../src/core/zoo-park.js'));
  const room = roomOf(store);
  const r = buildInterior(store);
  assert.ok(r.zooHall, 'the tanks are zoo pens');
  assert.deepEqual(r.zooHall.pens.flatMap((P) => P.animals.map((a) => a.kind)).sort(), ['polarbear', 'seal', 'seal', 'seal', 'walrus']);
  for (const t of SEA_TANKS) {
    assert.ok(t.x - t.w / 2 > -room.w / 2 && t.x + t.w / 2 < room.w / 2 && t.z - t.d / 2 > -room.d / 2, `${t.id} tank fits in the room`);
    assert.equal(t.board, false, 'its name is on the wall, not on a board in front of the glass');
    assert.equal(t.front, 's', 'its glass faces the walkway');
  }
  // The walk from the door to the glass is clear, and the tanks are solid.
  const inside = (x, z) => r.colliders.some((c) => inPolygon(x, z, c.p));
  for (let z = r.exit.z - 0.5; z > SEA_TANKS[0].z + SEA_TANKS[0].d / 2 + 0.3; z -= 0.5) assert.ok(!inside(0, z), `path open at ${z}`);
  for (const t of SEA_TANKS) assert.ok(inside(t.x, t.z), `${t.id} tank is solid`);
  assert.equal(r.seats.length, 4);
  for (const s of r.seats) assert.ok(!inside(...s.stand), 'you get up off the bench onto the floor');
  r.tick(0.1, new THREE.Vector3(0, 0, 3));
  r.tick(0.1, null);
});

test('the little animal village: a solid barn, food at its door, a keeper, and animals that eat from your hand', () => {
  const pet = PENS.find((p) => p.pet);
  const [sx, sz] = pet.shop.at;
  const barn = pet.solid[0].p;
  assert.ok(!inPolygon(sx, sz, barn), 'the counter stands outside the barn');
  const [, bxx, bzz, ry] = pet.props.find((q) => q[0] === 'barn');
  assert.ok(Math.abs(Math.atan2(sx - bxx, sz - bzz) - ry) < 0.05, 'in front of its door');
  const gate = [pet.gate.at, -pet.d / 2], toGate = Math.atan2(gate[0] - bxx, gate[1] - bzz);
  assert.ok(Math.cos(ry - toGate) > 0.85, 'the door and the counter face the gate, so you see them as you come in');
  assert.ok(Math.abs(Math.sin(ry)) > 0.5 && Math.abs(Math.cos(ry)) > 0.5, 'turned corner-on (diagonal)');

  const zoo = new Zoo(new THREE.Scene(), [{ ...pet, name: null }]);
  assert.ok(zoo.shopSpot(pet.x + sx, pet.z + sz));
  assert.ok(zoo.keeperSpot(pet.x + pet.keeper.at[0], pet.z + pet.keeper.at[1]));
  const a = zoo.pens[0].animals[0];
  assert.equal(zoo.feedPet(a, 0, 0), false, 'no food yet');
  zoo.buyFood();
  for (let i = 0; i < FOOD_CUP; i++) assert.ok(zoo.feedPet(a, 0, 0));
  assert.equal(zoo.food, 0);
  assert.equal(a.state, 'snack');
});

// Every zoo animal is one piece (no leg, tail, ear or flipper floating off
// on its own) and its eyes sit on the face, not buried inside the head.
test('zoo animals are joined up and their eyes show', () => {
  const inside = (m, p, slack = 1) => {
    const loc = m.worldToLocal(p.clone()), g = m.geometry;
    if (g.type === 'SphereGeometry') return loc.length() < g.parameters.radius * slack;
    g.computeBoundingBox();
    return g.boundingBox.clone().expandByScalar(0.002).containsPoint(loc);
  };
  for (const kind of Object.keys(ZOO_LOOKS)) {
    for (const c of ZOO_LOOKS[kind]) {
      const a = makeZooAnimal(kind, c);
      a.root.updateMatrixWorld(true);
      const meshes = [];
      a.root.traverse((o) => { if (o.isMesh && !o.material.transparent) meshes.push(o); });
      const verts = meshes.map((m) => {
        const p = m.geometry.attributes.position, out = [];
        for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld));
        return out;
      });
      const par = meshes.map((_, i) => i), f = (i) => (par[i] === i ? i : (par[i] = f(par[i])));
      for (let i = 0; i < meshes.length; i++) for (let j = 0; j < meshes.length; j++) {
        if (i !== j && f(i) !== f(j) && verts[i].some((v) => inside(meshes[j], v, 1.02))) par[f(i)] = f(j);
      }
      const roots = new Set(meshes.map((_, i) => f(i)));
      assert.equal(roots.size, 1, `${kind} is one piece`);
      const eyes = meshes.filter((m) => m.userData.eye);
      assert.ok(eyes.length >= 2, `${kind} has eyes`);
      for (const e of eyes) {
        const r = e.geometry.parameters.radius * e.getWorldScale(new THREE.Vector3()).x;
        const tip = e.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, r * 0.85).applyQuaternion(e.getWorldQuaternion(new THREE.Quaternion())));
        const over = meshes.find((m) => m !== e && !m.userData.eye && m.geometry.type === 'SphereGeometry' && inside(m, tip));
        assert.ok(!over, `${kind}'s eye shows`);
      }
    }
  }
});

test('the zoo is a room you walk into: on the street, the gate plaza, the entrance building and the fence round a wood', async () => {
  for (const t of ['zoopen', 'zoocarts', 'zooflowers', 'hoarding', 'doghole']) assert.ok(!map.landmarks.some((l) => l.type === t), `no ${t} on the street`);
  assert.equal(map.roads.filter((r) => r.k === 'walk').length, 1, 'one short walk, from the plaza to the zoo\'s door');
  const ent = map.landmarks.find((l) => l.type === 'zooentrance');
  assert.equal(ent.store, ZOO_STORE);
  assert.equal(ent.open, ZOO_OPEN);
  const b = map.buildings.find((o) => o.custom);
  assert.deepEqual(b.p, [[ZOO_ENTRANCE.x0, ZOO_ENTRANCE.z0], [ZOO_ENTRANCE.x1, ZOO_ENTRANCE.z0], [ZOO_ENTRANCE.x1, ZOO_ENTRANCE.z1], [ZOO_ENTRANCE.x0, ZOO_ENTRANCE.z1]]);
  const gate = map.landmarks.find((l) => l.type === 'cgpgate');
  assert.ok(gate.x < ZOO_ENTRANCE.x0, 'the rainbow gate comes first, on the plaza');
  const fence = map.landmarks.find((l) => l.type === 'zoofence');
  assert.deepEqual(fence.p[0], [ZOO_ENTRANCE.x1, ZOO_ENTRANCE.z0], 'the fence starts at the entrance…');
  assert.deepEqual(fence.p.at(-1), [ZOO_ENTRANCE.x1, ZOO_ENTRANCE.z1], '…and comes back round to it');
  // The door: the storefront on the entrance's west face, onto the plaza.
  const { readFileSync } = await import('node:fs');
  const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
  const store = read('stores.json').stores.find((st) => st.id === ZOO_STORE);
  assert.equal(store.workshop, 'zoo');
  assert.equal(store.size, 'zoo');
  assert.equal(store.district, 'grand-park');
  const [ox, oz] = read('region.json').districts.find((d) => d.id === 'grand-park').offset;
  const [dx, dz] = [store.at[0] - ox, store.at[1] - oz];
  assert.ok(dx < ZOO_ENTRANCE.x0 && ZOO_ENTRANCE.x0 - dx < 2 && Math.abs(dz) < 2, 'the door is on the west face, at the end of the walk');
  for (const bl of map.blockers) assert.ok(!inPolygon(dx, dz, bl.p), 'nothing in front of the door');
  // No taxi zones: the zoo is a room, and the plaza is open.
  const { noTaxiZones } = await import('../src/core/taxi.js');
  assert.equal(noTaxiZones(map.landmarks).length, 0);
});

test('inside the zoo: you come in at its west edge on the main path, and everything is in the room', async () => {
  const { ZOO_PARK_ROOM, ZOO_PARK_EXIT, ZOO_PARK_ENTRY } = await import('../src/core/zoo-rooms.js');
  for (const k of ['x0', 'x1', 'z0', 'z1']) assert.equal(ZOO_PARK_ROOM[k], ZOO_ROOM[k], k);
  assert.deepEqual([ZOO_PARK_EXIT.x, ZOO_PARK_EXIT.z], [ZOO_GATE.x, ZOO_GATE.z]);
  const { buildZooPark, patronSpots, GROUNDS } = await import('../src/core/zoo-park.js');
  assert.deepEqual(GROUNDS, JSON.parse(JSON.stringify(G)), 'src/data/zoo-grounds.json is up to date (node scripts/build-grand-park.mjs)');
  const r = buildZooPark({ id: ZOO_STORE }, ZOO_PARK_ROOM, ZOO_PARK_EXIT);
  const blocked = (x, z) => r.colliders.some((c) => inPolygon(x, z, c.p));
  for (const [x, z] of WALKS.main.p) assert.ok(!blocked(x, z), `main path open at ${x}, ${z}`);
  assert.ok(ZOO_PARK_ENTRY.x > ZOO_PARK_EXIT.x + 1.6, 'you come in a step past the way out');
  assert.ok(Math.abs(ZOO_PARK_ENTRY.z - WALKS.main.p[0][1]) < 1, 'on the main path');
  assert.deepEqual(r.stations.seaDoor[0], SEA_DOOR.out);
  // Visitors stand at the pens, outside the fences, off the walls.
  const pats = patronSpots(PENS);
  assert.ok(pats.length >= 12, `${pats.length} visitors at the pens`);
  for (const s of pats) {
    assert.ok(!blocked(s.x, s.z), `visitor at ${s.pen} stands free`);
    assert.ok(!PENS.some((p) => Math.abs(s.x - p.x) < p.w / 2 && Math.abs(s.z - p.z) < p.d / 2), `visitor at ${s.pen} is outside the pens`);
  }
  assert.equal(r.zoo.pens.length, PENS.length);
  r.tick(0.1, { x: ZOO_PARK_ENTRY.x, z: 0 });
  const far = r.zoo.pens.find((P) => P.pen.id === 'giraffes');
  assert.equal(far.g.visible, false, 'the far pens are not drawn from the gate');
  r.tick(0.1, { x: far.pen.x, z: far.pen.z - 15 });
  assert.equal(far.g.visible, true);
});

test('visitors stroll the paths: along them, round the ring, back at an end, stopping now and then', async () => {
  const { stepWalker } = await import('../src/game/zoo-visit.js');
  const ring = walks.findIndex((w) => w.closed), main = walks.findIndex((w) => !w.closed);
  assert.ok(ring >= 0 && main >= 0);
  const segDist = (x, z, [ax, az], [bx, bz]) => {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  };
  for (const path of [ring, main]) {
    const p = walks[path].p;
    const w = { path, i: 0, dir: 1, wait: 0, x: p[0][0], z: p[0][1], ry: 0 };
    let moved = 0, stops = 0, turns = 0, lastDir = 1;
    for (let k = 0; k < 4000; k++) {
      const sp = stepWalker(w, walks, 0.1, () => ((k * 0.618) % 1));
      if (sp > 0) moved++; else stops++;
      if (w.dir !== lastDir) { turns++; lastDir = w.dir; }
      const off = Math.min(...p.slice(1).map((q, i) => segDist(w.x, w.z, p[i], q)));
      assert.ok(off < 0.05, 'on the path');
    }
    assert.ok(moved > 2000 && stops > 0, 'mostly walking, a stop now and then');
    if (path === main) assert.ok(turns > 0, 'turns back at the end'); else assert.equal(turns, 0, 'round and round the ring');
  }
});

test('the vultures sit on their perches, open their wings, and fly round inside the tall aviary', () => {
  const pen = { ...PENS.find((p) => p.id === 'eagles'), name: null, feed: null };
  assert.ok(pen.tall >= 8 && pen.fence === 'aviary');
  const zoo = new Zoo(new THREE.Scene(), [pen]);
  const P = zoo.pens[0];
  zoo.update(0.05, { x: pen.x, z: pen.z + 30 });
  const perches = zoo._perches(P);
  for (const a of P.animals) assert.ok(perches.includes(a.at), 'starts on a perch');
  assert.equal(new Set(P.animals.map((a) => a.at)).size, P.animals.length, 'one bird a perch');
  let high = 0, flew = 0, spread = 0;
  for (let i = 0; i < 3000; i++) {
    zoo.update(0.05, { x: pen.x, z: pen.z + 30 });
    for (const a of P.animals) {
      const p = a.root.position;
      assert.ok(Math.abs(p.x) < pen.w / 2 && Math.abs(p.z) < pen.d / 2 && p.y < pen.tall, 'inside the aviary');
      if (a.fl) { flew++; high = Math.max(high, p.y); }
      spread = Math.max(spread, a.spread);
    }
  }
  assert.ok(flew > 0 && high > 5, 'flies up high');
  assert.ok(spread > 0.9, 'opens its wings');
  for (const a of P.animals) if (!a.fl) assert.ok(Math.abs(a.root.position.y - a.at.y) < 1e-6, 'lands on a perch');
});

test('the cart station sits inside the zoo, off the paths and pens, and carts stay in the zoo', async () => {
  const { createZooCarts, CART } = await import('../src/game/zoo-carts.js');
  const st = G.carts;
  assert.ok(st && st.carts.length === 3);
  for (const [cx, cz] of st.carts) {
    const b = [st.x + cx - 0.8, st.z + cz - 1.6, st.x + cx + 0.8, st.z + cz + 1.6];
    for (const p of PENS) assert.ok(!overlap(b, box(p), 0.5), `cart clear of ${p.id}`);
    for (const r of walks) for (let i = 1; i < r.p.length; i++) {
      const [[x1, z1], [x2, z2]] = [r.p[i - 1], r.p[i]];
      assert.ok(!overlap(b, [Math.min(x1, x2) - r.w / 2, Math.min(z1, z2) - r.w / 2, Math.max(x1, x2) + r.w / 2, Math.max(z1, z2) + r.w / 2]), 'cart off the path');
    }
  }
  const toasts = [];
  const game = { station: st, riding: 0, seated: null, shop: { toast: (m) => toasts.push(m) }, setRiding(k) { game.riding = k; } };
  const carts = createZooCarts(game);
  const at = { x: st.x + st.carts[1][0] - 1.5, z: st.z + st.carts[1][1] };
  assert.equal(carts.act({ x: st.x - 40, z: st.z }), null, 'not away from the station');
  carts.act(at).run();
  assert.equal(game.riding, CART);
  carts.tick({ x: 120, z: 0 });
  assert.equal(game.riding, CART, 'fine anywhere in the zoo');
  carts.tick({ x: 40, z: 0 });
  assert.equal(game.riding, 0, 'out of the gate: back to the station');
  assert.equal(toasts.length, 2);
});

test('every pen faces a path: its board side is a few steps from one', () => {
  const segs = walks.flatMap((r) => r.p.slice(1).map((q, i) => [r.p[i], q, r.w]));
  for (const p of PENS.filter((q) => !q.in)) {
    const side = p.board || 'n';
    const [fx, fz] = { n: [p.x, p.z - p.d / 2], s: [p.x, p.z + p.d / 2], w: [p.x - p.w / 2, p.z], e: [p.x + p.w / 2, p.z] }[side];
    const near = segs.some(([[x1, z1], [x2, z2], w]) => {
      const [ax, bx, az, bz] = [Math.min(x1, x2), Math.max(x1, x2), Math.min(z1, z2), Math.max(z1, z2)];
      const dx = Math.max(ax - fx, 0, fx - bx), dz = Math.max(az - fz, 0, fz - bz);
      return Math.hypot(dx, dz) - w / 2 < 6;
    });
    assert.ok(near, `${p.id} faces a path`);
  }
});

test('bears have no hump on the rump: a brown bear\'s hump is over its shoulders, a polar bear has none', () => {
  for (const kind of ['bear', 'polarbear']) {
    const a = makeZooAnimal(kind, ZOO_LOOKS[kind][0]);
    a.root.updateMatrixWorld(true);
    // The top of the back, front half against back half (front is +z).
    let front = 0, back = 0;
    a.body.children.filter((o) => o.isMesh).forEach((m) => {
      const b = new THREE.Box3().setFromObject(m), cz = (b.min.z + b.max.z) / 2;
      if (cz > 0) front = Math.max(front, b.max.y); else back = Math.max(back, b.max.y);
    });
    assert.ok(front >= back - 0.01, `${kind}: nothing bulges up on the rump`);
    if (kind === 'bear') assert.ok(front > back + 0.05, 'the brown bear\'s hump stands up over its shoulders');
  }
});

test('the paths wind: no long straight run, and they meet at a round flower plaza', () => {
  for (const [k, r] of Object.entries(WALKS)) {
    let run = 0, dir = null;
    for (let i = 1; i < r.p.length; i++) {
      const a = Math.atan2(r.p[i][1] - r.p[i - 1][1], r.p[i][0] - r.p[i - 1][0]);
      run = dir != null && Math.abs(a - dir) < 0.01 ? run + Math.hypot(r.p[i][0] - r.p[i - 1][0], r.p[i][1] - r.p[i - 1][1]) : 0;
      dir = a;
      assert.ok(run < 15 || (k === 'main' && r.p[i][0] <= 64), `${k}: straight for ${run.toFixed(0)} m at ${r.p[i]}`);
    }
  }
  const fl = G.flowers;
  assert.deepEqual([fl.x, fl.z], [PLAZA.x, PLAZA.z]);
  for (const k of ['main', 'east', 'crossNorth', 'crossSouth']) {
    const ends = [WALKS[k].p[0], WALKS[k].p.at(-1)];
    assert.ok(ends.some(([x, z]) => Math.abs(Math.hypot(x - PLAZA.x, z - PLAZA.z) - PLAZA.r) < 0.2), `${k} reaches the plaza`);
  }
});

test('flower beds and borders: plenty of them, off the paths, out of the pens, inside the zoo', () => {
  const fl = G.flowers;
  assert.ok(fl.beds.length >= 40 && fl.borders.length >= 20);
  const segDist = (x, z, [ax, az], [bx, bz]) => {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  };
  const pathGap = (x, z) => Math.min(...Object.values(WALKS).flatMap((r) => r.p.slice(1).map((q, i) => segDist(x, z, r.p[i], q) - r.w / 2)));
  const inPen = (x, z, m) => PENS.some((p) => Math.abs(x - p.x) < p.w / 2 + m && Math.abs(z - p.z) < p.d / 2 + m);
  for (const [bx, bz, r] of fl.beds) {
    const [x, z] = [bx + fl.x, bz + fl.z];
    assert.ok(pathGap(x, z) > r, `bed at ${x}, ${z} keeps off the paths`);
    assert.ok(!inPen(x, z, r), `bed at ${x}, ${z} is out of the pens`);
    assert.ok(x - r > ZOO_ROOM.x0 && x + r < ZOO_ROOM.x1 && z - r > ZOO_ROOM.z0 && z + r < ZOO_ROOM.z1, 'inside the zoo');
  }
  for (const [a, b, c, d] of fl.borders) {
    for (let t = 0; t <= 1; t += 0.1) {
      const [x, z] = [fl.x + a + (c - a) * t, fl.z + b + (d - b) * t];
      assert.ok(pathGap(x, z) > 0.3, `border at ${x.toFixed(1)}, ${z.toFixed(1)} off the paths`);
      assert.ok(!inPen(x, z, 0.3), 'outside its pen');
    }
  }
});

test('animal calls: every kind that moves has a voice, played when a motion starts, fading with distance', async () => {
  const { VOICES, LOUD, CALL_NAMES, callFor, fallOff, HEAR } = await import('../src/core/zoo-voices.js');
  const kinds = new Set(PENS.flatMap((p) => (p.groups || []).map((g) => g.kind)));
  for (const k of kinds) assert.ok(VOICES[k], `${k} has a voice`);
  for (const calls of Object.values(VOICES)) for (const c of Object.values(calls)) assert.ok(CALL_NAMES.includes(c) && LOUD[c] > 0, c);
  assert.equal(callFor('lion', 'roar'), 'roar');
  assert.equal(callFor('lion', 'walk'), null, 'walking about is quiet');
  assert.ok(fallOff(0) === 1 && fallOff(10) > fallOff(20) && fallOff(HEAR) === 0);
  // The zoo says when a motion starts, once.
  const lions = PENS.find((p) => p.id === 'lions');
  const zoo = new Zoo(new THREE.Scene(), [{ ...lions, name: null, feed: null }]); // (no feeding time: at the lions' feeding, by the clock, they'd all walk to the food)
  const heard = [];
  zoo.onSound = (b, m) => heard.push([b, m]);
  const a = zoo.pens[0].animals[0];
  a.state = 'roar'; a.t = 3;
  zoo.update(0.05, { x: lions.x, z: lions.z + 3 });
  zoo.update(0.05, { x: lions.x, z: lions.z + 3 });
  assert.equal(heard.filter(([b, m]) => b === a && m === 'roar').length, 1, 'this lion roared once'); // (the other lions may roar on their own)
});

test('zoo sounds: nearer is louder, panned to its side, and each animal waits before calling again', async () => {
  const { createZooSounds, COOLDOWN } = await import('../src/game/zoo-sounds.js');
  const zs = createZooSounds({ sfx: null, listener: () => ({ x: 0, z: 0, rx: 1, rz: 0 }) });
  const near = zs.placeOf(3, 0), far = zs.placeOf(20, 0), left = zs.placeOf(-5, 0);
  assert.ok(near.gain > far.gain && near.pan > 0 && left.pan < 0);
  assert.equal(zs.placeOf(60, 0), null, 'too far to hear');
  assert.ok(COOLDOWN >= 3);
});

test('the hippo: ears on hinges that flutter when it comes up, and more time out of the water', () => {
  const hippos = PENS.find((p) => p.id === 'hippos');
  const zoo = new Zoo(new THREE.Scene(), [{ ...hippos, name: null }]);
  const h = zoo.pens[0].animals[0];
  assert.equal(h.flaps.length, 2, 'two ears that move');
  h.phase = 0.05; // a set moment in the flutter (a random one can land where sin(34t) is ~0 and the ears look still)
  h.sink = 0.8; zoo._parts(h, 0.016);
  h.sink = 0.1; zoo._parts(h, 0.016); zoo._parts(h, 0.01);
  assert.ok(h.flick > 0, 'coming up: a flutter');
  assert.ok(h.flaps.some((e) => Math.abs(e.rotation.y) > 0.01), 'the ears move');
  // Picking what to do, in the water: out it comes, most of the time.
  const [px, pz] = hippos.pond;
  let swims = 0;
  for (let i = 0; i < 400; i++) {
    h.root.position.set(px, 0, pz); h.mate = null;
    zoo._pick(h, 100, 100, false, zoo.pens[0]);
    const tgt = h.state === 'walk' && h.target;
    if (!tgt || Math.hypot(tgt[0] - px, tgt[1] - pz) < hippos.pond[2]) swims++;
  }
  assert.ok(swims / 400 < 0.45, `stays in the water ${(swims / 4).toFixed(0)}% of picks`);
});

test('herbivore pens you can see across, bigger zebras, elephants and giraffes, a giraffe neck with two joints', async () => {
  const { SIZE } = await import('../src/core/zoo-animals.js');
  for (const [id, kind] of [['zebras', 'zebra'], ['elephants', 'elephant'], ['giraffes', 'giraffe'], ['kangaroos', 'kangaroo'], ['camels', 'camel']]) {
    const p = PENS.find((q) => q.id === id);
    assert.ok(p && p.groups.every((g) => g.kind === kind), `${id} holds ${kind}`);
    assert.ok(p.d <= 25, `${id} is small enough to see across`);
    assert.ok(SIZE[kind] > 1.2, `${kind} drawn bigger`);
  }
  assert.ok(!PENS.some((p) => p.id === 'savanna'));
  const g = makeZooAnimal('giraffe', ZOO_LOOKS.giraffe[0]);
  assert.ok(g.neck && g.neck2 && g.neck2.parent === g.neck, 'the upper neck hangs off the lower');
  const zoo = new Zoo(new THREE.Scene(), [{ ...PENS.find((q) => q.id === 'giraffes'), name: null }]);
  const a = zoo.pens[0].animals[0];
  a.state = 'drink';
  for (let i = 0; i < 60; i++) zoo._parts(a, 0.05);
  assert.ok(a.neck2.rotation.x > 0.5 && a.neck.rotation.x > a.neck0 + 0.5, 'both joints bend down to drink');
});

test('the snake: a smaller house, and a body that follows its head and coils up at rest', () => {
  const rep = PENS.find((p) => p.id === 'reptiles');
  assert.ok(rep.w * rep.d <= 80, 'a small reptile house');
  const zoo = new Zoo(new THREE.Scene(), [{ ...rep, name: null }]);
  const s = zoo.pens[0].animals[0];
  s.root.position.set(-2, 0, 0); s.root.rotation.y = Math.PI / 2; // heading +x
  for (let i = 0; i < 80; i++) { s.root.position.x += 0.03; s.phase += 0.03; zoo._slither(s, 0.03, true); }
  const tail = s.segs.at(-1).position, mid = s.segs[15].position;
  assert.ok(tail.z < mid.z && mid.z < 0, 'the body trails behind the head');
  assert.ok(s.segs.some((q) => Math.abs(q.position.x) > 0.03), 'in S curves');
  for (let i = 0; i < 200; i++) zoo._slither(s, 0.05, false);
  assert.ok(s.coil > 0.9, 'coiled up at rest');
  const spread = Math.max(...s.segs.map((q) => Math.hypot(q.position.x, q.position.z)));
  assert.ok(spread < 0.5, 'a tight coil');
});

test('kangaroos and camels: pens of their own beside the zebras and the elephants; kangaroos hop, camels have two humps', () => {
  const pen = (id) => PENS.find((p) => p.id === id);
  const [zeb, kan, ele, cam] = ['zebras', 'kangaroos', 'elephants', 'camels'].map(pen);
  assert.ok(Math.abs(kan.z - zeb.z) < 1e-6 && kan.x > zeb.x, 'the kangaroos next to the zebras');
  assert.ok(Math.abs(cam.z - ele.z) < 1e-6 && cam.x > ele.x, 'the camels next to the elephants');
  assert.ok(!zeb.groups.some((g) => g.kind === 'kangaroo'), 'not in with the zebras');
  // Hopping: both feet together, up off the ground, as it goes.
  const zoo = new Zoo(new THREE.Scene(), [{ ...kan, name: null, feed: null, groups: [{ ...kan.groups[0], n: 1 }] }]); // (one, alone: no other to bump into)
  const k = zoo.pens[0].animals[0];
  assert.ok(k.hop && k.hopH > 0.2);
  k.state = 'walk'; k.target = [k.root.position.x > 0 ? -4 : 4, 0]; k.t = 10; // (across the pen, so it doesn't arrive or hit the fence)
  let up = 0;
  for (let i = 0; i < 40; i++) { zoo._step(k, 0.05, 50, 50, zoo.pens[0]); up = Math.max(up, k.body.position.y); }
  assert.ok(up > 0.15, 'up off the ground');
  assert.ok(k.legs.every((l) => l.rotation.x === 0), 'feet together, no walking steps');
  const c = makeZooAnimal('camel', ZOO_LOOKS.camel[0]);
  c.root.updateMatrixWorld(true);
  const tops = c.body.children.filter((o) => o.isMesh && o.position.y > 1.15 && o.position.y < 1.3);
  assert.equal(tops.length, 2, 'two humps');
});

test('the camel ride: a loop round the herbivores from a stand on the path, clear of every pen', () => {
  const C = G.camels;
  assert.ok(C && C.p.length > 40, 'a camel trek in the zoo grounds');
  assert.deepEqual(C.p[0], [C.x, C.z], 'it starts at the stand');
  assert.deepEqual(C.p[C.p.length - 1], C.p[0], 'and comes back round to it');
  const near = (x, z, P) => Math.hypot(Math.max(0, Math.abs(x - P.x) - P.w / 2), Math.max(0, Math.abs(z - P.z) - P.d / 2));
  let onPath = 0;
  for (const [x, z] of C.p) {
    for (const P of PENS) assert.ok(near(x, z, P) > 1.2, `trek at ${x}, ${z} clear of the ${P.id} pen`);
    assert.ok(x > ZOO_ROOM.x0 + 5 && x < ZOO_ROOM.x1 - 5 && z > ZOO_ROOM.z0 + 5 && z < ZOO_ROOM.z1 - 5, 'inside the zoo');
    if (Object.values(WALKS).some((r) => r.p.some((q) => Math.hypot(q[0] - x, q[1] - z) < r.w / 2 + 1.5))) onPath++;
  }
  assert.ok(onPath / C.p.length > 0.9, `it keeps to the paths (${onPath}/${C.p.length})`);
  const camelPen = PENS.find((p) => p.id === 'camels');
  assert.ok(near(C.x, C.z, camelPen) < 4, 'the stand is by the camels');
  for (const id of ['zebras', 'kangaroos', 'elephants', 'camels', 'giraffes']) {
    const P = PENS.find((p) => p.id === id);
    assert.ok(C.p.some(([x, z]) => near(x, z, P) < 4), `the ride passes the ${id}`);
  }
});

test('the camel ride runs on the shared clock: one camel kneels at the stand at a time, then walks the loop', async () => {
  const { trekTrack, camelAt, cycle, LOAD, KNEEL, PACE, RIDE_CAMELS } = await import('../src/core/zoo-camel-ride.js');
  const tr = trekTrack(G.camels.p);
  assert.ok(tr.L > 150 && tr.L < 220, `a lap of ${tr.L.toFixed(0)} m`);
  const C = cycle(tr);
  assert.ok(C / RIDE_CAMELS - LOAD < 75, 'never much more than a minute to wait for a camel');
  let prev = null, boardable = 0;
  for (let T = 1000; T < 1000 + C; T += 0.25) {
    const st = [0, 1].map((i) => camelAt(tr, T, i));
    assert.ok(!(st[0].phase === 'load' && st[1].phase === 'load'), 'never both at the stand');
    for (const s of st) {
      assert.ok(s.speed <= PACE + 1e-9 && s.speed >= 0);
      if (s.phase === 'load') { assert.equal(s.speed, 0); assert.deepEqual([s.x, s.z], G.camels.p[0]); }
      if (s.board) { assert.equal(s.kneel, 1, 'you get on while it kneels'); boardable++; }
    }
    if (prev && prev.phase === 'walk' && st[0].phase === 'walk') assert.ok(st[0].s >= prev.s - 1e-9, 'it walks on, never back');
    prev = st[0];
  }
  assert.ok(boardable * 0.25 > (LOAD - 2 * KNEEL - 2) * RIDE_CAMELS, 'each camel waits long enough to get on');
  // Kneeling down, waiting, getting up.
  const T0 = 5000 - (5000 % C) + C; // (camel 0's lap starts on a whole cycle)
  const at = (t) => camelAt(tr, T0 + t, 0);
  assert.equal(at(0.1).phase, 'load');
  assert.ok(at(1).kneel > 0 && at(1).kneel < 1, 'kneeling down');
  assert.equal(at(LOAD / 2).kneel, 1);
  assert.ok(at(LOAD - 1).kneel < 1 && !at(LOAD - 1).board, 'getting up: too late to get on');
  assert.equal(at(LOAD + 30).phase, 'walk');
  assert.ok(Math.abs(at(LOAD + 30).speed - PACE) < 1e-9, 'walking at its pace');
});

test('riding a camel: pay at the stand, sit on the saddle, carried round, off at the stand', async () => {
  const { ZOO_PARK_ROOM, ZOO_PARK_EXIT } = await import('../src/core/zoo-rooms.js');
  const { buildZooPark } = await import('../src/core/zoo-park.js');
  const { createZooCamels, CAMEL_PRICE } = await import('../src/game/zoo-camels.js');
  const { cycle, LOAD } = await import('../src/core/zoo-camel-ride.js');
  const b = buildZooPark({ id: ZOO_STORE }, ZOO_PARK_ROOM, ZOO_PARK_EXIT);
  const R = b.camels;
  assert.ok(R && R.camels.length === 2, 'two saddled camels');
  const C = cycle(R.track);
  let T = 7000 - (7000 % C) + C + LOAD / 2; // camel 0 kneeling at the stand
  const realNow = Date.now;
  Date.now = () => T * 1000;
  try {
    let seated = null, coins = 10000;
    const toasts = [], me = { root: new THREE.Object3D() };
    const game = {
      built: () => b, here: () => true, shop: { toast: (m) => toasts.push(m) }, wallet: { spend: (n) => (coins >= n ? ((coins -= n), true) : false) },
      me, get seated() { return seated; }, riding: 0,
      sitDown: (s) => { seated = s; }, standUp: () => { me.root.position.set(seated.stand[0], 0, seated.stand[1]); seated = null; },
      makeNpc: () => ({ tag: { style: {} }, ch: { root: new THREE.Object3D(), wave() {} } }), t: (k) => k,
    };
    const cam = createZooCamels(game);
    cam.adopt(b);
    for (let k = 0; k < 20; k++) b.tick(0.1, { x: R.stand.x, z: R.stand.z }); // (the camels settle where the clock says)
    assert.equal(cam.act({ x: R.stand.x - 10, z: R.stand.z }), null, 'nothing away from the stand');
    const a = cam.act({ x: R.stand.x - 1, z: R.stand.z + 1 });
    assert.equal(a.key, 'zoocamel');
    a.run();
    assert.equal(coins, 10000 - CAMEL_PRICE);
    assert.equal(seated.camel, 0);
    b.tick(0.016, me.root.position);
    cam.tick();
    const low = me.root.position.y;
    assert.ok(Math.hypot(me.root.position.x - R.stand.x, me.root.position.z - R.stand.z) < 0.5, 'on the camel at the stand');
    assert.equal(cam.act({ x: R.stand.x, z: R.stand.z }), null, 'no second ride while on one');
    assert.equal(cam.offAct().key, 'zoocamel-off');
    // Off it goes: up, and along the loop.
    for (let t = 0; t < 60; t += 0.1) { T += 0.1; b.tick(0.1, me.root.position); cam.tick(); }
    assert.ok(seated, 'still riding');
    assert.ok(me.root.position.y > low + 0.8, `sitting up high once it stands (${low.toFixed(2)} → ${me.root.position.y.toFixed(2)})`);
    assert.ok(Math.hypot(me.root.position.x - R.stand.x, me.root.position.z - R.stand.z) > 20, 'carried away from the stand');
    // Round the loop and back: off at the stand.
    for (let t = 0; t < C; t += 0.1) { T += 0.1; b.tick(0.1, me.root.position); cam.tick(); if (!seated) break; }
    assert.equal(seated, null, 'off at the end of the lap');
    assert.ok(toasts.includes('zoocamel.done'));
    assert.ok(Math.hypot(me.root.position.x - R.stand.x, me.root.position.z - R.stand.z) < 3, 'stepped down at the stand');
    // Too poor: no ride.
    coins = 100;
    T = 9000 - (9000 % C) + C + LOAD / 2;
    cam.act({ x: R.stand.x, z: R.stand.z }).run();
    assert.equal(seated, null);
    assert.ok(toasts.includes('zoocamel.poor'));
  } finally { Date.now = realNow; }
});

test('the Sea Animals hall has pictures on its outside walls, with MODU SEOUL on them', async () => {
  const { hallMurals, ART } = await import('../src/core/zoo-murals.js');
  const sea = PENS.find((p) => p.id === 'sea');
  assert.ok(sea.murals?.length >= 4, 'murals round the hall');
  const ms = hallMurals(sea, 7.5);
  assert.equal(ms.length, sea.murals.length);
  for (const m of ms) {
    const g = m.geometry.parameters, p = m.position;
    assert.ok(p.y - g.height / 2 >= 0.5 && p.y + g.height / 2 <= 7.5 - 1.2, `${m.name} sits between the base and the band`);
    assert.ok(Math.abs(p.x) > sea.w / 2 || Math.abs(p.z) > sea.d / 2, `${m.name} is outside the walls`);
    const n = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), m.rotation.y);
    assert.ok(n.x * p.x + n.z * p.z > 0, `${m.name} faces out`);
  }
  for (const door of ms.filter((m) => Math.abs(m.position.z + sea.d / 2 + 0.17) < 0.01)) {
    assert.ok(Math.abs(door.position.x) - door.geometry.parameters.width / 2 > 1.6, `${door.name}: the door stays clear`);
  }
  assert.deepEqual([...new Set(sea.murals.map((m) => m.side))].sort(), ['e', 'n', 's', 'w'], 'pictures on all four walls');
  // The pictures say the game's name (the one beside the door says the hall's).
  for (const [name, [w, h, draw]] of Object.entries(ART).filter(([k]) => k !== 'friends')) {
    const said = [];
    const c = new Proxy({}, { get: (_, k) => (k === 'fillText' || k === 'strokeText' ? (t) => said.push(t) : () => ({})), set: () => true });
    draw(c, w, h);
    assert.ok(said.join(' ').replace(/\s+/g, ' ').includes('MODU') && said.join(' ').includes('SEOUL'), `${name} says MODU SEOUL`);
  }
});

test('the camel ride: a keeper leads each camel round, at its head on its left, clear of the pens', async () => {
  const { keeperSpot, LEAD } = await import('../src/game/zoo-camels.js');
  const { trekTrack, pointAt, headingAt } = await import('../src/core/zoo-camel-ride.js');
  // Facing +x the camel's left is -z: the keeper is ahead and to that side.
  const k = keeperSpot(0, 0, Math.PI / 2, false);
  assert.ok(Math.abs(k.x - LEAD.ahead) < 1e-9 && Math.abs(k.z + LEAD.side) < 1e-9, `at the head, on the left: ${k.x}, ${k.z}`);
  assert.ok(Math.abs(k.ry - Math.PI / 2) < 1e-9, 'walking the same way');
  const kl = keeperSpot(0, 0, Math.PI / 2, true);
  assert.ok(Math.cos(kl.ry - Math.PI / 2) < 0.5, 'at the stand, turned to the camel');
  const tr = trekTrack(G.camels.p);
  const near = (x, z, P) => Math.hypot(Math.max(0, Math.abs(x - P.x) - P.w / 2), Math.max(0, Math.abs(z - P.z) - P.d / 2));
  for (let s = 0; s < tr.L; s += 1) {
    const [x, z] = pointAt(tr, s), q = keeperSpot(x, z, headingAt(tr, s), false);
    for (const P of PENS) assert.ok(near(q.x, q.z, P) > 0.3, `keeper at ${q.x.toFixed(1)}, ${q.z.toFixed(1)} stays out of the ${P.id} pen`);
  }
});

test('the camel ride: the rider sits a touch behind the middle of the saddle', async () => {
  const { ZOO_PARK_ROOM, ZOO_PARK_EXIT } = await import('../src/core/zoo-rooms.js');
  const { buildZooPark } = await import('../src/core/zoo-park.js');
  const { SEAT, RIDER_BACK } = await import('../src/core/zoo-camel-ride.js');
  const R = buildZooPark({ id: ZOO_STORE }, ZOO_PARK_ROOM, ZOO_PARK_EXIT).camels;
  const c = R.camels[0].a.root, s = R.seat(0);
  const along = (s.x - c.position.x) * Math.sin(c.rotation.y) + (s.z - c.position.z) * Math.cos(c.rotation.y);
  assert.ok(RIDER_BACK > 0 && RIDER_BACK < 0.15, 'only a little');
  assert.ok(Math.abs(along - (SEAT.z - RIDER_BACK) * c.scale.x) < 1e-6 && along < 0, `behind the middle: ${along.toFixed(3)} m`);
});

test('the Sea Animals hall is getting ready: its door is barred and a sign hangs on its name board', async () => {
  const { ZOO_PARK_ROOM, ZOO_PARK_EXIT } = await import('../src/core/zoo-rooms.js');
  const { buildZooPark } = await import('../src/core/zoo-park.js');
  const sea = PENS.find((p) => p.id === 'sea');
  assert.equal(sea.ready, false);
  const r = buildZooPark({ id: ZOO_STORE }, ZOO_PARK_ROOM, ZOO_PARK_EXIT);
  assert.equal(r.stations.seaReady, false);
  const blocked = (x, z) => r.colliders.some((c) => inPolygon(x, z, c.p));
  assert.ok(blocked(SEA_DOOR.x, SEA_DOOR.z - 0.5), 'you can\'t walk up to the door');
  assert.ok(!blocked(SEA_DOOR.out.x, SEA_DOOR.out.z - 0.3), 'the path in front stays open');
  const { createZooVisit } = await import('../src/game/zoo-visit.js');
  const toasts = [];
  const v = createZooVisit({
    inZoo: () => true, L: (o) => o.en, fmt: (s) => s, t: (k) => k, shop: { toast: (m) => toasts.push(m) },
    sounds: { attach() {} }, makeNpc: () => ({ tag: { style: {} }, ch: { root: new THREE.Object3D() } }), randomLook: () => ({}),
    riding: 0, seated: null, enterSeaHall: () => { throw new Error('the hall is shut'); },
  });
  v.adopt(r);
  const a = v.action({ x: SEA_DOOR.out.x, z: SEA_DOOR.out.z - 0.4 });
  assert.equal(a.key, 'zoo-hall-shut');
  a.run();
  assert.ok(/getting ready/i.test(toasts[0]));
});
