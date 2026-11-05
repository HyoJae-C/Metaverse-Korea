// Namsan Sky Cable (남산 하늘 케이블카): a fictional cable car up Namsan,
// next to the Namsan trail in the Itaewon district. Two cabins shuttle on
// two parallel cables (when one is at the bottom, the other is at the top),
// on one shared clock (the wall clock), so every player sees the same cabin
// in the same place.
//
//   cabinAt(i, t)          pure schedule, unit-tested
//   buildCableCar(...)     the outdoor "room": the lower station, the slope
//                          and the summit plaza round the look-out tower
//   cableCarLandmark(g, l) the same line seen from the street (Itaewon)
import * as THREE from 'three';
import { namsanTower } from './landmarks.js';

export const CABLE = {
  dwell: 10, // seconds a cabin waits at each station with its doors open
  trip: 24, // seconds from one station to the other
  fare: 4, // coins for the way up; the way down is on the same ticket
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

// Room layout (metres, room space). The lower station is by the door
// (+z), the summit plaza is TOP metres up at the far end (-z).
export const CC = {
  w: 44, d: 120,
  top: 34, // summit height
  lowZ: 38, // cabin stop at the lower station
  topZ: -30, // cabin stop at the summit
  edge: -24, // the summit plaza starts here (z < edge)
  lowEdge: 35, // the lower station floor ends here (z > lowEdge)
  tracks: [-3.5, 3.5], // cabin 0 and cabin 1
  tower: { x: 0, z: -47 },
};
export const ROOM_CABLECAR = { w: CC.w, d: CC.d, h: 60 };
// The floor height under a point: the summit plaza or the lower station.
export const cableFloor = (x, z) => (z < CC.edge ? CC.top : 0);
// A cabin's floor at progress k: climbs steeply at first and levels off
// into the summit station, staying clear of the slope underneath.
export function cabinPos(i, k) {
  return { x: CC.tracks[i], y: CC.top * (1 - (1 - k) ** 1.6), z: CC.lowZ + (CC.topZ - CC.lowZ) * k };
}
// Where you stand to get in (the cabin's open side faces you).
export const boardSpot = (i, station) => (station === 'low'
  ? { x: CC.tracks[i], y: 0, z: CC.lowZ + 2.6 }
  : { x: CC.tracks[i], y: CC.top, z: CC.topZ - 2.6 });

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

export function buildCableCar(store, ROOM, EXIT) {
  const { w, d } = ROOM;
  const TOP = CC.top;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfdff5');
  scene.fog = new THREE.Fog('#cfe6f5', 140, 620);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x88b07a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.2);
  sun.position.set(30, 80, 40);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const add = (geo, color, x, y, z, parent = scene, o) => { const m = new THREE.Mesh(geo, mat(color, o)); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (sx, sy, sz, x, y, z, color, parent, o) => add(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z, parent, o);

  // The city far below: a wide ground, low blocks of buildings all round,
  // a river and a ring of hills on the horizon.
  add(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), '#b9c7a8', 0, -0.02, 0);
  add(new THREE.PlaneGeometry(1400, 60).rotateX(-Math.PI / 2), '#6fa8d6', 0, 0.02, 250); // the Han
  {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const N = 520;
    const city = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), N);
    const tones = ['#e8e2d6', '#d6dce4', '#f1ede4', '#c9ced6', '#e3d5c3', '#bfc8d2'].map((c) => new THREE.Color(c));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    let seed = 11, n = 0;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    while (n < N) {
      const x = (rnd() - 0.5) * 700, z = (rnd() - 0.5) * 700;
      if (Math.abs(x) < 70 && z > -90 && z < 70) continue; // the hill itself
      if (z > 215 && z < 285) continue; // the river
      const h = 4 + rnd() * rnd() * (Math.hypot(x, z) > 160 ? 46 : 26);
      m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(6 + rnd() * 12, h, 6 + rnd() * 12));
      city.setMatrixAt(n, m4);
      city.setColorAt(n, tones[n % tones.length]);
      n++;
    }
    scene.add(city);
    for (let i = 0; i < 14; i++) { // far hills
      const a = (i / 14) * Math.PI * 2;
      const hill = add(new THREE.ConeGeometry(70 + (i % 3) * 25, 50 + (i % 4) * 18, 7), '#8fae84', Math.sin(a) * 430, 20, Math.cos(a) * 430);
      hill.scale.y = 0.8;
    }
  }

  // Namsan: the slope between the stations (concave, under the cable), the
  // summit block with a rocky front, trees on the slope.
  {
    const span = CC.lowEdge - CC.edge;
    const W = 150, segX = 20, segZ = 24;
    const geo = new THREE.PlaneGeometry(W, span, segX, segZ).rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const slopeY = (z, x) => {
      const s = (CC.lowEdge - z) / span; // 0 at the bottom, 1 at the top
      const base = TOP * 0.9 * s - 8 * Math.sin(Math.PI * s);
      const side = Math.max(0, Math.abs(x) - 30) / 45; // falls away at the sides
      return Math.max(0, base * (1 - Math.min(1, side) * 0.85));
    };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i) + (CC.lowEdge + CC.edge) / 2;
      pos.setZ(i, z);
      pos.setY(i, slopeY(z, x));
    }
    geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo, mat('#7fb06a')));
    // The summit: a broad block, rock in front.
    const summit = new THREE.Mesh(new THREE.CylinderGeometry(70, 95, TOP, 18, 1), mat('#86b56f'));
    summit.scale.z = 0.62;
    summit.position.set(0, TOP / 2 - 0.02, CC.edge - 1 - 43.4);
    scene.add(summit);
    add(new THREE.BoxGeometry(60, 0.2, 44), '#d9d2c3', 0, TOP - 0.05, CC.edge - 22); // plaza paving
    // Trees: on the slope, kept away from the cable corridor.
    const tree = new THREE.ConeGeometry(2.4, 7, 6);
    tree.translate(0, 3.2, 0);
    const trees = new THREE.InstancedMesh(tree, mat('#4f8a4a'), 140);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    let n = 0, seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    while (n < 140) {
      const x = (rnd() - 0.5) * 140, z = CC.edge + 2 + rnd() * (span - 6);
      if (Math.abs(x) < 8) continue;
      const s = 0.7 + rnd() * 0.6;
      trees.setMatrixAt(n++, m4.compose(new THREE.Vector3(x, slopeY(z, x) - 0.4, z), q, sc.set(s, s, s)));
    }
    scene.add(trees);
    // Nobody walks up the slope.
    block(0, (CC.lowEdge + CC.edge) / 2, w, span);
  }

  // Cable lines and the pylons halfway.
  const ROPE = 3.6;
  for (const x of CC.tracks) {
    const pts = [];
    for (let s = 0; s <= 24; s++) { const p = cabinPos(CC.tracks.indexOf(x), s / 24); pts.push(new THREE.Vector3(x, p.y + ROPE, p.z)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#2b2f36' })));
  }
  {
    const p = cabinPos(0, 0.5);
    const hgt = p.y + ROPE + 0.6;
    const base = 6;
    for (const sx of [-1, 1]) {
      const leg = box(0.5, hgt - base + 2, 0.5, sx * 6.2, (hgt + base) / 2 - 1, p.z, '#c9ced6');
      leg.rotation.z = sx * 0.06;
    }
    box(14, 0.6, 0.8, 0, hgt, p.z, '#c9ced6');
  }

  // ── Lower station ───────────────────────────────────────────────
  const LOW = CC.lowZ;
  add(new THREE.PlaneGeometry(w, d / 2 - CC.lowEdge + 2).rotateX(-Math.PI / 2), '#d8d2c6', 0, 0.01, (d / 2 + CC.lowEdge) / 2);
  // Building: back wall (uphill), side walls, roof over the platform.
  for (const sx of [-1, 1]) box(4.5, 6.5, 0.6, sx * 8.75, 3.25, LOW - 3, '#efe9df'); // uphill wall, open over the tracks
  box(22, 1.1, 0.6, 0, 5.95, LOW - 3, '#efe9df');
  for (const sx of [-1, 1]) { box(0.6, 6.5, 12, sx * 11, 3.25, LOW + 3, '#efe9df'); block(sx * 11, LOW + 3, 0.8, 12); }
  box(23, 0.5, 13, 0, 6.6, LOW + 2.5, '#5d6670');
  // Bull wheels on the roof.
  for (const x of CC.tracks) { const wh = add(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 18), '#3a3f46', x, 7.3, LOW - 1.5); void wh; }
  const lowSign = signMesh('남산 하늘 케이블카', 'NAMSAN SKY CABLE · LOWER STATION', 12, '#c0392b');
  lowSign.position.set(0, 5.2, LOW + 9.05);
  scene.add(lowSign);
  // Track bays (the cabins stop here) with yellow edge lines.
  for (const x of CC.tracks) {
    block(x, LOW, 2.6, 2.6);
    add(new THREE.PlaneGeometry(2.6, 0.25).rotateX(-Math.PI / 2), '#ffd23f', x, 0.02, LOW + 1.4);
  }
  // Ticket booth and a fare board.
  box(2.4, 2.4, 1.6, -7.5, 1.2, LOW + 4, '#c0392b');
  box(2.8, 0.3, 2, -7.5, 2.55, LOW + 4, '#efe9df');
  block(-7.5, LOW + 4, 2.5, 1.7);
  const fare = signMesh('하늘 케이블카 · 왕복', `ROUND TRIP · ${CABLE.fare} COINS (GAME)`, 3.6, '#2f4f6f');
  fare.position.set(-7.5, 3.3, LOW + 4.85);
  scene.add(fare);
  // Benches to wait on.
  const seats = [];
  for (const bx of [7, 9]) {
    const bz = LOW + 7;
    box(1.6, 0.08, 0.5, bx, 0.38, bz, '#a8743f');
    box(1.6, 0.4, 0.08, bx, 0.6, bz + 0.25, '#a8743f');
    block(bx, bz, 1.7, 0.6);
    for (const o of [-0.4, 0.4]) seats.push({ x: bx + o, z: bz - 0.05, ry: Math.PI, stand: [bx + o, bz - 0.9] });
  }

  // ── Summit ──────────────────────────────────────────────────────
  const TZ = CC.topZ;
  // Upper station: a roof on posts over the two bays.
  for (const sx of [-7, 7]) for (const sz of [TZ - 3, TZ + 5]) { box(0.4, 8, 0.4, sx, TOP + 4, sz, '#efe9df'); block(sx, sz, 0.5, 0.5); }
  box(16, 0.5, 10, 0, TOP + 8.2, TZ + 1, '#5d6670');
  for (const x of CC.tracks) {
    block(x, TZ, 2.6, 2.6);
    add(new THREE.PlaneGeometry(2.6, 0.25).rotateX(-Math.PI / 2), '#ffd23f', x, TOP + 0.03, TZ - 1.4);
  }
  block(0, TZ + 4.5, 16, 1); // the open front over the slope
  const topSign = signMesh('남산 하늘 케이블카', 'NAMSAN SKY CABLE · SUMMIT', 9, '#c0392b');
  topSign.position.set(0, TOP + 6.9, TZ - 3.3);
  topSign.rotation.y = Math.PI;
  scene.add(topSign);

  // The look-out tower on the plaza.
  const tower = new THREE.Group();
  namsanTower(tower);
  tower.scale.setScalar(0.55);
  tower.position.set(CC.tower.x, TOP, CC.tower.z);
  scene.add(tower);
  block(CC.tower.x, CC.tower.z, 9.5, 9.5);

  // Railings round the plaza, hung with love locks.
  const rails = [
    [-w / 2 + 1, CC.edge - 1, -w / 2 + 1, -d / 2 + 1],
    [w / 2 - 1, CC.edge - 1, w / 2 - 1, -d / 2 + 1],
    [-w / 2 + 1, -d / 2 + 1, w / 2 - 1, -d / 2 + 1],
    [-w / 2 + 1, CC.edge - 1, -8, CC.edge - 1],
    [8, CC.edge - 1, w / 2 - 1, CC.edge - 1],
  ];
  const lockGeo = new THREE.BoxGeometry(0.14, 0.18, 0.06);
  const locks = new THREE.InstancedMesh(lockGeo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), 900);
  const lockCols = ['#ff5d8f', '#ffd23f', '#5dade2', '#58d68d', '#af7ac5', '#f5b041', '#ec7063', '#ffffff'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  let nl = 0, seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [x1, z1, x2, z2] of rails) {
    const len = Math.hypot(x2 - x1, z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, ry = Math.atan2(x2 - x1, z2 - z1);
    const bar = box(0.12, 0.1, len, cx, TOP + 1.05, cz, '#8a8f99'); bar.rotation.y = ry;
    const bar2 = box(0.08, 0.08, len, cx, TOP + 0.55, cz, '#8a8f99'); bar2.rotation.y = ry;
    for (let s = 0; s <= len; s += 2.5) {
      const k = s / len;
      box(0.12, 1.1, 0.12, x1 + (x2 - x1) * k, TOP + 0.55, z1 + (z2 - z1) * k, '#8a8f99');
    }
    const [xa, xb, za, zb] = [Math.min(x1, x2) - 0.3, Math.max(x1, x2) + 0.3, Math.min(z1, z2) - 0.3, Math.max(z1, z2) + 0.3];
    colliders.push({ p: [[xa, za], [xb, za], [xb, zb], [xa, zb]] });
    for (let s = 0.3; s < len && nl < 900; s += 0.16) {
      if (rnd() < 0.35) continue;
      const k = s / len, y = TOP + 0.62 + rnd() * 0.42;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry + Math.PI / 2);
      m4.compose(new THREE.Vector3(x1 + (x2 - x1) * k, y, z1 + (z2 - z1) * k), q, one);
      locks.setMatrixAt(nl, m4);
      locks.setColorAt(nl, lockCols[nl % lockCols.length]);
      nl++;
    }
  }
  locks.count = nl;
  scene.add(locks);
  // Green beds with pines in the plaza's back corners and by the sides.
  {
    const beds = [[-15, -52, 10, 8], [15, -52, 10, 8], [-17, -33, 6, 10], [17, -33, 6, 10]];
    for (const [x, z, sx, sz] of beds) {
      box(sx, 0.5, sz, x, TOP + 0.25, z, '#b9ad98');
      box(sx - 0.4, 0.1, sz - 0.4, x, TOP + 0.52, z, '#7fb06a');
      block(x, z, sx, sz);
      for (let k = 0; k < 3; k++) {
        const tx = x + (k - 1) * (sx / 3.2), tz = z + ((k % 2) - 0.5) * (sz / 3);
        add(new THREE.CylinderGeometry(0.25, 0.3, 1.6, 6), '#7a5a3a', tx, TOP + 1.3, tz);
        add(new THREE.ConeGeometry(1.6, 4, 7), '#3f7f49', tx, TOP + 3.8, tz);
      }
    }
  }
  // Binoculars at the front, looking out over the city.
  for (const bx of [-14, 14]) {
    box(0.18, 1, 0.18, bx, TOP + 0.5, CC.edge - 2.2, '#3a3f46');
    const head = box(0.6, 0.35, 0.5, bx, TOP + 1.15, CC.edge - 2.2, '#2f6f8f');
    head.rotation.x = -0.2;
    block(bx, CC.edge - 2.2, 0.6, 0.6);
  }

  // The two cabins.
  const cabins = [0, 1].map((i) => { const c = makeCabin(CABIN_COLORS[i], ROPE); scene.add(c); return c; });
  const tick = () => {
    const t = cableClock();
    cabins.forEach((c, i) => { const s = cabinPos(i, cabinAt(i, t).k); c.position.set(s.x, s.y, s.z); });
  };
  tick();

  return {
    scene, products: [], colliders, seats, clerk: { x: -7.5, z: LOW + 2.9, ry: 0 }, turntable: null, room: ROOM, exit: EXIT,
    tick, floorAt: cableFloor, cablecar: true,
  };
}

