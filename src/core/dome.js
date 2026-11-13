// Modu Ballpark (모두야구장): the baseball stadium inside (its dome
// on the Songpa map is core/dome-outside.js). Loaded the first time someone
// walks in (main.js enterStore), so the street doesn't carry it. The
// league and its games are in core/ballgame.js; this file builds the bowl
// and plays the current game out on the field.
//
// A fictional stadium inspired by the dome planned for Jamsil (opening
// 2032). The game's own design, not the real building.
//
// The bowl is round: the field is a disc in the middle (below the
// concourse), ten rows of stands step up from it to the concourse you walk
// in on. Behind home plate (by the door) and in the home cheering section the
// seats are free to sit in; everywhere else simple drawn fans (one instanced
// mesh, coloured by team) fill the stands and jump up when their team hits.
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { matCache, canvasTex } from './three-kit.js';
import { ROOM_DOME, polar } from './dome-outside.js';
import { gameAt, boardAt, standings, rng, TEAMS, GAME_LEN, GAME_CYCLE, nextGameOf } from './ballgame.js';
import { COUNTER_H } from './counter-face.js';

const mat = matCache();
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

// ---- Layout (room metres; the field's centre is (0, 0), home plate is
// towards +z, by the door) -----------------------------------------------------
export const FIELD_Y = -7; // the field, below the concourse
export const FIELD_R = 36; // the outfield wall
export const ROWS = 10;
export const ROW_R0 = 37.6; // the front row's front edge
export const ROW_D = 1.35; // depth of a row
export const ROW_Y0 = -4.95; // the front row's height
export const RISE = 0.55; // one row up
export const CONC_R = ROW_R0 + ROWS * ROW_D; // where the concourse starts (51.1)
export const OUTER_R = 59.6; // the outer wall
const HOME = { x: 0, z: 24 };
const BASE = 13.7; // between bases (half the real 27.4 m, like the rest)
const S2 = Math.SQRT1_2;
export const BASES = [HOME, { x: BASE * S2, z: 24 - BASE * S2 }, { x: 0, z: 24 - 2 * BASE * S2 }, { x: -BASE * S2, z: 24 - BASE * S2 }];
const MOUND = { x: 0, z: 24 - 9.2 };
// Where the fielders stand (P, C, 1B, 2B, SS, 3B, LF, CF, RF).
const FIELDERS = [MOUND, { x: 0, z: 25.4 }, { x: 10.6, z: 11.6 }, { x: 5.2, z: 3.5 }, { x: -5.2, z: 3.5 }, { x: -10.6, z: 11.6 }, { x: -18, z: -12 }, { x: 0, z: -21 }, { x: 18, z: -12 }];
const UMPIRE = { x: 0, z: 26.5 };
// Angles round the bowl: θ = atan2(x, z), 0 behind home plate (the door).
const VISITOR = 0.36; // |θ| < this: the seats behind home plate, free to sit in
const SIDE_END = 2.35; // the 1st/3rd base sides end here; the outfield bleachers beyond
const STAGE_A = 1.12; // the cheering stages (home team at +θ, the 1st base side)
const CHEER_SEATS = [0.86, 1.04]; // free seats in the home cheering section, next to its stage
const faceCentre = (x, z) => Math.atan2(-x, -z); // a character at (x, z) looking at the field
export const rowY = (i) => ROW_Y0 + i * RISE;

// Floor height under (x, z): the concourse, a row of the stands (with a
// quick step up at its back edge), or the field.
export function domeFloor(x, z) {
  const r = Math.hypot(x, z);
  if (r >= CONC_R) return 0;
  if (r < ROW_R0) return FIELD_Y;
  const f = (r - ROW_R0) / ROW_D;
  const i = Math.min(ROWS - 1, Math.floor(f));
  const u = f - i;
  const step = i < ROWS - 1 && u > 0.8 ? (u - 0.8) / 0.2 : 0;
  return rowY(i) + RISE * step * step * (3 - 2 * step);
}

// Jerseys in the character palette (core/character.js) and the cap colour.
export const TEAM_LOOK = {
  herons: { shirt: 'sky', hatColor: 'denim' }, comets: { shirt: 'coral', hatColor: 'black' }, magpies: { shirt: 'cream', hatColor: 'black' },
  otters: { shirt: 'leaf', hatColor: 'olive' }, cats: { shirt: 'lilac', hatColor: 'butter' }, pigeons: { shirt: 'mint', hatColor: 'denim' },
  squirrels: { shirt: 'peach', hatColor: 'berry' }, deer: { shirt: 'butter', hatColor: 'black' },
};
const SKINS = ['light', 'fair', 'warm', 'tan', 'deep'];
const HAIRS = ['black', 'espresso', 'chestnut', 'black', 'espresso'];
const teamLook = (team, i) => ({ model: 'basic', ...TEAM_LOOK[team.id], pants: 'cream', hat: 'cap', skin: SKINS[i % 5], hair: HAIRS[(i * 3) % 5] });

const clamp01 = (u) => Math.max(0, Math.min(1, u));
const smooth = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };
const bump = (t, t0, t1) => (t <= t0 || t >= t1 ? 0 : Math.sin(((t - t0) / (t1 - t0)) * Math.PI));
const lerp = (a, b, u) => a + (b - a) * u;
const hashN = (n) => { let x = Math.imul(n | 0, 2654435761) >>> 0; x ^= x >>> 13; return x >>> 0; };

