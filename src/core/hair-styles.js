// Hairstyles from the hair salon and lip colours from Petal Lip, built on top
// of a pack model's head. Made in the head mesh's own units (the head is about
// ±1 across, the eyes at height `ey`, the face toward +z) and sharing the
// model's material: every vertex samples one cell of the colour atlas, so the
// hair takes the model's own hair colour or the salon's dye for free.
import * as THREE from 'three';


// Which faces of the model's own head are hair on the scalp (hidden when you
// pick a style), and which stay: eyebrows, moustaches and beards are on the
// front of the face, below the forehead.
export function isScalpHair(cx, cy, cz, ey) {
  if (cz > 0.5 && cy < ey + 0.3 && Math.abs(cx) < 0.7) return false; // brows, beard
  return true;
}

// Point every vertex at one atlas cell, shading top to bottom like the
// atlas's own gradient (light at the top of a cell, darker lower down).
export function paintCell(geo, [cx, cy], atlas, light = 0.15, dark = 0.8) {
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const h = Math.max(1e-6, max.y - min.y);
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min.y) / h; // 0 bottom .. 1 top
    uv[i * 2] = (cx + 0.5) / atlas.cols;
    uv[i * 2 + 1] = (cy + light + (1 - t) * (dark - light)) / atlas.rows;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

const sphere = (r, ws = 22, hs = 16, t0 = 0, tl = Math.PI) => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, t0, tl);

