// game/room-cache.js: only the last few rooms stay in memory; an older one
// frees what only it used and takes its name tags off the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRoomCache, roomPeople } from '../src/game/room-cache.js';

const shared = new THREE.MeshBasicMaterial({ map: new THREE.Texture() }); // also on the street
const street = new THREE.Scene();
street.add(new THREE.Mesh(new THREE.BoxGeometry(), shared));

function makeRoom(id) {
  const scene = new THREE.Scene();
  const own = new THREE.MeshBasicMaterial({ map: new THREE.Texture() });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), own);
  scene.add(mesh, new THREE.Mesh(new THREE.BoxGeometry(), shared));
  const tag = { removed: false, remove() { this.removed = true; } };
  return { id, scene, own, mesh, clerkNpc: { ch: {}, tag }, tag };
}
const disposed = (o) => { let d = false; o.addEventListener('dispose', () => { d = true; }); return () => d; };

test('keeps the last rooms and lets the oldest go', () => {
  const built = {};
  const cache = createRoomCache({ max: 2, build: (s) => (built[s.id] = makeRoom(s.id)), shown: () => [street] });
  cache.room({ id: 'a' });
  const aOwn = disposed(built.a.own), aTex = disposed(built.a.own.map), aShared = disposed(shared), sharedTex = disposed(shared.map);
  cache.room({ id: 'b' });
  cache.room({ id: 'a' }); // a is the most recent again
  cache.room({ id: 'c' }); // b goes
  assert.deepEqual([...cache.values()].map((r) => r.id), ['a', 'c']);
  assert.equal(built.b.tag.removed, true, 'its name tag left the page');
  assert.equal(aOwn(), false);
  cache.room({ id: 'd' }); // a goes
  assert.equal(aOwn(), true, 'its own material freed');
  assert.equal(aTex(), true, 'and its texture');
  assert.equal(aShared(), false, 'the street still shows the shared material');
  assert.equal(sharedTex(), false);
  const again = cache.room({ id: 'a' });
  assert.notEqual(again, null);
  assert.equal(cache.size, 2);
});

test('rooms that must stay are never let go', () => {
  const cache = createRoomCache({ max: 1, build: (s) => makeRoom(s.id), keep: (id) => id === 'park' });
  cache.room({ id: 'park' });
  cache.room({ id: 'haunted' });
  assert.ok(cache.get('park'));
  assert.ok(cache.get('haunted'), 'the one just built stays too');
});

test('finds the people a room put on the page', () => {
  const p = (n) => ({ ch: {}, tag: {}, n });
  const people = roomPeople({ clerkNpc: p(1), vendorNpcs: [p(2), p(3)], rideStaff: { wheel: p(4) }, studioNpcs: { all: [p(5)] }, scene: new THREE.Scene() });
  assert.deepEqual(people.map((o) => o.n).sort(), [1, 2, 3, 4, 5]);
});
