// Yutnori (윷놀이) rules, no DOM (ui/yut-ui.js draws it).
//
// Four sticks are thrown; the number of flat sides up says how far to move:
// 도 1 (pig), 개 2 (dog), 걸 3 (sheep), 윷 4 (cow), 모 5 (horse; all round
// sides up). One stick is marked on its flat side: if it is the only flat
// one, it is 빽도 (back-do), one step back. 윷 and 모 earn another throw, and
// so does catching someone. All throws of a turn are saved first, then used
// one by one, in any order, on any of your pieces.
//
// The board (말판) has 29 spots: 20 round the edge and two diagonals that
// cross in the centre (방). A piece that stops on a corner or on the centre
// takes the short cut next time. Land on your own piece and they travel
// together (업기); land on someone else's and they go back home (잡기).
// A piece is out when it moves past the start spot (참먹이); the first
// player with every piece out wins.
//
// Spots: 0 is the start corner (bottom right), 1-19 run up the right side,
// left along the top, down the left side and back along the bottom.
// 20, 21 lead from the top-right corner (5) to the centre (22); 23, 24 go on
// to the bottom-left corner (15). 25, 26 lead from the top-left corner (10)
// to the centre; 27, 28 go on to the start (0).

export const HOME = -1;
export const OUT = 99;
export const CENTER = 22;
export const SPOTS = 29;
export const FLAT_CHANCE = 0.6; // a real stick lands flat side up a bit more often

export const THROWS = ['backdo', 'do', 'gae', 'geol', 'yut', 'mo'];
export const STEPS = { backdo: -1, do: 1, gae: 2, geol: 3, yut: 4, mo: 5 };
// Korean name, romanization, the animal it stands for.
export const THROW_KO = {
  backdo: ['빽도', 'ppaek-do', null],
  do: ['도', 'do', '🐷'],
  gae: ['개', 'gae', '🐶'],
  geol: ['걸', 'geol', '🐑'],
  yut: ['윷', 'yut', '🐮'],
  mo: ['모', 'mo', '🐴'],
};
export const bonusThrow = (kind) => kind === 'yut' || kind === 'mo';

// Throw the four sticks: [flat?] per stick (stick 0 carries the back-do
// mark) and what that counts as.
export function throwSticks(rand = Math.random) {
  const sticks = [0, 1, 2, 3].map(() => rand() < FLAT_CHANCE);
  return { sticks, kind: sticksKind(sticks) };
}
export function sticksKind(sticks) {
  const n = sticks.filter(Boolean).length;
  if (n === 0) return 'mo';
  if (n === 1) return sticks[0] ? 'backdo' : 'do';
  return ['', '', 'gae', 'geol', 'yut'][n];
}
// Chance of each result with these sticks (for the AI and the how-to).
export function throwOdds(p = FLAT_CHANCE) {
  const q = 1 - p;
  return { backdo: p * q ** 3, do: 3 * p * q ** 3, gae: 6 * p * p * q * q, geol: 4 * p ** 3 * q, yut: p ** 4, mo: q ** 4 };
}

// Where each spot is drawn, in a 0..1 square (x right, y down).
export const SPOT_XY = (() => {
  const xy = [];
  for (let i = 0; i < 20; i++) {
    const side = Math.floor(i / 5), k = (i % 5) / 5;
    xy.push(side === 0 ? [1, 1 - k] : side === 1 ? [1 - k, 0] : side === 2 ? [0, k] : [k, 1]);
  }
  const along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (const t of [1 / 3, 2 / 3]) xy[20 + (t > 0.5 ? 1 : 0)] = along([1, 0], [0.5, 0.5], t);
  xy[22] = [0.5, 0.5];
  for (const t of [1 / 3, 2 / 3]) xy[23 + (t > 0.5 ? 1 : 0)] = along([0.5, 0.5], [0, 1], t);
  for (const t of [1 / 3, 2 / 3]) xy[25 + (t > 0.5 ? 1 : 0)] = along([0, 0], [0.5, 0.5], t);
  for (const t of [1 / 3, 2 / 3]) xy[27 + (t > 0.5 ? 1 : 0)] = along([0.5, 0.5], [1, 1], t);
  return xy;
})();
export const isBig = (s) => s === 0 || s === 5 || s === 10 || s === 15 || s === CENTER;

