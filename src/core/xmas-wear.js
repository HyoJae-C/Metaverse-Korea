// Christmas accessories from Santa Pop-up (Seongsu): a Santa hat, Rudolph
// antlers on a headband (look.head), a Santa beard and a Rudolph nose
// (look.face). Sized for the chibi head group (radius about 0.33, the face
// looking down +z), like the hats in core/character.js.
import * as THREE from 'three';

const mats = {};
const mat = (c, glow = 0) => (mats[c + ':' + glow] ||= new THREE.MeshLambertMaterial({ color: c, emissive: glow ? c : 0x000000, emissiveIntensity: glow }));
const geos = {};
const geo = (k, make) => (geos[k] ||= make());
const FUR = 0xfbfaf6;

// Santa hat: a red cone over the crown, its tip flopping over to one side
// and back, a thick white fur band round the brow and a white pom-pom.
export function makeSantaHat(a) {
  const g = new THREE.Group();
  const red = mat(a.color);
  const fur = mat(FUR);
  const band = new THREE.Mesh(geo('santaBand', () => new THREE.TorusGeometry(0.32, 0.065, 10, 28).rotateX(Math.PI / 2)), fur);
  band.position.set(0, 0.17, -0.01);
  band.scale.set(1, 1.15, 1.02);
  const crown = new THREE.Mesh(geo('santaCrown', () => new THREE.SphereGeometry(0.33, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42)), red);
  crown.position.set(0, 0.11, -0.01);
  // The cone in two parts, the upper one bent over: a frustum up from the
  // crown, then the tip leaning out and drooping.
  const low = new THREE.Mesh(geo('santaLow', () => new THREE.CylinderGeometry(0.17, 0.3, 0.17, 16).translate(0, 0.085, 0)), red);
  low.position.set(0, 0.27, -0.03);
  low.rotation.set(-0.25, 0, -0.2);
  const tip = new THREE.Group();
  tip.position.set(0, 0.16, 0);
  tip.rotation.set(-0.6, 0, -1.25);
  low.add(tip);
  const cone = new THREE.Mesh(geo('santaTip', () => new THREE.ConeGeometry(0.17, 0.3, 14).translate(0, 0.15, 0)), red);
  tip.add(cone);
  const pom = new THREE.Mesh(geo('santaPom', () => new THREE.SphereGeometry(0.075, 12, 10)), fur);
  pom.position.y = 0.31;
  tip.add(pom);
  g.add(band, crown, low);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Rudolph antlers: a thin brown headband over the crown with a branched
// antler standing up out of each side, a small fuzzy ear in front of each.
export function makeAntlers(a) {
  const g = new THREE.Group();
  const horn = mat(a.color), band = mat(a.band ?? 0x5a3a22), ear = mat(a.ear ?? 0xa8774c);
  const arch = new THREE.Mesh(geo('antlerBand', () => new THREE.TorusGeometry(0.345, 0.018, 6, 24, Math.PI)), band);
  arch.position.set(0, -0.02, 0.03);
  arch.rotation.x = -0.15;
  g.add(arch);
  const stick = geo('antlerStick', () => new THREE.CylinderGeometry(0.022, 0.03, 1, 7).translate(0, 0.5, 0));
  const knob = geo('antlerKnob', () => new THREE.SphereGeometry(0.024, 8, 6));
  const branch = (parent, len, x, y, rz, rx = 0) => {
    const b = new THREE.Mesh(stick, horn);
    b.scale.set(1, len, 1);
    b.position.set(x, y, 0);
    b.rotation.set(rx, 0, rz);
    const end = new THREE.Mesh(knob, horn);
    end.position.y = 1;
    end.scale.set(1, 1 / len, 1);
    b.add(end);
    parent.add(b);
    return b;
  };
  for (const s of [-1, 1]) {
    const side = new THREE.Group();
    side.position.set(0.21 * s, 0.25, 0.02);
    side.scale.x = s; // (built for the right side, mirrored for the left)
    g.add(side);
    const beam = new THREE.Group();
    beam.rotation.z = -0.35;
    side.add(beam);
    branch(beam, 0.3, 0, 0, 0); // the main beam
    branch(beam, 0.13, 0, 0.12, -0.9, 0.15); // tines out of its side
    branch(beam, 0.11, 0, 0.21, 0.75, -0.1);
    branch(beam, 0.09, 0, 0.27, -0.7);
    const e = new THREE.Mesh(geo('antlerEar', () => new THREE.SphereGeometry(0.06, 10, 8).scale(0.6, 1, 0.35)), ear);
    e.position.set(0.1, -0.02, 0.02);
    e.rotation.z = -0.9;
    side.add(e);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Where the middle of the face is (head-local): glasses sit at y -0.02,
// z 0.27 (core/character.js GLASS_Z).
const FACE_Y = -0.1, FACE_Z = 0.27;

// Santa beard: a big soft white beard round the jaw and over the chin, a
// curled moustache under the nose.
export function makeBeard(a) {
  const g = new THREE.Group();
  const m = mat(a.color);
  const puff = geo('beardPuff', () => new THREE.SphereGeometry(1, 14, 10));
  const blob = (r, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const b = new THREE.Mesh(puff, m);
    b.scale.set(r * sx, r * sy, r * sz);
    b.position.set(x, y, z);
    g.add(b);
  };
  // the beard: a chin puff hanging low, cheek puffs up the jaw to the ears
  blob(0.17, 0, FACE_Y - 0.17, FACE_Z - 0.06, 1.05, 1.15, 0.6);
  blob(0.1, 0, FACE_Y - 0.31, FACE_Z - 0.06, 1, 1, 0.6);
  for (const s of [-1, 1]) {
    blob(0.12, 0.14 * s, FACE_Y - 0.09, FACE_Z - 0.09, 0.9, 1.1, 0.6);
    blob(0.1, 0.23 * s, FACE_Y - 0.01, FACE_Z - 0.17, 0.6, 1.1, 0.8);
    // the moustache: two curled lobes under the nose
    blob(0.06, 0.055 * s, FACE_Y - 0.03, FACE_Z + 0.03, 1.4, 0.7, 0.7);
    blob(0.035, 0.12 * s, FACE_Y - 0.01, FACE_Z + 0.0, 1, 1, 0.8);
  }
  return g;
}

// Rudolph nose: a round shiny red nose that glows a little at night.
export function makeNose(a) {
  const g = new THREE.Group();
  const n = new THREE.Mesh(geo('rudolphNose', () => new THREE.SphereGeometry(0.06, 16, 12)), mat(a.color, 0.45));
  n.position.set(0, FACE_Y + 0.03, FACE_Z + 0.05);
  const shine = new THREE.Mesh(geo('rudolphShine', () => new THREE.SphereGeometry(0.016, 8, 6)), mat(0xffffff, 0.6));
  shine.position.set(-0.02, FACE_Y + 0.055, FACE_Z + 0.1);
  g.add(n, shine);
  return g;
}

// Any of them by its shape (data/appearance.js shapeOf), or null.
export function makeXmas(shape, a) {
  return shape === 'santa' ? makeSantaHat(a) : shape === 'antlers' ? makeAntlers(a)
    : shape === 'beard' ? makeBeard(a) : shape === 'nose' ? makeNose(a) : null;
}
export const XMAS_SHAPES = ['santa', 'antlers', 'beard', 'nose'];
