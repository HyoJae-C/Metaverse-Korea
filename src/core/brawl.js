// Rooftop Rumble: the arcade's 3D one-on-one fighting game (game/brawl.js
// draws it with the player's own character). Pure rules, 60 ticks a second.
//
// Two fighters on a round ring always face each other. Four attack buttons,
// one per limb: lp/rp (left and right punch), lk/rk (left and right kick).
// Light hits chain into heavier ones (lp → rp → lk → rk). Three specials:
//   upper  toward + rp   a rising punch that launches (hit them in the air)
//   palm   lp + rp       a slow two-hand push that goes through a guard
//   fly    lk + rk       a flying kick: far and strong, wide open if blocked
// Holding away guards. Up and down side-step round the other fighter, so a
// straight punch thrown at where they were misses.
//
// Units: metres, ticks (1/60 s), radians. Stick input: mx +1 toward the other
// fighter, -1 away; mz +1 steps to the fighter's right-hand side (for the
// player on the left of the screen: into the screen), -1 the other way.

export const TICK = 1 / 60;
export const RING_R = 4.2;
export const MAX_HP = 100;
export const ROUND_TICKS = 45 * 60;
export const ROUNDS_TO_WIN = 2;
export const BODY_R = 0.34; // fighters never stand closer than two of these
const RAGE_HP = 25, RAGE_MULT = 1.2, COUNTER_MULT = 1.25;
const WALK = 2.3 * TICK, BACK = 1.1 * TICK;
const STEP_TICKS = 13, STEP_DIST = 0.95, STEP_REST = 5;
const BUFFER = 9; // a press waits this many ticks for the fighter to be free
const GRAVITY = 20 * TICK * TICK;
const MAX_JUGGLE = 3;

// startup, active, recover: ticks. range: reach from our centre to theirs.
// arc: half-angle of the swing (how far off our facing still hits). stun /
// block: ticks the other is stuck when hit / when guarding. push: how far
// they slide. lunge: how far we move forward during the startup. level: a
// hit chains into a higher level only.
export const MOVES = {
  lp: { startup: 7, active: 3, recover: 11, dmg: 6, range: 1.0, arc: 0.5, stun: 17, block: 9, push: 0.22, lunge: 0.1, level: 1 },
  rp: { startup: 11, active: 3, recover: 15, dmg: 10, range: 1.05, arc: 0.45, stun: 20, block: 11, push: 0.32, lunge: 0.15, level: 2 },
  lk: { startup: 13, active: 4, recover: 17, dmg: 12, range: 1.2, arc: 0.6, stun: 22, block: 12, push: 0.4, lunge: 0.12, level: 3 },
  rk: { startup: 19, active: 5, recover: 24, dmg: 18, range: 1.3, arc: 1.4, block: 15, push: 0.65, lunge: 0.15, level: 4, knock: true },
  upper: { startup: 14, active: 4, recover: 22, dmg: 12, range: 1.05, arc: 0.45, block: 9, push: 0.3, lunge: 0.45, level: 2.5, launch: true },
  palm: { startup: 25, active: 4, recover: 22, dmg: 14, range: 1.05, arc: 0.5, push: 0.9, lunge: 0.6, level: 9, knock: true, unblockable: true },
  fly: { startup: 17, active: 9, recover: 30, dmg: 20, range: 1.1, arc: 0.4, block: 13, push: 0.8, lunge: 1.7, level: 9, knock: true, leap: 0.55 },
};
export const moveTicks = (m) => m.startup + m.active + m.recover;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// A small seeded random (the same match on every run of a test).
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function newFighter(side) {
  return {
    side, x: side ? 1.1 : -1.1, z: 0, y: 0, vy: 0, vx: 0, vz: 0,
    face: side ? Math.PI : 0, // 0 looks along +x
    hp: MAX_HP, st: 'idle', t: 0, move: null, hit: false, landed: false,
    stun: 0, stepDir: 0, rest: 0, juggle: 0, walk: 0, guard: false, rage: false, chain: false, again: false,
    buf: { lp: 0, rp: 0, lk: 0, rk: 0 }, combo: 0, comboT: 0,
  };
}
const NO_INPUT = { mx: 0, mz: 0 };
const canBeHit = (f) => f.st !== 'down' && f.st !== 'getup' && f.st !== 'ko';

