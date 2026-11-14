// Modu Ballpark's big-screen moments (no THREE or DOM, so it can be
// unit-tested; game/ballpark-cams.js shows them, core/dome.js runs the wave).
//
// Once in every game, at a change of sides, the crowd does the wave; later
// the scoreboard turns into the Dance Cam, and later still the Kiss Cam.
// Like the games themselves (core/ballgame.js) the times follow from the
// game's number, so everyone in the stadium sees them at the same moment with
// no messages at all.
//
// Who is on the screen is worked out on every screen from who sits where:
// the Kiss Cam looks for two people side by side in the same row (players
// first, otherwise one of the couples among the seated NPCs), the Dance Cam
// for one. Every screen ranks the candidates by the same hash, so they pick
// the same people without a message.
//
// Messages (all prefixed 'bp:', sent on the room's channel), at most a couple
// per person per game:
//   bp:k:<id>  I kiss <id> on the cheek (asking, or saying yes)
//   bp:n:<id>  no thanks to <id>
//   bp:d       I dance on the Dance Cam
//   bp:w       I stand up for the wave
//   bp:c       I caught the foul ball
// A kiss happens only when both of the pair send bp:k to each other while the
// Kiss Cam is on. A bp:n from either, or an ask left unanswered when the Kiss
// Cam ends, leaves the one who asked looking sheepish (😅, scratching their
// head) and the crowd going "aww" (Yozi 2026-11-15).

import { GAME_LEN, OUTRO } from './ballgame.js';

export const CAMS = {
  wave: { at: 150, dur: 12 },
  dance: { at: 240, dur: 14 },
  kiss: { at: 330, dur: 16 },
};
const JITTER = 30; // s: each moment comes a little earlier or later in each game
export const WAVE_LAPS = 1.5; // times round the bowl
export const SEAT_GAP = 1.25; // m: two seats next to each other (the seats are 0.95 m apart)

// A small string hash (FNV-1a), the same everywhere.
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const cache = new Map();
// Game's moments: [{ kind, t0, dur }] in seconds from the game's start, in
// time order. Each starts at the first change of sides after its time (so it
// doesn't cut into a play's best part), and ends before the final score.
export function camsOf(game) {
  if (cache.has(game.k)) return cache.get(game.k);
  const out = [];
  const ends = game.plays.filter((p) => p.change).map((p) => p.t0 + p.dur);
  for (const [kind, c] of Object.entries(CAMS)) {
    const want = c.at + ((hashStr(kind + ':' + game.k) % 1000) / 1000 - 0.5) * JITTER;
    let t0 = ends.find((e) => e >= want) ?? want;
    t0 = Math.min(t0, GAME_LEN - OUTRO - c.dur);
    if (out.length && t0 < out.at(-1).t0 + out.at(-1).dur + 4) t0 = out.at(-1).t0 + out.at(-1).dur + 4; // (never two at once)
    out.push({ kind, t0, dur: c.dur });
  }
  cache.set(game.k, out);
  if (cache.size > 20) cache.delete(cache.keys().next().value);
  return out;
}

// The moment on now, from a core/ballgame.js gameAt() state:
// { kind, t0, dur, u (0..1 through it), left (s), k (the game) }, or null.
export function camAt(st) {
  if (!st || st.phase === 'break' || st.phase === 'intro') return null;
  for (const c of camsOf(st.game)) {
    if (st.at >= c.t0 && st.at < c.t0 + c.dur) return { ...c, u: (st.at - c.t0) / c.dur, left: c.t0 + c.dur - st.at, k: st.game.k };
  }
  return null;
}

// Where the wave is: the angle round the bowl (θ = atan2(x, z), as in
// core/dome.js), and how strong (it builds up and dies down).
export function waveAt(cam) {
  if (cam?.kind !== 'wave') return { angle: 0, strength: 0 };
  const u = cam.u;
  return { angle: -Math.PI + u * WAVE_LAPS * Math.PI * 2, strength: Math.min(1, u * 6, (1 - u) * 6) };
}
// How far the wave is from angle a (radians, 0..π).
export function waveGap(angle, a) {
  const d = (((a - angle) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return Math.abs(d);
}

// people: [{ id, x, z, row }] sitting in the stands. Pairs side by side
// (same row, next seat): [[a, b]] with a.id < b.id.
export function seatPairs(people) {
  const out = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i], b = people[j];
      if (a.row !== b.row || Math.hypot(a.x - b.x, a.z - b.z) > SEAT_GAP) continue;
      out.push(String(a.id) < String(b.id) ? [a, b] : [b, a]);
    }
  }
  return out;
}
const pairKey = ([a, b]) => a.id + '|' + b.id;

