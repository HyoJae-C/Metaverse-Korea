// Children's Grand Park zoo: the pens fit the park and keep off the paths,
// feeding times take turns, and the hippo eats its watermelon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildMap, PENS } from '../scripts/build-grand-park.mjs';
import { Zoo, feedPhase, fenceLines, FEED_CYCLE } from '../src/core/zoo.js';

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
    for (const q of PENS) if (q !== p) assert.ok(!overlap(b, box(q), 1), `${p.id} and ${q.id} apart`);
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
  const lines = PENS.reduce((n, p) => n + fenceLines(p).length, 0);
  assert.equal(map.blockers.length, 2 + lines, 'gate pillars + one blocker per fence line');
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
