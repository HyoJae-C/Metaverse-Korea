// Underground subway station: stair exits on the street and a station hall
// below (concourse, ticket gates, platform with screen doors, a passing train).
//
// The street side is data-driven (region.json "subway"): each exit has a spot
// and the direction its stairs go down. The ground gets a hole there, so you
// really walk down the steps; at the bottom you arrive in the station hall
// (its own scene, like a shop). Walk up another exit's stairs to come out there.
import * as THREE from 'three';

// Street stairwell, in the exit's own frame: +b runs down the stairs (from the
// mouth to the bottom), a runs across. The hole in the ground is w × l.
export const PIT = { w: 2.4, l: 6, depth: 3.2, run: 5 }; // steps over the first 5 m, then a landing
export const ENTER_AT = 0.8; // how far down the steps (0–1) you go below
const WALL = 0.3;

// World ↔ exit frame. Rotating by ry maps the exit's +b to (sin ry, cos ry).
export function toLocal(ex, x, z) {
  const dx = x - ex.at[0], dz = z - ex.at[1];
  const c = Math.cos(ex.ry), s = Math.sin(ex.ry);
  return [dx * c - dz * s, dx * s + dz * c];
}
export function toWorld(ex, a, b) {
  const c = Math.cos(ex.ry), s = Math.sin(ex.ry);
  return [ex.at[0] + a * c + b * s, ex.at[1] - a * s + b * c];
}
const rect = (ex, a0, a1, b0, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(([a, b]) => toWorld(ex, a, b));

// The hole in the ground (also where the steps are).
export const holeOf = (ex) => rect(ex, -PIT.w / 2, PIT.w / 2, -PIT.l / 2, PIT.l / 2);
// Walls you can't walk through: both sides and the far end. The mouth is open.
export function blockersOf(ex) {
  const h = PIT.w / 2, L = PIT.l / 2;
  return [
    { p: rect(ex, -h - WALL, -h, -L, L + WALL) },
    { p: rect(ex, h, h + WALL, -L, L + WALL) },
    { p: rect(ex, -h - WALL, h + WALL, L, L + WALL) },
  ];
}
// The whole entrance, for things that must not stand in it (street trees).
// (Keeps a clear patch in front of the mouth too.)
export const footprintOf = (ex, pad = 0.6) => ({ p: rect(ex, -PIT.w / 2 - WALL - pad, PIT.w / 2 + WALL + pad, -PIT.l / 2 - pad - 3, PIT.l / 2 + WALL + pad) });
// Where you come out: just outside the mouth, facing away from the stairs.
export function outsideOf(ex, dist = 1.6) {
  const [x, z] = toWorld(ex, 0, -PIT.l / 2 - dist);
  return { x, z, ry: ex.ry + Math.PI };
}

// Which stairwell (x, z) is in, how deep, and how far down the steps (0–1).
export function streetStairs(sub, x, z) {
  for (let i = 0; i < (sub?.exits?.length || 0); i++) {
    const ex = sub.exits[i];
    const [a, b] = toLocal(ex, x, z);
    if (Math.abs(a) > PIT.w / 2 || b < -PIT.l / 2 || b > PIT.l / 2) continue;
    const frac = Math.min(1, Math.max(0, (b + PIT.l / 2) / PIT.run));
    return { i, frac, y: -PIT.depth * frac };
  }
  return null;
}

// ---------- Station hall (its own scene) ----------

export const HALL = { w: 44, d: 24, h: 4.4 };
export const GATE_Z = 1.5; // ticket gate row: the concourse is north (z < GATE_Z), the platform south
export const GATE_LANES = [-3, -1.5, 0, 1.5, 3];
export const FARE = 2; // coins, paid at the gate on the way in (going out is free)
// Standing at the gates? Which lane is nearest and which side you're on.
export function gateAt(x, z) {
  if (Math.abs(z - GATE_Z) > 1.8 || x < GATE_LANES[0] - 1.2 || x > GATE_LANES[GATE_LANES.length - 1] + 1.2) return null;
  const lane = GATE_LANES.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
  return { lane, inside: z > GATE_Z };
}
const DOOR_Z = 9.4; // platform screen doors
const STAIR = { w: 2.6, len: 7, rise: 3.4, z: -10.4 }; // up-stairs along the back wall, one at each end
export const HALL_EXIT_AT = 0.8;

// The stairs up to exit i: the foot faces the middle of the hall, the top is
// at the end wall. sgn -1 = west end (exit 1), +1 = east end (exit 2).
export function hallStairs(n) {
  return Array.from({ length: n }, (_, i) => {
    const sgn = i % 2 ? 1 : -1;
    const top = sgn * (HALL.w / 2 - 0.5), foot = top - sgn * STAIR.len;
    const z = STAIR.z - (i >> 1) * (STAIR.w + 1.2); // a third or fourth exit: another flight beside
    return { i, sgn, top, foot, z, w: STAIR.w, arrive: { x: foot - sgn * 1.4, z, ry: -sgn * Math.PI / 2 } };
  });
}
// Height on the hall stairs at (x, z), and how far up (0–1), or null.
export function hallStairsAt(stairs, x, z) {
  for (const st of stairs) {
    if (Math.abs(z - st.z) > st.w / 2) continue;
    const along = (x - st.foot) * st.sgn;
    if (along < 0 || along > STAIR.len) continue;
    const frac = along / STAIR.len;
    return { i: st.i, frac, y: STAIR.rise * frac };
  }
  return null;
}

const mats = {};
const mat = (c, o) => (mats[c + JSON.stringify(o || {})] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));

