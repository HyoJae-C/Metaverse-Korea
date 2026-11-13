// Things a character can hold in the right hand (others see them too).
// Sizes are in metres; the caller scales them to the hand they sit in.
import * as THREE from 'three';
import { rodSkin } from './rod-skins.js';
import { frisbeeColor } from './frisbee.js';
import { shadeHex } from './lipstick.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
// A lit-from-within look for the fancy rod skins (gold shines, aurora glows).
const glowMat = (c, k) => (mats[c + k] ||= new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: k }));

// 'rod:gold' → 'rod' (any skin is still a rod).
export const heldBase = (kind) => (typeof kind === 'string' ? kind.split(':')[0] : null);

export const HELD_KINDS = ['coffee', 'rod', 'book', 'food', 'glass', 'gift', 'perfume', 'spear', 'duckmold', 'balloon', 'lipstick'];
// Bag goods that are held as themselves, not in a shopping bag: the held
// kind is 'gift:<g>' (older clients still see 'gift', a shopping bag).
export const GIFT_LOOKS = ['frisbee', 'mat', 'ramyeon', 'egg', 'kimchi', 'japchae', 'kimbap', 'tteok', 'bibimbap'];
// (a frisbee also carries its colour: 'gift:frisbee.2')
export const giftKind = (e) => (!GIFT_LOOKS.includes(e?.g) ? 'gift' : e.g === 'frisbee' ? `gift:frisbee.${(e.q | 0) % 3}` : 'gift:' + e.g);
export const COFFEE_SIPS = 5; // taps to finish a cup

// Modu Land's food truck snacks (park-food.js): an ice cream cone, a
// churro, a hot dog, in metres at hand size (the trucks scale them up).
export const SNACKS = ['icecream', 'churro', 'hotdog'];
export function snackModel(id) {
  const g = new THREE.Group();
  const part = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  if (id === 'icecream') {
    part(new THREE.ConeGeometry(0.04, 0.12, 10).rotateX(Math.PI), '#c98b4f', 0, 0.06, 0);
    part(new THREE.SphereGeometry(0.045, 10, 8), '#fffaf3', 0, 0.13, 0);
    part(new THREE.SphereGeometry(0.035, 10, 8), '#ff8fb8', 0, 0.18, 0);
  } else if (id === 'churro') {
    const c = part(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8), '#c98b4f', 0, 0.12, 0);
    c.rotation.z = 0.12;
    part(new THREE.CylinderGeometry(0.03, 0.026, 0.07, 10), '#fffaf3', 0, 0.035, 0); // paper sleeve
  } else {
    part(new THREE.CapsuleGeometry(0.03, 0.14, 4, 10).rotateZ(Math.PI / 2), '#ffd36e', 0, 0.03, 0); // the bun
    part(new THREE.CapsuleGeometry(0.018, 0.17, 4, 8).rotateZ(Math.PI / 2), '#ff5a5f', 0, 0.055, 0); // the sausage
    part(new THREE.BoxGeometry(0.15, 0.006, 0.012), '#ffe27a', 0, 0.075, 0); // mustard
  }
  return g;
}

