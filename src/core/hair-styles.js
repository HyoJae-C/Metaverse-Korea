// Hairstyles from the hair salon and lip colours from Petal Lip, built on top
// of a pack model's head. Made in the head mesh's own units (the head is about
// ±1 across, the eyes at height `ey`, the face toward +z) and sharing the
// model's material: every vertex samples one cell of the colour atlas, so the
// hair takes the model's own hair colour or the salon's dye for free.
import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';


// Which faces of the model's own head are hair on the scalp (hidden when you
// pick a style), and which stay: eyebrows, moustaches and beards are on the
// front of the face, below the forehead.
export function isScalpHair(cx, cy, cz, ey) {
  if (cz > 0.5 && cy < ey + 0.3 && Math.abs(cx) < 0.7) return false; // brows, beard
  return true;
}

// Point every vertex at one atlas cell, shading top to bottom like the
// atlas's own gradient (light at the top of a cell, darker lower down).
// range: [bottom, top] heights to shade over instead of the piece's own
// (pieces that meet, like a cap and a curtain, then match where they join).
export function paintCell(geo, [cx, cy], atlas, light = 0.15, dark = 0.8, range = null) {
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  const [y0, y1] = range || [geo.boundingBox.min.y, geo.boundingBox.max.y];
  const h = Math.max(1e-6, y1 - y0);
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - y0) / h)); // 0 bottom .. 1 top
    uv[i * 2] = (cx + 0.5) / atlas.cols;
    uv[i * 2 + 1] = (cy + light + (1 - t) * (dark - light)) / atlas.rows;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// Two indexed geometries (position, normal, uv) as one.
function joinGeos(a, b) {
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const x = a.attributes[k], y = b.attributes[k];
    const arr = new Float32Array(x.array.length + y.array.length);
    arr.set(x.array); arr.set(y.array, x.array.length);
    out.setAttribute(k, new THREE.BufferAttribute(arr, x.itemSize));
  }
  const n = a.attributes.position.count;
  out.setIndex([...a.index.array, ...Array.from(b.index.array, (i) => i + n)]);
  return out;
}
const sphere = (r, ws = 22, hs = 16, t0 = 0, tl = Math.PI) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, t0, tl);

// The hair for one style, as a group in head units. ey: eye height.
// Every loose piece of a style (locks, tufts, spikes, tails, buns, curls)
// must touch the head: one standing a little off it reads as floating.
// The head under the hair is about this ellipsoid (head units); a piece
// whose nearest point is outside it moves straight in until that point is
// on it.
const GLUE_C = new THREE.Vector3(0, 0.04, -0.04), GLUE_R = new THREE.Vector3(0.99, 0.97, 0.97);
const _gv = new THREE.Vector3();
function glue(g) {
  for (const m of g.children) {
    if (!m.isMesh || m.userData.fixed) continue;
    m.updateMatrix();
    const pos = m.geometry.attributes.position;
    let best = Infinity, bx = 0, by = 0, bz = 0;
    for (let i = 0; i < pos.count; i++) {
      _gv.fromBufferAttribute(pos, i).applyMatrix4(m.matrix).sub(GLUE_C);
      const r = Math.hypot(_gv.x / GLUE_R.x, _gv.y / GLUE_R.y, _gv.z / GLUE_R.z);
      if (r < best) { best = r; bx = _gv.x; by = _gv.y; bz = _gv.z; }
    }
    if (best > 1.005) m.position.add(_gv.set(bx, by, bz).multiplyScalar(1 / best - 1)); // nearest point onto the surface
  }
}

