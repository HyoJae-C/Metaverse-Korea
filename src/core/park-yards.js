// Another Land's ride yards: a low candy fence round each ride (a ring, or a
// box, with a gap where its gate is), the gate's two striped posts with the
// ride's name on a board over the way in, and a short queue rail in front.
// The room under the island (park-grounds.js) and the island itself
// (park-island.js) both build theirs with a kit from here. The fence posts
// are instanced: kit.done() adds them, two draw calls for the lot.
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { RIDES, RIDE_GATES, RIDE_NAME, RIDE_EMOJI } from './park-rides.js';

const mat = matCache({ flatShading: true });
const ICING = '#fffaf3', PINK = '#ff8fb8', HOT = '#ff5f9e', MINT = '#8fe3c7', LEMON = '#ffe27a', LILAC = '#c9a8ff';
// Each island ride's yard in its own colour (fence rails, then the gate's
// posts, board and queue rail): the wheel blue, the drop purple, the swing
// yellow, the gyro swing mint. The rest stay pink.
const TONES = { wheel: ['#8fd0ff', '#3a8fd8'], drop: [LILAC, '#8c5ad8'], swing: [LEMON, '#e0a21c'], gyro: [MINT, '#26a882'] };
const PLAIN = [PINK, HOT];

// Each ride's yard fence: a ring (r, gap facing the gate: 0 = +x, π/2 =
// +z; null: closed all round, you're let in under the arch) or a box
// [x0, z0, x1, z1] with its gap [x0, x1] in the south side (z1).
const box = (k, hx, z0, z1, g0, g1) => ({ box: [RIDES[k].x - hx, RIDES[k].z + z0, RIDES[k].x + hx, RIDES[k].z + z1], gap: [RIDES[k].x + g0, RIDES[k].x + g1] });
export const YARDS = {
  carousel: { ring: RIDES.carousel.r + 1.6, gap: 0 },
  drop: { ring: 3.6, gap: Math.PI },
  viking: box('viking', 7.5, -2.8, 2.8, 3.4, 5.8),
  wheel: box('wheel', 4.5, -3, 2.7, -3.2, -0.8),
  swing: { ring: 6.7, gap: null },
  teacups: { ring: 4.9, gap: null },
  gyro: box('gyro', 8, -4.4, 4.4, -1.2, 1.2),
};
// Where each yard's gate arch stands, and whether its posts stand apart
// along x (a gate in a north or south fence) or along z.
export function archOf(kind) {
  const Y = YARDS[kind], R = RIDES[kind];
  if (Y.box) return { x: (Y.gap[0] + Y.gap[1]) / 2, z: Y.box[3], along: true };
  const g = RIDE_GATES[kind], dx = g.x - R.x, dz = g.z - R.z, d = Math.hypot(dx, dz) || 1, r = Y.ring + (Y.gap == null ? 0.2 : 0);
  return { x: R.x + (dx / d) * r, z: R.z + (dz / d) * r, along: Math.abs(dz) > Math.abs(dx) };
}
// Whether (x, z) is in a ride's yard, or within m of its fence.
export function inYard(kind, x, z, m = 0) {
  const Y = YARDS[kind], R = RIDES[kind];
  if (Y.box) { const [x0, z0, x1, z1] = Y.box; return x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m; }
  return Math.hypot(x - R.x, z - R.z) < Y.ring + m;
}

