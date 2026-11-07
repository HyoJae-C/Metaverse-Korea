// The skate park on Olympic Park's Peace Plaza, Songpa (map landmark "skatepark"): the layout, the ground
// height you ride on, and the tricks. Kept free of three.js and the DOM so
// it can be unit-tested; the scenery is in skatepark-model.js.
//
// Layout in metres from the park's centre: +x east, +z south (down on the
// map). A concrete pad 64 × 44 m with a fence round it and the gate on the
// north side (towards Olympic-ro). Quarter pipes at the west and east
// ends, a funbox in the middle, two kickers in the south (one jumping east,
// one west, side by side) and two grind rails.
//
// Riding (bike, skateboard, inline skates or kick scooter from the bike
// shop) you go up and over the ramps; a ramp that ends in a lip throws you
// into the air. Tap Trick to pop (an ollie / bunny hop) and to do a trick
// while you are in the air. A trick that fits the air time left is picked
// for you, so landing is easy; land in the middle of a trick and you bail.
// Tricks one after another (in the air, or within a moment of landing)
// make a combo: each trick in it counts once more.

export const PARK = { hx: 32, hz: 22, gate: [19, 31] }; // half-width, half-depth; the gate's x span on the north fence
export const PARK_SPEED = 9; // m/s: rides slow down to this inside the park (ramps are small)
export const GRAVITY = 15;
export const POP = 4.2; // m/s up for an ollie from flat ground
export const MAX_VY = 7.5;
export const COMBO_GAP = 1.2; // seconds on the ground before a combo is counted

// Ramps along x: `dir` +1 rises towards +x, -1 towards -x. `u0` is the toe
// (where it starts), `len` how far it rises, `h` its height.
//   quarter: curves up to a wall (a quarter pipe); near the top you go
//            straight up ("vert") and come back down.
//   kicker:  a straight wedge with a lip: ride off it into the air.
//   funbox:  up, a flat top, and down the other side.
export const RAMPS = [
  { id: 'qp-west', kind: 'quarter', dir: -1, u0: -23, len: 7.5, h: 2.0, z0: -18, z1: 18 },
  { id: 'qp-east', kind: 'quarter', dir: 1, u0: 23, len: 7.5, h: 2.0, z0: -18, z1: 18 },
  { id: 'funbox', kind: 'funbox', u0: -6, len: 3, top: 6, h: 0.8, z0: -3.5, z1: 3.5 },
  { id: 'kicker-west', kind: 'kicker', dir: 1, u0: -14, len: 3.6, h: 1.0, z0: 9, z1: 13 },
  { id: 'kicker-east', kind: 'kicker', dir: -1, u0: 14, len: 3.6, h: 1.0, z0: 15, z1: 19 },
];
// Grind rails: from a to b, top at height h.
export const RAILS = [
  { id: 'rail-north', a: [-15, -13], b: [3, -13], h: 0.5 },
  { id: 'rail-east', a: [8, 3], b: [18, 3], h: 0.5 },
];
// Walls you can't ride through (park coordinates), besides the fence: the
// backs of the quarter pipes.
export const QP_WALL = 0.6; // thickness

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Height of one ramp at (x, z), and how far up it you are (s, 0..1).
function rampAt(r, x, z) {
  if (z < r.z0 || z > r.z1) return null;
  if (r.kind === 'funbox') {
    const ax = Math.abs(x), half = r.top / 2;
    if (ax >= half + r.len) return null;
    if (ax <= half) return { y: r.h, s: 1, r };
    return { y: r.h * (half + r.len - ax) / r.len, s: (half + r.len - ax) / r.len, r };
  }
  const u = (x - r.u0) * r.dir; // metres up the ramp from its toe
  if (u <= 0) return null;
  if (r.kind === 'kicker') {
    if (u > r.len) return null; // past the lip: the back drops straight down
    const s = u / r.len;
    return { y: r.h * Math.pow(s, 1.25), s, r };
  }
  // quarter: curves up (steeper and steeper) to the wall at the top.
  const s = Math.min(1, u / r.len);
  return { y: r.h * s * s, s, r };
}

