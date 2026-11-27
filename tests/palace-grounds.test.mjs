// Gyeongbokgung's green (scripts/lib/palace-grounds.mjs): the lawns, woods
// and trees from the real map, Hyangwonjeong's island and Chwihyanggyo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CollisionMap, pointInPoly, distSqToSeg } from '../src/core/collision.js';
import { toGame } from '../src/core/seoul-grid.js';
import { isleHeight, terraceY } from '../src/core/temple-terrace.js';
import { ROYAL_ROUTE, FAN_AT, FAN_KEEP } from '../src/core/palace-show.js';
import { landmarkBuilders } from '../src/core/landmarks.js';
import { treeMeshes } from '../src/core/palace-garden.js';
import { TREE_H } from '../scripts/lib/palace-grounds.mjs';
import * as THREE from 'three';

const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url)));
const map = read('../public/regions/another-seoul/districts/gyeongbokgung.json');
const osm = read('../scripts/data/gyeongbokgung-osm.json'), green = read('../scripts/data/gyeongbokgung-grounds-osm.json'), canopy = read('../scripts/data/gyeongbokgung-canopy.json');
const [gx, gz] = (() => { const g = osm.elements.find((e) => e.name === '광화문').pts.slice(0, -1), c = g.reduce((a, p) => [a[0] + p[0] / g.length, a[1] + p[1] / g.length], [0, 0]); return toGame(...c); })();
const local = ([la, lo]) => { const [x, z] = toGame(la, lo); return [x - gx, z - gz]; };
const at = (type) => map.landmarks.find((l) => l.type === type && l.gb);
const wall = at('wall').p, water = map.areas.filter((a) => a.k === 'water' && a.gb).map((a) => a.p);
const inArea = (a, x, z) => pointInPoly(x, z, a.p) && !(a.holes || []).some((h) => pointInPoly(x, z, h));
const edge = (P, x, z) => Math.sqrt(Math.min(...P.map((p, i) => distSqToSeg(x, z, P[(i + P.length - 1) % P.length], p))));
const KIND = { round: 0, pine: 1, maple: 2, willow: 3, ginkgo: 4, bush: 5 };

test('the palace lawns and woods are OpenStreetMap\'s, inside the wall, off the ponds and the paved yards', () => {
  const lawns = map.areas.filter((a) => a.k === 'grass' && a.gb), woods = map.areas.filter((a) => a.k === 'park' && a.gb && a.p.every(([x, z]) => pointInPoly(x, z, wall) || edge(wall, x, z) < 0.5));
  assert.ok(lawns.length > 40 && woods.length > 15, `lawns ${lawns.length}, woods ${woods.length}`);
  // the two made-up ones are the shows' and say so
  assert.deepEqual(lawns.filter((a) => a.approx).map((a) => a.show).sort(), ['fan', 'king']);
  const stone = map.areas.filter((a) => a.k === 'stone' && a.gb);
  for (const a of [...lawns, ...woods]) for (const [x, z] of a.p) {
    assert.ok(pointInPoly(x, z, wall) || edge(wall, x, z) < 0.5, `inside the wall (${x},${z})`);
    if (a.approx) continue;
    for (const w of water) assert.ok(!pointInPoly(x, z, w) || edge(w, x, z) < 0.4, `not in a pond (${x},${z})`);
    for (const s of stone) assert.ok(!pointInPoly(x, z, s.p) || edge(s.p, x, z) < 0.4, `not on a paved yard (${x},${z})`);
  }
  // each of OSM's lawns and woods (its middle, when that is inside it) is green on the map
  const green2 = [...lawns, ...woods];
  let seen = 0, missed = 0;
  for (const e of [...green.grass, ...green.wood]) {
    const P = e.pts.slice(0, -1).map(local), c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
    if (!pointInPoly(c[0], c[1], P) || (e.holes || []).some((h) => pointInPoly(c[0], c[1], h.map(local))) || !pointInPoly(c[0], c[1], wall) || edge(wall, c[0], c[1]) < 1 || stone.some((s) => pointInPoly(c[0], c[1], s.p)) || water.some((w) => pointInPoly(c[0], c[1], w))) continue;
    seen++;
    if (!green2.some((a) => inArea(a, c[0], c[1]))) missed++;
  }
  assert.ok(seen > 60, `OSM lawns and woods checked (${seen})`);
  assert.ok(missed <= 3, `${missed} of ${seen} are not drawn (only slivers under 1.5 m² are dropped)`);
});

