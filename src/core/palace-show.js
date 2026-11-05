// Performances at Gyeongbokgung (district offsets from region.json):
//  - 부채춤: five dancers in hanbok doing the fan dance in the courtyard in
//    front of Geunjeongjeon, slowly turning in a circle.
//  - 봉산탈춤 + 사자탈: two mask dancers with long white sleeves and a big
//    two-person lion, in front of Gwanghwamun on the square.
// They only move while you're near (like the busking crowd).
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';

const NEAR = 110; // metres: closer than this, they perform
const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const ball = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(c));
  o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  return o;
};

// A Bongsan mask (봉산탈) in chibi head units (centre at the origin, ~0.65 m
// wide, facing +z): a red face covered in bumps, round white eyes with black
// pupils, bushy black brows, a wide grin, and a black cloth hood behind.
export function makeTalMask(face = '#c8323a') {
  const g = new THREE.Group();
  g.add(ball(0.5, '#1d1b22', 0, 0.04, -0.08, 1.02, 1.05, 0.95)); // hood
  g.add(ball(0.42, face, 0, 0, 0.12, 1, 1.12, 0.8));
  for (const [x, y] of [[-0.18, 0.28], [0.18, 0.28], [0, 0.36], [-0.3, 0.05], [0.3, 0.05], [-0.22, -0.2], [0.22, -0.2], [0, 0.18]]) g.add(ball(0.07, '#ffd34d', x, y, 0.38 + (0.1 - Math.abs(x) * 0.25)));
  for (const s of [-1, 1]) {
    g.add(ball(0.09, '#ffffff', 0.15 * s, 0.08, 0.42, 1, 1, 0.5));
    g.add(ball(0.045, '#1d1b22', 0.15 * s, 0.08, 0.465, 1, 1, 0.5));
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), mat('#1d1b22'));
    brow.position.set(0.16 * s, 0.2, 0.44); brow.rotation.z = -0.35 * s;
    g.add(brow);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 8, 16, Math.PI), mat('#1d1b22'));
  mouth.position.set(0, -0.12, 0.43); mouth.rotation.z = Math.PI;
  g.add(mouth);
  g.add(ball(0.06, '#a8242c', 0, -0.02, 0.48)); // nose
  g.scale.setScalar(1.05);
  g.position.y = 0.04;
  return g;
}

// 사자탈: a big shaggy lion played by two people (only their legs show).
function makeLion() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const fur = '#f2c84b';
  const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.3, 6, 12), mat(fur));
  back.rotation.x = Math.PI / 2; back.position.set(0, 1.0, -0.35);
  body.add(back);
  // shaggy stripes of colour down the sides
  for (let i = 0; i < 9; i++) {
    for (const s of [-1, 1]) {
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.16), mat(['#3f7fd0', '#e0662a', '#2a9b6a'][i % 3]));
      tuft.position.set(0.56 * s, 0.75, -1.1 + i * 0.2);
      tuft.rotation.z = 0.12 * s;
      body.add(tuft);
    }
  }
  const head = new THREE.Group();
  head.position.set(0, 1.25, 0.55);
  body.add(head);
  head.add(ball(0.62, '#ffd34d', 0, 0, -0.05, 1, 0.95, 0.8)); // mane
  for (let i = 0; i < 12; i++) { // mane tufts
    const a = (i / 12) * Math.PI * 2;
    head.add(ball(0.16, i % 2 ? '#ffb02e' : '#ffe08a', Math.cos(a) * 0.6, Math.sin(a) * 0.56, -0.05));
  }
  head.add(ball(0.42, '#fff4dc', 0, 0, 0.18, 1, 0.95, 0.85)); // face
  for (const s of [-1, 1]) {
    head.add(ball(0.12, '#ffffff', 0.17 * s, 0.12, 0.48));
    head.add(ball(0.06, '#1d1b22', 0.17 * s, 0.12, 0.58));
    head.add(ball(0.08, '#e0566b', 0.3 * s, -0.08, 0.44, 1, 0.6, 0.5)); // cheeks
  }
  head.add(ball(0.11, '#c8323a', 0, 0, 0.58));
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.2, 0.3);
  head.add(jaw);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.3), mat('#c8323a'));
  mouth.position.set(0, -0.04, 0.1);
  jaw.add(mouth);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), mat('#ffffff'));
  teeth.position.set(0, 0.02, 0.24);
  jaw.add(teeth);
  // four legs in baggy trousers: the two dancers inside
  const legs = [];
  for (const [x, z] of [[-0.22, 0.35], [0.22, 0.35], [-0.22, -0.95], [0.22, -0.95]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.62, z);
    const pant = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.55, 10), mat('#e8a93a'));
    pant.position.y = -0.27;
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.26), mat('#1d1b22'));
    shoe.position.set(0, -0.58, 0.04);
    leg.add(pant, shoe);
    root.add(leg);
    legs.push(leg);
  }
  root.userData = { body, head, jaw, legs };
  return root;
}

