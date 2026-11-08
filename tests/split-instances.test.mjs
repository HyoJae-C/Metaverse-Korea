import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { splitInstances } from '../src/core/split-instances.js';

const place = (mesh, pts) => {
  const m = new THREE.Matrix4();
  pts.forEach(([x, z], i) => mesh.setMatrixAt(i, m.makeTranslation(x, 0, z)));
};
const positions = (root) => {
  const out = [], m = new THREE.Matrix4(), p = new THREE.Vector3();
  root.traverse((o) => { if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); out.push(p.setFromMatrixPosition(m).toArray().join()); } });
  return out.sort();
};

test('splits a spread-out mesh into tiles and keeps every instance', () => {
  const g = new THREE.Group();
  const pts = Array.from({ length: 60 }, (_, i) => [(i % 10) * 50, Math.floor(i / 10) * 50]);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), pts.length);
  place(mesh, pts);
  mesh.setColorAt(0, new THREE.Color('#ff0000'));
  mesh.name = 'trees';
  mesh.castShadow = true;
  g.add(mesh);
  const before = positions(g);
  const r = splitInstances(g, { tile: 100, min: 10 });
  assert.equal(r.split, 1);
  assert.ok(r.tiles > 1);
  assert.equal(g.children.includes(mesh), false);
  assert.deepEqual(positions(g), before);
  for (const part of g.children) {
    assert.equal(part.name, 'trees');
    assert.equal(part.castShadow, true);
    assert.equal(part.geometry, mesh.geometry);
    assert.ok(part.boundingSphere.radius < 120); // a tile, not the whole map
  }
  const red = g.children.find((c) => { const m = new THREE.Matrix4(); for (let i = 0; i < c.count; i++) { c.getMatrixAt(i, m); if (m.elements[12] === 0 && m.elements[14] === 0) return true; } return false; });
  assert.equal(red.getColorAt(0, new THREE.Color()).getHexString(), 'ff0000');
});

test('leaves dynamic, small, opted-out and single-tile meshes alone', () => {
  const g = new THREE.Group();
  const make = (n, spread) => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), n); place(m, Array.from({ length: n }, (_, i) => [i * spread, 0])); g.add(m); return m; };
  const dynamic = make(50, 40); dynamic.frustumCulled = false;
  const optOut = make(50, 40); optOut.userData.noSplit = true;
  const small = make(5, 400);
  const compact = make(50, 0.5);
  assert.deepEqual(splitInstances(g, { tile: 80, min: 24 }), { split: 0, tiles: 0 });
  assert.deepEqual(g.children, [dynamic, optOut, small, compact]);
});