// One step forward from spot `at`, having come from `prev` (only matters on
// the centre, where you keep going straight).
export function nextSpot(at, prev) {
  if (at === HOME) return 1;
  if (at === 0) return OUT;
  if (at === 19) return 0;
  if (at < 19) return at + 1;
  if (at === CENTER) return prev === 21 ? 23 : 27;
  if (at === 24) return 15;
  if (at === 28) return 0;
  if (at === 26) return CENTER;
  return at + 1; // 20→21→22, 23→24, 25→26, 27→28
}
// The first step of a move: from a corner or the centre, take the short cut.
function firstStep(at, prev) {
  if (at === 5) return 20;
  if (at === 10) return 25;
  if (at === CENTER) return 27;
  return nextSpot(at, prev);
}

// Walk n steps forward. Returns the spots passed through (the last one is
// where the piece stops; OUT if it went past the start).
export function walk(at, prev, n) {
  const path = [];
  let cur = at, before = prev;
  for (let i = 0; i < n; i++) {
    const nx = i === 0 ? firstStep(cur, before) : nextSpot(cur, before);
    path.push(nx);
    if (nx === OUT) break;
    before = cur;
    cur = nx;
  }
  return path;
}

// Steps from a spot to OUT along the way a piece would go (start rule
// included); HOME is 21: the whole lap plus one past the start.
export function stepsToGoal(at, prev) {
  if (at === OUT) return 0;
  const p = walk(at, prev, 40);
  return p.indexOf(OUT) + 1;
}

const clone = (o) => JSON.parse(JSON.stringify(o));

export class YutGame {
  // players: how many (2-4); pieces: per player (2-4).
  constructor({ players = 2, pieces = 4 } = {}) {
    this.players = Array.from({ length: players }, () => ({ pieces: Array.from({ length: pieces }, () => ({ at: HOME, trail: [] })) }));
    this.turn = 0;
    this.pending = []; // throws saved this turn, not used yet
    this.phase = 'throw'; // throw | move | over
    this.winner = null;
    this.last = null; // what just happened, for the UI: { type, ... }
  }

  snapshot() { return clone({ players: this.players, turn: this.turn, pending: this.pending, phase: this.phase, winner: this.winner }); }
  static restore(s) { return Object.assign(new YutGame({ players: s.players.length }), clone(s)); }

  get current() { return this.players[this.turn]; }
  piecesOut(p) { return this.players[p].pieces.filter((x) => x.at === OUT).length; }
  // Own pieces standing on a spot (they move together).
  stackAt(p, at) { return this.players[p].pieces.filter((x) => x.at === at); }

  // The things the current player can move: each board spot they stand on,
  // plus one piece from home if any is left.
  units(p = this.turn) {
    const seen = new Set(), out = [];
    for (const x of this.players[p].pieces) {
      if (x.at === OUT || seen.has(x.at)) continue;
      seen.add(x.at);
      out.push(x.at);
    }
    return out;
  }

  // Where unit `from` ends up with a throw, or null if it can't use it.
  destination(from, kind, p = this.turn) {
    const lead = this.players[p].pieces.find((x) => x.at === from);
    if (!lead) return null;
    if (kind === 'backdo') {
      if (from === HOME || lead.trail.length < 2) return null;
      return { dest: lead.trail[lead.trail.length - 2], path: [lead.trail[lead.trail.length - 2]] };
    }
    const prev = lead.trail.length > 1 ? lead.trail[lead.trail.length - 2] : null;
    const path = walk(from, prev, STEPS[kind]);
    return { dest: path[path.length - 1], path };
  }

  // Every legal move now: [{ i (index in pending), kind, from, dest, path,
  // catches (pieces sent home), joins (own pieces already there), pieces
  // (how many move) }].
  options() {
    if (this.phase !== 'move') return [];
    const out = [], done = new Set();
    this.pending.forEach((kind, i) => {
      if (done.has(kind)) return; // two 개s give the same choices
      done.add(kind);
      for (const from of this.units()) {
        const d = this.destination(from, kind);
        if (!d) continue;
        const pieces = from === HOME ? 1 : this.stackAt(this.turn, from).length;
        let catches = 0, joins = 0;
        if (d.dest !== OUT) {
          this.players.forEach((pl, j) => {
            const n = pl.pieces.filter((x) => x.at === d.dest).length;
            if (j === this.turn) joins += d.dest === from ? 0 : n; else catches += n;
          });
        }
        out.push({ i, kind, from, dest: d.dest, path: d.path, catches, joins, pieces });
      }
    });
    return out;
  }

