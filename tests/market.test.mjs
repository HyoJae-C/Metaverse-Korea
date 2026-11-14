import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARKET, priceRange, sellerGets, clampPrice, listable, shown, mats, layout, newlySold, MarketClient } from '../src/core/market.js';
import { Receipts } from '../src/core/resale.js';
import { WEARABLES } from '../src/data/wearables.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const sql = readFileSync(new URL('../supabase/034_player_market.sql', import.meta.url), 'utf8');
const hoodie = WEARABLES['outfit-hoodie-black'];

test('the rules Yozi picked, the same on the server', () => {
  assert.deepEqual(MARKET, { minPct: 10, maxPct: 100, feePct: 5, days: 3, openMax: 6, minHours: 24 });
  assert.match(sql, /market_min_pct int not null default 10/);
  assert.match(sql, /market_max_pct int not null default 100/);
  assert.match(sql, /market_fee_pct int not null default 5/);
  assert.match(sql, /market_days int not null default 3/);
  assert.match(sql, /market_open_max int not null default 6/);
  assert.match(sql, /market_min_hours int not null default 24/);
});

test('prices: 10% to 100% of the new price, the seller gets it less 5% (fee rounded up)', () => {
  assert.deepEqual(priceRange(60000), { min: 6000, max: 60000 });
  assert.deepEqual(priceRange(45500), { min: 4550, max: 45500 });
  assert.equal(priceRange(0), null);
  assert.equal(priceRange(60000, { ...MARKET, maxPct: 0 }), null, 'closed');
  assert.equal(sellerGets(30000), 28500);
  assert.equal(sellerGets(1001), 950);
  assert.equal(clampPrice(123456, priceRange(60000)), 60000);
  assert.equal(clampPrice(10, priceRange(60000)), 6000);
  assert.equal(clampPrice(30049, priceRange(60000)), 30000);
});

test('only clothes with a receipt go on a mat; second-hand ones keep counting from the new price', () => {
  const r = new Receipts(mem());
  r.record('outfit-hoodie-black', hoodie.price, 'op-1');
  r.record('acc-cap-red', 9000, 'op-2', null, WEARABLES['acc-cap-red'].price); // bought on a mat
  const owned = ['outfit-hoodie-black', 'acc-cap-red', 'pants-black'];
  assert.deepEqual(listable(owned, WEARABLES, r), [
    { id: 'outfit-hoodie-black', paid: hoodie.price, list: hoodie.price },
    { id: 'acc-cap-red', paid: 9000, list: WEARABLES['acc-cap-red'].price },
  ]);
  assert.deepEqual(listable(owned, WEARABLES, r, new Set(['outfit-hoodie-black'])).map((x) => x.id), ['acc-cap-red'], 'not twice');
  assert.equal(new Receipts(r.storage).get('acc-cap-red').list, WEARABLES['acc-cap-red'].price, 'kept');
});

test('mats: one per seller, up to 6 things, and only listings this game can trust', () => {
  const row = (id, mat, item = 'outfit-hoodie-black', list = WEARABLES[item].price) => ({ id, mat, item, list, price: 1000, name: 'Mina', mine: false });
  const rows = [1, 2, 3, 4, 5, 6, 7].map((i) => row(i, 1)).concat([
    row(8, 2, 'acc-cap-red'),
    row(9, 2, 'outfit-hoodie-black', 1), // a price that isn't the hoodie's
    row(10, 3, 'not-a-thing', 100),
  ]);
  const m = mats(rows, WEARABLES);
  assert.equal(m.length, 2);
  assert.equal(m[0].things.length, 6);
  assert.deepEqual(m[1].things.map((t) => t.id), [8]);
  assert.equal(shown(row(9, 2, 'outfit-hoodie-black', 1), WEARABLES), false);
});

test('a sale is told once', () => {
  const s = mem();
  const rows = [{ id: 4, item: 'acc-cap-red', status: 'sold', got: 9500 }, { id: 5, item: 'outfit-hoodie-black', status: 'open' }];
  assert.deepEqual(newlySold(rows, s), [{ id: 4, item: 'acc-cap-red', got: 9500 }]);
  assert.deepEqual(newlySold(rows, s), []);
});

// A tiny stand-in for the server: one listing, two buyers.
function fakeWallet(coins) {
  const w = { server: true, coins, log: [], lastOp: null, client: null, flush: async () => true,
    _fromServer(d) { this.coins = d.coins; }, _log(n, note) { this.log.push({ n, note }); }, _notify() {} };
  return w;
}

