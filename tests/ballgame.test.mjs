import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEAMS, SCHEDULE, ROUND, GAME_CYCLE, GAME_LEN, INTRO, OUTRO, matchup, playGame, gameAt, boardAt,
  standings, rosterOf, advance, nextGameOf, isOut,
} from '../src/core/ballgame.js';

const REAL_KBO = ['twins', 'bears', 'landers', 'heroes', 'tigers', 'lions', 'giants', 'eagles', 'dinos', 'wiz'];

test('eight fictional teams, none named after a KBO team', () => {
  assert.equal(TEAMS.length, 8);
  assert.equal(new Set(TEAMS.map((t) => t.id)).size, 8);
  for (const t of TEAMS) {
    for (const k of ['en', 'ko', 'ja', 'zh']) assert.ok(t.name[k], `${t.id} ${k}`);
    for (const w of REAL_KBO) assert.ok(!t.name.en.toLowerCase().includes(w), t.name.en);
    assert.match(t.color, /^#[0-9a-f]{6}$/i);
  }
  const names = TEAMS.map((t) => t.name.ko);
  for (const n of ['청계 왜가리', '잠실 혜성', '남산 까치', '한강 수달', '홍대 고양이', '성수 비둘기', '북한산 다람쥐', '영등포 고라니']) assert.ok(names.includes(n), n);
});

test('a round: every pair meets once, every team plays once in each 4 games', () => {
  assert.equal(ROUND, 28);
  const pairs = new Set(SCHEDULE.map(([a, b]) => [a, b].sort().join('-')));
  assert.equal(pairs.size, 28);
  for (let k = 0; k < ROUND; k += 4) {
    const seen = new Set();
    for (let j = k; j < k + 4; j++) { const m = matchup(j); seen.add(m.home.id); seen.add(m.away.id); }
    assert.equal(seen.size, 8, `games ${k}..${k + 3}`);
  }
  // The next round swaps home and away.
  assert.equal(matchup(0).home, matchup(ROUND).away);
  // So a fan waits at most an hour (4 games) for their team.
  for (const t of TEAMS) assert.ok(nextGameOf(t.id, 100) - 100 < 4 + 3, t.id);
});

test('a game is the same every time and fits in its 8 minutes', () => {
  for (const k of [0, 1, 7, 1234, 98765]) {
    const g = playGame(k);
    assert.deepEqual(playGame(k).score, g.score);
    if (g.score[0] === g.score[1]) assert.equal(g.lines[0].length, 12, 'a tie only after 12 innings');
    const last = g.plays.at(-1);
    assert.ok(g.plays[0].t0 >= INTRO - 1e-9);
    assert.ok(last.t0 + last.dur <= GAME_LEN - OUTRO + 1e-6);
    for (let i = 1; i < g.plays.length; i++) assert.ok(g.plays[i].t0 >= g.plays[i - 1].t0 + g.plays[i - 1].dur - 1e-9);
    assert.ok(Math.min(...g.plays.map((p) => p.dur)) > 2, 'every play gets time to be seen');
    // 3 outs end each half-inning (except a walk-off).
    const halves = g.plays.filter((p) => p.change);
    for (const h of halves) assert.equal(h.outs, 3);
  }
});

test('the scores add up from the plays', () => {
  for (let k = 0; k < 60; k++) {
    const g = playGame(k);
    const runs = [0, 0];
    for (const p of g.plays) runs[p.top ? 0 : 1] += p.runs;
    assert.deepEqual(runs, g.score);
    assert.ok(g.plays.every((p) => isOut(p.res) ? p.runs === 0 : true));
  }
});

test('runners: hits and walks', () => {
  let b = [false, false, false];
  assert.equal(advance(b, 'HR'), 1); assert.deepEqual(b, [false, false, false]);
  b = [true, true, true];
  assert.equal(advance(b, 'HR'), 4);
  b = [true, false, true];
  assert.equal(advance(b, '1B'), 1); assert.deepEqual(b, [true, true, false]);
  b = [false, true, false];
  assert.equal(advance(b, 'BB'), 0); assert.deepEqual(b, [true, true, false]);
  b = [true, true, true];
  assert.equal(advance(b, 'BB'), 1); assert.deepEqual(b, [true, true, true]);
  b = [true, false, false];
  assert.equal(advance(b, '2B'), 0); assert.deepEqual(b, [false, true, true]);
});

test('gameAt walks through intro, plays, final and the break', () => {
  const k = 500, t0 = k * GAME_CYCLE;
  assert.equal(gameAt(t0 + 1).phase, 'intro');
  const mid = gameAt(t0 + 200);
  assert.ok(['play', 'change'].includes(mid.phase));
  assert.equal(gameAt(t0 + GAME_LEN - 5).phase, 'final');
  const br = gameAt(t0 + GAME_LEN + 10);
  assert.equal(br.phase, 'break');
  assert.ok(Math.abs(br.next - (GAME_CYCLE - GAME_LEN - 10)) < 1e-9);
  assert.equal(gameAt(t0 + GAME_CYCLE).k, k + 1);
  // The board never shows more than 2 outs during a play.
  for (let s = INTRO; s < GAME_LEN; s += 3) {
    const st = gameAt(t0 + s);
    const b = boardAt(st);
    if (st.phase === 'play') assert.ok(b.outs <= 2);
    assert.ok(b.inning >= 1 && b.inning <= 12);
  }
});

test('rosters: nine made-up players per team, fixed', () => {
  for (const t of TEAMS) {
    const r = rosterOf(t.id);
    assert.equal(r.length, 9);
    assert.equal(new Set(r.map((p) => p.ko)).size, 9);
    assert.equal(new Set(r.map((p) => p.no)).size, 9);
    assert.deepEqual(rosterOf(t.id), r);
  }
});

test('standings: each team played 7 games in the last round', () => {
  const rows = standings(300);
  assert.equal(rows.length, 8);
  for (const r of rows) assert.equal(r.w + r.l + r.d, 7);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].w >= rows[i].w);
});
