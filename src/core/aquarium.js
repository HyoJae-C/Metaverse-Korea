// KONEXT Aquarium (Samseong-dong): the hall you walk into through the glass
// pavilion on KONEXT Square (stores.json "konext-aquarium", workshop
// "aquarium"). One big room, front door at +z, walking towards -z:
//   lobby:        the KONEXT AQUARIUM board, a river-fish tank on the left
//                 and a sea-floor tank (lobster, crabs, kelp) on the right.
//   middle hall:  six jellyfish columns in six colours, a 1:2 blue whale
//                 model hanging over a 25 m line on the floor (the real
//                 length), coral reef tanks along the right wall and the
//                 penguin room on the left.
//   ocean tank:   the whole back of the hall, with a glass tunnel through it:
//                 sharks, a manta ray, a sea turtle, dolphins and an orca
//                 swimming over your head, and schools of small fish.
// Entry is free for now. Signs are bilingual like the other interiors.
import * as THREE from 'three';
import { matCache, addBox, canvasTex, wrapText } from './three-kit.js';

export const AQUA_ROOM = { w: 56, d: 64, h: 9 };
const HW = AQUA_ROOM.w / 2, HD = AQUA_ROOM.d / 2;
// Areas (x0, z0, x1, z1) in room metres.
export const OCEAN = { x0: -HW, z0: -HD, x1: HW, z1: -6, h: 8 };
export const TUNNEL = { w: 5.2, end: -29.5 }; // centred on x = 0, from the tank's glass to `end`
export const PENGUINS = { x0: -HW, z0: -4, x1: -16, z1: 18 };
export const REEF = { x0: 24, z0: -2, x1: HW, z1: 18 };
export const RIVER = { x0: -HW, z0: 21, x1: -25, z1: 30 };
export const SEAFLOOR = { x0: 25, z0: 21, x1: HW, z1: 30 };
export const JELLIES = [[-7, 3], [-3.8, 7], [-7, 11], [7, 3], [3.8, 7], [7, 11]]; // either side of the path to the tunnel
export const WHALE = { x: 13, z0: -4.5, len: 25, scale: 2 }; // the floor line is the real length; the model is half

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const glassMat = new THREE.MeshLambertMaterial({ color: '#9fd8ef', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });

// A sign: dark blue board, a big English line and a Korean line under it,
// and optional small text below. Faces +z.
function sign(w, h, en, ko, small = '', bg = '#0f3557') {
  const px = 512, ph = Math.round((px * h) / w);
  const tex = canvasTex(px, ph, (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7fd3f0'; g.fillRect(0, H - 6, W, 6);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let big = small ? H * 0.2 : H * 0.36;
    g.font = `900 ${Math.round(big)}px ${FONT}`;
    while (g.measureText(en).width > W * 0.92) g.font = `900 ${Math.round((big *= 0.9))}px ${FONT}`;
    g.fillText(en, W / 2, small ? H * 0.17 : H * 0.36);
    g.font = `700 ${Math.round(big * 0.62)}px ${FONT}`;
    g.fillStyle = '#cfeaf7';
    g.fillText(ko, W / 2, small ? H * 0.34 : H * 0.72);
    if (small) {
      g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.font = `600 ${Math.round(H * 0.075)}px ${FONT}`;
      let y = H * 0.52;
      for (const para of small.split('\n')) y = wrapText(g, para, W * 0.06, y, W * 0.88, H * 0.1);
    }
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

function put(g, o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; }

// ---- fish: one instanced mesh per kind, each fish on its own loop ----
// A fish shape along +x: body, tail fin and a top fin.
function fishGeometry(kind) {
  const parts = [];
  if (kind === 'manta') {
    const s = new THREE.Shape();
    s.moveTo(0.6, 0); s.lineTo(-0.2, 1.1); s.lineTo(-0.5, 0); s.lineTo(-0.2, -1.1); s.closePath();
    parts.push(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 0.04, 0));
    parts.push(new THREE.CylinderGeometry(0.02, 0.04, 0.9, 4).rotateZ(Math.PI / 2).translate(-0.9, 0, 0));
  } else if (kind === 'turtle') {
    parts.push(new THREE.SphereGeometry(0.5, 10, 6).scale(1, 0.35, 0.8));
    parts.push(new THREE.SphereGeometry(0.16, 8, 6).translate(0.58, 0, 0));
    for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(0.4, 0.04, 0.22).rotateY(s * 0.6).translate(0.2, 0, s * 0.45));
  } else if (kind === 'jelly') {
    parts.push(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; parts.push(new THREE.CylinderGeometry(0.02, 0.01, 1.1, 3).translate(Math.cos(a) * 0.3, -0.55, Math.sin(a) * 0.3)); }
  } else {
    const long = kind === 'shark' || kind === 'dolphin' || kind === 'orca';
    parts.push(new THREE.SphereGeometry(0.5, 10, 6).scale(1, long ? 0.32 : 0.5, long ? 0.3 : 0.22));
    parts.push(new THREE.ConeGeometry(long ? 0.22 : 0.26, long ? 0.4 : 0.36, 4).rotateZ(Math.PI / 2).scale(1, 1, 0.25).translate(-0.6, 0, 0));
    parts.push(new THREE.ConeGeometry(0.1, long ? 0.3 : 0.16, 4).scale(1.4, 1, 0.3).translate(long ? 0 : -0.05, long ? 0.22 : 0.27, 0));
    if (long) for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(0.22, 0.03, 0.2).rotateY(s * 0.5).translate(0.08, -0.08, s * 0.17));
  }
  const geos = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  for (const p of geos) for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k);
  return mergeAll(geos);
}

