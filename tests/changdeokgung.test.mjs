import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { toGame } from '../src/core/seoul-grid.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const map = read('districts/changdeokgung.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/changdeokgung-osm.json', import.meta.url)));
const d = region.districts.find((x) => x.id === 'changdeokgung');
const [ox, oz] = d.offset;
const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
};
const inside = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < ((P[j][0] - P[i][0]) * (z - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };

test('Changdeokgung stands on Donhwamun\'s real spot, and its wall is OSM\'s line at 1/4', () => {
  const gate = osm.elements.find((e) => e.kind === 'building' && e.name === '돈화문').pts.slice(0, -1);
  const [gx, gz] = toGame(gate.reduce((s, p) => s + p[0], 0) / gate.length, gate.reduce((s, p) => s + p[1], 0) / gate.length);
  assert.ok(Math.hypot(gx - ox, gz - oz) < 1, 'the district\'s (0, 0) is Donhwamun');
  const real = osm.elements.find((e) => e.kind === 'palace').pts.map(([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; });
  const wall = map.landmarks.find((l) => l.type === 'wall');
  assert.ok(wall, 'a wall');
  for (const [x, z] of map.meta.enclosure.poly) {
    let best = 1e9;
    for (let i = 1; i < real.length; i++) best = Math.min(best, segDist(x, z, real[i - 1], real[i]));
    assert.ok(best < 1 || Math.hypot(x, z) < 20, `wall point ${x},${z} is ${best.toFixed(1)} m off OSM`); // (the two ends at Donhwamun are the gate's own corners)
  }
});

test('the sizes Yozi chose: gates at 50%, each Huwon garden whole at 50%, and what moved or was made up is written down', () => {
  for (const g of map.landmarks.filter((l) => l.type === 'palacegate')) assert.equal(g.s, 0.5, g.name.en);
  assert.deepEqual(map.meta.gardens.map((g) => g.id), ['buyongji', 'aeryeonji', 'gwallamji', 'ongnyucheon']);
  for (const g of map.meta.gardens) {
    assert.equal(g.scale, 2, g.id);
    assert.ok(Math.abs(Math.hypot(g.at[0] - g.real[0], g.at[1] - g.real[1]) - g.moved) < 0.2, g.id);
    assert.ok(g.moved < 40, `${g.id} moved ${g.moved} m`);
    assert.ok(g.why);
  }
  // the gardens keep their real order up the valley
  const zs = map.meta.gardens.map((g) => g.at[1]);
  assert.deepEqual([...zs].sort((a, b) => b - a), zs);
  // Buyongji is not in OSM: drawn from its recorded size, and marked
  const ponds = map.areas.filter((a) => a.k === 'water' && /부용지/.test(a.why || ''));
  assert.equal(ponds.length, 1);
  assert.equal(ponds[0].approx, 1);
  assert.ok(map.meta.doors.length > 0 && map.meta.doors.length < 10, 'the made-up doors are listed');
  assert.ok(map.meta.halls.why);
});

test('everything stands inside the wall, and the pavilions and the pond are loaded on the way in', () => {
  const poly = map.meta.enclosure.poly;
  for (const l of map.landmarks) {
    if (!l.inner) continue;
    assert.ok(inside(poly, l.x, l.z) || l.type === 'cloister' || l.type === 'shrinetrees', `${l.type} at ${l.x},${l.z}`);
  }
  const lm = readFileSync(new URL('../src/core/landmarks.js', import.meta.url), 'utf8');
  assert.match(lm, /import\('\.\/huwon-model\.js'\)/, 'the garden models load when first needed');
  for (const t of ['jeongja', 'pondisle']) assert.ok(map.landmarks.some((l) => l.type === t && l.inner), t);
  const kinds = new Set(map.landmarks.filter((l) => l.type === 'jeongja').flatMap((l) => l.list.map((j) => j[4])));
  for (const k of ['square', 'hex', 'cross', 'fan', 'thatch']) assert.ok(kinds.has(k), k);
});

test('you can walk from Donhwamun to every hall, yard, pavilion and garden (the build script\'s own check)', () => {
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/build-changdeokgung.mjs', import.meta.url)), '--dry', '--check'], { encoding: 'utf8' });
  assert.match(out, /every hall, yard, pavilion and garden can be walked to/);
});

test('Bukchon keeps off the palace: no hanok or street inside the wall or on Donhwamun\'s forecourt', () => {
  const b = region.districts.find((x) => x.id === 'bukchon'), bm = read(b.map);
  const sh = ([x, z]) => [x + b.offset[0] - ox, z + b.offset[1] - oz];
  const keep = [map.meta.enclosure.poly, ...map.areas.filter((a) => a.k === 'plaza').map((a) => a.p)];
  for (const h of bm.buildings) for (const q of h.p.map(sh)) assert.ok(!keep.some((P) => inside(P, q[0], q[1])), `a Bukchon building at ${q}`);
  for (const r of bm.roads) for (const q of r.p.map(sh)) assert.ok(!keep.some((P) => inside(P, q[0], q[1])), `a Bukchon street at ${q}`);
});