// Sign texture: Korean first, English (or the chosen language) below, as on
// real Seoul station signs. opts.num: an exit number box on the left.
export function signTexture(ko, sub2, { bg = '#f4f5f7', fg = '#22252b', num = null, numBg = '#f5a200', line = null, w = 512, h = 128 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  let x0 = 24;
  if (num != null) {
    g.fillStyle = numBg;
    g.beginPath(); g.roundRect(14, 14, h - 28, h - 28, 14); g.fill();
    g.fillStyle = '#1b1b1b';
    g.font = `900 ${h * 0.56}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(num), h / 2, h / 2 + 4);
    x0 = h + 4;
  }
  if (line) { // the line colour as a dot
    g.fillStyle = line;
    g.beginPath(); g.arc(x0 + 18, h * 0.36, 14, 0, Math.PI * 2); g.fill();
    x0 += 44;
  }
  g.fillStyle = fg;
  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.font = `800 ${h * 0.36}px system-ui, sans-serif`;
  g.fillText(ko, x0, h * 0.36, w - x0 - 16);
  g.font = `600 ${h * 0.2}px system-ui, sans-serif`;
  g.fillStyle = fg + 'cc';
  if (sub2) g.fillText(sub2, x0, h * 0.75, w - x0 - 16);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function signMesh(tex, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

// ---------- Street entrances ----------

export class SubwayEntrances {
  constructor(scene, sub) {
    this.sub = sub;
    this.items = (sub?.exits || []).map((ex, i) => this._build(scene, ex, i));
  }

  _build(scene, ex, i) {
    const line = this.sub.line?.color || '#f5a200';
    const g = new THREE.Group();
    g.position.set(ex.at[0], 0, ex.at[1]);
    g.rotation.y = ex.ry;
    const box = (sx, sy, sz, x, y, z, m) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
      o.position.set(x, y, z);
      g.add(o);
      return o;
    };
    const { w, l, depth, run } = PIT;
    const L = l / 2, hw = w / 2;
    const tile = mat('#d9dde3'), stone = mat('#b9bec7'), steel = mat('#5d6470'), stepM = mat('#9aa1ab'), nose = mat('#f2c230');
    // Steps down, then a landing and a lit doorway at the bottom.
    const n = 16, stepRun = run / n, rise = depth / n;
    for (let k = 0; k < n; k++) {
      const top = -(k + 1) * rise, b = -L + (k + 0.5) * stepRun;
      box(w, 0.3, stepRun, 0, top - 0.15, b, stepM);
      box(w, 0.02, 0.06, 0, top + 0.005, b - stepRun / 2 + 0.03, nose); // yellow step edges
    }
    box(w, 0.3, l - run + 0.02, 0, -depth - 0.15, L - (l - run) / 2, stepM);
    // Stairwell walls (below the street) and the far wall with the doorway.
    for (const s of [-1, 1]) {
      box(0.2, depth + 0.6, l + 0.2, s * (hw + 0.1), -(depth + 0.6) / 2, 0, tile);
      box(0.05, 0.25, l, s * (hw - 0.02), -1.6, 0, mat(line)); // a stripe in the line colour
      const rail = box(0.06, 0.06, Math.hypot(run, depth) + 0.2, s * (hw - 0.12), 0, 0, steel); // handrail
      rail.position.set(s * (hw - 0.12), -depth / 2 + 0.9, -L + run / 2);
      rail.rotation.x = Math.atan2(depth, run);
    }
    box(w + 0.4, depth + 0.6, 0.2, 0, -(depth + 0.6) / 2, L + 0.1, tile);
    const door = box(1.6, 2.2, 0.04, 0, -depth + 1.1, L - 0.01, new THREE.MeshBasicMaterial({ color: '#fff6dc' }));
    door.name = 'doorway';
    // Above the street: low stone walls with glass on top, posts and a glass roof.
    for (const s of [-1, 1]) {
      box(WALL, 1.0, l + WALL, s * (hw + WALL / 2), 0.5, WALL / 2, stone);
      box(0.04, 1.6, l + WALL, s * (hw + WALL / 2), 1.8, WALL / 2, glass());
      for (const b of [-L, L + WALL / 2]) box(0.14, 2.75, 0.14, s * (hw + WALL / 2), 1.375, b, steel);
    }
    box(w + WALL * 2, 1.0, WALL, 0, 0.5, L + WALL / 2, stone);
    box(w + WALL * 2, 1.6, 0.04, 0, 1.8, L + WALL / 2, glass());
    box(w + 1.0, 0.08, l + 1.0, 0, 2.78, WALL / 2, glass(0.35));
    for (const s of [-1, 1]) box(0.1, 0.12, l + 1.0, s * (hw + 0.5), 2.74, WALL / 2, steel);
    box(w + 1.0, 0.12, 0.1, 0, 2.74, -L - 0.35, steel);
    // Signs on the front (above the mouth) and the back.
    const front = signMesh(null, w + 0.8, (w + 0.8) / 4);
    front.position.set(0, 3.15, -L - 0.4);
    front.rotation.y = Math.PI;
    const back = front.clone();
    back.material = front.material.clone();
    back.position.set(0, 3.15, L + WALL + 0.25);
    back.rotation.y = 0;
    box(w + 0.9, (w + 0.8) / 4 + 0.1, 0.12, 0, 3.15, -L - 0.33, steel); // sign holders
    box(w + 0.9, (w + 0.8) / 4 + 0.1, 0.12, 0, 3.15, L + WALL + 0.18, steel);
    g.add(front, back);
    scene.add(g);
    const it = { ex, n: ex.n ?? i + 1, group: g, signs: [front, back] };
    this._sign(it, false, 'en');
    return it;
  }

  _sign(it, translated, lang) {
    const name = this.sub.name || {};
    const second = translated ? (name[lang] || name.en) : name.en;
    const ko = (name.ko || '') + '역';
    const tex = signTexture(ko, `${second} · Exit ${it.n}`, { num: it.n, line: this.sub.line?.color });
    for (const s of it.signs) { s.material.map?.dispose(); s.material.map = tex; s.material.needsUpdate = true; }
  }

  // "Translate signs": the second line in the chosen language.
  setTranslated(on, lang) { for (const it of this.items) this._sign(it, on, lang); }
}

function glass(opacity = 0.25) {
  return mat('#bfe4f2', { transparent: true, opacity, depthWrite: false });
}

// ---------- The station hall ----------

export function buildStation(store, ROOM) {
  const sub = store.subway;
  const line = sub.line?.color || '#f5a200';
  const { w, d, h } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a2d33');
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bcc4, 2.0));
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const colliders = [];
  const block = (x0, z0, x1, z1) => colliders.push({ p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  const box = (sx, sy, sz, x, y, z, m, parent = scene) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof m === 'string' ? mat(m) : m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };

  // Floor: light tiles; a yellow tactile strip along the platform edge.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tileTexture(w, d) }));
  scene.add(floor);
  box(w, 0.02, 0.5, 0, 0.01, DOOR_Z - 0.6, '#f2c230');
  // Walls (inward-facing, so the camera can look in from outside), with a
  // stripe in the line colour.
  const wallM = new THREE.MeshLambertMaterial({ color: '#e6e8ec' });
  const wall = (len, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), wallM);
    m.position.set(x, h / 2, z); m.rotation.y = ry; scene.add(m);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.35), mat(line));
    s.position.set(x + Math.sin(ry) * 0.01, 2.2, z + Math.cos(ry) * 0.01); s.rotation.y = ry; scene.add(s);
  };
  wall(w, 0, -d / 2, 0);
  wall(d, -w / 2, 0, Math.PI / 2);
  wall(d, w / 2, 0, -Math.PI / 2);
  const tunnel = new THREE.Mesh(new THREE.PlaneGeometry(w, h + 1), mat('#3a3d44'));
  tunnel.position.set(0, h / 2 - 1, d / 2); tunnel.rotation.y = Math.PI; scene.add(tunnel);

  // Track bed behind the screen doors.
  box(w, 0.1, d / 2 - DOOR_Z, 0, -0.9, (d / 2 + DOOR_Z) / 2, '#3a3d44');
  for (const z of [10.1, 11.1]) box(w, 0.08, 0.08, 0, -0.8, z, '#9aa1ab');
  block(-w / 2, DOOR_Z, w / 2, d / 2);

  // Platform screen doors: glass panels on a frame, the door pairs slide open
  // while a train stands.
  const doors = [];
  const pitch = 4.4;
  for (let x = -w / 2 + pitch / 2; x < w / 2; x += pitch) {
    box(0.18, 2.5, 0.18, x - pitch / 2 + 0.09, 1.25, DOOR_Z, '#8a919c');
    const pair = [];
    for (const s of [-1, 1]) {
      const pane = box(1.0, 2.1, 0.05, x + s * 0.5, 1.05, DOOR_Z, glass(0.4));
      pair.push({ pane, x0: x + s * 0.5, s });
    }
    doors.push(...pair);
    box(pitch - 0.2, 0.3, 0.2, x, 2.45, DOOR_Z, '#30343b');
  }

  // Concourse: ticket machines and a map on the back wall, the gates.
  for (let k = 0; k < 3; k++) {
    const x = -4 + k * 2.2;
    box(1.6, 1.7, 0.6, x, 0.85, -d / 2 + 0.35, '#3c6fb4');
    box(1.1, 0.6, 0.04, x, 1.25, -d / 2 + 0.67, '#d8ecff');
  }
  block(-5.2, -d / 2, 1.4, -d / 2 + 0.75);
  const name = sub.name || {};
  const mapSign = signMesh(signTexture(`${name.ko}역 · ${sub.line?.name?.ko || ''}`, `${name.en} Station · ${sub.line?.name?.en || ''}`, { line, w: 768, h: 128 }), 6, 1);
  mapSign.position.set(-1, 2.9, -d / 2 + 0.02);
  scene.add(mapSign);

  // Gates: a row of waist-high cabinets with lanes. The lanes are closed by
  // flaps: you pay at the gate (an action) and are walked through.
  const lanes = GATE_LANES;
  const gx0 = -6.5, gx1 = 6.5;
  let prev = gx0;
  for (const lx of [...lanes, gx1 + 0.45]) {
    const x0 = prev, x1 = lx - 0.45;
    if (x1 > x0) {
      box(x1 - x0, 1.0, 0.8, (x0 + x1) / 2, 0.5, GATE_Z, '#c9ced6');
      box(x1 - x0, 0.04, 0.8, (x0 + x1) / 2, 1.02, GATE_Z, '#30343b');
      block(x0, GATE_Z - 0.4, x1, GATE_Z + 0.4);
    }
    prev = lx + 0.45;
  }
  for (const lx of lanes) {
    box(0.3, 0.12, 0.05, lx, 1.12, GATE_Z - 0.38, '#3ad17a'); // green arrows
    for (const s of [-1, 1]) box(0.32, 0.5, 0.06, lx + s * 0.27, 0.75, GATE_Z, '#d0453a'); // flaps
    block(lx - 0.45, GATE_Z - 0.1, lx + 0.45, GATE_Z + 0.1);
  }
  // Fences on both sides of the gates.
  for (const [x0, x1] of [[-w / 2, gx0], [gx1, w / 2]]) {
    box(x1 - x0, 1.1, 0.08, (x0 + x1) / 2, 0.55, GATE_Z, glass(0.35));
    box(x1 - x0, 0.06, 0.1, (x0 + x1) / 2, 1.12, GATE_Z, '#8a919c');
    block(x0, GATE_Z - 0.1, x1, GATE_Z + 0.1);
  }

  // Up-stairs to the street at each end, with a lit opening at the top.
  const stairs = hallStairs(sub.exits.length);
  for (const st of stairs) {
    const n = 18, run = STAIR.len / n, rise = STAIR.rise / n;
    for (let k = 0; k < n; k++) {
      const top = (k + 1) * rise, x = st.foot + st.sgn * (k + 0.5) * run;
      box(run, top, st.w, x, top / 2, st.z, '#a7aeb8');
      box(0.06, 0.02, st.w, x - st.sgn * run / 2 + st.sgn * 0.03, top + 0.005, st.z, '#f2c230');
    }
    // A low wall that climbs with the steps on the open side (so the camera
    // can still see you), a handrail, and the daylight at the top.
    const side = st.z + st.w / 2;
    const prof = new THREE.Shape([[0, 0], [STAIR.len, 0], [STAIR.len, STAIR.rise + 1.0], [0, 1.0]].map(([u, v]) => new THREE.Vector2(u, v)));
    const sideWall = new THREE.Mesh(new THREE.ExtrudeGeometry(prof, { depth: 0.2, bevelEnabled: false }), mat('#d9dde3'));
    sideWall.scale.x = st.sgn; // climbs towards the end wall
    sideWall.position.set(st.foot, 0, side);
    if (st.sgn < 0) sideWall.material = mat('#d9dde3', { side: THREE.DoubleSide }); // mirrored: faces flip
    scene.add(sideWall);
    const rail = box(Math.hypot(STAIR.len, STAIR.rise), 0.07, 0.07, st.foot + st.sgn * STAIR.len / 2, STAIR.rise / 2 + 1.0, side + 0.1, '#5d6470');
    rail.rotation.z = st.sgn * Math.atan2(STAIR.rise, STAIR.len);
    block(Math.min(st.foot, st.top) + 0.3, side, Math.max(st.foot, st.top) + 0.5, side + 0.2);
    const sky = box(0.05, 2.2, st.w, st.top + st.sgn * 0.45, STAIR.rise + 1.1, st.z, new THREE.MeshBasicMaterial({ color: '#dff2ff' }));
    sky.name = 'daylight';
    // Exit sign over the foot of the stairs: "나가는 곳 1 Way Out".
    const n2 = sub.exits[st.i].n ?? st.i + 1;
    const sign = signMesh(signTexture(`나가는 곳 ${n2}번`, `Way Out · Exit ${n2}`, { num: n2, bg: '#2f3540', fg: '#ffffff' }), 2.8, 0.7);
    sign.position.set(st.foot - st.sgn * 0.2, 3.3, st.z);
    sign.rotation.y = -st.sgn * Math.PI / 2;
    scene.add(sign);
  }

  // Platform: benches (sit facing the doors), pillars and the station sign.
  const seats = [];
  for (const x of [-14, -5, 5, 14]) {
    box(2.4, 0.08, 0.5, x, 0.4, 5.2, '#c08a52');
    box(2.4, 0.5, 0.08, x, 0.7, 4.95, '#c08a52');
    for (const s of [-1, 1]) box(0.08, 0.4, 0.45, x + s * 1.1, 0.2, 5.2, '#5d6470');
    block(x - 1.2, 4.9, x + 1.2, 5.45);
    for (const s of [-0.6, 0.6]) seats.push({ x: x + s, z: 5.25, ry: 0, stand: [x + s, 6.1] });
  }
  for (const x of [-9.5, 0, 9.5]) {
    box(0.7, h, 0.7, x, h / 2, 4.2, '#d9dde3');
    block(x - 0.35, 3.85, x + 0.35, 4.55);
  }
  const prevSt = sub.prev || {}, nextSt = sub.next || {};
  const board = signMesh(signTexture(`${name.ko}  ${sub.code || ''}`, `← ${prevSt.ko || ''} ${prevSt.en || ''}   ·   ${nextSt.ko || ''} ${nextSt.en || ''} →`, { line, w: 768, h: 128 }), 6, 1);
  board.position.set(0, 3.2, 4.2 + 0.36);
  scene.add(board);
  const board2 = signMesh(signTexture(`${name.ko}  ${sub.code || ''}`, `${name.en} · ${sub.line?.name?.en || ''}`, { line, w: 768, h: 128 }), 6, 1);
  board2.position.set(0, 3.2, 4.2 - 0.36);
  board2.rotation.y = Math.PI;
  scene.add(board2);

  // LED board over the gates: says when a train is coming.
  const ledC = document.createElement('canvas');
  ledC.width = 512; ledC.height = 64;
  const ledTex = new THREE.CanvasTexture(ledC);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false }));
  led.position.set(0, 3.0, GATE_Z + 0.02);
  scene.add(led);
  const drawLed = (txt) => {
    const g = ledC.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#ffb21e'; g.font = '700 26px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 256, 33, 496);
    ledTex.needsUpdate = true;
  };

  // The train: silver cars with a stripe in the line colour. It comes in from
  // the west, stands with its doors open, and leaves east. Clipped to the hall.
  const clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), w / 2), new THREE.Plane(new THREE.Vector3(-1, 0, 0), w / 2)];
  const cm = (c) => new THREE.MeshLambertMaterial({ color: c, clippingPlanes: clip });
  const train = new THREE.Group();
  const carL = 19, cars = 4, body = cm('#d6dae0'), stripe = cm(line), win = cm('#33404f');
  for (let k = 0; k < cars; k++) {
    const cx = -k * (carL + 0.6);
    box(carL, 2.6, 2.7, cx, 0.6, 0, body, train);
    box(carL + 0.02, 0.25, 2.72, cx, 0.1, 0, stripe, train);
    for (let j = -3; j <= 3; j++) box(1.3, 0.8, 2.74, cx + j * 2.6, 1.15, 0, win, train);
  }
  train.position.set(-200, -0.4, 10.6);
  train.visible = false;
  scene.add(train);
  const trainLen = cars * (carL + 0.6);
  const STOP_X = trainLen / 2 - carL / 2; // centre the train in the hall
  const T = { t: 6, phase: 'wait' }; // first train comes soon after you arrive
  const MSG = {
    wait: `${name.ko || ''}역 · ${name.en || ''} Station`,
    coming: `열차가 들어오고 있습니다 · The train is approaching`,
    stop: `${nextSt.ko || ''} 방면 · For ${nextSt.en || ''}`,
  };
  drawLed(MSG.wait);
  const ease = (k) => k * k * (3 - 2 * k);

  function animate(dt) {
    T.t -= dt;
    if (T.phase === 'wait' && T.t <= 0) { T.phase = 'coming'; T.t = 6; train.visible = true; drawLed(MSG.coming); }
    if (T.phase === 'coming') {
      const k = 1 - Math.max(0, T.t) / 6;
      train.position.x = -w / 2 - 2 + (STOP_X + w / 2 + 2) * (1 - (1 - k) * (1 - k));
      if (T.t <= 0) { T.phase = 'stop'; T.t = 9; drawLed(MSG.stop); }
    }
    if (T.phase === 'stop') {
      train.position.x = STOP_X;
      const open = ease(Math.min(1, Math.min(9 - T.t, T.t) / 1.2));
      for (const dr of doors) dr.pane.position.x = dr.x0 + dr.s * open * 0.95;
      if (T.t <= 0) { T.phase = 'leave'; T.t = 6; for (const dr of doors) dr.pane.position.x = dr.x0; }
    }
    if (T.phase === 'leave') {
      const k = 1 - Math.max(0, T.t) / 6;
      train.position.x = STOP_X + (w / 2 + trainLen / 2 + 2) * k * k;
      if (T.t <= 0) { T.phase = 'wait'; T.t = 20; train.visible = false; drawLed(MSG.wait); }
    }
  }

  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, stations: {}, room: ROOM,
    exit: { x: 1e4, z: 1e4 }, // no door: walk up the stairs
    animate, subway: { stairs, train: T },
  };
}

function tileTexture(w, d) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#cfd3d9'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(80,90,100,0.18)'; g.lineWidth = 2;
  for (let v = 0; v <= 128; v += 64) { g.beginPath(); g.moveTo(0, v); g.lineTo(128, v); g.stroke(); g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 128); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / 2, d / 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
