// Snowballs and snowmen: the rules, with no three.js (see game/snowman.js
// for the game and the models).
//
// A snowball grows one step with each press: 20 steps make a stage, eight
// stages (a snowman looks like an 8) from a fist-sized ball to a giant one
// taller than a person.
// Stages 1-3 you gather snow into it with your hands; from stage 4 it's
// too big for that and you roll it. Friends can push the same ball: every
// push counts, and with more people pushing it rolls further each time.
// Growing from stage 7 to 8, and rolling a stage-8 ball, takes at least two
// people pushing together.

export const STEPS = 20; // presses per stage
export const STAGES = 8;
export const MAX_N = STEPS * STAGES; // 160
export const ROLL_FROM = 4; // stages 1-3 gather, 4+ roll
export const CREW_STAGE = 8; // reaching and rolling this stage (the giant) needs two people
export const CREW_WINDOW_MS = 2500; // pushes this close together count as pushing together
export const MAX_BALLS = 3; // each player's snowballs and snowmen in the street
export const MIN_SNOW = 0.5; // how deep the snow on the ground has to be to gather it

// Diameter (m) at the start of each stage, and at the very end.
// fist, palm, knee, waist, chest, shoulder, a person, giant, (fully grown
// giant: the same size as when there were seven stages)
export const DIAMETERS = [0.2, 0.3, 0.42, 0.6, 0.8, 1.02, 1.3, 1.75, 2.3];

export const stageOf = (n) => Math.min(STAGES, Math.floor(Math.max(0, n) / STEPS) + 1);
export const stepOf = (n) => (n >= MAX_N ? STEPS : Math.max(0, n) % STEPS); // presses into the stage
export function diameterOf(n) {
  const c = Math.max(0, Math.min(MAX_N, n));
  const i = Math.min(STAGES - 1, Math.floor(c / STEPS));
  const f = (c - i * STEPS) / STEPS;
  return DIAMETERS[i] + (DIAMETERS[i + 1] - DIAMETERS[i]) * f;
}
export const rollable = (n) => stageOf(n) >= ROLL_FROM;

// How far one push rolls the ball (m): further with more people pushing.
export const rollDistance = (crew) => 0.5 * (1 + 0.6 * (Math.max(1, Math.min(4, crew)) - 1));

// What one push does to a ball of n steps with `crew` people pushing:
// { grow: steps added, move: metres rolled, why: a reason it did nothing }.
export function pushResult(n, crew) {
  if (!rollable(n)) return { grow: 0, move: 0, why: 'gather' };
  if (stageOf(n) >= CREW_STAGE && crew < 2) return { grow: 0, move: 0, why: 'heavy' }; // a giant: not alone
  const atGate = n >= (CREW_STAGE - 1) * STEPS - 1 && n < (CREW_STAGE - 1) * STEPS; // the last step before giant
  const grow = n >= MAX_N ? 0 : atGate && crew < 2 ? 0 : 1;
  return { grow, move: rollDistance(crew), why: grow ? null : n >= MAX_N ? 'full' : 'friend' };
}

// How many different people pushed within the window before `now`.
export function crewSize(pushes, now) {
  const who = new Set();
  for (const p of pushes) if (now - p.at <= CREW_WINDOW_MS) who.add(p.who);
  return Math.max(1, who.size);
}

// A snowman: a smaller ball put on top of a bigger one. Any head but a
// giant can be lifted (up to stage 7).
export const LIFT_STAGE = CREW_STAGE - 1;
export const canTop = (head, body) => head > 0 && head < body && stageOf(head) <= LIFT_STAGE;
export const liftable = (n) => stageOf(n) <= LIFT_STAGE;

// Our balls go in our state as "k,x,z,n[,h,ry[,t]]" joined by ";": k a small
// id, n the body's steps, h the head's (a snowman), ry the way its face
// looks, t a hat someone put on it ("cap" or "bucket~mint": a hat id and
// the hat workshop colour).
export function encodeBalls(list) {
  return list.map((b) => {
    const base = [b.k, b.x.toFixed(2), b.z.toFixed(2), b.n | 0];
    if (b.h) base.push(b.h | 0, (+b.ry || 0).toFixed(2));
    if (b.h && validHat(b.t)) base.push(b.t);
    return base.join(',');
  }).join(';');
}
export function parseBalls(s) {
  if (typeof s !== 'string' || !s || s.length > 260) return [];
  const out = [];
  for (const part of s.split(';').slice(0, MAX_BALLS)) {
    const raw = part.split(',');
    const [k, x, z, n, h, ry] = raw.map(Number);
    if (![k, x, z, n].every(Number.isFinite) || n <= 0 || n > MAX_N) continue;
    const b = { k: k | 0, x, z, n: n | 0 };
    if (Number.isFinite(h) && h > 0 && h < n) {
      b.h = h | 0; b.ry = Number.isFinite(ry) ? ry : 0;
      if (validHat(raw[6])) b.t = raw[6];
    }
    out.push(b);
  }
  return out;
}

// A hat for a snowman: "id" or "id~colour", letters, digits and dashes.
export const validHat = (t) => typeof t === 'string' && /^[a-z0-9-]{1,24}(~[a-z0-9-]{1,16})?$/i.test(t);
export const hatOf = (look) => (look?.head ? look.head + (look.hatColor ? '~' + look.hatColor : '') : null);
export const hatLook = (t) => { const [head, hatColor] = String(t).split('~'); return { head, hatColor: hatColor || null }; };

