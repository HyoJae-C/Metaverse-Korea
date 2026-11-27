// The palace's textures (core/palace-paint.js) must not cost draw calls: a
// textured piece is merged with the others of its material, as the plain
// ones are. Also the places that borrow the palace's roofs and bands
// (Changdeokgung's Huwon, Jogyesa, the Blue House, Bongeunsa).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

const ctx = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : typeof k === 'string' ? () => {} : undefined), set: () => true });
globalThis.document ||= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
await import('../src/core/palace-model.js');
await import('../src/core/bukchon-models.js');
const { landmarkBuilders } = await import('../src/core/landmarks.js');
const { PALACE_PAINT } = await import('../src/core/palace-paint.js');
const district = (id) => JSON.parse(readFileSync(new URL(`../public/regions/another-seoul/districts/${id}.json`, import.meta.url)));

const KIT = ['gwanghwamun', 'palacegate', 'yeongjegyo', 'cloister', 'throne', 'rankstones', 'palacehalls', 'amisan'];
test('a textured palace piece is merged: one mesh a material, with its UVs', async () => {
  const b = landmarkBuilders();
  const huwon = await import('../src/core/huwon-model.js'), blue = await import('../src/core/bluehouse-model.js');
  const jogyesa = await import('../src/core/jogyesa-model.js'), bongeunsa = await import('../src/core/bongeunsa-model.js');
  const direct = { jeongja: huwon.buildJeongja, bluehouse: blue.buildBlueHouse, bluegate: blue.buildBlueGate, jogyesa: (g) => jogyesa.buildJogyesa(g), bongeunsa: bongeunsa.buildTemple };
  let textured = 0, built = 0;
  for (const id of ['gyeongbokgung', 'changdeokgung', 'samseong', 'jongno']) {
    let map;
    try { map = district(id); } catch { continue; }
    for (const l of map.landmarks || []) {
      const build = direct[l.type] || (KIT.includes(l.type) && b[l.type]);
      if (!build) continue;
      const g = new THREE.Group();
      build(g, l);
      built++;
      const seen = new Map();
      g.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || !o.material.userData?.metres) return;
        textured++;
        assert.ok(o.geometry.attributes.uv, `${id} ${l.type}: a textured mesh without UVs`);
        assert.ok(o.material.map, `${id} ${l.type}: marked as textured without a texture`);
        seen.set(o.material, (seen.get(o.material) || 0) + 1);
      });
      for (const [m, n] of seen) assert.equal(n, 1, `${id} ${l.type}: ${n} meshes of one textured material (${m.color.getHexString()}): not merged`);
    }
  }
  assert.ok(built >= 15 && textured > 30, `built ${built} landmarks, ${textured} textured meshes`);
});

test('each texture is small and says how many metres it covers', () => {
  for (const [k, p] of Object.entries(PALACE_PAINT)) {
    assert.ok(p.px[0] * p.px[1] <= 256 * 256, `${k}: ${p.px} px`);
    assert.ok(p.m.length === 2 && p.m[0] > 0 && p.m[1] >= 0, `${k}: metres ${p.m}`);
    assert.equal(typeof p.draw, 'function');
  }
});
