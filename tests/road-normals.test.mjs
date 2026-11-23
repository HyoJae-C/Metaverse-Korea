import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildWorld } from '../src/core/world.js';

// A base road's bends once drew each wedge twice (facing up and down) on the
// same vertices: their normals summed to zero and the bends showed as black
// streaks that changed with the camera (Bukchon, Yulgok-ro, 2026-11-17).
test('road ribbons face up with straight-up normals, bends included', () => {
  const scene = new THREE.Scene();
  const p = [[0, 0], [100, 0], [200, 30], [300, 0], [320, 80]];
  const map = { roads: [{ k: 'primary', base: true, w: 20, p }, { k: 'residential', w: 8, p }], areas: [], buildings: [], landmarks: [], rail: [] };
  buildWorld(map, scene, {});
  let meshes = 0;
  scene.traverse((o) => {
    if (o.name !== 'roads') return;
    meshes++;
    const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.index.array;
    for (let i = 0; i < N.count; i++) assert.ok(N.getY(i) > 0.99, `normal ${i} points up`);
    for (let t = 0; t < I.length; t += 3) {
      const [a, b, c] = [I[t], I[t + 1], I[t + 2]];
      const up = (P.getZ(b) - P.getZ(a)) * (P.getX(c) - P.getX(a)) - (P.getX(b) - P.getX(a)) * (P.getZ(c) - P.getZ(a));
      assert.ok(up >= 0, `triangle ${t / 3} faces up`);
    }
  });
  assert.equal(meshes, 2);
});
