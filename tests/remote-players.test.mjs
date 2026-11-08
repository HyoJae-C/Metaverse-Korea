// Someone whose game is paused (a phone on its lock screen) is in the room
// but sends no position: they must not be drawn at the map's origin.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const el = () => ({ style: {}, className: '', textContent: '', remove() {}, append() {}, appendChild() {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, replaceChildren() {}, querySelector() { return null; } });
globalThis.document ??= { createElement: el };
const { RemotePlayers } = await import('../src/core/players.js');

test('a player is hidden until their first position arrives', () => {
  const scene = new THREE.Scene();
  const others = new RemotePlayers(scene, el());
  others.join({ id: 'a', name: 'jihoon', look: {} });
  const p = others.players.get('a');
  assert.equal(p.ch.root.visible, false);
  assert.equal(p.tag.style.display, 'none');
  assert.deepEqual(others.list(), []);
  assert.equal(others.nearestFree(0, 0, 5), null);
  const cam = new THREE.PerspectiveCamera();
  cam.position.set(0, 3, 6);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  others.update(0.016, cam, 800, 600);
  assert.equal(p.tag.style.display, 'none');

  others.state('a', { x: 40, z: -12, ry: 1, s: 0 });
  assert.equal(p.ch.root.visible, true);
  assert.equal(p.ch.root.position.x, 40);
  assert.deepEqual(others.list(), [{ x: 40, z: -12, name: 'jihoon' }]);
});

test('a blocked player stays hidden after their first position', () => {
  const others = new RemotePlayers(new THREE.Scene(), el());
  others.join({ id: 'b', name: 'x', look: {} });
  others.hide('b');
  others.state('b', { x: 1, z: 1, ry: 0, s: 0 });
  assert.equal(others.players.get('b').ch.root.visible, false);
});