// Ground height in the park at (x, z) (park coordinates): 0 on the pad, up
// on a ramp. Returns { y, s, r } (r: the ramp, or null).
export function parkGround(x, z) {
  let best = { y: 0, s: 0, r: null };
  for (const r of RAMPS) {
    const g = rampAt(r, x, z);
    if (g && g.y > best.y) best = g;
  }
  return best;
}

export const inPark = (x, z, pad = 0) => Math.abs(x) <= PARK.hx + pad && Math.abs(z) <= PARK.hz + pad;

// The nearest rail within `reach` of (x, z): { rail, t (0..1 along it), d }.
export function railNear(x, z, reach = 0.6) {
  let best = null;
  for (const rail of RAILS) {
    const [ax, az] = rail.a, [bx, bz] = rail.b;
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d <= reach && (!best || d < best.d)) best = { rail, t, d };
  }
  return best;
}

// Polygons for the map's "blockers" (world metres): the fence (with the
// gate left open) and the walls behind the quarter pipes.
export function parkBlockers(cx, cz) {
  const { hx, hz, gate } = PARK, T = 0.4;
  const rect = (x0, z0, x1, z1) => ({ p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [cx + x, cz + z]) });
  return [
    rect(-hx - T, -hz - T, gate[0], -hz), // north, west of the gate
    rect(gate[1], -hz - T, hx + T, -hz), // north, east of the gate
    rect(-hx - T, hz, hx + T, hz + T), // south
    rect(-hx - T, -hz, -hx, hz), // west
    rect(hx, -hz, hx + T, hz), // east
    ...RAMPS.filter((r) => r.kind === 'quarter').map((r) => {
      const top = r.u0 + r.dir * r.len; // the coping
      const [x0, x1] = r.dir > 0 ? [top, top + QP_WALL] : [top - QP_WALL, top];
      return rect(x0, r.z0, x1, r.z1);
    }),
  ];
}

