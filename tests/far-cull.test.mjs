// FarCull (core/enclosure.js): what is past the fog is hidden by real time,
// and at once after a jump (a taxi ride), not after many slow frames.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FarCull } from '../src/core/enclosure.js';

const thing = (x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)); m.position.set(x, 0, z); m.updateMatrixWorld(); return m; };

test('a jump hides what is far from the new spot on the same frame', () => {
  const near = thing(0, 0), far = thing(1000, 0);
  const c = new FarCull([near, far], () => 300);
  c.update(0.05, { x: 0, z: 0 }, 0);
  assert.equal(near.visible, true);
  assert.equal(far.visible, false);
  // A taxi to the far one, 10 ms later (a slow phone's capped dt): checked at once.
  c.update(0.05, { x: 1000, z: 0 }, 10);
  assert.equal(near.visible, false);
  assert.equal(far.visible, true);
});

test('walking: checked every 0.4 s of real time, however short the frames', () => {
  const a = thing(320, 0);
  const c = new FarCull([a], () => 300);
  c.update(0.05, { x: 0, z: 0 }, 0);
  assert.equal(a.visible, false);
  c.update(0.05, { x: 30, z: 0 }, 100); // a short walk, too soon
  assert.equal(a.visible, false);
  c.update(0.05, { x: 30, z: 0 }, 450);
  assert.equal(a.visible, true);
});

test('a big thing goes as a whole past the fog, with what is added inside it later', () => {
  const stream = new THREE.Group();
  for (let x = 1000; x <= 1600; x += 100) stream.add(thing(x, 0));
  const c = new FarCull([stream], () => 300);
  const lantern = thing(1300, 0); stream.add(lantern); // a wish floating down, added later
  c.update(0.05, { x: 0, z: 0 }, 0);
  assert.equal(stream.visible, false);
  c.update(0.05, { x: 900, z: 0 }, 10);
  assert.equal(stream.visible, true);
});

test('children added later to a watched container are culled too', () => {
  const box = new THREE.Group();
  const c = new FarCull([], () => 300, [box]);
  const late = thing(1000, 0); box.add(late);
  c.update(0.05, { x: 0, z: 0 }, 0);
  assert.equal(late.visible, false);
});
