// The live café's room (workshop 'livecafe', Sinchon): a low stage at the
// back with a mic stand under a warm spotlight, small round tables facing
// it, and a bar along the right wall. People already sit at some tables and
// two fans stand by the stage, so the room never feels empty.
//
// stations.livestage is the singer's spot (game/live-stage.js: step on it and
// turn the mic on; only people in this room hear you).
import * as THREE from 'three';
import { liftFor } from './counter-face.js';

const BAR_TOP = 0.76; // the bar's top (a club's bar height, core/interior.js BAR_H)

export const LIVE_STAGE_DEPTH = 2.8; // the stage, from the back wall
const SEAT_H = 0.38; // (same chair height as core/interior.js)

export function decorateLiveCafe(store, { scene, box, block, mat, stations, seats, w, d }) {
  const back = -d / 2;
  // The stage: a low platform with a dark curtain behind it.
  box(7, 0.12, LIVE_STAGE_DEPTH, 0, 0.06, back + LIVE_STAGE_DEPTH / 2, '#3a2a22');
  box(7.2, 0.04, 0.12, 0, 0.12, back + LIVE_STAGE_DEPTH, store.colors.awning); // its lit front edge
  box(7.4, 3, 0.06, 0, 1.6, back + 0.05, '#4a1e2a'); // curtain
  // The mic stand, on the singer's spot.
  const mz = back + 1.5;
  box(0.04, 1.35, 0.04, 0, 0.8, mz - 0.25, '#b7bcc2');
  box(0.09, 0.14, 0.09, 0, 1.5, mz - 0.25, '#2b2b2e');
  box(0.3, 0.03, 0.3, 0, 0.14, mz - 0.25, '#2b2b2e'); // its foot
  // Speakers, an amp and a stool with an acoustic guitar leaning on it.
  for (const sx of [-3.2, 3.2]) { box(0.6, 1.1, 0.5, sx, 0.67, back + 0.6, '#1d1b22'); block(sx, back + 0.6, 0.7, 0.6); }
  box(0.7, 0.5, 0.4, -1.8, 0.37, back + 0.7, '#2a2a2a');
  box(0.38, 0.62, 0.38, 1.6, 0.43, back + 0.9, '#6b4a32');
  const guitar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 18).rotateX(Math.PI / 2), mat('#c98a4a'));
  guitar.position.set(1.6, 0.55, back + 1.15);
  guitar.rotation.z = 0.25;
  scene.add(guitar);
  box(0.06, 0.6, 0.04, 1.68, 0.95, back + 1.15, '#3a2516'); // its neck
  // A warm spotlight on the singer (the room is dark: 'night' in interior.js).
  const spot = new THREE.SpotLight(0xffd8a0, 18, 9, 0.5, 0.6);
  spot.position.set(0, 3.6, mz + 2.2);
  spot.target.position.set(0, 0, mz);
  scene.add(spot, spot.target);
  stations.livestage = [{ x: 0, z: mz, ry: 0 }];

  // Round tables, two stools each, facing the stage.
  const patrons = (stations.patrons ||= []);
  const top = mat('#2b211c'), leg = mat('#9a8f86'), cushion = mat(store.colors.sign);
  const tables = [[-4.2, -0.6], [-1.4, -0.2], [1.4, -0.2], [-4.2, 2], [-1.4, 2.4], [1.4, 2.4]];
  tables.forEach(([tx, tz], k) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 18), top);
    t.position.set(tx, 0.74, tz);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8), leg);
    l.position.set(tx, 0.36, tz);
    scene.add(t, l);
    block(tx, tz, 0.8, 0.8);
    for (const sx of [-0.62, 0.62]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, SEAT_H, 12), cushion);
      s.position.set(tx + sx, SEAT_H / 2, tz + 0.35);
      scene.add(s);
      const seat = { x: tx + sx, z: tz + 0.35, ry: Math.PI, stand: [tx + sx, tz + 1.05] };
      // Every other table has someone sitting there already.
      if (k % 2 === 0 && sx < 0) patrons.push({ x: seat.x, z: seat.z, ry: seat.ry, sit: true });
      else seats.push(seat);
    }
  });
  // Two fans standing by the stage (they clap while someone sings).
  for (const [px, pz] of [[-2.4, back + LIVE_STAGE_DEPTH + 0.7], [2.5, back + LIVE_STAGE_DEPTH + 0.9]]) {
    patrons.push({ x: px, z: pz, ry: Math.PI, fan: true });
    block(px, pz, 0.5, 0.5);
  }

  // The bar along the right wall, with the bartender behind it on a low
  // step: bar height, and the face shows over it (core/counter-face.js).
  const bx = w / 2 - 1.1, barTop = BAR_TOP, step = liftFor(barTop);
  box(0.7, barTop - 0.05, 4.2, bx, (barTop - 0.05) / 2, 1.2, '#4a3226');
  box(0.8, 0.05, 4.3, bx, barTop - 0.025, 1.2, store.colors.awning);
  box(0.6, step, 4.2, bx + 0.6, step / 2, 1.2, '#3a281e');
  block(bx, 1.2, 0.8, 4.3);
  for (const z of [0.2, 1.2, 2.2]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.48, 12), cushion);
    s.position.set(bx - 0.75, 0.24, z);
    scene.add(s);
  }
  return { barkeep: { x: bx + 0.6, y: step, z: 1.2, ry: -Math.PI / 2 } };
}
