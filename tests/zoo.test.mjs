// Children's Grand Park zoo: the pens fit the park and keep off the paths,
// feeding times take turns, and the hippo eats its watermelon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildMap, PENS, ZOO_OPEN, HOARDING } from '../scripts/build-grand-park.mjs';
import { Zoo, feedPhase, fenceLines, FEED_CYCLE, FOOD_CUP } from '../src/core/zoo.js';
import { makeZooAnimal, ZOO_LOOKS } from '../src/core/zoo-animals.js';

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

test('the Sea Animals hall holds three tanks, one animal kind each, with a door onto the path', () => {
  const hall = PENS.find((p) => p.id === 'sea');
  assert.equal(hall.fence, 'hall');
  assert.equal(hall.gate.side, 'n');
  const tanks = PENS.filter((p) => p.in === 'sea');
  assert.deepEqual(tanks.map((t) => t.groups[0].kind).sort(), ['polarbear', 'seal', 'walrus']);
  for (const t of tanks) assert.equal(t.groups.length, 1);
  const zoo = new Zoo(new THREE.Scene(), [hall]);
  zoo.update(0.1, { x: hall.x, z: hall.z });
  assert.equal(zoo.pens[0].roof.visible, false, 'the roof lifts away while you are inside');
  zoo.update(0.1, { x: hall.x, z: hall.z - 30 });
  assert.equal(zoo.pens[0].roof.visible, true);
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
