// Every statue with a face wears our characters' face (Yozi 2026-11-15:
// "동상들은 서울숲 콘들 빼고, 얼굴 들어가는 건 모두 우리 캐릭터 얼굴"):
// core/statue-face.js puts the basic model's head on Sejong, Admiral Yi,
// the Heavenly Kings at Jogyesa and Bongeunsa, the baby Buddha, the
// Maitreya Buddha and Gwaneum. Bongeunsa's Jinyeomun now has its four
// Heavenly Kings too (Yozi: "봉은사에도 사천왕상이 있는데").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { gateKings, KINGS } from '../src/core/heavenly-kings.js';
import { unitHeadGeometry, paintHead } from '../src/core/statue-face.js';

const src = (f) => readFileSync(new URL(`../src/core/${f}`, import.meta.url), 'utf8');

test('every statue with a face uses our characters\' face', () => {
  const uses = (f, n) => assert.equal((src(f).match(/statueFace\(/g) || []).length, n, f);
  uses('gwanghwamun-statues.js', 2); // Sejong, Admiral Yi
  uses('heavenly-kings.js', 1); // the kings at both temples
  uses('jogyesa-model.js', 1); // the baby Buddha
  uses('bongeunsa-model.js', 2); // the Maitreya Buddha, Gwaneum
  assert.match(src('jogyesa-model.js'), /heavenlyKing/);
  assert.doesNotMatch(src('park-art.js'), /statueFace/, 'the Seoul Forest ice creams stay as Yozi made them');
  for (const f of ['gwanghwamun-statues.js', 'jogyesa-model.js', 'bongeunsa-model.js']) assert.doesNotMatch(src(f), /\/\/ (eyes|brows|fierce brows|half-closed eyes)\b/, `${f}: the old drawn-on face is gone`);
});

test('Bongeunsa has four Heavenly Kings in Jinyeomun\'s side bays, facing the way through', () => {
  const d = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/samseong.json', import.meta.url), 'utf8'));
  const temple = d.landmarks.find((l) => l.type === 'bongeunsa');
  const gate = temple.halls.find((h) => h[5] === 'g');
  assert.ok(gate, 'Jinyeomun');
  assert.match(src('bongeunsa-model.js'), /gateKings\(jinyeomun/);
  const [, , w, dd] = gate;
  const g = gateKings(gate, { scale: 0.9, y: 0.55, bay: w * 0.375 });
  assert.equal(g.children.length, 4);
  assert.deepEqual(g.children.map((k) => k.children.length > 5), [true, true, true, true]);
  for (const k of g.children) {
    const x = k.position.x, z = k.position.z;
    assert.ok(Math.abs(x) > w / 6 + 0.45 && Math.abs(x) < w / 2 - 0.4, `in a side bay (walled off for walking), not the passage: x ${x}`);
    assert.ok(Math.abs(z) < dd / 2 - 0.45, 'under the roof');
    const face = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), k.rotation.y);
    assert.ok(face.x * -Math.sign(x) > 0.99, 'facing the passage');
    assert.ok(0.55 + 2.6 * 0.9 < 3.65, 'below the gate\'s beam');
  }
  assert.equal(new Set(KINGS.map((k) => k.holds)).size, 4);
});

test('the statue head: scalp hair and earrings left out, 1 m across, painted per cell', () => {
  // A tiny fake head: a skin triangle, a hair triangle on the scalp, an
  // earring triangle (atlas cell 3,0) and an eye triangle.
  const cellUv = (c, r) => [(c + 0.5) / 8, (r + 0.5) / 4];
  const tris = [[[0, 0, 0.9], [0.4, 0, 0.9], [0, 0.4, 0.9], cellUv(0, 0)], [[0, 1.2, 0], [0.4, 1.2, 0], [0, 1.3, -0.4], cellUv(1, 0)], [[1, 0, 0], [1.1, 0, 0], [1, -0.2, 0], cellUv(3, 0)], [[0.2, 0.1, 0.95], [0.3, 0.1, 0.95], [0.25, 0.2, 0.95], cellUv(2, 0)]];
  const pos = [], uv = [];
  for (const [a, b, c, u] of tris) { pos.push(...a, ...b, ...c); uv.push(...u, ...u, ...u); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const u = unitHeadGeometry(new THREE.Mesh(geo));
  const idx = [...u.geo.index.array];
  assert.ok(idx.every((i) => i < 12 ? [0, 1, 2, 9, 10, 11].includes(i) : true), 'scalp hair and the earring are left out');
  assert.ok(idx.some((i) => i >= 12), 'the shaved cap closes the skull');
  const xs = idx.map((i) => u.geo.attributes.position.getX(i));
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 1) < 1e-6, '1 m across (the part that is drawn)');
  const m = paintHead(u, { skin: '#ffffff', hair: '#000000', eyes: '#ff0000' });
  const col = m.geometry.attributes.color;
  assert.equal(col.getX(9), 1); assert.equal(col.getY(9), 0); // the eye
  assert.equal(col.getX(0), 1); assert.equal(col.getY(0), 1); // the skin
});