// The pair on the Kiss Cam in game k, or null.
export function pickPair(people, k) {
  let best = null, bh = Infinity;
  for (const p of seatPairs(people)) {
    const h = hashStr('kiss:' + k + ':' + pairKey(p));
    if (h < bh) { bh = h; best = p; }
  }
  return best;
}
// The one person on the Dance Cam in game k, or null.
export function pickOne(people, k) {
  let best = null, bh = Infinity;
  for (const p of people) {
    const h = hashStr('dance:' + k + ':' + p.id);
    if (h < bh) { bh = h; best = p; }
  }
  return best;
}
// An NPC couple on the Kiss Cam: kiss or finger hearts (mostly a kiss).
export const npcKisses = (k) => hashStr('npckiss:' + k) % 4 !== 0;

export const bpMsg = (kind, to) => (to ? `bp:${kind}:${to}` : `bp:${kind}`);
// { kind: 'k' | 'n' | 'd' | 'w' | 'c', to } or null.
export function parseBp(e) {
  const m = /^bp:(?:([kn]):([\w-]{1,64})|([dwc]))$/.exec(String(e));
  if (!m) return null;
  return m[3] ? { kind: m[3], to: null } : { kind: m[1], to: m[2] };
}

// One Kiss Cam: who asked whom. Each screen keeps one, fed with both its own
// presses and the messages it hears.
export class KissCam {
  constructor(k) {
    this.k = k;
    this.asks = new Set(); // 'from>to' kisses
    this.done = new Map(); // pair key → the outcome
  }
  // Someone pressed 💋 (kind 'k') or "no thanks" ('n') towards `to`. Returns
  // the outcome when that settles the pair (once per pair), else null:
  //   { what: 'kiss' }
  //   { what: 'no', shy: the one turned down, by: who said no }
  add(from, to, kind) {
    from = String(from); to = String(to);
    const key = [from, to].sort().join('|');
    if (this.done.has(key)) return null;
    if (kind === 'n') return this._end(key, { what: 'no', shy: to, by: from });
    this.asks.add(from + '>' + to);
    if (this.asks.has(to + '>' + from)) return this._end(key, { what: 'kiss' });
    return null;
  }
  // Did `from` ask `to`, and is it still open?
  asked(from, to) {
    from = String(from); to = String(to);
    return !this.done.has([from, to].sort().join('|')) && this.asks.has(from + '>' + to);
  }
  outcome(a, b) { return this.done.get([String(a), String(b)].sort().join('|')) || null; }
  // The Kiss Cam is ending: an ask nobody answered is a no.
  // Returns the outcomes settled now: [{ what: 'no', shy, by: null }].
  end() {
    const out = [];
    for (const ask of this.asks) {
      const [from, to] = ask.split('>');
      const key = [from, to].sort().join('|');
      if (this.done.has(key)) continue;
      out.push(this._end(key, { what: 'no', shy: from, by: null, other: to }));
    }
    return out;
  }
  _end(key, o) { this.done.set(key, o); return o; }
}

// ---- Clapping along with the cheer leader ----
// Each chant goes 짝짝 짝짝짝 (clap clap, clap clap clap): beats at these
// seconds after it starts. A clap within CLAP_WINDOW of a beat counts.
export const CLAP_BEATS = [0.9, 1.4, 2.4, 2.9, 3.4];
export const CLAP_WINDOW = 0.2; // s
export const CHEER_MVP = 20; // claps on the beat in one game: the cheer leader calls your name
// Which beat a clap at t (s after the chant started) hits, or -1. `hit`:
// beats already hit (each counts once).
export function clapAt(t, hit = []) {
  for (let i = 0; i < CLAP_BEATS.length; i++) if (!hit.includes(i) && Math.abs(t - CLAP_BEATS[i]) <= CLAP_WINDOW) return i;
  return -1;
}

// ---- Foul balls into the stands ----
// A few times a game a foul ball flies back into the seats people can sit
// in. Like everything else it follows from the game's number, so everyone
// sees the same ball land on the same seat; whoever is near presses 🧤 as
// it comes down.
export const FOUL_RATE = 6; // in 100 plays (about 3 a game)
export const FOUL_T = 2.4; // s in the air
export const CATCH_WINDOW = 0.55; // s before it lands: press then to catch it
export const CATCH_REACH = 2.6; // m from where it comes down
// Game's foul balls: [{ t0 (s from the game's start), seat (an index into the
// free seats, 0..seats-1), i (the play) }].
export function foulsOf(game, seats) {
  const out = [];
  if (!seats) return out;
  game.plays.forEach((p, i) => {
    const h = hashStr('foul:' + game.k + ':' + i);
    if (h % 100 >= FOUL_RATE) return;
    out.push({ t0: p.t0 + 0.2, seat: Math.floor(h / 100) % seats, i });
  });
  return out;
}
// The foul ball in the air at `at` (s from the game's start): { ...foul, u
// (0..1 through its flight), left (s) }, or null.
export function foulAt(game, seats, at) {
  for (const f of foulsOf(game, seats)) if (at >= f.t0 && at < f.t0 + FOUL_T) return { ...f, u: (at - f.t0) / FOUL_T, left: f.t0 + FOUL_T - at };
  return null;
}