test('two buyers tap the same thing: the first gets it, the second pays nothing', async () => {
  const listing = { id: 1, status: 'open', price: 30000, item: 'outfit-hoodie-black', list: hoodie.price };
  const server = (w) => ({ rpc: async (fn, a) => {
    assert.equal(fn, 'market_buy');
    if (listing.status !== 'open') return { data: { status: 'gone' } };
    listing.status = 'sold';
    return { data: { status: 'ok', coins: w.coins - listing.price, ver: 2, n: -listing.price, item: listing.item, list: listing.list, op: a.p_op } };
  } });
  const a = fakeWallet(100000), b = fakeWallet(100000);
  a.client = server(a); b.client = server(b);
  const [ra, rb] = await Promise.all([new MarketClient(a).buy(1, 'op-a', { name: hoodie.name }), new MarketClient(b).buy(1, 'op-b', { name: hoodie.name })]);
  assert.deepEqual(ra, { ok: true, n: 30000, item: 'outfit-hoodie-black', list: hoodie.price });
  assert.deepEqual(rb, { ok: false, why: 'gone' });
  assert.equal(a.coins, 70000);
  assert.equal(b.coins, 100000);
  assert.deepEqual(a.log, [{ n: -30000, note: { name: hoodie.name } }]);
  assert.equal(b.log.length, 0);
});

test('closed without a server wallet or before 034 is run', async () => {
  const w = fakeWallet(0);
  w.server = false;
  assert.equal((await new MarketClient(w).buy(1, 'x')).why, 'closed');
  w.server = true;
  w.client = { rpc: async () => ({ error: { code: 'PGRST202', message: 'not found' } }) };
  const m = new MarketClient(w);
  assert.equal(await m.info(), null);
  w.client = { rpc: async () => ({ data: { min_pct: 10, max_pct: 100, fee_pct: 5, days: 3, open_max: 6, min_hours: 24, unit: 'krw' } }) };
  assert.deepEqual(await m.info(), MARKET);
});

test('the server locks the listing before the wallets, and both wallets in one order', () => {
  const buy = sql.slice(sql.indexOf('function public.market_buy'));
  assert.ok(buy.indexOf('where id = p_id for update') < buy.indexOf('order by user_id for update'));
  assert.match(sql, /market_old_enough/);
});

test('Dongmyo: 12 mat spots on the plaza, clear of the meeting-spot sign and the stalls', () => {
  const R = new URL('../public/regions/another-seoul/', import.meta.url);
  const dm = JSON.parse(readFileSync(new URL('districts/dongmyo.json', R), 'utf8'));
  const region = JSON.parse(readFileSync(new URL('region.json', R), 'utf8'));
  const zones = JSON.parse(readFileSync(new URL('zones.json', R), 'utf8'));
  const [ox, oz] = region.districts.find((d) => d.id === 'dongmyo').offset;
  const pm = dm.landmarks.find((l) => l.type === 'potatomarket');
  const plaza = dm.areas.find((a) => a.k === 'plaza').p;
  const inside = ([x, z], p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
  assert.equal(pm.spots.length, 12);
  const zone = (zones.zones || zones).find((z) => z.id === 'B-5');
  for (const [dx, dz] of pm.spots) {
    const x = pm.x + dx, z = pm.z + dz;
    for (const [cx, cz] of [[-1.3, -1], [1.3, -1], [1.3, 1], [-1.3, 1]]) assert.ok(inside([x + cx, z + cz], plaza), `mat at ${x},${z} on the plaza`);
    assert.ok(Math.hypot(x + ox - zone.at[0], z + oz - zone.at[1]) > 2.5, 'not on the meeting-spot sign');
    for (const s of dm.landmarks.filter((l) => l.type === 'fleastall')) assert.ok(Math.hypot(x - s.x, z - s.z) > 4, 'not under a stall');
  }
});

test('sellers go on the stalls first, then on the mats; more than both fit is left out', () => {
  const list = Array.from({ length: 25 }, (_, i) => ({ mat: i + 1 }));
  const p = layout(list, 10, 12);
  assert.equal(p.length, 22);
  assert.deepEqual(p.slice(0, 10).map((x) => x.stall), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual([p[10].m.mat, p[10].mat, p[21].mat], [11, 0, 11]);
  assert.deepEqual(layout([{ mat: 7 }], 10, 12), [{ m: { mat: 7 }, stall: 0 }], 'one seller: the first stall');
  assert.deepEqual(layout(null, 10, 12), []);
});