  // Save a throw (from throwSticks). Returns the result kind.
  throw(kind) {
    if (this.phase !== 'throw') throw new Error('not time to throw');
    this.pending.push(kind);
    this.last = { type: 'throw', kind, player: this.turn };
    this.phase = bonusThrow(kind) ? 'throw' : 'move';
    if (this.phase === 'move') this._dropUseless();
    return kind;
  }

  // Use pending throw i on unit `from`.
  move(i, from) {
    const kind = this.pending[i];
    if (this.phase !== 'move' || kind == null) throw new Error('no such throw');
    const d = this.destination(from, kind);
    if (!d) throw new Error('that piece cannot use this throw');
    this.pending.splice(i, 1);
    const me = this.players[this.turn];
    const moving = from === HOME ? [me.pieces.find((x) => x.at === HOME)] : me.pieces.filter((x) => x.at === from);
    const lead = moving[0];
    let trail;
    if (kind === 'backdo') trail = lead.trail.slice(0, -1);
    else trail = (from === HOME ? [0] : lead.trail).concat(d.path.filter((s) => s !== OUT));
    let caught = 0;
    if (d.dest !== OUT) {
      this.players.forEach((pl, j) => {
        if (j === this.turn) return;
        for (const x of pl.pieces) if (x.at === d.dest) { x.at = HOME; x.trail = []; caught++; }
      });
    }
    const joined = d.dest !== OUT ? me.pieces.filter((x) => x.at === d.dest && !moving.includes(x)) : [];
    for (const x of [...moving, ...joined]) { x.at = d.dest; x.trail = d.dest === OUT ? [] : trail.slice(); }
    this.last = { type: 'move', kind, from, dest: d.dest, path: d.path, pieces: moving.length, caught, joined: joined.length, player: this.turn };
    if (me.pieces.every((x) => x.at === OUT)) {
      this.winner = this.turn;
      this.phase = 'over';
      this.pending = [];
      return this.last;
    }
    if (caught) this.phase = 'throw'; // a catch earns one more throw
    else if (!this.pending.length) this._next();
    else this._dropUseless();
    return this.last;
  }

  // Throws no piece can use (빽도 with nothing on the board) are lost.
  _dropUseless() {
    while (this.phase === 'move' && this.pending.length && !this.options().length) {
      this.last = { ...(this.last || {}), lost: this.pending.slice(), player: this.turn };
      this.pending = [];
      this._next();
    }
  }

  _next() {
    this.turn = (this.turn + 1) % this.players.length;
    this.pending = [];
    this.phase = 'throw';
  }
}

// A computer player's choice among game.options(): catch when it can, take
// pieces out, ride the short cuts and stack, and keep out of reach of other
// players' pieces.
export function chooseMove(game, rand = Math.random) {
  const opts = game.options();
  if (!opts.length) return null;
  const odds = throwOdds();
  const reachRisk = (spot) => {
    if (spot === OUT || spot === HOME) return 0;
    let risk = 0;
    game.players.forEach((_, j) => {
      if (j === game.turn) return;
      for (const from of game.units(j)) {
        for (const kind of THROWS) {
          const d = game.destination(from, kind, j);
          if (d && d.dest === spot) risk += odds[kind];
        }
      }
    });
    return Math.min(1, risk);
  };
  let best = null, bestScore = -Infinity;
  for (const o of opts) {
    const lead = game.players[game.turn].pieces.find((x) => x.at === o.from);
    const prev = lead.trail.length > 1 ? lead.trail[lead.trail.length - 2] : null;
    const before = stepsToGoal(o.from, prev);
    const after = o.dest === OUT ? 0 : stepsToGoal(o.dest, o.path.length > 1 ? o.path[o.path.length - 2] : o.from);
    let s = (before - after) * 2 * o.pieces;
    if (o.catches) s += 60 + 15 * o.catches;
    if (o.dest === OUT) s += 40 * o.pieces;
    if (o.joins) s += 12;
    if (o.dest === 5 || o.dest === 10 || o.dest === CENTER) s += 10;
    s -= reachRisk(o.dest) * 45 * (o.pieces + o.joins);
    s += reachRisk(o.from) * 25 * o.pieces; // running away from danger
    s += rand() * 3; // not always the same game
    if (s > bestScore) { bestScore = s; best = o; }
  }
  return best;
}
