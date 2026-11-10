// Inside the subway: the station hall (concourse, ticket gates, platform,
// screen doors, a passing train) and a train car. Rooms only, so this comes
// with the room builder (core/interior.js) and not in the first download;
// the street's stair exits and the shared numbers stay in core/subway.js.
import * as THREE from 'three';
import { mat, glass, signMesh, signTexture, nameBoardTexture, directionSignTexture, drawRouteMap, routeLayout, hallStairs, trainPhase, STAIR, DOORS, DOOR_Z, GATE_LANES, GATE_X, ROUTE_MAP, TRACKS } from './subway.js';

const PLAT_X = [-8.5, 25.5];
const ROUTE_PILLAR_X = -1.6; // the route map pillar on the platform, between two benches

// ---------- The station hall ----------

// store.subway: the station's data; store.towards: { up, down } names of the
// next station each way (or null when there's nowhere to go).
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
  const sign = (tex, sw, sh, x, y, z, ry = 0) => {
    const m = signMesh(tex, sw, sh);
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
    return m;
  };
  const name = sub.name || {};
  const lineName = sub.line?.name || {};

  // Floor; yellow tactile strips along both platform edges.
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tileTexture(w, d) })));
  const platL = PLAT_X[1] - PLAT_X[0], platC = (PLAT_X[0] + PLAT_X[1]) / 2;
  for (const s of [-1, 1]) box(platL, 0.02, 0.5, platC, 0.01, s * (DOOR_Z - 0.6), '#f2c230');
  // Walls (inward-facing, so the camera can look in from outside), with a
  // stripe in the line colour.
  const wallM = new THREE.MeshLambertMaterial({ color: '#e6e8ec' });
  const wall = (len, x, z, ry, color) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h + 1), color ? mat(color) : wallM);
    m.position.set(x, (h - 1) / 2, z); m.rotation.y = ry; scene.add(m);
    if (color) return;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.35), mat(line));
    s.position.set(x + Math.sin(ry) * 0.01, 2.2, z + Math.cos(ry) * 0.01); s.rotation.y = ry; scene.add(s);
  };
  const cw = GATE_X + w / 2; // concourse width
  wall(cw, -w / 2 + cw / 2, -d / 2, 0);
  wall(cw, -w / 2 + cw / 2, d / 2, Math.PI);
  wall(d, -w / 2, 0, Math.PI / 2);
  wall(platL + 0.5, platC, -d / 2, 0, '#3a3d44'); // tunnel walls behind the tracks
  wall(platL + 0.5, platC, d / 2, Math.PI, '#3a3d44');
  wall(d, w / 2, 0, -Math.PI / 2, '#3a3d44');

  // Tracks: a sunken bed with rails, walled off from the concourse.
  for (const tr of TRACKS) {
    const z0 = Math.sign(tr.z) * DOOR_Z, z1 = Math.sign(tr.z) * d / 2;
    box(platL + 0.5, 0.1, Math.abs(z1 - z0), platC, -0.9, (z0 + z1) / 2, '#3a3d44');
    for (const off of [-0.7, 0.7]) box(platL + 0.5, 0.08, 0.08, platC, -0.8, tr.z + off, '#9aa1ab');
    block(GATE_X - 0.3, Math.min(z0, z1), w / 2, Math.max(z0, z1));
    // The end of the track zone facing the concourse: a wall with the line stripe.
    box(0.3, h, Math.abs(z1 - z0), GATE_X - 0.15, h / 2, (z0 + z1) / 2, '#d9dde3');
  }

  // Screen doors along both platform edges: glass on a frame; each pair slides
  // open while a train stands there.
  const doors = [[], []];
  const pitch = 4.25;
  for (let t = 0; t < 2; t++) {
    const z = TRACKS[t].doorZ;
    for (let x = PLAT_X[0] + pitch / 2; x < PLAT_X[1]; x += pitch) {
      box(0.18, 2.5, 0.18, x - pitch / 2 + 0.09, 1.25, z, '#8a919c');
      for (const s of [-1, 1]) doors[t].push({ pane: box(1.0, 2.1, 0.05, x + s * 0.5, 1.05, z, glass(0.4)), x0: x + s * 0.5, s });
      box(pitch - 0.2, 0.3, 0.2, x, 2.45, z, '#30343b');
    }
  }

  // Concourse: ticket machines and the station sign on the west wall.
  for (let k = 0; k < 3; k++) {
    const z = -2.2 + k * 2.2;
    box(0.6, 1.7, 1.6, -w / 2 + 0.35, 0.85, z, '#3c6fb4');
    box(0.04, 0.6, 1.1, -w / 2 + 0.67, 1.25, z, '#d8ecff');
  }
  block(-w / 2, -3.4, -w / 2 + 0.75, 3.4);
  // Two drink vending machines against the north wall of the concourse.
  const vending = [];
  {
    const cans = ['#2b2b2b', '#c8a27a', '#f2c230', '#6b3b22', '#1fb34f', '#ff8a1c', '#7fd1ff', '#c9a15a', '#e8f4ff'];
    for (const [k, vx] of [-15.6, -14.3].entries()) {
      const vz = -d / 2 + 0.45;
      box(1.15, 1.95, 0.8, vx, 0.975, vz, k ? '#2f6fd0' : '#d8342c');
      box(0.95, 1.0, 0.04, vx, 1.35, vz + 0.41, new THREE.MeshBasicMaterial({ color: '#f7fbff' })); // lit window
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        box(0.16, 0.24, 0.04, vx - 0.3 + c * 0.3, 1.05 + r * 0.32, vz + 0.44, new THREE.MeshBasicMaterial({ color: cans[(r * 3 + c + k * 4) % cans.length] }));
      }
      box(0.7, 0.18, 0.06, vx, 0.35, vz + 0.42, '#1b1d22'); // the slot drinks drop into
      box(0.16, 0.3, 0.05, vx + 0.42, 0.85, vz + 0.42, '#c9ced6'); // coin slot and buttons
      block(vx - 0.6, vz - 0.4, vx + 0.6, vz + 0.4);
      vending.push({ x: vx, z: vz + 0.95 });
    }
    sign(signTexture('음료 자판기', 'Drinks · 🪙 1', { line, w: 512, h: 128 }), 2.4, 0.6, -14.95, 2.35, -d / 2 + 0.03, 0);
  }
  const sep = (a, b) => (b ? `${a} · ${b}` : a); // (a station may have no line name)
  sign(signTexture(sep(`${name.ko || ''}역`, lineName.ko), sep(`${name.en || ''} Station`, lineName.en), { line, w: 768, h: 128 }), 6, 1, -w / 2 + 0.02, 2.9, 0, Math.PI / 2);

  // Gates: waist-high cabinets across the hall; each lane has red flaps. You
  // pay at the gate (an action) and are walked through.
  let prev = -DOOR_Z;
  for (const lz of [...GATE_LANES, DOOR_Z + 0.45]) {
    const z0 = prev, z1 = lz - 0.45;
    if (z1 > z0) {
      box(0.8, 1.0, z1 - z0, GATE_X, 0.5, (z0 + z1) / 2, '#c9ced6');
      box(0.8, 0.04, z1 - z0, GATE_X, 1.02, (z0 + z1) / 2, '#30343b');
      block(GATE_X - 0.4, z0, GATE_X + 0.4, z1);
    }
    prev = lz + 0.45;
  }
  for (const lz of GATE_LANES) {
    box(0.05, 0.12, 0.3, GATE_X - 0.38, 1.12, lz, '#3ad17a'); // green arrows
    for (const s of [-1, 1]) box(0.06, 0.5, 0.32, GATE_X, 0.75, lz + s * 0.27, '#d0453a'); // flaps
    block(GATE_X - 0.1, lz - 0.45, GATE_X + 0.1, lz + 0.45);
  }

  // Up-stairs to the street along the concourse walls, with daylight at the top.
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
    const side = st.z - Math.sign(st.z) * (st.w / 2 + 0.2);
    const prof = new THREE.Shape([[0, 0], [STAIR.len, 0], [STAIR.len, STAIR.rise + 1.0], [0, 1.0]].map(([u, v]) => new THREE.Vector2(u, v)));
    const sideWall = new THREE.Mesh(new THREE.ExtrudeGeometry(prof, { depth: 0.2, bevelEnabled: false }), mat('#d9dde3', { side: THREE.DoubleSide }));
    sideWall.scale.x = st.sgn; // climbs towards the end wall
    sideWall.position.set(st.foot, 0, side);
    scene.add(sideWall);
    block(Math.min(st.foot, st.top) - 0.5, side, Math.max(st.foot, st.top), side + 0.2);
    // Rows further in (a third or fourth exit) also need the wall on the far side.
    const far = st.z + Math.sign(st.z) * (st.w / 2);
    if (Math.abs(far) < d / 2 - 0.6) block(Math.min(st.foot, st.top) - 0.5, far, Math.max(st.foot, st.top), far + Math.sign(st.z) * 0.2);
    const rail = box(Math.hypot(STAIR.len, STAIR.rise), 0.07, 0.07, st.foot + st.sgn * STAIR.len / 2, STAIR.rise / 2 + 1.0, side + 0.1, '#5d6470');
    rail.rotation.z = st.sgn * Math.atan2(STAIR.rise, STAIR.len);
    box(0.05, 2.2, st.w, st.top + st.sgn * 0.45, STAIR.rise + 1.1, st.z, new THREE.MeshBasicMaterial({ color: '#dff2ff' }));
    // Exit sign over the foot of the stairs: "나가는 곳 1번 · Way Out".
    const n2 = sub.exits[st.i].n ?? st.i + 1;
    sign(signTexture(`나가는 곳 ${n2}번`, `Way Out · Exit ${n2}`, { num: n2, bg: '#2f3540', fg: '#ffffff' }), 2.8, 0.7, st.foot + 0.2, 3.3, st.z, Math.PI / 2);
  }

  // Platform: benches back to back down the middle (sit facing a track),
  // pillars, the station name and which way each track goes.
  const seats = [];
  for (const x of [ROUTE_PILLAR_X - 3.6, ROUTE_PILLAR_X + 3.6, 11, 21]) {
    box(2.4, 0.08, 1.0, x, 0.4, 0, '#c08a52');
    box(2.4, 0.5, 0.08, x, 0.7, 0, '#c08a52');
    for (const s of [-1, 1]) box(0.08, 0.4, 0.95, x + s * 1.1, 0.2, 0, '#5d6470');
    block(x - 1.2, -0.5, x + 1.2, 0.5);
    for (const sx of [-0.6, 0.6]) {
      seats.push({ x: x + sx, z: 0.3, ry: 0, stand: [x + sx, 1.3] });
      seats.push({ x: x + sx, z: -0.3, ry: Math.PI, stand: [x + sx, -1.3] });
    }
  }
  for (const x of [5, 16]) {
    box(0.7, h, 0.7, x, h / 2, 0, '#d9dde3');
    block(x - 0.35, -0.35, x + 0.35, 0.35);
  }
  const towards = store.towards || {};
  for (const [t, tr] of TRACKS.entries()) {
    const s = Math.sign(tr.z);
    // Station name boards on the pillars, facing each track.
    // (Facing a board, the trains on that side run off to your right, so the
    // next station is always on the right.)
    const next = t === 0 ? towards.up : towards.down, prev = t === 0 ? towards.down : towards.up;
    const board = nameBoardTexture({ ko: name.ko || '', en: lineName.en ? `${name.en || ''} · ${lineName.en}` : name.en || '', code: sub.code, line, next, prev });
    for (const x of [5, 16]) sign(board, 3.6, 1.01, x, 2.75, s * 0.37, s > 0 ? 0 : Math.PI);
    // Over the screen doors: which way this track goes.
    const to = t === 0 ? towards.up : towards.down;
    const label = t === 0 ? ['상행', 'Up'] : ['하행', 'Down'];
    const txt = to ? [`${label[0]} · ${to.ko} 방면`, `${label[1]} · for ${to.en}`] : [`${label[0]}`, 'Not in service'];
    for (const x of [platC - 8, platC + 8]) sign(signTexture(txt[0], txt[1], { bg: '#2f3540', fg: '#ffffff', line, w: 640, h: 128 }), 3.5, 0.7, x, 3.2, s * (DOOR_Z - 0.4), s > 0 ? Math.PI : 0);
  }

  // Hanging sign where you step onto the platform: which side goes where.
  // Facing east (in from the gates) the up track (south, +z) is on the right.
  {
    const dirTxt = (t) => {
      const to = t === 0 ? towards.up : towards.down;
      const l = t === 0 ? ['상행', 'Up'] : ['하행', 'Down'];
      return to ? [`${l[0]} · ${to.ko} 방면`, `${l[1]} · for ${to.en}`] : [l[0], 'Not in service'];
    };
    const up = dirTxt(0), down = dirTxt(1);
    const sw = 7.2, sh = 0.9, sy = 3.8;
    const hang = (sx, front, back) => {
      sign(front, sw, sh, sx, sy, 0, -Math.PI / 2); // read walking east
      sign(back, sw, sh, sx + 0.04, sy, 0, Math.PI / 2); // read walking west
      for (const z of [-sw / 2 + 0.4, sw / 2 - 0.4]) box(0.04, h - sy - sh / 2, 0.04, sx + 0.02, (h + sy + sh / 2) / 2, z, '#9aa1ab');
    };
    // Just past the gates, over the platform end.
    hang(GATE_X + 2.6,
      directionSignTexture(['◀ ' + down[0], down[1]], [up[0] + ' ▶', up[1]], line),
      directionSignTexture(['◀ 나가는 곳', 'Way out · gates and stairs'], null, line));
    // In the concourse before the gates: where the trains are, and the way out.
    const upTo = towards.up, downTo = towards.down;
    hang(GATE_X - 5,
      directionSignTexture(['타는 곳 · Trains', '개찰구 지나서 · through the gates'],
        upTo ? [`상행 ${upTo.ko} · 하행 ${downTo.ko} ▶`, `Up for ${upTo.en} · Down for ${downTo.en}`] : ['▶', ''], line),
      directionSignTexture([`◀ 나가는 곳 · Exit ${sub.exits.map((e, i) => e.n ?? i + 1).join(', ')}`, '계단 위로 · stairs up to the street'], null, line));
  }

  // Route map on a slim pillar on the platform, between the first two
  // benches (bench, map, bench), a board on each face along the walk. Walk up
  // to it to see it up close (subway.routeMap).
  let setSignLang, routeMap = null;
  const loop = store.loop;
  if (loop?.stops?.length > 1) {
    const px = ROUTE_PILLAR_X, pw = 1.3, pd = 0.3;
    box(pd, h, pw, px, h / 2, 0, '#d9dde3');
    block(px - pd / 2, -pw / 2, px + pd / 2, pw / 2);
    const mapC = document.createElement('canvas');
    const mapTex = new THREE.CanvasTexture(mapC);
    mapTex.colorSpace = THREE.SRGBColorSpace;
    mapTex.anisotropy = 4;
    const mw = 1.4, mh = mw * ROUTE_MAP.h / ROUTE_MAP.w, my = 0.9 + mh / 2;
    for (const s of [-1, 1]) {
      box(0.04, mh + 0.08, mw + 0.08, px + s * (pd / 2 + 0.01), my, 0, '#5d6470'); // frame
      sign(mapTex, mw, mh, px + s * (pd / 2 + 0.035), my, 0, s < 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    setSignLang = (lang) => {
      drawRouteMap(mapC, { stops: loop.stops, index: loop.index, lang: lang || null });
      mapTex.needsUpdate = true;
    };
    setSignLang(null);
    routeMap = { x: px, z: 0, canvas: mapC, here: routeLayout(loop.stops)[loop.index] };
  }

  // LED board over the gates, facing the concourse.
  const ledC = document.createElement('canvas');
  ledC.width = 512; ledC.height = 64;
  const ledTex = new THREE.CanvasTexture(ledC);
  sign(ledTex, 4, 0.5, GATE_X - 0.42, 3.0, 0, -Math.PI / 2);
  let ledLast = '';
  const drawLed = (txt) => {
    if (txt === ledLast) return;
    ledLast = txt;
    const g = ledC.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#ffb21e'; g.font = '700 26px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 256, 33, 496);
    ledTex.needsUpdate = true;
  };

  // Trains: silver cars with a stripe in the line colour, clipped to the
  // platform so they appear out of the tunnel.
  const clip = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -(GATE_X)), new THREE.Plane(new THREE.Vector3(-1, 0, 0), w / 2)];
  const cm = (c) => new THREE.MeshLambertMaterial({ color: c, clippingPlanes: clip });
  const carL = 10, cars = 3, gap = 0.5, trainLen = cars * carL + (cars - 1) * gap;
  const body = cm('#d6dae0'), stripe = cm(line), win = cm('#33404f'), doorM = cm('#aeb4bd');
  const trains = TRACKS.map((tr) => {
    const g = new THREE.Group();
    for (let k = 0; k < cars; k++) {
      const cx = -k * (carL + gap);
      box(carL, 2.6, 2.7, cx, 0.6, 0, body, g);
      box(carL + 0.02, 0.25, 2.72, cx, 0.1, 0, stripe, g);
      for (const j of [-3, 0, 3]) box(1.6, 0.8, 2.74, cx + j, 1.15, 0, win, g);
      for (const j of [-1.5, 1.5]) box(1.3, 2.0, 2.76, cx + j, 0.5, 0, doorM, g);
    }
    g.rotation.y = tr.dir > 0 ? 0 : Math.PI; // the front leads the way
    g.position.set(0, -0.4, tr.z);
    g.visible = false;
    scene.add(g);
    // Where the front car stands so the train is centred on the platform.
    const stopX = platC + tr.dir * (trainLen / 2 - carL / 2);
    const runIn = platL + trainLen; // from out of sight to the stop
    return { g, tr, stopX, runIn };
  });

  const status = TRACKS.map(() => trainPhase(0));
  // Sounds: onSound(kind, track) for 'arrive', 'open', 'closing', 'depart'.
  // After a gap (the player was elsewhere) the phases resync silently.
  const hall = { onSound: null };
  const heard = TRACKS.map(() => null);
  let lastT = 0;
  const CLOSE_WARN = 1.6; // s before the doors shut
  function animate() {
    const now = Date.now() / 1000;
    const fresh = now - lastT < 0.5;
    lastT = now;
    let led = `${name.ko || ''}역 · ${name.en || ''} Station`;
    for (let t = 0; t < 2; t++) {
      const { g, tr, stopX, runIn } = trains[t];
      const ph = trainPhase(now, tr.offset);
      status[t] = ph;
      const was = heard[t];
      const key = ph.phase === 'open' && ph.left <= CLOSE_WARN ? 'closing' : ph.phase;
      heard[t] = key;
      if (fresh && was && was !== key && hall.onSound) hall.onSound({ in: 'arrive', open: 'open', closing: 'closing', out: 'depart' }[key], t);
      g.visible = true;
      if (ph.phase === 'in') g.position.x = stopX - tr.dir * runIn * (1 - ph.k) * (1 - ph.k);
      else if (ph.phase === 'open') g.position.x = stopX;
      else g.position.x = stopX + tr.dir * runIn * ph.k * ph.k;
      // Doors: open over 0.4 s, close in the last 0.4 s.
      const e = ph.phase === 'open' ? Math.min(1, (DOORS - ph.left) / 0.4, ph.left / 0.4) : 0;
      for (const dr of doors[t]) dr.pane.position.x = dr.x0 + dr.s * e * 0.95;
      if (ph.phase === 'in') led = t === 0 ? '상행 열차가 들어옵니다 · Up train arriving' : '하행 열차가 들어옵니다 · Down train arriving';
    }
    drawLed(led);
  }
  animate();

  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, stations: {}, room: ROOM,
    exit: { x: 1e4, z: 1e4 }, // no door: walk up the stairs
    animate, setSignLang,
    subway: Object.assign(hall, {
      stairs,
      vending,
      routeMap, // { x, z, canvas }: the route map pillar, or null
      // Track t: the doors are open now, and for how much longer (s).
      doorsOpen: (t) => (status[t].phase === 'open' && status[t].left > 0.3 ? status[t].left : 0),
      train: { get phase() { return status[0].phase; } },
    }),
  };
}


