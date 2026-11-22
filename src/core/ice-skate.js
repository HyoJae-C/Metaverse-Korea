// Figure skating at Mokdong Ice Rink: gliding on the ice, a jump, and tricks
// typed with the arrow keys while you are in the air (Yozi 2026-11-21:
// "점프하자마자 커맨드 입력으로 자유자재로 기술 구사").
//
//   Jump, then in the air:
//     ←  ←→  ←→←  ←→←→   one to four turns: left and right in turn (Yozi
//                        2026-11-21); begin with → to turn the other way
//     ↑↓  butterfly      ↓↑  backflip      ↑↑  cartwheel      ↓↓  death drop
//   Tricks follow one another while there is air left. Come down while one
//   is still turning and you fall; nearly done is a shaky landing. Press
//   Jump again just before the ice for a perfect landing. Clean landings one
//   after another build a combo.
//
// Pure rules (no three.js): the room is core/ice-rink-hall.js, the game is
// game/ice-rink.js, and tests/ice-skate.test.mjs checks this file.

// The ice (room metres): a rounded rectangle, the long way along x.
export const ICE = { x: 0, z: -2, hw: 23, hd: 12.5, r: 6 };
// Gates in the south boards (the lobby side), where you step on and off.
export const GATES = [{ x: -9, w: 3.2 }, { x: 9, w: 3.2 }];
// How far inside the ice's edge (negative: outside) a spot is.
export function iceDepth(x, z, ice = ICE) {
  const dx = Math.abs(x - ice.x), dz = Math.abs(z - ice.z);
  const cx = ice.hw - ice.r, cz = ice.hd - ice.r;
  if (dx > cx && dz > cz) return ice.r - Math.hypot(dx - cx, dz - cz);
  return Math.min(ice.hw - dx, ice.hd - dz);
}
export const onIce = (x, z, ice = ICE) => iceDepth(x, z, ice) > 0;

export const SKATE = {
  max: 8.5, // m/s, the fastest you glide
  accel: 6.5, // m/s² pushing off
  drag: 0.35, // 1/s: how fast a glide dies away with no push
  grip: 3.2, // 1/s: how fast sideways slip dies away (the blades bite)
  brake: 5, // m/s² pushing against the glide
  jump0: 4.3, // m/s up from a standstill
  jumpPerSpeed: 0.24, // more with speed (8.5 m/s: about 6.3 m/s up, 1.1 s in the air)
  gravity: 11.5, // m/s² (gentle: 0.75 s in the air from a standstill; Yozi 2026-11-21 "자꾸 넘어져")
  perfect: 0.22, // s before the ice: Jump pressed in this window is a perfect landing
  stepOut: 0.4, // a trick with this share or less left at touchdown is a shaky landing, more is a fall
  fall: 0.9, // s on the ice after a fall
  chain: 4, // s: land the next jump within this to keep the combo
  maxMult: 3,
};

// Turns: how long n turns take, and what they are worth.
export const TURN_TIME = (n) => 0.04 + 0.17 * n; // (a quad: 0.72 s of the 1.1 s a jump at full speed lasts)
export const TURN_PTS = [0, 100, 300, 700, 1500];
const TURN_NAME = [
  null,
  { en: 'Single', ko: '싱글', ja: 'シングル', zh: '一周跳' },
  { en: 'Double', ko: '더블', ja: 'ダブル', zh: '两周跳' },
  { en: 'Triple', ko: '트리플', ja: 'トリプル', zh: '三周跳' },
  { en: 'Quad', ko: '쿼드러플', ja: '4回転', zh: '四周跳' },
];
// The two-key tricks. pose(p), p 0..1: spin (turn), flip (pitch), roll, tuck.
const TAU = Math.PI * 2;
const ease = (p) => p * p * (3 - 2 * p);
export const MOVES = {
  UD: { id: 'UD', dur: 0.46, pts: 500, name: { en: 'Butterfly', ko: '버터플라이', ja: 'バタフライ', zh: '蝴蝶跳' }, pose: (p) => ({ flip: Math.sin(Math.PI * p) * 1.25, spin: TAU * ease(p) }) },
  DU: { id: 'DU', dur: 0.5, pts: 600, name: { en: 'Backflip', ko: '백플립', ja: 'バックフリップ', zh: '后空翻' }, pose: (p) => ({ flip: -TAU * ease(p), tuck: Math.sin(Math.PI * p) }) },
  UU: { id: 'UU', dur: 0.44, pts: 400, name: { en: 'Cartwheel', ko: '카트휠', ja: '側転', zh: '侧手翻' }, pose: (p) => ({ roll: TAU * ease(p) }) },
  DD: { id: 'DD', dur: 0.6, pts: 800, name: { en: 'Death Drop', ko: '데스 드롭', ja: 'デスドロップ', zh: '死亡坠落' }, pose: (p) => ({ flip: Math.sin(Math.PI * p) * 1.45, spin: 2 * TAU * ease(p), tuck: Math.sin(Math.PI * p) * 0.6 }) },
};
export const PLAIN = { pts: 20, name: { en: 'Waltz Jump', ko: '왈츠 점프', ja: 'ワルツジャンプ', zh: '华尔兹跳' } };

