// Things a character can hold in the right hand (others see them too).
// Sizes are in metres; the caller scales them to the hand they sit in.
import * as THREE from 'three';
import { rodSkin } from './rod-skins.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
// A lit-from-within look for the fancy rod skins (gold shines, aurora glows).
const glowMat = (c, k) => (mats[c + k] ||= new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: k }));

// 'rod:gold' → 'rod' (any skin is still a rod).
export const heldBase = (kind) => (typeof kind === 'string' ? kind.split(':')[0] : null);

export const HELD_KINDS = ['coffee', 'rod', 'book', 'food', 'glass', 'gift', 'perfume', 'spear'];
export const COFFEE_SIPS = 5; // taps to finish a cup

// A META COFFEE takeaway cup: white cup, black sleeve, black lid.
export function makeHeld(kind) {
  const g = new THREE.Group();
  g.name = 'held:' + kind;
  const skin = rodSkin(String(kind).split(':')[1]);
  kind = heldBase(kind);
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
    const k = skin.glow ? 0.6 : skin.shine ? 0.25 : 0;
    const sm = (c) => (k ? glowMat(c, k) : mat(c));
    // A fishing rod tilted forward over the water, with a reel and a line.
    // The pole is three jointed pieces so it can bend (fishing-rig.js casts
    // it, bends it on a bite and spins the reel); userData.rod has the parts.
    const rod = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.22, 8), mat(skin.grip));
    grip.position.y = -0.05;
    const reel = new THREE.Group(); // spins about its axle (x)
    reel.position.set(0.04, 0.08, 0);
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 12), sm(skin.reel));
    spool.rotation.z = Math.PI / 2;
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.045), mat('#2b2230'));
    knob.position.set(0.016, 0, 0.022);
    reel.add(spool, knob);
    rod.add(grip, reel);
    const segs = [];
    let joint = rod;
    for (let i = 0; i < 3; i++) {
      const j = new THREE.Group();
      j.position.y = i ? 0.5 : -0.15;
      const r0 = 0.014 - i * 0.0027, r1 = 0.014 - (i + 1) * 0.0027;
      const piece = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 0.5, 8), sm(i === 2 ? skin.tip : skin.pole));
      piece.position.y = 0.25;
      j.add(piece);
      joint.add(j);
      segs.push(j);
      joint = j;
    }
    const tip = new THREE.Object3D();
    tip.position.y = 0.5;
    joint.add(tip);
    rod.rotation.x = 0.95; // lean forward, over the water
    // The line hangs straight down from the tip (1.35 m up the tilted pole).
    const tipY = 1.35 * Math.cos(0.95), tipZ = 1.35 * Math.sin(0.95);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 4), mat(skin.line));
    line.position.set(0, tipY - 0.5, tipZ);
    const wrap = new THREE.Group();
    wrap.scale.setScalar(0.55); // the hand scales held things up 1.8x
    wrap.add(rod, line);
    g.add(wrap);
    g.userData.rod = { pivot: rod, segs, tip, reel, line };
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
