// The zoo animals' calls, made with Web Audio (no sound files to download):
// a lion's roar, an elephant's trumpet, a seal's "arf arf", a goat's bleat…
// Cartoon-sized and pitched into the middle of the range (a few hundred Hz
// and up) so a phone's small speaker plays them too: even the big growls
// carry harmonics there, not only their low hum.
// An animal calls when it starts a motion (core/zoo.js onSound: a roar, a
// tussle, a yawn, fanning its train…); VOICES says which motion makes which
// call. game/zoo-sounds.js plays them, louder the nearer you are.

// kind -> { motion (core/zoo.js state, or 'fan' / 'fly') -> call }
export const VOICES = {
  lion: { roar: 'roar', tussle: 'growl', stretch: 'growl' },
  tiger: { tussle: 'growl', roll: 'chuff', stretch: 'growl' },
  bear: { wrestle: 'growl', situp: 'grunt', roll: 'grunt', eat: 'grunt' },
  polarbear: { situp: 'grunt', roll: 'grunt' },
  elephant: { trunks: 'trumpet', spray: 'trumpet', eat: 'rumble', drink: 'rumble' },
  hippo: { yawn: 'honk', nudge: 'grunt', melonOpen: 'honk', happy: 'honk' },
  seal: { bark: 'arf', chase: 'arf', eat: 'arf' },
  walrus: { bark: 'bellow', eat: 'bellow' },
  goat: { butt: 'bleat', rear: 'bleat', snack: 'bleat', happy: 'bleat' },
  sheep: { follow: 'baa', snack: 'baa', happy: 'baa' },
  guineapig: { popcorn: 'squeak', chase: 'squeak', snack: 'squeak' },
  rabbit: { binky: 'thump' },
  macaque: { cheeky: 'ooh', flip: 'ooh', chase: 'screech', eat: 'chatter', perch: 'chatter' },
  zebra: { gallop: 'yip', groom: 'snort', dust: 'snort' },
  giraffe: { necking: 'snort', drink: 'snort' },
  flamingo: { oneleg: 'honkbird', preen: 'honkbird' },
  pelican: { preen: 'clack' },
  peacock: { fan: 'peacock' },
  vulture: { fly: 'hiss', eat: 'hiss' },
  snake: { walk: 'snakehiss' },
};
// How loud each call is at the animal (0..1, before the distance falls off).
export const LOUD = {
  roar: 0.5, growl: 0.32, chuff: 0.22, grunt: 0.3, trumpet: 0.42, rumble: 0.22, honk: 0.4, arf: 0.32, bellow: 0.34,
  bleat: 0.26, baa: 0.26, squeak: 0.16, thump: 0.18, ooh: 0.26, screech: 0.26, chatter: 0.2, yip: 0.26, snort: 0.2,
  honkbird: 0.24, clack: 0.2, peacock: 0.36, hiss: 0.18, snakehiss: 0.12,
};
export const HEAR = 28; // m: further off, nothing
// Not every walk is worth a sound: the snake hisses now and then.
const SOMETIMES = { snakehiss: 0.3, chatter: 0.5, grunt: 0.7, snort: 0.6 };

// The call an animal makes starting this motion, or null.
export const callFor = (kind, motion, rnd = Math.random()) => {
  const c = VOICES[kind]?.[motion] || null;
  return c && rnd < (SOMETIMES[c] ?? 1) ? c : null;
};
// Loudness at distance d (m): full close by, gone at HEAR.
export const fallOff = (d) => (d >= HEAR ? 0 : Math.max(0, 1 - d / HEAR) ** 1.6);