function mergeAll(geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

// A school: `n` fish of one kind and size, each going round an ellipse
// (centre cx, cz; radii rx, rz) at its own height and speed.
function school(g, kind, color, n, size, { cx, cz, rx, rz, y0, y1, speed = 0.35, basic = false }) {
  const m = basic ? new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }) : new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.InstancedMesh(fishGeometry(kind), m, n);
  mesh.frustumCulled = false;
  g.add(mesh);
  const fish = Array.from({ length: n }, (_, i) => {
    const r = (i * 0.618034) % 1;
    return { ph: (i / n) * Math.PI * 2 + r, k: 0.75 + 0.25 * r, y: y0 + (y1 - y0) * ((i * 0.381966) % 1), sp: speed * (0.85 + 0.3 * r), s: size * (0.85 + 0.3 * ((i * 0.7) % 1)) };
  });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const tick = (t) => {
    fish.forEach((f, i) => {
      if (kind === 'jelly') {
        const pulse = 1 + 0.12 * Math.sin(t * 2 + f.ph * 3);
        v.set(cx + Math.cos(f.ph) * rx * f.k, f.y + Math.sin(t * 0.5 + f.ph) * 0.5, cz + Math.sin(f.ph) * rz * f.k);
        e.set(0, f.ph, 0); sc.set(f.s * pulse, f.s / pulse, f.s * pulse);
      } else {
        const a = t * f.sp / Math.max(rx, rz) * 3 + f.ph;
        v.set(cx + Math.cos(a) * rx * f.k, f.y + Math.sin(a * 2 + f.ph) * 0.25, cz + Math.sin(a) * rz * f.k);
        // facing along the loop (counter-clockwise seen from above), a small tail wag
        const dx = -Math.sin(a) * rx, dz = Math.cos(a) * rz;
        e.set(0, Math.atan2(-dz, dx) + Math.sin(t * 6 + i) * 0.08, kind === 'manta' ? Math.sin(t * 1.5 + i) * 0.15 : 0);
        sc.set(f.s, f.s, f.s);
      }
      m4.compose(v, q.setFromEuler(e), sc);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  tick(0);
  return tick;
}

// A tank set into a wall: back panel, sand, glass front. `face` is the
// direction the glass looks: 'x+' (glass at x1) or 'x-' (glass at x0).
function wallTank(g, a, face, back, sand = '#e6d6a8', h = 4.2, base = 0.6) {
  const cx = (a.x0 + a.x1) / 2, cz = (a.z0 + a.z1) / 2, sx = a.x1 - a.x0, sz = a.z1 - a.z0;
  box(g, sx, base, sz, cx, base / 2, cz, '#1b3b55');
  box(g, sx, 0.12, sz, cx, base + 0.06, cz, sand);
  box(g, sx, 0.3, sz, cx, base + h + 0.15, cz, '#1b3b55');
  const wall = face === 'x+' ? a.x0 + 0.05 : a.x1 - 0.05;
  box(g, 0.1, h, sz, wall, base + h / 2, cz, back);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(sz, h), glassMat);
  glass.position.set(face === 'x+' ? a.x1 : a.x0, base + h / 2, cz);
  glass.rotation.y = Math.PI / 2;
  g.add(glass);
  // a soft light in the water
  const l = new THREE.PointLight(0x9fe3ff, 6, 9);
  l.position.set(cx, base + h - 0.4, cz);
  g.add(l);
  return { cx, cz, sx, sz, y0: base + 0.5, y1: base + h - 0.4 };
}

function coral(g, x, z, y, c, k = 1) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.25 * k, 0.9 * k, 6), mat(c));
  m.position.set(x, y + 0.45 * k, z); g.add(m);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.28 * k, 8, 5), mat(c));
  b.position.set(x + 0.3 * k, y + 0.25 * k, z + 0.2 * k); b.scale.y = 0.7; g.add(b);
}

