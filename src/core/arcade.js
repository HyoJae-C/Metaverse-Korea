// Three skill games, no DOM so they can be unit-tested: the batting cage
// (야구 연습장), the toy shooting gallery in Another Land (풍선 사격) and darts
// at Bar Hush. They are free to play and pay out nothing: you only chase
// your own best record (kept in this browser under "mk.arcade").

// ── Batting cage ─────────────────────────────────────────────────────────
// The machine is 18.44 m away (pitcher's mound to home plate). Pick a speed;
// swing when the ball reaches the plate. Timing decides the hit.
export const PITCH_SPEEDS = [80, 100, 120, 140]; // km/h
export const PITCHES = 10; // pitches per round
export const MOUND = 18.44; // metres
export const flightTime = (kmh) => MOUND / (kmh / 3.6); // seconds

// How a swing went: err = swing time − ball-at-plate time (seconds).
// Negative = early (pulled foul), positive = late.
export function judgeSwing(err) {
  const a = Math.abs(err);
  if (a <= 0.035) return 'homerun';
  if (a <= 0.075) return 'hit';
  if (a <= 0.13) return 'foul';
  return 'strike';
}
// How far a hit flies (metres): a home run clears the 100 m fence.
export function hitDistance(kind, err, rand = Math.random) {
  if (kind === 'homerun') return Math.round(100 + (1 - Math.abs(err) / 0.035) * 25 + rand() * 10);
  if (kind === 'hit') return Math.round(40 + (1 - (Math.abs(err) - 0.035) / 0.04) * 45 + rand() * 10);
  return 0;
}
// A round's tally from its results.
export function battingTally(results) {
  const hr = results.filter((r) => r === 'homerun').length;
  return { hr, hits: hr + results.filter((r) => r === 'hit').length };
}
// Is tally a better than b? More home runs first, then more hits.
export const betterBatting = (a, b) => !b || a.hr > b.hr || (a.hr === b.hr && a.hits > b.hits);

// ── Shooting gallery (toy cork gun) ──────────────────────────────────────
// Three rows of targets slide across; tap one to pop it. Balloons are big
// and slow, ducks smaller, stars small and fast. A popped target comes back
// after a moment. 15 corks, 30 seconds.
export const GALLERY_SHOTS = 15;
export const GALLERY_SECONDS = 30;
export const GALLERY_ROWS = [
  // y (0..1 of the height), speed (widths per second, sign = direction), target kind
  { y: 0.24, speed: 0.22, kind: 'star', n: 3 },
  { y: 0.5, speed: -0.14, kind: 'duck', n: 4 },
  { y: 0.76, speed: 0.08, kind: 'balloon', n: 5 },
];
export const TARGETS = {
  balloon: { points: 10, r: 0.06 },
  duck: { points: 20, r: 0.045 },
  star: { points: 50, r: 0.035 },
};
const POP_BACK = 1.5; // seconds until a popped target is back

export class Gallery {
  constructor() {
    this.targets = [];
    GALLERY_ROWS.forEach((row, ri) => {
      for (let i = 0; i < row.n; i++) this.targets.push({ row: ri, kind: row.kind, off: i / row.n, popped: -Infinity });
    });
    this.shots = GALLERY_SHOTS;
    this.score = 0;
    this.hits = 0;
  }
  // Where a target is at time t: x, y in 0..1 (x wraps round).
  at(tg, t) {
    const row = GALLERY_ROWS[tg.row];
    const x = (((tg.off + t * row.speed) % 1) + 1) % 1;
    return { x, y: row.y };
  }
  visible(tg, t) { return t - tg.popped >= POP_BACK; }
  // Shoot at (x, y) (0..1, with aspect = width / height so that circles stay
  // round). Returns the target hit, or null; uses one cork either way.
  shoot(x, y, t, aspect = 1) {
    if (this.shots <= 0) return null;
    this.shots--;
    let best = null, bd = Infinity;
    for (const tg of this.targets) {
      if (!this.visible(tg, t)) continue;
      const p = this.at(tg, t);
      const d = Math.hypot((p.x - x) * aspect, p.y - y);
      if (d < TARGETS[tg.kind].r * 1.15 && d < bd) { bd = d; best = tg; }
    }
    if (!best) return null;
    best.popped = t;
    this.score += TARGETS[best.kind].points;
    this.hits++;
    return best;
  }
}

