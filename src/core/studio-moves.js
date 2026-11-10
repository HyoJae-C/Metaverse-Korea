// Poses for the yoga & pilates studio (core/studio.js) and the gym's bench
// press, as bone offsets laid over the idle clip (the same shape the dances
// use, see model-pack.js): spine/head/arms/forearms/legs/knees as [x, y, z]
// radians. Spine +x leans forward, arms -x reach forward, legs -x lift the
// thigh forward, knees +x bend.
// Extra fields: pitch tips the whole body over (radians about x: -π/2 lies
// on the back, head towards -z; +π/2 lies face down, head towards +z),
// y/z move it (m), clip swaps the idle clip (floor: sitting on the floor).
// t: seconds.

const breath = (t) => 0.5 - 0.5 * Math.cos(t * 0.25 * Math.PI * 2); // one slow breath every 4 s
const wave = (t, rate) => 0.5 - 0.5 * Math.cos(t * rate * Math.PI * 2); // 0..1..0
// The right arm mirrors the left (y and z flip). The arm offsets combine in
// odd ways on these models, so the ones below were found by measuring where
// the hand ends up (e.g. [-1.6, -1.6, 0] puts it up beside the head).
const mir = ([x, y, z]) => [x, -y, -z];
const arms = (l) => ({ armL: l, armR: mir(l) });
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

export const STUDIO_MOVES = {
  // Standing tall, both arms up, rising a little with each breath.
  ymountain(t) {
    const b = breath(t);
    return { spine: [-0.06, 0, 0], head: [-0.15, 0, 0], ...arms(mix([-1.6, -1.6, 0], [-2.2, -1.2, 0], b)) };
  },
  // On the left leg, the right knee out to the side and the foot against
  // the left leg; palms together in front of the chest.
  ytree(t) {
    const s = Math.sin(t * 1.3) * 0.03;
    return { spine: [0, 0, s], ...arms([0, 0, -1.3]), legR: [-1, 0, 1.5], kneeR: [1.9, 0, 0] };
  },
  // Wide stance side on, front knee bent, arms out long to the sides,
  // looking over the front hand.
  ywarrior(t) {
    const b = breath(t);
    return { y: -0.06 - 0.02 * b, turn: -1.3, head: [0, 1.2, 0], ...arms([1, -1, 0.5]), legL: [-0.9, 0, -0.35], kneeL: [1.0, 0, 0], legR: [0.6, 0, 0.35], kneeR: [0.05, 0, 0] };
  },
  // An upside-down V: hips up high, hands and head down by the mat.
  ydog(t) {
    const b = breath(t);
    return { pitch: 0.6, spine: [1.2 - 0.05 * b, 0, 0], head: [0.2, 0, 0], ...arms([-2.2, 0.5, 0]), legL: [0.6, 0, 0], legR: [0.6, 0, 0] };
  },
  // Face down on the mat, chest lifted on straight arms.
  ycobra(t) {
    const b = breath(t);
    return { pitch: Math.PI / 2, y: 0.12, z: -0.6, spine: [-0.5 - 0.1 * b, 0, 0], head: [-0.35, 0, 0], ...arms([-0.5, -0.5, -0.5]) };
  },
  // Sitting cross-legged on the floor, breathing.
  ylotus(t) {
    const b = breath(t);
    return { clip: 'floor', y: 0.02, spine: [0.03 * b, 0, 0], head: [0.1, 0, 0] };
  },
  // Pilates reformer footwork: on your back, feet on the foot bar; the legs
  // push the carriage out and let it back in, one push a breath.
  reformer(t) {
    const w = wave(t, 0.25);
    return { pitch: -Math.PI / 2, y: 0.5, z: 0.45 - 0.3 * w, legL: [-1.3 + 1.0 * w, 0, -0.1], legR: [-1.3 + 1.0 * w, 0, 0.1], kneeL: [1.9 - 1.6 * w, 0, 0], kneeR: [1.9 - 1.6 * w, 0, 0] };
  },
  // Bench press: on your back on the bench, feet up on its end, pushing the
  // bar up from the chest and lowering it again. (The bar: model-pack.js.)
  bench(t) {
    const w = wave(t, 0.55); // 0 bar on the chest .. 1 arms straight
    return { pitch: -Math.PI / 2, y: 0.6, z: 0.6, ...arms(mix([0.2, -0.9, -0.6], [-0.5, -0.5, -0.5], w)), legL: [-0.6, 0, -0.15], legR: [-0.6, 0, 0.15], kneeL: [1.2, 0, 0], kneeR: [1.2, 0, 0], bar: w };
  },
};