function kelp(g, x, z, y, h, list) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.04), mat('#5b8f3a'));
  m.geometry.translate(0, h / 2, 0);
  m.position.set(x, y, z); g.add(m);
  list.push({ m, ph: x * 1.7 + z });
}

function penguin() {
  const p = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat('#1d2329'));
  body.scale.set(1, 1.5, 0.95); body.position.y = 0.45; p.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mat('#f5f5f0'));
  belly.scale.set(0.9, 1.35, 0.6); belly.position.set(0, 0.42, 0.12); p.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat('#1d2329'));
  head.position.y = 0.92; p.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), mat('#f29a2e'));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.9, 0.22); p.add(beak);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), mat('#ffffff'));
    eye.position.set(s * 0.08, 0.97, 0.16); p.add(eye);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.16), mat('#f29a2e'));
    foot.position.set(s * 0.1, 0.02, 0.06); p.add(foot);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.18), mat('#1d2329'));
    wing.position.set(s * 0.29, 0.5, 0); wing.rotation.z = s * 0.2; p.add(wing);
  }
  return p;
}

// The blue whale at half size: a long body along +z with a pale belly,
// flippers and flukes.
function blueWhale(len) {
  const w = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), mat('#5b7d9c'));
  body.scale.set(len * 0.13, len * 0.11, len); w.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12), mat('#c9d6df'));
  belly.scale.set(len * 0.11, len * 0.07, len * 0.85); belly.position.set(0, -len * 0.035, len * 0.05); w.add(belly);
  for (const s of [-1, 1]) {
    const fl = new THREE.Mesh(new THREE.BoxGeometry(len * 0.16, 0.08, len * 0.06), mat('#4d6f8e'));
    fl.position.set(s * len * 0.1, -len * 0.03, len * 0.18); fl.rotation.set(0, s * 0.4, s * -0.4); w.add(fl);
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(len * 0.14, 0.08, len * 0.07), mat('#4d6f8e'));
    fluke.position.set(s * len * 0.06, 0, -len * 0.52); fluke.rotation.y = s * -0.45; w.add(fluke);
  }
  const fin = new THREE.Mesh(new THREE.ConeGeometry(len * 0.02, len * 0.04, 4), mat('#4d6f8e'));
  fin.position.set(0, len * 0.055, -len * 0.3); w.add(fin);
  return w;
}

