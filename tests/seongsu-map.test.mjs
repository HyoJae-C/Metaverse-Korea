import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const map = read('map.json');
const shops = [...read('stores.json').stores, ...read('homes.json').homes];
const inSeongsu = ([x, z]) => x >= -465 && x <= 260 && z >= -100 && z <= 410;
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};
const wallDist = (x, z, p) => Math.min(...p.map((a, i) => segDist(x, z, a, p[(i + 1) % p.length])));

test('Seongsu is a hand-made map on the real street lines (credited to OpenStreetMap)', () => {
  assert.match(map.meta.source, /OpenStreetMap/);
  assert.ok(map.buildings.length < 180, `${map.buildings.length} buildings`);
});

test('every Seongsu shop stands on open ground in front of a building, each at its own spot', () => {
  const here = shops.filter((s) => Array.isArray(s.at) && inSeongsu(s.at));
  assert.ok(here.length >= 66, `${here.length} shops in Seongsu`); // (4 skincare and lip-tint shops moved to Myeongdong once it was on the map, then 2 more lip shops and My Mala; Deumppuk Yukhoe came from Hongdae)
  const spots = new Set();
  for (const s of here) {
    const [x, z] = s.at;
    for (const b of map.buildings) assert.ok(!inPoly(x, z, b.p), `${s.id} inside a building`);
    // (a Han River park's spot is on its path by the river: tests/han-park.test.mjs)
    if (!s.hanpark) assert.ok(Math.min(...map.buildings.map((b) => wallDist(x, z, b.p))) < 3, `${s.id} not next to a building`);
    const key = `${x},${z}`;
    assert.ok(!spots.has(key), `${s.id} shares a spot`);
    spots.add(key);
  }
  // Two shops need a whole shop front (about 6.4 m with the sign) between
  // them, or their signs overlap (the streets run at a slant, so any two).
  for (const a of here) for (const b of here) {
    if (a !== b) assert.ok(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) >= 7, `${a.id} and ${b.id} overlap`);
  }
});

test('Ttukseom Han River Park and Songpa are at their real places on the Han', async () => {
  const { toGame, anchorOffset } = await import('../src/core/seoul-grid.js');
  const park = map.landmarks.find((l) => l.type === 'hanpark');
  const [rx, rz] = toGame(37.5294, 127.0697); // the park, east of Cheongdam Bridge
  assert.ok(Math.hypot(park.x - rx, park.z - rz) < 20, `park at ${park.x},${park.z}, real ${rx.toFixed(0)},${rz.toFixed(0)}`);
  const songpa = read('region.json').districts.find((d) => d.id === 'songpa');
  assert.ok(!songpa.anchor.nudge, 'Songpa is not nudged');
  assert.deepEqual(songpa.offset, anchorOffset(songpa.anchor).map(Math.round));
});
