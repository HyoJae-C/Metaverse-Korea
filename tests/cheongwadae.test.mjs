import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { CollisionMap } from '../src/core/collision.js';
import { STRINGS } from '../src/i18n/strings.js';
import { createCheongwadaeNote } from '../src/game/cheongwadae-note.js';

// Cheong Wa Dae from the street (scripts/build-cheongwadae.mjs): on its real
// place at 1/4, the main hall and the gate at 50% (Yozi 2026-11-23), and no
// way in (a security facility since the president's office moved back).
const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const map = read('districts/gyeongbokgung.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/cheongwadae-osm.json', import.meta.url)));
const [ox, oz] = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
const local = ([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; };
const one = (k) => osm.elements.find((e) => e.kind === k);
const centre = (P) => { const Q = P.slice(0, -1); return Q.reduce((a, p) => [a[0] + p[0] / Q.length, a[1] + p[1] / Q.length], [0, 0]); };
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return Math.hypot(x - (ax + dx * t), z - (az + dz * t)); };
const lineDist = (x, z, P) => { let b = Infinity; for (let i = 1; i < P.length; i++) b = Math.min(b, segDist(x, z, P[i - 1], P[i])); return b; };
const inside = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < ((P[j][0] - P[i][0]) * (z - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const lm = (t) => map.landmarks.find((l) => l.type === t && l.cw);
const hall = lm('bluehouse'), gate = lm('bluegate'), fence = lm('bhfence'), fountain = lm('bhfountain');

test('the main hall stands on its real spot at 50%, under its blue roof', () => {
  const real = one('mainhall').pts.map(local), [cx, cz] = centre(real);
  assert.ok(Math.hypot(hall.x - cx, hall.z - cz) < 0.5, 'its middle is OSM\'s');
  const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); };
  const k = Math.sqrt(area(hall.outline) / area(real.slice(0, -1)));
  assert.ok(Math.abs(k - 2) < 0.05, `twice the 1/4 map across (${k.toFixed(2)})`);
  assert.equal(hall.colour, '#398ea8');
  assert.ok(hall.roof[5] > 10 && hall.roof[5] < 14, 'its ridge about half the real 25 m');
  assert.equal(map.meta.cheongwadae.hall.scale, 2);
});

test('Hyoja-ro, Cheongwadae-ro, Samcheong-ro and Changuimun-ro are on their real lines (10 m), and the hand-drawn ones are gone or marked', () => {
  const real = osm.elements.filter((e) => e.kind === 'road').map((e) => e.pts.map(local));
  const mine = map.roads.filter((r) => r.cw && !r.approx);
  assert.deepEqual([...new Set(mine.map((r) => r.n.en))].sort(), ['Changuimun-ro', 'Cheongwadae-ro', 'Hyoja-ro', 'Samcheong-ro']);
  for (const r of mine) for (const [x, z] of r.p) {
    if (z > 15) continue; // (Hyoja-ro and Samcheong-ro start on the game's Yulgok-ro, z 20)
    const d = Math.min(...real.map((P) => lineDist(x, z, P)));
    assert.ok(d < 10, `${r.n.en} at ${x},${z} is ${d.toFixed(1)} m off`);
  }
  for (const r of map.roads.filter((r) => r.cw && r.approx)) assert.ok(r.why, 'a made-up link says why');
  assert.ok(!map.roads.some((r) => r.n?.ko === '청와대로' && !r.cw), 'the hand-drawn Cheongwadae-ro is gone');
  assert.ok(!map.roads.some((r) => r.n?.ko === '효자로' && !r.cw), 'the hand-drawn Hyoja-ro is renamed');
  for (const [k, v] of Object.entries(map.meta.cheongwadae.moved)) assert.ok(v <= 10, `${k} moved ${v} m`);
});