// Balloon art from Modu Land's clown (game/balloon-clown.js): a sword or
// a dog in the hand, a crown worn on the head ('balloon:crown'). Twisted
// glossy sausages of latex, in metres (the crown in the head's own units).
export const BALLOONS = ['sword', 'dog', 'crown'];
const glossy = (c) => (mats['b' + c] ||= new THREE.MeshPhongMaterial({ color: c, shininess: 90, specular: 0x666666 }));
function sausage(g, c, len, r, x, y, z, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), glossy(c));
  m.position.set(x, y, z);
  m.rotation.set(rx, 0, rz);
  g.add(m);
  return m;
}
function balloonLook(g, sub) {
  if (sub === 'sword') {
    sausage(g, '#8fd0ff', 0.42, 0.018, 0, 0.3, 0); // the blade
    sausage(g, '#ffe27a', 0.1, 0.02, 0, 0.06, 0, 0, Math.PI / 2); // the guard
    sausage(g, '#ffe27a', 0.05, 0.02, 0, 0.02, 0); // the grip
  } else if (sub === 'dog') {
    const c = '#ff8fb8';
    sausage(g, c, 0.08, 0.026, 0, 0.12, 0, Math.PI / 2); // body
    for (const z of [-0.05, 0.05]) for (const x of [-0.025, 0.025]) sausage(g, c, 0.04, 0.02, x, 0.08, z); // legs
    sausage(g, c, 0.03, 0.026, 0, 0.18, 0.07); // neck
    sausage(g, c, 0.03, 0.024, 0, 0.21, 0.1, Math.PI / 2); // snout
    for (const x of [-0.03, 0.03]) sausage(g, c, 0.035, 0.018, x, 0.24, 0.07, 0, x * 8); // ears
    sausage(g, c, 0.035, 0.016, 0, 0.17, -0.08, -0.6); // tail
    g.position.y = 0.0;
  } else {
    // The crown: a band round the head and five upright loops, a ball on each.
    const cols = ['#ff5f9e', '#ffe27a', '#8fe3c7', '#c9a8ff', '#8fd0ff'];
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.04, 8, 24), glossy('#ffd23a'));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.22;
    g.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 14), glossy(cols[i]));
      loop.position.set(Math.sin(a) * 0.3, 0.32, Math.cos(a) * 0.3);
      loop.rotation.y = a;
      g.add(loop);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), glossy(cols[(i + 2) % 5]));
      ball.position.set(Math.sin(a) * 0.3, 0.44, Math.cos(a) * 0.3);
      g.add(ball);
    }
    g.userData.onHead = true;
  }
  return g;
}

// A META COFFEE takeaway cup: white cup, black sleeve, black lid.
export function makeHeld(kind) {
  const g = new THREE.Group();
  g.name = 'held:' + kind;
  const sub = String(kind).split(':')[1];
  const skin = rodSkin(sub);
  kind = heldBase(kind);
  if (kind === 'gift' && GIFT_LOOKS.includes(String(sub).split('.')[0])) return giftLook(g, sub);
  if (kind === 'food' && SNACKS.includes(sub)) { const m = snackModel(sub); m.name = g.name; return m; }
  if (kind === 'balloon') return balloonLook(g, sub);
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
  } else if (kind === 'duckmold') {
    // A snow duck maker (눈오리 집게): two yellow plastic arms on a hinge,
    // a duck-shaped cup at the end of each; squeeze snow between them.
    const y = mat('#ffcf3a'), o = mat('#ff9a2e');
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.2, 0.02), y);
      arm.position.set(sx * 0.018, 0.1, 0);
      arm.rotation.z = -sx * 0.06;
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI), y); // half a duck's body
      cup.scale.set(1, 0.8, 1.25);
      cup.rotation.y = sx * Math.PI / 2;
      cup.position.set(sx * 0.03, 0.23, 0.01);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 6, 0, Math.PI), y);
      head.rotation.y = sx * Math.PI / 2;
      head.position.set(sx * 0.03, 0.27, 0.045);
      g.add(arm, cup, head);
    }
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8).rotateZ(Math.PI / 2), o);
    hinge.position.y = 0.01;
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 6).rotateX(Math.PI / 2), o);
    beak.position.set(0, 0.268, 0.085);
    g.add(hinge, beak);
  } else if (kind === 'spear') {
    // A gate guard's spear (창) with a red tassel, held upright.
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.95, 8), mat('#6b4426'));
    shaft.position.y = 0.3;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.09, 6), mat('#d7dde2'));
    blade.position.y = 0.82;
    const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat('#d23a3a'));
    tassel.position.y = 0.76; tassel.scale.set(1, 1.6, 1);
    g.add(shaft, blade, tassel);
  } else if (kind === 'bat') {
    // A baseball bat (the batters at Modu Ballpark), held upright.
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.013, 0.62, 10), mat('#c99a5b'));
    bat.position.y = 0.3;
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), mat('#3b2418'));
    knob.position.y = -0.01;
    g.add(bat, knob);
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
  } else if (kind === 'lipstick') {
    // A lipstick ('lipstick:<shade>'): a black case, a gold collar and the
    // bullet in its colour, slanted at the tip.
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 12), mat('#1d1d22'));
    tube.position.y = 0.03;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.014, 12), mat('#d4a73a'));
    collar.position.y = 0.067;
    const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.0105, 0.026, 12), mat(shadeHex(sub)));
    bullet.position.y = 0.087;
    bullet.rotation.z = 0.12;
    g.add(tube, collar, bullet);
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