// A sign board over a gate: Korean as built (with the English under it), or
// the player's language when the signs are translated.
export function gateSign(names, emoji, w = 512, h = 160, color = HOT) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lang) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = ICING;
    for (let i = 0; i < w; i += 40) { g.beginPath(); g.arc(i + 20, 0, 16, 0, Math.PI); g.fill(); } // frosting drips
    g.strokeStyle = ICING; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const big = (emoji ? emoji + ' ' : '') + (lang ? names[lang] || names.en : names.ko);
    g.font = `900 ${big.length > 13 ? 46 : 60}px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
    g.lineWidth = 9; g.strokeStyle = 'rgba(60,20,60,0.45)'; g.strokeText(big, w / 2, h * 0.47, w - 40);
    g.fillStyle = ICING; g.fillText(big, w / 2, h * 0.47, w - 40);
    if (!lang) { g.font = '800 24px system-ui, sans-serif'; g.fillStyle = LEMON; g.fillText(names.en.toUpperCase(), w / 2, h * 0.82, w - 40); }
    tex.needsUpdate = true;
  };
  draw(null);
  return { tex, draw };
}

export function yardKit(scene, block) {
  const posts = [], signs = [];
  const add = (geo, color, x, y, z) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); scene.add(m); return m; };
  const fenceRail = (ax, az, bx, bz, h, color) => {
    const len = Math.hypot(bx - ax, bz - az);
    const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.09), mat(color));
    r.position.set((ax + bx) / 2, h, (az + bz) / 2);
    r.rotation.y = -Math.atan2(bz - az, bx - ax);
    scene.add(r);
    const r2 = r.clone();
    r2.position.y = h * 0.5;
    scene.add(r2);
  };
  // A fence along a line: posts every ~1.2 m and two rails; blocked.
  let tone = PLAIN;
  const fenceLine = (ax, az, bx, bz, h = 0.9, color = tone[0], solid = true) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.2));
    for (let i = 0; i <= n; i++) posts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n, h]);
    fenceRail(ax, az, bx, bz, h, color);
    if (!solid) return;
    const steps = Math.max(1, Math.ceil(len / 0.5));
    for (let i = 0; i <= steps; i++) block(ax + ((bx - ax) * i) / steps, az + ((bz - az) * i) / steps, 0.5, 0.5);
  };
  // A ring fence round (x, z) with a gate gap facing angle `gap` (null: no gap).
  const fenceRing = (x, z, r, gap) => {
    const n = Math.round((Math.PI * 2 * r) / 1.3), skip = 0.75 / r * 2; // the gap is about 1.5 m wide each side
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, mid = (a0 + a1) / 2;
      const d = Math.abs(Math.atan2(Math.sin(mid - gap), Math.cos(mid - gap)));
      if (gap != null && d < skip + 0.12) continue;
      fenceLine(x + Math.cos(a0) * r, z + Math.sin(a0) * r, x + Math.cos(a1) * r, z + Math.sin(a1) * r);
    }
  };
  const fenceBox = ([x0, z0, x1, z1], [g0, g1]) => {
    fenceLine(x0, z0, x1, z0);
    fenceLine(x0, z0, x0, z1);
    fenceLine(x1, z0, x1, z1);
    fenceLine(x0, z1, g0, z1);
    fenceLine(g1, z1, x1, z1);
  };
  // A gate: two striped posts and its name on a board over the way in.
  const gateArch = (kind, x, z, along) => {
    const deep = (TONES[kind] || PLAIN)[1];
    const s = gateSign(RIDE_NAME[kind], RIDE_EMOJI[kind], 512, 160, deep);
    signs.push(s);
    const dx = along ? 1 : 0, dz = along ? 0 : 1; // the posts stand apart along x (or z)
    for (const k of [-1, 1]) {
      for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 10), i % 2 ? ICING : deep, x + dx * k * 1.25, 0.35 + i * 0.7, z + dz * k * 1.25);
      add(new THREE.SphereGeometry(0.22, 10, 8), MINT, x + dx * k * 1.25, 2.95, z + dz * k * 1.25);
      block(x + dx * k * 1.25, z + dz * k * 1.25, 0.3, 0.3);
    }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.81), new THREE.MeshBasicMaterial({ map: s.tex, side: THREE.DoubleSide }));
    board.position.set(x, 2.55, z);
    board.rotation.y = along ? 0 : Math.PI / 2;
    scene.add(board);
    add(new THREE.BoxGeometry(along ? 2.7 : 0.08, 0.9, along ? 0.08 : 2.7), TONES[kind] ? deep : '#b8336e', x - (along ? 0 : 0.06), 2.55, z - (along ? 0.06 : 0));
  };
  // A short queue rail in front of a gate, so the way in reads at a glance.
  const queue = (kind) => {
    const g = RIDE_GATES[kind], side = !archOf(kind).along;
    const sx = side ? Math.sign(g.x - RIDES[kind].x) : 0, sz = side ? 0 : Math.sign(g.z - RIDES[kind].z);
    for (const k of [-1, 1]) {
      const ax = g.x + (side ? -sx * 0.6 : k * 1.25), az = g.z + (side ? k * 1.25 : -sz * 0.6);
      for (let i = 0; i < 3; i++) {
        const px = ax + sx * i * 0.8, pz = az + sz * i * 0.8;
        add(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8), '#d4a73a', px, 0.42, pz);
        add(new THREE.SphereGeometry(0.08, 8, 6), LEMON, px, 0.88, pz);
      }
      const r = new THREE.Mesh(new THREE.BoxGeometry(side ? 1.6 : 0.04, 0.04, side ? 0.04 : 1.6), mat((TONES[kind] || PLAIN)[1]));
      r.position.set(ax + sx * 0.8, 0.78, az + sz * 0.8);
      scene.add(r);
    }
  };
  // A ride's whole yard: its fence, its gate and the queue rail.
  const yard = (kind) => {
    const Y = YARDS[kind], R = RIDES[kind], a = archOf(kind);
    tone = TONES[kind] || PLAIN;
    if (Y.box) fenceBox(Y.box, Y.gap);
    else fenceRing(R.x, R.z, Y.ring, Y.gap);
    gateArch(kind, a.x, a.z, a.along);
    queue(kind);
    tone = PLAIN;
  };
  // The fence posts, instanced (sticks and their candy tops).
  const done = () => {
    if (!posts.length) return;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    const sticks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6).translate(0, 0.5, 0), mat(ICING), posts.length);
    const tops = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshLambertMaterial({ flatShading: true }), posts.length);
    posts.forEach(([x, z, h], i) => {
      sticks.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, h + 0.08, 1)));
      tops.setMatrixAt(i, m4.compose(v.set(x, h + 0.12, z), q.identity(), sc.set(1, 1, 1)));
      tops.setColorAt(i, col.set([PINK, MINT, LEMON, LILAC][i % 4]));
    });
    scene.add(sticks, tops);
  };
  return { fenceLine, gateArch, yard, done, setSignLang: (lang) => signs.forEach((s) => s.draw(lang)) };
}
