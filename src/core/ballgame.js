// Seoul Another Dome (서울 어나더 돔): the baseball league, no THREE or DOM
// (core/dome.js draws the stadium and plays these games out).
//
// Eight fictional teams play one game at a time in the dome. A new game
// starts every GAME_CYCLE seconds of real time (wall clock), plays for
// GAME_LEN seconds and then the grounds crew gets ready for the next one.
// Everything follows from the game's number (k = floor(t / GAME_CYCLE)), so
// everyone in the dome sees the same pitch, the same home run and the same
// final score at the same moment, with no server.
//
//   gameAt(t)       what is happening at wall-clock second t
//   playGame(k)     the whole game k: teams, play-by-play with times, score
//   standings(k)    the league table from the last full round before game k
//   rosterOf(id)    a team's nine batters (fictional names, fixed per team)

export const GAME_CYCLE = 15 * 60; // a new game every 15 minutes
export const GAME_LEN = 8 * 60; // the game itself lasts 8 minutes
export const INTRO = 12; // s of "PLAY BALL" before the first pitch
export const OUTRO = 28; // s of the final score at the end of the game

// Fictional teams ("neighbourhood + animal"). None is a real KBO team or a
// well-known mascot. color: the jersey; trim: the letters and the cap.
export const TEAMS = [
  { id: 'herons', short: 'CHE', color: '#2f6fd6', trim: '#ffffff', name: { en: 'Cheonggye Herons', ko: '청계 왜가리', ja: '清渓アオサギ', zh: '清溪苍鹭' }, chant: ['청계! 왜가리!', 'cheonggye! waegari!'] },
  { id: 'comets', short: 'JAM', color: '#f28a1e', trim: '#1d2440', name: { en: 'Jamsil Comets', ko: '잠실 혜성', ja: '蚕室コメッツ', zh: '蚕室彗星' }, chant: ['잠실! 혜성!', 'jamsil! hyeseong!'] },
  { id: 'magpies', short: 'NAM', color: '#26262c', trim: '#f4f4f4', name: { en: 'Namsan Magpies', ko: '남산 까치', ja: '南山カササギ', zh: '南山喜鹊' }, chant: ['남산! 까치!', 'namsan! kkachi!'] },
  { id: 'otters', short: 'HAN', color: '#2f9e5b', trim: '#f6e7b0', name: { en: 'Hangang Otters', ko: '한강 수달', ja: '漢江カワウソ', zh: '汉江水獭' }, chant: ['한강! 수달!', 'hangang! sudal!'] },
  { id: 'cats', short: 'HON', color: '#8a5cc9', trim: '#ffd84a', name: { en: 'Hongdae Cats', ko: '홍대 고양이', ja: '弘大キャッツ', zh: '弘大猫咪' }, chant: ['홍대! 고양이!', 'hongdae! goyangi!'] },
  { id: 'pigeons', short: 'SEO', color: '#8c96a3', trim: '#2c3a6b', name: { en: 'Seongsu Pigeons', ko: '성수 비둘기', ja: '聖水ハト', zh: '圣水鸽子' }, chant: ['성수! 비둘기!', 'seongsu! bidulgi!'] },
  { id: 'squirrels', short: 'BUK', color: '#8a5a34', trim: '#f3e2c4', name: { en: 'Bukhansan Squirrels', ko: '북한산 다람쥐', ja: '北漢山リス', zh: '北汉山松鼠' }, chant: ['북한산! 다람쥐!', 'bukhansan! daramjwi!'] },
  { id: 'deer', short: 'YDP', color: '#f2c230', trim: '#6b4a2f', name: { en: 'Yeongdeungpo Water Deer', ko: '영등포 고라니', ja: '永登浦キバノロ', zh: '永登浦獐子' }, chant: ['영등포! 고라니!', 'yeongdeungpo! gorani!'] },
];

// The schedule: a round robin (every team meets every other once) in
// ROUND games, then again with home and away swapped. Built with the circle
// method, so each team plays once in every 4 games (once an hour).
function roundRobin(n) {
  const ids = Array.from({ length: n }, (_, i) => i);
  const out = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i], b = ids[n - 1 - i];
      out.push(r % 2 ? [b, a] : [a, b]); // (mix who is at home)
    }
    ids.splice(1, 0, ids.pop()); // turn everyone but the first
  }
  return out;
}
export const SCHEDULE = roundRobin(TEAMS.length);
export const ROUND = SCHEDULE.length; // 28 games: one full round

// Game k's teams: { home, away } (team objects).
export function matchup(k) {
  const i = ((k % ROUND) + ROUND) % ROUND;
  const swap = Math.floor(k / ROUND) % 2 !== 0;
  const [a, b] = SCHEDULE[i];
  return swap ? { home: TEAMS[b], away: TEAMS[a] } : { home: TEAMS[a], away: TEAMS[b] };
}

// A small seeded random (mulberry32), so a game is the same everywhere.
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

