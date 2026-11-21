import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CROPS, FARM_BEDS, FRESH, barnCount, barnKey, barnWorth, bedAct, bedState, cropById, hourly, sellPrice, timeLeft } from '../src/core/farm.js';

const MIN = 60e3;

test('five crops, all open, twelve beds (Yozi 2026-11-21)', () => {
  assert.deepEqual(CROPS.map((c) => [c.id, c.grow, c.seed, c.sell]), [
    ['lettuce', 20, 200, 500], ['tomato', 60, 400, 1200], ['potato', 180, 600, 2000], ['chili', 360, 800, 3000], ['cabbage', 720, 1000, 3400],
  ]);
  assert.equal(FARM_BEDS, 12);
  assert.equal(FRESH, 1.5);
  assert.equal(new Set(CROPS.map((c) => c.emoji)).size, CROPS.length, 'each crop has its own emoji');
});

test('a longer crop earns more a visit and less an hour', () => {
  for (let i = 1; i < CROPS.length; i++) {
    const a = CROPS[i - 1], b = CROPS[i];
    assert.ok(b.grow > a.grow);
    assert.ok(sellPrice(b, true) - b.seed > sellPrice(a, true) - a.seed, `${b.id} earns more a harvest than ${a.id}`);
    assert.ok(hourly(b, true) < hourly(a, true), `${b.id} earns less an hour than ${a.id}`);
  }
});

test('every crop pays for its seed even unwatered', () => {
  for (const c of CROPS) assert.ok(sellPrice(c, false) > c.seed, c.id);
});

test('tending all twelve beds non-stop stays under the daily missions an hour (about 100,000) and near fishing (10,000-50,000)', () => {
  const best = Math.max(...CROPS.map((c) => hourly(c, true))) * FARM_BEDS;
  assert.ok(best <= 30000, `best hour is ${best}`);
  assert.ok(best >= 10000, `best hour is ${best}`);
});

test('a bed: sprout, thirsty at half time, growing once watered, ripe at the end', () => {
  const at = 1e12, c = cropById('tomato'), span = c.grow * MIN;
  assert.equal(bedState(null).stage, 'empty');
  assert.equal(bedState({ crop: 'nope', at }).stage, 'empty');
  assert.equal(bedState({ crop: 'tomato', at }, at + span * 0.2).stage, 'sprout');
  assert.equal(bedState({ crop: 'tomato', at }, at + span * 0.6).stage, 'thirsty');
  const wet = at + span * 0.6;
  const g = bedState({ crop: 'tomato', at, wet }, at + span * 0.7);
  assert.equal(g.stage, 'growing');
  assert.equal(g.fresh, true);
  assert.equal(g.left, span * 0.3);
  const r = bedState({ crop: 'tomato', at, wet }, at + span + 5);
  assert.deepEqual([r.stage, r.fresh, r.t, r.left], ['ripe', true, 1, 0]);
  assert.equal(bedState({ crop: 'tomato', at }, at + span * 3).fresh, false, 'never watered: plain');
});

test('water counts only in the second half', () => {
  const at = 1e12, span = cropById('potato').grow * MIN;
  assert.equal(bedState({ crop: 'potato', at, wet: at + span * 0.1 }, at + span).fresh, false, 'too early');
  assert.equal(bedState({ crop: 'potato', at, wet: at + span * 1.2 }, at + span * 2).fresh, false, 'too late');
  assert.equal(bedState({ crop: 'potato', at, wet: at + span * 0.5 }, at + span).fresh, true);
});

test('what to do at a bed', () => {
  const at = 1e12, span = cropById('lettuce').grow * MIN;
  assert.equal(bedAct(null), 'plant');
  assert.equal(bedAct({ crop: 'lettuce', at }, at + 1), null);
  assert.equal(bedAct({ crop: 'lettuce', at }, at + span * 0.5), 'water');
  assert.equal(bedAct({ crop: 'lettuce', at, wet: at + span * 0.5 }, at + span * 0.6), null);
  assert.equal(bedAct({ crop: 'lettuce', at }, at + span), 'pick');
});

test('the barn', () => {
  const barn = { lettuce: 2, 'lettuce+': 1, 'cabbage+': 3, nope: 9, tomato: 0 };
  assert.equal(barnKey('chili', true), 'chili+');
  assert.equal(barnWorth(barn), 2 * 500 + 750 + 3 * 5100);
  assert.equal(barnCount(barn), 15);
  assert.equal(barnWorth(null), 0);
});

