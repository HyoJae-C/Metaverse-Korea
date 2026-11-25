import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { StreetNpcs } from '../src/core/npcs.js';

// Street NPCs past FAR_PEOPLE aren't drawn (core/far-people.js), so they
// aren't posed or given a height or name tag either until they come near.
const npc = (x) => {
  const root = new THREE.Group(); root.position.set(x, 0, 0);
  const o = { ch: { root, poses: 0, animate() { this.poses++; } }, tag: { style: { display: '' } }, talkT: 0, pause: 99, target: null };
  return o;
};

test('far street NPCs skip pose, ground height and name tag; near ones keep them', () => {
  const npcs = new StreetNpcs(new THREE.Scene(), null, { nodes: [] }, [], 0, { groundY: () => 2 });
  const near = npc(20), far = npc(900);
  npcs.list.push(near, far);
  const camera = new THREE.PerspectiveCamera();
  npcs.update(0.016, camera, 800, 600);
  assert.equal(near.ch.poses, 1);
  assert.equal(far.ch.poses, 0);
  assert.equal(far.tag.style.display, 'none');
  assert.equal(far.ch.root.position.y, 0);
  far.ch.root.position.x = 40; // walked (or the camera came) near: set on the ground at once
  npcs.update(0.016, camera, 800, 600);
  assert.equal(far.ch.poses, 1);
  assert.equal(far.ch.root.position.y, 2);
});