// Which move the waiting presses ask for (null: none).
function wanted(f, inp, level = 0, sameAgain = false) {
  const b = f.buf;
  if (level === 0 && b.lp && b.rp) return 'palm';
  if (level === 0 && b.lk && b.rk) return 'fly';
  if (b.rp && inp.mx > 0.5 && MOVES.upper.level > level) return 'upper';
  for (const k of ['lp', 'rp', 'lk', 'rk']) if (b[k] && (MOVES[k].level > level || (sameAgain && k === 'lp' && level === 1))) return k;
  return null;
}
function startMove(f, id) {
  f.chain = false; f.st = 'atk'; f.move = id; f.t = 0; f.hit = false; f.landed = false; f.guard = false;
  if (id === 'palm') f.buf.lp = f.buf.rp = 0;
  else if (id === 'fly') f.buf.lk = f.buf.rk = 0;
  else f.buf[id === 'upper' ? 'rp' : id] = 0;
}

function hurt(a, d, id, face, ev) {
  const m = MOVES[id], cos = Math.cos(face), sin = Math.sin(face);
  const air = d.st === 'air';
  const counter = d.st === 'atk' && d.t < MOVES[d.move].startup + MOVES[d.move].active;
  let dmg = m.dmg * (a.rage ? RAGE_MULT : 1) * (counter ? COUNTER_MULT : 1);
  if (air) { d.juggle++; dmg *= 0.7 ** d.juggle; }
  dmg = Math.max(1, Math.round(dmg));
  d.hp = Math.max(0, d.hp - dmg);
  a.combo = a.comboT > 0 ? a.combo + 1 : 1;
  a.comboT = 50;
  d.move = null; d.guard = false; d.t = 0;
  d.vx = cos * m.push * 0.16; d.vz = sin * m.push * 0.16;
  if (d.hp <= 0) {
    d.st = 'air'; d.vy = 0.085; d.vx = cos * 0.05; d.vz = sin * 0.05; d.ko = true;
  } else if (air) {
    d.st = 'air'; d.vy = d.juggle >= MAX_JUGGLE ? 0.02 : 0.075; d.vx = cos * 0.02; d.vz = sin * 0.02;
  } else if (m.launch) {
    d.st = 'air'; d.vy = 0.135; d.juggle = 0; d.vx = cos * 0.005; d.vz = sin * 0.005;
  } else if (m.knock) {
    d.st = 'air'; d.vy = 0.07; d.juggle = MAX_JUGGLE; d.vx = cos * 0.055; d.vz = sin * 0.055;
  } else { d.st = 'hit'; d.stun = m.stun + (counter ? 6 : 0); }
  ev.push({ k: 'hit', by: a.side, move: id, dmg, counter, launch: !!m.launch && !air, air, combo: a.combo, x: d.x, z: d.z, y: d.y + 0.75, ko: d.hp <= 0 });
  if (!d.rage && d.hp > 0 && d.hp <= RAGE_HP) { d.rage = true; ev.push({ k: 'rage', who: d.side }); }
}

