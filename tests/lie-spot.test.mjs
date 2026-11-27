// Lying on a bed puts the head on its pillow (core/lie-spot.js, Yozi
// 2026-11-27: on every bed the head was half a metre short of the pillow).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LIE_HEAD, ON_PILLOW, PILLOW_TO_SPOT, lieSpot } from '../src/core/lie-spot.js';

const ctx = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : /Gradient|Pattern/.test(k) ? () => ({ addColorStop() {} }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => {}), set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => ctx, width: 0, height: 0, style: {} }) };
const { FURNITURE, buildFurniture, furnitureSeats } = await import('../src/core/furniture.js');
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(3)} vs ${b.toFixed(3)}`);

test('the head rests a little down from the pillow\'s middle, towards the foot end (+z of the bed)', () => {
  assert.ok(ON_PILLOW > 0 && ON_PILLOW < 0.15); // still on the pillow (they're 0.35-0.4 m deep)
  near(PILLOW_TO_SPOT, LIE_HEAD + ON_PILLOW, 1e-9, 'pillow to spot');
  const [x, z] = lieSpot(1, 2, 0);
  near(x, 1, 1e-9, 'x'); near(z, 2 + PILLOW_TO_SPOT, 1e-9, 'z');
  const [x2, z2] = lieSpot(1, 2, Math.PI / 2); // turned: the foot end is +x
  near(x2, 1 + PILLOW_TO_SPOT, 1e-9, 'x'); near(z2, 2, 1e-9, 'z');
});

test('beds are no longer than 1.85 m (Yozi 2026-11-27: shorter beds)', () => {
  for (const f of FURNITURE.filter((q) => q.lie === 2)) {
    assert.ok(f.size[1] <= 1.85, `${f.id}: ${f.size[1]} m`);
    const g = buildFurniture(f.id), b = new THREE.Box3().setFromObject(g);
    assert.ok(b.max.z - b.min.z <= f.size[1] + 0.08, `${f.id}: drawn ${(b.max.z - b.min.z).toFixed(2)} m long`);
  }
});

const beds = FURNITURE.filter((f) => f.lie);
test('every bed says where its pillow is', () => {
  assert.ok(beds.length >= 6, `beds: ${beds.map((f) => f.id)}`);
  for (const f of beds) assert.equal(typeof f.pillow, 'number', f.id);
});

test("each bed's pillow field is where its pillow is drawn", () => {
  for (const f of beds) {
    const g = buildFurniture(f.id);
    g.updateMatrixWorld(true);
    const box = new THREE.Box3(), c = new THREE.Vector3();
    let found = false;
    g.traverse((m) => {
      if (!m.isMesh) return;
      box.setFromObject(m).getCenter(c);
      const size = box.getSize(new THREE.Vector3());
      if (Math.abs(c.z - f.pillow) < 0.03 && size.z < 0.5 && c.y > 0.45) found = true; // a small piece up on the bed at the pillow's place
    });
    assert.ok(found, `${f.id}: no pillow at z ${f.pillow}`);
  }
});

test('lying on any bed, turned any way, puts the head on the pillow', () => {
  for (const f of beds) for (const ry of [0, Math.PI / 2, 2.5]) {
    const it = { id: f.id, x: 3, z: -4, ry };
    for (const s of furnitureSeats(it)) {
      // The head's middle (ON_PILLOW down from the pillow's), back to the pillow's middle on the same side, in the room.
      const hx = s.x - Math.sin(ry) * (LIE_HEAD + ON_PILLOW), hz = s.z - Math.cos(ry) * (LIE_HEAD + ON_PILLOW);
      const lx = (s.x - it.x) * Math.cos(ry) - (s.z - it.z) * Math.sin(ry);
      const px = it.x + lx * Math.cos(ry) + f.pillow * Math.sin(ry), pz = it.z - lx * Math.sin(ry) + f.pillow * Math.cos(ry);
      assert.ok(Math.hypot(hx - px, hz - pz) < 0.01, `${f.id} ry ${ry}: head ${hx.toFixed(2)},${hz.toFixed(2)} pillow ${px.toFixed(2)},${pz.toFixed(2)}`);
      // Still offered from where you get up, at the foot (main.js nearestSeat: 1.3 m + reach).
      assert.ok(Math.hypot(s.stand[0] - s.x, s.stand[1] - s.z) - s.reach < 1.3, `${f.id}: reachable from the foot`);
    }
  }
});
