import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { skipHiddenMatrices } from '../src/core/visible-matrices.js';
import { createScreenCovered } from '../src/game/screen-covered.js';

const at = (o) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).toArray();

function build() {
  const scene = skipHiddenMatrices(new THREE.Scene());
  const district = new THREE.Group(); district.position.set(100, 0, 0);
  const shop = new THREE.Group(); shop.position.set(5, 0, 0);
  const sign = new THREE.Mesh(); sign.position.set(0, 2, 0);
  sign.matrixAutoUpdate = false; sign.updateMatrix(); // (a frozen prop, like the rooms' meshes)
  shop.add(sign); district.add(shop); scene.add(district);
  scene.updateMatrixWorld();
  return { scene, district, shop, sign };
}

test('visible objects are placed like three.js does', () => {
  const { scene, sign, district } = build();
  assert.deepEqual(at(sign), [105, 2, 0]);
  district.position.x = 200;
  scene.updateMatrixWorld();
  assert.deepEqual(at(sign), [205, 2, 0]);
});

test('hidden objects are skipped, and placed right the frame they show again', () => {
  const { scene, sign, district, shop } = build();
  shop.visible = false;
  district.position.x = 300; // (the parent moves while the shop is hidden)
  scene.updateMatrixWorld();
  assert.deepEqual(at(sign), [105, 2, 0], 'not re-placed while hidden');
  scene.updateMatrixWorld(); // (more frames: the mark stays)
  shop.visible = true;
  scene.updateMatrixWorld();
  assert.deepEqual(at(sign), [305, 2, 0]);
});

test('a hidden frozen object under a frozen parent still catches up', () => {
  const { scene, sign, district, shop } = build();
  shop.matrixAutoUpdate = false; shop.updateMatrix();
  scene.updateMatrixWorld();
  shop.visible = false;
  district.position.x = -50;
  scene.updateMatrixWorld();
  shop.visible = true;
  scene.updateMatrixWorld();
  assert.deepEqual(at(sign), [-45, 2, 0]);
});

test('cameras in the scene keep their own update (matrixWorldInverse)', () => {
  const scene = skipHiddenMatrices(new THREE.Scene());
  const cam = new THREE.PerspectiveCamera(); cam.position.set(1, 2, 3);
  scene.add(cam);
  scene.updateMatrixWorld();
  assert.deepEqual(new THREE.Vector3().applyMatrix4(cam.matrixWorldInverse).toArray().map((v) => Math.round(v)), [-1, -2, -3]);
});

test('the screen counts as covered only with the full-screen reader or the gallery game up', () => {
  let hit = null;
  const doc = { querySelector: () => hit };
  const covered = createScreenCovered({ doc, every: 0.25 });
  assert.equal(covered(0.016), false);
  hit = {};
  assert.equal(covered(0.1), false, 'looked up only four times a second');
  assert.equal(covered(0.2), true);
});
