import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CROPS, FARM_BEDS, barnCount, barnKey, barnWorth, bedAct, bedState, cropById, cropDays, daily, kstDayNo, sellPrice, timeLeft, waterings } from '../src/core/farm.js';
import { FarmJournal } from '../src/core/farm-journal.js';

const MIN = 60e3, H = 3600e3, DAY = 86400e3;
const T0 = Date.UTC(2026, 10, 21, 1, 0, 0); // 10:00 in Korea

test('ten crops by the day, all open, twelve beds (Yozi 2026-11-21)', () => {
  assert.deepEqual(CROPS.map((c) => [c.id, c.days, c.seed, c.sell, c.fresh]), [
    ['lettuce', 1, 500, 3500, 4500], ['spinach', 1, 700, 3700, 4800], ['tomato', 2, 1000, 7000, 10000], ['cucumber', 2, 1200, 7200, 10300],
    ['strawberry', 4, 2000, 14000, 22000], ['carrot', 5, 2500, 17500, 30000], ['chili', 7, 3500, 24500, 45500], ['corn', 10, 5000, 35000, 75000],
    ['cabbage', 15, 7500, 52500, 127500], ['ginseng', 30, 15000, 105000, 285000],
  ]);
  assert.equal(FARM_BEDS, 12);
  assert.equal(new Set(CROPS.map((c) => c.emoji)).size, CROPS.length, 'each crop has its own emoji');
  for (const c of CROPS) assert.equal(c.grow, c.days * 1440);
});

test('a crop wants water every day; ten days or more forgive one day in ten', () => {
  assert.deepEqual(CROPS.map((c) => [cropDays(c), waterings(c)]), [[1, 1], [1, 1], [2, 2], [2, 2], [4, 4], [5, 5], [7, 7], [10, 9], [15, 14], [30, 27]]);
});

test('plain, every crop earns the same a day; fresh, a longer crop earns more a day', () => {
  for (const c of CROPS) assert.equal(daily(c, false), 3000, c.id);
  for (let i = 1; i < CROPS.length; i++) {
    const a = CROPS[i - 1], b = CROPS[i];
    assert.ok(b.grow >= a.grow);
    assert.ok(daily(b, true) >= daily(a, true), `${b.id} earns no less a day than ${a.id}`);
    if (b.grow > a.grow) assert.ok(daily(b, true) > daily(a, true), `${b.id} earns more a day than ${a.id}`);
  }
  assert.ok(daily(cropById('ginseng'), false) < daily(cropById('lettuce'), true), 'a long crop left dry is worse than lettuce watered');
});

test('twelve beds earn 36,000 to 108,000 a day: under the daily missions (150,000)', () => {
  const day = (c, f) => daily(c, f) * FARM_BEDS;
  assert.equal(day(cropById('lettuce'), true), 48000);
  assert.equal(day(cropById('strawberry'), true), 60000);
  assert.equal(Math.max(...CROPS.map((c) => day(c, true))), 108000);
  assert.equal(Math.min(...CROPS.map((c) => day(c, false))), 36000);
});

test('a bed: thirsty once each Korean day, growing once watered, ripe at the end', () => {
  const at = T0;
  assert.equal(bedState(null).stage, 'empty');
  assert.equal(bedState({ crop: 'nope', at }).stage, 'empty');
  assert.equal(bedState({ crop: 'potato', at }).stage, 'empty', 'a crop that is gone');
  assert.equal(bedState({ crop: 'tomato', at }, at + 1).stage, 'thirsty');
  const g = bedState({ crop: 'tomato', at, wet: at + H, n: 1 }, at + 2 * H);
  assert.deepEqual([g.stage, g.n, g.need, g.fresh, g.left], ['growing', 1, 2, false, 2 * DAY - 2 * H]);
  assert.equal(bedState({ crop: 'tomato', at, wet: at + H, n: 1 }, at + 13 * H).stage, 'growing', '23:00 in Korea: still today');
  assert.equal(bedState({ crop: 'tomato', at, wet: at + H, n: 1 }, at + 14 * H + 1).stage, 'thirsty', 'past midnight in Korea');
  const full = bedState({ crop: 'tomato', at, wet: at + DAY, n: 2 }, at + DAY + H);
  assert.deepEqual([full.stage, full.fresh], ['growing', true]);
  const r = bedState({ crop: 'tomato', at, wet: at + DAY, n: 2 }, at + 2 * DAY + 5);
  assert.deepEqual([r.stage, r.fresh, r.t, r.left], ['ripe', true, 1, 0]);
  assert.equal(bedState({ crop: 'tomato', at, wet: at + H, n: 1 }, at + 9 * DAY).fresh, false, 'a day missed: plain');
  assert.equal(kstDayNo(Date.UTC(2026, 10, 21, 14, 59, 59)) + 1, kstDayNo(Date.UTC(2026, 10, 21, 15, 0, 0)), 'the day turns at 00:00 KST');
});

