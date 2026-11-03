// Things a character can hold in the right hand (others see them too).
// Sizes are in metres; the caller scales them to the hand they sit in.
import * as THREE from 'three';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

export const HELD_KINDS = ['coffee', 'rod', 'book'];
export const COFFEE_SIPS = 5; // taps to finish a cup

// A META COFFEE takeaway cup: white cup, black sleeve, black lid.
export function makeHeld(kind) {
  const g = new THREE.Group();
  g.name = 'held:' + kind;
  if (kind === 'coffee') {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.12, 14), mat('#fbfaf6'));
    cup.position.y = 0.06;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.0425, 0.037, 0.05, 14), mat('#1d1d22'));
    sleeve.position.y = 0.055;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.016, 14), mat('#1d1d22'));
    lid.position.y = 0.126;
    const sip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.02), mat('#fbfaf6'));
    sip.position.set(0, 0.136, 0.025);
    g.add(cup, sleeve, lid, sip);
  } else if (kind === 'rod') {
    // A fishing rod tilted forward over the water, with a reel and a line.
    const rod = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.014, 1.5, 8), mat('#2b3a4a'));
    pole.position.y = 0.6;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.22, 8), mat('#b5462f'));
    grip.position.y = -0.05;
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 12), mat('#c9cdd2'));
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0.03, 0.08, 0);
    rod.add(pole, grip, reel);
    rod.rotation.x = 0.95; // lean forward, over the water
    // The line hangs straight down from the tip (1.35 m up the tilted pole).
    const tipY = 1.35 * Math.cos(0.95), tipZ = 1.35 * Math.sin(0.95);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 4), mat('#f2f2f2'));
    line.position.set(0, tipY - 0.5, tipZ);
    const wrap = new THREE.Group();
    wrap.scale.setScalar(0.55); // the hand scales held things up 1.8x
    wrap.add(rod, line);
    g.add(wrap);
  } else if (kind === 'book') {
    // A hardback held upright: cover, pages and a spine band.
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.12), mat('#3f6e8c'));
    cover.position.y = 0.08;
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.15, 0.112), mat('#fbf7ec'));
    pages.position.set(0, 0.08, 0.006);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.02, 0.122), mat('#d4a73a'));
    band.position.y = 0.12;
    g.add(cover, pages, band);
  }
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

// An open umbrella held over the head (bought at the convenience store).
// Life size, in the character's own space: the canopy sits above the head.
export function makeUmbrella(color = '#4f7fd6') {
  const g = new THREE.Group();
  g.name = 'umbrella';
  const ribs = 8;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.26, ribs, 1, true), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, flatShading: true }));
  canopy.position.y = 1.0;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), mat('#d9dde2'));
  tip.position.y = 1.17;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), mat('#d9dde2'));
  pole.position.y = 0.5;
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 10, Math.PI), mat('#3b2a22'));
  hook.position.set(0.04, 0.0, 0);
  hook.rotation.z = Math.PI;
  g.add(canopy, tip, pole, hook);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}
