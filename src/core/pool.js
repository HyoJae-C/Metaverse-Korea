// Olympic Park Pool (올림픽공원 수영장): the indoor swimming hall's layout
// and rules, no DOM or three.js so it can be unit-tested. The hall itself
// is drawn in core/pool-hall.js; main.js wires up the swimming, the race
// and the dives.
//
// Room coordinates (metres): x across the hall, z from the back wall (-z)
// to the entrance (+z). The deck is at y 0; the water surface a little below.
//   comp:    the 50 m competition pool, 8 lanes running along x. Races start
//            from the blocks at the west end (x0) and finish at x1.
//   dive:    the diving pool, with the tower on its east side: a 1 m and a
//            3 m springboard and a 5 m platform reaching out over the water.
//   leisure: a round, warm leisure pool in the rest corner (tubes float there).
// The hall is a game set, not a copy of the real Olympic swimming pool.

export const POOL_ROOM = { w: 80, d: 44, h: 14 };
export const WATER_Y = -0.3; // the water surface, below the deck
export const SWIM_Y = WATER_Y - 0.62; // where your feet are while swimming (head and shoulders out)
export const COMP = { x0: -36, x1: 14, z0: -18, z1: 2, depth: 2, lanes: 8 };
export const LANE_W = (COMP.z1 - COMP.z0) / COMP.lanes; // 2.5 m
export const DIVE = { x0: 20, x1: 34, z0: -18, z1: -2, depth: 5 };
export const LEISURE = { x: 27, z: 12, r: 5, depth: 1.1 };
export const RACE_LEN = COMP.x1 - COMP.x0; // 50 m

// Lane centres (z), lane 1 nearest the back wall.
export const laneZ = (i) => COMP.z0 + LANE_W * (i + 0.5);
export function laneAt(z) {
  const i = Math.floor((z - COMP.z0) / LANE_W);
  return i >= 0 && i < COMP.lanes ? i : -1;
}

// Which pool (x, z) is in, or null on the deck. `pad` shrinks the pools a
// little so you step in only once you are over the edge.
export function waterAt(x, z, pad = 0.25) {
  if (x > COMP.x0 + pad && x < COMP.x1 - pad && z > COMP.z0 + pad && z < COMP.z1 - pad) return 'comp';
  if (x > DIVE.x0 + pad && x < DIVE.x1 - pad && z > DIVE.z0 + pad && z < DIVE.z1 - pad) return 'dive';
  if (Math.hypot(x - LEISURE.x, z - LEISURE.z) < LEISURE.r - pad) return 'leisure';
  return null;
}

// Diving tower: boards and the platform reach west from the tower over the
// diving pool. tip: where you stand to dive; foot: the ladder at the back.
export const BOARDS = [
  { id: 'b1', h: 1, z: -15, tip: DIVE.x1 - 3.2, kind: 'spring' },
  { id: 'b3', h: 3, z: -10, tip: DIVE.x1 - 3.6, kind: 'spring' },
  { id: 'p5', h: 5, z: -5.5, tip: DIVE.x1 - 2.6, kind: 'platform' },
].map((b) => ({ ...b, foot: [DIVE.x1 + 4.4, b.z] }));
export const boardById = (id) => BOARDS.find((b) => b.id === id) || null;

// ---- the 50 m race ---------------------------------------------------------
// Tap in a steady rhythm: each stroke pushes you on, water slows you down.
// Tapping too fast just splashes (weak strokes), too slow lets you drift.
export const COUNTDOWN = 3; // seconds on the block before "Go!"
export const DRAG = 0.9; // speed lost per second, per m/s
export const STROKE = 1.0; // m/s a good stroke adds
export const VMAX = 3.4;
export const START_V = 2.2; // the push off the block
export const GOOD = [0.32, 0.7]; // seconds between taps for a full stroke
export const DAILY_PAID = 3; // races a day that pay coins
export const PAY = { win: 3, finish: 1 };

// How much of a stroke you get for tapping `gap` seconds after the last one.
export function strokeQuality(gap) {
  if (!Number.isFinite(gap)) return 1; // the first stroke
  if (gap < 0.12) return 0; // (a double tap)
  if (gap < GOOD[0]) return 0.3; // splashing
  if (gap <= GOOD[1]) return 1;
  return 0.8; // a bit slow, still a fine stroke
}