export function buildAquarium(store, ROOM = AQUA_ROOM, EXIT = { x: 0, z: ROOM.d / 2 - 0.9 }) {
  const { w, d, h } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#06182a');
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x0b2236, 1.1));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const g = new THREE.Group();
  scene.add(g);
  const colliders = [];
  const block = (a) => colliders.push({ p: [[a.x0, a.z0], [a.x1, a.z0], [a.x1, a.z1], [a.x0, a.z1]] });
  const ticks = [];
  const sway = [];

  // ---- the room: dark blue floor and walls (facing in), a door at the front ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color: '#16324a' }));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  for (const [len, x, z, ry] of [[w, 0, -d / 2, 0], [d, -w / 2, 0, Math.PI / 2], [d, w / 2, 0, -Math.PI / 2], [w, 0, d / 2, Math.PI]]) {
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(len, h), mat('#0d2740')), x, h / 2, z, ry);
  }
  // (flat and facing in, so the camera behind you sees through it like the walls)
  put(g, new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3), mat('#2b4d6a')), EXIT.x, 1.5, d / 2 - 0.02, Math.PI);
  put(g, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), mat('#9fd8ef')), EXIT.x, 1.3, d / 2 - 0.04, Math.PI);
  // a lit path on the floor from the door to the tunnel
  box(g, 3, 0.01, d - 8, 0, 0.006, 2, '#21486a');

  // ---- lobby ----
  // (high up, over the camera that follows you)
  put(g, sign(14, 2.8, 'KONEXT AQUARIUM', '코넥스트 아쿠아리움'), 0, 7.4, 21.5);
  put(g, sign(3, 1.1, 'Free entry for now', '지금은 무료 입장이에요', '', '#1d5fa8'), -5, 1.5, 24.4);
  box(g, 0.1, 1, 0.1, -5, 0.5, 24.35, '#9fb3c4');
  for (const s of [-1, 1]) { // ticket gates, open
    box(g, 0.4, 1, 1.6, s * 2.4, 0.5, 24, '#c9d3dc');
    box(g, 0.42, 0.06, 1.62, s * 2.4, 1.02, 24, '#1d5fa8');
  }

  // River fish (left of the lobby, glass facing +x)
  const river = wallTank(g, RIVER, 'x+', '#3d6a4e', '#a89a78');
  block(RIVER);
  put(g, sign(5, 1.3, 'RIVER FISH', '민물고기'), RIVER.x1 + 0.05, 5.4, (RIVER.z0 + RIVER.z1) / 2, Math.PI / 2);
  for (let i = 0; i < 7; i++) kelp(g, RIVER.x0 + 0.6 + (i % 3) * 0.8, RIVER.z0 + 0.8 + i * 1.2, 0.72, 1.4 + (i % 3) * 0.6, sway);
  const rv = { cx: river.cx + 0.3, cz: river.cz, rx: 1.0, rz: 3.4, y0: river.y0, y1: river.y1 };
  ticks.push(school(g, 'fish', '#c9a24a', 5, 0.7, { ...rv, speed: 0.3 })); // carp
  ticks.push(school(g, 'fish', '#9aa7ad', 8, 0.4, { ...rv, speed: 0.45 })); // minnows
  ticks.push(school(g, 'fish', '#e38a6a', 3, 0.9, { ...rv, rx: 0.8, speed: 0.35 })); // salmon

  // Sea floor (right of the lobby): lobster, crabs, kelp
  const sea = wallTank(g, SEAFLOOR, 'x-', '#24496a');
  block(SEAFLOOR);
  put(g, sign(5, 1.3, 'SEA FLOOR', '바닷속 바닥'), SEAFLOOR.x0 - 0.05, 5.4, (SEAFLOOR.z0 + SEAFLOOR.z1) / 2, -Math.PI / 2);
  for (let i = 0; i < 6; i++) kelp(g, SEAFLOOR.x1 - 0.6 - (i % 2) * 0.9, SEAFLOOR.z0 + 1 + i * 1.3, 0.72, 2.6 + (i % 3) * 0.5, sway);
  const lobster = new THREE.Group();
  box(lobster, 0.9, 0.22, 0.3, 0, 0.11, 0, '#c8432b');
  for (const s of [-1, 1]) { box(lobster, 0.4, 0.14, 0.18, 0.55, 0.1, s * 0.25, '#c8432b'); }
  put(g, lobster, sea.cx - 0.4, 0.72, sea.cz - 1.5, 0.5);
  for (const [dz, c] of [[1.2, '#d9662e'], [2.6, '#b8552a']]) {
    const crab = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 5), mat(c));
    crab.scale.y = 0.45; put(g, crab, sea.cx - 0.6, 0.78, sea.cz + dz);
  }
  ticks.push(school(g, 'fish', '#e7c64d', 6, 0.45, { cx: sea.cx - 0.3, cz: sea.cz, rx: 0.9, rz: 3.2, y0: sea.y0 + 0.8, y1: sea.y1 }));

  // ---- middle hall ----
  // Jellyfish columns in six colours.
  const jellyColors = ['#ff7eb6', '#6fc3ff', '#b58cff', '#ffad5c', '#7ef0b0', '#f2f6ff'];
  JELLIES.forEach(([x, z], i) => {
    box(g, 2.4, 0.5, 2.4, x, 0.25, z, '#1b3b55');
    box(g, 2.4, 0.3, 2.4, x, 4.95, z, '#1b3b55');
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: jellyColors[i], transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
    put(g, glow, x, 2.65, z);
    const l = new THREE.PointLight(new THREE.Color(jellyColors[i]), 3, 5);
    l.position.set(x, 2.6, z); g.add(l);
    ticks.push(school(g, 'jelly', jellyColors[i], 5, 0.55, { cx: x, cz: z, rx: 0.5, rz: 0.5, y0: 1.8, y1: 3.8, basic: true }));
    colliders.push({ p: [[x - 1.2, z - 1.2], [x + 1.2, z - 1.2], [x + 1.2, z + 1.2], [x - 1.2, z + 1.2]] });
  });
  put(g, sign(6, 1.5, 'JELLYFISH', '해파리'), 0, 7.2, 15.6);

  // The blue whale at 1:2 over a floor line as long as the real one.
  const model = blueWhale(WHALE.len / WHALE.scale);
  put(g, model, WHALE.x, 6.2, WHALE.z0 + WHALE.len / 2);
  ticks.push((t) => { model.rotation.z = Math.sin(t * 0.3) * 0.03; model.position.y = 6.2 + Math.sin(t * 0.4) * 0.08; });
  for (let i = 0; i < 3; i++) box(g, 0.03, h - 6.6, 0.03, WHALE.x, 6.6 + (h - 6.6) / 2, WHALE.z0 + WHALE.len / 2 - 4 + i * 4, '#9fb3c4'); // wires
  box(g, 0.3, 0.012, WHALE.len, WHALE.x, 0.012, WHALE.z0 + WHALE.len / 2, '#e9f3fa');
  for (let m = 0; m <= WHALE.len; m += 5) box(g, 1.1, 0.014, 0.12, WHALE.x, 0.014, WHALE.z0 + m, '#e9f3fa');
  const whaleSign = sign(5.2, 3.2, 'BLUE WHALE · 1:2 MODEL', '대왕고래 1:2 모형',
    'This model is 12.5 m long. A real blue whale is 25 m: the line on the floor. That is as long as two city buses!\n모형은 12.5 m, 진짜 대왕고래는 25 m (바닥의 선) · 시내버스 두 대 길이예요.');
  put(g, whaleSign, WHALE.x + 3.2, 1.9, WHALE.z0 + WHALE.len + 0.6);
  box(g, 0.12, 1.4, 0.12, WHALE.x + 3.2, 0.7, WHALE.z0 + WHALE.len + 0.55, '#9fb3c4');

  // Coral reef tanks along the right wall.
  const reef = wallTank(g, REEF, 'x-', '#1f5d86');
  block(REEF);
  for (let z = REEF.z0 + 0.6; z < REEF.z1 - 0.4; z += 6.67) box(g, 4, 4.8, 0.3, (REEF.x0 + REEF.x1) / 2, 3, z, '#1b3b55'); // dividers
  put(g, sign(6, 1.5, 'CORAL REEF', '산호초'), REEF.x0 - 0.05, 6.2, (REEF.z0 + REEF.z1) / 2, -Math.PI / 2);
  const coralCols = ['#ff6f91', '#ffb347', '#c38fff', '#ff8a5c', '#7ee0c3'];
  for (let i = 0; i < 18; i++) coral(g, REEF.x1 - 0.5 - (i % 3) * 0.9, REEF.z0 + 0.8 + i * 1.05, 0.72, coralCols[i % 5], 0.8 + (i % 4) * 0.25);
  const rf = { cx: reef.cx - 0.5, cz: reef.cz, rx: 1.0, rz: 8.6, y0: reef.y0 + 0.5, y1: reef.y1 };
  ticks.push(school(g, 'fish', '#ff8c1a', 10, 0.32, { ...rf, speed: 0.5 })); // clownfish
  ticks.push(school(g, 'fish', '#2f6fe0', 8, 0.42, { ...rf, speed: 0.45 })); // blue tang
  ticks.push(school(g, 'fish', '#ffd93d', 8, 0.4, { ...rf, speed: 0.4 })); // yellow tang

  // The penguin room on the left: ice, rocks, a pool, and penguins.
  const P = PENGUINS, pcx = (P.x0 + P.x1) / 2, pcz = (P.z0 + P.z1) / 2;
  box(g, P.x1 - P.x0, 0.4, P.z1 - P.z0, pcx, 0.2, pcz, '#eef6fb');
  for (const z of [P.z0, P.z1]) box(g, P.x1 - P.x0, 4.5, 0.3, pcx, 2.25, z, '#d9e8f2');
  box(g, 0.3, 0.9, P.z1 - P.z0, P.x1, 0.45, pcz, '#d9e8f2');
  const pg = new THREE.Mesh(new THREE.PlaneGeometry(P.z1 - P.z0, 3.6), glassMat);
  put(g, pg, P.x1, 2.7, pcz, Math.PI / 2);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), new THREE.MeshLambertMaterial({ color: '#3fa7d6' }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(P.x0 + 4, 0.42, P.z1 - 5); g.add(pool);
  for (const [x, z, s] of [[-25, -1, 1.4], [-20, 3, 1], [-26, 6, 1.1], [-19, -2, 0.8]]) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s), mat('#c4d3dd'));
    rock.scale.y = 0.55; put(g, rock, x, 0.5, z);
  }
  const pl = new THREE.PointLight(0xe8f6ff, 6, 14); pl.position.set(pcx, 4, pcz); g.add(pl);
  block(P);
  put(g, sign(6, 1.5, 'PENGUIN ROOM', '펭귄 방'), P.x1 + 0.05, 5.6, pcz, Math.PI / 2);
  const penguins = Array.from({ length: 8 }, (_, i) => {
    const pn = penguin();
    const swim = i >= 6;
    g.add(pn);
    return { pn, i, swim, a: i * 0.9, x: P.x0 + 3 + (i % 3) * 3, z: P.z0 + 3 + i * 1.8 };
  });
  ticks.push((t) => {
    for (const q of penguins) {
      if (q.swim) { // round the pool, low in the water
        const a = t * 0.6 + q.i * 3;
        q.pn.position.set(P.x0 + 4 + Math.cos(a) * 2, 0.22, P.z1 - 5 + Math.sin(a) * 3);
        q.pn.rotation.set(1.2, -a, 0, 'YXZ'); // lying forward, heading round the loop
      } else { // waddle back and forth on the ice
        const k = Math.sin(t * 0.25 + q.a);
        q.pn.position.set(q.x + k * 1.6, 0.4 + Math.abs(Math.sin(t * 6 + q.i)) * 0.04, q.z);
        q.pn.rotation.set(0, Math.cos(t * 0.25 + q.a) > 0 ? Math.PI / 2 : -Math.PI / 2, Math.sin(t * 6 + q.i) * 0.1);
      }
    }
  });

  // ---- the ocean tank and its tunnel ----
  const O = OCEAN, T = TUNNEL, tw = T.w / 2;
  box(g, O.x1 - O.x0, 0.12, O.z1 - O.z0, 0, 0.06, (O.z0 + O.z1) / 2, '#d8c79a'); // sand
  box(g, O.x1 - O.x0, O.h, 0.2, 0, O.h / 2, O.z0 + 0.1, '#0f4a73'); // back wall, deep blue
  for (const s of [-1, 1]) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(HW - tw, O.h), glassMat);
    put(g, glass, s * (tw + (HW - tw) / 2), O.h / 2, O.z1);
    box(g, HW - tw, 0.3, 0.3, s * (tw + (HW - tw) / 2), O.h + 0.15, O.z1, '#1b3b55');
    colliders.push({ p: s < 0 ? [[O.x0, O.z0], [-tw, O.z0], [-tw, O.z1], [O.x0, O.z1]] : [[tw, O.z0], [O.x1, O.z0], [O.x1, O.z1], [tw, O.z1]] });
  }
  colliders.push({ p: [[-tw, O.z0], [tw, O.z0], [tw, T.end], [-tw, T.end]] });
  // The tunnel: a glass arch with ribs, and a dark walkway.
  const tl = O.z1 - T.end;
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(tw + 0.2, tw + 0.2, tl, 24, 1, true, -Math.PI / 2, Math.PI), glassMat);
  arch.rotation.x = Math.PI / 2; arch.position.set(0, 0, (O.z1 + T.end) / 2); g.add(arch);
  for (let z = O.z1; z >= T.end; z -= 3) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(tw + 0.2, 0.06, 4, 20, Math.PI), mat('#c9d3dc'));
    rib.position.set(0, 0, z); g.add(rib);
  }
  box(g, T.w, 0.02, tl, 0, 0.02, (O.z1 + T.end) / 2, '#2b3945');
  const endCap = new THREE.Mesh(new THREE.CircleGeometry(tw + 0.2, 20, 0, Math.PI), glassMat);
  endCap.position.set(0, 0, T.end); g.add(endCap);
  put(g, sign(6, 1.4, 'OCEAN TUNNEL', '바다 터널'), 0, tw + 1.4, O.z1 + 0.05);
  // Rocks and coral on the sand, kelp at the back.
  for (let i = 0; i < 14; i++) {
    const s = i % 2 ? 1 : -1, x = s * (tw + 2 + ((i * 3.7) % (HW - tw - 4))), z = O.z0 + 2 + ((i * 5.3) % (O.z1 - O.z0 - 4));
    if (i % 3 === 0) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + (i % 4) * 0.4), mat('#6d7c86')); r.scale.y = 0.6; put(g, r, x, 0.4, z); }
    else coral(g, x, z, 0.1, coralCols[i % 5], 1.6);
  }
  for (let i = 0; i < 16; i++) kelp(g, O.x0 + 2 + i * 3.4, O.z0 + 0.8 + (i % 3) * 0.7, 0.1, 3 + (i % 4) * 1.1, sway);
  const ol = new THREE.PointLight(0x6fc8ff, 10, 40); ol.position.set(0, O.h - 0.5, (O.z0 + O.z1) / 2); g.add(ol);
  const ocz = (O.z0 + O.z1) / 2;
  for (const s of [-1, 1]) {
    const half = { cx: s * (tw + (HW - tw) / 2), cz: ocz, rx: (HW - tw) / 2 - 2, rz: (O.z1 - O.z0) / 2 - 2.5 };
    ticks.push(school(g, 'fish', '#c7d7e2', 26, 0.45, { ...half, y0: 1, y1: 4, speed: 0.8 })); // sardines
    ticks.push(school(g, 'fish', '#f2c14e', 10, 0.6, { ...half, rx: half.rx * 0.6, rz: half.rz * 0.6, y0: 1.5, y1: 5, speed: 0.5 }));
  }
  // Big animals go all the way round, over the tunnel.
  const all = { cx: 0, cz: ocz, rx: HW - 4, rz: (O.z1 - O.z0) / 2 - 3 };
  ticks.push(school(g, 'shark', '#7d8b96', 3, 2.6, { ...all, y0: 3.6, y1: 5.2, speed: 0.9 }));
  ticks.push(school(g, 'manta', '#3a4654', 1, 2.4, { ...all, rx: all.rx * 0.7, rz: all.rz * 0.8, y0: 4.2, y1: 4.2, speed: 0.6 }));
  ticks.push(school(g, 'turtle', '#6b8f4e', 2, 1.3, { ...all, rx: all.rx * 0.5, rz: all.rz * 0.6, y0: 3.4, y1: 4.6, speed: 0.4 }));
  ticks.push(school(g, 'dolphin', '#8aa3b8', 2, 2.2, { ...all, rx: all.rx * 0.85, rz: all.rz * 0.7, y0: 5, y1: 6.4, speed: 1.4 }));
  ticks.push(school(g, 'orca', '#16191d', 1, 3.6, { ...all, rx: all.rx * 0.6, rz: all.rz * 0.9, y0: 5.8, y1: 5.8, speed: 1 }));
  ticks.push(school(g, 'fish', '#b8c4cc', 1, 2.4, { ...all, rx: all.rx * 0.4, rz: all.rz * 0.4, y0: 2.6, y1: 2.6, speed: 0.25 })); // sunfish
  // The dolphin note, by the tank.
  const note = sign(5.6, 2.8, 'DOLPHINS & ORCA', '돌고래와 범고래',
    'Fun fact: real Korean aquariums can\'t bring in new dolphins or whales anymore (since 2023). Here in the game, say hi! 🐬\n실제 한국 아쿠아리움은 2023년부터 고래류를 새로 들여올 수 없어요. 게임 속에서는 반갑게 인사해요!');
  put(g, note, 15, 1.9, O.z1 + 0.25);
  box(g, 0.12, 1.4, 0.12, 15, 0.7, O.z1 + 0.2, '#9fb3c4');

  let t = 0;
  const built = {
    scene, products: [], colliders, seats: [], clerk: null, turntable: null, room: ROOM, exit: EXIT,
    stations: {}, aquarium: true,
    // keep the camera out of the tanks (it may follow you into the tunnel)
    camBlocked: (x, z) => colliders.some((c) => x > c.p[0][0] && x < c.p[1][0] && z > c.p[0][1] && z < c.p[2][1]) && !(Math.abs(x) < tw && z > T.end),
    tick(dt) {
      t += dt;
      for (const f of ticks) f(t);
      for (const k of sway) k.m.rotation.z = Math.sin(t * 0.8 + k.ph) * 0.12;
    },
  };
  return built;
}
