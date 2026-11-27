// Bongeunsa's Maitreya Buddha stands up on a terrace (map landmark
// "maitreya" with `lift`, scripts/bongeunsa-layout.mjs): how high the ground
// is at a point. The plaza is l.lift above the yards; its stairs go down
// from the gap in the front kerb (l.stairs = [width, run]), drawn as a
// smooth slope so the camera doesn't jolt at every step, to the top of a
// gentle paved slope (l.ramp = [long, high]) up from the yard. Small, so main.js
// has it from the start; the meshes are core/bongeunsa-model.js.
// The landmark's frame: the statue at (l.x, l.z), facing +v (turned l.ry);
// l.plaza = [w, length, the plaza's middle ahead of the statue].

export function terraceHeight(l, dx, dz) {
  const c = Math.cos(l.ry || 0), s = Math.sin(l.ry || 0);
  const u = dx * c - dz * s, v = dx * s + dz * c;
  const [pw, pl, pc] = l.plaza, front = pc + pl / 2;
  if (Math.abs(u) <= pw / 2 && v >= pc - pl / 2 && v <= front) return l.lift;
  const [sw, run] = l.stairs || [0, 0], [len, rise] = l.ramp || [0, 0];
  if (Math.abs(u) > sw / 2 || v <= front) return 0;
  if (v < front + run) return l.lift - (l.lift - rise) * ((v - front) / run); // the stairs (down to the slope's top)
  if (v < front + run + len) return rise * (1 - (v - front - run) / len); // the gentle slope up to them (l.ramp = [long, high])
  return 0;
}

// Bongeunsa's Jinyeomun (the 'g' hall of a "bongeunsa" landmark with
// gateMid) stands on a stone base as palacehalls draws it (core/palace-model.js):
// B high, w + 0.7 × d + 0.7. Its middle bay is gateMid wide between the posts;
// steps go up to the base in front and behind (Yozi 2026-11-15: people sank
// into the base and juddered going through), drawn as a smooth slope.
export function gateStep([, , w, d], mid) {
  const B = Math.min(0.6, 0.25 + Math.min(w, d) * 0.05), n = Math.max(2, Math.ceil(B / 0.2));
  return { B, n, tread: 0.4, run: n * 0.4, bw: (w + 0.7) / 2, bd: (d + 0.7) / 2, sw: Math.max(0.9, mid - 0.4) };
}
// The ground's height at (dx, dz) from the gate's middle, in the landmark's frame.
export function gateHeight(h, mid, dx, dz) {
  const c = Math.cos(h[4]), s = Math.sin(h[4]);
  const u = dx * c - dz * s, v = Math.abs(dx * s + dz * c);
  const { B, run, bw, bd, sw } = gateStep(h, mid);
  if (Math.abs(u) <= bw && v <= bd) return B;
  if (Math.abs(u) <= sw / 2 && v < bd + run) return B * (1 - (v - bd) / run);
  return 0;
}

// Hyangwonjeong's island and Chwihyanggyo, its arched bridge (Gyeongbokgung,
// landmark "hyangwonjeong", drawn by core/palace-garden.js): l.isle = [r, top],
// the island's radius and its top over the ground; l.span = [dx, dz, w, rise],
// the bridge's shore end from the pavilion, its width, and how high the arch
// stands over the straight line. (dx, dz): from the pavilion.
export function isleHeight(l, dx, dz) {
  const [r, top] = l.isle;
  if (dx * dx + dz * dz <= r * r) return top;
  const [sx, sz, w, rise] = l.span, L = Math.hypot(sx, sz), v = (dx * sx + dz * sz) / L;
  if (v < 0 || v > L || Math.abs(dx * sz - dz * sx) / L > w / 2) return 0;
  const t = (v - r) / (L - r); // 0 at the island's edge, 1 on the shore
  return top * (1 - t) + rise * Math.sin(Math.PI * t);
}

// ---- The palaces (core/palace-model.js draws these; the numbers here are
// its numbers). Yozi 2026-11-27: "going up the steps my feet sink in": the
// throne hall's terraces, the gates' stone bases and Yeongjegyo's deck had
// no height, so you walked through the stone.

// A small gate of the halls ('g'): three bays when it is wide enough, the
// middle one this wide between the posts' lines; else one bay, the whole
// width. (given: Bongeunsa's Jinyeomun says its own.)
export const gateMid = (w, given) => given || (w >= 3.6 ? Math.max(1.8, w * 0.42) : w);
// The throne hall's terraces (월대): T1 below, T2 on it towards the back,
// each with steps down its front (three treads of half a metre, the two
// flights and the dragon slab 7.8 s wide together). s: l.hs.
export function throneTerraces(s = 1, l = {}) {
  const T1 = { w: l.t1?.[0] || 56 * s, d: l.t1?.[1] || 40 * s, h: 1.5 * s }, T2 = { w: l.t2?.[0] || 46 * s, d: l.t2?.[1] || 32 * s, h: 1.5 * s };
  const n = Math.max(3, Math.round(T1.h / 0.3));
  return { T1, T2, zT: -(T1.d - T2.d) / 4, n, run: n * 0.5, sw: 3.9 * s };
}
// A palace gate's base: a slab 0.5 high, w + 3 by d + 3, a second one on it,
// w + 2 by d + 2, up to 0.745; steps down the front and the back.
export const GATE_BASE = { low: 0.5, top: 0.745, run: 0.75 };
// Yeongjegyo's deck: a hump in three steps, a low step at each end.
export const bridgeDeck = (l) => { const ch = l.ch || 5, L = ch + 4; return { bw: l.bridge || 14, L, at: [[L / 2 + 0.5, 0], [L / 2, 0.4], [(L - 3) / 2, 0.625], [(L - 5.4) / 2, 0.82]] }; };