// Three rivals in the lanes next to yours, each with a pace (seconds for the
// 50 m) picked from rand. They swim a little faster in the middle and slow
// down near the end, like real swimmers.
export const RIVAL_PACES = [17.5, 19.5, 22];
export function rivalPaces(rand = Math.random) {
  return RIVAL_PACES.map((p) => Math.round((p + (rand() - 0.5) * 2) * 10) / 10);
}
export function rivalAt(pace, t) {
  if (t <= 0) return 0;
  const u = Math.min(1, t / pace);
  return RACE_LEN * (u + 0.06 * Math.sin(u * Math.PI)); // ends exactly at 50 m when t = pace
}
// The lanes the rivals swim in, around yours.
export function rivalLanes(mine) {
  const order = [mine - 1, mine + 1, mine - 2, mine + 2, mine - 3, mine + 3, mine + 4, mine - 4];
  return order.filter((i) => i >= 0 && i < COMP.lanes).slice(0, RIVAL_PACES.length);
}

// ---- racing friends ----------------------------------------------------------
// Anyone on a starting block can open a race while other players are in the
// hall: for LOBBY seconds the others can step on a block and join, then the
// countdown starts for everyone at once. A race with friends has no rival
// swimmers; each racer reports their time and everyone ranks the same list.
// Messages go out like emotes (main.js): open (with the seconds left before
// the countdown, so late joiners line up), join, fin (the time), quit.
export const LOBBY = 10; // seconds to join before the countdown
export const FRIEND_WAIT = 25; // seconds the board waits for slower friends
const RID = /^[a-z0-9]{1,10}$/;
export function raceMsg(verb, rid, a = '') {
  if (verb === 'open') return `prace:open:${rid}:${a.lane}:${Math.max(0, Math.round(a.left * 10))}`;
  if (verb === 'join') return `prace:join:${rid}:${a}`;
  if (verb === 'fin') return `prace:fin:${rid}:${Math.round(a * 100)}`;
  return `prace:quit:${rid}`;
}
export function parseRaceMsg(e) {
  if (typeof e !== 'string' || !e.startsWith('prace:')) return null;
  const [, verb, rid, a, b] = e.split(':');
  if (!RID.test(rid || '')) return null;
  const lane = Number(a);
  const okLane = Number.isInteger(lane) && lane >= 0 && lane < COMP.lanes;
  if (verb === 'open' && okLane && /^\d{1,4}$/.test(b || '')) return { verb, rid, lane, left: Math.min(LOBBY, Number(b) / 10) };
  if (verb === 'join' && okLane) return { verb, rid, lane };
  if (verb === 'fin' && /^\d{1,6}$/.test(a || '')) { const time = Number(a) / 100; return time >= 5 ? { verb, rid, time } : null; }
  if (verb === 'quit') return { verb, rid };
  return null;
}
// The lane to swim in: the one you stand at, or the nearest free one.
export function pickLane(want, taken) {
  for (let k = 0; k < COMP.lanes; k++) {
    for (const ln of k ? [want - k, want + k] : [want]) if (ln >= 0 && ln < COMP.lanes && !taken.has(ln)) return ln;
  }
  return -1;
}
// Places from everyone's times (null: not in yet), fastest first.
export function rankTimes(rows) {
  const done = rows.filter((r) => r.time != null).sort((a, b) => a.time - b.time);
  return [...done.map((r, i) => ({ ...r, place: i + 1 })), ...rows.filter((r) => r.time == null).map((r) => ({ ...r, place: null }))];
}