export function buildHair(style, material, atlas, ey) {
  const g = new THREE.Group();
  g.name = 'hairStyle';
  let hairCell = atlas.hair; // (a shaved head is painted with the skin's cell)
  let shade = [0.15, 0.8]; // atlas light .. dark (a darker pair reads as shaved)
  let range = null; // (see paintCell)
  const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(paintCell(geo, hairCell, atlas, ...shade, range), material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  // Every style starts from a cap over the skull, leaving the face clear.
  // The cap is tilted back, so it would leave the lower back of the head
  // bare (seen when the head bends forward, on a bike); a band of hair goes
  // round the back down to the nape.
  // (One mesh: the band is merged into the cap.)
  // Pieces that sit on the head (not the cap or curtains, which ARE the
  // head's hair) are pulled in after the style is built so none hangs off it
  // (see glue below).
  const fixed = (m) => { m.userData.fixed = true; return m; };
  const cap = (r = 0.97, cover = 0.52, tilt = -0.42, y = 0.04, withBand = true) => {
    const top = sphere(r, 24, 14, 0, Math.PI * cover).scale(1.02, 1, 1).rotateX(tilt).translate(0, y, -0.04);
    if (!withBand) return fixed(add(top, 0, 0, 0)); // (a curtain covers the back)
    const band = new THREE.SphereGeometry(r, 20, 8, Math.PI * 1.02, Math.PI * 0.96, Math.PI * 0.3, Math.PI * 0.45).scale(1.05, 1, 1.06).translate(0, y, -0.06);
    return fixed(add(joinGeos(top, band), 0, 0, 0));
  };
  // A piece standing on the head at (x, y, z), its own +y pointing along dir
  // (spikes, strands, locks).
  const Y = new THREE.Vector3(0, 1, 0);
  const point = (geo, x, y, z, dir, sx = 1, sy = 1, sz = 1) => {
    const m = add(geo, x, y, z, sx, sy, sz);
    const d = new THREE.Vector3(...dir).normalize();
    m.quaternion.setFromUnitVectors(Y, d);
    m.position.addScaledVector(d, -0.08 * sy); // its root a little into the hair, not perched on it
    return m;
  };
  // A rope hanging down from (x, y, z): n beads, each a little lower and
  // further out (dx, dz per bead). Braids, dreads and waves.
  const rope = (x, y, z, n, r, step, dx = 0, dz = 0, wave = 0) => {
    for (let i = 0; i < n; i++) add(sphere(r * (1 - i * 0.04), 10, 8), x + dx * i + (i % 2 ? wave : -wave), y - step * i, z + dz * i, 1, 1.25, 1);
  };
  // A piece of shell over the head between two angles round it (phi: 0 at
  // the side, PI/2 at the face) and two angles down from the top (theta),
  // like the bangs: fringes, curtains and side locks follow the head's
  // shape this way. rz tilts it about the face axis.
  const shell = (p0, p1, t0, t1, r = 1.0, rz = 0, sx = 1.03) => add(new THREE.SphereGeometry(r, Math.max(3, Math.round((p1 - p0) * 8)), 6, p0, p1 - p0, t0, t1 - t0), 0, 0.02, -0.02, sx, 1, 1, 0, 0, rz);
  // A fringe of n locks across the forehead, centred at phi c, w wide: each
  // lock reaches down to theta end(i) and leans by rz(i).
  const fringe = (c, w, n, end, r = 1.03, rz = () => 0, t0 = Math.PI * 0.16, gap = 0.04) => {
    const lw = w / n;
    for (let i = 0; i < n; i++) shell(c - w / 2 + i * lw + gap / 2, c - w / 2 + (i + 1) * lw - gap / 2, t0, end(i), r + (i % 2) * 0.012, rz(i));
  };
  // A smooth strand through the given points (curtains, waves, curls).
  const tube = (pts, r, seg = 24) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), seg, r, 8, false), 0, 0, 0);
  // A springy curl (a short coil, its axis along +y): the curls of perms,
  // instead of round balls.
  const coil = (R = 0.11, len = 0.34, turns = 1.75, r = 0.06) => {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, a = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * R * (1 - 0.3 * t), t * len, Math.sin(a) * R * (1 - 0.3 * t)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 6, false);
  };
  // A wavy lock hanging from (x, y, z) down to y1: it swings `amp` side to
  // side (along the head's outline) in `n` half waves.
  const waveLock = (x, y, z, y1, amp, n, r) => {
    const pts = [];
    const nx = x / Math.hypot(x, z || 1e-6), nz = z / Math.hypot(x, z || 1e-6);
    for (let i = 0; i <= n * 4; i++) {
      const t = i / (n * 4), w = Math.sin(t * n * Math.PI) * amp;
      pts.push([x - nz * w + nx * t * 0.15, y + (y1 - y) * t, z + nx * w + nz * t * 0.15]);
    }
    tube(pts, r, n * 10);
  };
  // A curtain of hair round the head: a thick shell turned about the head's
  // vertical axis, open at the face. outer: [radius, y] from the top down
  // (the inner side is `thick` in from it, and the bottom is rounded off);
  // phi0/len: where it starts and how far round it goes (0 is the face).
  const curtain = (outer, { thick = 0.12, phi0 = Math.PI * 0.3, len = Math.PI * 1.4, x = 0, y = 0, z = -0.06, sx = 1, sz = 1, rx = 0 } = {}) => {
    const [rb, yb] = outer[outer.length - 1];
    const prof = [...outer];
    for (let k = 1; k < 4; k++) { // the rounded bottom, outer side round to inner
      const a = (k / 4) * Math.PI;
      prof.push([rb - thick / 2 + Math.cos(a) * thick / 2, yb - Math.sin(a) * thick * 0.45]);
    }
    for (let k = outer.length - 1; k >= 0; k--) prof.push([outer[k][0] - thick, outer[k][1]]);
    prof.push([...outer[0]]);
    const pts = prof.map(([r, h]) => new THREE.Vector2(Math.max(0.01, r), h));
    let geo = new THREE.LatheGeometry(pts, Math.max(6, Math.round(len * 5)), phi0, len);
    // Close its two ends (seen at the sides of the face).
    const end = (phi, flip) => {
      const c = new THREE.ShapeGeometry(new THREE.Shape(pts));
      if (flip) {
        const ix = c.index.array;
        for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
      }
      c.rotateY(phi - Math.PI / 2);
      c.computeVertexNormals();
      return c;
    };
    geo = joinGeos(joinGeos(geo, end(phi0, false)), end(phi0 + len, true));
    return fixed(add(geo, x, y, z, sx, 1, sz, rx));
  };
  // A tail of hair (a ponytail, a pigtail): a teardrop turned round its own
  // axis, fullest a third of the way down, with a tie at the top.
  const tail = (x, y, z, len, r, rx = 0, rz = 0) => {
    const prof = [[0.001, 0.05], [r * 0.55, 0.02], [r * 0.85, -len * 0.15], [r, -len * 0.38], [r * 0.82, -len * 0.7], [r * 0.4, -len * 0.93], [0.001, -len]];
    add(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 14), x, y, z, 1, 1, 0.85, rx, 0, rz);
    const keep = shade;
    shade = [0.7, 0.95]; // the tie, darker
    add(new THREE.TorusGeometry(r * 0.5, r * 0.16, 6, 14), x, y + 0.01, z, 1, 1, 1, Math.PI / 2 + rx, 0, rz);
    shade = keep;
  };
  switch (style) {
    case 'short': // 짧은 커트: tapered sides, a textured top and short locks falling forward (the forehead shows)
      shade = [0.5, 0.92];
      cap(0.95, 0.47, -0.5, 0.02); // the tapered sides and back, close and a shade darker
      shade = [0.15, 0.8];
      add(sphere(0.9, 20, 10, 0, Math.PI * 0.38), 0, 0.24, 0.0, 1.06, 0.85, 1.1, -0.12); // the top
      for (const [x, z] of [[-0.45, 0.3], [0.0, 0.42], [0.45, 0.28], [-0.3, -0.1], [0.3, -0.12], [0, -0.4]]) point(new THREE.ConeGeometry(0.3, 0.42, 5), x, 0.86 - Math.abs(x) * 0.15, z, [x * 0.5, 0.7, 1], 1, 1, 0.45); // flat tufts, pushed forward
      fringe(Math.PI / 2 - 0.12, 1.5, 5, (i) => Math.PI * [0.36, 0.32, 0.37, 0.33, 0.35][i], 1.04, () => -0.18, Math.PI * 0.14, 0.06); // short choppy locks, well above the brows
      break;
    case 'crop': // 투블럭: clipped sides and a heavy top that hangs over them, the fringe down to the brows
      shade = [0.62, 1.0];
      cap(0.95, 0.47, -0.5, 0.02); // the clipped under-layer
      shade = [0.15, 0.8];
      add(sphere(0.98, 24, 12, 0, Math.PI * 0.36), 0, 0.22, -0.05, 1.04, 0.95, 1.06, -0.22); // the block on top: its rim sits just over the clipped sides // the block on top, its rim standing out above the ears
      fringe(Math.PI / 2, 1.6, 7, (i) => Math.PI * (i % 2 ? 0.42 : 0.44), 1.05, (i) => (i - 3) * -0.03, Math.PI * 0.2, 0.03); // a thick fringe
      break;
    case 'bangs': // 앞머리: a short cut with see-through bangs and a few wisps by the cheeks
      cap(0.97, 0.55, -0.3);
      fringe(Math.PI / 2, 1.5, 6, (i) => Math.PI * (i % 2 ? 0.45 : 0.48), 1.03, () => 0, Math.PI * 0.17, 0.15); // thin, with gaps
      for (const s2 of [-1, 1]) { // wisps in front of the ears, curving in to the cheek
        tube([[0.8 * s2, 0.42, 0.5], [0.88 * s2, 0.12, 0.5], [0.86 * s2, -0.18, 0.46], [0.78 * s2, -0.34, 0.5]], 0.06, 14);
        tube([[0.9 * s2, 0.38, 0.3], [0.96 * s2, 0.05, 0.3], [0.92 * s2, -0.22, 0.26]], 0.065, 12);
      }
      break;
    case 'bob': // 단발: chin-length all round, open at the face, the ends turned in
      range = [-0.9, 1.05];
      cap(0.99, 0.55, -0.3, 0.04, false);
      curtain([[0.86, 0.52], [1.03, 0.18], [1.08, -0.2], [1.06, -0.5], [0.96, -0.74]], { thick: 0.16 });
      break;
    case 'long': // 긴 생머리: down the back, past the shoulders
      range = [-1.9, 1.05];
      cap(0.99, 0.55, -0.3, 0.04, false);
      curtain([[0.86, 0.52], [1.03, 0.18], [1.07, -0.3], [1.04, -0.75], [0.98, -0.9]], { thick: 0.13, phi0: Math.PI * 0.32, len: Math.PI * 1.36 });
      curtain([[0.85, -0.5], [0.96, -0.8], [1.0, -1.05], [0.94, -1.4], [0.84, -1.8]], { thick: 0.3, phi0: Math.PI * 0.64, len: Math.PI * 0.72, z: 0.0, sx: 1.12 }); // down the back
      break;
    case 'pony': // 포니테일
      cap(0.97, 0.55, -0.3);
      tail(0, 0.5, -1.12, 1.35, 0.3, 0.0);
      break;
    case 'twin': // 양갈래
      cap(0.97, 0.55, -0.3);
      for (const s of [-1, 1]) {
        tail(0.98 * s, 0.1, -0.28, 1.05, 0.26, 0.12, 0.14 * s);
      }
      break;
    case 'bun': // 똥머리
      cap(0.97, 0.55, -0.3);
      add(sphere(0.42, 16, 12), 0, 0.98, -0.25, 1, 0.9, 1);
      break;
    case 'curly': { // 뽀글 파마: tight springy curls all over
      cap(0.98, 0.52, -0.35);
      add(sphere(0.9, 20, 10, 0, Math.PI * 0.45), 0, 0.22, -0.05, 1.1, 0.95, 1.12, -0.15); // the volume under the curls
      const c = coil(0.13, 0.26, 1.75, 0.075);
      for (let ring = 0; ring < 4; ring++) {
        const th = 0.12 + ring * 0.3, n = [5, 11, 15, 17][ring]; // (the lowest ring is the hairline, above the brows)
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ring * 0.3;
          const x = Math.sin(th) * Math.cos(a), z = Math.sin(th) * Math.sin(a) - 0.08, y = Math.cos(th) * 0.9 + 0.1;
          point(c, x * 0.98, y, z * 0.98, [x, Math.cos(th) + 0.2, z + 0.08]);
        }
      }
      break;
    }
    case 'pomp': // 포마드: short sides, the top combed up off the forehead into one high, smooth front
      cap(0.95, 0.5, -0.5, 0.0);
      add(sphere(1, 24, 16), 0.02, 0.7, 0.12, 0.78, 0.58, 0.9, -0.45, 0, -0.05); // highest at the front, sloping down to the crown
      tube([[-0.55, 0.82, 0.55], [-0.15, 1.02, 0.66], [0.3, 1.0, 0.6], [0.62, 0.82, 0.42]], 0.035); // the comb line along its front
      break;
    case 'slick': // 슬릭백: combed straight back from a high hairline, close and sleek
      cap(0.98, 0.5, -0.58, 0.03);
      add(sphere(0.92, 22, 12, 0, Math.PI * 0.45), 0, 0.2, -0.18, 1.05, 0.9, 1.1, -0.65);
      add(sphere(1, 16, 10), 0, -0.12, -0.82, 0.62, 0.32, 0.3, -0.3); // tucked in at the nape
      break;
    case 'shaved': // 삭발: monks (NPCs only, not in HAIR_STYLES). The model's skull IS its hair, so
      // without it the head is open on top: a smooth cap in the skin's own colour closes it.
      hairCell = atlas.skin;
      shade = [0.2, 0.6]; // (the cell's lower band is the mouth's darker tone)
      cap(0.95, 0.56, -0.42, 0.03);
      break;
    case 'buzz': // 버즈컷: clipped all over, close to the head
      shade = [0.55, 0.95];
      cap(0.955, 0.48, -0.5, 0.03);
      break;
    case 'comma': // 콤마머리: a side fringe that curls in over one brow like a comma
      cap(0.98, 0.52, -0.38);
      add(sphere(0.86, 20, 10, 0, Math.PI * 0.42), 0.04, 0.24, 0.02, 1.08, 0.95, 1.12, -0.12); // soft volume on top
      fringe(Math.PI / 2 - 0.05, 1.5, 6, (i) => Math.PI * (0.45 - i * 0.012), 1.03, () => -0.16); // swept to one side
      tube([[-0.05, 0.62, 0.85], [-0.25, 0.42, 0.95], [-0.32, 0.26, 0.97], [-0.2, 0.2, 1.0], [-0.14, 0.3, 1.0]], 0.075, 20); // the comma's curl over one brow
      break;
    case 'dandy': // 댄디컷: a soft, even fringe of separate locks down to the brows
      cap(0.98, 0.52, -0.38);
      add(sphere(0.86, 20, 10, 0, Math.PI * 0.42), 0, 0.26, 0, 1.1, 0.92, 1.14, -0.1);
      fringe(Math.PI / 2, 1.9, 8, (i) => Math.PI * (i % 2 ? 0.43 : 0.45));
      break;
    case 'asperm': { // 애즈펌: a loose wave parted in the middle, both sides rolling out (wave ridges, not balls)
      cap(0.98, 0.52, -0.38);
      add(sphere(0.86, 20, 10, 0, Math.PI * 0.42), 0, 0.26, -0.02, 1.1, 0.95, 1.12, -0.1); // soft volume on top
      for (const s2 of [-1, 1]) {
        for (let k = 0; k < 3; k++) { // ridges from the parting, rolling out to the side
          const z0 = 0.5 - k * 0.5;
          tube([[0.06 * s2, 0.96 - k * 0.06, z0], [0.4 * s2, 0.92 - k * 0.06, z0 - 0.02], [0.66 * s2, 0.74 - k * 0.05, z0 - 0.08], [0.86 * s2, 0.48 - k * 0.04, z0 - 0.05]], 0.13, 20);
        }
        tube([[0.12 * s2, 0.92, 0.7], [0.45 * s2, 0.72, 0.84], [0.7 * s2, 0.5, 0.74], [0.8 * s2, 0.3, 0.6]], 0.12, 20); // the front, sweeping out
        add(new THREE.TorusGeometry(0.13, 0.07, 8, 16, Math.PI * 1.5), 0.82 * s2, 0.26, 0.58, s2, 1, 1, 0, 0.9 * s2, -0.8); // and curling at the temple
      }
      break;
    }
    case 'side': // 가르마 (2:8): a side parting, the long side swept over
      cap(0.97, 0.52, -0.38);
      add(sphere(0.86, 20, 12, 0, Math.PI * 0.45), 0.12, 0.3, 0.02, 1.08, 0.85, 1.14, -0.15, 0, -0.12); // the swept side
      fringe(Math.PI / 2 + 0.25, 1.4, 5, (i) => Math.PI * (0.36 + i * 0.02), 1.04, () => 0.3); // swept across from the parting
      add(sphere(1, 14, 10), 0.3, 0.86, 0.5, 0.42, 0.18, 0.3, 0.5, 0, -0.3); // a little lift at the front
      break;
    case 'center': { // 5:5 가르마: parted in the middle, curtains framing the face
      cap(0.98, 0.5, -0.45);
      for (const s2 of [-1, 1]) {
        add(sphere(0.62, 16, 10, 0, Math.PI * 0.5), 0.36 * s2, 0.52, 0.2, 1, 0.75, 1.1, -0.3, 0, -0.3 * s2);
        const p = Math.PI / 2 + s2 * 0.08;
        shell(Math.min(p, p + s2 * 0.95), Math.max(p, p + s2 * 0.95), Math.PI * 0.14, Math.PI * 0.46, 1.04, 0.3 * s2); // the curtain, sloping down to the side
      }
      break;
    }
    case 'hippie': { // 히피펌: a shaggy mop of small S-curls down to the shoulders
      range = [-1.1, 1.05];
      cap(0.99, 0.55, -0.32, 0.04, false);
      curtain([[0.88, 0.5], [1.06, 0.15], [1.1, -0.3], [1.08, -0.7]], { thick: 0.12, phi0: Math.PI * 0.3, len: Math.PI * 1.4 });
      for (let i = 0; i < 16; i++) { // wavy locks all round but the face
        const a = Math.PI * (0.3 + (i / 15) * 1.4);
        waveLock(Math.sin(a) * 1.04, 0.2 + (i % 2) * 0.12, Math.cos(a) * 1.0 - 0.06, -0.95 - (i % 3) * 0.08, 0.1, 4, 0.11);
      }
      for (let i = 0; i < 8; i++) { // wavy locks over the top, rolling forward
        const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 0.5, z = Math.sin(a) * 0.5 - 0.1;
        tube([[x * 0.3, 0.98, z * 0.3 - 0.05], [x * 0.8, 0.92, z * 0.8 + 0.03], [x * 1.25, 0.74, z * 1.25], [x * 1.65, 0.5, z * 1.65 + 0.05]], 0.1, 16);
      }
      fringe(Math.PI / 2, 1.5, 6, (i) => Math.PI * (i % 2 ? 0.42 : 0.46), 1.04, (i) => (i % 2 ? 0.15 : -0.15), Math.PI * 0.16, 0.06); // a loose fringe
      break;
    }
    case 'wave': { // 물결 웨이브: long hair in big S waves down the back
      range = [-1.8, 1.05];
      cap(0.99, 0.55, -0.3, 0.04, false);
      curtain([[0.86, 0.52], [1.03, 0.18], [1.06, -0.3], [1.03, -0.55]], { thick: 0.12, phi0: Math.PI * 0.32, len: Math.PI * 1.36 });
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.12 + (i / 8) * 0.76); // round the back
        waveLock(Math.cos(a) * 0.92, -0.3, -Math.sin(a) * 0.82 - 0.06, -1.75, 0.13, 3, 0.2);
      }
      for (const s2 of [-1, 1]) waveLock(0.9 * s2, -0.2, 0.3, -1.3, 0.1, 2, 0.17); // in front of the shoulders
      break;
    }
    case 'hime': // 히메컷: blunt bangs, cheek-length side locks and long straight hair
      range = [-1.9, 1.05];
      cap(0.97, 0.56, -0.25, 0.04, false);
      add(new THREE.SphereGeometry(1.0, 20, 6, Math.PI / 2 - 0.8, 1.6, Math.PI * 0.18, Math.PI * 0.27), 0, 0.02, -0.02, 1.03, 1, 1);
      curtain([[0.86, 0.52], [1.03, 0.18], [1.07, -0.3], [1.04, -0.75], [0.98, -0.9]], { thick: 0.13, phi0: Math.PI * 0.32, len: Math.PI * 1.36 });
      curtain([[0.85, -0.5], [0.96, -0.8], [1.0, -1.05], [0.94, -1.4], [0.84, -1.8]], { thick: 0.3, phi0: Math.PI * 0.64, len: Math.PI * 0.72, z: 0.0, sx: 1.12 }); // down the back
      for (const s2 of [-1, 1]) { // the side locks, cut straight at the cheek
        const p = Math.PI / 2 + s2 * 0.62;
        shell(Math.min(p, p + s2 * 0.4), Math.max(p, p + s2 * 0.4), Math.PI * 0.3, Math.PI * 0.68, 1.07);
      }
      break;
    case 'hush': { // 허쉬컷: light layers to the shoulders, ends flicked out, wispy bangs
      range = [-0.9, 1.05];
      cap(0.99, 0.55, -0.3, 0.04, false);
      curtain([[0.86, 0.52], [1.03, 0.18], [1.07, -0.25], [1.12, -0.6], [1.14, -0.72]], { thick: 0.11 });
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.32 + (i / 8) * 1.36); // round the back, not the face
        add(new THREE.ConeGeometry(0.2, 0.55, 8), Math.sin(a) * 1.08, -0.85, Math.cos(a) * 1.0 - 0.06, 1, 1, 0.6, Math.cos(a) * -0.5, 0, Math.sin(a) * 0.5 + Math.PI); // the flicked ends
      }
      fringe(Math.PI / 2, 1.3, 6, (i) => Math.PI * (i % 2 ? 0.45 : 0.48), 1.03, () => 0, Math.PI * 0.16, 0.1); // see-through bangs
      break;
    }
    case 'mohawk': { // 모히칸: shaved sides and a tall crest from the forehead to the nape
      shade = [0.55, 0.95];
      cap(0.955, 0.48, -0.45, 0.02);
      shade = [0.15, 0.8];
      add(sphere(1, 20, 14), 0, 0.55, -0.15, 0.16, 0.55, 1.0, -0.15); // one smooth crest, highest at the front
      for (let i = 0; i < 5; i++) { // a few points along its top
        const a = -0.6 + i * 0.38;
        point(new THREE.ConeGeometry(0.16, 0.45, 6), 0, 0.55 + Math.cos(a) * 0.5, -0.15 - Math.sin(a) * 0.95, [0, Math.cos(a), -Math.sin(a) * 1.4], 0.7, 1, 1);
      }
      break;
    }
    case 'rooster': { // 닭벼슬 모히칸 (funny): shaved sides, a huge fan of fat spikes like a rooster's comb and one lock flopping over the brow
      shade = [0.55, 0.95];
      cap(0.955, 0.48, -0.45, 0.02);
      shade = [0.15, 0.8];
      add(sphere(1, 20, 14), 0, 0.52, -0.15, 0.26, 0.55, 0.95, -0.15); // the crest's root along the middle
      const len = [0.95, 1.25, 1.5, 1.6, 1.4, 1.1];
      for (let i = 0; i < 6; i++) { // fanned out from the crown, the tallest in the middle
        const a = -0.95 + i * 0.4; // forward (+) .. back (-)
        point(new THREE.ConeGeometry(0.46, len[i], 8), 0, 0.6 + Math.cos(a) * 0.34, -0.15 + Math.sin(-a) * 0.72, [0, Math.cos(a), Math.sin(-a) * 1.2], 0.62, 1, 1);
      }
      tube([[0, 0.9, 0.42], [0, 1.25, 0.72], [0, 1.2, 1.05], [0, 0.95, 1.18], [0, 0.78, 1.08]], 0.12, 24); // the flop at the front
      break;
    }
    case 'spiky': { // 스파이키: short, gelled up into spikes all over
      cap(0.97, 0.52, -0.38);
      for (let i = 0; i < 13; i++) {
        const a = (i / 13) * Math.PI * 2, r = i % 2 ? 0.45 : 0.75;
        const x = Math.cos(a) * r, z = Math.sin(a) * r - 0.05;
        const y = Math.sqrt(Math.max(0.05, 1 - x * x - z * z)) * 0.95;
        point(new THREE.ConeGeometry(0.2, 0.62, 6), x, y, z, [x * 0.9, 1, z * 0.9 + 0.15]);
      }
      point(new THREE.ConeGeometry(0.19, 0.55, 6), 0, 1.0, 0, [0, 1, 0.2]);
      break;
    }
    case 'mullet': // 멀릿: short at the front and sides, long at the back
      cap(0.98, 0.53, -0.34);
      add(sphere(0.84, 20, 10, 0, Math.PI * 0.42), 0, 0.26, 0, 1.08, 0.88, 1.1, -0.1);
      add(new THREE.CylinderGeometry(0.9, 0.82, 1.0, 20, 2, true, Math.PI * 0.62, Math.PI * 0.76), 0, -0.55, -0.02, 1, 1, 0.95); // down the neck
      for (const x of [-0.4, 0, 0.4]) add(new THREE.ConeGeometry(0.2, 0.4, 6), x, -1.1, -0.75, 1, 1, 0.6, -0.2, 0, Math.PI);
      break;
    case 'wolf': { // 울프컷: choppy layers, a shaggy crown and long wispy ends at the back
      cap(0.99, 0.55, -0.32);
      for (let i = 0; i < 12; i++) {
        const a = Math.PI * (0.3 + (i / 11) * 1.4); // round the back
        const lower = i > 2 && i < 9; // longer at the back
        add(new THREE.ConeGeometry(0.22, lower ? 0.85 : 0.55, 6), Math.sin(a) * 0.98, lower ? -0.35 : -0.05, Math.cos(a) * 0.95 - 0.05, 1, 1, 0.6, Math.cos(a) * -0.35, 0, Math.sin(a) * 0.35 + Math.PI);
      }
      for (const [x, z] of [[-0.35, 0.3], [0.35, 0.3], [0, -0.2], [-0.5, -0.4], [0.5, -0.4]]) point(new THREE.ConeGeometry(0.2, 0.45, 6), x, 0.85, z, [x, 1, z]); // shaggy crown
      fringe(Math.PI / 2, 1.6, 6, (i) => Math.PI * [0.45, 0.41, 0.46, 0.42, 0.45, 0.4][i]); // choppy fringe
      break;
    }
    case 'manbun': // 맨번: combed back into a small bun at the back of the head
      cap(0.98, 0.5, -0.5, 0.03);
      add(sphere(0.9, 22, 12, 0, Math.PI * 0.45), 0, 0.2, -0.12, 1.06, 0.95, 1.08, -0.5);
      add(sphere(0.3, 14, 10), 0, 0.72, -0.82, 1, 0.85, 1);
      break;
    case 'layered': // 장발: men's long layers to the shoulders, parted in the middle
      range = [-1.1, 1.05];
      cap(0.99, 0.52, -0.42, 0.04, false);
      curtain([[0.86, 0.5], [1.03, 0.15], [1.07, -0.35], [1.08, -0.8], [1.0, -0.95]], { thick: 0.13, phi0: Math.PI * 0.32, len: Math.PI * 1.36 });
      for (const s2 of [-1, 1]) {
        add(sphere(0.62, 16, 10, 0, Math.PI * 0.5), 0.36 * s2, 0.52, 0.2, 1, 0.75, 1.1, -0.3, 0, -0.3 * s2);
        const p = Math.PI / 2 + s2 * 0.55;
        shell(Math.min(p, p + s2 * 0.6), Math.max(p, p + s2 * 0.6), Math.PI * 0.14, Math.PI * 0.58, 1.05, 0.15 * s2); // long curtains down past the cheeks
      }
      break;
    case 'afro': // 아프로: one big round cloud
      add(sphere(1.12, 26, 18), 0, 0.6, -0.4, 1.08, 0.92, 1); // set back so the face shows
      break;
    case 'braids': // 땋은 머리: two long braids down the back
      cap(0.98, 0.55, -0.3);
      for (const s2 of [-1, 1]) rope(0.55 * s2, -0.05, -0.75, 9, 0.17, 0.2, 0.03 * s2, -0.01, 0.025);
      break;
    case 'dreads': { // 드레드: thick ropes all round, tied loosely
      cap(0.99, 0.55, -0.3);
      for (let i = 0; i < 13; i++) {
        const a = Math.PI * (0.32 + (i / 12) * 1.36); // round the back
        const x = Math.sin(a) * 1.0, z = Math.cos(a) * 0.95 - 0.08;
        add(new THREE.CapsuleGeometry(0.11, 1.0, 4, 8), x, -0.35, z, 1, 1, 1, Math.cos(a) * -0.18, 0, Math.sin(a) * 0.18);
      }
      break;
    }
    case 'bowl': // 바가지 머리: one round helmet of hair, cut straight all round at the brows
      shade = [0.55, 0.95];
      cap(0.955, 0.48, -0.5, 0.03); // clipped short under the line at the back
      shade = [0.15, 0.8];
      add(sphere(1.04, 28, 14, 0, Math.PI * 0.46), 0, 0.04, -0.03, 1.0, 1.0, 1.02);
      break;
    case 'drill': { // 드릴 웨이브: blunt bangs and a tight corkscrew curl down each side
      cap(0.97, 0.56, -0.25);
      add(new THREE.SphereGeometry(1.0, 20, 6, Math.PI / 2 - 0.8, 1.6, Math.PI * 0.18, Math.PI * 0.27), 0, 0.02, -0.02, 1.03, 1, 1);
      for (const s2 of [-1, 1]) {
        add(sphere(0.26, 12, 10), 0.92 * s2, 0.1, -0.12); // gathered at the side
        for (const off of [0, Math.PI]) { // two strands twisted round each other
          const pts = [];
          for (let i = 0; i <= 48; i++) {
            const t = i / 48, a = t * Math.PI * 10 + off, R = 0.2 * (1 - 0.45 * t);
            pts.push([1.02 * s2 + Math.cos(a) * R, -0.05 - 1.35 * t, -0.1 + Math.sin(a) * R]);
          }
          tube(pts, 0.085, 96);
        }
      }
      break;
    }
    case 'fountain': { // 분수머리: tied up on top and spraying out like a fountain
      cap(0.96, 0.52, -0.38);
      add(sphere(0.17, 12, 10), 0, 0.98, 0.0); // the tie
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
        tube([[0, 0.98, 0], [c * 0.08, 1.26, sn * 0.08], [c * 0.3, 1.36, sn * 0.3], [c * 0.5, 1.18, sn * 0.5], [c * 0.6, 0.86, sn * 0.6 - 0.04]], 0.075, 20); // (ending on the head)
      }
      break;
    }
    default:
      return null;
  }
  glue(g);
  return g;
}