let noise = null;
function white(c) {
  if (noise && noise.sampleRate === c.sampleRate) return noise;
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}
// An envelope on a gain: up to `peak` over `a` s, held, down by t + len.
function env(g, t, peak, len, a = 0.03) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + Math.max(a, len * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
}
// A voiced sound: an oscillator through a band-pass "mouth", its pitch
// following pts [[time, Hz], ...], with optional vibrato (rate Hz, depth Hz).
function voice(c, out, t, { type = 'sawtooth', pts, len, vol, band = 900, q = 1.2, vib = 0, depth = 0, rough = 0 }) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(pts[0][1], t);
  for (const [at, f] of pts.slice(1)) o.frequency.exponentialRampToValueAtTime(f, t + at);
  if (vib) {
    const l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = vib; lg.gain.value = depth;
    l.connect(lg).connect(o.frequency);
    l.start(t); l.stop(t + len + 0.05);
  }
  const f = c.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = band; f.Q.value = q;
  const g = c.createGain();
  env(g, t, vol, len);
  let src = o;
  if (rough) { // a growl: the voice chopped fast in loudness
    const am = c.createGain(), l = c.createOscillator(), lg = c.createGain();
    am.gain.value = 1 - rough / 2; l.frequency.value = 23; lg.gain.value = rough / 2;
    l.connect(lg).connect(am.gain);
    o.connect(am); src = am;
    l.start(t); l.stop(t + len + 0.05);
  }
  src.connect(f).connect(g).connect(out);
  o.start(t); o.stop(t + len + 0.05);
}
// Breath: filtered noise.
function breath(c, out, t, { len, vol, from = 1200, to = 600, q = 0.8, type = 'bandpass' }) {
  const s = c.createBufferSource();
  s.buffer = white(c); s.loop = true;
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + len);
  const g = c.createGain();
  env(g, t, vol, len, 0.02);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.5); s.stop(t + len + 0.05);
}

