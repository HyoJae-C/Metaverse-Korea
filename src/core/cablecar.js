// Namsan Sky Cable (남산 하늘 케이블카): a fictional cable car up Namsan,
// next to the Namsan trail in the Itaewon district. Two cabins shuttle on
// two parallel cables (when one is at the bottom, the other is at the top),
// on one shared clock (the wall clock), so every player sees the same cabin
// in the same place.
//
//   cabinAt(i, t)          pure schedule, unit-tested
//   cableLine(l)           where each cabin hangs on the line, at progress k
//   cableCarLandmark(g, l) the line, its stations and cabins (Itaewon); you
//                          ride it outdoors (game/namsan-cable.js)
import * as THREE from 'three';
import { LOCK_SHAPES } from './love-locks.js';

export const CABLE = {
  // With two cabins half a cycle apart, one is at each station every
  // dwell + trip = 15 seconds (from either bay: you board whichever is in).
  dwell: 6, // seconds a cabin waits at each station with its doors open
  trip: 9, // seconds from one station to the other
  fare: 15000, // won for the way up; the way down is on the same ticket
};
CABLE.half = CABLE.dwell + CABLE.trip;
CABLE.cycle = CABLE.half * 2;

const ease = (u) => u * u * (3 - 2 * u); // start and stop gently

// Where cabin i (0 or 1) is at time t (seconds): k is 0 at the lower
// station and 1 at the top; `at` is 'low' or 'top' while it waits there.
// `leaves` is how many seconds until it goes (only while waiting), `next`
// how many until it reaches its next station (while moving).
export function cabinAt(i, t) {
  const { dwell, trip, half, cycle } = CABLE;
  const p = (((t + i * half) % cycle) + cycle) % cycle;
  if (p < dwell) return { k: 0, at: 'low', leaves: dwell - p, up: true };
  if (p < half) { const u = (p - dwell) / trip; return { k: ease(u), at: null, next: half - p, up: true }; }
  if (p < half + dwell) return { k: 1, at: 'top', leaves: half + dwell - p, up: false };
  const u = (p - half - dwell) / trip;
  return { k: 1 - ease(u), at: null, next: cycle - p, up: false };
}
// Doors close a moment before the cabin leaves.
export const doorsOpen = (c) => !!c.at && c.leaves > 1.2;
// Seconds until cabin i waits at `station` with its doors open (0: now).
export function arrivesIn(i, station, t) {
  const c = cabinAt(i, t);
  if (c.at === station && doorsOpen(c)) return 0;
  const { half, cycle } = CABLE;
  const p = (((t + i * half) % cycle) + cycle) % cycle;
  const at = station === 'low' ? 0 : half; // when in its cycle it pulls in
  return ((at - p) % cycle + cycle) % cycle || cycle;
}
export const cableClock = () => Date.now() / 1000;

const mats = {};
const mat = (c, o) => (mats[c + (o ? JSON.stringify(o) : '')] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o }));
const CABIN_COLORS = ['#e8483f', '#f2b134'];

// A cabin: floor, posts, coloured lower panels, glass, roof and the hanger
// up to the cable. Origin at the floor's centre; the open side faces +z
// (downhill). `rope` is how far above the floor the cable runs.
export function makeCabin(color, rope = 3.6) {
  const g = new THREE.Group();
  const box = (sx, sy, sz, x, y, z, c, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c, o)); m.position.set(x, y, z); g.add(m); return m; };
  box(2.4, 0.16, 2.2, 0, -0.08, 0, '#5b6068'); // floor
  for (const sx of [-1.15, 1.15]) for (const sz of [-1.05, 1.05]) box(0.1, 2.1, 0.1, sx, 1.05, sz, '#e9ecef'); // posts
  box(2.4, 0.75, 0.08, 0, 0.38, -1.06, color); // back panel
  for (const sx of [-1.16, 1.16]) box(0.08, 0.75, 2.2, sx, 0.38, 0, color); // side panels
  const glass = { transparent: true, opacity: 0.28 };
  box(2.3, 1.3, 0.04, 0, 1.4, -1.06, '#bfe3ff', glass);
  for (const sx of [-1.16, 1.16]) box(0.04, 1.3, 2.1, sx, 1.4, 0, '#bfe3ff', glass);
  box(2.6, 0.22, 2.4, 0, 2.2, 0, color); // roof
  box(1.6, 0.12, 1.4, 0, 2.36, 0, '#f4f4f4');
  box(0.14, rope - 2.4, 0.14, 0, 2.3 + (rope - 2.4) / 2, 0, '#3a3f46'); // hanger
  box(0.9, 0.3, 0.3, 0, rope, 0, '#3a3f46'); // grip on the cable
  return g;
}