// One fighter's own tick (moving, starting and running moves).
function act(f, o, inp, ev) {
  for (const k in f.buf) {
    if (inp[k]) f.buf[k] = BUFFER;
    else if (f.buf[k] > 0) f.buf[k]--;
  }
  if (f.comboT > 0 && --f.comboT === 0) f.combo = 0;
  if (f.rest > 0) f.rest--;
  const dx = o.x - f.x, dz = o.z - f.z, dist = Math.hypot(dx, dz) || 1e-6;
  const toward = Math.atan2(dz, dx);
  f.t++;
  f.walk = 0;
  if (f.st === 'idle') {
    f.face = toward;
    f.guard = inp.mx < -0.3;
    const id = wanted(f, inp);
    if (id) { startMove(f, id); return; }
    if (inp.mz && !f.rest) { f.st = 'step'; f.t = 0; f.stepDir = Math.sign(inp.mz); f.guard = false; return; }
    if (inp.mx > 0.3 && dist > BODY_R * 2 + 0.02) { f.x += (dx / dist) * WALK; f.z += (dz / dist) * WALK; f.walk = 1; }
    else if (inp.mx < -0.3) { f.x -= (dx / dist) * BACK; f.z -= (dz / dist) * BACK; f.walk = -1; }
  } else if (f.st === 'step') {
    // Round the other fighter: sideways, still facing them.
    const v = (STEP_DIST / STEP_TICKS) * f.stepDir;
    f.x += Math.sin(f.face) * v; f.z -= Math.cos(f.face) * v;
    f.face = toward;
    if (f.t >= STEP_TICKS) { f.st = 'idle'; f.t = 0; f.rest = STEP_REST; }
  } else if (f.st === 'atk') {
    let m = MOVES[f.move];
    // The second button of a two-button special arriving a moment late.
    const pairOf = { lp: 'rp', rp: 'lp', lk: 'rk', rk: 'lk' }[f.move];
    if (f.t <= 4 && pairOf && !f.chain && f.buf[pairOf]) { const t = f.t; startMove(f, f.move[1] === 'p' ? 'palm' : 'fly'); f.t = t; m = MOVES[f.move]; }
    if (f.t <= m.startup) {
      if (f.move === 'rk') f.face += clamp(wrap(toward - f.face), -0.03, 0.03); // the roundhouse follows a little
      const room = dist - BODY_R * 2;
      const stepF = Math.min(m.lunge / m.startup, Math.max(0, room - 0.05));
      f.x += Math.cos(f.face) * stepF; f.z += Math.sin(f.face) * stepF;
    }
    if (m.leap) { const u = clamp(f.t / (m.startup + m.active + 6), 0, 1); f.y = Math.sin(u * Math.PI) * m.leap; }
    if (f.t === m.startup) ev.push({ k: 'swing', by: f.side, move: f.move });
    const end = m.startup + m.active;
    // A hit that landed (or was guarded) chains into a heavier button.
    if (f.landed && f.t > end && f.t <= end + 12 && m.level < 9) {
      const next = wanted(f, inp, m.level, f.move === 'lp' && !f.again);
      if (next) { const again = next === 'lp'; startMove(f, next); f.again = again; f.chain = true; f.face = toward; return; }
    }
    if (f.t >= moveTicks(m)) { f.st = 'idle'; f.t = 0; f.move = null; f.y = 0; f.again = false; f.chain = false; }
  } else if (f.st === 'hit' || f.st === 'block') {
    if (--f.stun <= 0) { f.st = 'idle'; f.t = 0; }
  } else if (f.st === 'air') {
    f.y += f.vy; f.vy -= GRAVITY;
    if (f.y <= 0 && f.vy < 0) {
      f.y = 0; f.vy = 0; f.vx = f.vz = 0; f.juggle = 0; f.t = 0;
      f.st = f.ko ? 'ko' : 'down';
      ev.push({ k: 'down', who: f.side, x: f.x, z: f.z });
    }
  } else if (f.st === 'down') {
    const quick = inp.lp || inp.rp || inp.lk || inp.rk || inp.mx || inp.mz;
    if (f.t >= 40 || (quick && f.t >= 18)) { f.st = 'getup'; f.t = 0; for (const k in f.buf) f.buf[k] = 0; }
  } else if (f.st === 'getup') {
    f.face = toward;
    if (f.t >= 16) { f.st = 'idle'; f.t = 0; }
  }
  // Sliding back from a hit.
  if (f.vx || f.vz) {
    f.x += f.vx; f.z += f.vz;
    if (f.st !== 'air') { f.vx *= 0.82; f.vz *= 0.82; if (Math.abs(f.vx) + Math.abs(f.vz) < 0.002) f.vx = f.vz = 0; }
  }
}

// Does a's move reach d this tick?
function reaches(a, d) {
  if (a.st !== 'atk' || a.hit) return false;
  const m = MOVES[a.move];
  if (a.t <= m.startup || a.t > m.startup + m.active) return false;
  if (!canBeHit(d) || d.y > 1.5) return false;
  const dx = d.x - a.x, dz = d.z - a.z;
  return Math.hypot(dx, dz) <= m.range && Math.abs(wrap(Math.atan2(dz, dx) - a.face)) <= m.arc;
}
// It does: guarded, or it hurts. (move and face: a's, as they were when it reached.)
function land(a, d, id, face, ev) {
  const m = MOVES[id];
  a.hit = true; a.landed = true;
  if (d.guard && (d.st === 'idle' || d.st === 'block') && !m.unblockable) {
    d.st = 'block'; d.stun = m.block; d.t = 0;
    d.vx = Math.cos(face) * m.push * 0.12; d.vz = Math.sin(face) * m.push * 0.12;
    ev.push({ k: 'block', by: a.side, move: id, x: d.x, z: d.z, y: 0.8 });
    return;
  }
  hurt(a, d, id, face, ev);
}

function apart(a, b) {
  if (a.y > 0.5 || b.y > 0.5) return;
  const dx = b.x - a.x, dz = b.z - a.z, dist = Math.hypot(dx, dz) || 1e-6, min = BODY_R * 2;
  if (dist >= min) return;
  const k = (min - dist) / 2;
  a.x -= (dx / dist) * k; a.z -= (dz / dist) * k; b.x += (dx / dist) * k; b.z += (dz / dist) * k;
}
function inRing(f) {
  const r = Math.hypot(f.x, f.z), max = RING_R - BODY_R;
  if (r > max) { f.x *= max / r; f.z *= max / r; }
}

