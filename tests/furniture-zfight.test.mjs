import { test } from 'node:test';
import assert from 'node:assert/strict';

// Home furniture never has two differently coloured box faces in the same
// plane facing the same way: they flicker as the camera moves (z-fighting,
// Yozi 2026-11-25: the old sofa's arms shimmered against its seat). Faces
// facing down are under the piece and never seen, so they're left out.
const ctx = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : /Gradient|Pattern/.test(k) ? () => ({ addColorStop() {} }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : () => {}), set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => ctx, width: 0, height: 0, style: {} }) };
const { FURNITURE, buildFurniture } = await import('../src/core/furniture.js');

// Each box's visible faces (axis-aligned boxes only), in the piece's frame.
function faces(g) {
  g.updateMatrixWorld(true);
  const out = [];
  g.traverse((m) => {
    if (!m.isMesh || m.geometry?.type !== 'BoxGeometry') return;
    const e = m.matrixWorld.elements;
    if ([e[1], e[2], e[4], e[6], e[8], e[9]].some((v) => Math.abs(v) > 1e-6)) return; // turned: not axis-aligned
    m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
    const lo = b.min.toArray(), hi = b.max.toArray();
    for (let a = 0; a < 3; a++) for (const s of [-1, 1]) if (a !== 1 || s > 0) out.push({ m, a, s, p: s < 0 ? lo[a] : hi[a], lo, hi });
  });
  return out;
}

test('no furniture piece has coplanar faces of different colours', () => {
  const bad = [];
  for (const { id } of FURNITURE) {
    const f = faces(buildFurniture(id));
    for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) {
      const A = f[i], B = f[j];
      if (A.m === B.m || A.a !== B.a || A.s !== B.s || Math.abs(A.p - B.p) > 1e-4 || A.m.material === B.m.material) continue;
      let area = 1;
      for (const k of [0, 1, 2]) if (k !== A.a) area *= Math.max(0, Math.min(A.hi[k], B.hi[k]) - Math.max(A.lo[k], B.lo[k]));
      // (tiny slivers, under 10 cm², are let be, and so are faces covered by a
      // third box on the side they face)
      const covered = f.some((C) => C.m !== A.m && C.m !== B.m && [0, 1, 2].every((k) => k === A.a
        || (C.lo[k] <= Math.max(A.lo[k], B.lo[k]) + 1e-4 && C.hi[k] >= Math.min(A.hi[k], B.hi[k]) - 1e-4))
        && (A.s > 0 ? C.lo[A.a] <= A.p + 1e-4 && C.hi[A.a] > A.p + 1e-4 : C.hi[A.a] >= A.p - 1e-4 && C.lo[A.a] < A.p - 1e-4));
      if (area > 0.001 && !covered) bad.push(`${id} ${'xyz'[A.a]}${A.s > 0 ? '+' : '-'}@${A.p.toFixed(3)}`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});