// ---- The drawn fans ---------------------------------------------------------
// Two planes per fan (a body tinted with the jersey colour, a head tinted
// with the skin), one InstancedMesh each. A little shader bit lifts them
// (per fan: a phase, and which team they cheer for) so a whole side can
// jump at once with no work on the CPU.
function dollTextures() {
  const body = canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineWidth = 6; g.strokeStyle = '#1b1820'; g.fillStyle = '#ffffff';
    g.beginPath(); // shoulders, torso and lap (sitting)
    g.moveTo(26, 40); g.quadraticCurveTo(64, 22, 102, 40); g.lineTo(110, 100); g.quadraticCurveTo(64, 116, 18, 100); g.closePath();
    g.fill(); g.stroke();
    g.beginPath(); g.moveTo(64, 34); g.lineTo(64, 60); g.stroke(); // the jersey's button line
    g.fillStyle = '#1b1820'; g.font = '800 30px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(String(7), 86, 84);
  });
  const head = canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineWidth = 6; g.strokeStyle = '#1b1820'; g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(64, 70, 46, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#3a302c'; // hair (darkened further by the skin tint)
    g.beginPath(); g.arc(64, 64, 46, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill();
    g.fillStyle = '#1b1820';
    g.beginPath(); g.arc(48, 78, 5, 0, Math.PI * 2); g.arc(80, 78, 5, 0, Math.PI * 2); g.fill();
    g.lineWidth = 4; g.beginPath(); g.arc(64, 90, 10, 0.2, Math.PI - 0.2); g.stroke();
  });
  return { body, head };
}
function dollMaterial(map, uniforms) {
  const m = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aDoll;\nuniform float uTime;\nuniform vec3 uCheer;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float amp = aDoll.y < 0.5 ? uCheer.x : (aDoll.y < 1.5 ? uCheer.y : uCheer.z);
        transformed.y += max(amp, 0.04) * abs(sin(uTime * 8.0 + aDoll.x)) * 0.32;`);
  };
  return m;
}

// ---- The stadium inside -------------------------------------------------------
export function buildDome(store, ROOM = ROOM_DOME, EXIT = { x: 0, z: ROOM.d / 2 - 0.9 }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0f1a2e');
  scene.add(new THREE.HemisphereLight(0xf4f8ff, 0x55606f, 1.7));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(10, 40, 20);
  scene.add(sun);
  const colliders = [];
  const block = (x, z, sx, sz, ry = 0) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    const pt = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
    colliders.push({ p: [pt(-sx / 2, -sz / 2), pt(sx / 2, -sz / 2), pt(sx / 2, sz / 2), pt(-sx / 2, sz / 2)] });
  };
  const box = (sx, sy, sz, x, y, z, color, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof color === 'string' ? mat(color) : color);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  };
  const flat = (geo, y, material) => { const m = new THREE.Mesh(geo.rotateX(-Math.PI / 2), material); m.position.y = y; scene.add(m); return m; };

  // The field: grass with mowing stripes, the dirt infield, lines and bases.
  const grass = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#3f9a45'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; g.fillRect((i * w) / 16, 0, w / 16, w); }
  });
  flat(new THREE.CircleGeometry(FIELD_R, 72), FIELD_Y, new THREE.MeshLambertMaterial({ map: grass }));
  flat(new THREE.RingGeometry(FIELD_R - 2.4, ROW_R0, 72), FIELD_Y + 0.01, mat('#b9814f')); // warning track
  const dirt = mat('#c48a55');
  // The infield dirt: a quarter disc round home, and a ring round the bases.
  const infield = new THREE.Mesh(new THREE.CircleGeometry(BASE * 1.55, 40, Math.PI / 4, Math.PI / 2).rotateX(-Math.PI / 2), dirt);
  infield.position.set(HOME.x, FIELD_Y + 0.02, HOME.z);
  scene.add(infield);
  const diamond = new THREE.Mesh(new THREE.PlaneGeometry(BASE * 0.78, BASE * 0.78).rotateX(-Math.PI / 2), mat('#3f9a45')); // the grass inside the diamond
  diamond.rotation.y = Math.PI / 4; diamond.position.set(0, FIELD_Y + 0.03, 24 - BASE * S2);
  scene.add(diamond);
  const moundM = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.9, 0.3, 24), dirt);
  moundM.position.set(MOUND.x, FIELD_Y + 0.12, MOUND.z);
  scene.add(moundM);
  box(0.6, 0.06, 0.15, MOUND.x, FIELD_Y + 0.29, MOUND.z, '#ffffff'); // the rubber
  for (let i = 1; i < 4; i++) box(0.6, 0.12, 0.6, BASES[i].x, FIELD_Y + 0.06, BASES[i].z, '#ffffff', Math.PI / 4);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 5), mat('#ffffff'));
  plate.position.set(HOME.x, FIELD_Y + 0.04, HOME.z); plate.rotation.y = Math.PI;
  scene.add(plate);
  for (const s of [-1, 1]) { // foul lines out to the wall, and a yellow pole at each end
    const len = 48.6;
    box(0.12, 0.02, len, HOME.x + (s * len * S2) / 2, FIELD_Y + 0.04, HOME.z - (len * S2) / 2, '#ffffff', -s * Math.PI / 4);
    box(0.25, 12, 0.25, HOME.x + s * len * S2, FIELD_Y + 6, HOME.z - len * S2, '#ffd23f');
  }
  // The wall round the field, padded, with the stands' front rail on top.
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(ROW_R0 - 0.15, ROW_R0 - 0.15, ROW_Y0 + 0.9 - FIELD_Y, 96, 1, true), new THREE.MeshLambertMaterial({ color: '#1f4f8f', side: THREE.DoubleSide }));
  wall.position.y = (ROW_Y0 + 0.9 + FIELD_Y) / 2;
  scene.add(wall);
  for (let i = 0; i < 64; i++) { // (you can't climb down onto the field)
    const a = (i / 64) * Math.PI * 2, p = polar(ROW_R0 - 0.1, a);
    block(p.x, p.z, 4.2, 0.5, a);
  }
  // Ads on the wall: our own fictional sponsors and the teams.
  const adTex = canvasTex(2048, 64, (g, w, h) => {
    const words = ['MODU SEOUL', '모두야구장', 'MODU BALLPARK', ...TEAMS.map((t) => t.name.en.toUpperCase())];
    let x = 0, i = 0;
    while (x < w) {
      const t = TEAMS[i % TEAMS.length];
      g.fillStyle = i % 3 === 0 ? '#1f4f8f' : t.color; g.fillRect(x, 0, 256, h);
      g.fillStyle = i % 3 === 0 ? '#ffffff' : t.trim; g.font = `800 26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(words[i % words.length], x + 128, h / 2);
      x += 256; i++;
    }
  }, { repeat: [-3, 1] }); // (mirrored: the strip is read from inside the ring, from the field side)
  const ads = new THREE.Mesh(new THREE.CylinderGeometry(ROW_R0 - 0.2, ROW_R0 - 0.2, 1.1, 96, 1, true), new THREE.MeshBasicMaterial({ map: adTex, side: THREE.BackSide }));
  ads.position.y = FIELD_Y + 1.1;
  scene.add(ads);

  // The stands: ten rows, each a flat ring and the step up behind it.
  for (let i = 0; i < ROWS; i++) {
    const r0 = ROW_R0 + i * ROW_D, y = rowY(i);
    flat(new THREE.RingGeometry(r0, r0 + ROW_D, 120), y, mat(i < 6 ? (i % 2 ? '#2b5fa8' : '#3069b8') : (i % 2 ? '#5c6f8f' : '#66799a')));
    const riser = new THREE.Mesh(new THREE.CylinderGeometry(r0 + ROW_D, r0 + ROW_D, i < ROWS - 1 ? RISE : 0.01, 120, 1, true), new THREE.MeshLambertMaterial({ color: '#1d2a40', side: THREE.BackSide })); // (seen from the field side only, so a camera behind it sees through)
    riser.position.y = y + RISE / 2;
    scene.add(riser);
    const front = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, y - FIELD_Y, 120, 1, true), new THREE.MeshLambertMaterial({ color: '#16213a', side: THREE.BackSide }));
    front.position.y = (y + FIELD_Y) / 2; // (fills under the row, seen through the gaps)
    if (i === 0) scene.add(front);
  }
  // The concourse, the outer wall and the dome over it all.
  flat(new THREE.RingGeometry(CONC_R, ROOM.w * 0.75, 120), 0, mat('#d9dde3'));
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(OUTER_R + 0.3, OUTER_R + 0.3, 7, 120, 1, true), new THREE.MeshLambertMaterial({ color: '#e9edf2', side: THREE.BackSide }));
  outer.position.y = 3.5;
  scene.add(outer);
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2, p = polar(OUTER_R + 0.5, a);
    block(p.x, p.z, 4.4, 0.8, a);
  }
  const domeTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#eef2f7'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,100,130,0.35)'; g.lineWidth = 3;
    for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo((i * w) / 16, 0); g.lineTo((i * w) / 16, h); g.stroke(); }
    for (let j = 0; j <= 6; j++) { g.beginPath(); g.moveTo(0, (j * h) / 6); g.lineTo(w, (j * h) / 6); g.stroke(); }
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(OUTER_R + 0.3, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: domeTex, side: THREE.BackSide, color: '#c9d3e2' }));
  dome.scale.y = 0.42;
  dome.position.y = 7;
  scene.add(dome);
  for (let i = 0; i < 12; i++) { // light rings hanging under the roof
    const a = (i / 12) * Math.PI * 2, p = polar(30, a);
    box(5, 0.4, 1.2, p.x, 26, p.z, new THREE.MeshBasicMaterial({ color: '#fffbe8' }), a);
  }

  // Free seats (behind home plate, and next to the home cheering stage).
  const seats = [];
  const seatSpots = [];
  for (let i = 0; i < ROWS; i++) {
    const r = ROW_R0 + i * ROW_D + ROW_D * 0.42, y = rowY(i);
    const step = 0.95 / r;
    const add = (a) => { const p = polar(r, a); seatSpots.push({ x: p.x, z: p.z, y, a, i }); };
    for (let a = -VISITOR + step / 2; a < VISITOR; a += step) if (Math.abs(a) > 0.03) add(a); // (an aisle down the middle, from the door)
    if (i >= 2) for (let a = CHEER_SEATS[0]; a < CHEER_SEATS[1]; a += step) add(a);
  }
  const seatGeo = new THREE.BoxGeometry(0.5, 0.36, 0.45).translate(0, 0.18, 0);
  const backGeo = new THREE.BoxGeometry(0.5, 0.45, 0.08).translate(0, 0.5, -0.24); // (the field is at +z)
  for (const [geo, color] of [[seatGeo, '#e8eef6'], [backGeo, '#e8eef6']]) {
    const im = new THREE.InstancedMesh(geo, mat(color), seatSpots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    seatSpots.forEach((s, k) => im.setMatrixAt(k, m4.compose(new THREE.Vector3(s.x, s.y, s.z), q.setFromAxisAngle(up, faceCentre(s.x, s.z)), one)));
    scene.add(im);
  }
  for (const s of seatSpots) {
    const ry = faceCentre(s.x, s.z);
    const st = polar(Math.hypot(s.x, s.z) + 0.55, s.a);
    seats.push({ x: s.x, y: s.y + 0.02, z: s.z, ry, stand: [st.x, st.z], standY: domeFloor(st.x, st.z), dome: true });
  }
  // People already in the free seats (main.js seats them: stations.patrons).
  const r0 = rng(77);
  const patrons = [];
  const taken = new Set();
  while (patrons.length < 16) {
    const k = Math.floor(r0() * seats.length);
    if (taken.has(k)) continue;
    taken.add(k);
    const s = seats[k];
    patrons.push({ x: s.x, y: s.y, z: s.z, ry: s.ry, sit: true, seat: k });
  }
  for (const k of taken) seats[k].taken = true;
  const freeSeats = seats.filter((s) => !s.taken);

  // The cheering stages: one per side, each a small raised platform at the
  // front of the stands. The home side has a cheer leader and two cheer
  // dancers, the away side its cheer leader (main.js adds them).
  const squad = [];
  for (const side of [1, -1]) {
    const a = side * STAGE_A, p = polar(ROW_R0 + 1.2, a);
    const top = rowY(1) + 0.6;
    box(4.2, top - FIELD_Y, 2.4, p.x, (top + FIELD_Y) / 2, p.z, '#f4f6fa', a);
    box(4.4, 0.12, 2.6, p.x, top, p.z, side > 0 ? '#e5383b' : '#1f4f8f', a);
    block(p.x, p.z, 4.4, 2.6, a);
    const out = a + Math.PI; // facing the fans (away from the field)
    const spots = side > 0 ? [[0, 'leader'], [-1.3, 'dancer'], [1.3, 'dancer']] : [[0, 'leader']];
    for (const [off, role] of spots) {
      const q = polar(ROW_R0 + 1.4, a + off / (ROW_R0 + 1.4));
      squad.push({ x: q.x, y: top + 0.06, z: q.z, ry: faceCentre(q.x, q.z) + Math.PI, role, side: side > 0 ? 'home' : 'away', out });
    }
  }

  // The drawn fans in every other seat of the stands.
  const tex = dollTextures();
  const uniforms = { uTime: { value: 0 }, uCheer: { value: new THREE.Vector3() } };
  const fans = [];
  const r1 = rng(2032);
  for (let i = 0; i < ROWS; i++) {
    const r = ROW_R0 + i * ROW_D + ROW_D * 0.45, y = rowY(i);
    const step = 1.0 / r;
    for (let a = 0; a < Math.PI * 2; a += step) {
      const th = a > Math.PI ? a - Math.PI * 2 : a;
      const abs = Math.abs(th);
      if (abs < VISITOR + 0.02) continue; // the free seats behind home plate
      if (i >= 2 && th > CHEER_SEATS[0] - 0.02 && th < CHEER_SEATS[1] + 0.02) continue; // the free cheering seats
      if (i < 3 && Math.abs(abs - STAGE_A) < 0.075) continue; // the stages
      if (r1() < 0.06) continue; // a few empty seats
      const side = abs > SIDE_END ? 2 : th > 0 ? 0 : 1; // 0 home (1st base side), 1 away, 2 the bleachers (anyone)
      const p = polar(r, th);
      fans.push({ x: p.x, y, z: p.z, side, phase: r1() * Math.PI * 2, skin: Math.floor(r1() * 5), pick: Math.floor(r1() * 8) });
    }
  }
  const SKIN_HEX = ['#ffe6d2', '#ffd9bd', '#e8b48f', '#c98e66', '#8d5b3f'];
  const dollGeo = (w, h, y0) => {
    const g = new THREE.PlaneGeometry(w, h).translate(0, y0 + h / 2, 0);
    g.setAttribute('aDoll', new THREE.InstancedBufferAttribute(new Float32Array(fans.flatMap((f) => [f.phase, f.side])), 2));
    return g;
  };
  const bodies = new THREE.InstancedMesh(dollGeo(0.72, 0.72, 0.05), dollMaterial(tex.body, uniforms), fans.length);
  const heads = new THREE.InstancedMesh(dollGeo(0.62, 0.62, 0.62), dollMaterial(tex.head, uniforms), fans.length);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
    fans.forEach((f, k) => {
      m4.compose(new THREE.Vector3(f.x, f.y, f.z), q.setFromAxisAngle(up, faceCentre(f.x, f.z)), one); // (the plane's front faces the field)
      bodies.setMatrixAt(k, m4);
      heads.setMatrixAt(k, m4);
      heads.setColorAt(k, c.set(SKIN_HEX[f.skin]));
      bodies.setColorAt(k, c.set('#ffffff'));
    });
  }
  bodies.frustumCulled = heads.frustumCulled = false; // (they fill the whole bowl)
  scene.add(bodies, heads);
  // Jerseys for the game being played: the home side wears the home team's
  // colour, the away side the visitors', the bleachers any team's.
  let dressedFor = null;
  const dressFans = (home, away) => {
    const c = new THREE.Color();
    fans.forEach((f, k) => bodies.setColorAt(k, c.set(f.side === 0 ? home.color : f.side === 1 ? away.color : TEAMS[f.pick].color)));
    bodies.instanceColor.needsUpdate = true;
  };

  // ---- The food stand on the concourse (chicken and cola) ----
  const fa = 0.3, fp = polar(57.4, fa), fry = faceCentre(fp.x, fp.z);
  box(6.4, COUNTER_H - 0.04, 1.0, fp.x, (COUNTER_H - 0.04) / 2, fp.z, '#f5efe4', fry); // (COUNTER_H: the seller's face shows, core/counter-face.js)
  box(6.6, 0.08, 1.1, fp.x, COUNTER_H, fp.z, '#e5383b', fry);
  const back = polar(59.0, fa);
  box(6.8, 3.2, 0.4, back.x, 1.6, back.z, '#fff3e0', fry);
  const foodSign = canvasTex(1024, 192, (g, w, h) => {
    g.fillStyle = '#e5383b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 82px ${FONT}`; g.fillText('치킨 · 콜라 · 떡볶이', w / 2, 70);
    g.font = '800 46px system-ui, sans-serif'; g.fillText('CHICKEN · COLA · TTEOKBOKKI', w / 2, 150);
  });
  const fs = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.2), new THREE.MeshBasicMaterial({ map: foodSign }));
  const fsp = polar(58.75, fa);
  fs.position.set(fsp.x, 2.6, fsp.z); fs.rotation.y = fry;
  scene.add(fs);
  block(fp.x, fp.z, 7, 3.4, fry);
  const clerkP = polar(58.3, fa + 0.02);
  const clerk = { x: clerkP.x, z: clerkP.z, ry: fry };
  const products = [];
  const menu = store.products || [];
  menu.forEach((product, i) => {
    const a = fa + (i - (menu.length - 1) / 2) * (1.3 / 57.4);
    const p = polar(57.3, a), stand = polar(55.6, a);
    const g = new THREE.Group();
    g.position.set(p.x, COUNTER_H + 0.04, p.z);
    g.rotation.y = fry;
    const item = product.model === 'cup'
      ? new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.32, 14).translate(0, 0.16, 0), mat(product.color || '#b5381f'))
      : new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.32).translate(0, 0.09, 0), mat(product.color || '#d98a2b'));
    g.add(item);
    scene.add(g);
    products.push({ product, mesh: g, pos: new THREE.Vector3(stand.x, 0, stand.z) });
  });

  // A note by the door: this stadium is the game's (the real dome opens in 2032).
  const noteTex = canvasTex(1024, 300, (g, w, h) => {
    g.fillStyle = '#1f4f8f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 64px ${FONT}`; g.fillText('모두야구장 · MODU BALLPARK', w / 2, 62);
    g.font = `700 34px ${FONT}`;
    g.fillText('지금 이곳에는 이런 구장이 영업하지 않아요. 방문 전 확인하세요.', w / 2, 150);
    g.fillText('No stadium like this is open here yet. Please check before you visit.', w / 2, 212);
    g.font = '600 26px system-ui, sans-serif'; g.fillStyle = '#cfe0ff';
    g.fillText('A game stadium · teams and players are fictional', w / 2, 268);
  });
  const notep = polar(OUTER_R - 0.1, -0.12);
  const note = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.76), new THREE.MeshBasicMaterial({ map: noteTex }));
  note.position.set(notep.x, 2.0, notep.z); note.rotation.y = faceCentre(notep.x, notep.z);
  scene.add(note);

  // ---- The scoreboard over the center-field bleachers ----
  const BW = 1024, BH = 512;
  const boardC = document.createElement('canvas');
  boardC.width = BW; boardC.height = BH;
  const bg = boardC.getContext('2d');
  const boardTex = new THREE.CanvasTexture(boardC);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  const bp = polar(55, Math.PI);
  box(32, 17, 1, bp.x, 9.5, bp.z - 0.6, '#1b1f27');
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), new THREE.MeshBasicMaterial({ map: boardTex }));
  screen.position.set(bp.x, 9.5, bp.z);
  scene.add(screen);
  // A second, smaller screen above the door, facing the outfield fans.
  const screen2 = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: boardTex }));
  screen2.position.set(0, 5.1, OUTER_R - 0.2); screen2.rotation.y = Math.PI;
  scene.add(screen2);

  // ---- The players on the field (made when a team first plays) ----
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat('#ffffff'));
  ball.visible = false;
  scene.add(ball);
  const umpire = createCharacter({ model: 'basic', shirt: 'cream', pants: 'navy', hat: 'cap', hatColor: 'black', skin: 'warm', hair: 'black' });
  umpire.root.position.set(UMPIRE.x, FIELD_Y, UMPIRE.z);
  umpire.root.rotation.y = Math.PI;
  scene.add(umpire.root);
  const squads = new Map(); // team id → { fielders[9], batter, runners[3] }
  const teamSquad = (team) => {
    let s = squads.get(team.id);
    if (s) return s;
    const make = (i) => { const c = createCharacter(teamLook(team, i)); c.root.visible = false; scene.add(c.root); return c; };
    s = { fielders: FIELDERS.map((_, i) => make(i)), batter: make(9), runners: [make(10), make(11), make(12)] };
    s.batter.setHeld?.('bat');
    squads.set(team.id, s);
    return s;
  };
  const dropSquads = (keep) => {
    for (const [id, s] of squads) {
      if (keep.includes(id)) continue;
      for (const c of [...s.fielders, s.batter, ...s.runners]) scene.remove(c.root);
      squads.delete(id);
    }
  };

  // Fireworks for a home run: a few bursts over the outfield.
  const BURST = 70;
  const bursts = Array.from({ length: 5 }, () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BURST * 3), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.6, transparent: true, depthWrite: false }));
    pts.visible = false;
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, v: new Float32Array(BURST * 3), t: 0, life: 0 };
  });
  let burstNext = 0;
  const firework = (x, y, z, color) => {
    const b = bursts[burstNext++ % bursts.length];
    const pos = b.pts.geometry.attributes.position.array;
    for (let i = 0; i < BURST; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), sp = 5 + Math.random() * 3;
      b.v.set([s * Math.cos(th) * sp, u * sp + 2, s * Math.sin(th) * sp], i * 3);
      pos.set([x, y, z], i * 3);
    }
    b.pts.material.color.set(color);
    b.pts.visible = true;
    b.t = 0; b.life = 1.8;
  };

  // ---- Playing the game out ----
  // Each play in core/ballgame.js lasts `dur` seconds; within it: the
  // pitch, the swing, where the ball goes and the runners.
  const T_PITCH = 0.85, T_CONTACT = 1.27;
  const ev = { onCheer: null, onChant: null, onPlay: null }; // main.js: crowd sounds, the cheer leader
  let shown = null; // the play whose start we have handled
  let plan = null; // the current play's ball flight, runners and fielder
  const flightOf = (play, r) => {
    const res = play.res;
    const pickOf = (list) => list[Math.floor(r() * list.length)];
    if (res === 'K' || res === 'BB') return { to: { x: 0, z: 25.2 }, T: 0.01, H: 0, y1: 0.6, ground: false, catcher: true };
    if (res === 'GO') { const f = pickOf([2, 3, 4, 5]); return { to: FIELDERS[f], T: 0.9, H: 0.2, y1: 0.3, ground: true, fielder: f }; }
    if (res === 'FO') { const f = pickOf([6, 7, 8]); return { to: FIELDERS[f], T: 2.5, H: 13, y1: 1.2, fielder: f }; }
    if (res === 'HR') { const a = Math.PI + (r() - 0.5) * 1.6; const p = polar(ROW_R0 + 2 + r() * 6, a); return { to: p, T: 3.4, H: 19, y1: rowY(3) - FIELD_Y + 0.8, hr: true }; }
    const deep = res === '1B' ? 20 + r() * 6 : res === '2B' ? 29 + r() * 4 : 32;
    const a = Math.PI + (r() - 0.5) * (res === '3B' ? 2.0 : 1.4);
    const p = polar(deep, a);
    const near = [6, 7, 8].reduce((b, f) => (Math.hypot(FIELDERS[f].x - p.x, FIELDERS[f].z - p.z) < Math.hypot(FIELDERS[b].x - p.x, FIELDERS[b].z - p.z) ? f : b), 6);
    return { to: p, T: res === '1B' ? 1.3 : 1.8, H: res === '1B' ? 2.5 : 5, y1: 0.2, fielder: near, chase: true };
  };
  // Runner moves for a play: [from base, to base] (4 = home, scored).
  const movesOf = (res, bases) => {
    const out = [];
    if (res === 'BB') {
      out.push([0, 1]);
      if (bases[0]) { out.push([1, 2]); if (bases[1]) { out.push([2, 3]); if (bases[2]) out.push([3, 4]); } }
      for (let b = 1; b <= 3; b++) if (bases[b - 1] && !out.some((m) => m[0] === b)) out.push([b, b]);
      return out;
    }
    const n = { '1B': 1, '2B': 2, '3B': 3, HR: 4 }[res] || 0;
    for (let b = 3; b >= 1; b--) if (bases[b - 1]) out.push([b, n ? Math.min(4, b + n) : b]);
    out.push([0, n ? Math.min(4, n) : res === 'GO' ? 1 : 0]);
    return out;
  };
  const basePos = (b) => BASES[b % 4];
  // Along the base path from base b0 to b1 at u in 0..1.
  const pathAt = (b0, b1, u) => {
    if (b1 <= b0) return { ...basePos(b0), dir: 0 };
    const legs = b1 - b0, f = u * legs, i = Math.min(legs - 1, Math.floor(f)), w = f - i;
    const a = basePos(b0 + i), b = basePos(b0 + i + 1);
    return { x: lerp(a.x, b.x, w), z: lerp(a.z, b.z, w), dir: Math.atan2(b.x - a.x, b.z - a.z) };
  };

  const pitcherPose = (t) => {
    const up = smooth((t - 0.2) / 0.5), thr = smooth((t - 0.7) / 0.18), rest = smooth((t - 1.3) / 0.4);
    return { armR: [(1.3 * up - 3.2 * thr) * (1 - rest), 0.3 * (1 - thr), 0], foreR: [-0.6 * up * (1 - rest), 0, 0], armL: [-0.9 * up * (1 - rest), -0.3, 0], legL: [-0.9 * bump(t, 0.25, 0.9), 0, 0], kneeL: [0.9 * bump(t, 0.25, 0.9), 0, 0], spine: [0.35 * bump(t, 0.6, 1.2), 0, 0] };
  };
  const batterPose = (t, swing) => {
    const s = swing ? smooth((t - (T_CONTACT - 0.18)) / 0.3) : 0;
    const done = swing ? smooth((t - T_CONTACT - 0.5) / 0.4) : 0;
    return { armR: [-1.7 + 1.1 * s * (1 - done), 0.4 - 1.4 * s, 0], foreR: [-0.9 + 0.6 * s, 0, 0], armL: [-1.6 + 1.0 * s * (1 - done), -0.2 - 1.2 * s, 0], foreL: [-0.9 + 0.6 * s, 0, 0], spine: [0.15, -0.9 * s, 0], kneeL: [0.25, 0, 0], kneeR: [0.25, 0, 0] };
  };

  const startPlay = (st, play) => {
    const { game } = st;
    const bat = play.bat, field = bat === game.home ? game.away : game.home;
    const b = boardAt(st);
    const r = rng(hashN(game.k * 997 + game.plays.indexOf(play)));
    plan = { play, bat: teamSquad(bat), field: teamSquad(field), flight: flightOf(play, r), moves: movesOf(play.res, b.bases), cheered: false, crack: false, batTeam: bat, fieldTeam: field };
    // Hide the other team's players (and anyone left over from before).
    for (const s of squads.values()) for (const c of [...s.fielders, s.batter, ...s.runners]) c.root.visible = false;
    plan.field.fielders.forEach((c, i) => {
      c.root.visible = true;
      c.root.position.set(FIELDERS[i].x, FIELD_Y, FIELDERS[i].z);
      c.root.rotation.y = i === 1 ? Math.PI : Math.atan2(HOME.x - FIELDERS[i].x, HOME.z - FIELDERS[i].z);
      c.setMoves?.(null);
    });
    const pl = plan;
    pl.field.fielders[0].setMoves?.(() => pitcherPose(pl.tau || 0));
    const bt = plan.bat.batter;
    bt.root.visible = true;
    bt.root.position.set(HOME.x - 0.9, FIELD_Y, HOME.z);
    bt.root.rotation.y = Math.PI / 2; // side-on to the pitcher (a right-handed batter)
    const swing = play.res !== 'BB';
    bt.setMoves?.(() => (pl.running ? null : batterPose(pl.tau || 0, swing)));
    let ri = 0;
    plan.runners = plan.moves.filter((m) => m[0] > 0).map((m) => {
      const c = plan.bat.runners[ri++];
      c.root.visible = true;
      const p = basePos(m[0]);
      c.root.position.set(p.x, FIELD_Y, p.z);
      return { c, m };
    });
    plan.batterMove = plan.moves.find((m) => m[0] === 0);
    ev.onPlay?.(play, bat);
  };

  const RUN_LEG = 1.9; // s per base
  const stepPlay = (dt, st) => {
    const play = st.play;
    const tau = st.p * play.dur;
    plan.tau = tau;
    const f = plan.flight;
    const ff = plan.field.fielders;
    const swing = play.res !== 'BB';
    // The ball: from the pitcher's hand to the plate, then wherever it goes.
    if (tau < T_PITCH) ball.visible = false;
    else if (tau < T_CONTACT) {
      const u = (tau - T_PITCH) / (T_CONTACT - T_PITCH);
      ball.visible = true;
      ball.position.set(lerp(MOUND.x + 0.2, HOME.x, u), FIELD_Y + lerp(1.3, 0.75, u), lerp(MOUND.z + 0.5, HOME.z, u));
    } else {
      if (!plan.crack && swing && !f.catcher) { plan.crack = true; ev.onCheer?.('crack', plan.batTeam); }
      // A home run flies slowly (time for a photo).
      const T = f.T;
      const u = clamp01((tau - T_CONTACT) / Math.max(0.01, T));
      if (f.catcher) {
        ball.visible = tau < T_CONTACT + 0.3;
        ball.position.set(0, FIELD_Y + 0.6, lerp(HOME.z, 25.2, clamp01((tau - T_CONTACT) / 0.15)));
      } else if (u < 1) {
        ball.visible = true;
        const y = lerp(0.9, f.y1, u) + (f.ground ? Math.abs(Math.sin(u * Math.PI * 3)) * 0.5 * (1 - u) : 4 * f.H * u * (1 - u));
        ball.position.set(lerp(HOME.x, f.to.x, u), FIELD_Y + y, lerp(HOME.z, f.to.z, u));
      } else {
        ball.visible = !f.hr && tau < T_CONTACT + T + 0.8;
        if (f.chase && ball.visible) ball.position.lerp(new THREE.Vector3(f.to.x, FIELD_Y + 0.15, f.to.z), 0.05);
      }
      // The crowd: cheers for a hit, "aww" for an out; fireworks for a home run.
      if (!plan.cheered && (u >= 1 || f.catcher)) {
        plan.cheered = true;
        ev.onCheer?.(play.res, plan.batTeam);
        if (f.hr) for (let i = 0; i < 4; i++) setTimeout(() => { const p = polar(30 + Math.random() * 8, Math.PI + (Math.random() - 0.5) * 2); firework(p.x, 14 + Math.random() * 6, p.z, [plan?.batTeam.color || '#ffd23f', '#ffffff', '#ffd23f', '#ff6b9a'][i]); }, i * 380);
      }
      // A fielder goes for the ball.
      if (f.fielder != null && f.fielder >= 2) {
        const c = ff[f.fielder], home = FIELDERS[f.fielder];
        const go = clamp01((tau - T_CONTACT) / Math.max(0.4, f.T));
        const tx = f.chase ? lerp(home.x, f.to.x, 0.85) : f.to.x, tz = f.chase ? lerp(home.z, f.to.z, 0.85) : f.to.z;
        c.root.position.set(lerp(home.x, tx, smooth(go)), FIELD_Y, lerp(home.z, tz, smooth(go)));
        c.animate(dt, go > 0 && go < 1 ? 0.8 : 0);
      }
    }
    // The runners (and the batter, once the ball is in play or ball four).
    const runFrom = play.res === 'BB' ? T_CONTACT + 0.4 : T_CONTACT + 0.15;
    const leg = play.res === 'HR' ? RUN_LEG * 1.15 : RUN_LEG;
    const moveOne = (c, m) => {
      const legs = Math.max(0, m[1] - m[0]);
      if (!legs) { c.animate(dt, 0); return; }
      const u = clamp01((tau - runFrom) / (legs * leg));
      const p = pathAt(m[0], m[1], u);
      c.root.position.set(p.x, FIELD_Y, p.z);
      if (u > 0 && u < 1) c.root.rotation.y = p.dir;
      c.root.visible = !(m[1] === 4 && u >= 1);
      c.animate(dt, u > 0 && u < 1 ? (play.res === 'HR' ? 0.6 : 0.85) : 0);
    };
    for (const r of plan.runners) moveOne(r.c, r.m);
    const bt = plan.bat.batter;
    if (tau > runFrom && plan.batterMove[1] > 0) {
      if (!plan.running) { plan.running = true; bt.setMoves?.(null); bt.setHeld?.(null); }
      moveOne(bt, plan.batterMove);
    } else bt.animate(dt, 0);
    // Everyone else just stands there, ready.
    ff.forEach((c, i) => { if (i !== f.fielder) c.animate(dt, 0); });
  };
  const endPlay = () => {
    if (!plan) return;
    plan.bat.batter.setMoves?.(null);
    plan.field.fielders[0].setMoves?.(null);
    plan.bat.batter.setHeld?.('bat');
    plan.running = false;
    plan = null;
  };

  // ---- The board ----
  const drawLine = (g, team, line, y, total, hits) => {
    g.fillStyle = team.color; g.fillRect(24, y - 26, 12, 52);
    g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.font = `800 34px ${FONT}`;
    g.fillText(team.name.ko, 48, y - 6);
    g.font = '700 20px system-ui, sans-serif'; g.fillStyle = '#b8c4d8'; g.fillText(team.name.en, 48, y + 20);
    g.font = '800 34px system-ui, sans-serif'; g.textAlign = 'center';
    for (let i = 0; i < 12; i++) { g.fillStyle = '#ffffff'; const v = line[i]; if (v != null) g.fillText(String(v), 330 + i * 40, y + 6); }
    g.fillStyle = '#ffd23f'; g.fillText(String(total), 850, y + 6);
    g.fillStyle = '#ffffff'; g.fillText(String(hits), 915, y + 6);
  };
  let flash = null; // { text, color, until }
  const drawBoard = (st, now) => {
    const g = bg;
    g.fillStyle = '#0d1118'; g.fillRect(0, 0, BW, BH);
    const { game, phase } = st;
    g.textBaseline = 'middle';
    if (phase === 'break') {
      // Between games: the next game, a countdown, and the league table.
      const nxt = gameAt((st.k + 1) * GAME_CYCLE + 1).game;
      g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.font = `900 40px ${FONT}`;
      g.fillText('NEXT GAME · 다음 경기', BW / 2, 44);
      g.font = `900 46px ${FONT}`;
      g.fillStyle = nxt.away.color; g.textAlign = 'right'; g.fillText(nxt.away.name.ko, BW / 2 - 40, 104);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.fillText('vs', BW / 2, 104);
      g.fillStyle = nxt.home.color; g.textAlign = 'left'; g.fillText(nxt.home.name.ko, BW / 2 + 40, 104);
      const sec = Math.max(0, Math.ceil(st.next));
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = '800 34px system-ui, sans-serif';
      g.fillText(`Starts in ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}  ·  Last: ${game.away.short} ${game.score[0]} - ${game.score[1]} ${game.home.short}`, BW / 2, 156);
      const rows = standings(st.k + 1);
      g.font = '700 22px system-ui, sans-serif'; g.fillStyle = '#8fa2c0';
      g.textAlign = 'left'; g.fillText('LEAGUE TABLE (last 28 games)', 80, 200); g.textAlign = 'right'; g.fillText('W   L   D', 940, 200);
      rows.forEach((row, i) => {
        const y = 236 + i * 33;
        g.fillStyle = row.team.color; g.fillRect(80, y - 13, 10, 26);
        g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.font = `800 25px ${FONT}`;
        g.fillText(`${i + 1}. ${row.team.name.ko}  ${row.team.name.en}`, 104, y);
        g.textAlign = 'right'; g.fillText(`${row.w}   ${row.l}   ${row.d}`, 940, y);
      });
      return;
    }
    const b = boardAt(st);
    const upto = (side) => {
      const line = [];
      let r = 0, h = 0;
      const limit = phase === 'play' ? game.plays.indexOf(st.play) : phase === 'intro' ? 0 : game.plays.indexOf(st.last) + 1;
      for (let i = 0; i < limit; i++) {
        const p = game.plays[i];
        if ((p.top ? 0 : 1) !== side) continue;
        line[p.inning - 1] = (line[p.inning - 1] || 0) + p.runs;
        r += p.runs; if (['1B', '2B', '3B', 'HR'].includes(p.res)) h++;
      }
      return { line, r, h };
    };
    const A = upto(0), H = upto(1);
    g.font = '700 22px system-ui, sans-serif'; g.fillStyle = '#8fa2c0'; g.textAlign = 'center';
    const innings = Math.max(9, game.lines[0].length);
    for (let i = 0; i < innings; i++) g.fillText(String(i + 1), 330 + i * 40, 30);
    g.fillText('R', 850, 30); g.fillText('H', 915, 30);
    drawLine(g, game.away, A.line, 82, A.r, A.h);
    drawLine(g, game.home, H.line, 152, H.r, H.h);
    // Inning, outs and the bases.
    g.fillStyle = '#ffffff'; g.font = '800 34px system-ui, sans-serif'; g.textAlign = 'left';
    g.fillText(`${b.top ? '▲' : '▼'} ${b.inning}${['', 'st', 'nd', 'rd'][b.inning] || 'th'}`, 40, 236);
    g.fillText('OUT', 40, 288);
    for (let i = 0; i < 2; i++) { g.fillStyle = i < b.outs ? '#ff5a4f' : '#333a46'; g.beginPath(); g.arc(150 + i * 36, 288, 13, 0, Math.PI * 2); g.fill(); }
    const dx = 300, dy = 262;
    [[1, 26, 0], [2, 0, -26], [3, -26, 0]].forEach(([n, ox, oy]) => {
      g.save(); g.translate(dx + ox, dy + oy); g.rotate(Math.PI / 4);
      g.fillStyle = b.bases[n - 1] ? '#ffd23f' : '#333a46'; g.fillRect(-12, -12, 24, 24); g.restore();
    });
    // Who is batting.
    const play = st.play;
    if (play) {
      const p = play.batter;
      g.fillStyle = play.bat.color; g.fillRect(420, 214, 8, 90);
      g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.font = `800 40px ${FONT}`;
      g.fillText(`${p.no}  ${p.ko}`, 444, 244);
      g.font = '700 26px system-ui, sans-serif'; g.fillStyle = '#b8c4d8';
      g.fillText(`${p.en} · ${p.pos} · ${play.bat.name.en}`, 444, 284);
    } else if (phase === 'intro') {
      g.fillStyle = '#ffd23f'; g.textAlign = 'left'; g.font = '900 52px system-ui, sans-serif';
      g.fillText('PLAY BALL!', 444, 260);
    }
    // The big moment (HOME RUN!, STRIKE OUT…) along the bottom.
    let msg = null;
    if (flash && now < flash.until) msg = flash;
    else if (phase === 'final') {
      const w = game.winner;
      msg = { text: w ? `GAME SET · ${w.name.en} win!` : 'GAME SET · a tie after 12', color: w ? w.color : '#ffffff' };
    } else if (phase === 'change' && st.last?.change) msg = { text: 'CHANGE · 공수 교대', color: '#ffffff' };
    if (msg) {
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 330, BW, 182);
      g.textAlign = 'center'; g.font = `900 ${msg.text.length > 18 ? 58 : 92}px ${FONT}`;
      g.fillStyle = msg.color; g.fillText(msg.text, BW / 2 + 4, 424);
      g.fillStyle = '#ffffff'; g.fillText(msg.text, BW / 2, 420);
    } else {
      g.textAlign = 'center'; g.font = `700 30px ${FONT}`; g.fillStyle = '#56637a';
      g.fillText('모두야구장 · MODU BALLPARK', BW / 2, 430);
    }
  };
  const FLASH = { K: ['STRIKE OUT!', '#ffffff'], GO: ['OUT', '#b8c4d8'], FO: ['OUT', '#b8c4d8'], BB: ['BALL FOUR', '#9fe0a0'], '1B': ['HIT!', '#ffd23f'], '2B': ['DOUBLE!', '#ffd23f'], '3B': ['TRIPLE!', '#ffd23f'], HR: ['HOME RUN!', '#ff6b9a'] };

  // Cheering: how hard each side of the stands is jumping (decays).
  const cheer = { home: 0, away: 0, all: 0 };
  let chantAt = 0;
  let t = 0, boardTimer = 0;
  const clock = () => Date.now() / 1000;
  const animate = (dt) => {
    t += dt;
    const now = clock();
    const st = gameAt(now);
    const { game } = st;
    if (dressedFor !== game.k) { dressedFor = game.k; dressFans(game.home, game.away); dropSquads([game.home.id, game.away.id]); }
    // Plays.
    if (st.phase === 'play') {
      if (shown !== st.play) { endPlay(); shown = st.play; startPlay(st, st.play); }
      stepPlay(dt, st);
      const res = st.play.res, tau = st.p * st.play.dur;
      if (tau > T_CONTACT + (res === 'HR' ? 3.4 : res === 'FO' ? 2.5 : 1.0) && !(flash && flash.play === st.play)) {
        const [text, color] = FLASH[res];
        flash = { text, color, until: now + 3, play: st.play };
      }
    } else {
      if (plan) endPlay();
      shown = null;
      ball.visible = false;
      // Between plays and games: the last team on the field stays out.
      for (const s of squads.values()) for (const c of [...s.fielders, s.batter, ...s.runners]) if (c.root.visible) c.animate(dt, 0);
    }
    // The cheer leader leads a chant for the batting team now and then.
    const batting = st.phase === 'play' ? st.play.bat : null;
    if (batting && now - chantAt > 9) { chantAt = now; ev.onChant?.(batting === game.home ? 'home' : 'away', batting); }
    for (const k of ['home', 'away', 'all']) cheer[k] = Math.max(0, cheer[k] - dt * 0.35);
    uniforms.uTime.value = t;
    uniforms.uCheer.value.set(cheer.home + cheer.all, cheer.away + cheer.all, cheer.all + Math.max(cheer.home, cheer.away) * 0.6);
    umpire.animate(dt, 0);
    for (const b of bursts) {
      if (!b.pts.visible) continue;
      b.t += dt;
      const pos = b.pts.geometry.attributes.position.array;
      for (let i = 0; i < BURST; i++) { b.v[i * 3 + 1] -= 4 * dt; pos[i * 3] += b.v[i * 3] * dt; pos[i * 3 + 1] += b.v[i * 3 + 1] * dt; pos[i * 3 + 2] += b.v[i * 3 + 2] * dt; }
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = 1 - b.t / b.life;
      if (b.t >= b.life) b.pts.visible = false;
    }
    if ((boardTimer -= dt) <= 0) { boardTimer = 0.2; drawBoard(st, now); boardTex.needsUpdate = true; }
  };
  // Called from main.js (via ev.onCheer) too: makes one side jump.
  const jump = (side, amount = 1) => { cheer[side] = Math.min(1.4, cheer[side] + amount); };
  const domeApi = {
    ev, jump,
    state: () => gameAt(clock()),
    // Which side a team's fans sit on now ('home', 'away' or null).
    sideOf: (teamId) => { const g = gameAt(clock()).game; return g.home.id === teamId ? 'home' : g.away.id === teamId ? 'away' : null; },
    nextGameOf: (teamId) => nextGameOf(teamId, gameAt(clock()).k),
    gameLen: GAME_LEN,
  };

  const stations = { patrons, cheerSquad: squad, dome: domeApi };
  return {
    scene, products, colliders, seats: freeSeats, clerk, trainer: null, barkeep: null, turntable: null, tv: null, stations, animate, see: null,
    room: ROOM, exit: EXIT, noExit: false, floorAt: domeFloor, dome: domeApi,
    fanCount: fans.length, seatCount: freeSeats.length,
  };
}

export { ROOM_DOME };
