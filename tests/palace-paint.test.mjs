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

// The city's gates wear the same surfaces (Yozi 2026-11-27: "Heunginjimun,
// Hyehwamun and the other gates too").
test("the city's gates wear the palace's stone, plaster, painted beam and tiles", async () => {
  const { EULJIRO_BUILD } = await import('../src/core/euljiro-models.js');
  const { smallGate } = await import('../src/game/city-wall-parts.js');
  const great = new THREE.Group(), heung = new THREE.Group();
  EULJIRO_BUILD.sungnyemun(great, { sc: [0.5] });
  EULJIRO_BUILD.heunginjimun(heung, {});
  const small = smallGate({ W: 5.1, D: 3.3, H: 1.7, A: 0.6, S: 0.9 }, 'changuimun');
  for (const [name, g, most] of [['sungnyemun', great, 43], ['heunginjimun', heung, 61], ['a small gate', small, 14]]) {
    const kinds = new Set();
    let meshes = 0;
    g.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      if (!o.material.userData?.metres) return;
      const uv = o.geometry.attributes.uv, p = o.geometry.attributes.position;
      assert.ok(uv && uv.count === p.count, `${name}: a textured mesh without a UV a vertex`);
      for (let i = 0; i < uv.count; i++) assert.ok(Number.isFinite(uv.getX(i)) && Number.isFinite(uv.getY(i)), `${name}: a UV that is not a number`);
      for (const [k, P] of Object.entries(PALACE_PAINT)) if (o.material.userData.metres === P.m) kinds.add(k);
    });
    for (const k of ['stone', 'plaster', 'dancheong', 'tile']) assert.ok(kinds.has(k), `${name}: no ${k}`);
    assert.ok(meshes <= most, `${name}: ${meshes} meshes (no more than before the textures)`);
  }
});

// Yozi 2026-11-27: "make the patterns symmetric". A painted beam and a lattice
// door take a whole number of repeats on every face, so the pattern ends the
// same way at both ends (it used to start at one end and be cut at the other).
test('the painted beams and the lattice doors: whole repeats on every face', async () => {
  const { metreUV } = await import('../src/core/palace-paint.js');
  const geo = new THREE.BoxGeometry(5.3, 0.7, 1);
  metreUV(geo, 5.3, 0.7, 1, [2.2, 0], 1, true);
  for (let i = 0; i < geo.attributes.uv.count; i++) assert.ok(Number.isInteger(geo.attributes.uv.getX(i)) && Number.isInteger(geo.attributes.uv.getY(i)), 'a box 5.3 m long takes 2 whole repeats, not 2.4');
  const b = landmarkBuilders(), whole = [PALACE_PAINT.dancheong.m, PALACE_PAINT.lattice.m];
  let checked = 0;
  for (const id of ['gyeongbokgung', 'changdeokgung']) for (const l of district(id).landmarks) {
    if (!KIT.includes(l.type)) continue;
    const g = new THREE.Group();
    b[l.type](g, l);
    g.traverse((o) => {
      if (!o.isMesh || !o.material.map || !o.geometry.attributes.uv) return;
      const img = o.material.map.image, kind = Object.values(PALACE_PAINT).find((P) => P.whole && P.px[0] === img?.width && P.px[1] === img?.height);
      if (!kind || !whole.includes(kind.m)) return;
      const uv = o.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) assert.ok(Math.abs(uv.getX(i) - Math.round(uv.getX(i))) < 1e-4, `${id} ${l.type}: a pattern cut part way (u = ${uv.getX(i)})`);
      checked += uv.count;
    });
  }
  assert.ok(checked > 1000, `${checked} corners checked`);
});
