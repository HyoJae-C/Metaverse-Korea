import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FarPeople } from '../src/core/far-people.js';

const person = (x) => {
  const g = new THREE.Group();
  const m = new THREE.SkinnedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  g.add(m);
  g.position.set(x, 0, 0);
  g.updateMatrixWorld(true);
  return [g, m];
};

test('takes far people off the camera layer and brings them back', () => {
  const scene = new THREE.Scene();
  const [nearG, near] = person(20);
  const [farG, far] = person(400);
  scene.add(nearG, farG);
  const box = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  box.position.x = 500; scene.add(box); scene.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera();
  const fp = new FarPeople({ far: 150 });
  fp.update(1, scene, camera);
  assert.equal(near.layers.isEnabled(0), true);
  assert.equal(far.layers.isEnabled(0), false);
  assert.equal(far.visible, true); // .visible untouched
  assert.equal(box.layers.isEnabled(0), true); // only people
  farG.position.x = 30; scene.updateMatrixWorld(true);
  fp.update(1, scene, camera);
  assert.equal(far.layers.isEnabled(0), true);
});

test('looks only every so often', () => {
  const scene = new THREE.Scene();
  const [g, m] = person(400); scene.add(g);
  const fp = new FarPeople({ far: 150, every: 0.25 });
  const camera = new THREE.PerspectiveCamera();
  fp.update(0.01, scene, camera);
  assert.equal(m.layers.isEnabled(0), false);
  g.position.x = 10; scene.updateMatrixWorld(true);
  fp.update(0.01, scene, camera); // too soon
  assert.equal(m.layers.isEnabled(0), false);
  fp.update(0.3, scene, camera);
  assert.equal(m.layers.isEnabled(0), true);
});

test('never takes your own character off the camera layer', () => {
  const scene = new THREE.Scene();
  const [meG, mine] = person(400); scene.add(meG);
  mine.layers.disable(0); mine.userData.farHidden = true; // (taken for far away earlier)
  const fp = new FarPeople({ far: 150 });
  fp.update(1, scene, new THREE.PerspectiveCamera(), meG);
  assert.equal(mine.layers.isEnabled(0), true);
  assert.equal(mine.userData.farHidden, false);
});