// One trick as it travels to the others: 'L3', 'R2', 'UD' …
export const trickCode = (k) => (k.turns ? k.dir + k.turns : k.id);
export function trickFromCode(c) {
  const m = /^([LR])([1-4])$/.exec(c);
  if (m) return turnTrick(m[1], Number(m[2]));
  return MOVES[c] ? { ...MOVES[c] } : null;
}
function turnTrick(dir, n) {
  return { turns: n, dir, dur: TURN_TIME(n), pts: TURN_PTS[n], name: TURN_NAME[n] };
}
export const trickName = (k, lang = 'en') => k.name[lang] || k.name.en;

// An arrow pressed `t` seconds into a jump. `jump` is { tricks: [], half:
// null }; each trick gets `at`, when it starts: when the one before it ends,
// or now. The other turn key while a turn is still going (or waiting) raises
// it: ← → ← is one triple, turning the way of its first key. The same key
// twice is a new single. A lone ↑ or ↓
// waits for its partner; a turn key after it drops it.
// `end` is when the jump comes down: a new trick that could only end in a
// fall by then is not started (a late tap, or steering in the air, costs
// nothing). Raising a turn is always taken: that risk is yours.
// Returns the trick it started or raised (null: nothing yet).
export function addPress(jump, k, t, end = Infinity) {
  const { tricks } = jump;
  const last = tricks[tricks.length - 1];
  const free = Math.max(t, last ? last.at + last.dur : 0);
  const fits = (dur) => free >= end || end - free >= dur * (1 - SKATE.stepOut);
  if (k === 'L' || k === 'R') {
    jump.half = null;
    if (last?.turns && last.key !== k && last.turns < 4 && !last.closed && t < last.at + last.dur) {
      Object.assign(last, turnTrick(last.dir, last.turns + 1), { key: k });
      return last;
    }
    if (!fits(TURN_TIME(1))) return null;
    tricks.push({ ...turnTrick(k, 1), key: k, at: free });
    return tricks[tricks.length - 1];
  }
  if (k !== 'U' && k !== 'D') return null;
  if (last?.turns) last.closed = true; // (←→ ↑↓ ← is a double, a butterfly and a single)
  if (!jump.half) { jump.half = k; return null; }
  const move = MOVES[jump.half + k];
  jump.half = null;
  if (!fits(move.dur)) return null;
  tricks.push({ ...move, at: free });
  return tricks[tricks.length - 1];
}

// The body's pose `t` seconds into a jump: { spin, flip, roll, tuck } for
// character.setTrick; i: the trick being done (-1: none), left: how much of
// it is left (0..1).
export function jumpPose(tricks, t) {
  let spin = 0;
  for (let i = 0; i < tricks.length; i++) {
    const k = tricks[i], p = Math.min(1, (t - k.at) / k.dur);
    if (p <= 0) break;
    if (k.turns) {
      spin += (k.dir === 'L' ? 1 : -1) * TAU * k.turns * p;
      if (p < 1) return { spin, flip: 0, roll: 0, tuck: 0.5, i, left: 1 - p };
    } else if (p < 1) {
      const q = k.pose(p);
      return { spin: spin + (q.spin || 0), flip: q.flip || 0, roll: q.roll || 0, tuck: q.tuck || 0, i, left: 1 - p };
    }
  }
  return { spin, flip: 0, roll: 0, tuck: 0, i: -1, left: 0 }; // (whole turns: facing the way you took off)
}