// ---------- Inside a train car ----------

export const CAR = { w: 18, d: 3.4, h: 3 };
export function buildTrainCar(store, ROOM) {
  const line = store.line || '#00a84d';
  const { w, d, h } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#15171b');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa1ab, 2.2));
  const colliders = [];
  const block = (x0, z0, x1, z1) => colliders.push({ p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  const box = (sx, sy, sz, x, y, z, c, parent = scene) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof c === 'string' ? mat(c) : c);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  box(w, 0.05, d, 0, -0.025, 0, '#8d939c'); // floor
  // Long bench seats along both sides, under the windows; doors between.
  const seats = [];
  for (const s of [-1, 1]) {
    for (const x0 of [-6.5, 0, 6.5]) {
      box(4.2, 0.4, 0.5, x0, 0.2, s * (d / 2 - 0.25), line);
      box(4.2, 0.6, 0.1, x0, 0.7, s * (d / 2 - 0.05), line);
      block(x0 - 2.1, s > 0 ? d / 2 - 0.5 : -d / 2, x0 + 2.1, s > 0 ? d / 2 : -d / 2 + 0.5);
      for (const k of [-1.5, -0.5, 0.5, 1.5]) seats.push({ x: x0 + k, z: s * (d / 2 - 0.3), ry: s > 0 ? Math.PI : 0, stand: [x0 + k, s * (d / 2 - 1.1)] });
      // Wall with windows onto the tunnel.
      box(4.2, 0.6, 0.06, x0, 1.0, s * (d / 2), '#d6dae0');
      box(4.2, 0.6, 0.06, x0, 2.5, s * (d / 2), '#d6dae0');
      box(4.2, 0.9, 0.04, x0, 1.75, s * (d / 2), '#202a36');
    }
    for (const x0 of [-3.25, 3.25]) box(1.6, 2.4, 0.06, x0, 1.2, s * (d / 2), '#aeb4bd'); // doors
    for (const x0 of [-3.25, 3.25]) box(0.05, 2.3, 0.05, x0, 1.15, s * 0.6, '#c9ced6'); // poles
  }
  for (const s of [-1, 1]) box(0.08, h, d, s * w / 2, h / 2, 0, '#d6dae0'); // car ends
  // Tunnel lights streaming past the windows while the train moves.
  const lights = [];
  for (let k = 0; k < 8; k++) for (const s of [-1, 1]) {
    lights.push(box(0.6, 0.12, 0.05, -w / 2 + k * (w / 8), 1.9, s * (d / 2 + 0.6), new THREE.MeshBasicMaterial({ color: '#ffd28a' })));
  }
  // The LED strip at both car ends: next stop.
  const ledC = document.createElement('canvas');
  ledC.width = 768; ledC.height = 64;
  const ledTex = new THREE.CanvasTexture(ledC);
  for (const s of [-1, 1]) {
    const m = signMesh(ledTex, 3, 0.25);
    m.position.set(s * (w / 2 - 0.05), 2.4, 0);
    m.rotation.y = -s * Math.PI / 2;
    scene.add(m);
  }
  const setLed = (txt) => {
    const g = ledC.getContext('2d');
    g.fillStyle = '#111'; g.fillRect(0, 0, 768, 64);
    g.fillStyle = '#ff5a3c'; g.font = '700 28px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 384, 33, 752);
    ledTex.needsUpdate = true;
  };
  setLed('');
  let moving = false;
  function animate(dt) {
    if (!moving) return;
    for (const l of lights) {
      l.position.x -= dt * 22;
      if (l.position.x < -w / 2) l.position.x += w;
    }
  }
  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, stations: {}, room: ROOM,
    exit: { x: 1e4, z: 1e4 }, animate,
    train: { setLed, setMoving: (m) => { moving = m; } },
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
