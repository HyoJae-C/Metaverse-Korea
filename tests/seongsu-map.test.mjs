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

test('shop fronts by Seongsu station do not land on each other (the sign goes on the nearest free wall, not on "at")', async () => {
  // Punch Arcade's first spot was too close to a station exit: its front
  // slid 10 m along to the photo studio's wall and the two signs overlapped.
  const { nearestFacade } = await import('../src/core/storefronts.js');
  const solids = [...map.buildings, ...(map.blockers || [])].filter((b) => b.p);
  const blocked = (x, z) => solids.some((b) => inPoly(x, z, b.p));
  const here = shops.filter((s) => Array.isArray(s.at) && Math.hypot(...s.at) < 120 && !s.hanpark && !s.open && !s.below && !s.carts && s.front !== 'landmark');
  const spots = here.map((s) => ({ s, f: nearestFacade(map.buildings, s.at[0], s.at[1], blocked) }));
  for (const { s, f } of spots) {
    assert.ok(f, `${s.id} has a wall`);
    assert.ok(Math.hypot(f.x - s.at[0], f.z - s.at[1]) < 4, `${s.id} front is ${Math.hypot(f.x - s.at[0], f.z - s.at[1]).toFixed(1)} m from its spot`);
  }
  for (const a of spots) for (const b of spots) if (a.s.id < b.s.id) assert.ok(Math.hypot(a.f.x - b.f.x, a.f.z - b.f.z) >= 6.4, `${a.s.id} and ${b.s.id} fronts overlap`);
  // The arcade stands clear of the exits (which the map file does not list), well away from any other front.
  const arcade = spots.find((q) => q.s.id === 'punch-arcade');
  for (const q of spots) if (q !== arcade) assert.ok(Math.hypot(q.f.x - arcade.f.x, q.f.z - arcade.f.z) >= 20, `the arcade and ${q.s.id}`);
  assert.ok(Math.hypot(...arcade.s.at) > 30, 'away from the station exits');
});