// A sign board: big Korean name, small English line under it.
function signTexture(ko, en, bg = '#c0392b') {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 104px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  g.fillText(ko, 512, 100);
  g.font = '700 46px system-ui, sans-serif';
  g.fillText(en, 512, 204);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function signMesh(ko, en, w, bg) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: signTexture(ko, en, bg) }));
}

// Lock bodies in the four shapes players pick from (사랑의 자물쇠): a flat
// outline about 1 m across, centred on the origin, the shackle on top.
const heartPts = (s, n = 48) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * Math.PI * 2;
  return new THREE.Vector2(16 * Math.sin(t) ** 3 * s, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s);
});
export function lockShape(kind) {
  if (kind === 'heart') return new THREE.Shape(heartPts(0.031).map((v) => v.setY(v.y + 0.06)));
  if (kind === 'circle') { const sh = new THREE.Shape(); sh.absarc(0, 0, 0.45, 0, Math.PI * 2, false); return sh; }
  if (kind === 'star') {
    return new THREE.Shape(Array.from({ length: 10 }, (_, i) => {
      const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.24 : 0.55;
      return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r - 0.04);
    }));
  }
  const sh = new THREE.Shape(); // square, with softened corners
  const h = 0.4, c = 0.08;
  sh.moveTo(-h + c, -h); sh.lineTo(h - c, -h); sh.quadraticCurveTo(h, -h, h, -h + c); sh.lineTo(h, h - c); sh.quadraticCurveTo(h, h, h - c, h);
  sh.lineTo(-h + c, h); sh.quadraticCurveTo(-h, h, -h, h - c); sh.lineTo(-h, -h + c); sh.quadraticCurveTo(-h, -h, -h + c, -h);
  return sh;
}
// One lock (body + shackle), facing +z, about `size` metres across.
export function makeLock(kind, color, size = 0.4) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(lockShape(kind), { depth: 0.16, bevelEnabled: false }).translate(0, 0, -0.08), mat(color));
  g.add(body);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 14, Math.PI), mat('#c9ced6'));
  shackle.position.y = 0.42;
  g.add(shackle);
  g.scale.setScalar(size);
  return g;
}

// The love-lock heart on the summit plaza (game/namsan-summit.js): a big
// heart frame on a plinth, thick with locks on both faces, a sign over it,
// and the four kinds of lock players can pick hanging on a bar in front.
// Fixed decoration: locks players hang are kept on the server and shown in
// the message list, not added here one by one. At `at` ({x, z}), its face
// turned by ry.
export function loveLockHeart(scene, block, TOP, at, ry = Math.PI / 2) {
  const { x, z } = at;
  const g = new THREE.Group();
  g.position.set(x, TOP, z);
  g.rotation.y = ry; // its face looks into the plaza (+x in the room)
  scene.add(g);
  const S = 0.11, LIFT = 0.45 + 17 * S; // the heart's tip sits on the plinth
  const outer = heartPts(S, 72);
  const shape = new THREE.Shape(outer);
  shape.holes.push(new THREE.Path(heartPts(S * 0.72, 72).map((v) => v.setY(v.y + 0.25))));
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false }).translate(0, LIFT, -0.11), mat('#d6336c'));
  g.add(frame);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.9), mat('#b9ad98'));
  plinth.position.y = 0.225;
  g.add(plinth);
  // Locks on both faces of the frame, between its two edges.
  const N = 320;
  const locks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.21, 0.06), new THREE.MeshLambertMaterial({ color: '#ffffff' }), N);
  const cols = ['#ff5d8f', '#ffd23f', '#5dade2', '#58d68d', '#af7ac5', '#f5b041', '#ec7063', '#ffffff', '#ff8fb1'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), axis = new THREE.Vector3(0, 0, 1);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const t = rnd() * Math.PI * 2, k = 0.76 + rnd() * 0.2;
    const hx = 16 * Math.sin(t) ** 3 * S * k, hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * S * k + (1 - k) * 0.9;
    q.setFromAxisAngle(axis, (rnd() - 0.5) * 0.6);
    m4.compose(new THREE.Vector3(hx, LIFT + hy, (i % 2 ? 1 : -1) * 0.15), q, one);
    locks.setMatrixAt(i, m4);
    locks.setColorAt(i, cols[i % cols.length]);
  }
  g.add(locks);
  // A bar in front with the four kinds of lock (heart, circle, square, star).
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 0.07), mat('#8a8f99'));
  bar.position.set(0, 1.25, 0.7);
  g.add(bar);
  for (const sx of [-1.3, 1.3]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.25, 0.09), mat('#8a8f99'));
    post.position.set(sx, 0.625, 0.7);
    g.add(post);
  }
  ['#ff5d8f', '#ffd23f', '#5dade2', '#af7ac5'].forEach((c, i) => {
    const l = makeLock(LOCK_SHAPES[i], c, 0.38);
    l.position.set(-0.84 + i * 0.56, 1.02, 0.7);
    g.add(l);
  });
  const sign = signMesh('사랑의 자물쇠', 'LOVE LOCKS · HANG ONE, READ THEM', 3.4, '#d6336c');
  sign.position.set(0, LIFT + 12 * S + 0.75, 0.12);
  g.add(sign);
  block(x, z, 1.2, 3.9); // the frame and its plinth (the bar in front too)
  block(x + 0.7, z, 0.3, 2.8);
}

