import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ANIMALS, pickKind, animalGeometry, createBukhanAnimals } from '../src/game/bukhansan-animals.js';

// Bukhansan's wild animals (game/bukhansan-animals.js): only now and then, the
// small ones by day, the chipmunk asleep under snow, the deer and the boar
// only in the lower woods and rare.
const seq = (seed = 7) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const tally = (ctx, n = 20000) => { const r = seq(), c = {}; for (let i = 0; i < n; i++) { const k = pickKind(r, ctx); c[k] = (c[k] || 0) + 1 / n; } return c; };

test('the small ones by day; under snow no chipmunk (it sleeps through the winter)', () => {
  const day = tally({ day: 1, snow: 0, low: false });
  assert.ok(day.chipmunk > 0.4 && day.squirrel > 0.25);
  assert.equal(day.deer, undefined, 'no deer up high');
  assert.equal(day.boar, undefined, 'no boar up high');
  assert.equal(tally({ day: 1, snow: 0.8, low: false }).chipmunk, undefined);
  assert.ok(tally({ day: 1, snow: 0.8, low: false }).squirrel > 0.25, 'the squirrel is out all winter');
  const night = tally({ day: 0.1, snow: 0, low: true });
  assert.equal(night.chipmunk, undefined); assert.equal(night.squirrel, undefined);
});

test('the deer and the boar are rare, the boar the rarest, both more at night', () => {
  const day = tally({ day: 1, low: true }), night = tally({ day: 0.1, low: true });
  assert.ok(day.deer < 0.08 && day.boar < 0.035 && day.boar < day.deer);
  assert.ok(night.deer > day.deer * 2 && night.boar > day.boar * 1.5);
  assert.ok(ANIMALS.every[0] >= 30, 'a chance at most every half minute or so');
});

test('each animal is one small shape (one draw call)', () => {
  for (const k of Object.keys(ANIMALS.kinds)) {
    const g = animalGeometry(k), tris = g.attributes.position.count / 3;
    assert.ok(tris < 800, `${k}: ${tris} triangles`);
    g.computeBoundingBox();
    assert.ok(g.boundingBox.min.y > -0.02, `${k} stands on its feet`);
  }
});

test('on a flat wood: one at a time, it comes, runs from you, and goes', () => {
  const group = new THREE.Group();
  const l = { x: 0, z: 0, pads: [{ k: 'hut', at: [0, 0] }] };
  const a = createBukhanAnimals({ group, l, y: () => 1, ok: () => true, rnd: seq(3), daylight: () => 1 });
  const p = { x: 0, y: 1, z: 0 };
  const seen = new Set();
  let most = 0;
  for (let i = 0; i < 20 * 60 * 10; i++) { // ten minutes walking north
    p.z += 0.12;
    a.update(p, 0.1);
    if (a.out) seen.add(a.out);
    most = Math.max(most, group.children.filter((m) => m.visible).length);
  }
  assert.equal(most, 1, 'never two at once');
  assert.ok(seen.has('chipmunk') || seen.has('squirrel'));
});