test('long crops forgive missed days: corn 9 of 10, ginseng 27 of 30', () => {
  const at = T0;
  assert.equal(bedState({ crop: 'corn', at, n: 9 }, at + 10 * DAY).fresh, true);
  assert.equal(bedState({ crop: 'corn', at, n: 8 }, at + 10 * DAY).fresh, false);
  assert.equal(bedState({ crop: 'ginseng', at, n: 27 }, at + 30 * DAY).fresh, true);
  assert.equal(bedState({ crop: 'ginseng', at, n: 26 }, at + 30 * DAY).fresh, false);
  assert.equal(bedState({ crop: 'chili', at, n: 6 }, at + 7 * DAY).fresh, false, 'a week or less forgives nothing');
});

test('what to do at a bed', () => {
  const at = T0;
  assert.equal(bedAct(null), 'plant');
  assert.equal(bedAct({ crop: 'lettuce', at }, at + 1), 'water');
  assert.equal(bedAct({ crop: 'lettuce', at, wet: at + 5, n: 1 }, at + H), null);
  assert.equal(bedAct({ crop: 'lettuce', at, wet: at + 5, n: 1 }, at + 20 * H), null, 'it has had all its water');
  assert.equal(bedAct({ crop: 'lettuce', at }, at + DAY), 'pick');
});

test('the barn', () => {
  const barn = { lettuce: 2, 'lettuce+': 1, 'cabbage+': 3, nope: 9, tomato: 0 };
  assert.equal(barnKey('chili', true), 'chili+');
  assert.equal(barnWorth(barn), 2 * 3500 + 4500 + 3 * 127500);
  assert.equal(barnCount(barn), 15);
  assert.equal(barnWorth(null), 0);
  assert.equal(sellPrice(null, true), 0);
});

test('time left rounds up to the minute and counts days', () => {
  assert.deepEqual(timeLeft(1), { d: 0, h: 0, m: 1 });
  assert.deepEqual(timeLeft(80 * MIN), { d: 0, h: 1, m: 20 });
  assert.deepEqual(timeLeft(2 * DAY + 3 * H), { d: 2, h: 3, m: 0 });
  assert.deepEqual(timeLeft(-5), { d: 0, h: 0, m: 0 });
});

test('the server has the same crops, prices and watering rule (supabase/066_farm_days.sql)', () => {
  const sql = readFileSync(new URL('../supabase/066_farm_days.sql', import.meta.url), 'utf8');
  for (const c of CROPS) {
    assert.ok(sql.includes(`('${c.id}', ${c.grow}, ${c.seed}, ${c.sell}, ${c.fresh})`), `${c.id} row`);
  }
  assert.ok(sql.includes('select d - d / 10 from'), 'one missed day in ten');
  assert.ok(sql.includes("at time zone 'Asia/Seoul'"), 'Korean days');
  assert.ok(readFileSync(new URL('../supabase/064_farm.sql', import.meta.url), 'utf8').includes(`beds int not null default ${FARM_BEDS}`));
});

test("the farmer's journal: a stamp the first time each crop is harvested", () => {
  const data = {};
  const storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  const j = new FarmJournal(storage);
  assert.equal(j.kinds, 0);
  assert.equal(j.add('lettuce', false), true);
  assert.equal(j.add('lettuce', true), false);
  assert.equal(j.add('ginseng', true), true);
  assert.equal(j.add('<b>'), false);
  assert.deepEqual([j.kinds, j.total, j.count('lettuce'), j.fresh('lettuce'), j.has('corn')], [2, 3, 2, 1, false]);
  const again = new FarmJournal(storage);
  assert.deepEqual([again.kinds, again.count('ginseng'), again.fresh('ginseng')], [2, 1, 1], 'kept on this device (and in the cloud save: "mk.")');
  assert.ok(Object.keys(data)[0].startsWith('mk.'));
  assert.equal(new FarmJournal({ getItem: () => '{bad' }).kinds, 0);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(main.includes(`const FARM_KINDS = ${CROPS.length};`), "the notebook's count matches the crops");
});

