// Banpo Bridge Moonlight Rainbow Fountain (반포대교 달빛무지개분수): when it
// runs, where, and what each jet does. Pure, no DOM, so it can be
// unit-tested; the water itself is drawn by rainbow-jets.js, which is only
// downloaded when you come near Banpo Bridge around show time.
//
// In real life the fountain runs from spring to autumn, a few evening shows
// of about 20 minutes (and one at noon), and stops for rain or strong wind.
// The exact times change from year to year, so the game doesn't copy them:
// here a 20-minute show starts at half past most hours (Korean time), all
// year, so whoever walks to Banpo soon gets to see one. Like the fireworks,
// the sky turns to night only around the bridge during a show.
//
// Everyone's clock gives the same jets at the same moment (like the drone
// show and the fireworks), so friends on the lawn watch the same show.

export const FOUNTAIN_MINUTE = 30; // shows start at hh:30 KST
// No show while Yeouido's hour of fireworks is on (09:00, 21:00 KST:
// fireworks-show.js), so nobody has to choose between the two.
export const SKIP_HOURS_KST = [9, 21];
export const SHOW_SECONDS = 20 * 60; // the show itself (t = 0 … 1200)
export const DUSK_SECONDS = 60; // before the start: the sky round the bridge darkens
export const DAWN_SECONDS = 60; // after the end: it brightens again
export const NOTICE_SECONDS = 60; // the "starts in a minute" notice, near the bridge
export const FINALE = [SHOW_SECONDS - 60, SHOW_SECONDS]; // photo time: every jet full, in rainbow

const MIN = 60e3, HOUR = 60 * MIN, KST = 9 * HOUR;
const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const frac = (x) => x - Math.floor(x);

// Show start times (ms) around `now`: from two hours before to two after.
function startsAround(now) {
  const hour = Math.floor((now + KST) / HOUR); // hours since the epoch, Korean time
  const out = [];
  for (let h = hour - 2; h <= hour + 2; h++) {
    if (SKIP_HOURS_KST.includes(((h % 24) + 24) % 24)) continue;
    out.push(h * HOUR - KST + FOUNTAIN_MINUTE * MIN);
  }
  return out;
}

// How dark the sky round the bridge is t seconds into a show: 0 = day, 1 = night.
export function nightAt(t) {
  if (t < -DUSK_SECONDS || t > SHOW_SECONDS + DAWN_SECONDS) return 0;
  if (t < -10) return smooth((t + DUSK_SECONDS) / (DUSK_SECONDS - 10));
  if (t > SHOW_SECONDS + 10) return 1 - smooth((t - SHOW_SECONDS - 10) / (DAWN_SECONDS - 10));
  return 1;
}

// The show around `now`, from its notice until the sky is day again:
// { start (ms), t (seconds from the start), night (0–1), on (jets running) }.
// null otherwise.
export function fountainAt(now = Date.now()) {
  for (const start of startsAround(now)) {
    const t = (now - start) / 1000;
    if (t >= -Math.max(NOTICE_SECONDS, DUSK_SECONDS) && t < SHOW_SECONDS + DAWN_SECONDS) return { start, t, night: nightAt(t), on: t >= 0 && t < SHOW_SECONDS };
  }
  return null;
}

// The next show's start (ms) after now.
export function nextFountain(now = Date.now()) {
  return startsAround(now).find((s) => s > now);
}

// ---- Where (world metres) ----
// The middle of Banpo Bridge over Jamsu Bridge (the "jamsu" landmark of
// districts/banpo-jamwon.json, moved by the district's offset), and the
// bridge's direction: the jets line both sides of the upper deck.
export const BRIDGE = { x: -1316.6, z: 807.3 };
// How much the show's night reaches a spot: 1 on the bridge, the park's
// lawn and the riverside, fading out over the next 120 m.
export function nearBridge(x, z) {
  return 1 - smooth((Math.hypot(x - BRIDGE.x, z - BRIDGE.z) - 230) / 120);
}

