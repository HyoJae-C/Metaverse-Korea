// Children's Grand Park zoo: the pens fit the park and keep off the paths,
// feeding times take turns, and the hippo eats its watermelon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildMap, PENS, ZOO_OPEN, HOARDING, PLAZA, WALKS } from '../scripts/build-grand-park.mjs';
import { Zoo, feedPhase, fenceLines, FEED_CYCLE, FOOD_CUP } from '../src/core/zoo.js';
import { makeZooAnimal, ZOO_LOOKS } from '../src/core/zoo-animals.js';
import { inPolygon } from '../src/core/seoul-grid.js';

// (name boards and signs draw on a canvas; tests don't look at them)
globalThis.document ??= { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ width: 0 }) }) }) };

const map = buildMap();
const box = (p) => [p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2];
const overlap = (a, b, m = 0) => a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m;

test('pens sit inside the park, apart from each other and off the walking paths', () => {
  const park = map.areas[0].p;
  const [px0, pz0] = [Math.min(...park.map((q) => q[0])), Math.min(...park.map((q) => q[1]))];
  const [px1, pz1] = [Math.max(...park.map((q) => q[0])), Math.max(...park.map((q) => q[1]))];
  for (const p of PENS) {
    const b = box(p);
    assert.ok(b[0] >= px0 && b[2] <= px1 && b[1] >= pz0 && b[3] <= pz1, `${p.id} inside the park`);
    for (const q of PENS) {
      if (q === p) continue;
      if (p.in === q.id || q.in === p.id) { // a tank inside its hall: wholly inside
        const [inner, outer] = p.in ? [b, box(q)] : [box(q), b];
        assert.ok(inner[0] >= outer[0] && inner[2] <= outer[2] && inner[1] >= outer[1] && inner[3] <= outer[3], `${p.id} inside ${q.id}`);
      } else if (p.in && p.in === q.in) assert.ok(!overlap(b, box(q), 0.3), `${p.id} and ${q.id} apart`);
      else assert.ok(!overlap(b, box(q), 1), `${p.id} and ${q.id} apart`);
    }
    for (const r of map.roads.filter((x) => x.k === 'walk')) {
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
  const hoard = ZOO_OPEN ? 0 : HOARDING.length - 1;
  assert.equal(map.blockers.length, 2 + lines + hoard, 'gate pillars + one blocker per fence line, solid prop and hoarding side');
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
  const P0 = map.landmarks.find((l) => l.id === 'hippos');
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

test('the Sea Animals hall is a closed building on the path: its door is a storefront, its inside a room of its own', async () => {
  const hall = PENS.find((p) => p.id === 'sea');
  assert.equal(hall.fence, 'hall');
  assert.ok(hall.closed && !hall.gate, 'no way in through the walls');
  assert.ok(!PENS.some((p) => p.in === 'sea'), 'the tanks are in the room, not on the street');
  const zoo = new Zoo(new THREE.Scene(), [hall]);
  assert.equal(zoo.pens[0].roof, null, 'the roof never lifts away');
  assert.ok(!zoo.pens[0].g.children.some((o) => o.name === 'hall-inner'));
  zoo.update(0.1, { x: hall.x, z: hall.z });
  assert.equal(zoo.indoors, false);
  // The walls you bump into are a custom building (drawn by the pen), whose
  // north face takes the storefront: the door onto the path.
  const b = map.buildings.find((o) => o.custom);
  const [x0, z0, x1, z1] = box(hall);
  assert.deepEqual(b.p, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  const { readFileSync } = await import('node:fs');
  const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
  const store = read('stores.json').stores.find((s) => s.id === 'cgp-sea-hall');
  assert.equal(store.workshop, 'zoo-sea');
  assert.equal(store.district, 'grand-park');
  const [ox, oz] = read('region.json').districts.find((d) => d.id === 'grand-park').offset;
  const [dx, dz] = [store.at[0] - ox, store.at[1] - oz];
  assert.ok(dx > x0 + 3 && dx < x1 - 3 && dz < z0 && z0 - dz < 2, 'the door is on the hall\'s north side, just outside it');
  assert.ok(Math.abs(dz - -38) < 2.5, 'on the north path');
  for (const bl of map.blockers) assert.ok(!inPolygon(dx, dz, bl.p), 'nothing in front of the door');
});

test('inside the Sea Animals hall: three tanks behind glass, seals, a walrus and a polar bear, benches to watch from', async () => {
  const { buildInterior, roomOf } = await import('../src/core/interior.js');
  const { SEA_TANKS } = await import('../src/core/zoo-sea-hall.js');
  const store = { id: 'cgp-sea-hall', workshop: 'zoo-sea', size: 'zoosea', category: 'play', name: { en: 'Sea Animals' }, colors: {} };
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
  const [x0, z0, x1, z1] = pet.solid[0];
  assert.ok(sx > x0 && sx < x1 && sz > z1, 'the counter stands in front of the barn, outside it');
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

test('before it opens, a hoarding closes the zoo off, and the gate plaza and station stay outside it', () => {
  if (ZOO_OPEN) return;
  const h = map.landmarks.find((l) => l.type === 'hoarding');
  assert.equal(h.closes, 'zoo');
  const xs = h.p.map((q) => q[0]), zs = h.p.map((q) => q[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  for (const p of PENS) assert.ok(p.x - p.w / 2 > x0 && p.x + p.w / 2 < x1 && p.z - p.d / 2 > z0 && p.z + p.d / 2 < z1, `${p.id} inside the hoarding`);
  const gate = map.landmarks.find((l) => l.type === 'cgpgate');
  assert.ok(gate.x < x0, 'the main gate and its plaza stay open');
  assert.deepEqual(h.p[0], h.p[h.p.length - 1], 'a closed loop');
});

test('while the zoo is closed, taxis cannot go in or drop you just over the hoarding', async () => {
  const { noTaxiZones, noTaxiAt, NO_TAXI_MARGIN } = await import('../src/core/taxi.js');
  const map = buildMap();
  const zones = noTaxiZones(map.landmarks);
  if (ZOO_OPEN) { assert.equal(zones.length, 0); return; }
  assert.equal(zones.length, 1);
  assert.ok(NO_TAXI_MARGIN > 0 && NO_TAXI_MARGIN <= 6, 'only a little past the fence');
  for (const pen of PENS) assert.ok(noTaxiAt(zones, pen.x, pen.z), pen.id);
  const [x0] = HOARDING[0];
  assert.ok(noTaxiAt(zones, x0 - NO_TAXI_MARGIN / 2, 0), 'just outside the hoarding is out too');
  assert.equal(noTaxiAt(zones, x0 - NO_TAXI_MARGIN - 1, 0), null);
  // The gate plaza, the main gate and the park's own pin stay reachable.
  const park = map.pois[0];
  assert.equal(noTaxiAt(zones, park.x, park.z), null);
  for (const l of map.landmarks) if (l.type === 'cgpgate' || (l.type === 'sign' && l.x < x0)) assert.equal(noTaxiAt(zones, l.x, l.z), null, l.type);
  // Once the hoarding comes down, so does the no-taxi area.
  assert.equal(noTaxiZones(map.landmarks.filter((l) => l.type !== 'hoarding')).length, 0);
});

test('a gap at the foot of the hoarding, on its line, for anyone to crawl through', () => {
  if (ZOO_OPEN) return;
  const hole = map.landmarks.find((l) => l.type === 'doghole');
  assert.ok(hole && hole.closes === 'zoo');
  const onLine = HOARDING.slice(1).some(([x1, z1], i) => {
    const [x0, z0] = HOARDING[i];
    return Math.abs((x1 - x0) * (hole.z - z0) - (z1 - z0) * (hole.x - x0)) < 1e-6 && hole.x >= Math.min(x0, x1) && hole.x <= Math.max(x0, x1) && hole.z >= Math.min(z0, z1) && hole.z <= Math.max(z0, z1);
  });
  assert.ok(onLine, 'on the hoarding');
  assert.ok(Math.abs(Math.sin(hole.ry)) === 1, 'faces across the west side');
  // Still a wall for everyone: the blockers along the side aren't cut.
  const blk = map.blockers.filter((b) => b.p.some(([x]) => x < hole.x) && b.p.some(([x]) => x > hole.x) && b.p.some(([, z]) => z <= hole.z) && b.p.some(([, z]) => z >= hole.z));
  assert.ok(blk.length >= 1);
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
  const st = map.landmarks.find((l) => l.type === 'zoocarts');
  assert.ok(st && st.carts.length === 3);
  for (const [cx, cz] of st.carts) {
    const b = [st.x + cx - 0.8, st.z + cz - 1.6, st.x + cx + 0.8, st.z + cz + 1.6];
    for (const p of PENS) assert.ok(!overlap(b, box(p), 0.5), `cart clear of ${p.id}`);
    for (const r of map.roads.filter((x) => x.k === 'walk')) for (let i = 1; i < r.p.length; i++) {
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
  const walks = map.roads.filter((r) => r.k === 'walk').flatMap((r) => r.p.slice(1).map((q, i) => [r.p[i], q, r.w]));
  for (const p of PENS.filter((q) => !q.in)) {
    const side = p.board || 'n';
    const [fx, fz] = { n: [p.x, p.z - p.d / 2], s: [p.x, p.z + p.d / 2], w: [p.x - p.w / 2, p.z], e: [p.x + p.w / 2, p.z] }[side];
    const near = walks.some(([[x1, z1], [x2, z2], w]) => {
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
  const fl = map.landmarks.find((l) => l.type === 'zooflowers');
  assert.deepEqual([fl.x, fl.z], [PLAZA.x, PLAZA.z]);
  for (const k of ['main', 'east', 'crossNorth', 'crossSouth']) {
    const ends = [WALKS[k].p[0], WALKS[k].p.at(-1)];
    assert.ok(ends.some(([x, z]) => Math.abs(Math.hypot(x - PLAZA.x, z - PLAZA.z) - PLAZA.r) < 0.2), `${k} reaches the plaza`);
  }
});

test('flower beds and borders: plenty of them, off the paths, out of the pens, inside the zoo', () => {
  const fl = map.landmarks.find((l) => l.type === 'zooflowers');
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
    assert.ok(x - r > 55 && x + r < 200 && z - r > -80 && z + r < 95, 'inside the hoarding');
  }
  for (const [a, b, c, d] of fl.borders) {
    for (let t = 0; t <= 1; t += 0.1) {
      const [x, z] = [fl.x + a + (c - a) * t, fl.z + b + (d - b) * t];
      assert.ok(pathGap(x, z) > 0.3, `border at ${x.toFixed(1)}, ${z.toFixed(1)} off the paths`);
      assert.ok(!inPen(x, z, 0.3), 'outside its pen');
    }
  }
});
