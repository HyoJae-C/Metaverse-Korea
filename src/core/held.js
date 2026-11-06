// Things a character can hold in the right hand (others see them too).
// Sizes are in metres; the caller scales them to the hand they sit in.
import * as THREE from 'three';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

export const HELD_KINDS = ['coffee', 'rod', 'book', 'food', 'glass', 'gift', 'perfume', 'spear'];
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
  } else if (kind === 'glass') {
    // A drink from the bar or a club: a tall glass with a straw and a lemon.
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.034, 0.13, 14), new THREE.MeshLambertMaterial({ color: '#dff1f8', transparent: true, opacity: 0.55 }));
    glass.position.y = 0.065;
    const drink = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.031, 0.09, 14), mat('#ff8a5c'));
    drink.position.y = 0.05;
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), mat('#ff4f9a'));
    straw.position.set(0.015, 0.11, 0);
    straw.rotation.z = -0.25;
    const lemon = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.006, 12), mat('#ffe066'));
    lemon.position.set(-0.03, 0.125, 0);
    lemon.rotation.z = Math.PI / 2;
    g.add(glass, drink, straw, lemon);
  } else if (kind === 'spear') {
    // A gate guard's spear (창) with a red tassel, held upright.
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.95, 8), mat('#6b4426'));
    shaft.position.y = 0.3;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.09, 6), mat('#d7dde2'));
    blade.position.y = 0.82;
    const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat('#d23a3a'));
    tassel.position.y = 0.76; tassel.scale.set(1, 1.6, 1);
    g.add(shaft, blade, tassel);
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
  } else if (kind === 'food') {
    // A takeout box: kraft paper box with a lid flap and a little sticker.
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.09), mat('#c99a63'));
    box.position.y = 0.035;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.012, 0.095), mat('#b5854f'));
    lid.position.y = 0.076;
    const sticker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.04), mat('#e8473b'));
    sticker.position.y = 0.083;
    g.add(box, lid, sticker);
  } else if (kind === 'perfume') {
    // A perfume bottle: square glass, pink juice, a gold collar and a cap.
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.035), new THREE.MeshLambertMaterial({ color: '#f4eef8', transparent: true, opacity: 0.6 }));
    glass.position.y = 0.035;
    const juice = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.026), mat('#ff9ccf'));
    juice.position.y = 0.028;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 10), mat('#d4a73a'));
    collar.position.y = 0.076;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), mat('#2b2230'));
    cap.position.y = 0.097;
    g.add(glass, juice, collar, cap);
  } else if (kind === 'gift') {
    // A paper shopping bag with rope handles (something bought in a shop).
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.12), mat('#fff6ee'));
    bag.position.y = -0.04;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.03, 0.122), mat('#ff8fa3'));
    band.position.y = -0.01;
    g.add(bag, band);
    for (const z of [-0.03, 0.03]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 4, 10, Math.PI), mat('#c98a5a'));
      h.rotation.y = Math.PI / 2;
      h.position.set(0, 0.025, z);
      g.add(h);
    }
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
