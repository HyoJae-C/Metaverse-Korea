import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';
import { noticeBoardSpots, boardRowSpots } from '../src/core/notice-board-spots.js';

// Stamp stands, the square's notice boards and meeting spots must stay on
// open ground. When a district or building moves to its real place (DDP,
// Gwanghwamun, the Yeonmujang-gil rebuild), things given as world positions
// stay behind: the notice boards ended up inside the shops at the north end
// of Seongsu Square, the DDP Plaza meeting spot inside DDP, and the War
// History Museum's stamp stand in its front steps.
const ctx = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}) });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
const { Storefronts } = await import('../src/core/storefronts.js');
const { blockersOf, outsideOf } = await import('../src/core/subway.js');
const { streetBlockers } = await import('../src/core/stream.js');
const { standSpots, standClear } = await import('../src/core/stamp-stands.js');
const { STAMPS } = await import('../src/data/stamps.js');
const { createNamsanWalk } = await import('../src/game/namsan-walk.js');

const R = new URL('../public/regions/another-seoul/', import.meta.url);
const rj = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = rj('region.json');
const map = await loadRegionMap(region, async (f) => rj(f));
const exits = (region.subway?.stations || []).flatMap((s) => s.exits || []);
// what you bump into on the street (as main.js builds it, less the fan dance ring)
const collision = new CollisionMap(map.buildings.filter((b) => !b.visit).concat(map.blockers || [], exits.flatMap(blockersOf), (map.streams || []).flatMap(streetBlockers)));
createNamsanWalk({ landmarks: map.landmarks, collision }); // (the Namsan trail and summit plaza: decks over the hill)
const blocked = (x, z, r) => collision.blocked(x, z, r);
const zones = rj('zones.json').zones;
const r1 = (v) => Math.round(v * 10) / 10;

test('every stamp stand on the street, and where you use it, is clear of walls', () => {
  const stores = [...rj('stores.json').stores, ...(rj('homes.json').homes || [])];
  const fronts = new Map(new Storefronts({ add() {} }, stores, map, region.center, collision).items.map((i) => [i.store.id, i]));
  const spots = standSpots(STAMPS.filter((s) => !s.place.store || s.place.room || fronts.has(s.place.store)), (id) => fronts.get(id), blocked);
  assert.ok(spots.length >= 20);
  const bad = spots.filter((s) => !standClear(s.x, s.z, s.ry, blocked)).map((s) => `${s.stamp.id} at ${r1(s.x)}, ${r1(s.z)}`);
  assert.deepEqual(bad, [], 'stamp stands in a wall:\n' + bad.join('\n'));
});

test('the notice boards on the main square stand clear of the buildings', () => {
  const sq = zones[0];
  const spots = noticeBoardSpots({ x: sq.at[0], z: sq.at[1], zone: sq }, blocked);
  assert.deepEqual(spots.map((b) => b.board), ['news', 'free', 'ask']);
  for (const b of spots) {
    assert.ok(!blocked(b.x, b.z, 0.6), `${b.board} board inside a building at ${r1(b.x)}, ${r1(b.z)}`);
    assert.ok(!blocked(b.ux, b.uz, 0.6), `can't stand in front of the ${b.board} board`);
    // still on the square
    assert.ok(Math.hypot(b.x - sq.at[0], b.z - sq.at[1]) < sq.pave.l / 2, `${b.board} board off the square`);
  }
});

test('the notice boards at the other meeting places stand clear of walls and car roads', () => {
  const segD = (x, z, r) => { let d = Infinity; for (let i = 0; i < r.p.length - 1; i++) { const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1]; const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2)); d = Math.min(d, Math.hypot(x1 + dx * t - x, z1 + dz * t - z)); } return d; };
  // a car road, or a footpath too narrow to stand three boards in
  const onRoad = (x, z) => map.roads.some((r) => (r.k !== 'walk' || r.w < 10) && segD(x, z, r) < r.w / 2 + 0.5);
  const rows = zones.filter((z) => z.boards);
  assert.ok(rows.length >= 5, 'boards at the big meeting places');
  const bad = [];
  for (const z of rows) for (const b of boardRowSpots(z.boards)) {
    if (blocked(b.x, b.z, 0.6) || onRoad(b.x, b.z)) bad.push(`${z.id} ${b.board} board at ${r1(b.x)}, ${r1(b.z)}`);
    if (blocked(b.ux, b.uz, 0.6) || onRoad(b.ux, b.uz)) bad.push(`${z.id} in front of the ${b.board} board`);
  }
  assert.deepEqual(bad, []);
});

test('Seongsu keeps only two meeting signposts (Yozi 2026-11-18)', () => {
  const seongsu = zones.filter((z) => z.id.startsWith('A-') && z.sign !== false).map((z) => z.id);
  assert.deepEqual(seongsu, ['A-1', 'A-7']);
});

test('meeting spots that stand exactly where they say are not inside a building', () => {
  const bad = zones.filter((z) => z.snap === false && blocked(z.at[0], z.at[1], 1)).map((z) => `${z.id} ${z.name.en} at ${z.at}`);
  assert.deepEqual(bad, [], 'meeting spots in a wall:\n' + bad.join('\n'));
});

test('you come up every subway exit onto open ground', () => {
  const bad = [];
  for (const st of region.subway?.stations || []) for (const [i, ex] of (st.exits || []).entries()) {
    const o = outsideOf(ex);
    if (blocked(o.x, o.z, 0.5)) bad.push(`${st.id || st.name?.en} exit ${i + 1} at ${r1(o.x)}, ${r1(o.z)}`);
  }
  assert.deepEqual(bad, []);
});
