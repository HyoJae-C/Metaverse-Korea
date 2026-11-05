import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + f, import.meta.url)));
const map = read('map.json');
const shops = [...read('stores.json').stores, ...read('homes.json').homes];
const inSeongsu = ([x, z]) => x >= -260 && x <= 260 && z >= -110 && z <= 410;
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};
const wallDist = (x, z, p) => Math.min(...p.map((a, i) => segDist(x, z, a, p[(i + 1) % p.length])));

test('Seongsu is a hand-made map, not OpenStreetMap data', () => {
  assert.ok(!/openstreetmap/i.test(JSON.stringify(map.meta)));
  assert.ok(map.buildings.length < 150, `${map.buildings.length} buildings`);
});

test('every Seongsu shop stands on open ground in front of a building, each at its own spot', () => {
  const here = shops.filter((s) => Array.isArray(s.at) && inSeongsu(s.at));
  assert.ok(here.length >= 70, `${here.length} shops in Seongsu`);
  const spots = new Set();
  for (const s of here) {
    const [x, z] = s.at;
    for (const b of map.buildings) assert.ok(!inPoly(x, z, b.p), `${s.id} inside a building`);
    assert.ok(Math.min(...map.buildings.map((b) => wallDist(x, z, b.p))) < 3, `${s.id} not next to a building`);
    const key = `${x},${z}`;
    assert.ok(!spots.has(key), `${s.id} shares a spot`);
    spots.add(key);
  }
  // Two shops along the same side of a street need a whole shop front
  // (about 6.4 m with the sign) between them, or their signs overlap.
  for (const a of here) for (const b of here) {
    if (a === b || Math.abs(a.at[1] - b.at[1]) > 0.5) continue;
    assert.ok(Math.abs(a.at[0] - b.at[0]) >= 7, `${a.id} and ${b.id} overlap`);
  }
});