// One tick of the fight for both fighters. Returns what happened.
export function stepFight(a, b, ia = NO_INPUT, ib = NO_INPUT) {
  const ev = [];
  act(a, b, ia, ev); act(b, a, ib, ev);
  // Both in the same tick is a trade: each hits the other.
  const ra = reaches(a, b) && [a.move, a.face], rb = reaches(b, a) && [b.move, b.face];
  if (ra) land(a, b, ra[0], ra[1], ev);
  if (rb) land(b, a, rb[0], rb[1], ev);
  apart(a, b); inRing(a); inRing(b);
  return ev;
}

// ── The computer's fighter ───────────────────────────────────────────────
// level 0 (easy) … 4 (the champion).
export const AI_LEVELS = [
  { think: 28, guard: 0.12, attack: 0.35, chain: 0.15, step: 0, special: 0, punish: 0.2 },
  { think: 22, guard: 0.28, attack: 0.45, chain: 0.35, step: 0.04, special: 0.1, punish: 0.35 },
  { think: 17, guard: 0.42, attack: 0.55, chain: 0.5, step: 0.1, special: 0.18, punish: 0.5 },
  { think: 13, guard: 0.55, attack: 0.62, chain: 0.65, step: 0.16, special: 0.24, punish: 0.65 },
  { think: 10, guard: 0.68, attack: 0.7, chain: 0.8, step: 0.22, special: 0.3, punish: 0.8 },
];
export function createAi(level, rand = Math.random) {
  const L = AI_LEVELS[clamp(level, 0, AI_LEVELS.length - 1)];
  let wait = 20, plan = { mx: 0, mz: 0 }, queue = []; // queue: [ticks from now, button]
  let seen = null; // the other's move we already answered
  return (me, foe) => {
    const out = { mx: plan.mx, mz: 0 };
    const dist = Math.hypot(foe.x - me.x, foe.z - me.z);
    for (const q of queue) q[0]--;
    while (queue.length && queue[0][0] <= 0) out[queue.shift()[1]] = true;
    // See a swing coming: guard it, or step round it.
    if (foe.st === 'atk' && foe.move !== seen && foe.t < MOVES[foe.move].startup) {
      seen = foe.move;
      if (me.st === 'idle' && dist < MOVES[foe.move].range + 0.5) {
        const r = rand();
        if (r < L.step && MOVES[foe.move].arc < 1) { out.mz = rand() < 0.5 ? 1 : -1; plan = { mx: 0, mz: 0 }; wait = 10; queue = []; }
        else if (r < L.step + L.guard) { plan = { mx: -1, mz: 0 }; wait = MOVES[foe.move].startup - foe.t + MOVES[foe.move].active + 4; queue = []; }
      }
    }
    if (foe.st !== 'atk') seen = null;
    // A chain: after a hit lands, maybe the next button.
    if (me.st === 'atk' && me.landed && !queue.length && me.chained !== me.move) {
      me.chained = me.move;
      const next = { lp: rand() < 0.4 ? 'lp' : 'rp', rp: rand() < 0.5 ? 'lk' : 'rk', lk: 'rk' }[me.move];
      if (next && rand() < L.chain) { queue.push([2, next]); if (next === 'rp' && rand() < L.special) out.mx = plan.mx = 1; }
    }
    if (me.st !== 'atk') me.chained = null;
    if (--wait > 0) return out;
    wait = L.think + Math.floor(rand() * 8);
    plan = { mx: 0, mz: 0 };
    if (me.st !== 'idle') return out;
    // In the air above us: hit it again.
    if (foe.st === 'air' && !foe.ko) {
      if (dist < 1.1 && foe.y > 0.2 && rand() < L.chain + 0.15) queue.push([1, rand() < 0.5 ? 'lp' : 'rp']);
      else plan.mx = dist > 0.9 ? 1 : 0;
      wait = 6;
      return out;
    }
    if (!canBeHit(foe)) { plan.mx = dist < 1.6 ? -1 : 0; wait = 12; return out; } // give them room to stand up
    const open = foe.st === 'atk' && foe.t > MOVES[foe.move].startup + MOVES[foe.move].active; // they missed or were guarded
    if (dist > 1.25) {
      if (dist < 2.6 && dist > 1.7 && rand() < L.special * 0.6) queue.push([1, 'lk'], [1, 'rk']); // the flying kick from far
      else plan.mx = 1;
      if (rand() < L.step * 0.5) out.mz = rand() < 0.5 ? 1 : -1;
      return out;
    }
    if (rand() < (open ? Math.max(L.attack, L.punish) : L.attack)) {
      const r = rand();
      if (r < L.special * 0.5 && foe.guard) queue.push([1, 'lp'], [1, 'rp']); // through the guard
      else if (r < L.special) { plan.mx = 1; queue.push([2, 'rp']); wait = 8; } // the launcher
      else queue.push([1, ['lp', 'lp', 'rp', 'lk', 'rk'][Math.floor(rand() * 5)]]);
    } else if (rand() < 0.4) { plan.mx = -1; wait = 10 + Math.floor(rand() * 14); } // back off behind a guard
    else if (rand() < L.step * 2) out.mz = rand() < 0.5 ? 1 : -1;
    return out;
  };
}

