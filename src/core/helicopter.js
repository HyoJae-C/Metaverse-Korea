// The operators' helicopter (game/helicopter.js): its chat codes, the flight
// as a function of time, and the line in the operator's state that lets
// everyone near draw the same flight. No three.js here (tests/helicopter.test.mjs).
//
// Then the operator can get in and fly it, with two passengers behind
// (SEATS; the "heli:" messages below ask them aboard).
//
// "/헬기" (/heli): it comes out of the haze far away, high up, slows down
// over the landing spot next to the operator and sinks slowly onto its
// skids; the blades then run down. "/헬기보내기" (/helioff): the blades
// spin up, it lifts off and flies on, away.

// Chat codes (after "/"), upper or lower case.
export const HELI_CODES = {
  '헬기': 'call', '헬리콥터': 'call', heli: 'call', helicopter: 'call',
  '헬기보내기': 'off', '헬기취소': 'off', helioff: 'off',
};
export const heliCode = (code) => HELI_CODES[String(code ?? '').trim().toLowerCase()] || null;

export const HELI = {
  far: 380, // m away when it appears (the street's fog ends at 420)
  alt: 62, // m up on the way in
  hover: 20, // m over the spot when it stops and starts down
  cruise: 26, // s from far away to over the spot
  descend: 15, // s from the hover to the ground ("천천히")
  spinDown: 9, // s for the blades to stop
  spinUp: 4, // s before it lifts off again
  lift: 9, // s back up to the hover
  away: 20, // s from the hover out of sight
  pad: 4.5, // m of clear ground it needs around the spot
};
export const LANDED_AT = HELI.cruise + HELI.descend;
export const LEAVE_LEN = HELI.spinUp + HELI.lift + HELI.away;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (k) => k * k * (3 - 2 * k);

// Where it is `t` seconds after the call, for a spot at the origin on flat
// ground: `d` m out along the way it came from, `y` m up, the nose down by
// `pitch`, the blades at `rotor` (0..1) and the wind on the ground `wash`
// (0..1). `leaveAt` (s after the call, or null): when it was sent away; it
// always lands first. → null once it is out of sight.
export function heliAt(t, leaveAt = null) {
  const H = HELI;
  t = Math.max(0, t);
  const go = leaveAt == null ? Infinity : Math.max(leaveAt, LANDED_AT);
  let d = 0, y = 0, pitch = 0, rotor = 1, phase;
  const idle = (s) => clamp01(1 - (s - LANDED_AT) / H.spinDown);
  if (t >= go) {
    const s = t - go;
    if (s >= LEAVE_LEN) return null;
    rotor = Math.min(1, Math.max(idle(go), s / H.spinUp));
    if (s < H.spinUp) phase = 'spinup';
    else if (s < H.spinUp + H.lift) {
      const k = (s - H.spinUp) / H.lift;
      y = H.hover * smooth(k);
      phase = 'lift';
    } else {
      const k = (s - H.spinUp - H.lift) / H.away;
      d = -H.far * k * k; // on past the spot, the way it was heading
      y = H.hover + (H.alt - H.hover) * smooth(k);
      pitch = 0.2 * clamp01(k * 4);
      phase = 'away';
    }
  } else if (t < H.cruise) {
    const k = t / H.cruise;
    d = H.far * Math.pow(1 - k, 2.2); // fast far away, slow at the end
    y = H.hover + (H.alt - H.hover) * (1 - smooth(k));
    pitch = 0.2 * Math.sqrt(1 - k) - 0.1 * clamp01(1 - Math.abs(k - 0.88) / 0.12); // nose down, then a flare to stop
    phase = 'cruise';
  } else if (t < LANDED_AT) {
    const k = (t - H.cruise) / H.descend;
    y = H.hover * (1 - Math.sin(k * Math.PI / 2)); // slower and slower down to the skids
    phase = 'descend';
  } else {
    rotor = idle(t);
    phase = 'landed';
  }
  const wash = rotor * clamp01(1 - y / 16);
  return { d, y, pitch, rotor, wash, phase };
}

