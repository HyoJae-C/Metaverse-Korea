// Missions that send you to a person or a place must still point somewhere
// real after the map is moved around (zones.json, stores.json, districts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };

const { NAMES, NAME_ROMAN, PER_ZONE, npcName } = await import('../src/data/npc-names.js');
const { Daily, missionsFor } = await import('../src/core/daily.js');
const { STARTER } = await import('../src/core/quests.js');
const { loadRegionMap, districtBoxes, districtAt } = await import('../src/core/districts.js');
const { RoadGraph } = await import('../src/core/route.js');

const R = new URL('../public/regions/another-seoul/', import.meta.url);
const json = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const zones = json('zones.json').zones;
const stores = [...json('stores.json').stores, ...(json('homes.json').homes || [])];
const npcList = zones.flatMap((z) => Array.from({ length: PER_ZONE }, (_, k) => ({ name: npcName(z.id, k), zone: z })));
const pool = { npcs: npcList.map((n) => n.name), stores: stores.filter((s) => s.category !== 'home') };

test('every passer-by name is one person, with a romanization', () => {
  assert.equal(new Set(NAMES).size, NAMES.length, 'no name twice in the list');
  assert.equal(NAMES.length, 26 * PER_ZONE, 'two names for each letter A..Z');
  for (const n of NAMES) assert.ok(NAME_ROMAN[n], `${n} has a romanization`);
  // The first zones keep the names they always had.
  assert.deepEqual([npcName('A', 0), npcName('A', 1), npcName('D', 0), npcName('F', 1)], ['민지', '지훈', '지아', '시우']);
});

test('zone names never repeat and don\'t depend on the order of zones.json', () => {
  for (const z of zones) assert.match(z.id, /^[A-Z]$/, `zone ${z.id}: ids are single letters, so each gets its own names`);
  assert.equal(new Set(zones.map((z) => z.id)).size, zones.length, 'zone ids are unique');
  const names = npcList.map((n) => n.name);
  assert.equal(new Set(names).size, names.length, 'no two passers-by share a name: "find X" means one person');
  // Same names for a zone wherever it sits in the list (adding one in the middle moves nobody).
  const byZone = (list) => Object.fromEntries(list.map((z) => [z.id, [npcName(z.id, 0), npcName(z.id, 1)]]));
  assert.deepEqual(byZone([...zones].reverse()), byZone(zones));
});

test('every meeting zone (where its passers-by live) is on the map, next to a street of its own district', async () => {
  const map = await loadRegionMap(json('region.json'), async (f) => json(f));
  const boxes = districtBoxes(map);
  const graph = new RoadGraph(map.roads);
  for (const z of zones) {
    const [x, y] = z.at;
    const d = districtAt(boxes, x, y, 0);
    const box = boxes.find((b) => b.id === d && x >= b.x0 && x <= b.x1 && y >= b.z0 && y <= b.z1);
    assert.ok(box, `zone ${z.id} (${z.name.en}) at [${x}, ${y}] stands inside a district, not in the empty land between them`);
    // Passers-by start at the nearest street node and head back once they
    // are 120 m from home (core/npcs.js), so that node must be close.
    const [nx, nz] = graph.nodes[graph.nearest(x, y)];
    assert.ok(Math.hypot(nx - x, nz - y) < 120, `zone ${z.id} (${z.name.en}) has a street within 120 m`);
    assert.equal(districtAt(boxes, nx, nz), d, `zone ${z.id}'s passers-by walk in ${d}, not another district`);
  }
});

test('daily "find someone" and "visit" missions always name someone or somewhere that exists', () => {
  const ids = new Set(stores.map((s) => s.id));
  for (let i = 0; i < 120; i++) {
    const day = new Date(2026, 10, 1 + i).toISOString().slice(0, 10);
    for (const m of missionsFor(day, pool)) {
      if (m.type === 'talk') assert.ok(npcList.some((n) => n.name === m.target), `${day}: ${m.target} lives in a zone`);
      if (m.type === 'visit') assert.ok(ids.has(m.target), `${day}: ${m.target} is a shop`);
    }
  }
});

test('a saved mission naming someone who is gone is swapped for today\'s pick', () => {
  for (const k of Object.keys(store)) delete store[k];
  const now = () => new Date(2026, 10, 7, 12);
  const old = { npcs: ['없는사람'], stores: pool.stores };
  new Daily({ add() {} }, old, now).missions; // saved with the old map
  const d = new Daily({ add() {} }, pool, now);
  const talk = d.missions.find((m) => m.type === 'talk');
  assert.ok(pool.npcs.includes(talk.target), `now ${talk.target}`);
  assert.equal(talk.n, 0);
});

test('the new player\'s first errands go to shops that exist near the square', () => {
  const [sx, sz] = zones[0].at;
  for (const st of STARTER) {
    if (!st.target) continue;
    const s = stores.find((x) => x.id === st.target);
    assert.ok(s, `${st.target} is a shop`);
    assert.ok(Math.hypot(s.at[0] - sx, s.at[1] - sz) < 300, `${st.target} is within 300 m of the square`);
  }
});