// Eye shapes from the clinics: scale (sx, sy) and tilt (radians, outer
// corner up) of each eye round its centre, and how far it comes forward.
export const EYE_TRANSFORM = {
  big: { sx: 1.4, sy: 1.4, tilt: 0, dz: 0.025 },
  round: { sx: 1.1, sy: 1.4, tilt: 0, dz: 0.02 },
  cat: { sx: 1.35, sy: 1.0, tilt: 0.16, dz: 0.015 },
  puppy: { sx: 1.2, sy: 1.3, tilt: -0.22, dz: 0.015 },
};

// Blush: coloured straight onto the face. Each cheek gets a decal (the
// head's own surface there, copied) painted with a soft round gradient, so
// the colour lies on the skin and fades out at the edges instead of a patch
// sitting on top. Head-mesh units; geo is the head as it is drawn.
let blushTex = null;
function blushGradient() {
  if (blushTex) return blushTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  blushTex = new THREE.CanvasTexture(c);
  blushTex.colorSpace = THREE.SRGBColorSpace;
  return blushTex;
}
const blushMats = new Map();
const _id = new THREE.Matrix4();
const blushGeos = new WeakMap(); // head geometry -> its two cheek decals
export function buildBlush(color, cheeks, geo) {
  const g = new THREE.Group();
  g.name = 'blush';
  if (!blushMats.has(color)) {
    blushMats.set(color, new THREE.MeshLambertMaterial({
      color, map: blushGradient(), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }));
  }
  if (!blushGeos.has(geo)) { // (one pair per head shape, shared by every character with it)
    const head = { geometry: geo, matrixWorld: _id };
    blushGeos.set(geo, cheeks.map((at) => new DecalGeometry(head, at, new THREE.Euler(0, Math.sign(at.x) * 0.45, 0), new THREE.Vector3(0.3, 0.22, 0.4))));
  }
  for (const d of blushGeos.get(geo)) if (d.attributes.position.count) g.add(new THREE.Mesh(d, blushMats.get(color)));
  return g;
}