// --- Tricks ---------------------------------------------------------------
// pose(p) for p 0..1: spin (turn round, radians), flip (forward/back
// flip), roll (sideways), rideRoll / rideSpin (the board or bike alone:
// kickflips, shove-its, tail whips), tuck (crouch, 0..1).
// `types`: which rides can do it. pts: base points.
const TAU = Math.PI * 2;
const ease = (p) => p * p * (3 - 2 * p);
export const TRICKS = [
  // From flat ground: short and simple.
  { id: 'ollie', types: ['skate'], dur: 0.32, pts: 50, name: { en: 'Ollie', ko: '알리', ja: 'オーリー', zh: '豚跳' }, pose: (p) => ({ tuck: Math.sin(p * Math.PI) * 0.6 }) },
  { id: 'hop', types: ['bike', 'kick'], dur: 0.32, pts: 50, name: { en: 'Bunny Hop', ko: '버니합', ja: 'バニーホップ', zh: '兔跳' }, pose: (p) => ({ tuck: Math.sin(p * Math.PI) * 0.6 }) },
  { id: 'jump', types: ['inline'], dur: 0.32, pts: 50, name: { en: 'Jump', ko: '점프', ja: 'ジャンプ', zh: '跳跃' }, pose: (p) => ({ tuck: Math.sin(p * Math.PI) * 0.6 }) },
  { id: 'kickflip', types: ['skate'], dur: 0.45, pts: 120, name: { en: 'Kickflip', ko: '킥플립', ja: 'キックフリップ', zh: '尖翻' }, pose: (p) => ({ rideRoll: ease(p) * TAU, tuck: Math.sin(p * Math.PI) * 0.7 }) },
  { id: 'heelflip', types: ['skate'], dur: 0.45, pts: 120, name: { en: 'Heelflip', ko: '힐플립', ja: 'ヒールフリップ', zh: '跟翻' }, pose: (p) => ({ rideRoll: -ease(p) * TAU, tuck: Math.sin(p * Math.PI) * 0.7 }) },
  { id: 'shove', types: ['skate'], dur: 0.42, pts: 100, name: { en: 'Pop Shove-it', ko: '팝 쇼빗', ja: 'ポップショービット', zh: '转板' }, pose: (p) => ({ rideSpin: ease(p) * Math.PI, tuck: Math.sin(p * Math.PI) * 0.6 }) },
  { id: 'whip', types: ['bike', 'kick'], dur: 0.48, pts: 130, name: { en: 'Tail Whip', ko: '테일윕', ja: 'テイルホイップ', zh: '甩尾' }, pose: (p) => ({ rideSpin: ease(p) * TAU, tuck: Math.sin(p * Math.PI) * 0.5 }) },
  { id: 'grab', types: ['inline', 'skate'], dur: 0.5, pts: 110, name: { en: 'Indy Grab', ko: '인디 그랩', ja: 'インディーグラブ', zh: '印第抓板' }, pose: (p) => ({ tuck: Math.sin(p * Math.PI), roll: Math.sin(p * Math.PI) * 0.35 }) },
  { id: 'nohand', types: ['bike'], dur: 0.5, pts: 110, name: { en: 'Tabletop', ko: '테이블탑', ja: 'テーブルトップ', zh: '平台跳' }, pose: (p) => ({ roll: Math.sin(p * Math.PI) * 0.9, tuck: Math.sin(p * Math.PI) * 0.4 }) },
  // Off a ramp: more air, bigger tricks.
  { id: 'tre', types: ['skate'], dur: 0.62, pts: 250, name: { en: '360 Flip', ko: '360 플립', ja: '360フリップ', zh: '360尖翻' }, pose: (p) => ({ rideRoll: ease(p) * TAU, rideSpin: ease(p) * TAU, tuck: Math.sin(p * Math.PI) * 0.8 }) },
  { id: 'spin360', types: ['skate', 'bike', 'inline', 'kick'], dur: 0.7, pts: 280, name: { en: '360 Spin', ko: '360 스핀', ja: '360スピン', zh: '360旋转' }, pose: (p) => ({ spin: ease(p) * TAU, tuck: Math.sin(p * Math.PI) * 0.6 }) },
  { id: 'whip360', types: ['bike', 'kick'], dur: 0.82, pts: 380, name: { en: '360 Tail Whip', ko: '360 테일윕', ja: '360テイルホイップ', zh: '360甩尾' }, pose: (p) => ({ spin: ease(p) * TAU, rideSpin: ease(p) * TAU, tuck: Math.sin(p * Math.PI) * 0.6 }) },
  { id: 'kfindy', types: ['skate'], dur: 0.8, pts: 360, name: { en: 'Kickflip Indy', ko: '킥플립 인디', ja: 'キックフリップインディー', zh: '尖翻抓板' }, pose: (p) => ({ rideRoll: ease(Math.min(1, p * 1.6)) * TAU, tuck: Math.sin(p * Math.PI), roll: Math.sin(p * Math.PI) * 0.3 }) },
  { id: 'spin720', types: ['inline'], dur: 0.95, pts: 520, name: { en: '720 Spin', ko: '720 스핀', ja: '720スピン', zh: '720旋转' }, pose: (p) => ({ spin: ease(p) * TAU * 2, tuck: Math.sin(p * Math.PI) * 0.8 }) },
  { id: 'backflip', types: ['skate', 'bike', 'inline', 'kick'], dur: 0.95, pts: 500, name: { en: 'Backflip', ko: '백플립', ja: 'バックフリップ', zh: '后空翻' }, pose: (p) => ({ flip: -ease(p) * TAU, tuck: Math.sin(p * Math.PI) }) },
  { id: 'mctwist', types: ['skate', 'inline'], dur: 1.1, pts: 700, name: { en: 'McTwist', ko: '맥트위스트', ja: 'マックツイスト', zh: '麦克扭转' }, pose: (p) => ({ spin: ease(p) * TAU, flip: -ease(p) * TAU, tuck: Math.sin(p * Math.PI) }) },
  { id: 'frontflip', types: ['bike', 'kick'], dur: 1.05, pts: 620, name: { en: 'Front Flip', ko: '프론트플립', ja: 'フロントフリップ', zh: '前空翻' }, pose: (p) => ({ flip: ease(p) * TAU, tuck: Math.sin(p * Math.PI) }) },
];
export const TRICK_BY_ID = Object.fromEntries(TRICKS.map((k) => [k.id, k]));
export const GRIND_NAME = {
  skate: { en: '50-50 Grind', ko: '50-50 그라인드', ja: '50-50グラインド', zh: '50-50滑杆' },
  bike: { en: 'Peg Grind', ko: '페그 그라인드', ja: 'ペググラインド', zh: '脚踏杆滑杆' },
  inline: { en: 'Soul Grind', ko: '소울 그라인드', ja: 'ソウルグラインド', zh: '灵魂滑杆' },
  kick: { en: 'Feeble Grind', ko: '피블 그라인드', ja: 'フィーブルグラインド', zh: '弱滑杆' },
};
export const GRIND_PTS = 60; // to get on the rail, then per second on it
export const NO_POSE = { spin: 0, flip: 0, roll: 0, rideRoll: 0, rideSpin: 0, tuck: 0 };

