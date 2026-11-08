// Over-ear headphones for the record café's listening bar (청음), and the
// gentle nod while listening. The headphones are built in chibi head units
// like the hats (core/character.js): the head is a ball of radius ~0.31
// centred on 0, the face looks down +z.
import * as THREE from 'three';

const mats = {};
const mat = (hex) => (mats[hex] ||= new THREE.MeshLambertMaterial({ color: hex }));

export function makeHeadphones(color = '#1f1d24', accent = '#c9a26a') {
  const g = new THREE.Group();
  g.name = 'headphones';
  // The band: half a ring over the top of the head, ear to ear.
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.355, 0.03, 8, 28, Math.PI), mat(color));
  band.position.y = 0.0;
  g.add(band);
  // A soft pad under the middle of the band.
  const pad = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 8).rotateZ(Math.PI / 2), mat('#3a3742'));
  pad.position.y = 0.335;
  g.add(pad);
  for (const s of [-1, 1]) {
    // Ear cup: a short round can over each ear, with a cushion facing in
    // and a coloured ring on the outside.
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 20).rotateZ(Math.PI / 2), mat(color));
    cup.position.set(0.345 * s, -0.04, 0);
    g.add(cup);
    const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.03, 8, 18).rotateY(Math.PI / 2), mat('#2b2930'));
    cushion.position.set(0.3 * s, -0.04, 0);
    g.add(cushion);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(0.07, 18).rotateY(s * Math.PI / 2), mat(accent));
    ring.position.set(0.387 * s, -0.04, 0);
    g.add(ring);
    // A short arm from the band down to the cup.
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.05), mat('#8d8a96'));
    arm.position.set(0.36 * s, 0.06, 0);
    g.add(arm);
  }
  return g;
}

// Listening: a slow nod on the beat with a little sway, laid over the idle
// clip (bone offsets in radians, as the dances use in core/model-pack.js).
export function listenPose(t, bpm = 84) {
  const ph = t * bpm / 60 * Math.PI; // one nod per beat
  const nod = Math.pow(Math.abs(Math.sin(ph)), 1.6);
  const sway = Math.sin(ph / 4);
  return { bob: nod * 0.012, turn: 0, spine: [0.04 * nod, 0, 0.04 * sway], head: [0.14 * nod, 0, -0.05 * sway] };
}