// Gliding with no trick (Yozi 2026-11-21: "묘기를 부리지 않아도 활주하는
// 동작이나 손을 펼치는 동작"): let go of the stick and you coast; after a
// moment the arms open wide, and a long glide becomes a spiral (one leg
// out behind, the body forward). Pushing, jumping or slowing ends it.
export const GLIDE = { after: 0.35, spiralAfter: 2.6, minSpeed: 1.4, spiralSpeed: 3 };
// Which glide: '' none, 'g1' arms open, 'g2' the spiral. coast: seconds
// coasting, speed: m/s.
export const glideKind = (coast, speed) => (coast < GLIDE.after || speed < GLIDE.minSpeed ? '' : coast >= GLIDE.spiralAfter && speed >= GLIDE.spiralSpeed ? 'g2' : 'g1');
// The pose (bone offsets like the stride's in core/model-pack.js), t seconds on.
export function glidePose(kind, t) {
  if (globalThis.__glide?.[kind]) return globalThis.__glide[kind]; // debug: tune live
  if (PAIR_POSE[kind]) return PAIR_POSE[kind];
  const s = Math.sin(t * 1.5);
  if (kind === 'g2') {
    return {
      spine: [0.8, 0, 0.03 * s], head: [-0.7, 0, 0],
      upperarml: [-0.55, -1.3, 0], upperarmr: [-0.55, 1.3, 0],
      upperlegl: [-0.05, 0, 0], lowerlegl: [0.12, 0, 0], footl: [-0.07, 0, 0],
      upperlegr: [1.25 + 0.04 * s, 0, 0], lowerlegr: [0.1, 0, 0], footr: [0.5, 0, 0],
      y: -0.01,
    };
  }
  return {
    spine: [-0.06, 0, 0.05 * s], head: [-0.12, 0, -0.04 * s],
    upperarml: [-0.7 + 0.08 * s, -1.28, 0], upperarmr: [-0.7 - 0.08 * s, 1.28, 0],
    upperlegl: [-0.14, 0, 0], lowerlegl: [0.24, 0, 0], footl: [-0.1, 0, 0],
    upperlegr: [0.22, 0, 0.08], lowerlegr: [0.2, 0, 0], footr: [-0.05, 0, 0],
    y: -0.015,
  };
}
// ---- Two together (Yozi 2026-11-21: "친구랑 손잡고 달리기, 앞에 앉고 달리기";
// no sled). One leads (the one who asked) and skates as usual; the other
// follows, held at a spot beside the leader (hand in hand) or just in front
// (crouching, pushed along). Friends only; either lets go.
export const PAIR = { near: 5, askFor: 15, hand: 0.82, push: 0.72, lost: 4 };
// Between the two: "ice:ask:<to>:hand", "ice:yes:<to>:push", "ice:no:<to>", "ice:end:<to>".
export const pairMsg = (verb, to, kind) => `ice:${verb}:${to}` + (kind ? `:${kind}` : '');
export function parsePairMsg(e) {
  const m = /^ice:(ask|yes|no|end):([\w-]{1,64})(?::(hand|push))?$/.exec(String(e));
  return m ? { verb: m[1], to: m[2], kind: m[3] || null } : null;
}
// What everyone sees (the ip field): "hL:<follower>", "hF:<leader>", "pL:…", "pF:…".
export const pairCode = (kind, role, other) => `${kind === 'push' ? 'p' : 'h'}${role}:${other}`;
export function parsePairCode(c) {
  const m = /^([hp])([LF]):([\w-]{1,64})$/.exec(String(c || ''));
  return m ? { kind: m[1] === 'p' ? 'push' : 'hand', role: m[2], other: m[3], pose: m[1] + m[2] } : null;
}
// Where the follower is, from the leader's place and heading { x, z, ry }:
// at the leader's right hand, or straight in front.
export function pairSpot(kind, lead) {
  const fx = Math.sin(lead.ry), fz = Math.cos(lead.ry);
  if (kind === 'push') return { x: lead.x + fx * PAIR.push, z: lead.z + fz * PAIR.push, ry: lead.ry };
  return { x: lead.x - fz * PAIR.hand, z: lead.z + fx * PAIR.hand, ry: lead.ry };
}
// The poses, laid over the stride (the legs keep skating) except the
// crouch: hL / hF an arm out to the other's hand, pL both arms forward on
// the other's shoulders, pF crouched low with the hands on the knees.
const PAIR_POSE = {
  hL: { over: true, bones: { upperarmr: [-0.55, 1.3, 0], upperarml: [0.1, 0, 0] } },
  hF: { over: true, bones: { upperarml: [-0.55, -1.3, 0], upperarmr: [0.1, 0, 0] } },
  pL: { over: true, bones: { spine: [0.3, 0, 0], head: [-0.2, 0, 0], upperarml: [-1.15, 0.12, 0], upperarmr: [-1.15, -0.12, 0] } },
  pF: {
    spine: [0.45, 0, 0], head: [-0.4, 0, 0],
    upperarml: [-0.75, 0, 0], upperarmr: [-0.75, 0, 0],
    upperlegl: [-1.75, 0, 0], lowerlegl: [2.25, 0, 0], footl: [-0.5, 0, 0],
    upperlegr: [-1.75, 0, 0], lowerlegr: [2.25, 0, 0], footr: [-0.5, 0, 0],
    y: -0.3,
  },
};
export const isPairPose = (kind) => !!PAIR_POSE[kind];