// ── Darts ────────────────────────────────────────────────────────────────
// A standard board, scaled so the outer edge of the double ring is r = 1.
// The aim wobbles; tap to throw. 5 rounds of 3 darts, best total 900.
export const DART_ROUNDS = 5;
export const DARTS_PER_ROUND = 3;
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export const RING = { bull: 6.35 / 170, outerBull: 15.9 / 170, tripleIn: 99 / 170, tripleOut: 107 / 170, doubleIn: 162 / 170 };

// Score of a dart at (x, y): y points down (screen), (0, 0) is the bull.
export function dartScore(x, y) {
  const r = Math.hypot(x, y);
  if (r > 1) return { points: 0, label: 'miss' };
  if (r <= RING.bull) return { points: 50, label: 'bull' };
  if (r <= RING.outerBull) return { points: 25, label: '25' };
  const a = (Math.atan2(x, -y) + Math.PI * 2 + Math.PI / 20) % (Math.PI * 2); // 0 at the top, clockwise
  const n = BOARD_ORDER[Math.floor(a / (Math.PI / 10)) % 20];
  if (r >= RING.tripleIn && r <= RING.tripleOut) return { points: n * 3, label: 'T' + n };
  if (r >= RING.doubleIn) return { points: n * 2, label: 'D' + n };
  return { points: n, label: String(n) };
}
// Where the wobbling aim is at time t (seconds): read the sway and time
// your throw.
export function dartAim(t) {
  return {
    x: 0.5 * Math.sin(t * 1.3) + 0.14 * Math.sin(t * 3.7 + 0.5),
    y: 0.5 * Math.sin(t * 1.75 + 1) + 0.14 * Math.sin(t * 2.9),
  };
}
// The dart lands near the aim (a hand is never perfectly still).
export function dartLand(aim, rand = Math.random) {
  const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 0.05;
  return { x: aim.x + Math.cos(a) * d, y: aim.y + Math.sin(a) * d };
}

// Each dart must be thrown within 7 seconds, alone or with a friend.
export const DART_SECONDS = 7;
// Darts with a friend in the same bar: invite, accept, then you take turns,
// one dart each, 10 darts each; the challenger throws first. The thrower
// tells the other side when their aim starts swaying (with its phase, so
// both screens show the same sway) and exactly where the dart landed, so
// both screens show the same throw and the same score.
// kind: i = invite, a = accept, n = no / left,
//   t = my turn starts (thrown = dart number 0..19, total = sway phase),
//   h = hit (thrown = dart number, total / extra = where, see dartAt),
//   x = out of time (thrown = dart number).
export const DARTS_EACH = 10;
export const dartsMsg = (to, kind, thrown = 0, total = 0, extra) => `darts:${to}:${kind}:${thrown | 0}:${total | 0}` + (extra != null ? `:${extra | 0}` : '');
export function parseDarts(e) {
  const m = /^darts:([\w-]{1,64}):([ianthx]):(\d{1,2}):(\d{1,4})(?::(\d{1,4}))?$/.exec(String(e));
  return m ? { to: m[1], kind: m[2], thrown: +m[3], total: +m[4], extra: m[5] != null ? +m[5] : null } : null;
}
// A board position (-2..2) as a whole number for a message, and back.
export const dartPack = (v) => Math.round((Math.max(-2, Math.min(2, v)) + 2) * 1000);
export const dartUnpack = (n) => n / 1000 - 2;
// The sway phase (0..20 s) as a whole number for a message, and back.
export const swayPack = (s) => Math.round(Math.max(0, Math.min(19.99, s)) * 500);
export const swayUnpack = (n) => n / 500;
// Dart number n (0 = the very first) in a match: is it the challenger's?
export const challengerThrows = (n) => n % 2 === 0;

// ── Records ──────────────────────────────────────────────────────────────
export const RECORD_KEY = 'mk.arcade';
export function loadRecords(store) {
  try { const r = JSON.parse(store?.getItem(RECORD_KEY) || '{}'); return r && typeof r === 'object' ? r : {}; } catch { return {}; }
}
// Save a result if it beats the record; returns true for a new record.
// game: 'batting' (per speed: { hr, hits }), 'gallery' or 'darts' (a number).
export function saveRecord(store, game, value, speed) {
  const rec = loadRecords(store);
  let better;
  if (game === 'batting') {
    rec.batting ||= {};
    better = betterBatting(value, rec.batting[speed]);
    if (better) rec.batting[speed] = { hr: value.hr, hits: value.hits };
  } else {
    better = !(rec[game] >= value);
    if (better) rec[game] = value;
  }
  if (better) try { store?.setItem(RECORD_KEY, JSON.stringify(rec)); } catch { /* storage blocked */ }
  return better;
}
