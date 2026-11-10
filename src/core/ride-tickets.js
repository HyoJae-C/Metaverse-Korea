// Another Land's ride tickets (이용권), next to the ride-all day pass
// (자유이용권, DayPasses key 'rides'): a few rides paid up front, sold by
// the ticket guide at the island's gate and at the ticket booth below
// (game/park-tickets.js). Each is good for 24 hours from buying (PASS_MS),
// saved on this device like the day passes. At a ride's gate payRide (main.js) uses the pass
// first, then the narrowest ticket that fits, then coins.
//
//   any5:  any 5 rides, the same one again if you like
//   diff5: 5 rides, each a different one
//   big3:  the Big 3 (BIG3), once each
//
// Ride kinds are RIDE_PRICE's keys plus 'bumper' (the bumper cars).

import { PASS_MS } from './day-pass.js';

// The Big 3: the park's three dearest rides (RIDE_PRICE 7,000 / 5,000 / 5,000).
export const BIG3 = ['coaster', 'flume', 'gyro'];
// won; the ride-all pass is RIDE_PASS (20,000) in park-rides.js
export const TICKETS = {
  any5: { price: 16000, rides: 5 },
  diff5: { price: 14000, rides: 5, different: true },
  big3: { price: 12000, rides: BIG3.length, only: BIG3, different: true },
};
// When more than one ticket would do, the one with the fewest rides it fits uses up first.
const ORDER = ['big3', 'diff5', 'any5'];

const KEY = 'mk.ridetix';
const today = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export class RideTickets {
  // pass(): the ride-all pass is held now (DayPasses.has('rides')).
  constructor({ pass = () => false, storage = globalThis.localStorage, now = () => new Date() } = {}) {
    this.pass = pass;
    this.storage = storage;
    this.now = now;
    try { this.s = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { this.s = {}; }
  }
  // A live ticket of this kind ({ until, used: [kinds ridden] }), or null.
  // (one saved with a day, before 2026-11-11, lasts that day)
  held(id) {
    const h = this.s[id];
    const live = h && (h.until ? this.now().getTime() < h.until : h.day === today(this.now()));
    return live && h.used.length < TICKETS[id].rides ? h : null;
  }
  left(id) { const h = this.held(id); return h ? TICKETS[id].rides - h.used.length : 0; }
  // Which ticket a ride of this kind would use (null: none fits).
  fits(id, kind) {
    const h = this.held(id), tk = TICKETS[id];
    return !!h && (!tk.only || tk.only.includes(kind)) && (!tk.different || !h.used.includes(kind));
  }
  ticketFor(kind) { return ORDER.find((id) => this.fits(id, kind)) || null; }
  // Free now for this ride (the pass or a ticket that fits), without using anything.
  covers(kind) { return this.pass() || !!this.ticketFor(kind); }
  // Pay for one ride with the pass or a ticket: 'pass', the ticket's id, or
  // null (pay coins). A ticket's ride is used up here.
  use(kind) {
    if (this.pass()) return 'pass';
    const id = this.ticketFor(kind);
    if (!id) return null;
    this.s[id].used.push(kind);
    this.save();
    return id;
  }
  // Buy one through wallet.spend: 'ok', 'held' (one with rides left is
  // already held, or the pass, which covers it all), or 'short'.
  buy(id, wallet, note) {
    if (this.pass() || this.held(id)) return 'held';
    if (!wallet.spend(TICKETS[id].price, note)) return 'short';
    this.s[id] = { until: this.now().getTime() + PASS_MS, used: [] };
    this.save();
    return 'ok';
  }
  save() { try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ } }
}
