// Interiors for the modern activities (rules in core/activities.js):
//   bowling   볼링장: lanes with pins, ball returns, score screens, benches
//   climbing  클라이밍짐: a bouldering wall with colour-coded holds and mats
//   pcbang    PC방: rows of gaming desks with glowing screens
// Every room already has people in it (stations.patrons, which main.js
// stands, seats or sets to an activity), so it never looks empty.
// Called from buildInterior (core/interior.js) with its helpers.
import * as THREE from 'three';
import { PINS, CLIMB_ROUTES } from './activities.js';

export const ACTIVITY_ROOMS = new Set(['bowling', 'climbing', 'pcbang']);
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
  return null;
}

// ── Bowling ──────────────────────────────────────────────────────────────
// Five lanes run from the pin decks at the back wall to the foul line; you
// bowl from the approach. Two lanes have a group playing, and their balls
// roll down every few seconds and knock the pins over.
function bowling(store, { scene, box, block, mat, stations, seats, w, d, h }) {
  const z0 = -d / 2 + 0.3, foul = 1.6, laneW = 1.05;
  const xs = [-7.2, -3.6, 0, 3.6, 7.2];
  const wood = mat('#d9a86a');
  stations.bowling = [];
  const live = []; // lanes where the regulars bowl: { pins, ball, t }
  xs.forEach((lx, i) => {
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(laneW, foul - z0).rotateX(-Math.PI / 2), wood);
    lane.position.set(lx, 0.012, (z0 + foul) / 2);
    scene.add(lane);
    for (let k = 1; k < 6; k++) { // the aiming arrows
      const a = new THREE.Mesh(new THREE.CircleGeometry(0.05, 3).rotateX(-Math.PI / 2), mat('#5a3a22'));
      a.position.set(lx + (k - 3) * 0.15, 0.014, foul - 4.6 - Math.abs(k - 3) * 0.3);
      scene.add(a);
    }
    for (const s of [-1, 1]) { // gutters and the low walls between lanes
      const gut = new THREE.Mesh(new THREE.PlaneGeometry(0.24, foul - z0).rotateX(-Math.PI / 2), mat('#3a3f47'));
      gut.position.set(lx + s * (laneW / 2 + 0.12), 0.008, (z0 + foul) / 2);
      scene.add(gut);
    }
    box(laneW + 0.6, 0.02, 0.06, lx, 0.015, foul, '#d9473c'); // the foul line
    // The pins, on their deck at the back.
    const pins = PINS.map((p) => {
      const pin = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.38, 10), mat('#fbfaf6'));
      body.position.y = 0.19;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.03, 10), mat('#d9473c'));
      neck.position.y = 0.3;
      pin.add(body, neck);
      pin.position.set(lx + p.x * 1.6, 0.012, z0 + 0.9 - p.z * 1.6);
      scene.add(pin);
      return pin;
    });
    // The pinsetter's hood with the lane number and score screen above.
    box(laneW + 0.5, 0.9, 1.2, lx, h - 1.1, z0 + 0.5, '#20232a');
    sign(scene, plate(String(i + 1), 'STRIKE LANE', store.colors.sign, '#ffffff', 256, 128), 0.9, 0.45, lx, h - 1.1, z0 + 1.11);
    const scr = sign(scene, plate(`LANE ${i + 1}`, i === 1 || i === 3 ? 'X  9/  8-  X' : 'READY', '#14223a', '#9fe7ff', 512, 256), 1.5, 0.75, lx, 2.9, foul + 0.6, Math.PI);
    scr.rotation.x = 0.25;
    box(0.06, h - 2.9, 0.06, lx, 2.9 + (h - 2.9) / 2, foul + 0.62, '#3a3f47');
    block(lx, (z0 + foul) / 2, laneW + 0.48, foul - z0); // the lane itself is off limits
    stations.bowling.push({ x: lx, z: foul + 1.1, ry: Math.PI, lane: i });
    if (i === 1 || i === 3) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat(i === 1 ? '#3a64c8' : '#c83a7a'));
      ball.visible = false;
      scene.add(ball);
      live.push({ lx, pins, ball, t: 2 + i * 1.7 });
    }
  });
  // Ball returns between the lanes.
  for (const lx of [-5.4, -1.8, 1.8, 5.4]) {
    box(0.6, 0.5, 1.2, lx, 0.25, foul + 1.4, '#2b2f38');
    ['#3a64c8', '#e0a43a', '#4caf7a'].forEach((c, k) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat(c));
      b.position.set(lx, 0.6, foul + 1.0 + k * 0.28);
      scene.add(b);
    });
    block(lx, foul + 1.4, 0.7, 1.3);
  }
  // Benches behind the approach (left half; the shoe counter is on the
  // right), with the regulars of lanes 2 and 4 waiting for their turn.
  const bz = foul + 3.4;
  for (const bx of [-7.2, -3.6]) {
    box(2.6, SEAT_H, 0.6, bx, SEAT_H / 2, bz, store.colors.awning);
    box(2.6, 0.6, 0.12, bx, SEAT_H + 0.3, bz + 0.3, store.colors.sign);
    block(bx, bz, 2.7, 0.7);
    for (const o of [-0.8, 0, 0.8]) seats.push({ x: bx + o, z: bz - 0.05, ry: Math.PI, stand: [bx + o, bz - 0.9] });
  }
  const patrons = (stations.patrons ||= []);
  for (const at of [[-3.6, 0], [-7.2, 0.8], [-3.6, -0.8]]) { // take three bench places
    const k = seats.findIndex((s) => Math.abs(s.x - (at[0] + at[1])) < 0.1 && Math.abs(s.z - (bz - 0.05)) < 0.1);
    if (k >= 0) { const [s] = seats.splice(k, 1); patrons.push({ x: s.x, z: s.z, ry: s.ry, sit: true }); }
  }
  patrons.push({ x: xs[1] - 0.6, z: foul + 1.3, ry: Math.PI }, { x: xs[3] + 0.5, z: foul + 1.2, ry: Math.PI });
  for (const p of patrons) if (!p.sit) block(p.x, p.z, 0.5, 0.5);
  // A shoe wall behind the counter.
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) box(0.34, 0.14, 0.2, w / 2 - 0.3, 0.5 + r * 0.42, d / 2 - 4.6 + k * 0.4, ['#d9473c', '#2f6fb5', '#f2c94c', '#3a3f47'][(r + k) % 4]);
  block(w / 2 - 0.3, d / 2 - 3.6, 0.4, 2.6);
  // The regulars' balls: roll for 2.2 s, pins fall, reset 2.5 s later.
  const animate = (dt) => {
    for (const L of live) {
      L.t -= dt;
      const roll = 2.2;
      if (L.t <= roll && L.t > 0) {
        const u = 1 - L.t / roll;
        L.ball.visible = true;
        L.ball.position.set(L.lx + Math.sin(u * 2.4) * 0.12, 0.12, foul - u * (foul - z0 - 0.9));
        L.ball.rotation.x -= dt * 12;
      } else if (L.t <= 0 && !L.hit) {
        L.hit = true;
        L.ball.visible = false;
        L.pins.forEach((p, k) => { if ((k * 7 + Math.round(L.lx)) % 10 !== 0 || L.strike) { p.rotation.z = (k % 2 ? 1 : -1) * 1.45; p.rotation.y = k; } });
      } else if (L.t < -2.5) {
        L.hit = false;
        L.strike = !L.strike;
        L.pins.forEach((p) => { p.rotation.set(0, 0, 0); });
        L.t = 4 + Math.random() * 3 + roll;
      }
    }
  };
  return { animate };
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
  stations.climbing = panels.map((px) => ({ x: px, z: wz + 2.6, ry: Math.PI }));
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
