// Nyang Meong To Pan's animal wear (data/appearance.js ANIMAL_LOOKS): an
// ear headband on the head and a paw glove on each hand. Built from a few
// primitives, shared geometry and one material per colour.
import * as THREE from 'three';

const geoCache = {};
const geo = (key, make) => (geoCache[key] ||= make());
const matCache = {};
const mat = (hex) => (matCache[hex] ||= new THREE.MeshLambertMaterial({ color: hex }));

// The headband and ears, in the chibi head's units (head ~0.65 m wide,
// centre at 0, crown at y ≈ 0.33, face towards +z). a: the accessory.
const W = 0.93; // the band's width against its height (1: round)
const R = 0.37; // the band's radius
// How much narrower the band is at height y: W at the top, and the ends
// pulled in a further 7.5% at the bottom, hugging the sides of the head.
const narrow = (y) => W * (1 - 0.075 * (1 - Math.min(1, Math.max(0, y) / R)));
export function makeEars(a) {
  const g = new THREE.Group();
  g.position.y = -0.015; // sits a little down the crown, not perched on top
  const m = mat(a.color), inner = mat(a.inner), band = mat(a.band);
  // The band: a thin arch over the crown from ear to ear, narrower than
  // it is tall, most of all at the ends, which tuck in at the sides of the head.
  const arch = new THREE.Mesh(geo('earBand', () => bandGeometry()), band);
  arch.position.set(0, -0.01, 0.04);
  arch.rotation.x = -0.18;
  g.add(arch);
  for (const sgn of [-1, 1]) {
    const e = new THREE.Group();
    if (a.animal === 'cat') {
      // Pointed triangles, tipped out a little.
      e.position.set(0.2 * narrow(0.38) * sgn, 0.38, 0.02);
      e.rotation.z = -0.35 * sgn;
      const outer = new THREE.Mesh(geo('catEar', () => new THREE.ConeGeometry(0.13, 0.22, 4).rotateY(Math.PI / 4).scale(1, 1, 0.45)), m);
      const pink = new THREE.Mesh(geo('catEarIn', () => new THREE.ConeGeometry(0.08, 0.14, 4).rotateY(Math.PI / 4).scale(1, 1, 0.3)), inner);
      pink.position.set(0, -0.02, 0.03);
      e.add(outer, pink);
    } else if (a.animal === 'bunny') {
      // Long upright ears, leaning apart.
      e.position.set(0.13 * narrow(0.5) * sgn, 0.5, 0);
      e.rotation.z = -0.22 * sgn;
      const outer = new THREE.Mesh(geo('bunnyEar', () => new THREE.CapsuleGeometry(0.055, 0.24, 4, 10).scale(1, 1, 0.5)), m);
      const pink = new THREE.Mesh(geo('bunnyEarIn', () => new THREE.CapsuleGeometry(0.03, 0.18, 4, 8).scale(1, 1, 0.3)), inner);
      pink.position.set(0, 0, 0.02);
      e.add(outer, pink);
    } else if (a.animal === 'dog') {
      // Floppy ears hanging down beside the head.
      e.position.set(0.37 * narrow(0.2) * sgn, 0.2, 0.02);
      e.rotation.z = 0.25 * sgn;
      const outer = new THREE.Mesh(geo('dogEar', () => new THREE.SphereGeometry(0.12, 12, 10).scale(0.6, 1.35, 0.45)), m);
      outer.position.y = -0.04;
      e.add(outer);
      // A darker patch inside, facing the head.
      const patch = new THREE.Mesh(geo('dogEarIn', () => new THREE.SphereGeometry(0.07, 10, 8).scale(0.5, 1.2, 0.3)), inner);
      patch.position.set(-0.012 * sgn, -0.05, 0);
      e.add(patch);
    } else { // panda: round ears
      e.position.set(0.24 * narrow(0.34) * sgn, 0.34, 0.01);
      const outer = new THREE.Mesh(geo('pandaEar', () => new THREE.SphereGeometry(0.1, 14, 10).scale(1, 1, 0.55)), m);
      e.add(outer);
    }
    g.add(e);
  }
  return g;
}

function bandGeometry() {
  const g = new THREE.TorusGeometry(R, 0.02, 6, 24, Math.PI);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * narrow(p.getY(i)));
  g.computeVertexNormals();
  return g;
}

// One paw glove, in metres, for a hand bone: a round mitten in the animal's
// colour with a pad and three toe beans on the palm side.
export function makePaw(a) {
  const g = new THREE.Group();
  g.scale.setScalar(1.35);
  const mitt = new THREE.Mesh(geo('pawMitt', () => new THREE.SphereGeometry(0.06, 14, 10).scale(1, 1.1, 0.85)), mat(a.color));
  g.add(mitt);
  const pad = mat(a.pad);
  const big = new THREE.Mesh(geo('pawPad', () => new THREE.SphereGeometry(0.024, 10, 8).scale(1.2, 1, 0.45)), pad);
  big.position.set(0, -0.008, 0.05);
  g.add(big);
  const bean = geo('pawBean', () => new THREE.SphereGeometry(0.012, 8, 6).scale(1, 1, 0.5));
  for (const [x, y] of [[-0.024, 0.03], [0, 0.038], [0.024, 0.03]]) {
    const b = new THREE.Mesh(bean, pad);
    b.position.set(x, y, 0.046);
    g.add(b);
  }
  return g;
}