// The hair for one style, as a group in head units. ey: eye height.
export function buildHair(style, material, atlas, ey) {
  const g = new THREE.Group();
  g.name = 'hairStyle';
  const hairCell = atlas.hair;
  let shade = [0.15, 0.8]; // atlas light .. dark (a darker pair reads as shaved)
  const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(paintCell(geo, hairCell, atlas, ...shade), material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const top = ey + 0.3; // forehead line
  // Every style starts from a cap over the skull, leaving the face clear.
  const cap = (r = 0.97, cover = 0.52, tilt = -0.42, y = 0.04) => add(sphere(r, 24, 14, 0, Math.PI * cover), 0, y, -0.04, 1.02, 1, 1, tilt);
  // A piece standing on the head at (x, y, z), its own +y pointing along dir
  // (spikes, strands, locks).
  const Y = new THREE.Vector3(0, 1, 0);
  const point = (geo, x, y, z, dir, sx = 1, sy = 1, sz = 1) => {
    const m = add(geo, x, y, z, sx, sy, sz);
    m.quaternion.setFromUnitVectors(Y, new THREE.Vector3(...dir).normalize());
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
  switch (style) {
    case 'short': // 짧은 커트
      cap();
      break;
    case 'crop': // 투블럭: short sides, a little volume on top
      cap(0.93, 0.5, -0.38, 0.02);
      add(sphere(0.8, 18, 10, 0, Math.PI * 0.42), 0, 0.2, 0.0, 1.05, 0.9, 1.08, -0.2);
      break;
    case 'bangs': // 앞머리: a straight fringe over the forehead
      cap(0.97, 0.56, -0.25);
      add(new THREE.SphereGeometry(1.0, 20, 6, Math.PI / 2 - 0.8, 1.6, Math.PI * 0.18, Math.PI * 0.27), 0, 0.02, -0.02, 1.03, 1, 1);
      break;
    case 'bob': { // 단발: chin-length all round, open at the face
      cap(0.99, 0.55, -0.3);
      const shell = new THREE.CylinderGeometry(0.97, 1.02, 0.95, 24, 2, true, Math.PI * 0.3, Math.PI * 1.4);
      add(shell, 0, -0.3, -0.06);
      break;
    }
    case 'long': { // 긴 생머리: down the back, past the shoulders
      cap(0.99, 0.55, -0.3);
      const shell = new THREE.CylinderGeometry(0.97, 1.0, 1.0, 24, 2, true, Math.PI * 0.32, Math.PI * 1.36);
      add(shell, 0, -0.32, -0.06);
      add(new THREE.BoxGeometry(1.7, 1.3, 0.3, 4, 4, 1), 0, -1.2, -0.62, 1, 1, 1, 0.12);
      break;
    }
    case 'pony': // 포니테일
      cap(0.97, 0.55, -0.3);
      add(sphere(0.2, 12, 10), 0, 0.35, -0.95);
      add(new THREE.CapsuleGeometry(0.22, 0.75, 6, 12), 0, -0.2, -1.12, 1, 1, 0.85, 0.3);
      break;
    case 'twin': // 양갈래
      cap(0.97, 0.55, -0.3);
      for (const s of [-1, 1]) {
        add(sphere(0.17, 12, 10), 0.86 * s, 0.05, -0.25);
        add(new THREE.CapsuleGeometry(0.2, 0.7, 6, 12), 1.0 * s, -0.5, -0.32, 0.9, 1, 0.9, 0, 0, 0.18 * s);
      }
      break;
    case 'bun': // 똥머리
      cap(0.97, 0.55, -0.3);
      add(sphere(0.42, 16, 12), 0, 0.98, -0.25, 1, 0.9, 1);
      break;
    case 'curly': { // 뽀글 파마: a cloud of curls
      cap(0.98, 0.52, -0.35);
      const curl = sphere(0.3, 10, 8);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const ring = i % 2 ? 0.55 : 0.9;
        const x = Math.cos(a) * 0.95, z = Math.sin(a) * 0.95 - 0.08;
        if (z > 0.55 && Math.abs(x) < 0.6) continue; // keep the face clear
        add(curl, x, 0.2 + ring * 0.35, z);
      }
      for (const [x, y, z] of [[0, 0.95, -0.1], [-0.45, 0.85, 0.15], [0.45, 0.85, 0.15], [-0.4, 0.85, -0.5], [0.4, 0.85, -0.5], [0, 0.8, 0.45]]) add(curl, x, y, z, 1.1, 1.1, 1.1);
      break;
    }
    case 'pomp': // 포마드: short sides, the top combed up off the forehead into one high, smooth front
      cap(0.95, 0.5, -0.5, 0.0);
      add(sphere(1, 24, 16), 0.02, 0.7, 0.12, 0.78, 0.58, 0.9, -0.45, 0, -0.05); // highest at the front, sloping down to the crown
      tube([[-0.55, 0.82, 0.55], [-0.15, 1.02, 0.66], [0.3, 1.0, 0.6], [0.62, 0.82, 0.42]], 0.035); // the comb line along its front
      break;
    case 'slick': // 슬릭백: combed straight back from a high hairline, close and sleek
      cap(0.98, 0.46, -0.72, 0.03);
      add(sphere(0.92, 22, 12, 0, Math.PI * 0.45), 0, 0.2, -0.18, 1.05, 0.9, 1.1, -0.65);
      add(sphere(1, 16, 10), 0, -0.12, -0.82, 0.62, 0.32, 0.3, -0.3); // tucked in at the nape
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
    case 'asperm': { // 애즈펌: a loose wave parted in the middle, both sides curling out
      cap(0.98, 0.52, -0.38);
      for (const [x, y, z] of [[-0.42, 0.78, 0.2], [0.42, 0.78, 0.2], [0, 0.92, -0.15], [-0.55, 0.62, -0.4], [0.55, 0.62, -0.4]]) add(sphere(0.38, 14, 10), x, y, z, 1, 0.7, 1);
      for (const s2 of [-1, 1]) {
        fringe(Math.PI / 2 + 0.45 * s2, 0.8, 3, (i) => Math.PI * (0.47 - i * 0.02), 1.03, () => 0.22 * s2); // each half sweeps out
        add(new THREE.TorusGeometry(0.12, 0.06, 8, 14, Math.PI * 1.4), 0.6 * s2, 0.28, 0.78, s2, 1, 1, 0, 0.6 * s2, -0.6); // and curls at the temple
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
    case 'hippie': { // 히피펌: a shaggy mop of small curls down to the shoulders
      cap(0.99, 0.55, -0.32);
      const curl = sphere(0.24, 10, 8);
      for (let ring = 0; ring < 4; ring++) {
        const y = 0.75 - ring * 0.42, R = 0.95 + ring * 0.06;
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + ring * 0.2;
          const x = Math.cos(a) * R, z = Math.sin(a) * R - 0.1;
          if (ring > 0 && z > (ring > 1 ? 0.05 : 0.35) && Math.abs(x) < (ring > 1 ? 0.95 : 0.75)) continue; // the face
          if (z > 0.55 && Math.abs(x) < 0.45) continue;
          add(curl, x, y, z);
        }
      }
      for (const [x, y, z] of [[0, 1.0, 0], [-0.45, 0.9, 0.2], [0.45, 0.9, 0.2], [0, 0.9, -0.5], [-0.25, 0.75, 0.62], [0.25, 0.75, 0.62]]) add(curl, x, y, z, 1.2, 1.2, 1.2);
      break;
    }
    case 'wave': { // 물결 웨이브: long hair in big S waves down the back
      cap(0.99, 0.55, -0.3);
      add(new THREE.CylinderGeometry(0.98, 1.02, 0.7, 24, 2, true, Math.PI * 0.32, Math.PI * 1.36), 0, -0.2, -0.06);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.12 + (i / 8) * 0.76); // round the back
        waveLock(Math.cos(a) * 0.92, -0.3, -Math.sin(a) * 0.82 - 0.06, -1.75, 0.13, 3, 0.2);
      }
      for (const s2 of [-1, 1]) waveLock(0.9 * s2, -0.2, 0.3, -1.3, 0.1, 2, 0.17); // in front of the shoulders
      break;
    }
    case 'hime': // 히메컷: blunt bangs, cheek-length side locks and long straight hair
      cap(0.97, 0.56, -0.25);
      add(new THREE.SphereGeometry(1.0, 20, 6, Math.PI / 2 - 0.8, 1.6, Math.PI * 0.18, Math.PI * 0.27), 0, 0.02, -0.02, 1.03, 1, 1);
      add(new THREE.CylinderGeometry(0.97, 1.0, 1.0, 24, 2, true, Math.PI * 0.32, Math.PI * 1.36), 0, -0.32, -0.06);
      add(new THREE.BoxGeometry(1.7, 1.3, 0.3, 4, 4, 1), 0, -1.2, -0.62, 1, 1, 1, 0.12);
      for (const s2 of [-1, 1]) { // the side locks, cut straight at the cheek
        const p = Math.PI / 2 + s2 * 0.62;
        shell(Math.min(p, p + s2 * 0.4), Math.max(p, p + s2 * 0.4), Math.PI * 0.3, Math.PI * 0.68, 1.07);
      }
      break;
    case 'hush': { // 허쉬컷: light layers to the shoulders, ends flicked out, wispy bangs
      cap(0.99, 0.55, -0.3);
      add(new THREE.CylinderGeometry(0.98, 1.08, 0.9, 24, 2, true, Math.PI * 0.3, Math.PI * 1.4), 0, -0.3, -0.06);
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
      for (let i = 0; i < 7; i++) {
        const a = -0.55 + i * 0.4; // round the top, front (-) to back (+)
        add(new THREE.BoxGeometry(0.3, 0.75 - Math.abs(a - 0.4) * 0.2, 0.36), 0, Math.cos(a) * 1.18, -Math.sin(a) * 1.18, 1, 1, 1, -a);
      }
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
      cap(0.99, 0.52, -0.42);
      add(new THREE.CylinderGeometry(0.98, 1.06, 1.1, 24, 2, true, Math.PI * 0.32, Math.PI * 1.36), 0, -0.4, -0.06);
      for (const s2 of [-1, 1]) {
        add(sphere(0.62, 16, 10, 0, Math.PI * 0.5), 0.36 * s2, 0.52, 0.2, 1, 0.75, 1.1, -0.3, 0, -0.3 * s2);
        const p = Math.PI / 2 + s2 * 0.55;
        shell(Math.min(p, p + s2 * 0.6), Math.max(p, p + s2 * 0.6), Math.PI * 0.14, Math.PI * 0.58, 1.05, 0.15 * s2); // long curtains down past the cheeks
      }
      break;
    case 'afro': // 아프로: one big round cloud
      add(sphere(1.2, 26, 18), 0, 0.72, -0.45, 1.12, 0.95, 1); // set back so the face shows
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
    default:
      return null;
  }
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
