import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fishById, chanceAt, parkOf, rollCatch, PARK_FISH, TIER_SHARE } from '../src/core/fishing.js';
import { inPolygon } from '../src/core/seoul-grid.js';
import { STAMPS } from '../src/data/stamps.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const seoul = read('seoul.json');
const stores = read('stores.json').stores;
const district = region.districts.find((d) => d.id === 'banpo-jamwon');
const map = read(district.map);
const world = ([x, z]) => [x + district.offset[0], z + district.offset[1]];

test('Banpo-Jamwon: Banpo and Jamwon Han River Parks on the south bank, in Seocho-gu', () => {
  const gu = seoul.gu.find((g) => g.id === 'seocho'), gangnam = seoul.gu.find((g) => g.id === 'gangnam');
  assert.ok(gu.open && gu.districts.includes('banpo-jamwon'), 'Seocho-gu is open');
  // (Jamwon's park runs on past Hannam Bridge into Gangnam-gu, as the real one.)
  for (const a of map.areas.filter((x) => x.k !== 'water')) for (const p of a.p) assert.ok(inPolygon(...world(p), gu.p) || (gangnam.open && inPolygon(...world(p), gangnam.p)), `${a.k} ${world(p)} is in Seocho-gu (or Gangnam-gu)`);
  assert.ok(map.areas.some((a) => a.k === 'park' && a.trees), 'a wooded lawn (picnic mats and frisbees go there)');
  // The river is the region's water on the real banks (scripts/han-bank.mjs).
  // The lawn runs down to the water: just inland of the park's bank edge is
  // dry, just out from it is river.
  const park = map.landmarks.find((l) => l.type === 'hanpark' && l.store === 'banpo-hangang');
  const [px, pz] = world([park.x, park.z]), out = [Math.sin(park.ry), Math.cos(park.ry)];
  const river = region.water.find((w) => inPolygon(px - out[0] * 30, pz - out[1] * 30, w.p));
  assert.ok(river?.blockers?.length === 2, 'the river, which you cannot walk into, but for the bridge');
  for (const x of [-40, 0, 40, 80]) {
    const along = [px + out[1] * x, pz - out[0] * x]; // (the bank runs at right angles to ry)
    const wet = (d) => inPolygon(along[0] - out[0] * d, along[1] - out[1] * d, river.p);
    assert.ok(!wet(-2) && wet(3), `the bank at park x ${x}`);
  }
  assert.ok(map.landmarks.filter((l) => l.type === 'bench').length >= 6, 'benches facing the river');
});

test('Jamsu Bridge crosses the river from Itaewon, through a gap in the river', () => {
  const bridge = map.roads.find((r) => r.n?.en === 'Jamsu Bridge');
  assert.ok(bridge, 'the bridge is a road');
  const link = region.links.find((l) => l.n?.en === 'To Banpo Bridge');
  const north = world(bridge.p[0]);
  assert.ok(Math.hypot(link.p.at(-1)[0] - north[0], link.p.at(-1)[1] - north[1]) < 1, 'the link road meets the bridge');
  const itaewon = region.districts.find((d) => d.id === 'itaewon');
  const noksa = read(itaewon.map).roads.find((r) => r.n?.en === 'Noksapyeong-daero');
  const end = noksa.p.at(-1);
  assert.ok(Math.hypot(link.p[0][0] - end[0] - itaewon.offset[0], link.p[0][1] - end[1] - itaewon.offset[1]) < 1, 'it starts at the south end of Noksapyeong-daero');
  // Walk the bridge: no river blocker on its middle, and it does cross the river.
  const [a, b] = bridge.p.map(world);
  const blockers = region.water.flatMap((w) => w.blockers || [w.p]);
  let wet = 0;
  for (let t = 0; t <= 1; t += 0.05) {
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    for (const bl of blockers) assert.ok(!inPolygon(x, z, bl), `bridge at ${t.toFixed(2)} is open`);
    if (region.water.some((w) => inPolygon(x, z, w.p))) wet++;
  }
  assert.ok(wet >= 14, `it crosses the river (${wet} of 21 points over water)`);
  assert.ok(map.landmarks.some((l) => l.type === 'jamsu'), 'railings, lamps and Banpo Bridge overhead');
});

test('the Information Center stands in front of its building', () => {
  const park = stores.find((s) => s.id === 'banpo-hangang');
  const info = stores.find((s) => s.id === 'info-banpo-jamwon');
  assert.equal(park.category, 'park');
  assert.equal(info.workshop, 'info');
  assert.equal(info.district, 'banpo-jamwon');
  const polys = map.buildings.map((b) => b.p.map(world));
  for (const s of [info]) {
    assert.ok(!polys.some((p) => inPolygon(...s.at, p)), `${s.id} is not inside a building`);
    const near = Math.min(...polys.flat().map(([x, z]) => Math.hypot(x - s.at[0], z - s.at[1])));
    assert.ok(near < 12, `${s.id} is next to its building (${near.toFixed(1)} m)`);
  }
  for (const l of ['en', 'ko', 'ja', 'zh']) assert.ok(park.name[l] && park.tagline[l] && park.market.name[l] && park.kiosk.name[l], l);
  const kiosk = park.products.filter((p) => p.kiosk).map((p) => p.ingredient).sort();
  assert.deepEqual(kiosk, ['egg', 'frisbee', 'mat', 'ramyeon'], 'ramen, a mat and a frisbee, like every Han River park');
  const ids = new Set(park.market.stalls.map((s) => s.id));
  for (const st of park.market.stalls) {
    const goods = park.products.filter((p) => p.stall === st.id);
    assert.ok(goods.length >= 1 && goods.length <= 2, st.id);
  }
  for (const p of park.products) assert.ok(p.kiosk || ids.has(p.stall), p.id);
  const others = new Set(stores.filter((s) => s !== park).flatMap((s) => (s.products || []).map((p) => p.id)));
  for (const p of park.products) assert.ok(!others.has(p.id), `${p.id} is the park's own`);
  assert.ok(STAMPS.some((s) => s.id === 'banpo-jamwon' && Array.isArray(s.place.at) && !s.place.room), 'a stamp in the park, on the street');
});