// Petal Lip tints: a soft upper and lower lip, a little wider than the
// model's own small mouth so the colour reads from the street.
export function buildLips(color, at) {
  const g = new THREE.Group();
  g.name = 'lips';
  const m = new THREE.MeshLambertMaterial({ color });
  const upper = new THREE.Mesh(sphere(1, 18, 10), m);
  upper.scale.set(0.17, 0.045, 0.06);
  upper.position.set(0, 0.035, 0);
  const lower = new THREE.Mesh(sphere(1, 18, 10), m);
  lower.scale.set(0.15, 0.055, 0.065);
  lower.position.set(0, -0.035, 0);
  g.add(upper, lower);
  g.position.copy(at);
  return g;
}

// Cosmetic clinic jaw lines: how the lower face is pulled in or out (head
// units; t is 0 at the cheeks .. 1 at the chin). Only the jaw moves, so the
// head keeps its size and hats still fit.
// cheek: 0 .. 1 on the cheekbones (a V-line slims them too).
export function jawMove(shape, x, y, z, t, cheek = 0) {
  if (shape === 'vline') return [x * (1 - 0.27 * t) * (1 - 0.08 * cheek), y - 0.05 * t * Math.max(0, 1 - Math.abs(x) * 2), z + 0.02 * t];
  if (shape === 'square') { // full cheeks kept wide down to the jaw's corners, a flatter chin
    const flat = Math.max(0, 1 - Math.abs(x) * 1.8);
    return [x * (1 + 0.14 * Math.min(1, t * 1.5) + 0.08 * t * t), y + 0.07 * t * flat, z + 0.02 * t];
  }
  return [x, y, z];
}

// Cosmetic clinic noses: the model's own nose reshaped about its middle
// (sx/sy: narrower, longer; up/top: the upper half's length and width, a
// bridge up between the eyes; sz: how far it stands out; lift: the tip up).
export const NOSE_TRANSFORM = {
  high: { sx: 0.78, sy: 1.05, up: 2.3, top: 0.7, sz: 1.45, lift: 0.15 },
  big: { sx: 1.3, sy: 1.25, sz: 1.25, lift: 0 },
  small: { sx: 0.62, sy: 0.62, sz: 0.55, lift: 0.1 },
};
