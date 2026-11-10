import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RideTickets, TICKETS, BIG3 } from '../src/core/ride-tickets.js';
import { RIDE_PRICE, RIDE_PASS } from '../src/core/park-rides.js';
import { BUMPER_COST } from '../src/core/bumper-cars.js';
import { STRINGS } from '../src/i18n/strings.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const purse = (coins) => ({ coins, spend(n) { if (n > this.coins) return false; this.coins -= n; return true; } });

test('any 5: five rides, the same one again is fine, then coins', () => {
  const tk = new RideTickets({ storage: memory(), now: () => new Date(2026, 10, 10, 12) });
  const w = purse(50000);
  assert.equal(tk.use('coaster'), null, 'no ticket: pay at the gate');
  assert.equal(tk.buy('any5', w), 'ok');
  assert.equal(w.coins, 50000 - TICKETS.any5.price);
  assert.equal(tk.buy('any5', w), 'held', 'one at a time while rides are left');
  for (let i = 0; i < 5; i++) assert.equal(tk.use('coaster'), 'any5');
  assert.equal(tk.covers('coaster'), false);
  assert.equal(tk.use('coaster'), null);
  assert.equal(tk.buy('any5', w), 'ok', 'used up: buy another');
});

test('5 different: each ride once; Big 3: only the Big 3, once each, used first', () => {
  const st = memory();
  const tk = new RideTickets({ storage: st, now: () => new Date(2026, 10, 10, 12) });
  const w = purse(100000);
  tk.buy('diff5', w);
  assert.equal(tk.use('wheel'), 'diff5');
  assert.equal(tk.covers('wheel'), false, 'not the same ride twice');
  assert.equal(tk.use('bumper'), 'diff5', 'the bumper cars count');
  tk.buy('big3', w);
  assert.equal(tk.use('coaster'), 'big3', 'the narrowest ticket that fits goes first');
  assert.equal(tk.use('coaster'), 'diff5', 'then the next one that fits');
  assert.equal(tk.use('carousel'), 'diff5');
  assert.equal(tk.covers('carousel'), false);
  assert.equal(tk.ticketFor('flume'), 'big3');
  assert.equal(new RideTickets({ storage: st, now: () => new Date(2026, 10, 10, 20) }).left('big3'), 2, 'kept on this device');
});

test('tickets last 24 hours from buying, and the ride-all pass makes them pointless', () => {
  let day = new Date(2026, 10, 10, 23, 50), pass = false;
  const tk = new RideTickets({ storage: memory(), now: () => day, pass: () => pass });
  const w = purse(30000);
  tk.buy('big3', w);
  day = new Date(2026, 10, 11, 23, 40);
  assert.equal(tk.left('big3'), 3, 'still good past midnight, within 24 hours');
  day = new Date(2026, 10, 11, 23, 51);
  assert.equal(tk.left('big3'), 0, 'gone 24 hours after buying');
  assert.equal(tk.buy('any5', purse(100)), 'short');
  pass = true;
  assert.equal(tk.use('gyro'), 'pass');
  assert.equal(tk.buy('any5', w), 'held');
});

test('every ticket is a deal against its rides and cheaper than the ride-all pass', () => {
  const price = (k) => (k === 'bumper' ? BUMPER_COST : RIDE_PRICE[k]);
  const dear = [...Object.keys(RIDE_PRICE), 'bumper'].map(price).sort((a, b) => b - a);
  assert.ok(BIG3.every((k) => RIDE_PRICE[k] >= dear[2]), 'the Big 3 are the three dearest');
  assert.ok(TICKETS.big3.price < BIG3.reduce((s, k) => s + price(k), 0));
  assert.ok(TICKETS.big3.price < TICKETS.diff5.price && TICKETS.diff5.price < TICKETS.any5.price && TICKETS.any5.price < RIDE_PASS);
});

test('the ticket guide speaks every language', () => {
  const keys = Object.keys(STRINGS.en).filter((k) => k.startsWith('tix.'));
  assert.equal(keys.length, 15);
  for (const code of ['ko', 'ja', 'zh', 'es']) for (const k of keys) assert.ok(STRINGS[code][k], `${code} ${k}`);
});

test('a ticket or pass saved as a day before the change still lasts that day', () => {
  const st = memory();
  st.setItem('mk.ridetix', JSON.stringify({ any5: { day: '2026-11-10', used: ['wheel'] } }));
  const tk = new RideTickets({ storage: st, now: () => new Date(2026, 10, 10, 20) });
  assert.equal(tk.left('any5'), 4);
  assert.equal(new RideTickets({ storage: st, now: () => new Date(2026, 10, 11, 1) }).left('any5'), 0);
});