test('the fence is on OSM\'s line (10 m) and shuts the grounds all round: from the street you cannot reach the lawn or the hall', () => {
  const real = one('compound').pts.map(local);
  for (const [x, z] of fence.line) assert.ok(lineDist(x, z, real) < 10, `fence at ${x},${z}`);
  const solid = new CollisionMap(map.blockers);
  // flood from in front of the gate on a 0.5 m grid, inside a box round the grounds
  const R = 0.5, X0 = -110, Z0 = -400, nx = Math.ceil(190 / R), nz = Math.ceil(200 / R);
  const seen = new Uint8Array(nx * nz), cell = (x, z) => Math.floor((z - Z0) / R) * nx + Math.floor((x - X0) / R);
  const start = [gate.x + Math.sin(gate.ry) * 6, gate.z + Math.cos(gate.ry) * 6];
  assert.ok(!solid.blocked(start[0], start[1], 0.3), 'in front of the gate is open');
  const q = [cell(...start)];
  seen[q[0]] = 1;
  while (q.length) {
    const c = q.pop(), i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj, k = jj * nx + ii;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= nz || seen[k]) continue;
      if (solid.blocked(X0 + (ii + 0.5) * R, Z0 + (jj + 0.5) * R, 0.3)) continue;
      seen[k] = 1; q.push(k);
    }
  }
  const lawn = map.areas.find((a) => a.cw && a.k === 'grass');
  const [lx, lz] = centre([...lawn.p, lawn.p[0]]);
  assert.ok(!seen[cell(lx, lz)], 'the lawn cannot be walked to');
  const fx = hall.x + Math.sin(-hall.ry) * 0 + 0, fz = hall.z;
  assert.ok(!seen[cell(fx, fz + 25)], 'nor the forecourt');
  assert.ok(seen[cell(fountain.x + fountain.r + 2, fountain.z)] || seen[cell(fountain.x - fountain.r - 2, fountain.z)], 'the fountain plaza can');
});

test('the fountain, the plaza and Sarangchae are where they really are', () => {
  const [fx, fz] = centre(one('fountain').pts.map(local));
  assert.ok(Math.hypot(fountain.x - fx, fountain.z - fz) < 15, 'the fountain within 15 m');
  const plaza = map.areas.find((a) => a.cw && a.k === 'plaza');
  assert.ok(inside(plaza.p, fountain.x, fountain.z));
  // no park drawn over the plaza (a park lies on top of paving)
  const px = fountain.x - fountain.r - 1;
  assert.ok(inside(plaza.p, px, fountain.z));
  for (const a of map.areas.filter((a) => a.k === 'park')) assert.ok(!inside(a.p, px, fountain.z) || (a.holes || []).some((h) => inside(h, px, fountain.z)), a.why || 'a park');
  const sarang = map.buildings.find((b) => b.cw);
  const [sx, sz] = centre(one('sarangchae').pts.map(local));
  assert.ok(inside(sarang.p, sx, sz), 'Sarangchae covers the part OSM has');
  assert.equal(sarang.approx, 1);
});

test('at the gate a note says it is a security facility, in every language, and the sign says so too', () => {
  for (const code of ['en', 'ko', 'ja', 'zh', 'es', 'fr', 'id', 'th', 'vi', 'ar', 'hi']) assert.ok(STRINGS[code]['cheongwadae.note'], code);
  const shown = [];
  const world = { ...gate, x: gate.x + ox, z: gate.z + oz };
  const note = createCheongwadaeNote({ landmarks: [world], toast: (m) => shown.push(m), text: () => 'note' });
  const at = (d) => ({ x: world.x + Math.sin(world.ry) * d, z: world.z + Math.cos(world.ry) * d });
  note.tick(at(60)); note.tick(at(6)); note.tick(at(5));
  assert.equal(shown.length, 1, 'once on the way up');
  note.tick(at(60)); note.tick(at(6));
  assert.equal(shown.length, 2, 'again after walking away');
  const sign = map.landmarks.find((l) => l.type === 'sign' && l.cw);
  assert.match(sign.text.en, /security facility/);
  for (const k of ['ko', 'en', 'ja', 'zh']) assert.ok(sign.text[k] && sign.title[k], k);
});
