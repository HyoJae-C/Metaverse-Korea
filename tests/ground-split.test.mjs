// The ground is cut into triangles no longer than GROUND_EDGE, so a lawn or
// a pond 2 cm above it is never drawn under it (core/world.js splitLongEdges).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { splitLongEdges, GROUND_EDGE } from '../src/core/world.js';

test('the ground keeps its area and its holes when its long triangles are split, and no edge is left long', () => {
  const shape = new THREE.Shape([[-5000, -1000], [4000, -1000], [4000, 3300], [-5000, 3300]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (const [x, y] of [[0, 0], [1200, 800], [-3000, 2000], [-1700, 900]]) shape.holes.push(new THREE.Path([[x, y], [x + 3, y], [x + 3, y + 4], [x, y + 4]].map(([a, b]) => new THREE.Vector2(a, b))));
  const flat = new THREE.ShapeGeometry(shape);
  flat.rotateX(-Math.PI / 2);
  const measure = (geo) => {
    const p = geo.attributes.position.array, ix = geo.index.array, edges = new Map();
    let area = 0, down = 0, longest = 0;
    for (let i = 0; i < ix.length; i += 3) {
      const [a, b, c] = [ix[i], ix[i + 1], ix[i + 2]];
      const t = ((p[b * 3] - p[a * 3]) * (p[c * 3 + 2] - p[a * 3 + 2]) - (p[c * 3] - p[a * 3]) * (p[b * 3 + 2] - p[a * 3 + 2])) / 2;
      area += Math.abs(t);
      if (t > 0) down++; // (facing down: it would not be drawn)
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        longest = Math.max(longest, Math.hypot(p[u * 3] - p[v * 3], p[u * 3 + 2] - p[v * 3 + 2]));
        const k = Math.min(u, v) + ',' + Math.max(u, v);
        edges.set(k, (edges.get(k) || 0) + 1);
      }
    }
    return { area, down, longest, tris: ix.length / 3, edges };
  };
  const before = measure(flat), out = splitLongEdges(flat, GROUND_EDGE), after = measure(out);
  assert.ok(before.longest > 5000, 'the plain ground has triangles kilometres long');
  assert.ok(after.longest <= GROUND_EDGE, `longest edge ${after.longest.toFixed(0)} m`);
  assert.ok(Math.abs(after.area - before.area) < 1, `area ${before.area} -> ${after.area}`);
  assert.equal(after.down, 0, 'every triangle faces up');
  assert.ok([...after.edges.values()].every((n) => n <= 2), 'no edge has more than two triangles');
  // an edge with one triangle is on the rim or on a hole: its ends lie on those lines, so nothing opened inside
  const p = out.attributes.position.array, onLine = (i) => { const x = p[i * 3], z = -p[i * 3 + 2]; return x === -5000 || x === 4000 || z === -1000 || z === 3300 || [[0, 0], [1200, 800], [-3000, 2000], [-1700, 900]].some(([hx, hy]) => x >= hx && x <= hx + 3 && z >= hy && z <= hy + 4); };
  for (const [k, n] of after.edges) if (n === 1) assert.ok(k.split(',').every((i) => onLine(+i)), `a gap inside the ground at edge ${k}`);
  assert.ok(after.tris < 8000, `triangles ${after.tris}`);
  assert.ok([...out.attributes.normal.array].every((v, i) => v === (i % 3 === 1 ? 1 : 0)), 'normals point up');
});
