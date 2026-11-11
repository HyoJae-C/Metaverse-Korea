// Banpo Bridge's upper deck (반포대교), the whole bridge on its real line at
// 1/4 (scripts/han-bank.mjs BANPO_BRIDGE): from the north bank's junction
// with Noksapyeong-daero, high over Jamsu Bridge (the low deck you walk on,
// core/landmarks.js jamsu) and the river, to the south bank, with a ramp
// down at each end. Only to look at: nobody drives up here.
//
// l.pts: the bridge's middle line, metres from (l.x, l.z), north to south.
// l.w: deck width (l.wRamp: narrower up the north ramp, to Jamsu Bridge's
// width, where houses stand close); l.top: deck height; l.ramp: [north, south] ramp lengths;
// l.noPiers: [[dx, dz, r]] spots kept free of piers (the park under it).
// l.pipes: false for no fountain pipes; l.arches: [[s0, s1]] arch spans
// (Dongjak Bridge's); l.mid: a strip down the middle (its subway track).
// A mesh per colour (deck, parapets, pipes, arches, track) and one for the
// piers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { matCache } from './three-kit.js';

const mat = matCache({ flatShading: true });
const STEP = 6; // metres per piece along the bridge
const PIER_EVERY = 30;

// Points every STEP metres along the line: [x, z, s, dirX, dirZ].
function sample(pts) {
  const out = [];
  let s0 = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
    const n = Math.max(1, Math.round(L / STEP));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) out.push([ax + dx * (L * k) / n, az + dz * (L * k) / n, s0 + (L * k) / n, dx, dz]);
    s0 += L;
  }
  return { out, len: s0 };
}

export function banpoBridge(g, l) {
  const w = l.w || 22, top = l.top || 9, half = w / 2;
  const [rampN, rampS] = l.ramp || [80, 55];
  const { out, len } = sample(l.pts);
  // The deck's height s metres along: up the north ramp, level, down the south one.
  const smoothstep = (k) => k * k * (3 - 2 * k);
  const y = (s) => top * Math.min(smoothstep(Math.min(1, s / rampN)), smoothstep(Math.min(1, (len - s) / rampS)));
  const parts = { deck: [], parapet: [], pipe: [], arch: [], mid: [] };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(), nrm = new THREE.Vector3(), basis = new THREE.Matrix4();
  // A box along the piece from a to b, offset `across` to the side and `rise` up.
  function piece(list, a, b, across, rise, sx, sy) {
    const ya = y(a[2]), yb = y(b[2]);
    fwd.set(b[0] - a[0], yb - ya, b[1] - a[1]);
    const L = fwd.length() + 0.4; // (a little overlap at the joints)
    fwd.normalize();
    side.crossVectors(up, fwd).normalize();
    nrm.crossVectors(fwd, side).normalize();
    basis.makeBasis(side, nrm, fwd);
    q.setFromRotationMatrix(basis);
    p.set((a[0] + b[0]) / 2, (ya + yb) / 2, (a[1] + b[1]) / 2).addScaledVector(side, across).addScaledVector(nrm, rise);
    list.push(box.clone().applyMatrix4(m4.compose(p, q, sc.set(sx, sy, L))));
  }
  const wAt = (s) => (l.wRamp && s < rampN ? l.wRamp + (w - l.wRamp) * smoothstep(Math.max(0, (s - rampN + 20) / 20)) : w);
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i], wi = wAt((a[2] + b[2]) / 2), hi = wi / 2;
    piece(parts.deck, a, b, 0, -0.7, wi, 1.4);
    for (const sx of [-1, 1]) {
      piece(parts.parapet, a, b, sx * (hi - 0.15), 0.45, 0.3, 0.9);
      // The Moonlight Rainbow Fountain's pipe of nozzles under each edge,
      // where the deck is level (the water: core/rainbow-jets.js).
      if (l.pipes !== false && y(a[2]) > top - 0.05 && y(b[2]) > top - 0.05) piece(parts.pipe, a, b, sx * (half + 0.05), -1.2, 0.35, 0.35);
    }
    if (l.mid) piece(parts.mid, a, b, 0, 0.06, w * 0.22, 0.12);
    // Arch ribs over the deck, a little in from each edge.
    for (const [s0, s1] of l.arches || []) {
      const ha = (s1 - s0) * 0.16, arch = (s) => (s <= s0 || s >= s1 ? 0 : ha * Math.sin((Math.PI * (s - s0)) / (s1 - s0)));
      if (b[2] <= s0 || a[2] >= s1) continue;
      for (const sx of [-1, 1]) {
        const ya = arch(a[2]), yb = arch(b[2]);
        const len2 = Math.hypot(b[0] - a[0], b[1] - a[1], yb - ya);
        const mx = (a[0] + b[0]) / 2 + b[4] * sx * (half - 0.6) * 1, mz = (a[1] + b[1]) / 2 - b[3] * sx * (half - 0.6);
        fwd.set(b[0] - a[0], yb - ya, b[1] - a[1]).normalize();
        side.crossVectors(up, fwd).normalize(); nrm.crossVectors(fwd, side).normalize();
        q.setFromRotationMatrix(basis.makeBasis(side, nrm, fwd));
        parts.arch.push(box.clone().applyMatrix4(m4.compose(p.set(mx, top + (ya + yb) / 2 + 0.4, mz), q, sc.set(0.7, 0.7, len2 + 0.3))));
        // hangers down to the deck
        const h = (ya + yb) / 2;
        if (h > 1) parts.arch.push(new THREE.BoxGeometry(0.12, h, 0.12).applyMatrix4(m4.makeTranslation(mx, top + h / 2, mz)));
      }
    }
  }
  const colors = { deck: '#d9dde2', parapet: '#b8bec6', pipe: '#6f7a86', arch: l.archColor || '#5d8fb5', mid: '#7d7466' };
  for (const [k, list] of Object.entries(parts)) if (list.length) g.add(new THREE.Mesh(mergeGeometries(list), mat(colors[k])));
  // Piers in pairs, where the deck is high enough to need them.
  const piers = [];
  const clear = l.noPiers || [];
  let next = PIER_EVERY / 2;
  for (const [x, z, s, dx, dz] of out) {
    if (s < next) continue;
    next = s + PIER_EVERY;
    const h = y(s) - 1.4;
    if (h < 2) continue;
    for (const sx of [-1, 1]) {
      const ph = wAt(s) / 2 - 1.8, px = x + dz * sx * ph, pz = z - dx * sx * ph;
      if (clear.some(([cx, cz, r]) => Math.hypot(px - cx, pz - cz) < r)) continue;
      const geo = new THREE.BoxGeometry(1.6, h, 2.2);
      geo.applyMatrix4(m4.compose(p.set(px, h / 2, pz), q.setFromAxisAngle(up, Math.atan2(dx, dz)), sc.set(1, 1, 1)));
      piers.push(geo);
    }
  }
  if (piers.length) g.add(new THREE.Mesh(mergeGeometries(piers), mat('#c3c8ce')));
}
