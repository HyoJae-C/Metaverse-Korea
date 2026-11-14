// Interiors for the modern activities (rules in core/activities.js):
//   bowling   볼링장: eight lanes, ball returns, score screens over the pins, benches
//   climbing  클라이밍짐: a bouldering wall with colour-coded holds and mats
//   pcbang    PC방: rows of gaming desks with glowing screens
//   arcade    오락실: four fighting-game cabinets and two wall screens that show the matches
// Every room already has people in it (stations.patrons, which main.js
// stands, seats or sets to an activity), so it never looks empty.
// Called from buildInterior (core/interior.js) with its helpers.
import * as THREE from 'three';
import { PINS, CLIMB_ROUTES } from './activities.js';
import { LANE_HALF, LANE_LEN, BALL_R, rackSpot } from './bowling-physics.js';
import { pinGeometry, pinMaterial } from './bowling-pin.js';
import { laneScreen } from './bowling-screen.js';
import { mergeStatic } from './merge-static.js';

export const ACTIVITY_ROOMS = new Set(['bowling', 'climbing', 'pcbang', 'arcade']);
const SEAT_H = 0.38; // (same chair height as core/interior.js)

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
// A sign on a plate: big Korean line and a small English one.
function plate(text, sub, bg, fg = '#ffffff', w = 512, h = 160) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${Math.round(h * 0.42)}px ${FONT}`;
  g.fillText(text, w / 2, sub ? h * 0.38 : h / 2, w - 24);
  if (sub) { g.font = `700 ${Math.round(h * 0.2)}px system-ui, sans-serif`; g.fillText(sub, w / 2, h * 0.78, w - 24); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function sign(scene, tex, sw, sh, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
  return m;
}

export function decorateActivityRoom(store, ctx) {
  if (store.workshop === 'bowling') return bowling(store, ctx);
  if (store.workshop === 'climbing') return climbing(store, ctx);
  if (store.workshop === 'pcbang') return pcbang(store, ctx);
  if (store.workshop === 'arcade') return arcade(store, ctx);
  return null;
}

// ── Bowling ──────────────────────────────────────────────────────────────
// A big hall (ROOM_SIZES.bowling): eight lanes in pairs run from the pin
// decks at the back to the foul line, a ball return between each pair. Over
// the pins, the masking wall carries each lane's score screen (core/
// bowling-screen.js), and the same screen hangs over the approach for the
// benches. The approaches are left clear for whoever walks up to bowl; the
// regulars wait on the benches and stand about the hall. Each lane's pins
// are one instanced mesh (the real outline: core/bowling-pin.js), and a
// game on the lane, yours or another player's, moves them (lane.show).
export const BOWL_LANES = 8, BOWL_PITCH = 2.0;
function bowling(store, { scene, mat, block, stations, seats, w, d, h }) {
  const z0 = -d / 2 + 0.2, head = z0 + 1.7, foul = 3.2, laneW = LANE_HALF * 2;
  const xs = Array.from({ length: BOWL_LANES }, (_, i) => (i - (BOWL_LANES - 1) / 2) * BOWL_PITCH);
  const still = new THREE.Group(); // everything that never moves, merged below
  scene.add(still);
  const part = (geo, color, x, y, z) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); still.add(m); return m; };
  const slab = (sx, sy, sz, x, y, z, color) => part(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z);
  const flat = (sx, sz, x, y, z, color) => part(new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2), color, x, y, z);
  const len = foul - z0, mid = (z0 + foul) / 2, span = BOWL_LANES * BOWL_PITCH;
  // The approach floor in front of the lanes, all the way across.
  flat(span, 2.6, 0, 0.01, foul + 1.3, '#e3c18e');
  const pinGeo = pinGeometry(), ballGeo = new THREE.SphereGeometry(BALL_R, 18, 12);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  stations.bowling = [];
  xs.forEach((lx, i) => {
    flat(laneW, foul - head - 0.25, lx, 0.012, (foul + head + 0.25) / 2, '#d9a86a'); // the lane
    flat(laneW, 1.2, lx, 0.013, head - 0.35, '#e8c48f'); // the pin deck
    flat(laneW + 0.5, 1.2, lx, 0.006, z0 + 0.4, '#15161b'); // the pit
    for (let k = 1; k < 6; k++) { // the aiming arrows
      part(new THREE.CircleGeometry(0.05, 3).rotateX(-Math.PI / 2), '#5a3a22', lx + (k - 3) * 0.15, 0.014, foul - 3.7 - Math.abs(k - 3) * 0.3);
    }
    for (const sd of [-1, 1]) { // gutters, and the capping between lanes
      flat(0.24, len - 1.2, lx + sd * (LANE_HALF + 0.12), 0.008, mid + 0.6, '#3a3f47');
      slab(0.08, 0.5, 1.4, lx + sd * (LANE_HALF + 0.28), 0.25, head - 0.4, '#30333c'); // kickbacks by the deck
      slab((BOWL_PITCH - laneW - 0.48) / 2, 0.07, len - 1.2, lx + sd * (BOWL_PITCH / 2 - (BOWL_PITCH - laneW - 0.48) / 4), 0.035, mid + 0.6, '#8a6446');
    }
    slab(laneW + 0.5, 0.02, 0.06, lx, 0.015, foul, '#d9473c'); // the foul line
    // The score screen on the masking wall over the pins, and its twin over
    // the approach for the benches (one texture, see core/bowling-screen.js).
    const screen = laneScreen(i);
    const face = new THREE.MeshBasicMaterial({ map: screen.tex });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(BOWL_PITCH - 0.06, (BOWL_PITCH - 0.06) / 2), face);
    wall.position.set(lx, 1.12, head + 0.27);
    scene.add(wall);
    sign(scene, plate(String(i + 1), 'LANE', store.colors.sign, '#ffffff', 256, 128), 0.5, 0.25, lx, 1.88, head + 0.27);
    const over = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), face);
    over.position.set(lx, 3.7, foul + 2.6); // (high enough to see the lanes under it from the hall)
    over.rotation.x = 0.35; // tipped down to the benches
    scene.add(over);
    slab(0.05, h - 4, 0.05, lx, 4 + (h - 4) / 2, foul + 2.6, '#3a3f47');
    // The pins (one instanced mesh) and a ball for a game on this lane.
    const pins = new THREE.InstancedMesh(pinGeo, pinMaterial, PINS.length);
    pins.frustumCulled = false;
    scene.add(pins);
    const ball = new THREE.Mesh(ballGeo, mat('#3a64c8'));
    ball.visible = false;
    scene.add(ball);
    const squeeze = (foul - head) / LANE_LEN;
    // Down the lane (physics z from the foul line) to the room's z: squeezed
    // up to the head pin, real past it (the deck, the pit) and behind the line.
    const roomZ = (z) => (z < 0 ? foul - z : z <= LANE_LEN ? foul - z * squeeze : head - (z - LANE_LEN));
    const lane = {
      roomZ, ball,
      // ball { x, z, roll } or null; pins [{ x, z, tilt, heading, gone }] in
      // physics metres (core/bowling-physics.js), in rack order.
      show(b, ps, color) {
        ball.visible = !!b && b.z < LANE_LEN + 1.05;
        if (b) { ball.position.set(lx + b.x, BALL_R + 0.012, roomZ(b.z)); ball.rotation.set(-b.roll, 0, 0); }
        if (color) ball.material = mat(color);
        let n = 0;
        for (const p of ps) {
          if (p.gone || p.z > LANE_LEN + 1.05) continue;
          const tip = p.tilt * (Math.PI / 2) * 0.97;
          v.set(Math.sin(tip) * Math.sin(p.heading), Math.cos(tip), -Math.sin(tip) * Math.cos(p.heading));
          q.setFromUnitVectors(up, v);
          pins.setMatrixAt(n++, m4.compose(v.set(lx + p.x, 0.012 + (p.tilt > 0.9 ? 0.05 : 0), roomZ(p.z)), q, one));
        }
        pins.count = n;
        pins.instanceMatrix.needsUpdate = true;
      },
      rest() { this.show(null, PINS.map((_, k) => ({ ...rackSpot(k), tilt: 0, heading: 0, gone: 0 }))); },
    };
    lane.rest();
    block(lx, mid - 0.3, BOWL_PITCH - 0.05, len - 0.6); // the lane itself is off limits
    // (foul, head: where the foul line and the head pin are, for a game
    // played on this lane: game/bowling-view.js)
    stations.bowling.push(Object.assign(lane, { x: lx, z: foul + 1.1, ry: Math.PI, lane: i, foul, head, screen, busy: false }));
  });
  // The masking wall over the pin decks, all the way across.
  slab(span + 0.4, 1.6, 0.3, 0, 0.6 + 1.6 / 2, head + 0.1, '#20232a');
  slab(span + 0.4, 0.08, 0.32, 0, 0.6, head + 0.11, store.colors.sign);
  // Ball returns between the two lanes of each pair, behind where you stand.
  const balls = ['#3a64c8', '#e0a43a', '#4caf7a', '#c83a7a', '#8a5cc9'];
  for (let k = 0; k < BOWL_LANES; k += 2) {
    const bx = (xs[k] + xs[k + 1]) / 2;
    slab(0.6, 0.5, 1.3, bx, 0.25, foul + 2.1, '#2b2f38');
    for (let j = 0; j < 3; j++) part(ballGeo, balls[(k + j) % balls.length], bx, 0.6, foul + 1.7 + j * 0.3);
    block(bx, foul + 2.1, 0.7, 1.4);
  }
  // Benches behind the approach, one per pair of lanes; the regulars wait on
  // three of them. The hall behind is open to walk about.
  const bz = foul + 3.9;
  for (let k = 0; k < BOWL_LANES; k += 2) {
    const bx = (xs[k] + xs[k + 1]) / 2;
    slab(2.8, SEAT_H, 0.6, bx, SEAT_H / 2, bz, store.colors.awning);
    slab(2.8, 0.6, 0.12, bx, SEAT_H + 0.3, bz + 0.3, store.colors.sign);
    block(bx, bz, 2.9, 0.7);
    for (const o of [-0.9, 0, 0.9]) seats.push({ x: bx + o, z: bz - 0.05, ry: Math.PI, stand: [bx + o, bz - 0.9] });
  }
  const patrons = (stations.patrons ||= []);
  const pairX = (k) => (xs[k] + xs[k + 1]) / 2;
  for (const at of [[pairX(0), 0.9], [pairX(2), -0.9], [pairX(2), 0], [pairX(6), 0.9]]) { // regulars on the benches
    const k = seats.findIndex((s) => Math.abs(s.x - (at[0] + at[1])) < 0.1 && Math.abs(s.z - (bz - 0.05)) < 0.1);
    if (k >= 0) { const [s] = seats.splice(k, 1); patrons.push({ x: s.x, z: s.z, ry: s.ry, sit: true }); }
  }
  // Two more chatting by the side wall, well away from the lanes.
  patrons.push({ x: -w / 2 + 2.2, z: foul + 5.2, ry: Math.PI / 2 }, { x: -w / 2 + 3.0, z: foul + 5.4, ry: -Math.PI / 2 });
  for (const p of patrons) if (!p.sit) block(p.x, p.z, 0.5, 0.5);
  // A shoe wall behind the counter.
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) slab(0.34, 0.14, 0.2, w / 2 - 0.3, 0.5 + r * 0.42, d / 2 - 4.6 + k * 0.4, ['#d9473c', '#2f6fb5', '#f2c94c', '#3a3f47'][(r + k) % 4]);
  block(w / 2 - 0.3, d / 2 - 3.6, 0.4, 2.6);
  mergeStatic(still);
  return null;
}

// ── Climbing ─────────────────────────────────────────────────────────────
// A wide bouldering wall along the back, in three panels (the middle one
// leans out), dotted with holds in the six grade colours. Thick blue mats
// in front. Someone is on the wall, others watch from the mats.
function climbing(store, { scene, box, block, mat, stations, seats, w, d, h }) {
  const wz = -d / 2 + 0.2, panelW = 6, wallH = h - 0.3;
  const panels = [-panelW, 0, panelW];
  panels.forEach((px, i) => {
    const lean = i === 1 ? 0.28 : 0; // the overhang
    const g = new THREE.Group();
    g.position.set(px, 0, wz);
    g.rotation.x = lean; // (the top leans out over the mat)
    scene.add(g);
    const face = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.05, wallH, 0.12), mat(i === 1 ? '#e8e2d6' : '#d7d1c4'));
    face.position.y = wallH / 2;
    g.add(face);
    // Holds: little lumps of every grade's colour, the same each visit.
    let s = 17 + i * 101;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let k = 0; k < 46; k++) {
      const r = CLIMB_ROUTES[k % CLIMB_ROUTES.length];
      const hold = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + rnd() * 0.08, 0), mat(r.color));
      hold.position.set((rnd() - 0.5) * (panelW - 0.6), 0.35 + rnd() * (wallH - 0.6), 0.1);
      hold.scale.z = 0.6;
      g.add(hold);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.1, 0.5), mat('#3a3f47'));
    top.position.set(0, wallH, 0.2);
    g.add(top);
  });
  block(0, wz + 0.5, panelW * 3, 1.2);
  // Mats: a long soft strip in front of the wall.
  box(panelW * 3, 0.3, 3.2, 0, 0.15, wz + 2.3, '#2f6fb5');
  for (const px of panels) box(0.04, 0.31, 3.2, px - panelW / 2, 0.16, wz + 2.3, '#24579a');
  // Grade chart on the left wall: colour = grade.
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g2 = c.getContext('2d');
  g2.fillStyle = '#fffaf0'; g2.fillRect(0, 0, 256, 512);
  g2.fillStyle = '#2b2b2e'; g2.font = `900 34px ${FONT}`; g2.textAlign = 'center';
  g2.fillText('난이도 GRADES', 128, 48);
  CLIMB_ROUTES.forEach((r, k) => {
    g2.fillStyle = r.color; g2.fillRect(28, 80 + k * 70, 70, 50);
    g2.fillStyle = '#2b2b2e'; g2.font = '800 40px system-ui'; g2.textAlign = 'left';
    g2.fillText(r.grade, 120, 120 + k * 70);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  sign(scene, tex, 1.2, 2.4, -w / 2 + 0.03, 2.0, -1, Math.PI / 2);
  // Where you start a problem: in front of each panel, on the mat.
  // (wall, lean, top: the panel's foot, its lean and its height, for the
  // climb on the wall itself, game/climb-view.js.)
  stations.climbing = panels.map((px, i) => ({ x: px, z: wz + 2.6, ry: Math.PI, wall: wz, lean: i === 1 ? 0.28 : 0, top: wallH }));
  // Chalk bucket stands and a bench by the right wall.
  for (const px of [-3, 3]) {
    box(0.3, 0.9, 0.3, px, 0.45, wz + 4.4, '#9ca9af');
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.22, 12), mat('#fbfaf6'));
    bucket.position.set(px, 1.0, wz + 4.4);
    scene.add(bucket);
    block(px, wz + 4.4, 0.35, 0.35);
  }
  const bx = w / 2 - 0.8;
  box(0.6, SEAT_H, 3, bx, SEAT_H / 2, 1, '#8a5a3a');
  block(bx, 1, 0.7, 3.1);
  for (const z of [0, 1, 2]) seats.push({ x: bx - 0.05, z, ry: -Math.PI / 2, stand: [bx - 0.9, z] });
  // The people: two climbers on the wall (hanging: 'pullup'), one chalking
  // up, two watching from the mat, one resting on the bench.
  const patrons = (stations.patrons ||= []);
  patrons.push(
    { x: -panelW + 1.2, y: 1.3, z: wz + 0.35, ry: 0, act: 'pullup' },
    { x: panelW - 0.8, y: 2.1, z: wz + 0.35, ry: 0, act: 'pullup' },
    { x: -panelW - 1.4, z: wz + 2.9, ry: Math.PI * 0.9 },
    { x: 1.6, z: wz + 3.1, ry: Math.PI },
  );
  const [rest] = seats.splice(seats.length - 2, 1); // the middle of the bench
  patrons.push({ x: rest.x, z: rest.z, ry: rest.ry, sit: true });
  for (const p of patrons) if (!p.sit && !p.y) block(p.x, p.z, 0.5, 0.5);
  return null;
}

// ── PC방 ─────────────────────────────────────────────────────────────────
// Three rows of gaming desks facing the back wall, each with a glowing
// screen, a keyboard with a lit strip and a gaming chair. Most seats are
// taken; sit at a free one to play (seat.pc, stations.aim).
function pcbang(store, { scene, box, block, mat, stations, seats, w, d, h }) {
  const cols = [-8.4, -6.6, -4.8, -3.0, 3.0, 4.8, 6.6, 8.4]; // a walkway down the middle
  const rows = [-d / 2 + 1.6, -d / 2 + 4.6, -d / 2 + 7.6];
  const glow = ['#5ad1ff', '#8a6bff', '#ff5aa8', '#4cf0a0', '#ffb84a'];
  const screens = [];
  stations.aim = [];
  const pcSeats = [];
  rows.forEach((rz, r) => {
    box(cols.slice(0, 4).length * 1.8, 0.06, 0.8, (cols[0] + cols[3]) / 2, 0.72, rz, '#1d1f26');
    box(cols.slice(4).length * 1.8, 0.06, 0.8, (cols[4] + cols[7]) / 2, 0.72, rz, '#1d1f26');
    for (const half of [cols.slice(0, 4), cols.slice(4)]) block((half[0] + half[3]) / 2, rz, 4 * 1.8, 0.8);
    cols.forEach((cx, k) => {
      const c = glow[(k + r * 3) % glow.length];
      box(0.9, 0.55, 0.05, cx, 1.12, rz - 0.25, '#0c0d12'); // monitor
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.48), new THREE.MeshBasicMaterial({ color: c }));
      scr.position.set(cx, 1.12, rz - 0.22);
      scene.add(scr);
      screens.push({ scr, base: new THREE.Color(c), k: k + r * 8 });
      box(0.06, 0.3, 0.06, cx, 0.88, rz - 0.27, '#0c0d12');
      box(0.6, 0.03, 0.2, cx, 0.76, rz + 0.05, '#2b2d36'); // keyboard
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.02).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c }));
      strip.position.set(cx, 0.776, rz + 0.155);
      scene.add(strip);
      box(0.4, 0.5, 0.4, cx + 0.6, 0.25, rz - 0.15, '#15161c'); // the tower, under the desk
      // The gaming chair: seat, tall back with a coloured stripe.
      const chz = rz + 0.75;
      box(0.55, 0.1, 0.55, cx, SEAT_H, chz, '#20222a');
      box(0.55, 0.85, 0.1, cx, SEAT_H + 0.48, chz + 0.28, '#20222a');
      box(0.12, 0.8, 0.11, cx, SEAT_H + 0.5, chz + 0.29, store.colors.awning);
      const seat = { x: cx, z: chz - 0.05, ry: Math.PI, stand: [cx, chz + 0.85], pc: true };
      pcSeats.push(seat);
    });
  });
  // Most seats are taken: free ones are every third seat or so (and always
  // the aisle seats of the front row, so the first visit is easy).
  pcSeats.forEach((s, i) => {
    const free = i % 3 === 1 || (s.z < rows[0] + 1 && (s.x === -3.0 || s.x === 3.0));
    if (free) { seats.push(s); stations.aim.push({ x: s.x, z: s.z }); } else (stations.patrons ||= []).push({ x: s.x, z: s.z, ry: s.ry, sit: true });
  });
  // A neon strip round the top of the walls and a big e-sports screen.
  const neon = new THREE.MeshBasicMaterial({ color: store.colors.awning });
  for (const [sx, sz, px, pz] of [[w, 0.06, 0, -d / 2 + 0.04], [0.06, d, -w / 2 + 0.04, 0], [0.06, d, w / 2 - 0.04, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.06, sz), neon);
    m.position.set(px, h - 0.25, pz);
    scene.add(m);
  }
  sign(scene, plate('e스포츠 리그', 'NEON STRIKE · LEAGUE NIGHT', '#14101f', '#5ad1ff', 1024, 256), 4.8, 1.2, 0, h - 1.4, -d / 2 + 0.06);
  // A snack corner by the counter: a cup-ramen shelf and a drinks fridge.
  const fx = w / 2 - 0.6;
  box(0.8, 1.9, 1.2, fx, 0.95, d / 2 - 4.6, '#dfe8ee');
  for (let k = 0; k < 3; k++) box(0.05, 0.3, 1.0, fx - 0.42, 0.5 + k * 0.5, d / 2 - 4.6, ['#d9473c', '#2f6fb5', '#f2c94c'][k]);
  block(fx, d / 2 - 4.6, 0.9, 1.3);
  // The screens flicker gently (a game in play).
  let t = 0;
  const tmp = new THREE.Color();
  const animate = (dt) => {
    t += dt;
    for (const s of screens) s.scr.material.color.copy(tmp.copy(s.base).multiplyScalar(0.8 + 0.2 * Math.sin(t * 3 + s.k * 1.7)));
  };
  return { animate };
}

// ── Arcade ───────────────────────────────────────────────────────────────
// Four Rooftop Rumble cabinets (game/brawl.js), two by each side wall, and
// two big screens on the back wall. A match played here is shown on a screen
// for everyone in the room (game/brawl-tv.js draws it; stations.fightTv are
// the screens); with nobody playing they show the game's title. The middle
// of the floor is left open for people to stand and watch, with two benches.
export const ARCADE_TV = { w: 6.4, h: 3.6, y: 2.4, xs: [-3.6, 3.6] };
function arcadeIdle(n) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 288);
  sky.addColorStop(0, '#120e22'); sky.addColorStop(1, '#5a2a5e');
  g.fillStyle = sky; g.fillRect(0, 0, 512, 288);
  g.fillStyle = '#ffd23c'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'italic 900 54px system-ui, sans-serif';
  g.fillText('ROOFTOP RUMBLE', 256, 112, 480);
  g.fillStyle = '#ffffff'; g.font = `700 26px ${FONT}`;
  g.fillText('도전자를 기다리는 중', 256, 176, 480);
  g.font = '700 18px system-ui, sans-serif'; g.globalAlpha = 0.8;
  g.fillText('WAITING FOR CHALLENGERS', 256, 212, 480);
  g.fillText('SCREEN ' + n, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function arcade(store, { scene, box, block, mat, stations, seats, w, d, h }) {
  stations.fight = [];
  // A cabinet against a side wall: a dark body, a glowing screen and a
  // marquee, the stick and buttons in front. dir: +1 looks into the room
  // from the left wall, -1 from the right.
  const cabinet = (fx, fz, dir) => {
    box(0.9, 1.0, 0.9, fx, 0.5, fz, '#241d3a');
    box(0.5, 0.9, 0.9, fx - 0.2 * dir, 1.45, fz, '#241d3a');
    box(0.5, 0.12, 0.8, fx + 0.3 * dir, 1.02, fz, '#3a3260');
    box(0.7, 0.28, 0.9, fx - 0.1 * dir, 2.04, fz, '#ffd23c');
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.6), new THREE.MeshBasicMaterial({ color: '#ff5a6e' }));
    scr.position.set(fx + 0.06 * dir, 1.48, fz);
    scr.rotation.y = dir * Math.PI / 2;
    scene.add(scr);
    for (const [k, c] of ['#3f7fe0', '#e0483f', '#2fa56a', '#d9982a'].entries()) box(0.07, 0.04, 0.07, fx + (0.36 - (k >> 1) * 0.12) * dir, 1.1, fz + 0.08 + (k & 1) * 0.13, c);
    box(0.04, 0.14, 0.04, fx + 0.3 * dir, 1.14, fz - 0.2, '#e8e8f0');
    block(fx, fz, 1.0, 1.0);
    stations.fight.push({ x: fx + 1.15 * dir, z: fz, ry: -dir * Math.PI / 2 });
  };
  for (const fz of [-2.2, 1.6]) { cabinet(-w / 2 + 0.55, fz, 1); cabinet(w / 2 - 0.55, fz, -1); }
  // The two wall screens, each in a dark frame, a strip along the top for
  // the names and health bars (game/brawl-tv.js writes on it).
  box(ARCADE_TV.xs[1] - ARCADE_TV.xs[0] + ARCADE_TV.w + 0.4, ARCADE_TV.h + 0.4, 0.08, 0, ARCADE_TV.y, -d / 2 + 0.04, '#0c0b14'); // one dark panel behind both
  stations.fightTv = ARCADE_TV.xs.map((x, i) => {
    const z = -d / 2 + 0.06;
    const idle = arcadeIdle(i + 1);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(ARCADE_TV.w, ARCADE_TV.h), new THREE.MeshBasicMaterial({ map: idle }));
    screen.position.set(x, ARCADE_TV.y, z + 0.03);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(ARCADE_TV.w, ARCADE_TV.w * 48 / 512), new THREE.MeshBasicMaterial({ transparent: true }));
    strip.position.set(x, ARCADE_TV.y + ARCADE_TV.h / 2 - ARCADE_TV.w * 24 / 512, z + 0.04);
    strip.visible = false;
    scene.add(screen, strip);
    return { screen, strip, idle };
  });
  // Neon round the top of the walls, and a star on the floor like the ring's.
  const neon = new THREE.MeshBasicMaterial({ color: '#ff5a6e' });
  for (const [sx, sz, px, pz] of [[w, 0.06, 0, -d / 2 + 0.04], [0.06, d, -w / 2 + 0.04, 0], [0.06, d, w / 2 - 0.04, 0]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.06, sz), neon);
    m.position.set(px, h - 0.25, pz);
    scene.add(m);
  }
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40).rotateX(-Math.PI / 2), mat('#2a2148'));
  rug.position.set(0, 0.012, 0.4);
  const ringMark = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.45, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffd23c' }));
  ringMark.position.set(0, 0.016, 0.4);
  scene.add(rug, ringMark);
  // Benches facing the screens, and a few regulars watching.
  for (const bx of [-3.2, 3.2]) {
    const bz = 3.4;
    box(3.0, 0.1, 0.5, bx, SEAT_H, bz, '#3a3260');
    for (const lx of [-1.3, 1.3]) box(0.1, SEAT_H, 0.4, bx + lx, SEAT_H / 2, bz, '#241d3a');
    block(bx, bz, 3.0, 0.5);
    for (const sx of [-1, 0, 1]) seats.push({ x: bx + sx, z: bz, ry: Math.PI, stand: [bx + sx, bz + 0.8] });
  }
  // Stand on the ring mark or by a bench to turn the camera to the screens (game/arcade.js).
  stations.watch = [{ x: 0, z: 0.4 }, { x: -3.2, z: 4.2 }, { x: 3.2, z: 4.2 }];
  (stations.patrons ||= []).push({ x: -1.4, z: 0.2, ry: Math.PI }, { x: 1.9, z: 1.1, ry: Math.PI - 0.3 }, { x: 5.4, z: -0.3, ry: Math.PI + 0.5 });
  return null;
}
