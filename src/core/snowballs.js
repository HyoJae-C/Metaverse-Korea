// Snowballs and snowmen: the rules, with no three.js (see game/snowman.js
// for the game and the models).
//
// A snowball grows one step with each press: 20 steps make a stage, seven
// stages from a fist-sized ball to a giant one taller than a person.
// Stages 1-3 you gather snow into it with your hands; from stage 4 it's
// too big for that and you roll it. Friends can push the same ball: every
// push counts, and with more people pushing it rolls further each time.
// Growing from stage 6 to 7, and rolling a stage-7 ball, takes at least two
// people pushing together.

export const STEPS = 20; // presses per stage
export const STAGES = 7;
export const MAX_N = STEPS * STAGES; // 140
export const ROLL_FROM = 4; // stages 1-3 gather, 4+ roll
export const CREW_STAGE = 7; // reaching and rolling this stage needs two people
export const CREW_WINDOW_MS = 2500; // pushes this close together count as pushing together
export const MAX_BALLS = 3; // each player's snowballs and snowmen in the street
export const MIN_SNOW = 0.5; // how deep the snow on the ground has to be to gather it

// Diameter (m) at the start of each stage, and at the very end.
// fist, palm, knee, waist, chest, a person, giant, (fully grown giant)
export const DIAMETERS = [0.2, 0.32, 0.45, 0.7, 0.95, 1.3, 1.9, 2.3];

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

// A snowman: a smaller ball put on top of a bigger one. Heads up to a
// chest-high ball can be lifted (stage 5).
export const canTop = (head, body) => head > 0 && head < body && stageOf(head) <= 5;
export const liftable = (n) => stageOf(n) <= 5;

// Our balls go in our state as "k,x,z,n[,h,ry]" joined by ";": k a small id,
// n the body's steps, h the head's (a snowman), ry the way its face looks.
export function encodeBalls(list) {
  return list.map((b) => {
    const base = [b.k, b.x.toFixed(2), b.z.toFixed(2), b.n | 0];
    if (b.h) base.push(b.h | 0, (+b.ry || 0).toFixed(2));
    return base.join(',');
  }).join(';');
}
export function parseBalls(s) {
  if (typeof s !== 'string' || !s || s.length > 200) return [];
  const out = [];
  for (const part of s.split(';').slice(0, MAX_BALLS)) {
    const [k, x, z, n, h, ry] = part.split(',').map(Number);
    if (![k, x, z, n].every(Number.isFinite) || n <= 0 || n > MAX_N) continue;
    const b = { k: k | 0, x, z, n: n | 0 };
    if (Number.isFinite(h) && h > 0 && h < n) { b.h = h | 0; b.ry = Number.isFinite(ry) ? ry : 0; }
    out.push(b);
  }
  return out;
}

// Messages to a ball's owner: a push ("sbp:owner:k:yaw") and a head put on
// top ("sbh:owner:k:n:ry").
export const pushMsg = (owner, k, yaw) => `sbp:${owner}:${k}:${(+yaw).toFixed(2)}`;
export const headMsg = (owner, k, n, ry) => `sbh:${owner}:${k}:${n | 0}:${(+ry).toFixed(2)}`;
export function parseSnowMsg(e) {
  if (typeof e !== 'string' || !(e.startsWith('sbp:') || e.startsWith('sbh:'))) return null;
  const parts = e.split(':');
  const kind = parts[0] === 'sbp' ? 'push' : 'head';
  const owner = parts[1];
  const k = Number(parts[2]);
  if (!owner || !Number.isFinite(k)) return null;
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
  return (s === 6) !== helper ? 'snowshoulder' : 'snowback';
}
export const SNOW_POSES = ['snowscoop', 'snowpush', 'snowpushhigh', 'snowshoulder', 'snowback'];