// ---- Players: fictional names, fixed per team -------------------------------
// Surnames are common ones; given names are put together from two syllables,
// so they are made-up people (not real players), new to the game too.
const SURNAMES = [['김', 'Kim'], ['이', 'Lee'], ['박', 'Park'], ['최', 'Choi'], ['정', 'Jung'], ['강', 'Kang'], ['조', 'Cho'], ['윤', 'Yoon'], ['장', 'Jang'], ['임', 'Lim'], ['한', 'Han'], ['오', 'Oh'], ['서', 'Seo'], ['신', 'Shin'], ['권', 'Kwon'], ['황', 'Hwang'], ['안', 'Ahn'], ['송', 'Song'], ['류', 'Ryu'], ['홍', 'Hong']];
const SYL1 = [['도', 'do'], ['하', 'ha'], ['서', 'seo'], ['지', 'ji'], ['태', 'tae'], ['우', 'u'], ['재', 'jae'], ['민', 'min'], ['건', 'geon'], ['시', 'si'], ['은', 'eun'], ['현', 'hyeon'], ['주', 'ju'], ['승', 'seung'], ['예', 'ye'], ['한', 'han']];
const SYL2 = [['윤', 'yun'], ['람', 'ram'], ['율', 'yul'], ['찬', 'chan'], ['솔', 'sol'], ['결', 'gyeol'], ['훈', 'hun'], ['빈', 'bin'], ['온', 'on'], ['겸', 'gyeom'], ['별', 'byeol'], ['호', 'ho'], ['담', 'dam'], ['혁', 'hyeok'], ['진', 'jin'], ['울', 'ul']];
const POS = ['CF', 'SS', 'RF', '1B', 'DH', '3B', 'LF', 'C', '2B'];
const rosters = new Map();
export function rosterOf(teamId) {
  if (rosters.has(teamId)) return rosters.get(teamId);
  const r = rng(hash('roster:' + teamId));
  const pick = (a) => a[Math.floor(r() * a.length)];
  const used = new Set();
  const out = [];
  while (out.length < 9) {
    const s = pick(SURNAMES), a = pick(SYL1), b = pick(SYL2);
    const ko = s[0] + a[0] + b[0];
    if (used.has(ko)) continue;
    used.add(ko);
    let no = 1 + Math.floor(r() * 99);
    while (out.some((p) => p.no === no)) no = 1 + (no % 99);
    out.push({ ko, en: `${s[1]} ${a[1][0].toUpperCase()}${a[1].slice(1)}${b[1]}`, no, pos: POS[out.length] });
  }
  rosters.set(teamId, out);
  return out;
}

// ---- One game ---------------------------------------------------------------
// What a plate appearance can end in, with its chance. Roughly real numbers.
export const RESULTS = [
  ['K', 0.21], ['GO', 0.22], ['FO', 0.22], ['BB', 0.08], ['1B', 0.17], ['2B', 0.05], ['3B', 0.01], ['HR', 0.04],
];
export const isOut = (res) => res === 'K' || res === 'GO' || res === 'FO';
// How long each kind of play is shown (s, before the game is fitted into
// its time). A home run is the longest: the slow ball, fireworks and the
// batter's trot round the bases (time for a photo).
const SHOW = { K: 4.5, GO: 4.8, FO: 5.2, BB: 4, '1B': 6.5, '2B': 7.5, '3B': 8.5, HR: 13 };
const CHANGE = 3.5; // s between half-innings
export const MAX_INNINGS = 12;

function pickResult(r) {
  let u = r(), acc = 0;
  for (const [res, p] of RESULTS) { acc += p; if (u < acc) return res; }
  return 'GO';
}

// Moves the runners for one result. bases: [1st, 2nd, 3rd] booleans.
// Returns runs scored. Simple rules: a hit moves everyone as many bases as
// the batter gets; a walk only pushes forced runners.
export function advance(bases, res) {
  let runs = 0;
  if (res === 'BB') {
    const [a, b, c] = bases;
    if (a && b && c) runs++;
    bases.splice(0, 3, true, a || b, c || (a && b));
    return runs;
  }
  const n = { '1B': 1, '2B': 2, '3B': 3, HR: 4 }[res];
  if (!n) return 0;
  const next = [false, false, false];
  for (let i = 2; i >= 0; i--) {
    if (!bases[i]) continue;
    const to = i + n;
    if (to >= 3) runs++; else next[to] = true;
  }
  if (n >= 4) runs++; else next[n - 1] = true;
  bases.splice(0, 3, ...next);
  return runs;
}

