// Sharing a taxi (no DOM, unit-tested): the person who calls it (the host)
// asks the people standing close by; up to SHARE_MAX ride together to the
// host's pick and split the fare (dutch pay, rounded up to ₩100 each).
//
// Messages ride on the emote channel as
//   'taxi:<verb>:<to id>:<trip>[:<a>[:<b>[:<c>]]]'
//   ask   host → guest   a: fare, b, c: where to (x, z in whole metres)
//   join  guest → host   a: 1 if they can pay the biggest share, else 0
//   no    guest → host   not this time
//   bye   guest → host   changed their mind before leaving
//   go    host → guest   a: their share (0: the host treats them)
//   drop  host → guest   the ride left without them, or was called off
//   short guest → host   a: the share they couldn't pay (the host covers it)
//
// Someone short of money can still come along: the host sees it (💸) before
// leaving and treats them, or leaves them behind.

export const SHARE_MAX = 4; // people in one taxi, the host too
export const SHARE_RADIUS = 6; // metres: who is asked
export const ASK_MS = 15000; // how long the host waits for answers
export const GO_WAIT_MS = 30000; // how long a guest who said yes waits to leave

// Each rider's share of a fare, rounded up to ₩100.
export const shareOf = (fare, riders) => Math.ceil(fare / Math.max(1, riders) / 100) * 100;
// The biggest share a guest can be asked for (two in the taxi).
export const worstShare = (fare) => shareOf(fare, 2);

const VERBS = ['ask', 'join', 'no', 'bye', 'go', 'drop', 'short'];
export function parseTaxi(e) {
  const m = /^taxi:(ask|join|no|bye|go|drop|short):([\w-]{1,64}):([a-z0-9]{1,12})(?::(-?\d{1,9}))?(?::(-?\d{1,9}))?(?::(-?\d{1,9}))?$/.exec(String(e));
  if (!m || !VERBS.includes(m[1])) return null;
  const n = (v) => (v == null ? null : Number(v));
  return { verb: m[1], to: m[2], trip: m[3], a: n(m[4]), b: n(m[5]), c: n(m[6]) };
}
export const taxiMsg = (verb, to, trip, ...nums) => ['taxi', verb, to, trip, ...nums.filter((x) => x != null).map((x) => Math.round(x))].join(':');
export const newTrip = (rand = Math.random) => Math.floor(rand() * 36 ** 8).toString(36);

// The host's side of one shared ride.
export class TaxiHost {
  // asked: [{ id, name }] the people asked; fare: the whole fare.
  constructor(trip, fare, asked) {
    this.trip = trip;
    this.fare = fare;
    this.asked = new Map(asked.slice(0, SHARE_MAX - 1).map((p) => [p.id, p.name]));
    this.riders = new Map(); // id → { name, canPay }
    this.declined = new Set();
  }
  // A guest's answer; returns true when it changed who rides.
  heard(id, m) {
    if (m.trip !== this.trip || !this.asked.has(id)) return false;
    if (m.verb === 'join') {
      if (this.riders.size >= SHARE_MAX - 1) return false;
      this.riders.set(id, { name: this.asked.get(id), canPay: m.a === 1 });
      this.declined.delete(id);
      return true;
    }
    if (m.verb === 'no' || m.verb === 'bye') {
      this.declined.add(id);
      return this.riders.delete(id) || m.verb === 'no';
    }
    return false;
  }
  leaveBehind(id) { return this.riders.delete(id); }
  // Everyone has answered (or the taxi is full).
  get settled() { return this.riders.size >= SHARE_MAX - 1 || [...this.asked.keys()].every((id) => this.riders.has(id) || this.declined.has(id)); }
  get count() { return 1 + this.riders.size; }
  get each() { return shareOf(this.fare, this.count); }
  // Leaving: what the host pays and what each guest is asked for. Guests who
  // can't pay are treated by the host.
  plan() {
    const each = this.each;
    const guests = [...this.riders].map(([id, r]) => ({ id, name: r.name, pays: r.canPay ? each : 0 }));
    const treats = guests.filter((g) => !g.pays).length;
    return { each, host: each * (1 + treats), guests };
  }
}