// The calls: each (c, out, t, k) with k a random 0.9..1.1 pitch factor.
const CALLS = {
  roar: (c, o, t, k) => { voice(c, o, t, { pts: [[0, 150 * k], [0.35, 190 * k], [1.5, 95 * k]], len: 1.6, vol: 1, band: 520, q: 0.9, rough: 0.6 }); breath(c, o, t, { len: 1.5, vol: 0.5, from: 900, to: 400 }); },
  growl: (c, o, t, k) => voice(c, o, t, { pts: [[0, 120 * k], [0.8, 100 * k]], len: 0.9, vol: 1, band: 450, rough: 0.9 }),
  chuff: (c, o, t, k) => { for (let i = 0; i < 3; i++) breath(c, o, t + i * 0.22, { len: 0.16, vol: 1, from: 700 * k, to: 400 * k }); },
  grunt: (c, o, t, k) => { for (let i = 0; i < 2; i++) voice(c, o, t + i * 0.3, { pts: [[0, 140 * k], [0.22, 105 * k]], len: 0.24, vol: 1, band: 480, rough: 0.7 }); },
  trumpet: (c, o, t, k) => { voice(c, o, t, { pts: [[0, 420 * k], [0.25, 720 * k], [0.9, 600 * k], [1.2, 520 * k]], len: 1.25, vol: 1, band: 1100, q: 1.6, vib: 7, depth: 30 }); breath(c, o, t, { len: 1.1, vol: 0.25, from: 2400, to: 1600 }); },
  rumble: (c, o, t, k) => voice(c, o, t, { pts: [[0, 90 * k], [0.7, 80 * k]], len: 0.8, vol: 1, band: 360, rough: 0.4 }),
  honk: (c, o, t, k) => { for (let i = 0; i < 4; i++) voice(c, o, t + i * 0.2, { type: 'square', pts: [[0, 230 * k], [0.16, 170 * k]], len: 0.18, vol: 1, band: 520, q: 1.4 }); },
  arf: (c, o, t, k) => { for (let i = 0; i < 3; i++) voice(c, o, t + i * 0.26, { type: 'square', pts: [[0, 340 * k], [0.05, 420 * k], [0.16, 260 * k]], len: 0.17, vol: 1, band: 800, q: 1.3 }); },
  bellow: (c, o, t, k) => voice(c, o, t, { pts: [[0, 200 * k], [0.3, 260 * k], [0.8, 180 * k]], len: 0.85, vol: 1, band: 600, rough: 0.5 }),
  bleat: (c, o, t, k) => voice(c, o, t, { pts: [[0, 440 * k], [0.15, 520 * k], [0.7, 420 * k]], len: 0.75, vol: 1, band: 1100, q: 1.5, vib: 9, depth: 40 }),
  baa: (c, o, t, k) => voice(c, o, t, { pts: [[0, 330 * k], [0.15, 380 * k], [0.8, 300 * k]], len: 0.85, vol: 1, band: 900, q: 1.5, vib: 8, depth: 30 }),
  squeak: (c, o, t, k) => { for (let i = 0; i < 3; i++) voice(c, o, t + i * 0.12, { type: 'sine', pts: [[0, 1400 * k], [0.08, 2000 * k]], len: 0.09, vol: 1, band: 1800, q: 0.7 }); },
  thump: (c, o, t) => breath(c, o, t, { len: 0.12, vol: 1, from: 260, to: 120, type: 'lowpass', q: 1 }),
  ooh: (c, o, t, k) => { for (let i = 0; i < 3; i++) voice(c, o, t + i * 0.24, { type: 'triangle', pts: [[0, 420 * k], [0.18, 760 * k]], len: 0.2, vol: 1, band: 900, q: 0.8 }); voice(c, o, t + 0.75, { type: 'triangle', pts: [[0, 900 * k], [0.3, 560 * k]], len: 0.32, vol: 1, band: 1000, q: 0.8 }); },
  screech: (c, o, t, k) => { for (let i = 0; i < 2; i++) voice(c, o, t + i * 0.3, { pts: [[0, 900 * k], [0.12, 1300 * k], [0.24, 1000 * k]], len: 0.25, vol: 1, band: 1500, q: 1 }); },
  chatter: (c, o, t, k) => { for (let i = 0; i < 5; i++) voice(c, o, t + i * 0.09, { type: 'triangle', pts: [[0, 700 * k], [0.06, 950 * k]], len: 0.07, vol: 1, band: 1100, q: 0.8 }); },
  yip: (c, o, t, k) => { for (let i = 0; i < 4; i++) voice(c, o, t + i * 0.16, { type: 'square', pts: [[0, 620 * k], [0.12, 420 * k]], len: 0.13, vol: 1, band: 1000, q: 1.2 }); },
  snort: (c, o, t, k) => breath(c, o, t, { len: 0.3, vol: 1, from: 1500 * k, to: 500 * k, q: 1.2 }),
  honkbird: (c, o, t, k) => { for (let i = 0; i < 2; i++) voice(c, o, t + i * 0.22, { type: 'square', pts: [[0, 520 * k], [0.15, 460 * k]], len: 0.16, vol: 1, band: 1200, q: 1.5 }); },
  clack: (c, o, t) => { for (let i = 0; i < 4; i++) breath(c, o, t + i * 0.07, { len: 0.04, vol: 1, from: 2500, to: 2000, q: 2 }); },
  peacock: (c, o, t, k) => { for (let i = 0; i < 2; i++) voice(c, o, t + i * 0.9, { pts: [[0, 620 * k], [0.2, 1100 * k], [0.7, 640 * k]], len: 0.75, vol: 1, band: 1300, q: 1.4 }); },
  hiss: (c, o, t) => breath(c, o, t, { len: 0.6, vol: 1, from: 3000, to: 1800, q: 0.6 }),
  snakehiss: (c, o, t) => breath(c, o, t, { len: 0.9, vol: 1, from: 5000, to: 3500, q: 0.5, type: 'highpass' }),
};
export const CALL_NAMES = Object.keys(CALLS);

// Play a call into out (a gain or panner node) now. Returns its length (s).
export function playCall(c, out, name, k = 0.9 + Math.random() * 0.2) {
  const f = CALLS[name];
  if (!f) return 0;
  f(c, out, c.currentTime + 0.02, k);
  return 1.6;
}
