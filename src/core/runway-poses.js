// The Curve Runway's photo poses (no DOM, so it can be unit-tested). Each
// walk picks three different poses from the pool at random, one for each
// 📸 note at the end of the runway. A pose is either
//   clip   one of the character's own emote clips (wave, cheer),
//   spin   a full turn on the spot (main.js turns the body),
//   moves  bone offsets held for a moment (core/model-pack.js setMoves):
//          armL/armR (-x forward and up, -2.8 overhead; y out to the side,
//          negative for the left arm), foreL/foreR (-x bends the elbow),
//          spine (+x leans forward, z tilts), head (+x looks down, z tilts),
//          legL/legR (-x forward), kneeL/kneeR (+x bends).

export const POSE_S = 1.6; // how long a held pose lasts, seconds

const HIP_L = { armL: [-0.3, -0.75, 0], foreL: [-1.5, 0, 0] }; // left hand on the hip
const HIP_R = { armR: [-0.3, 0.75, 0], foreR: [-1.5, 0, 0] };
const KNEE_L = { legL: [-0.25, 0, 0], kneeL: [0.4, 0, 0] }; // weight on the right leg

// The held poses, at full strength.
const HOLD = {
  hip: { ...HIP_L, ...HIP_R, spine: [0, 0, 0.12], head: [0, 0, -0.12], ...KNEE_L }, // hands on hips, a hip pop
  peace: { ...HIP_L, armR: [-2.3, 0.3, 0], foreR: [-1.9, 0, 0], head: [0, 0, 0.18], spine: [0, 0, -0.06] }, // a V by the face
  cheeks: { armL: [-1.9, -0.35, 0], armR: [-1.9, 0.35, 0], foreL: [-2.0, 0, 0], foreR: [-2.0, 0, 0], head: [0.1, 0, 0.15], ...KNEE_L }, // hands on the cheeks
  cross: { armL: [-1.1, 0.35, 0], armR: [-1.1, -0.35, 0], foreL: [-1.9, 0, 0], foreR: [-1.9, 0, 0], head: [-0.15, 0, 0], spine: [-0.06, 0, 0] }, // arms crossed, chin up
  hair: { ...HIP_L, armR: [-2.7, 0.7, 0], foreR: [-1.8, 0, 0], spine: [0, 0, 0.15], head: [-0.1, 0, -0.15], legL: [-0.3, 0, 0], kneeL: [0.5, 0, 0] }, // hand behind the head
  point: { ...HIP_L, armR: [-1.6, 0.1, 0], foreR: [-0.1, 0, 0], spine: [-0.05, 0, 0], head: [-0.08, 0, 0] }, // pointing at the cameras
  sky: { armL: [-0.2, -0.5, 0], armR: [-2.9, 0.3, 0], foreR: [-0.1, 0, 0], legL: [-0.45, 0, 0], kneeL: [0.75, 0, 0], head: [-0.2, 0, 0] }, // one arm to the sky
  lean: { spine: [0.4, 0, 0], armL: [-0.7, -0.2, 0], armR: [-0.7, 0.2, 0], foreL: [-0.2, 0, 0], foreR: [-0.2, 0, 0], head: [-0.35, 0, 0], legL: [-0.3, 0, 0], legR: [-0.3, 0, 0], kneeL: [0.45, 0, 0], kneeR: [0.45, 0, 0] }, // hands on the knees
  heart: { armL: [-2.7, -0.4, 0], armR: [-2.7, 0.4, 0], foreL: [-1.3, 0, 0], foreR: [-1.3, 0, 0], head: [0, 0, 0.12] }, // a big heart over the head
  kiss: { ...HIP_L, armR: [-2.2, 0.1, 0], foreR: [-2.1, 0, 0], head: [0, 0, 0.1] }, // blowing a kiss (the hand goes out, see below)
};

export const PHOTO_POSES = ['wave', 'cheer', 'turn', ...Object.keys(HOLD)];
export const poseKind = (id) => (id === 'turn' ? 'spin' : HOLD[id] ? 'moves' : PHOTO_POSES.includes(id) ? 'clip' : null);

// Three different poses for one walk.
export function pickPoses(n = 3, rnd = Math.random) {
  const pool = PHOTO_POSES.slice(), out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length) % pool.length, 1)[0]);
  return out;
}

const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

// The bone offsets of a held pose t seconds in: eases in, holds for the
// cameras, eases back out. null when over (or not a held pose).
export function poseAt(id, t) {
  const hold = HOLD[id];
  if (!hold || t < 0 || t >= POSE_S) return null;
  const k = smooth(t / 0.25) * (1 - smooth((t - (POSE_S - 0.35)) / 0.35));
  const out = {};
  for (const [bone, r] of Object.entries(hold)) out[bone] = [r[0] * k, r[1] * k, r[2] * k];
  if (id === 'kiss') { // from the lips out towards the cameras
    const u = smooth((t - 0.5) / 0.4);
    out.armR = [(-2.2 + 0.6 * u) * k, (0.1 + 0.5 * u) * k, 0];
    out.foreR = [(-2.1 + 1.8 * u) * k, 0, 0];
  }
  return out;
}
