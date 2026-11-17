import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HOME_LEVELS, OLD_HOME_LEVEL, fitsHome, homeRoom, nextHomeLevel, readHomeLevel, writeHomeLevel } from '../src/core/home-stages.js';
import { growLayout } from '../src/core/home-grow.js';
import { LocalHomeTill } from '../src/core/home-level-till.js';
import { furnitureById, pieceBlocked, starterLayout } from '../src/core/furniture.js';
import { ROOM_SIZES, roomOf } from '../src/core/interior.js';

const mem = (o = {}) => {
  const m = new Map(Object.entries(o));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
const inside = (items, room) => items.every((i) => {
  const [w, d] = furnitureById(i.id).size, c = Math.abs(Math.cos(i.ry)), n = Math.abs(Math.sin(i.ry));
  const hx = (w * c + d * n) / 2, hz = (w * n + d * c) / 2;
  return Math.abs(i.x) + hx <= room.w / 2 + 0.01 && Math.abs(i.z) + hz <= room.d / 2 + 0.01;
});

test('levels: 9×8 (the old villa), 14×11 (the home from before), then bigger', () => {
  assert.deepEqual(HOME_LEVELS.map((l) => [l.w, l.d]), [[9, 8], [14, 11], [18, 13], [22, 15]]);
  assert.deepEqual(homeRoom(1), { ...ROOM_SIZES.small });
  assert.deepEqual(homeRoom(OLD_HOME_LEVEL), { ...ROOM_SIZES.medium });
  assert.ok(HOME_LEVELS.every((l, k) => !k || l.price > HOME_LEVELS[k - 1].price));
  assert.equal(nextHomeLevel(4), null);
  assert.equal(nextHomeLevel(1).level, 2);
  assert.deepEqual(roomOf({ size: 'medium', roomDims: homeRoom(3) }), homeRoom(3));
});

test('a new player starts at level 1; a home decorated before levels is level 2', () => {
  assert.equal(readHomeLevel(mem()), 1);
  assert.equal(readHomeLevel(mem({ 'mk.home.forest-lane-apt': '[]' })), 2);
  assert.equal(readHomeLevel(mem({ 'mk.home.sunny-villa': '[]' })), 2);
  const s = mem({ 'mk.home.forest-lane-apt': '[]' });
  writeHomeLevel(3, s);
  assert.equal(readHomeLevel(s), 3);
  writeHomeLevel(99, s);
  assert.equal(readHomeLevel(s), 4);
});

test('a big tank needs its level', () => {
  assert.ok(fitsHome(furnitureById('sofa'), 1));
  assert.ok(!fitsHome({ needsHomeLevel: 3 }, 2));
  assert.ok(fitsHome({ needsHomeLevel: 3 }, 3));
});

test('the starter layout fits the smallest home', () => {
  const s = starterLayout(9, 8);
  assert.ok(inside(s, homeRoom(1)));
  assert.ok(!s.some((i) => pieceBlocked(i, s)));
});

test('growing keeps the furniture inside, clear and by its walls', () => {
  for (let a = 1; a < HOME_LEVELS.length; a++) {
    const from = homeRoom(a), to = homeRoom(a + 1);
    const s = starterLayout(from.w, from.d);
    const g = growLayout(s, from, to);
    assert.equal(g.length, s.length);
    assert.ok(inside(g, to), `level ${a} → ${a + 1}`);
    assert.ok(!g.some((i) => pieceBlocked(i, g)), `level ${a} → ${a + 1}: overlap`);
    const by = (id) => g.find((i) => i.id === id);
    // The bed stays in the back-left corner, the TV against the back wall.
    assert.ok(Math.abs(by('bed').x - (s.find((i) => i.id === 'bed').x - (to.w - from.w) / 2)) < 1e-9);
    assert.ok(Math.abs(by('tv').z - (s.find((i) => i.id === 'tv').z - (to.d - from.d) / 2)) < 1e-9);
    assert.equal(by('sofa').x, 0); // (the middle stays together)
  }
});

test('growing: a lamp on a table goes with the table', () => {
  const items = [{ id: 'table', x: 5.5, z: 0, ry: 0 }, { id: 'lamp-moon', x: 5.5, z: 0, ry: 0, y: 0.65 }];
  const g = growLayout(items, homeRoom(2), homeRoom(3));
  assert.equal(g[0].x, 5.5 + 2); // (by the right wall: out with it)
  assert.equal(g[1].x, g[0].x);
});

test('the local till: one level at a time, paid once a request', async () => {
  let coins = 4_000_000;
  const wallet = { spend: (n) => (n <= coins ? ((coins -= n), true) : false) };
  const s = mem();
  const till = new LocalHomeTill(wallet, s);
  assert.equal((await till.info()).level, 1);
  assert.deepEqual(await till.buy({ requestId: 'a', level: 3, price: HOME_LEVELS[2].price }), { error: 'level', level: 1 });
  assert.equal((await till.buy({ requestId: 'a', level: 2, price: 5 })).error, 'price');
  assert.deepEqual(await till.buy({ requestId: 'a', level: 2, price: HOME_LEVELS[1].price }), { charged: true, level: 2 });
  writeHomeLevel(2, s);
  assert.equal((await till.buy({ requestId: 'a', level: 2, price: HOME_LEVELS[1].price })).charged, false);
  assert.equal(coins, 4_000_000 - HOME_LEVELS[1].price);
  assert.equal((await till.buy({ requestId: 'b', level: 3, price: HOME_LEVELS[2].price })).charged, true);
  writeHomeLevel(3, s);
  assert.equal((await till.buy({ requestId: 'c', level: 4, price: HOME_LEVELS[3].price })).error, 'coins');
});

test('the server keeps the same prices and gives old accounts level 2', () => {
  const sql = readFileSync(new URL('../supabase/053_home_levels.sql', import.meta.url), 'utf8');
  for (const l of HOME_LEVELS.filter((x) => x.price)) assert.match(sql, new RegExp(`\\(${l.level}, ${l.price}\\)`));
  assert.match(sql, /u\.created_at < s\.at\) then 2/);
  assert.match(sql, /returns table \(net_id text, name text, friend boolean, level int\)/);
  assert.match(sql, /'home:' \|\| p_level/);
});
