// game/gpu-janitor.js: textures whose materials haven't been drawn for a
// while are freed; ones a recently drawn material still uses are kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sweep } from '../src/game/gpu-janitor.js';

const freed = (t) => { let d = false; t.addEventListener('dispose', () => { d = true; }); return () => d; };

test('frees idle textures, keeps drawn and shared ones', () => {
  const scene = new THREE.Scene();
  const shared = new THREE.Texture(), farOnly = new THREE.Texture(), near = new THREE.Texture(), rt = new THREE.WebGLRenderTarget(4, 4).texture;
  const far = new THREE.MeshBasicMaterial({ map: farOnly, alphaMap: shared });
  const close = new THREE.MeshBasicMaterial({ map: near, alphaMap: shared });
  const mirror = new THREE.MeshBasicMaterial({ map: rt });
  const never = new THREE.MeshBasicMaterial({ map: new THREE.Texture() });
  for (const m of [far, close, mirror, never]) scene.add(new THREE.Mesh(new THREE.BoxGeometry(), m));
  far.__drawn = 0; mirror.__drawn = 0; close.__drawn = 100_000;
  const f = [farOnly, shared, near, rt, never.map].map(freed);
  assert.equal(sweep([scene], 120_000, 60_000), 1);
  assert.deepEqual(f.map((x) => x()), [true, false, false, false, false]);
  assert.equal(sweep([scene], 121_000, 60_000), 0, 'not freed twice');
  close.__drawn = 0; far.__drawn = 125_000; // drawn again: back in use
  assert.equal(sweep([scene], 130_000, 60_000), 1, 'near is idle now');
});
