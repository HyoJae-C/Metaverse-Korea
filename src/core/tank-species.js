// The rest of the fishing catalogue (core/fishing.js FISH) drawn the way the
// aquarium's animals are (core/sea-life.js): a painted body, big eyes,
// rounded fins. Most fish come from one recipe (fish() below: a body, a
// dorsal fin, a tail and colours); the ones that aren't fish (a crab, an
// octopus, seaweed) get their own few shapes. Loaded with the fish tanks.
//
// Same units as sea-life.js: one unit long, nose along +x. Things that live
// on the sand stand on y = 0 with their length along x; plants grow up y.
import * as THREE from 'three';
import { addSpecies, parts } from './sea-life.js';

const { lerp, smooth, mix, finish, body, fin, flatFin, ball, rod, eyes, mouth, pectorals, inBand } = parts;
const col = (c) => new THREE.Color(c);

// A dorsal fin along the top of the body from xa to xb, `h` tall.
// kind: 'tri' (one peak), 'long' (a low ridge), 'sail' (very tall),
// 'spiny' (a row of spikes), 'two' (a spiny one and a soft one).
function dorsal(b, kind, xa, xb, h, color, opts = {}) {
  const top = (x) => b.surf(x, 1)[1] - 0.012;
  const ya = top(xa), yb = top(xb);
  if (kind === 'tri') return fin([[xa, ya], [lerp(xa, xb, 0.35), ya + h], [lerp(xa, xb, 0.6), ya + h * 0.85], [xb, yb]], color, opts);
  if (kind === 'long') return fin([[xa, ya], [lerp(xa, xb, 0.1), ya + h], [lerp(xa, xb, 0.9), yb + h], [xb, yb]], color, opts);
  if (kind === 'sail') return fin([[xa, ya], [lerp(xa, xb, 0.15), ya + h * 0.6], [lerp(xa, xb, 0.75), yb + h], [xb, yb + h * 0.4], [xb, yb]], color, opts);
  if (kind === 'spiny' || kind === 'two') {
    const n = 8, pts = [[xa, ya]];
    const xe = kind === 'two' ? lerp(xa, xb, 0.55) : xb;
    for (let i = 0; i < n; i++) {
      const x0 = lerp(xa, xe, i / n), x1 = lerp(xa, xe, (i + 0.5) / n);
      pts.push([x0, top(x0) + h * 0.45], [x1, top(x1) + h]);
    }
    pts.push([xe, top(xe)]);
    const out = fin(pts, color, { ...opts, sharp: true });
    if (kind === 'two') out.push(...fin([[xe, top(xe)], [lerp(xe, xb, 0.2), top(xe) + h * 0.8], [lerp(xe, xb, 0.8), yb + h * 0.7], [xb, yb]], color, opts));
    return out;
  }
  return [];
}

// The tail on the stalk at x0. kind: 'fork', 'deep' (a deep fork), 'round',
// 'square', 'lunate' (a tuna's crescent), 'point' (an eel's).
function tail(x0, kind, s, color, opts = {}) {
  const a = x0 + 0.02;
  if (kind === 'fork') return fin([[a, 0.03], [x0 - 0.2 * s, 0.15 * s], [x0 - 0.13 * s, 0], [x0 - 0.2 * s, -0.15 * s], [a, -0.03]], color, { sharp: true, ...opts });
  if (kind === 'deep') return fin([[a, 0.025], [x0 - 0.22 * s, 0.17 * s], [x0 - 0.1 * s, 0], [x0 - 0.22 * s, -0.17 * s], [a, -0.025]], color, { sharp: true, ...opts });
  if (kind === 'lunate') return fin([[a, 0.02], [x0 - 0.12 * s, 0.2 * s], [x0 - 0.08 * s, 0.03], [x0 - 0.06 * s, 0], [x0 - 0.08 * s, -0.03], [x0 - 0.12 * s, -0.2 * s], [a, -0.02]], color, { sharp: true, ...opts });
  if (kind === 'round') return fin([[a, 0.04], [x0 - 0.1 * s, 0.13 * s], [x0 - 0.19 * s, 0.08 * s], [x0 - 0.21 * s, 0], [x0 - 0.19 * s, -0.08 * s], [x0 - 0.1 * s, -0.13 * s], [a, -0.04]], color, opts);
  if (kind === 'square') return fin([[a, 0.04], [x0 - 0.17 * s, 0.13 * s], [x0 - 0.19 * s, 0], [x0 - 0.17 * s, -0.13 * s], [a, -0.04]], color, opts);
  if (kind === 'point') return fin([[a, 0.02], [x0 - 0.12 * s, 0.005], [x0 - 0.12 * s, -0.005], [a, -0.02]], color, opts);
  return [];
}

// The recipe for an ordinary fish.
//   H, W: height and width (body units); peak, ped, nose: the outline (see
//   sea-life.js envelope); x0: where the tail stalk is.
//   back, belly: colours top and bottom (soft line at `line`, from -1 to 1);
//   paint(c, x, y, z, u, t): changes the colour c for a pattern.
//   eye: [x, u, r, ring]; dorsal: [kind, xa, xb, h, colour]; tail: [kind,
//   size, colour]; anal: [xa, xb, h] (a fin underneath); pec: colour;
//   more(b): extra parts (barbels, a bill).
function fish(o) {
  const { H, W, peak = 0.5, ped = 0.24, nose = 2, x0 = -0.3, back, belly, line = 0.1, soft = 0.45, paint, cy, hf } = o;
  const b = body({ x0, H, W, peak, ped, nose, cy, hf, color: (x, y, z, u, t) => {
    const c = mix(belly, back, smooth(line - soft, line + soft, u));
    return paint ? paint(c, x, y, z, u, t) || c : c;
  } });
  const fc = o.fins || mix(back, belly, 0.4);
  const [ex = 0.38, eu = 0.2, er = 0.05, ring = '#5a4a30'] = o.eye || [];
  const out = [b.geo, ...eyes(b, ex, eu, er, ring), ...mouth(b, 0.48, -0.15, Math.max(0.03, H * 0.15))];
  if (o.dorsal) { const [k, xa, xb, h, c = fc] = o.dorsal; out.push(...dorsal(b, k, xa, xb, h, c, o.dorsalOpts)); }
  if (o.anal) { const [xa, xb, h, c = fc] = o.anal, ya = b.surf(xa, -1)[1] + 0.012, yb = b.surf(xb, -1)[1] + 0.012; out.push(...fin([[xa, ya], [lerp(xa, xb, 0.3), ya - h], [lerp(xa, xb, 0.7), yb - h * 0.8], [xb, yb]], c)); }
  if (o.tail !== null) { const [k = 'fork', s = 1, c = fc] = o.tail || []; out.push(...tail(x0, k, s * Math.max(0.6, H / 0.25), c, o.tailOpts)); }
  if (o.pec !== null) out.push(...pectorals([[0, 0], [-0.02, -0.08], [-0.09, -0.08]].map(([x, y]) => [x, y * Math.max(0.7, H / 0.25)]), o.pec || fc, 0.28, -H * 0.15, W * 0.35, 1));
  if (o.more) out.push(...o.more(b));
  return out;
}
const spots = (x, u, f, r) => { const a = Math.sin(x * f) * Math.sin(u * f * 0.5); return smooth(1 - r, 1, a); };
const def = (mode, hz, amp, build) => ({ mode, hz, amp, build });

