// Two faces of different colours on one plane flicker (z-fighting): which one
// is drawn changes pixel by pixel as the camera moves. Yozi saw it on the
// palace halls' walls (2026-11-27): the red dado was a box inside the wall's
// box, its end faces on the wall's. Here every side face of the palace's
// buildings is checked against every other on (nearly) its plane.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';

// (name boards draw on a canvas; none is needed here)
const ctx = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : typeof k === 'string' ? () => {} : undefined), set: () => true });
globalThis.document ||= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };
await import('../src/core/palace-model.js');
await import('../src/core/bukchon-models.js');
const { landmarkBuilders } = await import('../src/core/landmarks.js');
const garden = await import('../src/core/palace-garden.js');
const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));

// The area (m²) where side faces of different colours lie within `gap` of one plane.
function samePlane(g, gap = 0.003) {
  g.updateMatrixWorld(true);
  const tris = [];
  g.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.material.transparent) return;
    const geo = o.geometry, p = geo.attributes.position, ix = geo.index, col = geo.attributes.color, n = ix ? ix.count : p.count;
    const V = (i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
    for (let i = 0; i < n; i += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => (ix ? ix.getX(i + k) : i + k));
      const A = V(a), B = V(b), C = V(c), N = new THREE.Vector3().crossVectors(B.clone().sub(A), C.clone().sub(A));
      if (N.length() < 2e-4) continue;
      N.normalize();
      if (Math.abs(N.y) > 0.5) continue; // (tops are under a roof or a floor, undersides are never seen)
      const key = o.material.map ? 'map' + o.id : col ? new THREE.Color(col.getX(a), col.getY(a), col.getZ(a)).getHexString() : o.material.color.getHexString();
      tris.push({ P: [A, B, C], N, d: N.dot(A), key });
    }
  });
  const by = new Map();
  for (const t of tris) { const k = [t.N.x, t.N.y, t.N.z].map((v) => Math.round(v * 50)).join(','); if (!by.has(k)) by.set(k, []); by.get(k).push(t); }
  let area = 0, where = null;
  for (const list of by.values()) {
    const N = list[0].N, u = new THREE.Vector3(0, 1, 0).cross(N).normalize(), v = new THREE.Vector3().crossVectors(N, u);
    for (const t of list) { t.q = t.P.map((P) => [P.dot(u), P.dot(v)]); t.bb = [Math.min(...t.q.map((p) => p[0])), Math.min(...t.q.map((p) => p[1])), Math.max(...t.q.map((p) => p[0])), Math.max(...t.q.map((p) => p[1]))]; }
    list.sort((a, c) => a.d - c.d);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length && list[j].d - list[i].d < gap; j++) {
      const a = list[i], c = list[j];
      if (a.key === c.key || a.bb[0] >= c.bb[2] || c.bb[0] >= a.bb[2] || a.bb[1] >= c.bb[3] || c.bb[1] >= a.bb[3]) continue;
      let s = 0;
      try { for (const poly of polygonClipping.intersection([[...a.q, a.q[0]]], [[...c.q, c.q[0]]])) { const r = poly[0]; let t = 0; for (let k = 0; k < r.length - 1; k++) t += r[k][0] * r[k + 1][1] - r[k + 1][0] * r[k][1]; s += Math.abs(t) / 2; } } catch { continue; }
      if (s < 0.005) continue;
      area += s;
      where ||= `${a.key} on ${c.key} at ${a.P[0].toArray().map((x) => x.toFixed(1))}`;
    }
  }
  return { area, where };
}

test("no wall of the palace has two colours on one plane (they flicker)", () => {
  const b = landmarkBuilders(), direct = { hyangwonjeong: garden.buildHyangwonjeong, pondbank: garden.buildPondBank };
  let checked = 0;
  for (const l of map.landmarks) {
    if (!l.gb || !['palacehalls', 'cloister', 'palacegate', 'gwanghwamun', 'throne', 'pavilion', 'hyangwonjeong', 'pondbank', 'amisan', 'rankstones'].includes(l.type)) continue;
    const g = new THREE.Group();
    (direct[l.type] || b[l.type])(g, l);
    const { area, where } = samePlane(g);
    assert.ok(area < 0.5, `${l.type}: ${area.toFixed(1)} m² of faces on one plane (${where})`);
    checked++;
  }
  assert.ok(checked >= 9, `checked ${checked} landmarks`);
});