// The line in world metres (the landmark at l.x, l.z): l.path is points
// [dx, dz, cableY, groundY] from the lower station's roof to the upper
// station. Two cables side by side, one per cabin; `cabin(i, k)` is where
// cabin i's floor is at progress k (0 the bottom, 1 the top), at an even
// pace along the cable.
export const CABIN_S = 1.2, CABIN_ROPE = 3.6; // a cabin's scale, and its cable above the floor
export function cableLine(l) {
  const path = l.path.map(([x, z, y, gy]) => [l.x + x, l.z + z, y, gy]);
  const [x0, z0] = path[0], [x1, z1] = path[path.length - 1];
  const heading = Math.atan2(x1 - x0, z1 - z0);
  const sx = Math.cos(heading) * 2, sz = -Math.sin(heading) * 2;
  const lines = [-1, 1].map((s) => path.map(([x, z, y]) => [x + sx * s, y, z + sz * s]));
  const lens = [0];
  for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]));
  const total = lens[lens.length - 1];
  const cabin = (i, k) => {
    const pts = lines[i], d = k * total;
    let j = 1;
    while (j < pts.length - 1 && lens[j] < d) j++;
    const u = (d - lens[j - 1]) / (lens[j] - lens[j - 1] || 1), a = pts[j - 1], b = pts[j];
    return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u - CABIN_ROPE * CABIN_S, z: a[2] + (b[2] - a[2]) * u };
  };
  return { path, heading, lines, cabin };
}

// The same line seen from the street: a bull-wheel house on the lower
// station's roof, the upper station by the tower, the two cables with a
// pylon at each point in between (so the line clears the hill), and the two
// cabins on the shared clock. Drawn in the landmark's group (at l.x, l.z).
export function cableCarLandmark(g, l) {
  const add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  const line = cableLine({ ...l, x: 0, z: 0 }), { path, heading } = line;
  const [x0, z0, y0] = path[0];
  const [x1, z1, y1, g1] = path[path.length - 1];
  const house = add(new THREE.BoxGeometry(8, 3, 6), '#c0392b', x0, y0 - 1.5, z0);
  house.rotation.y = heading;
  const top = add(new THREE.BoxGeometry(10, y1 - g1 + 1, 8), '#efe9df', x1, (y1 + g1) / 2, z1);
  top.rotation.y = heading;
  const roof = add(new THREE.BoxGeometry(11, 0.5, 9), '#5d6670', x1, y1 + 1, z1);
  roof.rotation.y = heading;
  for (const pts of line.lines) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z))), new THREE.LineBasicMaterial({ color: '#2b2f36' })));
  for (let i = 1; i < path.length - 1; i++) { // pylons
    const [x, z, y, gy] = path[i];
    const leg = add(new THREE.BoxGeometry(0.8, y - gy + 4, 0.8), '#c9ced6', x, (y + gy - 4) / 2, z);
    leg.rotation.y = heading;
    const arm = add(new THREE.BoxGeometry(6, 0.5, 0.6), '#c9ced6', x, y + 0.3, z);
    arm.rotation.y = heading;
  }
  const cabins = [0, 1].map((i) => { const c = makeCabin(CABIN_COLORS[i], CABIN_ROPE); c.scale.setScalar(CABIN_S); c.rotation.y = heading + Math.PI; g.add(c); return c; });
  return () => {
    const t = cableClock();
    cabins.forEach((c, i) => { const p = line.cabin(i, cabinAt(i, t).k); c.position.set(p.x, p.y, p.z); });
  };
}