// The same cable seen from the street: a bull-wheel house on the lower
// station's roof (l.x, l.z), the upper station by the tower, and the cable
// along l.path: points [dx, dz, cableY, groundY] from the lower station,
// with a pylon at each point in between (so the line clears the hill).
// Two cabins run on it on the shared clock, the same as inside.
export function cableCarLandmark(g, l) {
  const path = l.path;
  const add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  const [x0, z0, y0] = path[0];
  const [x1, z1, y1, g1] = path[path.length - 1];
  const heading = Math.atan2(x1 - x0, z1 - z0);
  const house = add(new THREE.BoxGeometry(8, 3, 6), '#c0392b', x0, y0 - 1.5, z0);
  house.rotation.y = heading;
  const top = add(new THREE.BoxGeometry(10, y1 - g1 + 1, 8), '#efe9df', x1, (y1 + g1) / 2, z1);
  top.rotation.y = heading;
  const roof = add(new THREE.BoxGeometry(11, 0.5, 9), '#5d6670', x1, y1 + 1, z1);
  roof.rotation.y = heading;
  // Two cables side by side, one per cabin.
  const sx = Math.cos(heading) * 2, sz = -Math.sin(heading) * 2;
  const lines = [-1, 1].map((s) => path.map(([x, z, y]) => new THREE.Vector3(x + sx * s, y, z + sz * s)));
  for (const pts of lines) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#2b2f36' })));
  for (let i = 1; i < path.length - 1; i++) { // pylons
    const [x, z, y, gy] = path[i];
    const leg = add(new THREE.BoxGeometry(0.8, y - gy + 4, 0.8), '#c9ced6', x, (y + gy - 4) / 2, z);
    leg.rotation.y = heading;
    const arm = add(new THREE.BoxGeometry(6, 0.5, 0.6), '#c9ced6', x, y + 0.3, z);
    arm.rotation.y = heading;
  }
  // Arc length along each line, to move the cabins at an even pace.
  const lens = [0];
  for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]));
  const total = lens[lens.length - 1];
  const along = (pts, k) => {
    const d = k * total;
    let i = 1;
    while (i < pts.length - 1 && lens[i] < d) i++;
    const u = (d - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
    return pts[i - 1].clone().lerp(pts[i], u);
  };
  const S = 1.2;
  const cabins = [0, 1].map((i) => { const c = makeCabin(CABIN_COLORS[i], 3.6); c.scale.setScalar(S); c.rotation.y = heading + Math.PI; g.add(c); return c; });
  return () => {
    const t = cableClock();
    cabins.forEach((c, i) => {
      const p = along(lines[i], cabinAt(i, t).k);
      c.position.set(p.x, p.y - 3.6 * S, p.z);
    });
  };
}