export class Race {
  constructor(lane, paces) {
    this.lane = lane;
    this.paces = paces;
    this.t = -COUNTDOWN; // < 0: counting down on the block
    this.x = 0; // metres swum
    this.v = 0;
    this.lastTap = -Infinity;
    this.done = null; // { time, place }
  }
  get started() { return this.t >= 0; }
  // at: when the tap happened, in seconds (main.js passes the real clock, so
  // a slow frame rate doesn't make a steady rhythm look too fast).
  tap(at = this.t) {
    if (!this.started || this.done) return 0;
    const q = strokeQuality(at - this.lastTap);
    this.lastTap = at;
    this.v = Math.min(VMAX, this.v + STROKE * q);
    return q;
  }
  // dt seconds on; returns events: 'go', 'finish'.
  step(dt) {
    const ev = [];
    if (this.done) return ev;
    const was = this.t;
    this.t += dt;
    if (was < 0 && this.t >= 0) { this.v = START_V; ev.push('go'); }
    if (!this.started) return ev;
    this.v = Math.max(0.35, this.v - this.v * DRAG * dt); // a slow drift even without strokes
    this.x += this.v * dt;
    if (this.x >= RACE_LEN) {
      // Back up to the moment we touched the wall.
      const over = (this.x - RACE_LEN) / this.v;
      const time = Math.round((this.t - over) * 100) / 100;
      this.x = RACE_LEN;
      this.done = { time, place: 1 + this.paces.filter((p) => p < time).length };
      ev.push('finish');
    }
    return ev;
  }
  rivals() { return this.paces.map((p) => Math.min(RACE_LEN, rivalAt(p, this.t))); }
}

// ---- dives -------------------------------------------------------------------
// Jump off, tap to somersault while you fall; a clean entry is hands first
// with no flip half done. Points grow with the height and the flips.
export const G = 9.8;
export const JUMP_V = 3.2; // up off the board
export const FLIP_TIME = 0.42; // seconds per somersault
export const ENTRY_TOL = 0.22; // how far off upright (in turns) still counts as clean

// Time in the air from height h to the water.
export function airTime(h) {
  const drop = h - WATER_Y;
  return (JUMP_V + Math.sqrt(JUMP_V * JUMP_V + 2 * G * drop)) / G;
}
export const diveHeight = (h, t) => h + JUMP_V * t - 0.5 * G * t * t;
// How many somersaults fit from this height (each tap queues one).
export const maxFlips = (h) => Math.max(0, Math.floor((airTime(h) - 0.15) / FLIP_TIME));

// flips: somersaults done (a fraction if one was still turning at the entry).
export function scoreDive(h, flips) {
  const whole = Math.floor(flips + 1e-6), part = flips - whole;
  const clean = part < ENTRY_TOL || part > 1 - ENTRY_TOL;
  const done = part > 1 - ENTRY_TOL ? whole + 1 : whole;
  if (!clean) return { clean: false, flips: done, points: Math.round(2 * h) }; // belly flop
  const points = Math.round((10 + 15 * done * done + 6 * done) * (0.6 + h * 0.2));
  return { clean: true, flips: done, points };
}

// Best dive and race records, and paid races today. Saved on this device.
const today = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const KEY = 'mk.pool';
export class PoolLog {
  constructor(storage = globalThis.localStorage, now = () => new Date()) {
    this.storage = storage;
    this.now = now;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* broken save */ }
    const num = (v) => (Number.isFinite(v) && v > 0 ? v : null);
    this.s = { day: raw.day === today(now()) ? raw.day : today(now()), paid: raw.day === today(now()) ? raw.paid | 0 : 0, bestRace: num(raw.bestRace), todayRace: raw.day === today(now()) ? num(raw.todayRace) : null, bestDive: num(raw.bestDive) };
  }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ } }
  _roll() { const d = today(this.now()); if (this.s.day !== d) this.s = { ...this.s, day: d, paid: 0, todayRace: null }; }
  get paidLeft() { this._roll(); return Math.max(0, DAILY_PAID - this.s.paid); }
  // A finished race: coins to pay, and whether it was a new best.
  finishRace(time, place) {
    this._roll();
    const best = !this.s.bestRace || time < this.s.bestRace;
    if (best) this.s.bestRace = time;
    if (!this.s.todayRace || time < this.s.todayRace) this.s.todayRace = time;
    let coins = 0;
    if (this.s.paid < DAILY_PAID) { this.s.paid++; coins = place === 1 ? PAY.win : PAY.finish; }
    this._save();
    return { coins, best };
  }
  finishDive(points) {
    const best = points > (this.s.bestDive || 0);
    if (best) { this.s.bestDive = points; this._save(); }
    return { best };
  }
}