// ---------- The keeper in this browser (core/farm-till.js) ----------
import { LocalFarm } from '../src/core/farm-till.js';
import { BED, BED_SPOTS, FARM_HOUSE, STALL, STALL_STAND, bedNear, farmToLocal, farmToWorld } from '../src/core/farm-site.js';
import { toGame } from '../src/core/seoul-grid.js';
import { inPoly } from '../src/core/geom.js';

function localFarm(coins = 100000) {
  const data = {};
  const storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  const wallet = { coins, log: [], spend(n, note, opts) { if (n > this.coins) return false; this.coins -= n; this.log.push([-n, note?.k, opts?.ask]); return true; }, add(n, note) { this.coins += n; this.log.push([n, note?.k]); } };
  return { farm: new LocalFarm(wallet, storage), wallet };
}

test('the local keeper: plant, water once a day, pick, sell', async () => {
  const { farm, wallet } = localFarm();
  const t0 = T0;
  assert.equal((await farm.info(t0)).beds.length, FARM_BEDS);
  assert.deepEqual(await farm.plant({ requestId: 'a', bed: 0, crop: 'tomato', price: 999 }, null, t0), { error: 'price', price: 1000 });
  assert.equal((await farm.plant({ requestId: 'a', bed: 0, crop: 'tomato', price: 1000 }, { k: 'ledger.farmSeed' }, t0)).bed.crop, 'tomato');
  assert.deepEqual(wallet.log.at(-1), [-1000, 'ledger.farmSeed', false], 'the game already asked: the till does not ask again');
  assert.equal((await farm.plant({ requestId: 'a', bed: 0, crop: 'tomato', price: 1000 }, null, t0)).bed.crop, 'tomato', 'the same request again');
  assert.equal(wallet.coins, 99000, 'charged once');
  assert.equal((await farm.plant({ requestId: 'b', bed: 0, crop: 'lettuce', price: 500 }, null, t0)).error, 'busy');
  assert.equal((await farm.plant({ requestId: 'c', bed: 12, crop: 'lettuce', price: 500 }, null, t0)).error, 'bed');
  assert.equal((await farm.plant({ requestId: 'c2', bed: 2, crop: 'potato', price: 600 }, null, t0)).error, 'crop');
  await farm.plant({ requestId: 'd', bed: 1, crop: 'tomato', price: 1000 }, null, t0);
  assert.deepEqual(await farm.water(0, t0 + 1), { wet: t0 + 1, n: 1 });
  assert.equal((await farm.water(0, t0 + H)).error, 'wet', 'once a Korean day');
  assert.equal((await farm.pick(0, t0 + DAY)).error, 'unripe');
  assert.deepEqual(await farm.water(0, t0 + DAY), { wet: t0 + DAY, n: 2 });
  assert.equal((await farm.water(1, t0 + DAY)).n, 1, 'bed 1 missed the first day');
  assert.equal((await farm.water(1, t0 + 2 * DAY + 1)).error, 'late');
  assert.deepEqual(await farm.pick(0, t0 + 2 * DAY), { crop: 'tomato', fresh: true, barn: { 'tomato+': 1 } });
  assert.deepEqual((await farm.pick(1, t0 + 2 * DAY)).barn, { 'tomato+': 1, tomato: 1 });
  assert.equal((await farm.pick(1, t0 + 2 * DAY)).error, 'empty');
  assert.deepEqual(await farm.sell({ requestId: 's' }, { k: 'ledger.farmSell' }), { paid: 17000, sold: 2 });
  assert.deepEqual(await farm.sell({ requestId: 's' }, null), { paid: 0, sold: 0 }, 'the same request again pays nothing');
  assert.equal((await farm.sell({ requestId: 's2' }, null)).error, 'none');
  assert.equal(wallet.coins, 100000 - 2000 + 17000);
  const { farm: poor } = localFarm(100);
  assert.equal((await poor.plant({ requestId: 'p', bed: 0, crop: 'lettuce', price: 500 }, null, t0)).error, 'coins');
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