const games = new Map();
// The whole of game k. plays: [{ t0, dur, inning, top, bat (team), batter
// (roster entry), res, runs, outs (after), bases (after), score [away, home]
// (after) }], with t0 in seconds from the game's start. Plays are fitted
// between INTRO and GAME_LEN - OUTRO.
export function playGame(k) {
  if (games.has(k)) return games.get(k);
  const { home, away } = matchup(k);
  const r = rng(hash('game:' + k));
  const plays = [];
  const score = [0, 0];
  const lineup = [0, 0];
  const lines = [[], []]; // runs per inning: away, home
  // Nine innings; a tie goes to extra innings, and after the 12th it stays a
  // tie (the KBO rule).
  for (let inning = 1; inning <= MAX_INNINGS; inning++) {
    if (inning > 9 && score[0] !== score[1]) break;
    for (const top of [true, false]) {
      if (!top && inning >= 9 && score[1] > score[0]) { lines[1].push('X'); continue; } // home is ahead: no bottom half
      const side = top ? 0 : 1;
      const bat = top ? away : home;
      const roster = rosterOf(bat.id);
      const bases = [false, false, false];
      let outs = 0, inRuns = 0, pas = 0;
      while (outs < 3) {
        let res = pickResult(r);
        if (pas >= 9 && !isOut(res)) res = 'GO'; // (no endless innings)
        const batter = roster[lineup[side] % 9];
        lineup[side]++;
        pas++;
        let runs = 0;
        if (isOut(res)) outs++;
        else runs = advance(bases, res);
        score[side] += runs;
        inRuns += runs;
        plays.push({ inning, top, bat, batter, res, runs, outs, bases: [...bases], score: [...score], change: outs === 3 });
        if (!top && inning >= 9 && score[1] > score[0]) break; // walk-off
      }
      lines[side].push(inRuns);
    }
  }
  // Fit the plays into the game's time.
  const raw = plays.reduce((s, p) => s + SHOW[p.res] + (p.change ? CHANGE : 0), 0);
  const avail = GAME_LEN - INTRO - OUTRO;
  const f = avail / raw;
  let t = INTRO;
  for (const p of plays) {
    p.t0 = t;
    p.dur = SHOW[p.res] * f;
    t += p.dur + (p.change ? CHANGE * f : 0);
  }
  const game = { k, home, away, plays, score: [...score], lines, winner: score[1] > score[0] ? home : score[0] > score[1] ? away : null };
  games.set(k, game);
  if (games.size > 40) games.delete(games.keys().next().value);
  return game;
}

// What is happening at wall-clock second t:
//   { k, game, phase: 'intro' | 'play' | 'change' | 'final' | 'break',
//     at (s since the game started), play (the current play or null),
//     p (0..1 through it), last (the last finished play), next (in s, when
//     the next game starts) }
export function gameAt(t) {
  const k = Math.floor(t / GAME_CYCLE);
  const at = t - k * GAME_CYCLE;
  const game = playGame(k);
  const next = GAME_CYCLE - at;
  if (at >= GAME_LEN) return { k, game, phase: 'break', at, play: null, p: 0, last: game.plays.at(-1), next };
  if (at < INTRO) return { k, game, phase: 'intro', at, play: null, p: 0, last: null, next };
  const plays = game.plays;
  let lo = 0, hi = plays.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (plays[m].t0 <= at) { i = m; lo = m + 1; } else hi = m - 1; }
  const play = plays[i];
  if (at < play.t0 + play.dur) return { k, game, phase: 'play', at, play, p: (at - play.t0) / play.dur, last: plays[i - 1] || null, next };
  if (i === plays.length - 1) return { k, game, phase: 'final', at, play: null, p: 0, last: play, next };
  return { k, game, phase: 'change', at, play: null, p: 0, last: play, next };
}

// The score and the inning as the board shows them before/after a play.
export function boardAt(state) {
  const { game, phase, play, last } = state;
  if (phase === 'intro') return { score: [0, 0], inning: 1, top: true, outs: 0, bases: [false, false, false] };
  const ref = phase === 'play' ? play : last;
  if (phase === 'play') {
    // During a play the board still shows what it was before it.
    const i = game.plays.indexOf(play);
    const prev = game.plays[i - 1];
    const fresh = !prev || prev.change;
    return { score: prev ? [...prev.score] : [0, 0], inning: play.inning, top: play.top, outs: fresh ? 0 : prev.outs, bases: fresh ? [false, false, false] : [...prev.bases] };
  }
  if (phase === 'change' && ref.change) {
    // Between half-innings: the next half is coming up.
    const top = !ref.top;
    return { score: [...ref.score], inning: ref.top ? ref.inning : ref.inning + 1, top, outs: 0, bases: [false, false, false] };
  }
  return { score: [...ref.score], inning: ref.inning, top: ref.top, outs: ref.outs, bases: [...ref.bases] };
}

// The league table from the last full round (ROUND games) finished before
// game k: [{ team, w, l, d }] best first (d: drawn games).
export function standings(k) {
  const rows = TEAMS.map((team) => ({ team, w: 0, l: 0, d: 0 }));
  const row = (team) => rows.find((x) => x.team === team);
  for (let j = k - ROUND; j < k; j++) {
    const g = playGame(j);
    if (!g.winner) { row(g.home).d++; row(g.away).d++; continue; }
    row(g.winner).w++;
    row(g.winner === g.home ? g.away : g.home).l++;
  }
  return rows.sort((a, b) => b.w - a.w || a.l - b.l);
}

// When a team plays next, from game k on: the game number (k itself if it
// is playing now).
export function nextGameOf(teamId, k) {
  for (let j = k; j < k + ROUND; j++) { const m = matchup(j); if (m.home.id === teamId || m.away.id === teamId) return j; }
  return null;
}
