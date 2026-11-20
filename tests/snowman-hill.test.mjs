// Snowballs and snow ducks sit on the ground up Namsan and the other hills,
// not at y 0 under the slope (Yozi 2026-11-20: gathered snow was invisible on Namsan).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSnowman } from '../src/game/snowman.js';

globalThis.document ??= { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) }; // (the snow speckle canvas)

test('a new snowball on a hill sits on the slope', () => {
  const scene = new THREE.Scene();
  const root = new THREE.Object3D();
  root.position.set(10, 42, 20);
  const s = createSnowman({
    mode: 'street', me: { root }, others: { players: new Map(), rootOf: () => null }, myId: 'me',
    shop: { toast() {} }, scene, depth: 1, snowing: false, onFoot: true, look: {}, heldKind: null,
    groundY: (x, z) => 40 + x * 0.1 + z * 0.05,
    snowNews() {}, send() {}, blocked: () => false, bubble() {}, sfx: () => null,
    clearAction() {}, resendState() {},
  });
  const act = s.action(root.position);
  assert.ok(act, 'a snowball can be started');
  act.run ? act.run() : act.fn?.();
  s.tick(0.016);
  const balls = scene.children.filter((c) => c.isGroup || c.type === 'Group');
  assert.equal(balls.length, 1);
  const b = balls[0].position;
  assert.ok(Math.abs(b.y - (40 + b.x * 0.1 + b.z * 0.05)) < 1e-6, `ball y ${b.y}`);
});