// From pose a to pose b by k (0..1), bone by bone.
export function mixPose(a, b, k) {
  const out = {};
  for (const n of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const p = a?.[n], q = b?.[n];
    if (n === 'y') { out.y = (p || 0) * (1 - k) + (q || 0) * k; continue; }
    const u = p || [0, 0, 0], v = q || [0, 0, 0];
    out[n] = [u[0] + (v[0] - u[0]) * k, u[1] + (v[1] - u[1]) * k, u[2] + (v[2] - u[2]) * k];
  }
  return out;
}
// A glide (or a pose for two) laid over the stride, eased in and out:
// kind() says which now. Returns fn(stroke, dt) for character.setStride.
export function glideStride(kind) {
  let now = '', k = 0, t = 0;
  return (stroke, dt) => {
    const want = kind();
    if (want && want !== now && k < 0.05) now = want;
    const on = want && want === now;
    k += ((on ? 1 : 0) - k) * Math.min(1, dt * (on ? 4 : 7));
    if (!on && k < 0.05) { now = want || ''; if (!want) { k = 0; t = 0; return null; } }
    t += dt;
    const P = glidePose(now, t);
    return mixPose(stroke, P.over ? { ...stroke, ...P.bones } : P, k);
  };
}

// What a jump scores when it comes down `t` seconds after take-off.
//   { kind: 'fall', done } | { kind: 'land', clean, perfect, done: [tricks], pts }
export function judge(tricks, t, perfect = false) {
  const done = [];
  let shaky = false;
  for (const k of tricks) {
    if (t <= k.at) break; // never started: no harm
    const left = 1 - (t - k.at) / k.dur;
    if (left > SKATE.stepOut) return { kind: 'fall', done };
    if (left > 0) shaky = true;
    done.push(k);
  }
  let pts = done.reduce((s, k) => s + k.pts, 0) || PLAIN.pts;
  if (done.length > 1) pts += 100 * (done.length - 1); // more than one trick in one jump
  if (shaky) pts = Math.round(pts * 0.5);
  else if (perfect) pts = Math.round(pts * 1.5);
  return { kind: 'land', clean: !shaky, perfect: perfect && !shaky, done, pts };
}

// The combo multiplier for the n-th clean landing in a row (1, 1.5, 2 … 3).
export const comboMult = (n) => Math.min(SKATE.maxMult, 1 + 0.5 * Math.max(0, n - 1));

// Today's points and the best single jump, kept on the device.
export function bankJump(saved, day, pts) {
  const s = saved?.day === day ? saved : { day, pts: 0, best: saved?.best || 0 };
  return { day, pts: s.pts + pts, best: Math.max(s.best || 0, pts) };
}