// ── A match: best of three rounds ────────────────────────────────────────
// phase: 'intro' (bow, 3-2-1) → 'fight' → 'ko' (the fall) → next round's
// intro, or 'over'. wins: [player, rival]. result: 0 the player won, 1 the
// rival, null not over yet.
const INTRO = 110, KO_HOLD = 170, MAX_ROUNDS = 5;
export function createMatch({ level = 0, rand = Math.random } = {}) {
  const m = {
    a: newFighter(0), b: newFighter(1), phase: 'intro', t: 0, round: 1, wins: [0, 0],
    left: ROUND_TICKS, result: null, roundWinner: null, timeUp: false, perfect: false,
    ai: createAi(level, rand),
  };
  m.step = (input = NO_INPUT) => {
    const ev = [];
    m.t++;
    if (m.phase === 'intro') {
      if (m.t === 1) ev.push({ k: 'round', n: m.round });
      if (m.t >= INTRO) { m.phase = 'fight'; m.t = 0; ev.push({ k: 'fight' }); }
    } else if (m.phase === 'fight') {
      ev.push(...stepFight(m.a, m.b, input, m.ai(m.b, m.a)));
      m.left--;
      const dead = m.a.hp <= 0 || m.b.hp <= 0;
      if (dead || m.left <= 0) {
        m.timeUp = !dead;
        m.roundWinner = m.a.hp === m.b.hp ? null : m.a.hp > m.b.hp ? 0 : 1;
        if (m.roundWinner != null) m.wins[m.roundWinner]++;
        m.perfect = m.roundWinner != null && (m.roundWinner ? m.b : m.a).hp === MAX_HP;
        m.phase = 'ko'; m.t = 0;
        ev.push({ k: m.timeUp ? 'time' : 'ko', winner: m.roundWinner, perfect: m.perfect });
      }
    } else if (m.phase === 'ko') {
      ev.push(...stepFight(m.a, m.b)); // the loser falls; nobody acts
      if (m.t >= KO_HOLD) {
        const done = m.wins[0] >= ROUNDS_TO_WIN || m.wins[1] >= ROUNDS_TO_WIN || m.round >= MAX_ROUNDS;
        if (done) {
          m.phase = 'over';
          m.result = m.wins[0] > m.wins[1] ? 0 : 1; // (level after five rounds: the house wins)
          ev.push({ k: 'over', result: m.result });
        } else {
          m.round++;
          m.a = newFighter(0); m.b = newFighter(1);
          m.left = ROUND_TICKS; m.phase = 'intro'; m.t = 0;
        }
      }
    }
    return ev;
  };
  return m;
}

// ── The ladder and the record ────────────────────────────────────────────
// Five rivals, easy to champion (their names and looks: game/brawl.js).
export const RIVALS = 5;
export const BRAWL_KEY = 'mk.brawl';
// { stage: the next rival to meet (0…4), best: most rivals beaten in a row
// (0…5), crowns: times the champion fell }
export function loadBrawl(store) {
  try {
    const r = JSON.parse(store?.getItem(BRAWL_KEY) || '{}');
    const n = (v, max) => (Number.isInteger(v) && v >= 0 ? Math.min(v, max) : 0);
    return { stage: n(r?.stage, RIVALS - 1), best: n(r?.best, RIVALS), crowns: n(r?.crowns, 9999) };
  } catch { return { stage: 0, best: 0, crowns: 0 }; }
}
// After a match against rival `stage`: a win moves up the ladder (beating
// the champion starts it again), a loss keeps you at the same rival.
export function afterMatch(store, stage, won) {
  const rec = loadBrawl(store);
  if (won) {
    rec.best = Math.max(rec.best, stage + 1);
    if (stage >= RIVALS - 1) { rec.crowns++; rec.stage = 0; } else rec.stage = stage + 1;
  } else rec.stage = stage;
  try { store?.setItem(BRAWL_KEY, JSON.stringify(rec)); } catch { /* storage blocked */ }
  return rec;
}
