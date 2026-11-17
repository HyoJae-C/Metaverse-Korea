// Rooftop Rumble: the arcade's 3D one-on-one fighting game (game/brawl.js
// draws it with the player's own character). Pure rules, 60 ticks a second.
//
// 2.5D: the two fighters stand on one line across the ring and always face
// each other (z stays 0; nobody walks round the other). The same keys for
// every style (Yozi 2026-11-17):
//   A D     walk toward / away
//   S held  guard (S + I: the second special)
//   J  p    attack: pressed again and again it plays the style's string
//   K  k    jump (J in the air: a jump kick)
//   L       dodge: a quick hop back, untouchable for a moment (input dash -1)
//   U  s1   a ranged shot (one in flight at a time)
//   I  s2   special 1: the style's signature, spends half the special bar;
//           S + I with a full bar: special 2, stronger and unguardable
//   close + toward + J (or + U): a grab, which no guard stops
// Damage, reach, speed and the shot differ by style (STYLES). The special
// bar (sp) fills by hitting, guarding and being hit, and is kept between
// rounds. A special still hurts through a guard (CHIP).
//
// Each fighter has a style (STYLES): its own health, speed, punch and kick
// strength, shot, one signature move, and a string from the attack button
// ending in a harder finisher.
//
// Units: metres, ticks (1/60 s), radians. Stick input: mx +1 toward the other
// fighter, -1 away; mz -1 is S held (guard), +1 (W) does nothing. On the
// wire a dodge is dash -1 (core/brawl-net.js packs these as they are).

export const TICK = 1 / 60;
export const RING_R = 4.2;
export const MAX_HP = 100;
export const ROUND_TICKS = 45 * 60;
export const ROUNDS_TO_WIN = 2;
export const BODY_R = 0.34; // fighters never stand closer than two of these
const RAGE_HP = 25, RAGE_MULT = 1.2, COUNTER_MULT = 1.25;
const WALK = 2.3 * TICK, BACK = 1.1 * TICK;
const DODGE_TICKS = 16, DODGE_DIST = 1.1, DODGE_SAFE = 11, DODGE_REST = 12; // a dodge: how long, how far back, untouchable for, then a pause
const JUMP_V = 0.1, JUMP_X = 0.035, JUMP_REST = 4; // up, and along the line while the stick is held
const GRAB_R = 0.9; // close enough for toward + J to grab
const SUPER_DMG = 1.8; // special 2 against special 1
const FINISH_MULT = 1.5; // the last hit of a style's string
const CHAIN_IN = 0.15, CHAIN_STEP = 0.1; // a chained hit ends up this far inside its reach, moving at most this far a tick
const BUFFER = 12;
export const SP_MAX = 100, SP_COST = 50; // the special bar, and what one special spends
const SP_HIT = 8, SP_BLOCKED = 3, SP_GUARD = 6, SP_HURT = 0.5; // a hit landed, a hit guarded (for who threw it, for who guarded), × the damage taken
const SPECIAL_DMG = 1.6; // (a special costs bar, so it hurts a lot more than the rest)
export const NORMAL_DAMAGE_MULT = 0.75; // every hit but a special's (applied when it lands)
const CHIP = 0.5; // of a special's damage gets through a guard (never the last point)
const KEEP_GUARD = 15; // ticks a guard holds after the other fighter blinks behind it
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
  heavy: { startup: 15, active: 4, recover: 20, dmg: 15, range: 1.1, arc: 0.45, stun: 26, block: 12, push: 0.55, lunge: 0.25, level: 9, pose: 'rp' },
  sweep: { startup: 14, active: 4, recover: 22, dmg: 11, range: 1.2, arc: 0.8, block: 12, push: 0.25, lunge: 0.15, level: 9, knock: true, pose: 'sweep' },
  jk: { startup: 5, active: 9, recover: 6, dmg: 9, range: 1.1, arc: 0.7, stun: 16, block: 9, push: 0.3, lunge: 0, level: 9, air: true, pose: 'fly' },
  grab: { startup: 11, active: 3, recover: 26, dmg: 12, range: GRAB_R + 0.05, arc: 0.7, push: 0.55, lunge: 0.1, level: 9, knock: true, unblockable: true, ground: true, pose: 'grab' },
  ranged: { startup: 13, active: 1, recover: 18, dmg: 0, range: 0, arc: 0, push: 0, lunge: 0, level: 9, pose: 'palm', shot: { speed: 6 / 60, dmg: 7, stun: 16, block: 9, push: 0.3, ttl: 45 } },
  rush: { startup: 8, active: 4, recover: 18, dmg: 12, range: 1.1, arc: 0.5, stun: 22, block: 10, push: 0.6, lunge: 0.7, level: 9, pose: 'rp' },
};
const SPECIALS = new Set(['palm', 'fly', 'super']);
export const moveTicks = (m) => m.startup + m.active + m.recover;