function performer(scene, look, activity, mask) {
  const ch = createCharacter({ ...randomLook(), ...look });
  if (mask) ch.setMascot(mask);
  ch.activity(activity);
  scene.add(ch.root);
  return ch;
}

const FAN_LOOKS = [
  { model: 'hanbok-pink', skirt: 'chima-navy' }, { model: 'hanbok-yellow', skirt: 'chima-red' }, { model: 'hanbok-mint', skirt: 'chima-pink' },
  { model: 'hanbok-yellow', skirt: 'chima-red' }, { model: 'hanbok-pink', skirt: 'chima-navy' },
];

export class PalaceShow {
  // fan: [x, z] centre of the fan dance; mask: [x, z] centre of the mask dance.
  constructor(scene, { fan, mask }) {
    this.fan = fan && {
      x: fan[0], z: fan[1],
      dancers: FAN_LOOKS.map((l) => performer(scene, { ...l, tee: null, hair: 'espresso' }, 'fan')),
    };
    this.mask = mask && {
      x: mask[0], z: mask[1],
      dancers: [performer(scene, { model: 'hanbok-baji', tee: null }, 'tal', makeTalMask('#c8323a')), performer(scene, { model: 'hanbok-durumagi', tee: null }, 'tal', makeTalMask('#f2ede0'))],
      lion: makeLion(),
    };
    if (this.mask) scene.add(this.mask.lion);
    this.t = 0;
  }
  // Where the performers are (for the debug hook / camera).
  spots() { return { fan: this.fan && [this.fan.x, this.fan.z], mask: this.mask && [this.mask.x, this.mask.z] }; }
  update(dt, me) {
    this.t += dt;
    const t = this.t;
    if (this.fan) {
      const on = Math.hypot(me.x - this.fan.x, me.z - this.fan.z) < NEAR;
      // A slow circle that opens wide and closes in, every dancer facing out.
      const r = 2.6 + 0.9 * Math.sin(t * 0.25), spin = t * 0.12;
      this.fan.dancers.forEach((ch, i) => {
        ch.root.visible = on;
        if (!on) return;
        const a = spin + (i / 5) * Math.PI * 2;
        ch.root.position.set(this.fan.x + Math.sin(a) * r, 0, this.fan.z + Math.cos(a) * r);
        ch.root.rotation.y = a;
        ch.animate(dt, 0);
      });
    }
    if (this.mask) {
      const on = Math.hypot(me.x - this.mask.x, me.z - this.mask.z) < NEAR;
      const { x, z, dancers, lion } = this.mask;
      dancers.forEach((ch, i) => {
        ch.root.visible = on;
        if (!on) return;
        const s = i ? 1 : -1;
        ch.root.position.set(x + s * 3.2 + Math.sin(t * 0.6 + i) * 0.8, 0, z + 1.5 + Math.cos(t * 0.5 + i) * 0.6);
        ch.root.rotation.y = Math.sin(t * 0.7 + i * 2) * 0.6; // mostly facing the square (+z)
        ch.animate(dt, 0);
      });
      lion.visible = on;
      if (on) {
        // The lion prowls a figure of eight between the two mask dancers.
        const a = t * 0.35;
        const lx = x + Math.sin(a) * 3.0, lz = z - 1 + Math.sin(a * 2) * 1.4;
        const dx = Math.cos(a) * 3.0, dz = Math.cos(a * 2) * 2.8;
        lion.position.set(lx, 0, lz);
        lion.rotation.y = Math.atan2(dx, dz);
        const { body, head, jaw, legs } = lion.userData;
        const step = t * 7;
        legs.forEach((l, k) => { l.rotation.x = Math.sin(step + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)) * 0.45; });
        body.position.y = Math.abs(Math.sin(step)) * 0.06;
        head.rotation.y = Math.sin(t * 1.3) * 0.45;
        head.rotation.x = Math.sin(t * 2.1) * 0.15;
        jaw.rotation.x = Math.max(0, Math.sin(t * 3.4)) * 0.45; // snap snap
      }
    }
  }
}