// Bag goods as themselves in the hand (GIFT_LOOKS).
function giftLook(g, sub) {
  g.name = 'held:gift:' + sub;
  const add = (geo, color, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); g.add(m); return m; };
  const [base, variant] = sub.split('.');
  if (base === 'frisbee') { // held upright by its rim (game/frisbee.js), in its colour
    add(new THREE.CylinderGeometry(0.12, 0.11, 0.02, 20).rotateZ(Math.PI / 2), frisbeeColor({ q: +variant || 0 }), 0, 0.06);
    add(new THREE.TorusGeometry(0.105, 0.0035, 4, 24).rotateY(Math.PI / 2), '#ffffff', 0.011, 0.06); // a thin white line on the face
  } else if (sub === 'mat') { // a rolled-up picnic mat with two white straps, carried across
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 12).rotateX(Math.PI / 2), '#3f7fd0', 0, 0.02);
    for (const z of [-0.09, 0.09]) add(new THREE.CylinderGeometry(0.054, 0.054, 0.025, 12).rotateX(Math.PI / 2), '#f4f8ff', 0, 0.02, z);
  } else if (sub === 'ramyeon') { // an instant-noodle pack: a red pillow bag with a yellow label
    add(new THREE.BoxGeometry(0.03, 0.12, 0.15), '#d8452f', 0, 0.02);
    add(new THREE.BoxGeometry(0.032, 0.06, 0.07), '#ffd166', 0, 0.03, 0.02);
  } else if (sub === 'egg') { // one egg
    add(new THREE.SphereGeometry(0.03, 10, 8).scale(1, 1.3, 1), '#fff6e6', 0, 0.04);
  } else if (sub === 'kimchi') { // a glass jar of homemade kimchi with a lid
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 14), '#c8392b', 0, 0.05);
    add(new THREE.CylinderGeometry(0.047, 0.047, 0.02, 14), '#2f6f4f', 0, 0.11);
  } else if (sub === 'tteok') { // a little wooden box of songpyeon: white, green and pink half-moons
    add(new THREE.BoxGeometry(0.11, 0.035, 0.11), '#b88a5a', 0, 0.018);
    ['#f6f1e6', '#8fbf6a', '#f2b8c6'].forEach((c, k) => add(new THREE.SphereGeometry(0.022, 8, 6).scale(1.3, 0.7, 0.8), c, -0.03 + k * 0.03, 0.045));
  } else if (sub === 'bibimbap') { // a brass bowl with coloured toppings and an egg on top
    add(new THREE.CylinderGeometry(0.065, 0.045, 0.05, 16), '#c9a227', 0, 0.025);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 16), '#d9402c', 0, 0.052);
    add(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 12), '#ffd23a', 0, 0.058);
  } else { // japchae, kimbap: a homemade lunch box (dosirak) with a cloth knot
    add(new THREE.BoxGeometry(0.1, 0.06, 0.13), sub === 'kimbap' ? '#2b3a2b' : '#c98a3e', 0, 0.03);
    add(new THREE.BoxGeometry(0.105, 0.012, 0.135), '#f4d35e', 0, 0.066);
    add(new THREE.SphereGeometry(0.02, 8, 6), '#f4d35e', 0, 0.08);
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