// The trick's pose at t seconds after it started (null once it is over).
export function trickPose(id, t) {
  const k = TRICK_BY_ID[id];
  if (!k || !(t >= 0) || t > k.dur) return null;
  return { ...NO_POSE, ...k.pose(t / k.dur) };
}

// Which trick to do with `air` seconds left in the air: the best one that
// still fits, taking turns among the best few so it isn't always the same.
// n: how many tricks you have done (for the turns). null if nothing fits.
export function pickTrick(type, air, n = 0) {
  const fits = TRICKS.filter((k) => k.types.includes(type) && k.dur <= air * 0.95).sort((a, b) => b.pts - a.pts);
  if (!fits.length) return null;
  const top = fits.filter((k) => k.pts >= fits[0].pts * 0.45).slice(0, 3);
  return top[n % top.length];
}

// Seconds until falling from y (going up at vy) back down to `ground`.
export function airTime(y, vy, ground = 0, g = GRAVITY) {
  const h = Math.max(0, y - ground);
  return (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
}

// One rider in the park. Call step() every frame with the ground under you
// (park coordinates); it returns your height and what happened.
//   events: { kind: 'trick', trick, pts, mult } | { kind: 'grind', pts }
//           | { kind: 'land', total, mult } (a combo counted)
//           | { kind: 'bail', lost }
export class Skater {
  constructor(type = 'skate') { this.type = type; this.reset(); }
  reset() {
    this.y = 0; this.vy = 0; this.air = false; this.vert = false;
    this.grind = null; // { rail, t, time }
    this.trick = null; // { id, t }
    this.done = 0; // tricks done (for picking)
    this.combo = []; // points of tricks in the combo so far
    this.used = []; // trick ids in the combo so far
    this.ground = 0; // time on the ground since the last trick
    this.popAsked = false;
  }
  get comboPts() { return this.combo.reduce((a, b) => a + b, 0); }
  get mult() { return Math.min(5, this.combo.length); }
  // Tap Trick: pop off the ground (or the rail), or do a trick in the air.
  tap() { this.popAsked = true; }
  // Leaving the park or getting off: count the combo so far (if you were
  // mid-trick in the air, it's lost). Returns the events, like step().
  finish() {
    const events = [];
    if (!this.air || !this.trick) this._endCombo(events);
    this.reset();
    return events;
  }
  // Stopped on a rail (or steered off it): drop down.
  leaveRail() {
    if (!this.grind) return;
    this.grind = null;
    this.air = true;
    this.vy = 0;
  }

  _startTrick(air, events) {
    const k = pickTrick(this.type, air, this.done);
    if (!k) return;
    this.trick = { id: k.id, t: 0 };
    this.done++;
    // The same trick again in one combo counts for less each time.
    const again = this.used.filter((id) => id === k.id).length;
    this.used.push(k.id);
    const pts = Math.round(k.pts / (1 + again));
    this.combo.push(pts);
    this.ground = 0;
    events.push({ kind: 'trick', trick: k, pts, mult: this.mult });
  }
  _endCombo(events) {
    if (!this.combo.length) return;
    const mult = this.mult, total = this.comboPts * mult;
    this.combo = []; this.used = [];
    events.push({ kind: 'land', total, mult });
  }

  // dt seconds; g: parkGround(x, z) where you are now; rail: railNear(x, z)
  // (or null). Returns { y, events }.
  step(dt, g, rail = null) {
    const events = [];
    dt = Math.min(dt, 0.05);
    const tap = this.popAsked;
    this.popAsked = false;
    if (this.trick) {
      this.trick.t += dt;
      if (this.trick.t >= TRICK_BY_ID[this.trick.id].dur) this.trick = null;
    }
    if (this.grind) {
      // On the rail: follow it until you ride off its end (or pop off).
      if (!rail || rail.rail !== this.grind.rail || rail.t <= 0 || rail.t >= 1 || tap) {
        this.grind = null;
        this.air = true;
        this.vy = tap ? POP * 0.85 : 1.2;
        if (tap) this._startTrick(airTime(this.y, this.vy, g.y), events);
      } else {
        const before = Math.floor(this.grind.time * 2);
        this.grind.time += dt;
        this.grind.t = rail.t;
        this.y = rail.rail.h;
        if (Math.floor(this.grind.time * 2) > before) { this.combo.push(GRIND_PTS / 2); events.push({ kind: 'grind', pts: GRIND_PTS / 2, mult: this.mult }); }
        return { y: this.y, events };
      }
    }
    if (!this.air) {
      if (tap) {
        // Pop: an ollie, plus whatever the ramp under you adds.
        this.air = true;
        this.vy = clamp(Math.max(0, this.vy) + POP, POP, MAX_VY);
        this._startTrick(airTime(this.y, this.vy, g.y), events);
      } else {
        // Stay on the ground only if it curves up at least as fast as a
        // throw would fall: off a lip or over a crest you fly.
        const yPred = this.y + this.vy * dt - 0.5 * GRAVITY * dt * dt;
        const vert = g.r?.kind === 'quarter' && g.s >= 0.8 && this.vy > 1.5; // near the top of a quarter pipe, going up
        if (g.y - this.y > 0.3) {
          // Stepped onto a ramp from its side or back: up you go, no throw.
          this.y = g.y; this.vy = 0;
        } else if (vert) {
          this.air = true; this.vert = true;
          this.vy = clamp(this.vy * 1.1 + 3, 5, MAX_VY);
        } else if (g.y >= yPred - 0.04 || this.vy <= 0.5) {
          const vy = (g.y - this.y) / Math.max(dt, 1e-3);
          this.vy = clamp(vy, -MAX_VY, MAX_VY);
          this.y = g.y;
        } else {
          this.air = true;
          this.vy = clamp(this.vy * 1.15, 0, MAX_VY); // ramps throw you a little higher than real ones
        }
        this.ground += dt;
        if (!this.air && this.ground > COMBO_GAP) this._endCombo(events);
        if (!this.air) return { y: this.y, events };
      }
    }
    // In the air.
    if (tap && !this.trick) this._startTrick(airTime(this.y, this.vy, g.y), events);
    this.vy -= GRAVITY * dt;
    this.y += this.vy * dt;
    // Coming down onto a rail: grind it.
    if (rail && this.vy < 0 && this.y <= rail.rail.h + 0.15 && this.y >= rail.rail.h - 0.35 && rail.t > 0.02 && rail.t < 0.98) {
      this.air = false; this.vert = false; this.vy = 0; this.y = rail.rail.h;
      this.trick = null;
      this.grind = { rail: rail.rail, t: rail.t, time: 0 };
      this.combo.push(GRIND_PTS);
      this.ground = 0;
      events.push({ kind: 'grind', pts: GRIND_PTS, mult: this.mult, start: true });
      return { y: this.y, events };
    }
    if (this.y <= g.y) {
      // Landed. Mid-trick (less than three quarters done) is a bail.
      const k = this.trick && TRICK_BY_ID[this.trick.id];
      if (k && this.trick.t < k.dur * 0.75) {
        const lost = this.comboPts * this.mult;
        this.combo = []; this.used = [];
        events.push({ kind: 'bail', lost });
      }
      this.trick = null;
      this.air = false; this.vert = false;
      this.y = g.y;
      this.vy = 0;
      this.ground = 0;
    }
    return { y: this.y, events };
  }

  // The pose to draw now (NO_POSE when not doing a trick).
  pose() { return (this.trick && trickPose(this.trick.id, this.trick.t)) || NO_POSE; }
}

// --- Score ------------------------------------------------------------------
// A landed combo adds to today's points and may set a new best combo. Just
// for fun: points don't pay coins. saved: { day, pts, best }.
export function bankPoints(saved, day, pts) {
  const s = saved?.day === day ? { ...saved } : { day, pts: 0, best: saved?.best || 0 };
  delete s.paid;
  s.pts += Math.max(0, Math.round(pts));
  s.best = Math.max(s.best || 0, Math.round(pts));
  return s;
}