test('the palace trees: OSM\'s on their spots, the made-up ones where the satellite photo shows trees, none in the way', () => {
  const l = at('palacetrees'), T = [];
  for (let i = 0; i < l.t.length; i += 4) T.push(l.t.slice(i, i + 4));
  assert.ok(l.inner, 'built when you walk in (core/enclosure.js)');
  assert.ok(T.length >= 150 && T.length <= 420, `trees ${T.length}`);
  assert.ok(l.real >= 40 && l.why && l.approx, 'says which are real and which are made up');
  assert.match(l.approx, new RegExp(`the other ${T.length - l.real} are made up`));
  // the first l.real: within 1.7 m of a tree OSM maps (moved only off a building drawn bigger than the real one)
  const nodes = green.trees.map(([la, lo]) => local([la, lo]));
  T.slice(0, l.real).forEach(([x, z]) => assert.ok(nodes.some(([nx, nz]) => Math.hypot(nx - x, nz - z) < 1.7), `OSM tree at ${x},${z}`));
  // the others: on a cell where the satellite photo shows trees (or on Hyangwonjeong's island)
  const hy = at('hyangwonjeong'), isTree = (x, z) => [-0.06, 0.06].some((dx) => [-0.06, 0.06].some((dz) => canopy.rows[Math.floor(z + dz - canopy.z0)]?.[Math.floor(x + dx - canopy.x0)] === 'T'));
  T.slice(l.real).forEach(([x, z]) => assert.ok(isTree(x, z) || Math.hypot(x - hy.x, z - hy.z) < hy.isle[0], `made-up tree where the photo has trees (${x},${z})`));
  // a quarter of the real height (Yozi 2026-11-26: buildings are 1/4, trees had no rule and all stood tall)
  const high = T.filter((t) => t[3] !== KIND.bush).map(([, , sz, k]) => sz * TREE_H[k] * 4); // real metres
  assert.ok(Math.min(...high) > 3.5 && Math.max(...high) < 18.5, `between a young maple and an old ginkgo (${Math.min(...high).toFixed(1)}..${Math.max(...high).toFixed(1)} m)`);
  assert.ok(high.filter((h) => h < 12).length > high.length * 0.6, `most under 12 m (${high.filter((h) => h < 12).length} of ${high.length})`);
  assert.ok(high.filter((h) => h > 12).length > high.length * 0.05, 'a few tall ones');
  const solid = new CollisionMap(map.blockers.filter((b) => b.gb && !b.low && !water.some((w) => b.p.length === w.length && b.p.every((q, i) => q[0] === w[i][0] && q[1] === w[i][1]))));
  const islets = at('pondbank').turf, stone = map.areas.filter((a) => a.k === 'stone' && a.gb);
  for (const [x, z, s, k] of T) {
    assert.ok(pointInPoly(x, z, wall) && edge(wall, x, z) > 1.4, `inside the wall (${x},${z})`);
    assert.ok(s >= 0.25 && s < 1.4 && Object.values(KIND).includes(k), `size and kind (${s}, ${k})`);
    const wet = water.some((w) => pointInPoly(x, z, w));
    if (wet) assert.ok((k === KIND.pine && islets.some((p) => pointInPoly(x, z, p))) || l.up.some(([ux, uz, r]) => Math.hypot(x - ux, z - uz) < r - 0.3), `in the water only on Gyeonghoeji's islets and Hyangwonjeong's island (${x},${z})`);
    else assert.ok(!solid.blocked(x, z, 0.8), `clear of the buildings (${x},${z})`);
    assert.ok(!stone.some((a) => pointInPoly(x, z, a.p)), `not on a paved yard (${x},${z})`);
    assert.ok(Math.hypot(x - FAN_AT[0], z - FAN_AT[1]) > FAN_KEEP + 1, `outside the fan dance's ring (${x},${z})`);
    for (const [i, j] of ROYAL_ROUTE.links) assert.ok(distSqToSeg(x, z, ROYAL_ROUTE.stops[i], ROYAL_ROUTE.stops[j]) > 2 * 2, `off the king's way (${x},${z})`);
  }
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) assert.ok(Math.hypot(T[i][0] - T[j][0], T[i][1] - T[j][1]) >= 1.25, `two trees on one spot (${T[i]} / ${T[j]})`);
  // never in rows (Yozi 2026-11-24): no three made-up trees evenly spaced on a line
  const made = T.slice(l.real);
  let rows = 0;
  for (let i = 0; i < made.length; i++) for (let j = 0; j < made.length; j++) {
    if (i === j) continue;
    const dx = made[j][0] - made[i][0], dz = made[j][1] - made[i][1], d = Math.hypot(dx, dz);
    if (d > 9 || !made.some((t) => Math.hypot(t[0] - (made[j][0] + dx), t[1] - (made[j][1] + dz)) < 0.35)) continue;
    if (made.some((t) => Math.hypot(t[0] - (made[j][0] + 2 * dx), t[1] - (made[j][1] + 2 * dz)) < 0.35)) rows++;
  }
  assert.equal(rows, 0, 'four made-up trees evenly spaced on one line');
  // pines stay green, the others turn: all the kinds are there
  for (const k of [KIND.round, KIND.pine, KIND.maple, KIND.willow, KIND.ginkgo]) assert.ok(T.filter((t) => t[3] === k).length >= 8, `kind ${k}`);
});