// The ground's height at (dx, dz) from a throne / palacegate / yeongjegyo
// landmark, in world metres (the landmark's own turn and "sc" undone).
export function palaceHeight(l, dx, dz) {
  const c = Math.cos(l.ry || 0), s = Math.sin(l.ry || 0), kx = l.sc?.[0] ?? 1, ky = l.sc?.[1] ?? kx;
  const u = Math.abs(dx * c - dz * s) / kx, v = (dx * s + dz * c) / kx; // the model's metres: across, and to the front
  if (l.type === 'throne') {
    const { T1, T2, zT, run, sw } = throneTerraces(l.hs || 1, l), f2 = zT + T2.d / 2, f1 = T1.d / 2;
    if (u <= T2.w / 2 && Math.abs(v - zT) <= T2.d / 2) return (T1.h + T2.h) * ky;
    if (u <= sw && v > f2 && v < f2 + run) return (T1.h + T2.h * (1 - (v - f2) / run)) * ky;
    if (u <= T1.w / 2 && Math.abs(v) <= f1) return T1.h * ky;
    if (u <= sw && v > f1 && v < f1 + run) return T1.h * (1 - (v - f1) / run) * ky;
    return 0;
  }
  if (l.type === 'palacegate') {
    const k = l.s || 1, hw = ((l.w || 22) * k) / 2, hd = ((l.d || 8) * k) / 2, a = Math.abs(v), { low, top, run } = GATE_BASE;
    if (u > hw + 1.5 || a >= hd + 1.5 + run) return 0;
    if (a > hd + 1.5) return low * (1 - (a - hd - 1.5) / run) * ky;
    if (u > hw + 1) return low * ky;
    return (low + (top - low) * Math.min(1, (hd + 1.5 - a) / 0.5)) * ky;
  }
  if (l.type === 'yeongjegyo') {
    const { bw, at } = bridgeDeck(l), a = Math.abs(v);
    if (u > bw / 2 || a >= at[0][0]) return 0;
    for (let i = 1; i < at.length; i++) if (a >= at[i][0]) return (at[i][1] + (at[i - 1][1] - at[i][1]) * ((a - at[i][0]) / (at[i - 1][0] - at[i][0]))) * ky;
    return at.at(-1)[1] * ky;
  }
  return 0;
}

const lists = new WeakMap();
const raised = (list) => {
  let ts = lists.get(list);
  if (!ts) {
    ts = [];
    for (const l of list) {
      if (l.type === 'maitreya' && l.lift) ts.push(l);
      if (l.type === 'hyangwonjeong') ts.push(l);
      if (l.type === 'throne' || l.type === 'palacegate' || l.type === 'yeongjegyo') ts.push({ palace: l, x: l.x, z: l.z });
      if (l.type === 'palacehalls') for (const h of l.halls || []) if (h[5] === 'g') ts.push({ gate: h, mid: gateMid(h[2]), ry: 0, x: (l.x || 0) + h[0], z: (l.z || 0) + h[1] }); // (the halls' landmark is not turned)
      if (l.type === 'bongeunsa' && l.gateMid) {
        const h = (l.halls || []).find((q) => q[5] === 'g');
        if (!h) continue;
        const c = Math.cos(l.ry || 0), s = Math.sin(l.ry || 0); // (the landmark's group turned l.ry)
        ts.push({ gate: h, mid: l.gateMid, ry: l.ry || 0, x: l.x + h[0] * c + h[1] * s, z: l.z - h[0] * s + h[1] * c });
      }
    }
    lists.set(list, ts);
  }
  return ts;
};
// World (x, z) -> the ground's height on a raised temple plaza or gate base in the list.
export function terraceY(list = [], x, z) {
  for (const l of raised(list)) {
    const dx = x - l.x, dz = z - l.z;
    if (l.isle) {
      if (dx * dx + dz * dz < 400) { const y = isleHeight(l, dx, dz); if (y) return y; }
      continue;
    }
    if (l.palace) {
      if (dx * dx + dz * dz > 1600) continue;
      const y = palaceHeight(l.palace, dx, dz);
      if (y) return y;
      continue;
    }
    if (l.gate) {
      if (dx * dx + dz * dz > 64) continue;
      const c = Math.cos(l.ry), s = Math.sin(l.ry); // (back into the landmark's frame)
      const y = gateHeight(l.gate, l.mid, dx * c - dz * s, dx * s + dz * c);
      if (y) return y;
      continue;
    }
    if (dx * dx + dz * dz > 900) continue; // (30 m: the plaza, its stairs and the slope)
    const y = terraceHeight(l, dx, dz);
    if (y) return y;
  }
  return 0;
}

// The raised plaza's landmark if (x, z) is up on it (not on its stairs), or null.
export function onTerrace(list = [], x, z) {
  for (const l of raised(list)) {
    if (l.gate || l.isle || l.palace) continue;
    const dx = x - l.x, dz = z - l.z;
    if (dx * dx + dz * dz < 900 && terraceHeight(l, dx, dz) === l.lift) return l;
  }
  return null;
}
