// Poses for making a snowball (core/snowballs.js snowPose), as bone offsets
// laid over the idle clip (the same shape the dances use, see model-pack.js):
// spine/head/arms/forearms/legs/knees as [x, y, z] radians, bob (m) and
// turn. Spine +x leans forward, arms -x reach forward, knees +x bend.
// t: seconds, looping about once a second (one scoop or one shove).

const wave = (t, rate) => 0.5 - 0.5 * Math.cos(t * rate * Math.PI * 2); // 0..1..0

export const SNOW_MOVES = {
  // Crouched by a small ball, both hands scooping snow onto it and patting it.
  snowscoop(t) {
    const w = wave(t, 1.1);
    return {
      bob: -0.2,
      spine: [0.55 + 0.1 * w, 0, 0], head: [-0.25, 0, 0],
      armL: [-0.7 - 0.5 * w, -0.25 + 0.2 * w, 0], armR: [-0.7 - 0.5 * w, 0.25 - 0.2 * w, 0],
      foreL: [-0.5 + 0.3 * w, 0, 0], foreR: [-0.5 + 0.3 * w, 0, 0],
      legL: [-1.1, 0, 0], legR: [-1.1, 0, 0], kneeL: [1.7, 0, 0], kneeR: [1.7, 0, 0],
    };
  },
  // Bent over a waist-high ball, both hands low on it, shoving.
  snowpush(t) {
    const w = wave(t, 1);
    return {
      bob: -0.04 * w,
      spine: [0.55 + 0.1 * w, 0, 0], head: [-0.35, 0, 0],
      armL: [-1.0 - 0.25 * w, -0.15, 0], armR: [-1.0 - 0.25 * w, 0.15, 0],
      foreL: [-0.6 + 0.4 * w, 0, 0], foreR: [-0.6 + 0.4 * w, 0, 0],
      legL: [-0.45 * w, 0, 0], kneeL: [0.35 + 0.2 * w, 0, 0], legR: [0.25, 0, 0], kneeR: [0.2, 0, 0],
    };
  },
  // Arms straight out at chest height, leaning into a big ball.
  snowpushhigh(t) {
    const w = wave(t, 0.9);
    return {
      bob: -0.03 * w,
      spine: [0.35 + 0.08 * w, 0, 0], head: [-0.2, 0, 0],
      armL: [-1.45 - 0.15 * w, -0.2, 0], armR: [-1.45 - 0.15 * w, 0.2, 0],
      foreL: [-0.45 + 0.35 * w, 0, 0], foreR: [-0.45 + 0.35 * w, 0, 0],
      legL: [0.35, 0, 0], kneeL: [0.25, 0, 0], legR: [-0.5 * w, 0, 0], kneeR: [0.45 + 0.2 * w, 0, 0],
    };
  },
  // Shoulder against a ball as tall as you, one arm braced on it, legs driving.
  snowshoulder(t) {
    const w = wave(t, 0.8);
    return {
      bob: -0.06 - 0.03 * w, turn: 0.35,
      spine: [0.6, 0, -0.15], head: [-0.15, 0, 0.1],
      armL: [-1.6, -0.5, 0], foreL: [-1.0, 0, 0], armR: [-0.9 - 0.2 * w, 0.4, 0], foreR: [-0.9, 0, 0],
      legL: [-0.7 - 0.3 * w, 0, 0], kneeL: [0.9, 0, 0], legR: [0.6 + 0.2 * w, 0, 0], kneeR: [0.3, 0, 0],
    };
  },
  // Back to a giant ball, palms flat on it behind you, legs pushing hard.
  snowback(t) {
    const w = wave(t, 0.7);
    return {
      bob: -0.12 - 0.04 * w,
      spine: [-0.35 - 0.05 * w, 0, 0], head: [0.15, 0, 0],
      armL: [0.9, -0.35, 0], armR: [0.9, 0.35, 0], foreL: [-0.6, 0, 0], foreR: [-0.6, 0, 0],
      legL: [-0.9 - 0.25 * w, 0, 0], kneeL: [1.1 + 0.2 * w, 0, 0], legR: [-0.4 + 0.25 * w, 0, 0], kneeR: [0.6, 0, 0],
    };
  },
  // Cold hands: both hands up at the mouth, rubbing them and blowing on them.
  snowcold(t) {
    const w = wave(t, 2.2);
    return {
      bob: -0.02 * w,
      spine: [0.12, 0, 0], head: [0.18, 0, 0],
      armL: [-1.05, 0.35 + 0.12 * w, 0], armR: [-1.05, -0.35 - 0.12 * w, 0],
      foreL: [-1.9, 0, 0], foreR: [-1.9, 0, 0],
      kneeL: [0.12, 0, 0], kneeR: [0.12, 0, 0],
    };
  },
  // A high five after finishing a giant together: up on the toes, the right
  // hand raised high and slapping forward, the left fist pumping.
  snowhi5(t) {
    const w = wave(t, 1.4);
    return {
      bob: 0.06 * w,
      spine: [-0.12 + 0.18 * w, 0, 0.05], head: [-0.2, 0, 0],
      armR: [-2.9 + 0.7 * w, 0.15, 0], foreR: [-0.15, 0, 0],
      armL: [-0.6 - 0.4 * w, -0.2, 0], foreL: [-1.6, 0, 0],
      kneeL: [0.15 * (1 - w), 0, 0], kneeR: [0.15 * (1 - w), 0, 0],
    };
  },
};