test('the manta ray is Jamwon\'s legend, and only bites there', () => {
  const manta = fishById('manta');
  assert.ok(manta.released);
  for (const id of ['kelp', 'octopus', 'sea-urchin', 'dolphin']) assert.ok(fishById(id).released, `${id} opens with the park`);
  assert.equal(parkOf('manta').name.en, 'Jamwon');
  assert.ok(Math.abs(chanceAt(manta, 'jamwon-hangang') - TIER_SHARE[5]) < 1e-9);
  for (const park of Object.keys(PARK_FISH).filter((p) => p !== 'jamwon-hangang')) assert.equal(chanceAt(manta, park), 0, park);
  assert.equal(chanceAt(fishById('whale'), 'jamwon-hangang'), 0);
  assert.equal(chanceAt(fishById('giant-squid'), 'jamwon-hangang'), 0);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 50000; i++) {
    const id = rollCatch(rand, i % 2 === 0, 'jamwon-hangang').id;
    assert.ok(id !== 'whale' && id !== 'giant-squid', id);
  }
});

test('Jamwon Han River Park: next to Banpo\'s upstream, on its real bank, with fishing', () => {
  const jw = map.landmarks.find((l) => l.type === 'hanpark' && l.store === 'jamwon-hangang');
  assert.ok(jw, 'its park on the street');
  const store = stores.find((s) => s.id === 'jamwon-hangang');
  assert.ok(store?.hanpark && store.products.length === 0, 'a plain riverside park: no kiosk, no stalls (Yozi)');
  assert.ok(jw.layout.fishing.length >= 3 && jw.layout.pier && jw.layout.fishBuy, 'fishing from the bank and its pier, and the fish buyer');
  // Its middle is on the real bank between Banpo's park and Hannam Bridge (OpenStreetMap).
  const [x, z] = world([jw.x, jw.z]);
  assert.ok(x > -1137 && x < -918, `between Banpo's park and Hannam Bridge (${x.toFixed(1)}, ${z.toFixed(1)})`);
  const river = region.water.find((w) => inPolygon(x - Math.sin(jw.ry) * 10, z - Math.cos(jw.ry) * 10, w.p));
  assert.ok(river && !inPolygon(x + Math.sin(jw.ry) * 3, z + Math.cos(jw.ry) * 3, river.p), 'the river in front, dry land behind');
});

test('Banpo Bridge on its whole real line overhead, and Dongjak Bridge downstream', () => {
  const bridges = map.landmarks.filter((l) => l.type === 'banpobridge');
  const len = (b) => b.pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - b.pts[i][0], q[1] - b.pts[i][1]), 0);
  const banpo = bridges.find((b) => !b.which), dongjak = bridges.find((b) => b.which === 'dongjak');
  assert.ok(Math.abs(len(banpo) - 1490 / 4) < 5, `Banpo Bridge is the real one at 1/4 (${len(banpo).toFixed(0)} m)`);
  assert.ok(Math.abs(len(dongjak) - 1330 / 4) < 10, `Dongjak Bridge too (${len(dongjak).toFixed(0)} m)`);
  // Its north ramp keeps clear of Itaewon's houses.
  const houses = region.districts.filter((d) => d.id === 'itaewon').flatMap((d) => read(d.map).buildings.map((bd) => bd.p.map(([px, pz]) => [px + d.offset[0], pz + d.offset[1]])));
  const [ox, oz] = world([banpo.x, banpo.z]);
  const ss = (k) => k * k * (3 - 2 * k), rampN = banpo.ramp[0];
  const half = (s) => (s < rampN ? banpo.wRamp + (banpo.w - banpo.wRamp) * ss(Math.max(0, (s - rampN + 20) / 20)) : banpo.w) / 2; // (core/banpo-bridge.js)
  let cum = 0;
  for (let i = 1; i < banpo.pts.length; i++) {
    const [ax, az] = banpo.pts[i - 1], [bx, bz] = banpo.pts[i], L = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s <= L; s += 2) for (const side of [-1, 1]) {
      const h = half(cum + s);
      const px = ox + ax + ((bx - ax) * s) / L + ((bz - az) / L) * side * h, pz = oz + az + ((bz - az) * s) / L - ((bx - ax) / L) * side * h;
      assert.ok(!houses.some((q) => inPolygon(px, pz, q)), `the deck clears Itaewon's houses at (${px.toFixed(1)}, ${pz.toFixed(1)})`);
    }
    cum += L;
  }
});

test('every landmark\'s "clear" is a radius (core/world.js keeps the trees off with it; anything else stops every tree)', () => {
  for (const d of region.districts) for (const l of read(d.map).landmarks || []) if ('clear' in l) assert.ok(Number.isFinite(l.clear), `${d.id} ${l.type}`);
});