// ── Styles ───────────────────────────────────────────────────────────────
// hp, walk and dash (× the usual), punch and kick: [time ×, damage ×] (a time
// under 1 is quicker). sig: the signature move and the slot it takes ('palm'
// = both punches, 'fly' = both kicks); the other slot keeps the usual move.
//   blink   steps behind the other fighter just before it hits
//   armor   a hit taken while winding up hurts but does not stop it
//   hits    hits several times (gap: ticks between), knockLast: the last one floors
//   glide   moves this far forward while it is out
//   ground  cannot catch someone in the air (a grab)
//   shot    throws a slow ball of light instead of hitting
//   spin    whole turns of the body (for the picture)
// shot: [speed ×, damage ×, reach ×] of the ranged shot (U).
// combos: [the punch button's string (from lp), the kick button's (from lk)].
export const STYLES = {
  brawler: { hp: 100, walk: 1, dash: 1, shot: [1, 1, 1], punch: [1, 1], kick: [1, 1], sig: null, slot: 'palm', combos: [['lp', 'rp', 'lk', 'rk'], ['lk', 'rp', 'rk']] },
  ninja: {
    hp: 85, walk: 1.25, dash: 1.3, punch: [0.85, 0.85], kick: [0.9, 0.9], shot: [1.25, 0.85, 1.1], slot: 'fly',
    sig: { startup: 16, active: 4, recover: 22, dmg: 15, range: 1.15, arc: 1.2, block: 10, push: 0.5, lunge: 0, level: 9, knock: true, blink: true, pose: 'rk' },
    combos: [['lp', 'lp', 'lp', 'rk'], ['lk', 'lk', 'rk']],
  },
  tank: {
    hp: 110, walk: 0.8, dash: 0.8, punch: [1.3, 1.1], kick: [1.3, 1.1], shot: [0.75, 1.3, 0.8], slot: 'palm',
    sig: { startup: 20, active: 5, recover: 30, dmg: 15, range: 1.0, arc: 0.5, block: 14, push: 1.1, lunge: 1.3, level: 9, knock: true, armor: true, pose: 'charge' },
    combos: [['lp', 'rp', 'rp'], ['lk', 'rk']],
  },
  kicker: {
    hp: 95, walk: 1.1, dash: 1.1, punch: [1.1, 0.8], kick: [0.8, 1.1], shot: [1.1, 0.9, 0.9], slot: 'fly',
    sig: { startup: 14, active: 22, recover: 24, dmg: 8, hits: 3, gap: 7, range: 1.3, arc: 3.2, stun: 14, block: 8, push: 0.3, lunge: 0.5, level: 9, knockLast: true, spin: 2, pose: 'rk' },
    combos: [['lp', 'lk', 'lk', 'rk'], ['lk', 'rk', 'rk']],
  },
  boxer: {
    hp: 100, walk: 1.1, dash: 1.25, punch: [0.8, 1.2], kick: [1.15, 0.8], shot: [1, 1.1, 0.7], slot: 'palm',
    sig: { startup: 15, active: 4, recover: 24, dmg: 20, range: 1.05, arc: 0.9, block: 14, push: 0.8, lunge: 0.5, level: 9, knock: true, pose: 'hook' },
    combos: [['lp', 'lp', 'rp', 'rp'], ['lk', 'lp', 'rp']],
  },
  grappler: {
    hp: 115, walk: 0.9, dash: 0.9, punch: [1.05, 1.05], kick: [1.1, 1], shot: [0.8, 1.2, 0.7], slot: 'palm',
    sig: { startup: 15, active: 4, recover: 30, dmg: 24, range: 0.9, arc: 0.6, push: 0.3, lunge: 0.25, level: 9, knock: true, unblockable: true, ground: true, pose: 'grab' },
    combos: [['lp', 'rp', 'rp'], ['lk', 'rp']],
  },
  mystic: {
    hp: 90, walk: 1, dash: 1, punch: [1, 0.95], kick: [1, 0.95], shot: [1, 1, 1.4], slot: 'palm',
    sig: { startup: 20, active: 1, recover: 22, dmg: 0, range: 0, arc: 0, push: 0, lunge: 0, level: 9, pose: 'palm', shot: { speed: 5.5 / 60, dmg: 10, stun: 18, block: 10, push: 0.3, ttl: 80 } },
    combos: [['lp', 'rp', 'lk'], ['lk', 'lk', 'rp']],
  },
  dancer: {
    hp: 92, walk: 1.15, dash: 1.2, punch: [1, 0.9], kick: [0.95, 1], shot: [1.15, 0.9, 1], slot: 'fly',
    sig: { startup: 14, active: 20, recover: 30, dmg: 5, hits: 3, gap: 7, range: 1.1, arc: 3.2, stun: 12, block: 7, push: 0.2, lunge: 0.2, glide: 0.9, level: 9, knockLast: true, spin: 3, pose: 'mill' },
    combos: [['lp', 'lk', 'rk'], ['lk', 'lp', 'rk']],
  },
};
export const STYLE_IDS = Object.keys(STYLES);
// A style's own move table.
export function movesFor(styleId) {
  const st = STYLES[styleId] || STYLES.brawler, out = {};
  for (const [id, m] of Object.entries(MOVES)) {
    const [time, dmg] = id === 'lk' || id === 'rk' || id === 'fly' || id === 'sweep' ? st.kick : st.punch;
    out[id] = { ...m, startup: Math.max(4, Math.round(m.startup * time)), recover: Math.round(m.recover * time), dmg: Math.round(m.dmg * dmg) };
  }
  if (st.sig) out[st.slot] = { ...st.sig };
  const [sv, sd, sr] = st.shot || [1, 1, 1], base = MOVES.ranged.shot;
  out.ranged.shot = { ...base, speed: base.speed * sv, dmg: Math.round(base.dmg * sd), ttl: Math.round(base.ttl * sr / sv) };
  // Special 2: the signature again, stronger, and no guard stops it.
  const sig = out[st.slot];
  out.super = { ...sig, unblockable: true, knock: !sig.hits, knockLast: !!sig.hits, pose: sig.pose || st.slot, shot: sig.shot ? { ...sig.shot } : undefined };
  if (!out.super.shot) delete out.super.shot;
  for (const id of SPECIALS) {
    const k = SPECIAL_DMG * (id === 'super' ? SUPER_DMG : 1);
    out[id].dmg = Math.round(out[id].dmg * k);
    if (out[id].shot) out[id].shot = { ...out[id].shot, dmg: Math.round(out[id].shot.dmg * k) };
  }
  return out;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// A small seeded random (the same match on every run of a test).
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

export function newFighter(side, style = 'brawler') {
  const st = STYLES[style] ? style : 'brawler';
  return {
    style: st, mv: movesFor(st), maxHp: STYLES[st].hp, seq: [], fin: false, armored: false, hits: 0, hitAt: 0, shot: null,
    side, x: side ? 1.1 : -1.1, z: 0, y: 0, vy: 0, vx: 0, vz: 0, jx: 0,
    face: side ? Math.PI : 0, // 0 looks along +x
    hp: STYLES[st].hp, st: 'idle', t: 0, move: null, hit: false, landed: false,
    stun: 0, rest: 0, juggle: 0, walk: 0, guard: false, keep: 0, rage: false, chain: false, sp: 0,
    buf: { p: 0, k: 0, s1: 0, s2: 0 }, combo: 0, comboT: 0,
  };
}
const NO_INPUT = { mx: 0, mz: 0 };
const canBeHit = (f) => f.st !== 'down' && f.st !== 'getup' && f.st !== 'ko' && !(f.st === 'dodge' && f.t <= DODGE_SAFE);

// Which move the waiting presses ask for (null: none). level 0: free to
// start anything; above: in a move that landed. near: close enough to grab.
function wanted(f, inp, level = 0, near = false) {
  const b = f.buf;
  if (b.s2) {
    if (inp.mz < -0.5 && f.sp >= SP_MAX) return 'super';
    if (f.sp >= SP_COST) return STYLES[f.style].slot;
  }
  const grab = level === 0 && near && inp.mx > 0.5;
  if (b.s1 && level === 0) return grab ? 'grab' : f.shot ? null : 'ranged';
  if (!b.p) return null;
  if (level === 0) return grab ? 'grab' : STYLES[f.style].combos[0][0];
  // The button again: the string goes on.
  const c = STYLES[f.style].combos[0];
  return c.length > f.seq.length && f.seq.every((k, i) => c[i] === k) ? c[f.seq.length] : null;
}
// A move from standing (or a dash): a special is announced.
function begin(f, id, ev) {
  f.seq = [id]; startMove(f, id);
  if (SPECIALS.has(id)) ev.push({ k: 'super', who: f.side, move: id });
}
const gain = (f, n) => { f.sp = clamp(f.sp + n, 0, SP_MAX); };
export function startMove(f, id) {
  f.chain = false; f.st = 'atk'; f.move = id; f.t = 0; f.hit = false; f.landed = false; f.guard = false; f.armored = false; f.hits = 0; f.fin = false;
  f.buf.p = f.buf.k = f.buf.s1 = f.buf.s2 = 0;
  if (SPECIALS.has(id)) f.sp -= id === 'super' ? SP_MAX : SP_COST;
}

function hurt(a, d, m, id, face, ev, fin = false) {
  const cos = Math.cos(face), sin = Math.sin(face);
  const air = d.st === 'air' || d.y > 0.05; // (hit in a jump: they fall)
  const theirs = d.st === 'atk' ? d.mv[d.move] : null;
  const counter = !!theirs && d.t < theirs.startup + theirs.active;
  let dmg = m.dmg * (SPECIALS.has(id) || id === 'shot' ? 1 : NORMAL_DAMAGE_MULT) * (a.rage ? RAGE_MULT : 1) * (counter ? COUNTER_MULT : 1) * (fin ? FINISH_MULT : 1);
  if (air) { d.juggle++; if (!fin) dmg *= 0.7 ** d.juggle; } // (a string's finisher counts in full)
  dmg = Math.max(1, Math.round(dmg));
  d.hp = Math.max(0, d.hp - dmg);
  if (m.level < 9 && id !== 'shot') gain(a, SP_HIT);
  gain(d, dmg * SP_HURT);
  a.combo = a.comboT > 0 ? a.combo + 1 : 1;
  a.comboT = 50;
  // Armour: winding up a heavy move, the first hit hurts but does not stop it.
  if (theirs?.armor && !d.armored && d.t <= theirs.startup && d.hp > 0 && !m.launch && !m.unblockable) {
    d.armored = true;
    ev.push({ k: 'hit', by: a.side, move: id, dmg, counter: false, armor: true, combo: a.combo, x: d.x, z: d.z, y: d.y + 0.75 });
    return;
  }
  const knock = m.knock || fin || (m.knockLast && a.hits >= m.hits);
  d.move = null; d.guard = false; d.t = 0; d.seq = [];
  d.vx = cos * m.push * 0.16; d.vz = sin * m.push * 0.16;
  if (d.hp <= 0) {
    d.st = 'air'; d.vy = 0.085; d.vx = cos * 0.05; d.vz = sin * 0.05; d.ko = true;
  } else if (air) {
    d.st = 'air'; d.vy = d.juggle >= MAX_JUGGLE ? 0.02 : 0.075; d.vx = cos * 0.02; d.vz = sin * 0.02;
  } else if (m.launch) {
    d.st = 'air'; d.vy = 0.135; d.juggle = 0; d.vx = cos * 0.005; d.vz = sin * 0.005;
  } else if (knock) {
    d.st = 'air'; d.vy = 0.07; d.juggle = MAX_JUGGLE; d.vx = cos * 0.055; d.vz = sin * 0.055;
  } else { d.st = 'hit'; d.stun = (m.stun || 14) + (counter ? 6 : 0); }
  ev.push({ k: 'hit', by: a.side, move: id, dmg, counter, fin, launch: !!m.launch && !air, air, combo: a.combo, x: d.x, z: d.z, y: d.y + 0.75, ko: d.hp <= 0 });
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
  if (f.keep > 0) f.keep--;
  f.z = 0;
  const dx = o.x - f.x, dist = Math.abs(dx) || 1e-6;
  const toward = dx >= 0 ? 0 : Math.PI, dir = dx >= 0 ? 1 : -1;
  const near = dist < GRAB_R && o.y < 0.3;
  f.t++;
  f.walk = 0;
  if (f.st === 'idle') {
    f.face = toward;
    // S held guards. (A guard held when the other blinked in still holds for a moment.)
    f.guard = inp.mz < -0.5 || f.keep > 0;
    const id = wanted(f, inp, 0, near);
    if (id) { begin(f, id, ev); return; }
    if (inp.dash < 0 && !f.rest) { f.st = 'dodge'; f.t = 0; f.guard = false; ev.push({ k: 'dash', who: f.side }); return; }
    if (f.buf.k && !f.rest) {
      f.buf.k = 0; f.st = 'jump'; f.t = 0; f.guard = false; f.vy = JUMP_V;
      f.jx = (inp.mx > 0.3 ? 1 : inp.mx < -0.3 ? -1 : 0) * dir * JUMP_X * STYLES[f.style].walk;
      ev.push({ k: 'jump', who: f.side });
      return;
    }
    if (f.guard) return;
    const sp = STYLES[f.style].walk;
    if (inp.mx > 0.3 && dist > BODY_R * 2 + 0.02) { f.x += dir * WALK * sp; f.walk = 1; }
    else if (inp.mx < -0.3) { f.x -= dir * BACK * sp; f.walk = -1; }
  } else if (f.st === 'jump') {
    f.face = toward;
    f.y += f.vy; f.vy -= GRAVITY; f.x += f.jx;
    if (f.buf.p && f.y > 0.15) { // J in the air: a jump kick
      f.seq = ['jk']; startMove(f, 'jk');
      return;
    }
    if (f.y <= 0 && f.vy < 0) { f.y = 0; f.vy = 0; f.jx = 0; f.st = 'idle'; f.t = 0; f.rest = JUMP_REST; }
  } else if (f.st === 'dodge') {
    // A hop back, untouchable for the first part of it.
    f.face = toward;
    f.x -= dir * DODGE_DIST * STYLES[f.style].dash / DODGE_TICKS;
    f.y = Math.sin(Math.min(1, f.t / DODGE_TICKS) * Math.PI) * 0.12;
    if (f.t >= DODGE_TICKS) { f.st = 'idle'; f.t = 0; f.y = 0; f.rest = DODGE_REST; }
  } else if (f.st === 'atk') {
    const m = f.mv[f.move];
    if (m.air) { // a jump kick: still flying
      f.y += f.vy; f.vy -= GRAVITY; f.x += f.jx;
      if (f.y <= 0) { f.y = 0; f.vy = 0; f.jx = 0; f.st = 'idle'; f.t = 0; f.move = null; f.seq = []; f.rest = JUMP_REST; return; }
    } else if (f.t <= m.startup) {
      if (f.move === 'rk') f.face += clamp(wrap(toward - f.face), -0.03, 0.03); // the roundhouse follows a little
      const room = dist - BODY_R * 2;
      // The next hit of a string steps in as far as it must: the last hit
      // pushed them back, and a punch after a kick would fall short.
      let want = m.lunge / m.startup;
      if (f.chain && m.range) want = clamp((dist - m.range + CHAIN_IN) / Math.max(1, m.startup - f.t + 1) + Math.hypot(o.vx, o.vz), want, CHAIN_STEP);
      const stepF = Math.min(want, Math.max(0, room - 0.05));
      f.x += Math.cos(f.face) * stepF; f.z += Math.sin(f.face) * stepF;
    }
    // Signature moves: behind them in a blink, a ball of light, a glide, several hits.
    if (m.blink && f.t === m.startup - 1 && dist < 3.4) {
      // (2.5D: right in front of them, never past them)
      const from = [f.x, f.z];
      f.x = o.x - Math.sign(dx || 1) * (BODY_R * 2 + 0.05);
      inRing(f);
      if (o.guard) o.keep = KEEP_GUARD;
      ev.push({ k: 'blink', who: f.side, from, x: f.x, z: f.z });
    }
    if (m.shot && f.t === m.startup && !f.shot) {
      f.shot = { x: f.x + Math.cos(f.face) * 0.5, z: 0, dx: Math.sign(Math.cos(f.face)) || 1, dz: 0, t: 0, m: f.move };
      ev.push({ k: 'shot', who: f.side });
    }
    if (m.glide && f.t > m.startup && f.t <= m.startup + m.active) {
      const g = Math.min(m.glide / m.active, Math.max(0, dist - BODY_R * 2 - 0.05));
      f.x += Math.cos(f.face) * g; f.z += Math.sin(f.face) * g;
      f.face = toward;
    }
    if (m.hits && f.hit && f.hits < m.hits && f.t - f.hitAt >= m.gap) f.hit = false;
    if (m.leap) { const u = clamp(f.t / (m.startup + m.active + 6), 0, 1); f.y = Math.sin(u * Math.PI) * m.leap; }
    if (f.t === m.startup) ev.push({ k: 'swing', by: f.side, move: f.move });
    const end = m.startup + m.active;
    // A hit that landed (or was guarded) chains into a heavier button.
    if (f.landed && f.t > end && f.t <= end + 12 && m.level < 9) {
      const next = wanted(f, inp, m.level);
      if (next) {
        f.seq.push(next);
        const fin = STYLES[f.style].combos.some((c) => c.length === f.seq.length && c.every((q, i) => q === f.seq[i]));
        startMove(f, next); f.chain = true; f.fin = fin; f.face = toward;
        return;
      }
    }
    if (f.t >= moveTicks(m) && !m.air) { f.st = 'idle'; f.t = 0; f.move = null; f.y = 0; f.chain = false; f.seq = []; f.fin = false; }
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
    const quick = inp.p || inp.k || inp.s1 || inp.s2 || inp.mx;
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
  const m = a.mv[a.move];
  if (!m.range || a.t <= m.startup || a.t > m.startup + m.active) return false;
  if (!canBeHit(d) || d.y > 1.5 || (m.ground && d.st === 'air')) return false;
  const dx = d.x - a.x, dz = d.z - a.z;
  return Math.hypot(dx, dz) <= m.range && Math.abs(wrap(Math.atan2(dz, dx) - a.face)) <= m.arc;
}
// It does: guarded, or it hurts. (move and face: a's, as they were when it reached.)
function land(a, d, id, face, ev) {
  const m = a.mv[id];
  a.hit = true; a.landed = true; a.hits++; a.hitAt = a.t;
  if (d.guard && (d.st === 'idle' || d.st === 'block') && !m.unblockable) {
    d.st = 'block'; d.stun = m.block; d.t = 0;
    if (SPECIALS.has(id)) d.hp = Math.max(1, d.hp - Math.round(m.dmg * CHIP));
    if (m.level < 9) gain(a, SP_BLOCKED);
    gain(d, SP_GUARD);
    d.vx = Math.cos(face) * m.push * 0.12; d.vz = Math.sin(face) * m.push * 0.12;
    ev.push({ k: 'block', by: a.side, move: id, x: d.x, z: d.z, y: 0.8 });
    return;
  }
  if (a.fin) ev.push({ k: 'combo', by: a.side, n: a.seq.length });
  hurt(a, d, m, id, face, ev, a.fin);
}

// A ball of light in flight: it stops at a guard, a body or the ring's edge.
function fly(a, d, ev) {
  const s = a.shot, m = s && a.mv[s.m || STYLES[a.style].slot]?.shot;
  if (!s || !m) { a.shot = null; return; }
  s.t++; s.x += s.dx * m.speed; s.z += s.dz * m.speed;
  if (s.t > m.ttl || Math.abs(s.x) > RING_R + 0.6) { a.shot = null; return; }
  if (!canBeHit(d) || d.y > 1 || Math.hypot(d.x - s.x, d.z - s.z) > 0.5) return;
  a.shot = null;
  const face = Math.atan2(s.dz, s.dx);
  if (d.guard && (d.st === 'idle' || d.st === 'block')) {
    d.st = 'block'; d.stun = m.block; d.t = 0;
    d.hp = Math.max(1, d.hp - Math.round(m.dmg * CHIP));
    gain(d, SP_GUARD);
    ev.push({ k: 'block', by: a.side, move: 'shot', x: d.x, z: d.z, y: 0.8 });
  } else hurt(a, d, m, 'shot', face, ev);
}

// Never inside each other on the ground, and never past each other (2.5D:
// the one on the left stays on the left; in the air they may come close).
// order: +1 when a was on the left at the start of the tick.
function apart(a, b, order) {
  const max = RING_R - BODY_R;
  for (const f of [a, b]) { f.x = clamp(f.x, -max, max); f.z = 0; }
  const min = a.y > 0.5 || b.y > 0.5 ? 0.12 : BODY_R * 2;
  const gap = (b.x - a.x) * order;
  if (gap >= min) return;
  const mid = (a.x + b.x) / 2;
  let ax = mid - (order * min) / 2, bx = mid + (order * min) / 2;
  // (against the rope: the other one gives way)
  if (Math.abs(ax) > max) { ax = Math.sign(ax) * max; bx = ax + order * min; }
  if (Math.abs(bx) > max) { bx = Math.sign(bx) * max; ax = bx - order * min; }
  a.x = ax; b.x = bx;
}
function inRing(f) {
  const max = RING_R - BODY_R;
  f.x = clamp(f.x, -max, max); f.z = 0;
}

// One tick of the fight for both fighters. Returns what happened.
export function stepFight(a, b, ia = NO_INPUT, ib = NO_INPUT) {
  const ev = [];
  const order = b.x >= a.x ? 1 : -1;
  act(a, b, ia, ev); act(b, a, ib, ev);
  // Both in the same tick is a trade: each hits the other.
  const ra = reaches(a, b) && [a.move, a.face], rb = reaches(b, a) && [b.move, b.face];
  if (ra) land(a, b, ra[0], ra[1], ev);
  if (rb) land(b, a, rb[0], rb[1], ev);
  fly(a, b, ev); fly(b, a, ev);
  apart(a, b, order);
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
  let wait = 20, plan = { mx: 0, mz: 0 }, queue = []; // queue: [ticks from now, button ('super': S + I)]
  let seen = null; // the other's move we already answered
  return (me, foe) => {
    const out = { mx: plan.mx, mz: plan.mz };
    const dist = Math.abs(foe.x - me.x);
    for (const q of queue) q[0]--;
    while (queue.length && queue[0][0] <= 0) { const b = queue.shift()[1]; if (b === 'super') { out.mz = -1; out.s2 = true; } else if (b === 'dodge') out.dash = -1; else out[b] = true; }
    // See a swing (or a shot) coming: guard it, or dodge it.
    const swing = foe.st === 'atk' && foe.move !== seen && foe.t < foe.mv[foe.move].startup;
    if (swing) {
      seen = foe.move;
      const m = foe.mv[foe.move];
      if (me.st === 'idle' && (dist < (m.range || 0) + 0.6 || m.shot)) {
        const r = rand();
        if (r < L.step) { out.dash = -1; plan = { mx: 0, mz: 0 }; wait = 14; queue = []; }
        else if (r < L.step + L.guard) { plan = { mx: 0, mz: -1 }; wait = m.startup - foe.t + m.active + 4 + (m.shot ? 20 : 0); queue = []; }
      }
    }
    if (foe.st !== 'atk') seen = null;
    // A chain: after a hit lands, maybe the next button.
    if (me.st === 'atk' && me.landed && !queue.length && me.chained !== me.move) {
      me.chained = me.move;
      const c = STYLES[me.style].combos[0];
      const more = c.length > me.seq.length && me.seq.every((q, i) => c[i] === q);
      if (more && rand() < L.chain) queue.push([2, 'p']);
    }
    if (me.st !== 'atk') me.chained = null;
    if (me.st === 'jump' && me.vy < 0.04 && dist < 1.4 && !queue.length && rand() < 0.5) queue.push([1, 'p']); // a jump kick on the way down
    if (--wait > 0) return out;
    wait = L.think + Math.floor(rand() * 8);
    plan = { mx: 0, mz: 0 };
    if (me.st !== 'idle') return out;
    if (foe.st === 'air' && !foe.ko) { // in the air: hit it again
      if (dist < 1.1 && foe.y > 0.2 && rand() < L.chain + 0.15) queue.push([1, 'p']);
      else plan.mx = dist > 0.9 ? 1 : 0;
      wait = 6;
      return out;
    }
    if (!canBeHit(foe) && foe.st !== 'dodge') { plan.mx = dist < 1.6 ? -1 : 0; wait = 12; return out; } // give them room to stand up
    const open = foe.st === 'atk' && foe.t > foe.mv[foe.move].startup + foe.mv[foe.move].active; // they missed or were guarded
    if (dist > 1.25) {
      const reach = me.mv.palm.shot || me.mv.fly.blink || me.mv.palm.armor || me.mv.fly.glide; // a signature that works from far
      if (me.sp >= SP_MAX && reach && dist < 3.2 && rand() < L.special) queue.push([1, 'super']);
      else if (me.sp >= SP_COST && reach && dist < 3.2 && rand() < L.special * 1.2) queue.push([1, 's2']);
      else if (!me.shot && dist > 2 && rand() < 0.15 + L.special) queue.push([1, 's1']); // the shot
      else if (dist < 2.6 && rand() < 0.08 + L.step) { out.k = true; plan.mx = 1; wait = 8; } // jump in
      else plan.mx = 1;
      return out;
    }
    if (rand() < (open ? Math.max(L.attack, L.punish) : L.attack)) {
      const r = rand();
      if (me.sp >= SP_MAX && r < L.special * 0.4) queue.push([1, 'super']);
      else if (me.sp >= SP_COST && r < L.special * 0.6) queue.push([1, 's2']);
      else if (r < L.special && dist < GRAB_R) { plan.mx = 1; queue.push([1, 'p']); wait = 6; } // toward + J up close: a grab
      else queue.push([1, 'p']);
    } else if (rand() < 0.4) { plan = { mx: 0, mz: -1 }; wait = 10 + Math.floor(rand() * 14); } // wait behind a guard
    else if (rand() < L.step * 2) queue.push([1, 'dodge']);
    else plan.mx = -1;
    return out;
  };
}

// ── A match: best of three rounds ────────────────────────────────────────
// phase: 'intro' (bow, 3-2-1) → 'fight' → 'ko' (the fall) → next round's
// intro, or 'over'. wins: [player, rival]. result: 0 the player won, 1 the
// rival, null not over yet.
const INTRO = 110, KO_HOLD = 170, MAX_ROUNDS = 5;
// One tick of a match for both fighters (ia, ib: their inputs). The match is
// plain data, so two players' screens can copy it and run it again
// (core/brawl-net.js). versus: two people; level after five rounds is a draw
// (result 2) instead of the house winning.
export function newMatch(style = 'brawler', rivalStyle = 'brawler', versus = false) {
  return {
    a: newFighter(0, style), b: newFighter(1, rivalStyle), styles: [style, rivalStyle], versus, phase: 'intro', t: 0, round: 1, wins: [0, 0],
    left: ROUND_TICKS, result: null, roundWinner: null, timeUp: false, perfect: false,
  };
}
export function stepMatch(m, ia = NO_INPUT, ib = NO_INPUT) {
  const ev = [];
  m.t++;
  if (m.phase === 'intro') {
    if (m.t === 1) ev.push({ k: 'round', n: m.round });
    if (m.t >= INTRO) { m.phase = 'fight'; m.t = 0; ev.push({ k: 'fight' }); }
  } else if (m.phase === 'fight') {
    ev.push(...stepFight(m.a, m.b, ia, typeof ib === 'function' ? ib() : ib));
    m.left--;
    const dead = m.a.hp <= 0 || m.b.hp <= 0;
    if (dead || m.left <= 0) {
      m.timeUp = !dead;
      const ra = m.a.hp / m.a.maxHp, rb = m.b.hp / m.b.maxHp; // (on time: who has more of their own bar left)
      m.roundWinner = ra === rb ? null : ra > rb ? 0 : 1;
      if (m.roundWinner != null) m.wins[m.roundWinner]++;
      m.perfect = m.roundWinner != null && (m.roundWinner ? m.b : m.a).hp === (m.roundWinner ? m.b : m.a).maxHp;
      m.phase = 'ko'; m.t = 0;
      ev.push({ k: m.timeUp ? 'time' : 'ko', winner: m.roundWinner, perfect: m.perfect });
    }
  } else if (m.phase === 'ko') {
    ev.push(...stepFight(m.a, m.b)); // the loser falls; nobody acts
    if (m.t >= KO_HOLD) {
      const done = m.wins[0] >= ROUNDS_TO_WIN || m.wins[1] >= ROUNDS_TO_WIN || m.round >= MAX_ROUNDS;
      if (done) {
        m.phase = 'over';
        // (level after five rounds: the house wins; between two people, a draw)
        m.result = m.wins[0] > m.wins[1] ? 0 : m.wins[0] === m.wins[1] && m.versus ? 2 : 1;
        ev.push({ k: 'over', result: m.result });
      } else {
        m.round++;
        const sp = [m.a.sp, m.b.sp]; // (the special bar is kept)
        m.a = newFighter(0, m.styles[0]); m.b = newFighter(1, m.styles[1]);
        m.a.sp = sp[0]; m.b.sp = sp[1];
        m.left = ROUND_TICKS; m.phase = 'intro'; m.t = 0;
      }
    }
  }
  return ev;
}
export function createMatch({ level = 0, rand = Math.random, style = 'brawler', rivalStyle = 'brawler' } = {}) {
  const m = newMatch(style, rivalStyle);
  m.ai = createAi(level, rand);
  // m.onStep(ia, ib): what each tick was played with (the arcade's wall
  // screen replays it: core/brawl-tv.js).
  m.step = (input = NO_INPUT) => {
    const ib = m.phase === 'fight' ? m.ai(m.b, m.a) : NO_INPUT;
    const ev = stepMatch(m, input, ib);
    m.onStep?.(input, ib);
    return ev;
  };
  return m;
}
// A copy of a match two screens can send each other or run ahead on: the
// fighters' move tables (the same for a style everywhere) are left out and
// put back.
const copyFighter = (f, mv) => ({ ...f, mv, seq: [...f.seq], buf: { ...f.buf }, shot: f.shot ? { ...f.shot } : null });
export function copyMatch(m) {
  return { ...m, a: copyFighter(m.a, m.a.mv), b: copyFighter(m.b, m.b.mv), wins: [...m.wins], styles: [...m.styles] };
}
export function packMatch(m) {
  return { ...m, a: copyFighter(m.a, undefined), b: copyFighter(m.b, undefined), wins: [...m.wins], styles: [...m.styles] };
}
export function unpackMatch(o) {
  return { ...o, a: copyFighter(o.a, movesFor(o.a.style)), b: copyFighter(o.b, movesFor(o.b.style)), wins: [...o.wins], styles: [...o.styles] };
}

// ── The ladder and the record ────────────────────────────────────────────
// Five rivals, easy to champion (their names and looks: game/brawl.js).
export const RIVALS = 5;
export const BRAWL_KEY = 'mk.brawl';
// { stage: the next rival to meet (0…4), best: most rivals beaten in a row
// (0…5), crowns: times the champion fell, style: the style last picked }
export function saveStyle(store, style) {
  const rec = loadBrawl(store);
  rec.style = STYLES[style] ? style : null;
  try { store?.setItem(BRAWL_KEY, JSON.stringify(rec)); } catch { /* storage blocked */ }
  return rec;
}
export function loadBrawl(store) {
  try {
    const r = JSON.parse(store?.getItem(BRAWL_KEY) || '{}');
    const n = (v, max) => (Number.isInteger(v) && v >= 0 ? Math.min(v, max) : 0);
    return { stage: n(r?.stage, RIVALS - 1), best: n(r?.best, RIVALS), crowns: n(r?.crowns, 9999), style: STYLES[r?.style] ? r.style : null };
  } catch { return { stage: 0, best: 0, crowns: 0, style: null }; }
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