const MORE = {
  // ---- river and pond fish ----
  loach: def('fish', 8, 0.1, () => fish({ H: 0.12, W: 0.11, peak: 0.6, ped: 0.6, nose: 2.4, x0: -0.4, back: '#7a6438', belly: '#d8c89a',
    paint: (c, x, y, z, u) => c.lerp(col('#4a3a20'), 0.6 * spots(x, u + 1, 60, 0.25)),
    eye: [0.42, 0.25, 0.028], dorsal: ['tri', -0.1, 0.02, 0.06], tail: ['round', 0.8], pec: '#b8a070',
    more: (b) => [-1, 1].flatMap((s) => [0, 1, 2].map((i) => rod([0.48, -0.03, s * 0.02], [0.53, -0.05 - i * 0.012, s * (0.035 + i * 0.01)], 0.004, 0.002, '#6a5432'))) })),
  crucian: def('fish', 7, 0.07, () => fish({ H: 0.4, W: 0.2, peak: 0.5, ped: 0.32, nose: 1.9, back: '#6a6a3a', belly: '#d8c070',
    paint: (c, x, y, z, u, t) => c.multiplyScalar(1 + 0.06 * smooth(0.5, 0.9, Math.abs(Math.sin(t * 60) * Math.sin(u * 7)))),
    eye: [0.37, 0.25, 0.055, '#b89040'], dorsal: ['long', -0.16, 0.14, 0.09], anal: [-0.2, -0.1, 0.07], tail: ['fork', 0.9], fins: '#8a7a48' })),
  ricefish: def('fish', 12, 0.08, () => fish({ H: 0.24, W: 0.15, peak: 0.55, ped: 0.4, nose: 2.2, back: '#c8b070', belly: '#f8f0d8',
    paint: (c, x, y, z, u) => c.lerp(col('#7a6a40'), 0.6 * inBand(u, 0.05, 0.14, 0.03) * inBand(x, -0.25, 0.3, 0.03)),
    eye: [0.36, 0.3, 0.085, '#3a5a8a'], dorsal: ['tri', -0.22, -0.12, 0.06], anal: [-0.22, 0.0, 0.07], tail: ['square', 0.8], fins: '#e8dcb0' })),
  bluegill: def('fish', 8, 0.07, () => fish({ H: 0.5, W: 0.18, peak: 0.5, ped: 0.3, nose: 1.8, back: '#4a6a4a', belly: '#f0a040', line: -0.2,
    paint: (c, x, y, z, u) => {
      const bar = smooth(0.2, 0.7, Math.sin((x + 0.1) * 40)) * inBand(x, -0.22, 0.25, 0.03) * 0.35;
      const ear = 1 - smooth(0.8, 1.05, Math.hypot((x - 0.24) / 0.04, (u - 0.12) / 0.16)); // the dark "ear" flap
      return c.lerp(col('#2a3a3a'), bar).lerp(col('#141c2a'), ear);
    }, eye: [0.36, 0.3, 0.055], dorsal: ['two', -0.2, 0.18, 0.12], anal: [-0.2, -0.04, 0.1], tail: ['fork', 0.9], fins: '#4a6050' })),
  catfish: def('fish', 5, 0.08, () => fish({ H: 0.17, W: 0.2, peak: 0.75, ped: 0.4, nose: 3, x0: -0.38, back: '#3a3a30', belly: '#c8c0a8', line: -0.3,
    paint: (c, x, y, z, u) => c.multiplyScalar(1 - 0.15 * spots(x, u, 30, 0.3) * (u > 0 ? 1 : 0)),
    eye: [0.4, 0.4, 0.024, '#5a5030'], dorsal: ['tri', 0.08, 0.16, 0.05], anal: [-0.36, 0.05, 0.05], tail: ['round', 0.7], fins: '#4a4838',
    more: () => [-1, 1].flatMap((s) => [rod([0.47, 0.0, s * 0.05], [0.62, -0.03, s * 0.16], 0.008, 0.003, '#2a2a22'), rod([0.47, -0.04, s * 0.03], [0.53, -0.1, s * 0.06], 0.005, 0.002, '#2a2a22')]) })),
  trout: def('fish', 7, 0.07, () => fish({ H: 0.25, W: 0.16, back: '#6a7a50', belly: '#f0ece0', line: 0,
    paint: (c, x, y, z, u) => c.lerp(col('#e07888'), 0.65 * inBand(u, -0.25, 0.1, 0.12) * inBand(x, -0.28, 0.38, 0.04)).lerp(col('#2a2a20'), 0.7 * spots(x, u, 70, 0.2) * smooth(-0.3, 0.2, u)),
    eye: [0.39, 0.22, 0.045], dorsal: ['tri', -0.04, 0.1, 0.1], anal: [-0.22, -0.1, 0.07], tail: ['square', 1], fins: '#8a8a6a',
    more: (b) => fin([[-0.24, b.surf(-0.24, 1)[1] - 0.01], [-0.22, b.surf(-0.22, 1)[1] + 0.04], [-0.19, b.surf(-0.19, 1)[1] - 0.01]], '#6a7a50') })),
  'gizzard-shad': def('fish', 10, 0.07, () => fish({ H: 0.3, W: 0.15, peak: 0.5, nose: 1.9, back: '#3a6a90', belly: '#f2f5f8', line: 0.15,
    paint: (c, x, y, z, u) => c.lerp(col('#1e2a40'), 1 - smooth(0.8, 1.1, Math.hypot((x - 0.25) / 0.025, (u - 0.25) / 0.12))).lerp(col('#2a4a6a'), 0.5 * smooth(0.6, 0.95, Math.sin(u * 30)) * smooth(0.2, 0.4, u)),
    eye: [0.39, 0.2, 0.05], dorsal: ['tri', -0.06, 0.08, 0.1], anal: [-0.22, -0.04, 0.05], tail: ['deep', 1], fins: '#90a8b8',
    dorsalOpts: { tip: '#c8d8e4' } })),
  // ---- sea fish ----
  anchovy: def('fish', 13, 0.07, () => fish({ H: 0.18, W: 0.13, nose: 1.6, back: '#5a8aa8', belly: '#f4f8fa', line: 0.05,
    paint: (c, x, y, z, u) => c.lerp(col('#e8f0f6'), 0.8 * inBand(u, -0.05, 0.1, 0.04) * inBand(x, -0.25, 0.35, 0.04)),
    eye: [0.38, 0.1, 0.055, '#7a8a9a'], dorsal: ['tri', -0.02, 0.08, 0.07], anal: [-0.2, -0.1, 0.04], tail: ['deep', 0.9], fins: '#a8c0d0' })),
  herring: def('fish', 11, 0.07, () => fish({ H: 0.22, W: 0.14, nose: 1.8, back: '#2a5a7a', belly: '#f4f6f8', line: 0.2, soft: 0.3,
    eye: [0.39, 0.15, 0.05, '#8a9aa8'], dorsal: ['tri', -0.02, 0.1, 0.09], anal: [-0.2, -0.08, 0.04], tail: ['deep', 1], fins: '#7a9ab0' })),
  mackerel: def('fish', 9, 0.06, () => fish({ H: 0.22, W: 0.17, peak: 0.5, ped: 0.15, nose: 2.2, back: '#2a7a7a', belly: '#f2f4f2', line: 0.05, soft: 0.25,
    paint: (c, x, y, z, u) => (u > 0.2 ? c.lerp(col('#10283a'), 0.8 * smooth(0.3, 0.7, Math.sin(x * 45 + Math.sin(u * 9) * 2.2))) : c),
    eye: [0.4, 0.15, 0.045], dorsal: ['two', -0.15, 0.15, 0.08], anal: [-0.18, -0.08, 0.04], tail: ['deep', 1], fins: '#4a6a7a',
    more: (b) => [0, 1, 2, 3].flatMap((i) => fin([[-0.2 - i * 0.025, b.surf(-0.2 - i * 0.025, 1)[1] - 0.005], [-0.21 - i * 0.025, b.surf(-0.21, 1)[1] + 0.025], [-0.22 - i * 0.025, b.surf(-0.22 - i * 0.025, 1)[1] - 0.005]], '#3a5a6a', { sharp: true, rays: false })) })),
  saury: def('fish', 11, 0.07, () => fish({ H: 0.11, W: 0.08, peak: 0.45, ped: 0.35, nose: 3, x0: -0.4, back: '#2a4a7a', belly: '#f2f4f8', line: 0.1, soft: 0.3,
    eye: [0.38, 0.2, 0.025], dorsal: ['tri', -0.32, -0.24, 0.04], anal: [-0.34, -0.25, 0.035], tail: ['deep', 0.55, '#3a5a8a'], fins: '#5a7aa0', pec: null,
    more: () => [rod([0.45, -0.01, 0], [0.55, -0.015, 0], 0.008, 0.002, '#e8b020')] })), // the yellow beak tip
  seabream: def('fish', 7, 0.06, () => fish({ H: 0.42, W: 0.17, peak: 0.48, ped: 0.24, nose: 1.6, back: '#e0607a', belly: '#f8e0e0', line: -0.1,
    paint: (c, x, y, z, u) => c.lerp(col('#4ab0e0'), 0.8 * spots(x, u, 55, 0.12) * smooth(-0.1, 0.3, u)),
    eye: [0.36, 0.3, 0.05, '#d06070'], dorsal: ['two', -0.2, 0.2, 0.1], anal: [-0.2, -0.06, 0.07], tail: ['fork', 1], fins: '#e88090' })),
  rockfish: def('fish', 6, 0.06, () => fish({ H: 0.36, W: 0.2, peak: 0.6, ped: 0.3, nose: 1.7, back: '#5a4a3a', belly: '#c8b8a0', line: -0.2,
    paint: (c, x, y, z, u) => c.lerp(col('#2a2018'), 0.5 * smooth(0.3, 0.8, Math.sin(x * 22 + u * 3))),
    eye: [0.38, 0.4, 0.065, '#c08040'], dorsal: ['two', -0.2, 0.25, 0.12], anal: [-0.2, -0.06, 0.08], tail: ['square', 0.9], fins: '#5a4838' })),
  'red-lionfish': def('fish', 4, 0.05, () => fish({ H: 0.3, W: 0.16, peak: 0.55, ped: 0.28, nose: 1.8, back: '#b8402a', belly: '#f4e4d8', line: -0.6, soft: 0.2,
    paint: (c, x, y, z, u) => c.lerp(col('#fbf2e8'), 0.85 * smooth(0.25, 0.65, Math.sin(x * 50 + u * 1.5))),
    eye: [0.38, 0.3, 0.045, '#c04030'], dorsal: ['spiny', -0.18, 0.28, 0.32, '#e8a090'], anal: [-0.2, -0.06, 0.1], tail: ['round', 1, '#e8b0a0'], fins: '#c85a40', pec: null,
    more: () => [-1, 1].flatMap((s) => fin([[0.2, 0], [0.12, -0.08], [-0.08, -0.36], [-0.14, -0.3], [0.05, 0.02]], '#d8705a', { rx: -s * 1.1, ry: s * 0.3, at: [0, -0.05, s * 0.05], tip: '#f4d8c8' })) })),
  yellowtail: null, // (the aquarium's: core/sea-life.js)
  cutlassfish: def('fish', 6, 0.12, () => fish({ H: 0.08, W: 0.03, peak: 0.6, ped: 0.05, nose: 3, x0: -0.5, back: '#d8e2ea', belly: '#f8fafc', line: 0.2,
    paint: (c, x, y, z, u) => c.multiplyScalar(1 + 0.12 * Math.sin(u * 3 + x * 20)), // the silver shimmer
    eye: [0.42, 0.25, 0.022, '#c8b040'], dorsal: ['long', -0.48, 0.38, 0.025, '#e8eef2'], tail: null, pec: null })),
  puffer: def('fish', 9, 0.05, () => fish({ H: 0.5, W: 0.45, peak: 0.55, ped: 0.35, nose: 2.6, back: '#6a7a50', belly: '#f8f6ee', line: -0.15, soft: 0.25,
    paint: (c, x, y, z, u) => (u > -0.1 ? c.lerp(col('#2a3020'), 0.7 * spots(x, u, 60, 0.18)) : c),
    eye: [0.33, 0.35, 0.075, '#3a8a5a'], dorsal: ['tri', -0.22, -0.12, 0.08], anal: [-0.22, -0.12, 0.07], tail: ['round', 0.7], fins: '#c8c080',
    more: (b) => { const out = []; for (let i = 0; i < 24; i++) { const x = -0.15 + (i % 6) * 0.08, u = -0.8 + Math.floor(i / 6) * 0.5, s = i % 2 ? 1 : -1, [px, py, pz] = b.surf(x, u, s); out.push(finish(new THREE.ConeGeometry(0.008, 0.03, 4).rotateX(s * Math.PI / 2).translate(px, py, pz + s * 0.01), '#e8e4d0')); } return out; } })),
  tuna: def('fish', 6, 0.04, () => fish({ H: 0.26, W: 0.22, peak: 0.45, ped: 0.1, nose: 2.2, x0: -0.32, back: '#1a2a5a', belly: '#e8eef2', line: 0, soft: 0.3,
    eye: [0.38, 0.15, 0.035], dorsal: ['two', -0.08, 0.18, 0.12, '#2a3a6a'], anal: [-0.12, -0.02, 0.1, '#e8d050'], tail: ['lunate', 1.2, '#1a2a5a'], fins: '#2a3a6a',
    more: (b) => [0, 1, 2, 3, 4].flatMap((i) => [1, -1].flatMap((u) => { const x = -0.18 - i * 0.025, y = b.surf(x, u)[1]; return fin([[x + 0.008, y], [x - 0.004, y + u * 0.025], [x - 0.012, y]], '#f0d040', { sharp: true, rays: false }); })) })),
  marlin: def('fish', 5, 0.05, () => fish({ H: 0.18, W: 0.13, peak: 0.4, ped: 0.12, nose: 1.6, x0: -0.32, back: '#1a3a7a', belly: '#e8eef4', line: 0.1, soft: 0.25,
    paint: (c, x, y, z, u) => c.lerp(col('#6ab0f0'), 0.6 * smooth(0.55, 0.85, Math.sin(x * 50)) * inBand(u, -0.4, 0.5, 0.15)),
    eye: [0.32, 0.2, 0.03], dorsal: ['sail', 0.0, 0.32, 0.3, '#2a5ac0'], anal: [-0.2, -0.1, 0.06], tail: ['lunate', 1.6, '#1a3a7a'], fins: '#2a4a8a',
    more: () => [rod([0.42, 0.0, 0], [0.62, -0.005, 0], 0.016, 0.003, '#1a2a4a')] })), // the spear
  'electric-eel': def('fish', 3, 0.12, () => fish({ H: 0.1, W: 0.1, peak: 0.85, ped: 0.15, nose: 3, x0: -0.5, back: '#3a3a3a', belly: '#e8803a', line: -0.4, soft: 0.2,
    eye: [0.44, 0.35, 0.02, '#3a3a3a'], tail: null, pec: '#4a4a4a',
    more: (b) => fin([[-0.48, b.surf(-0.48, -1)[1]], [-0.3, b.surf(-0.3, -1)[1] - 0.04], [0.2, b.surf(0.2, -1)[1] - 0.035], [0.3, b.surf(0.3, -1)[1]]], '#5a5048', { rays: true }) })),
  moray: def('fish', 3, 0.12, () => fish({ H: 0.13, W: 0.08, peak: 0.6, ped: 0.15, nose: 2.6, x0: -0.5, back: '#6a6a2a', belly: '#a8a060', line: -0.5,
    paint: (c, x, y, z, u) => c.lerp(col('#e8e0b0'), 0.8 * spots(x, u, 80, 0.15)),
    eye: [0.42, 0.4, 0.028, '#d0c060'], dorsal: ['long', -0.48, 0.25, 0.04, '#7a7a3a'], tail: null, pec: null,
    more: (b) => fin([[-0.48, b.surf(-0.48, -1)[1]], [-0.4, b.surf(-0.4, -1)[1] - 0.03], [-0.05, b.surf(-0.05, -1)[1] - 0.03], [0, b.surf(0, -1)[1]]], '#7a7a3a') })),
  flounder: def('ray', 1.6, 0.08, () => { // lies on its side: built standing, then laid flat, both eyes on top
    const out = fish({ H: 0.5, W: 0.06, peak: 0.5, ped: 0.25, nose: 1.7, back: '#8a7a5a', belly: '#8a7a5a',
      paint: (c, x, y, z) => (z > 0 ? c.lerp(col('#5a4a30'), 0.6 * spots(x, y * 2, 70, 0.3)) : col('#f4f0e8')),
      eye: [0.3, 0.3, 0.001], dorsal: ['long', -0.24, 0.4, 0.06, '#7a6a4a'], anal: [-0.24, 0.28, 0.06, '#7a6a4a'], tail: ['round', 0.9, '#7a6a4a'], pec: null });
    const lay = new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 0.03, 0);
    for (const g of out) g.applyMatrix4(lay);
    for (const [x, z] of [[0.3, -0.06], [0.36, 0.04]]) out.push(ball(0.035, '#f7f8f6', [x, 0.06, z], [1, 0.8, 1], 12), ball(0.022, '#0d0f12', [x + 0.005, 0.085, z], [1, 0.6, 1], 10), ball(0.007, '#ffffff', [x + 0.012, 0.096, z - 0.008], [1, 1, 1], 6));
    return out;
  }),
  anglerfish: def('fish', 4, 0.05, () => fish({ H: 0.48, W: 0.42, peak: 0.6, ped: 0.3, nose: 3.2, back: '#3a3438', belly: '#5a5058', line: -0.4,
    eye: [0.3, 0.45, 0.045, '#8a8a5a'], dorsal: ['tri', -0.2, -0.05, 0.08], tail: ['round', 0.8], fins: '#2a2428',
    more: (b) => {
      const out = [];
      for (let i = 0; i < 9; i++) { // teeth along the big mouth
        const z = -0.12 + i * 0.03, yl = -0.02 - 0.03 * (1 - Math.abs(z) / 0.15);
        out.push(finish(new THREE.ConeGeometry(0.008, 0.035, 4).translate(0.45, yl + 0.015, z), '#f4f0e8'));
      }
      out.push(rod([0.3, 0.22, 0], [0.45, 0.34, 0], 0.006, 0.004, '#3a3438'), rod([0.45, 0.34, 0], [0.56, 0.28, 0], 0.004, 0.003, '#3a3438'), ball(0.03, '#f8f0a0', [0.57, 0.26, 0], [1, 1, 1], 10));
      return out;
    } })),
  blobfish: def('fish', 2, 0.04, () => {
    const b = body({ x0: -0.3, H: 0.42, W: 0.42, peak: 0.7, ped: 0.35, nose: 3.5, under: 0.7, cy: (t) => -0.05 * smooth(0.5, 1, t), color: (x, y, z, u) => mix('#e8a0a8', '#f4c4c8', smooth(0, -0.8, u)) });
    return [b.geo, ...eyes(b, 0.36, 0.3, 0.04, '#3a2a2a'), ball(0.08, '#e090a0', [0.46, -0.03, 0], [1, 0.8, 1.2], 14), // the droopy nose
      ...[-1, 1].map((s) => rod([0.44, -0.12, s * 0.06], [0.4, -0.15, s * 0.1], 0.008, 0.006, '#b06070')), // a frown
      ...tail(-0.3, 'round', 0.8, '#e8a8b0'), ...pectorals([[0, 0], [-0.02, -0.08], [-0.09, -0.08]], '#e8a8b0', 0.2, -0.1, 0.18, 1)];
  }),
  // ---- big swimmers ----
  beluga: def('whale', 1.8, 0.06, () => {
    const b = body({ x0: -0.32, H: 0.24, W: 0.24, peak: 0.5, ped: 0.15, nose: 2.6, hf: (t) => 1 - 0.12 * smooth(0.8, 0.88, t) * (1 - smooth(0.92, 1, t)), color: (x, y, z, u) => mix('#f2f6f8', '#dce6ec', smooth(-0.5, 0.8, u)) });
    return [b.geo, ...eyes(b, 0.34, 0.08, 0.025, '#3a4a5a'), ...mouth(b, 0.47, -0.3, 0.07, '#8a9aa8'),
      ...flatFin([[-0.3, 0], [-0.42, 0.15], [-0.48, 0.16], [-0.44, 0.04], [-0.46, 0], [-0.44, -0.04], [-0.48, -0.16], [-0.42, -0.15]], '#e0e8ee', [0, 0, 0], { thick: 0.014 }),
      ...pectorals([[0, 0], [-0.03, -0.1], [-0.08, -0.1], [-0.05, 0]], '#e0e8ee', 0.22, -0.07, 0.09, 0.9, { rays: false, thick: 0.012 })];
  }),
  dugong: def('whale', 1.2, 0.07, () => {
    const b = body({ x0: -0.3, H: 0.24, W: 0.26, peak: 0.45, ped: 0.18, nose: 2.8, cy: (t) => -0.05 * smooth(0.82, 1, t), color: (x, y, z, u) => mix('#c0b0a8', '#8a7a78', smooth(-0.5, 0.6, u)) });
    return [b.geo, ...eyes(b, 0.36, 0.2, 0.022, '#3a2a28'), ball(0.07, '#b09890', [0.45, -0.06, 0], [1, 0.8, 1.2], 14), // the round snout
      ...flatFin([[-0.28, 0], [-0.42, 0.18], [-0.48, 0.18], [-0.44, 0], [-0.48, -0.18], [-0.42, -0.18]], '#8a7a78', [0, -0.01, 0], { thick: 0.016 }),
      ...pectorals([[0, 0], [-0.03, -0.11], [-0.09, -0.11], [-0.06, 0]], '#9a8a88', 0.24, -0.08, 0.1, 0.9, { rays: false, thick: 0.012 })];
  }),
  whale: def('whale', 0.9, 0.05, () => { // blue whale: long, slate blue with pale mottling, throat grooves, a tiny dorsal fin
    const b = body({ x0: -0.36, H: 0.15, W: 0.17, peak: 0.5, ped: 0.12, nose: 1.6, under: 1.9, rings: 60, color: (x, y, z, u) => {
      const c = mix('#a8b8c8', '#4a6a8a', smooth(-0.6, 0.3, u)).multiplyScalar(1 + 0.07 * spots(x, u, 90, 0.4));
      return u < -0.4 && x > 0.15 ? c.lerp(col('#2a3a50'), 0.5 * smooth(0.5, 0.9, Math.sin(u * 60))) : c;
    } });
    return [b.geo, ...eyes(b, 0.36, -0.05, 0.016, '#2a3a4a'), ...mouth(b, 0.46, -0.2, 0.08, '#2a3a50'),
      ...fin([[-0.2, b.surf(-0.2, 1)[1] - 0.005], [-0.24, b.surf(-0.2, 1)[1] + 0.03], [-0.25, b.surf(-0.25, 1)[1] - 0.005]], '#4a6a8a', { rays: false, thick: 0.01 }),
      ...flatFin([[-0.34, 0], [-0.44, 0.13], [-0.5, 0.13], [-0.46, 0.03], [-0.47, 0], [-0.46, -0.03], [-0.5, -0.13], [-0.44, -0.13]], '#4a6a8a', [0, 0, 0], { thick: 0.012 }),
      ...pectorals([[0, 0], [-0.04, -0.14], [-0.08, -0.14], [-0.04, 0]], '#7a90a8', 0.2, -0.08, 0.075, 0.9, { rays: false, thick: 0.01 })];
  }),
  // ---- not fish: shellfish, squid, plants ----
  shrimp: def('fish', 5, 0.03, () => {
    const b = body({ x0: -0.3, x1: 0.42, H: 0.2, W: 0.16, peak: 0.6, ped: 0.35, nose: 1.6, cy: (t) => 0.1 * Math.sin(Math.PI * t) - 0.05, color: (x, y, z, u, t) => mix('#f08a6a', '#ffc8a8', smooth(0.2, -0.8, u)).multiplyScalar(1 - 0.12 * smooth(0.7, 0.95, Math.sin(t * 40))) });
    const out = [b.geo, ...eyes(b, 0.34, 0.6, 0.035, '#1a1a1a'), ...tail(-0.3, 'round', 0.8, '#f8a080')];
    for (const s of [-1, 1]) {
      out.push(rod([0.4, 0.0, s * 0.02], [0.6, 0.12, s * 0.12], 0.004, 0.002, '#e07050'), rod([0.6, 0.12, s * 0.12], [0.75, 0.04, s * 0.18], 0.002, 0.001, '#e07050'));
      for (let i = 0; i < 5; i++) out.push(rod([0.25 - i * 0.07, -0.04, s * 0.04], [0.23 - i * 0.07, -0.13, s * 0.07], 0.005, 0.003, '#f09070'));
    }
    return out;
  }),
  crab: def('still', 1, 1, () => {
    const shell = body({ x0: -0.25, x1: 0.25, H: 0.22, W: 0.62, peak: 0.55, ped: 0.4, nose: 1.4, under: 0.4, color: (x, y, z, u) => (u < -0.1 ? '#f4e0c8' : mix('#e05a2a', '#b83a1a', smooth(0.2, 0.9, u)).multiplyScalar(1 - 0.12 * spots(x, z * 4, 40, 0.2))) });
    for (const g of [shell.geo]) g.translate(0, 0.16, 0);
    const out = [shell.geo];
    for (const s of [-1, 1]) {
      out.push(rod([0.18, 0.2, s * 0.06], [0.24, 0.3, s * 0.07], 0.008, 0.008, '#c84a22'), ball(0.03, '#f7f8f6', [0.24, 0.32, s * 0.07], [1, 1, 1], 10), ball(0.018, '#0d0f12', [0.265, 0.33, s * 0.075], [1, 1, 1], 8));
      out.push(rod([0.12, 0.14, s * 0.22], [0.28, 0.12, s * 0.3], 0.025, 0.022, '#d85024'), ball(0.07, '#e05a2a', [0.34, 0.12, s * 0.32], [1.4, 0.8, 0.9], 12), // claw
        finish(new THREE.ConeGeometry(0.03, 0.1, 6).rotateZ(-Math.PI / 2).translate(0.44, 0.14, s * 0.32), '#2a1a14'));
      for (let i = 0; i < 3; i++) { const x = 0.06 - i * 0.1; out.push(rod([x, 0.14, s * 0.25], [x - 0.04, 0.17, s * 0.42], 0.016, 0.013, '#d85024'), rod([x - 0.04, 0.17, s * 0.42], [x - 0.08, 0.0, s * 0.5], 0.013, 0.006, '#d85024')); }
    }
    return out;
  }),
  lobster: def('still', 1, 1, () => {
    const b = body({ x0: -0.42, x1: 0.2, H: 0.13, W: 0.14, peak: 0.7, ped: 0.6, nose: 2, color: (x, y, z, u, t) => mix('#2a3a6a', '#6a2a20', smooth(-0.2, 0.3, x)).lerp(col('#e8c8a0'), smooth(-0.3, -0.8, u)).multiplyScalar(1 - 0.18 * smooth(0.75, 0.95, Math.sin(t * 35)) * (x < -0.05 ? 1 : 0)) });
    b.geo.translate(0, 0.08, 0);
    const out = [b.geo, ...tail(-0.42, 'round', 0.6, '#3a3a6a').map((g) => g.translate(0, 0.08, 0))];
    for (const s of [-1, 1]) {
      out.push(ball(0.016, '#0d0f12', [0.2, 0.13, s * 0.03], [1, 1, 1], 8), rod([0.2, 0.1, s * 0.03], [0.62, 0.2, s * 0.25], 0.006, 0.002, '#6a2a20'));
      out.push(rod([0.12, 0.08, s * 0.06], [0.28, 0.08, s * 0.16], 0.018, 0.016, '#4a2a3a'), ball(0.06, '#3a2a4a', [0.38, 0.08, s * 0.2], [1.8, 0.7, 1], 12));
      for (let i = 0; i < 4; i++) { const x = 0.08 - i * 0.06; out.push(rod([x, 0.06, s * 0.05], [x - 0.02, 0.0, s * 0.16], 0.008, 0.004, '#4a2a3a')); }
    }
    return out;
  }),
  octopus: def('octo', 1.4, 0.04, () => {
    const head = body({ x0: -0.25, x1: 0.25, H: 0.34, W: 0.34, peak: 0.45, ped: 0.6, nose: 2.2, color: (x, y, z, u) => mix('#d86a5a', '#f4a898', smooth(0, -0.8, u)).multiplyScalar(1 - 0.1 * spots(x, u, 50, 0.2)) });
    head.geo.rotateZ(Math.PI / 2).translate(0, 0.32, 0); // the mantle stands up
    const out = [head.geo];
    for (const s of [-1, 1]) out.push(ball(0.045, '#f7f8f6', [0.13, 0.12, s * 0.07], [1, 1, 1], 12), ball(0.028, '#0d0f12', [0.165, 0.125, s * 0.075], [1, 1, 1], 10), ball(0.009, '#ffffff', [0.185, 0.14, s * 0.07], [1, 1, 1], 6));
    for (let i = 0; i < 8; i++) { // the arms, curling out from under the head
      const a = (i / 8) * Math.PI * 2 + 0.2, pts = [];
      for (let k = 0; k <= 6; k++) { const r = 0.06 + k * 0.06, y = 0.06 - k * 0.02 + 0.03 * Math.sin(k * 0.9 + i); pts.push([Math.cos(a + k * 0.12) * r, Math.max(0.01, y), Math.sin(a + k * 0.12) * r]); }
      for (let k = 0; k < 6; k++) out.push(rod(pts[k], pts[k + 1], 0.04 - k * 0.006, 0.034 - k * 0.006, k % 2 ? '#d06050' : '#d86a5a'));
    }
    return out;
  }),
  'giant-squid': def('fish', 2, 0.03, () => { // swims backwards: fins at the tail end (+x is the arm end, as it moves)
    const b = body({ x0: -0.5, x1: 0.05, H: 0.12, W: 0.12, peak: 0.75, ped: 0.05, nose: 2.5, color: (x, y, z, u) => mix('#c84a3a', '#f0a090', smooth(0, -0.8, u)).multiplyScalar(1 - 0.12 * spots(x, u, 60, 0.25)) });
    const out = [b.geo, ...eyes(b, 0.0, 0.3, 0.035, '#1a1a1a'),
      ...flatFin([[-0.36, 0], [-0.44, 0.1], [-0.5, 0.0], [-0.44, -0.1]], '#d86050', [0, 0, 0], { thick: 0.008 })];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; out.push(rod([0.05, Math.cos(a) * 0.03, Math.sin(a) * 0.03], [0.32, Math.cos(a) * 0.07, Math.sin(a) * 0.07], 0.016, 0.004, '#d05a48')); }
    for (const s of [-1, 1]) out.push(rod([0.05, 0, s * 0.02], [0.55, 0.0, s * 0.06], 0.008, 0.004, '#c85040'), ball(0.018, '#c85040', [0.56, 0, s * 0.06], [2, 0.6, 1], 8));
    return out;
  }),
  cuttlefish: def('fish', 3, 0.02, () => {
    const b = body({ x0: -0.4, x1: 0.25, H: 0.2, W: 0.34, peak: 0.5, ped: 0.4, nose: 2.2, under: 0.6, color: (x, y, z, u) => mix('#e8dcc8', '#8a6a4a', smooth(-0.3, 0.5, u)).lerp(col('#4a3020'), 0.6 * smooth(0.6, 0.95, Math.sin(x * 50 + z * 30)) * smooth(0.3, 0.6, u)) });
    const out = [b.geo, ...eyes(b, 0.15, 0.4, 0.05, '#c8b060'),
      ...[-1, 1].flatMap((s) => flatFin([[-0.38, s * 0.14], [-0.3, s * 0.21], [0.15, s * 0.21], [0.22, s * 0.14]], '#b8a080', [0, -0.02, 0], { thick: 0.006, tip: '#e8dcc0' }))]; // the skirt fin
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; out.push(rod([0.24, Math.cos(a) * 0.04, Math.sin(a) * 0.05], [0.4, Math.cos(a) * 0.05 - 0.02, Math.sin(a) * 0.07], 0.016, 0.005, '#c8a888')); }
    return out;
  }),
  jellyfish: def('jelly', 1.6, 0.1, () => {
    const bell = new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1);
    const out = [finish(bell, '#f0b8e0'), ball(0.12, '#f878c8', [0, 0.06, 0], [1, 0.6, 1], 12)];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; out.push(rod([Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24], [Math.cos(a) * 0.2, -0.6, Math.sin(a) * 0.2], 0.008, 0.003, '#f4c8e8')); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; out.push(rod([Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06], [Math.cos(a) * 0.1, -0.35, Math.sin(a) * 0.1], 0.03, 0.012, '#f8a0d8')); }
    return out;
  }),
  starfish: def('still', 1, 1, () => {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = i % 2 ? 0.17 : 0.45; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.05, bevelSegments: 3 }).rotateX(-Math.PI / 2).translate(0, 0.03, 0);
    const out = [finish(g, '#f07a3a')];
    for (let i = 0; i < 5; i++) for (let k = 1; k <= 3; k++) { const a = (i / 5) * Math.PI * 2, r = k * 0.1; out.push(ball(0.022, '#f8c070', [Math.cos(a) * r, 0.12, -Math.sin(a) * r], [1, 0.6, 1], 6)); }
    return out;
  }),
  'sea-urchin': def('still', 1, 1, () => {
    const out = [ball(0.22, '#3a2040', [0, 0.18, 0], [1, 0.8, 1], 16)];
    for (let i = 0; i < 70; i++) { // spines all over, by the golden angle
      const y = 1 - (i / 69) * 1.4, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
      const d = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      const base = d.clone().multiply(new THREE.Vector3(0.2, 0.16, 0.2)).add(new THREE.Vector3(0, 0.18, 0)), tipP = base.clone().addScaledVector(d, 0.2);
      out.push(rod(base.toArray(), tipP.toArray(), 0.012, 0.002, i % 3 ? '#5a2a6a' : '#7a3a8a'));
    }
    return out;
  }),
  'sea-cucumber': def('still', 1, 1, () => {
    const b = body({ x0: -0.45, x1: 0.45, H: 0.2, W: 0.22, peak: 0.5, ped: 0.55, nose: 2.5, under: 0.5, color: (x, y, z, u) => (u < -0.2 ? '#b07a5a' : mix('#6a3a2a', '#8a4a3a', 0.5 + 0.5 * Math.sin(x * 30))) });
    b.geo.translate(0, 0.08, 0);
    const out = [b.geo];
    for (let i = 0; i < 26; i++) { const x = -0.38 + (i % 13) * 0.06, u = i < 13 ? 0.9 : 0.5, s = i % 2 ? 1 : -1, [px, py, pz] = b.surf(x, u, s); out.push(finish(new THREE.ConeGeometry(0.018, 0.05, 5).translate(px, py + 0.1, pz), '#c08060')); }
    return out;
  }),
  scallop: def('still', 1, 1, () => { // two ribbed fans, the hinge at the back, a row of little blue eyes
    const shell = (up) => {
      const g = finish(new THREE.SphereGeometry(0.34, 28, 8, Math.PI / 2, Math.PI, 0, Math.PI / 2).scale(1, up ? 0.3 : -0.12, 1).translate(-0.17, 0.05, 0));
      const p = g.attributes.position, c = new Float32Array(p.count * 3), cc = new THREE.Color();
      for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i) + 0.17); cc.set(up ? '#e8805a' : '#f4d8b8').multiplyScalar(1 - 0.2 * smooth(0.5, 1, Math.sin(a * 16))); c.set([cc.r, cc.g, cc.b], i * 3); }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
    };
    return [shell(true), shell(false), finish(new THREE.BoxGeometry(0.06, 0.06, 0.2).translate(-0.17, 0.05, 0), '#d8704a'),
      ...[-0.12, -0.04, 0.04, 0.12].map((z) => ball(0.012, '#2a4a9a', [0.15, 0.06, z]))];
  }),
  wakame: def('sway', 1.2, 0.18, () => { // a few wavy brown-green ribbons
    const out = [];
    for (let k = 0; k < 4; k++) {
      const pts = [], a = k * 1.7;
      for (let i = 0; i <= 10; i++) { const y = i / 10, w = 0.07 * (1 - y * 0.6); pts.push([Math.sin(y * 9 + k) * 0.05 + w, y], [Math.sin(y * 9 + k) * 0.05 - w, y]); }
      const outline = [...pts.filter((_, i) => i % 2 === 0), ...pts.filter((_, i) => i % 2).reverse()];
      out.push(...fin(outline, '#5a6a2a', { ry: a, at: [Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05], tip: '#8a9a3a', sharp: true, rays: false, thick: 0.004 }));
    }
    out.push(ball(0.06, '#4a4a2a', [0, 0.01, 0], [1.4, 0.5, 1.4]));
    return out;
  }),
  kelp: def('sway', 0.8, 0.15, () => { // tall golden-brown blades on one stem
    const out = [rod([0, 0, 0], [0.02, 1, 0], 0.012, 0.008, '#7a5a20')];
    for (let k = 0; k < 7; k++) {
      const y0 = 0.15 + k * 0.12, a = k * 2.4;
      out.push(...fin([[0, y0], [0.06, y0 + 0.05], [0.2, y0 + 0.14], [0.22, y0 + 0.18], [0.04, y0 + 0.08], [0, y0 + 0.02]], '#a07a28', { ry: a, rays: false, tip: '#c8a040', thick: 0.004 }));
    }
    return out;
  }),
  seahorse: def('still', 1, 1, () => { // upright: the curled tail at the bottom, the snout pointing +x
    const out = [], c = (t) => mix('#f0b030', '#f8d870', t);
    const spine = [[0.0, 0.25], [0.04, 0.38], [0.04, 0.52], [0.0, 0.64], [0.02, 0.74]];
    for (let i = 0; i < spine.length - 1; i++) out.push(rod([spine[i][0], spine[i][1], 0], [spine[i + 1][0], spine[i + 1][1], 0], 0.07 - i * 0.008, 0.065 - i * 0.008, c(i / 4)));
    for (let i = 0; i < 4; i++) out.push(ball(0.075 - i * 0.008, c(i / 4), [spine[i][0] + 0.005, spine[i][1], 0], [1, 1, 0.85]));
    out.push(ball(0.07, '#f0b030', [0.03, 0.78, 0], [1.1, 0.9, 0.85]), rod([0.08, 0.78, 0], [0.22, 0.74, 0], 0.025, 0.018, '#f0b030')); // head and snout
    let px = 0, py = 0.25;
    for (let i = 0; i < 9; i++) { const a = -1.4 - i * 0.55, r = 0.06 * (1 - i * 0.07), nx = px + Math.cos(a) * r, ny = py + Math.sin(a) * r; out.push(rod([px, py, 0], [nx, ny, 0], 0.045 - i * 0.004, 0.04 - i * 0.004, '#e8a020')); px = nx; py = ny; } // the curled tail
    for (const s of [-1, 1]) out.push(ball(0.022, '#f7f8f6', [0.06, 0.8, s * 0.05], [1, 1, 0.8], 10), ball(0.014, '#0d0f12', [0.07, 0.8, s * 0.062], [1, 1, 0.6], 8));
    out.push(...fin([[-0.04, 0.45], [-0.1, 0.5], [-0.1, 0.56], [-0.04, 0.6]], '#f8e090', { thick: 0.004 }));
    for (const g of out) g.translate(0, 0.1, 0);
    return out;
  }),
  axolotl: def('fish', 3, 0.06, () => {
    const b = body({ x0: -0.25, x1: 0.42, H: 0.17, W: 0.17, peak: 0.75, ped: 0.4, nose: 3.2, color: (x, y, z, u) => mix('#f4a8b8', '#fcd0d8', smooth(0, -0.8, u)) });
    const out = [b.geo, ...eyes(b, 0.36, 0.45, 0.03, '#1a1a1a'), ...mouth(b, 0.42, -0.1, 0.05, '#c86a80'),
      ...fin([[-0.25, 0.05], [-0.1, b.surf(-0.1, 1)[1] + 0.06], [-0.48, 0.02], [-0.48, -0.02], [-0.25, -0.05]], '#f8c0cc', { thick: 0.006 })]; // the tail fin
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) { const a = 0.5 + i * 0.45; const base = [0.27, 0.04, s * 0.07]; const tipP = [0.27 - Math.cos(a) * 0.12, 0.04 + Math.sin(a) * 0.12, s * 0.13]; out.push(rod(base, tipP, 0.014, 0.008, '#e84a7a'), ball(0.018, '#f05a8a', tipP)); } // feathery gills
      for (const x of [0.18, -0.12]) out.push(rod([x, -0.04, s * 0.06], [x - 0.02, -0.12, s * 0.12], 0.016, 0.012, '#f4a8b8'));
    }
    return out;
  }),
  'softshell-turtle': def('turtle', 1.4, 0.2, () => {
    const shell = body({ x0: -0.3, x1: 0.3, H: 0.12, W: 0.55, peak: 0.5, ped: 0.6, nose: 2.2, under: 0.4, color: (x, y, z, u) => (u < -0.1 ? '#e8e0c8' : mix('#7a7a4a', '#5a6038', 0.5 + 0.5 * spots(x, z * 3, 40, 0.3))) });
    const neck = body({ x0: 0.2, x1: 0.5, H: 0.09, W: 0.09, peak: 0.6, ped: 0.8, nose: 1.4, color: (x, y, z, u) => (u < -0.3 ? '#d8d0b0' : '#7a7a4a') });
    return [shell.geo, neck.geo, ...eyes(neck, 0.44, 0.4, 0.016, '#2a2a20'), rod([0.48, 0.01, 0], [0.54, 0.01, 0], 0.012, 0.008, '#6a6a40'),
      ...[-1, 1].flatMap((s) => flatFin([[0.15, s * 0.22], [0.1, s * 0.4], [0.02, s * 0.42], [0.04, s * 0.22]], '#7a7a4a', [0, -0.02, 0], { thick: 0.02 })),
      ...[-1, 1].flatMap((s) => flatFin([[-0.18, s * 0.2], [-0.24, s * 0.34], [-0.32, s * 0.3], [-0.26, s * 0.16]], '#7a7a4a', [0, -0.02, 0], { thick: 0.02 }))];
  }),
};
delete MORE.yellowtail;
addSpecies(MORE);

// Which drawing each catalogue fish uses: its own above, or one of the
// aquarium's.
export const DRAWING = {
  minnow: 'chub', 'blue-tang': 'bluetang', butterflyfish: 'butterfly', 'sea-turtle': 'turtle',
};
export const drawingOf = (id) => DRAWING[id] || id;