test('Hyangwonjeong stands on its island, and you walk over Chwihyanggyo to it', () => {
  const l = at('hyangwonjeong'), b = landmarkBuilders();
  for (const t of ['hyangwonjeong', 'pondbank', 'palacetrees']) assert.equal(typeof b[t], 'function', t);
  const real = osm.elements.find((e) => e.name === '향원정').pts.slice(0, -1).map(local), c = real.reduce((a, p) => [a[0] + p[0] / real.length, a[1] + p[1] / real.length], [0, 0]);
  assert.ok(Math.hypot(l.x - c[0], l.z - c[1]) < 1, `on its real spot (${l.x},${l.z} vs ${c.map((v) => v.toFixed(1))})`);
  // the island is at least twice as wide as the roof, as in Seoul (2.5 times), and the pavilion is not drawn taller than it is wide (Yozi 2026-11-27: too upright and small at 37.5% across, 45% high)
  assert.ok(l.sc[0] >= 0.6 && l.sc[0] <= 1 && l.sc[1] >= 0.8 && l.sc[1] <= 1 && l.sc[1] <= l.sc[0] && l.isle[0] / (2.82 * l.sc[0]) >= 2, `the island is roomy (${(l.isle[0] / (2.82 * l.sc[0])).toFixed(2)} roofs wide)`);
  const pond = water.find((w) => pointInPoly(l.x, l.z, w)), [r, top] = l.isle, [sx, sz, w, rise] = l.span, L = Math.hypot(sx, sz), ux = sx / L, uz = sz / L;
  // the island: OSM's is about 4 m in radius at 1/4; drawn up to 2 m bigger for the pavilion at 50% across (Yozi 2026-11-27: the pavilion wider, the island bigger), inside the pond
  const isle = green.garden[0].pts.map(local), ir = Math.max(...isle.map(([x, z]) => Math.hypot(x - l.x, z - l.z)));
  assert.ok(r >= ir - 0.3 && r <= ir + 2.2, `the island ${r} m (OSM ${ir.toFixed(2)})`);
  for (let a = 0; a < 6.28; a += 0.2) assert.ok(pointInPoly(l.x + Math.sin(a) * (r + 1.5), l.z + Math.cos(a) * (r + 1.5), pond), 'water all round the island');
  // the bridge: from the island to the north bank, where OSM's Chwihyanggyo lands
  const end = green.bridge.map(local).sort((p, q) => Math.hypot(q[0] - l.x, q[1] - l.z) - Math.hypot(p[0] - l.x, p[1] - l.z))[0];
  assert.ok(Math.hypot(l.x + sx - end[0], l.z + sz - end[1]) < 1.5, `the bridge's shore end at OSM's (${[l.x + sx, l.z + sz].map((v) => v.toFixed(1))} vs ${end.map((v) => v.toFixed(1))})`);
  assert.ok(sz < 0 && !pointInPoly(l.x + sx, l.z + sz, pond), 'it lands on the north bank');
  assert.ok(w >= 1.2 && w <= 2, 'wide enough to walk over');
  // under your feet: the island's top, an arch over the water, down to the ground at the bank, no steps
  assert.equal(terraceY(map.landmarks, l.x + 3.5, l.z), top);
  assert.ok(Math.abs(isleHeight(l, sx, sz)) < 1e-9, 'level with the ground at the bank');
  let peak = 0, prev = top;
  for (let v = r; v <= L; v += 0.1) { const y = isleHeight(l, ux * v, uz * v); assert.ok(Math.abs(y - prev) < 0.06, `no step on the bridge (${v.toFixed(1)} m)`); prev = y; peak = Math.max(peak, y); }
  assert.ok(peak > top + rise * 0.5 && peak < 1.2, `the arch (${peak.toFixed(2)} m)`);
  const mid = r + (L - r) * 0.3; // (on the bridge, nearer the island: by the bank the shore comes close on one side)
  assert.equal(isleHeight(l, ux * mid + uz * (w / 2 + 0.3), uz * mid - ux * (w / 2 + 0.3)), 0, 'beside the bridge: the water');
  // collision: along the bridge and round the pavilion, but not into the water or the pavilion
  const col = new CollisionMap(map.blockers), R = 0.35;
  for (let v = r - 0.6; v <= L + 0.5; v += 0.25) assert.ok(!col.blocked(l.x + ux * v, l.z + uz * v, R), `on the bridge (${v.toFixed(2)} m)`);
  for (let a = 0; a < 6.28; a += 0.3) assert.ok(!col.blocked(l.x + Math.sin(a) * (r - 0.7), l.z + Math.cos(a) * (r - 0.7), R), 'round the pavilion');
  assert.ok(col.blocked(l.x, l.z, R), 'not through the pavilion');
  for (const s of [-1, 1]) assert.ok(col.blocked(l.x + ux * mid + uz * s * (w / 2 + 0.6), l.z + uz * mid - ux * s * (w / 2 + 0.6), R), 'not off the bridge\'s side');
  for (let a = 0; a < 6.28; a += 0.3) { const x = l.x + Math.sin(a) * (r + 0.6), z = l.z + Math.cos(a) * (r + 0.6); if (Math.abs((x - l.x) * uz - (z - l.z) * ux) > w / 2 + 0.6 || (x - l.x) * ux + (z - l.z) * uz < 0) assert.ok(col.blocked(x, z, R), 'not off the island into the water'); }
  // the island's own trees stand on it, and it says what is made up
  const trees = at('palacetrees'), own = [];
  assert.deepEqual(trees.up, [[l.x, l.z, r, top]], 'the trees on the island stand on its top');
  for (let i = 0; i < trees.t.length; i += 4) { const d = Math.hypot(trees.t[i] - l.x, trees.t[i + 1] - l.z); if (d < r + 1) own.push(d); }
  assert.ok(own.length >= 3 && own.every((d) => d < r - 0.3 && d > 2.6 * l.sc[0] + 0.8), 'shrubs on the island inside its fence, off the pavilion');
  const bank = at('pondbank');
  assert.ok(bank.approx && bank.rings.length >= 2 && bank.pads.length > 10);
  for (const [x, z] of bank.pads) assert.ok(pointInPoly(x, z, pond) && Math.hypot(x - l.x, z - l.z) > r, 'lotus leaves on the water');
  const spring = local(green.spring.pt);
  assert.ok(Math.hypot(bank.spring[0] - spring[0], bank.spring[1] - spring[1]) < 0.5, 'Yeolsangjinwon spring on its real spot');
});

test("each kind of tree's model is as high as the size table says (so real height / 4 holds)", () => {
  const t = [];
  for (let k = 0; k < TREE_H.length; k++) t.push(k * 10, 0, 1, k);
  const top = TREE_H.map(() => 0), m4 = new THREE.Matrix4(), b = new THREE.Box3(), c = new THREE.Vector3();
  for (const m of treeMeshes(t)) {
    m.geometry.computeBoundingBox();
    for (let i = 0; i < m.count; i++) {
      m.getMatrixAt(i, m4);
      b.copy(m.geometry.boundingBox).applyMatrix4(m4);
      const k = Math.round(b.getCenter(c).x / 10);
      top[k] = Math.max(top[k], b.max.y);
    }
  }
  top.forEach((h, k) => assert.ok(Math.abs(h - TREE_H[k]) < 0.05, `kind ${k}: ${h.toFixed(2)} m, table ${TREE_H[k]}`));
});