test('time left rounds up to the minute', () => {
  assert.deepEqual(timeLeft(1), { h: 0, m: 1 });
  assert.deepEqual(timeLeft(80 * MIN), { h: 1, m: 20 });
  assert.deepEqual(timeLeft(-5), { h: 0, m: 0 });
});

test('the server has the same crops and prices (supabase/064_farm.sql)', () => {
  const sql = readFileSync(new URL('../supabase/064_farm.sql', import.meta.url), 'utf8');
  for (const c of CROPS) {
    assert.ok(sql.includes(`('${c.id}', ${c.grow}, ${c.seed}, ${c.sell})`), `${c.id} row`);
  }
  assert.ok(sql.includes(`beds int not null default ${FARM_BEDS}`));
  assert.ok(sql.includes(`fresh numeric not null default ${FRESH}`));
});

// ---------- The keeper in this browser (core/farm-till.js) ----------
import { LocalFarm } from '../src/core/farm-till.js';
import { BED, BED_SPOTS, FARM_HOUSE, STALL, STALL_STAND, bedNear, farmToLocal, farmToWorld } from '../src/core/farm-site.js';
import { toGame } from '../src/core/seoul-grid.js';
import { inPoly } from '../src/core/geom.js';

function localFarm(coins = 10000) {
  const data = {};
  const storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  const wallet = { coins, log: [], spend(n, note, opts) { if (n > this.coins) return false; this.coins -= n; this.log.push([-n, note?.k, opts?.ask]); return true; }, add(n, note) { this.coins += n; this.log.push([n, note?.k]); } };
  return { farm: new LocalFarm(wallet, storage), wallet };
}

test('the local keeper: plant, water, pick, sell', async () => {
  const { farm, wallet } = localFarm();
  const t0 = 1e12, span = 20 * MIN;
  assert.equal((await farm.info(t0)).beds.length, FARM_BEDS);
  assert.deepEqual(await farm.plant({ requestId: 'a', bed: 0, crop: 'lettuce', price: 999 }, null, t0), { error: 'price', price: 200 });
  assert.equal((await farm.plant({ requestId: 'a', bed: 0, crop: 'lettuce', price: 200 }, { k: 'ledger.farmSeed' }, t0)).bed.crop, 'lettuce');
  assert.deepEqual(wallet.log.at(-1), [-200, 'ledger.farmSeed', false], 'the game already asked: the till does not ask again');
  assert.equal((await farm.plant({ requestId: 'a', bed: 0, crop: 'lettuce', price: 200 }, null, t0)).bed.crop, 'lettuce', 'the same request again');
  assert.equal(wallet.coins, 9800, 'charged once');
  assert.equal((await farm.plant({ requestId: 'b', bed: 0, crop: 'tomato', price: 400 }, null, t0)).error, 'busy');
  assert.equal((await farm.plant({ requestId: 'c', bed: 12, crop: 'tomato', price: 400 }, null, t0)).error, 'bed');
  await farm.plant({ requestId: 'd', bed: 1, crop: 'lettuce', price: 200 }, null, t0);
  assert.equal((await farm.water(0, t0 + 1)).error, 'early');
  assert.equal((await farm.pick(0, t0 + span / 2)).error, 'unripe');
  assert.equal((await farm.water(0, t0 + span / 2)).wet, t0 + span / 2);
  assert.equal((await farm.water(0, t0 + span * 0.6)).error, 'wet');
  assert.equal((await farm.water(1, t0 + span + 1)).error, 'late');
  assert.deepEqual(await farm.pick(0, t0 + span), { crop: 'lettuce', fresh: true, barn: { 'lettuce+': 1 } });
  assert.deepEqual((await farm.pick(1, t0 + span)).barn, { 'lettuce+': 1, lettuce: 1 });
  assert.equal((await farm.pick(1, t0 + span)).error, 'empty');
  assert.deepEqual(await farm.sell({ requestId: 's' }, { k: 'ledger.farmSell' }), { paid: 1250, sold: 2 });
  assert.deepEqual(await farm.sell({ requestId: 's' }, null), { paid: 0, sold: 0 }, 'the same request again pays nothing');
  assert.equal((await farm.sell({ requestId: 's2' }, null)).error, 'none');
  assert.equal(wallet.coins, 10000 - 400 + 1250);
  const { farm: poor } = localFarm(100);
  assert.equal((await poor.plant({ requestId: 'p', bed: 0, crop: 'lettuce', price: 200 }, null, t0)).error, 'coins');
});

