import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LocalTempleLanterns, TEMPLE_LANTERN, SLOTS, freeSlot, daysLeft } from '../src/core/temple-lanterns.js';
import { WISHES, WISH_COLORS } from '../src/core/lanterns.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const purse = (coins) => ({ coins, spend(n) { if (this.coins < n) return false; this.coins -= n; return true; } });
const NOW = Date.UTC(2026, 10, 12, 4);
const ask = (o = {}) => ({ requestId: 'r' + Math.random(), color: 2, wish: 1, name: 'Yozi', price: TEMPLE_LANTERN.price, ...o });

test('the server\'s numbers match the game\'s', () => {
  const sql = readFileSync(new URL('../supabase/041_temple_lanterns.sql', import.meta.url), 'utf8');
  assert.equal(SLOTS, 400);
  assert.match(sql, new RegExp(`slots int not null default ${SLOTS} `));
  assert.match(sql, new RegExp(`price int not null default ${TEMPLE_LANTERN.price} `));
  assert.match(sql, new RegExp(`days int not null default ${TEMPLE_LANTERN.days} `));
  assert.match(sql, new RegExp(`color smallint not null check \\(color between 0 and ${WISH_COLORS.length - 1}\\)`));
  assert.match(sql, new RegExp(`wish smallint not null check \\(wish between 0 and ${WISHES.length - 1}\\)`));
  assert.match(sql, /insert into public\.coin_ledger[\s\S]*'lantern'/, 'a receipt for every lantern');
});

test('pay once, hang in the lowest free spot, for 3 days', async () => {
  const w = purse(12000), s = new LocalTempleLanterns(w, memory());
  const a = await s.hang(ask({ requestId: 'a' }), null, NOW);
  assert.equal(a.charged, true);
  assert.equal(a.lantern.slot, 0);
  assert.equal(w.coins, 7000);
  assert.equal(daysLeft(a.lantern, NOW), 3, 'three days (Yozi)');
  const again = await s.hang(ask({ requestId: 'a' }), null, NOW + 1000);
  assert.equal(again.charged, false, 'a double tap hangs one and charges once');
  assert.equal(w.coins, 7000);
  const b = await s.hang(ask({ requestId: 'b', color: 5, wish: 7 }), null, NOW);
  assert.equal(b.lantern.slot, 1);
  assert.equal((await s.hang(ask({ requestId: 'c' }), null, NOW)).error, 'coins');
  assert.equal((await s.active(NOW)).rows.length, 2);
  assert.equal((await s.active(NOW + 4 * 86400e3)).rows.length, 0, 'gone after its days');
});

test('bad colours, wishes and prices are refused, and three a day', async () => {
  const w = purse(1e6), s = new LocalTempleLanterns(w, memory());
  assert.equal((await s.hang(ask({ color: 7 }), null, NOW)).error, 'color');
  assert.equal((await s.hang(ask({ wish: -1 }), null, NOW)).error, 'wish');
  assert.equal((await s.hang(ask({ price: 1 }), null, NOW)).error, 'price');
  for (let i = 0; i < TEMPLE_LANTERN.dailyLimit; i++) assert.ok((await s.hang(ask(), null, NOW)).lantern);
  assert.equal((await s.hang(ask(), null, NOW)).error, 'limit');
  assert.ok((await s.hang(ask(), null, NOW + 86400e3)).lantern, 'the next day');
  assert.equal(w.coins, 1e6 - 4 * TEMPLE_LANTERN.price);
});

test('a spot comes free when its lantern has hung its days; a full canopy says so', () => {
  const rows = [{ slot: 0, expires_at: new Date(NOW - 1).toISOString() }, { slot: 1, expires_at: new Date(NOW + 1e6).toISOString() }];
  assert.equal(freeSlot(rows, NOW), 0);
  const full = Array.from({ length: 3 }, (_, slot) => ({ slot, expires_at: new Date(NOW + 1e6).toISOString() }));
  assert.equal(freeSlot(full, NOW, 3), -1);
});