// The flight in the operator's state ("he"): the spot (x, z, ground y), the
// way it comes from (degrees), when it was called and when it was sent away
// (seconds on the wall clock; 0 = still here).
export function encodeHeli(h) {
  const r1 = (v) => Math.round(v * 10) / 10;
  return [r1(h.x), r1(h.z), r1(h.y || 0), Math.round(h.dir), Math.round(h.t0), Math.round(h.t1 || 0)].join(',');
}
export function parseHeli(s) {
  if (typeof s !== 'string' || s.length > 80) return null;
  if (s[0] === 'F') return parseCrewed(s);
  const v = s.split(',').map(Number);
  if (v.length !== 6 || !v.every(Number.isFinite)) return null;
  const [x, z, y, dir, t0, t1] = v;
  if (Math.abs(x) > 1e5 || Math.abs(z) > 1e5 || Math.abs(y) > 500 || t0 <= 0 || t1 < 0) return null;
  return { x, z, y, dir: ((dir % 360) + 360) % 360, t0, t1: t1 || null };
}

// Where to draw it at `now` (wall clock, s). A clock a little behind the
// operator's sees the call at its start, never before it. → null when gone.
export function heliPose(h, now) {
  const a = heliAt(now - h.t0, h.t1 == null ? null : h.t1 - h.t0);
  if (!a) return null;
  const rad = h.dir * Math.PI / 180;
  return { ...a, x: h.x + Math.sin(rad) * a.d, z: h.z + Math.cos(rad) * a.d, y: h.y + a.y, yaw: rad + Math.PI };
}

// A clear spot for it next to (x, z), the nearest first: in front of the
// operator (facing `yaw`), then round them, then further out.
// free(x, z, r) → nothing in the way.
export function findPad(x, z, yaw, free) {
  for (const r of [8, 11, 15, 20]) {
    for (let i = 0; i < 12; i++) {
      const a = yaw + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * (Math.PI / 6);
      const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
      if (free(px, pz, HELI.pad)) return { x: px, z: pz };
    }
  }
  return null;
}

// ---------- Flying it ----------
// Where people sit, in the helicopter's frame (x: its left, y up from the
// skids, z toward the nose): its own pilot (the captain, who brings it and
// takes it away) in the left front seat, the operator next to them at the
// second set of controls, two passengers behind.
export const SEATS = { captain: [0.42, 0.98, 1.05], pilot: [-0.42, 0.98, 1.05], riders: [[-0.44, 0.98, -0.2], [0.44, 0.98, -0.2]] };
export const FLY = { speed: 24, fast: 42, climb: 9, top: 120, board: 5.5, ask: 7 }; // m/s; the highest (m: others draw people up to 140); how close to get in (m), to ask someone aboard (m)

// A seat's place in the world for a helicopter at (x, y, z) heading `yaw`.
export function seatAt(seat, x, y, z, yaw) {
  const s = Math.sin(yaw), c = Math.cos(yaw);
  return [x + seat[0] * c + seat[2] * s, y + seat[1], z - seat[0] * s + seat[2] * c];
}
// The helicopter under a pilot whose feet are at (x, y, z), facing `yaw`.
export function craftUnder(x, y, z, yaw) {
  const [sx, sy, sz] = seatAt(SEATS.pilot, 0, 0, 0, yaw);
  return [x - sx, y - sy, z - sz];
}

// With the operator aboard the state line is "F,<blades 0..10>,<ground y>":
// the helicopter is wherever they are (their own position is sent as usual).
export function encodeCrewed(rotor, groundY) {
  return `F,${Math.round(Math.min(1, Math.max(0, rotor)) * 10)},${Math.round((groundY || 0) * 10) / 10}`;
}
function parseCrewed(s) {
  const m = /^F,(\d{1,2}),(-?\d{1,3}(?:\.\d)?)$/.exec(s);
  return m && +m[1] <= 10 ? { crewed: true, rotor: +m[1] / 10, ground: +m[2] } : null;
}
// A passenger's state ("hr"): whose helicopter, and which seat.
export const encodeRider = (pilot, slot) => `${pilot}:${slot ? 1 : 0}`;
export function parseRider(s) {
  const m = typeof s === 'string' && /^([\w-]{1,64}):([01])$/.exec(s);
  return m ? { pilot: m[1], slot: +m[2] } : null;
}

// Asking someone aboard, on the emote channel: 'heli:<verb>:<target>[:<seat>]'.
export const heliMsg = (verb, target, slot) => `heli:${verb}:${target}` + (slot == null ? '' : `:${slot ? 1 : 0}`);
export function parseHeliMsg(e) {
  const m = /^heli:(invite|join|no|leave|end):([\w-]{1,64})(?::([01]))?$/.exec(String(e));
  return m ? { verb: m[1], target: m[2], slot: m[3] == null ? null : +m[3] } : null;
}