// A skater: where they glide, their jump and their combo. step() moves by
// the velocity; the caller keeps them inside the boards (hit()).
export class IceSkater {
  constructor() { this.reset(); }
  reset() {
    this.vx = 0; this.vz = 0; this.y = 0; this.vy = 0;
    this.air = false; this.t = 0; this.half = null; this.tricks = []; this.pressedAt = -1;
    this.down = 0; // seconds left on the ice after a fall
    this.chain = 0; this.chainLeft = 0; this.jumps = 0;
  }
  get speed() { return Math.hypot(this.vx, this.vz); }
  get mult() { return comboMult(this.chain + 1); }
  // Take off (on the ice), or call the landing (in the air).
  jump() {
    if (this.down > 0) return null;
    if (!this.air) {
      this.air = true; this.t = 0; this.half = null; this.tricks = []; this.pressedAt = -1;
      this.vy = SKATE.jump0 + SKATE.jumpPerSpeed * this.speed;
      this.end = 2 * this.vy / SKATE.gravity; // when this jump comes down
      this.y = 0.001;
      this.jumps++;
      return { kind: 'jump' };
    }
    this.pressedAt = this.t;
    return null;
  }
  // An arrow in the air. Returns { kind: 'trick', trick } when it started or raised one.
  press(k) {
    if (!this.air) return null;
    const trick = addPress(this, k, this.t, this.end);
    return trick ? { kind: 'trick', trick } : null;
  }
  // dt seconds on: ax, az the push (a unit vector or less, room axes).
  // Returns { dx, dz, events }.
  step(dt, ax = 0, az = 0) {
    const events = [];
    if (this.chainLeft > 0 && !this.air) { this.chainLeft -= dt; if (this.chainLeft <= 0) this.chain = 0; }
    if (this.down > 0) {
      this.down -= dt;
      const k = Math.exp(-3 * dt); this.vx *= k; this.vz *= k;
      return { dx: this.vx * dt, dz: this.vz * dt, events };
    }
    if (!this.air) {
      const push = Math.hypot(ax, az);
      if (push > 0.05) {
        const ux = ax / push, uz = az / push;
        const along = this.vx * ux + this.vz * uz;
        // Sideways slip dies fast (the blades bite), so you carve round.
        const sx = this.vx - ux * along, sz = this.vz - uz * along, g = Math.exp(-SKATE.grip * dt);
        const a = along < 0 ? SKATE.brake : SKATE.accel * (1 - Math.max(0, along) / SKATE.max);
        const v = along + a * Math.min(1, push) * dt;
        this.vx = ux * v + sx * g; this.vz = uz * v + sz * g;
      } else {
        const k = Math.exp(-SKATE.drag * dt); this.vx *= k; this.vz *= k;
      }
      const s = this.speed;
      if (s > SKATE.max) { this.vx *= SKATE.max / s; this.vz *= SKATE.max / s; }
    } else {
      this.t += dt;
      this.vy -= SKATE.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0; this.vy = 0; this.air = false;
        const left = this.pressedAt < 0 ? Infinity : this.t - this.pressedAt;
        const res = judge(this.tricks, this.t, left <= SKATE.perfect);
        if (res.kind === 'fall') {
          this.down = SKATE.fall; this.chain = 0; this.chainLeft = 0;
          this.vx *= 0.35; this.vz *= 0.35;
          events.push({ kind: 'fall' });
        } else {
          const mult = res.clean && res.done.length ? this.mult : 1;
          if (res.clean && res.done.length) { this.chain++; this.chainLeft = SKATE.chain; } else if (!res.clean) { this.chain = 0; this.chainLeft = 0; }
          if (!res.clean) { this.vx *= 0.6; this.vz *= 0.6; }
          events.push({ ...res, mult, total: Math.round(res.pts * mult) });
        }
        this.tricks = []; this.half = null;
      }
    }
    return { dx: this.vx * dt, dz: this.vz * dt, events };
  }
  // Ran into the boards: moved (mx, mz) instead of (dx, dz) in dt.
  hit(mx, mz, dt) {
    if (dt <= 0) return;
    this.vx = (mx / dt) * 0.6; this.vz = (mz / dt) * 0.6;
  }
  // The pose to draw now (null on the ice, not jumping).
  pose() {
    if (this.down > 0) { const p = 1 - this.down / SKATE.fall; return { spin: 0, flip: -Math.sin(Math.PI * Math.min(1, p * 1.15)) * 1.35, roll: 0, tuck: 1 }; }
    if (!this.air) return null;
    return jumpPose(this.tricks, this.t);
  }
  // What the others need to play my jump: "n:L3,UD" ("n:!" a fall).
  code() {
    if (this.down > 0) return `${this.jumps}:!`;
    return this.air ? `${this.jumps}:${this.tricks.map(trickCode).join(',')}` : '';
  }
}

// Someone else's jump from their code: { n, fall, codes: ['L3', 'UD'] }.
export function peerJump(code) {
  const [n, list = ''] = String(code || '').slice(0, 40).split(':');
  if (!n) return null;
  if (list === '!') return { n, fall: true, codes: [] };
  return { n, fall: false, codes: list.split(',').filter((c) => trickFromCode(c)).slice(0, 8) };
}
// Their tricks kept up with their code, t seconds after we first saw the
// jump: a new one starts now (or after the one before), a raised turn
// (L2 -> L3) keeps its start.
export function syncPeerTricks(tricks, codes, t) {
  codes.forEach((c, i) => {
    const k = trickFromCode(c), old = tricks[i];
    if (old && trickCode(old) === c) return;
    const prev = tricks[i - 1];
    tricks[i] = { ...k, at: old ? old.at : Math.max(t, prev ? prev.at + prev.dur : 0) };
  });
  tricks.length = codes.length;
  return tricks;
}