// Messages to a ball's owner: a push ("sbp:owner:k:yaw"), a head put on
// top ("sbh:owner:k:n:ry") and a hat put on a snowman ("sbt:owner:k:hat").
export const pushMsg = (owner, k, yaw) => `sbp:${owner}:${k}:${(+yaw).toFixed(2)}`;
export const headMsg = (owner, k, n, ry) => `sbh:${owner}:${k}:${n | 0}:${(+ry).toFixed(2)}`;
export const hatMsg = (owner, k, t) => `sbt:${owner}:${k}:${t}`;
export function parseSnowMsg(e) {
  if (typeof e !== 'string' || !/^sb[pht]:/.test(e)) return null;
  const parts = e.split(':');
  const kind = { sbp: 'push', sbh: 'head', sbt: 'hat' }[parts[0]];
  const owner = parts[1];
  const k = Number(parts[2]);
  if (!owner || !Number.isFinite(k)) return null;
  if (kind === 'hat') return validHat(parts[3]) ? { kind, owner, k, t: parts[3] } : null;
  if (kind === 'push') {
    const yaw = Number(parts[3]);
    return Number.isFinite(yaw) ? { kind, owner, k, yaw } : null;
  }
  const n = Number(parts[3]), ry = Number(parts[4]);
  return Number.isFinite(n) && n > 0 && n <= MAX_N && Number.isFinite(ry) ? { kind, owner, k, n: n | 0, ry } : null;
}

// The pose while working on a ball of n steps: gathering snow by hand at
// first, then pushing with both hands, leaning in with a shoulder, and a
// giant with your back to it. A friend helping takes the other pose of the
// pair, so two people at one ball don't look the same.
export function snowPose(n, helper = false) {
  const s = stageOf(n);
  if (s < ROLL_FROM) return 'snowscoop';
  if (s <= 5) return (s === 4) !== helper ? 'snowpush' : 'snowpushhigh';
  return (s < CREW_STAGE) !== helper ? 'snowshoulder' : 'snowback';
}
export const SNOW_POSES = ['snowscoop', 'snowpush', 'snowpushhigh', 'snowshoulder', 'snowback', 'snowcold'];

// ---------- grab and walk (stage 4+) ----------
// From stage 4 you grab the ball once and walk: it rolls in front of you and
// grows with the ground it covers, one step every ROLL_PER_STEP metres (each
// friend holding on counts too). A heavy ball slows you down; friends
// holding on make it lighter. A giant won't move for one person alone.
export const ROLL_PER_STEP = 0.35;
const HOLD_PACE = { 4: 0.62, 5: 0.54, 6: 0.47, 7: 0.4, 8: 0.34 }; // of walking speed, alone
export function holdSpeed(n, crew = 1) {
  const s = stageOf(n);
  if (s < ROLL_FROM) return 1;
  if (s >= CREW_STAGE && crew < 2) return 0;
  return Math.min(1, HOLD_PACE[s] * (1 + 0.6 * (Math.max(1, Math.min(4, crew)) - 1)));
}
// Steps a ball of n grows over `metres` with `crew` people holding it.
// Stops at the last step before the giant without a friend, and at the top.
export function rollGrowth(n, crew, metres) {
  if (!rollable(n) || metres <= 0) return 0;
  const gate = (CREW_STAGE - 1) * STEPS - 1;
  const cap = crew < 2 && n <= gate ? gate : MAX_N;
  return Math.max(0, Math.min(cap - n, (metres * Math.max(1, crew)) / ROLL_PER_STEP));
}
// The pose while holding a ball and walking it along: facing the ball, so
// no back push for the one steering; a friend holding on takes the other.
export function holdPose(n, helper = false) {
  const s = stageOf(n);
  if (!helper) return s === 4 ? 'snowpush' : s === 5 ? 'snowpushhigh' : 'snowshoulder';
  return s <= 5 ? (s === 4 ? 'snowpushhigh' : 'snowpush') : 'snowback';
}

// ---------- cold hands ----------
// Working snow too long makes your hands cold: then you stop for COLD_MS
// and blow on them. Walking a ball along chills them a second a second,
// each press (gathering, a push) PRESS_CHILL; resting warms them up again.
export const COLD_AFTER = 15; // seconds of work
export const COLD_MS = 3000;
export const PRESS_CHILL = 0.6;
export const WARM_RATE = 0.5; // seconds of chill gone per second of rest
// One step of the chill: { chill, cold } after `dt` seconds, `work` seconds
// of it working (and `press` presses).
export function chillStep(chill, dt, work = 0, press = 0) {
  const c = Math.max(0, chill + work + press * PRESS_CHILL - (work || press ? 0 : dt * WARM_RATE));
  return c >= COLD_AFTER - 1e-9 ? { chill: 0, cold: true } : { chill: c, cold: false };
}

// ---------- snow ducks ----------
// A snow duck maker in your hand stamps out little snow ducks where you
// stand: they stay put (no pushing, no rolling) until the snow melts. Ours
// go in our state as "x,z,ry" joined by ";", the newest last.
export const MAX_DUCKS = 10;
export function encodeDucks(list) {
  return list.map((d) => [d.x.toFixed(2), d.z.toFixed(2), (+d.ry || 0).toFixed(1)].join(',')).join(';');
}
export function parseDucks(s) {
  if (typeof s !== 'string' || !s || s.length > 300) return [];
  const out = [];
  for (const part of s.split(';').slice(-MAX_DUCKS)) {
    const [x, z, ry] = part.split(',').map(Number);
    if ([x, z, ry].every(Number.isFinite)) out.push({ x, z, ry });
  }
  return out;
}