// ---------- The place (scripts/build-farm.mjs) ----------
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const itaewon = JSON.parse(readFileSync(new URL('districts/itaewon.json', R), 'utf8'));
const [OX, OZ] = JSON.parse(readFileSync(new URL('region.json', R), 'utf8')).districts.find((d) => d.id === 'itaewon').offset;
const osm = JSON.parse(readFileSync(new URL('../scripts/data/yongsan-family-park-osm.json', import.meta.url), 'utf8'));
const osmWay = (id) => osm.ways.find((w) => w.id === id).p.map(([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; });
const segD = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
};
const lineD = (p, l) => Math.min(...l.slice(1).map((b, i) => segD(p, l[i], b)));
const fm = (k) => itaewon[k].filter((it) => it.fm);
const house = itaewon.landmarks.find((l) => l.type === 'farm');

test('Yongsan Family Park: the park, the pond and the path are the real ones at 1/4 (OSM, within 1 m)', () => {
  const park = fm('areas').find((a) => a.k === 'park'), pond = fm('areas').find((a) => a.k === 'water'), walk = fm('roads')[0];
  const real = { park: osmWay(921902039), pond: osmWay(616037081), walk: osmWay(382079505) };
  for (const q of park.p) assert.ok(lineD(q, real.park) < 1, `park corner ${q}`);
  for (const q of pond.p) assert.ok(lineD(q, real.pond) < 1, `pond corner ${q}`);
  assert.ok(fm('blockers').some((b) => b.p.length === pond.p.length), 'you cannot walk into the pond');
  // The path: OSM's, but for its made-up end down to Seobinggo-ro (marked approx).
  assert.equal(walk.approx.length, 1);
  const [a, b] = walk.approx[0];
  assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) < 6, 'the made-up end is short');
  for (const q of walk.p) if (q !== walk.p.at(-1)) assert.ok(lineD(q, real.walk) < 1, `path point ${q}`);
  const road = itaewon.roads.find((r) => r.n?.en === 'Seobinggo-ro');
  assert.ok(lineD(walk.p.at(-1), road.p) <= road.w / 2 + 1, 'the path reaches the road');
});

test('the glasshouse (made up, marked so) stands in the park, clear of the path and the pond', () => {
  assert.match(house.why, /made up/);
  const park = fm('areas').find((a) => a.k === 'park').p, pond = fm('areas').find((a) => a.k === 'water').p, walk = fm('roads')[0];
  const { hw, hl } = FARM_HOUSE;
  const corners = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl], [STALL.x - 1.25, STALL.z + 0.5], [STALL.x + 1.25, STALL.z + 0.5], STALL_STAND].map(([x, z]) => farmToWorld(house, x, z));
  for (const [x, z] of corners) {
    assert.ok(inPoly(x, z, park), `in the park: ${x}, ${z}`);
    assert.ok(!inPoly(x, z, pond), 'not in the pond');
    assert.ok(lineD([x, z], walk.p) >= walk.w / 2, `off the path: ${lineD([x, z], walk.p)}`);
  }
});

test('the beds: twelve in two rows inside the house, each reached from the aisle', () => {
  assert.equal(BED_SPOTS.length, FARM_BEDS);
  const { hw, hl } = FARM_HOUSE;
  BED_SPOTS.forEach(([x, z], i) => {
    assert.ok(Math.abs(x) + BED.w / 2 < hw && Math.abs(z) + BED.l / 2 < hl, `bed ${i} inside`);
    assert.equal(bedNear(x * 0.4, z), i, `standing by bed ${i}`);
    for (const [x2, z2] of BED_SPOTS.slice(i + 1)) assert.ok(Math.abs(x - x2) >= BED.w || Math.abs(z - z2) >= BED.l, 'beds do not overlap');
  });
  assert.equal(bedNear(0, hl + 2), -1, 'outside the door: no bed');
  const [lx, lz] = farmToLocal(house, ...farmToWorld(house, 1.2, -3.4));
  assert.ok(Math.abs(lx - 1.2) < 1e-9 && Math.abs(lz + 3.4) < 1e-9, 'to the world and back');
});