// ---- The program ----
// Scenes one after another, each with a way the jets move and a way they're
// coloured, then the finale. All jets are numbered along the bridge, 0 … n-1.
export const SCENES = [
  { len: 40, move: 'rise', color: 'rainbow' },
  { len: 70, move: 'wave', color: 'rainbow' },
  { len: 50, move: 'breath', color: 'mono' },
  { len: 50, move: 'alternate', color: 'split' },
  { len: 70, move: 'center', color: 'rainbow' },
  { len: 50, move: 'chase', color: 'mono' },
  { len: 40, move: 'breath', color: 'white' }, // (like the plain daytime show)
  { len: 70, move: 'wave', color: 'split' },
];
export const MOVES = ['rise', 'wave', 'breath', 'alternate', 'center', 'chase', 'finale'];
const LOOP = SCENES.reduce((s, x) => s + x.len, 0);
const FADE = 2.5; // seconds two scenes blend into each other

// Which scene is on t seconds into the show, and how far into it.
export function sceneAt(t) {
  if (t >= FINALE[0]) return { scene: { len: FINALE[1] - FINALE[0], move: 'finale', color: 'rainbow' }, T: t - FINALE[0], prev: null };
  let T = ((t % LOOP) + LOOP) % LOOP, i = 0;
  while (T >= SCENES[i].len) T -= SCENES[i++].len;
  return { scene: SCENES[i], T, prev: t >= FADE ? SCENES[(i + SCENES.length - 1) % SCENES.length] : null };
}

// How far jet k of n throws its water (0 … 1) in a scene's move, T seconds in.
function reachOf(move, T, k, n) {
  const x = n > 1 ? k / (n - 1) : 0.5;
  switch (move) {
    case 'rise': return smooth(T / 5 - x * 0.6) * (0.92 + 0.08 * Math.sin(T * 2 + k));
    case 'wave': return 0.55 + 0.45 * Math.sin(2 * Math.PI * (x * 2 - T * 0.22));
    case 'breath': return 0.6 + 0.4 * Math.sin((2 * Math.PI * T) / 7);
    case 'alternate': return 0.65 + 0.35 * Math.sin(Math.PI * T * 0.6) * (k % 2 ? 1 : -1);
    case 'center': return 0.55 + 0.45 * Math.sin(2 * Math.PI * (Math.abs(x - 0.5) * 3 - T * 0.3));
    case 'chase': {
      const d = Math.abs(frac(T * 0.1) - x);
      return 0.3 + 0.7 * Math.exp(-((Math.min(d, 1 - d) * 9) ** 2));
    }
    case 'finale': return 0.94 + 0.06 * Math.sin(T * 5 + k * 0.7);
    default: return 0;
  }
}
// Its colour: [hue 0–1, saturation 0–1].
function colorOf(color, T, k, n) {
  const x = n > 1 ? k / (n - 1) : 0.5;
  switch (color) {
    case 'rainbow': return [frac(x + T * 0.08), 1];
    case 'mono': return [frac(T * 0.03), 0.9];
    case 'split': return [frac(T * 0.025 + (k % 2) * 0.5), 1];
    default: return [0.58, 0.12]; // white, a touch of blue
  }
}

// What jet k of n is doing t seconds into the show: { reach (0 … 1), hue,
// sat }. Before and after the show every jet is off (reach 0); the jets
// come up over the first seconds and die away over the last.
export function jetAt(t, k, n, out = {}) {
  if (t < 0 || t >= SHOW_SECONDS) { out.reach = 0; out.hue = 0; out.sat = 0; return out; }
  const { scene, T, prev } = sceneAt(t);
  let reach = reachOf(scene.move, T, k, n);
  let [hue, sat] = colorOf(scene.color, T, k, n);
  if (prev && T < FADE) {
    const b = smooth(T / FADE);
    reach = reachOf(prev.move, prev.len + T, k, n) * (1 - b) + reach * b;
    if (b < 0.5) [hue, sat] = colorOf(prev.color, prev.len + T, k, n);
  }
  if (scene.move === 'finale') hue = frac((n > 1 ? k / (n - 1) : 0) + T * 0.25);
  out.reach = Math.max(0, Math.min(1, reach)) * smooth(t / 4) * smooth((SHOW_SECONDS - t) / 4);
  out.hue = hue; out.sat = sat;
  return out;
}
