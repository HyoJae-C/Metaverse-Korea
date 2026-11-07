// Performances at Gyeongbokgung (district offsets from region.json):
//  - 부채춤: twenty dancers in hanbok doing the fan dance in the courtyard
//    in front of Geunjeongjeon, in two rings turning opposite ways.
//  - 봉산탈춤 + 사자탈: two mask dancers with long white sleeves and a big
//    two-person lion, on the square near King Sejong's statue.
//  - 줄타기: a tightrope master crossing a rope beside the mask dance.
//  - 수문장: gate guards in front of Gwanghwamun, with lines when greeted.
//  - 어가 행렬: the king, a eunuch with his parasol and four court ladies
//    walking from stop to stop round the palace, pausing for photos.
// A rope ring round the fan dance keeps visitors from walking into it.
// They only move while you're near (like the busking crowd).
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';
import { DANCER_CHIMAS } from '../data/skirts.js';
import { makeNpc, say } from './npcs.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const NEAR = 110; // metres: closer than this, they perform

// The fan dance is a group dance (군무): the formation matters, so a rope
// ring keeps visitors this far from its centre (main.js makes it a blocker).
export const FAN_KEEP = 10;
// A circle as a polygon (for the collision map).
export function ringPoly(x, z, r, n = 24) {
  return Array.from({ length: n }, (_, i) => [x + Math.sin((i / n) * Math.PI * 2) * r, z + Math.cos((i / n) * Math.PI * 2) * r]);
}

// The royal procession (어가 행렬): the king with a eunuch holding his
// parasol, and court ladies before and behind, walking round the palace.
// Stops and the paths between them, in the palace district's metres (x
// east, z south; Gwanghwamun at (0, 0)). Every path keeps clear of the halls,
// the walls and the fan dance's rope ring.
export const ROYAL_ROUTE = {
  stops: [
    [0, -45], // 0 the front court, between Gwanghwamun and Heungnyemun
    [0, -104], // 1 just inside Heungnyemun
    [-40, -118], [40, -118], // 2, 3 the lower courtyard
    [-45, -185], [45, -185], // 4, 5 either side of Geunjeongjeon
    [-45, -262], [45, -262], [0, -262], // 6, 7, 8 behind the hall
    [-110, -45], [-160, -150], [-160, -310], [-110, -345], [-20, -355], // 9-13 round the west side, by the pond
    [60, -45], // 14 the east of the front court
  ],
  links: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [12, 13], [0, 14]],
};
export const ROYAL_PAUSE = 10; // seconds standing still at each stop (for photos)
const ROYAL_SPEED = 1.1; // m/s, a stately walk
// Who walks where: metres behind the front of the procession, and to the side.
const ROYAL_ORDER = [
  { who: 'lady', back: 0, side: -0.9 }, { who: 'lady', back: 0, side: 0.9 },
  { who: 'king', back: 2.4, side: 0 },
  { who: 'eunuch', back: 3.9, side: 0 },
  { who: 'lady', back: 5.5, side: -0.9 }, { who: 'lady', back: 5.5, side: 0.9 },
];
// The next stop: a random neighbour, not straight back unless it's a dead end.
export function nextStop(route, at, prev, rand = Math.random) {
  const near = route.links.filter((l) => l.includes(at)).map((l) => (l[0] === at ? l[1] : l[0]));
  const ahead = near.filter((n) => n !== prev);
  const list = ahead.length ? ahead : near;
  return list[Math.floor(rand() * list.length) % list.length];
}
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
  const fur = '#eeede8'; // white with grey tufts
  const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.3, 6, 12), mat(fur));
  back.rotation.x = Math.PI / 2; back.position.set(0, 1.0, -0.35);
  body.add(back);
  // shaggy stripes of colour down the sides
  for (let i = 0; i < 9; i++) {
    for (const s of [-1, 1]) {
      const tuft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.16), mat(['#f7f6f2', '#9b9b98', '#c8c7c2'][i % 3]));
      tuft.position.set(0.56 * s, 0.75, -1.1 + i * 0.2);
      tuft.rotation.z = 0.12 * s;
      body.add(tuft);
    }
  }
  const head = new THREE.Group();
  head.position.set(0, 1.25, 0.55);
  body.add(head);
  head.add(ball(0.62, '#f4f3ef', 0, 0, -0.05, 1, 0.95, 0.8)); // mane
  for (let i = 0; i < 12; i++) { // mane tufts
    const a = (i / 12) * Math.PI * 2;
    head.add(ball(0.16, i % 2 ? '#a3a39f' : '#fbfaf6', Math.cos(a) * 0.6, Math.sin(a) * 0.56, -0.05));
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
    const pant = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.55, 10), mat('#8f8f8c'));
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

// 줄타기 rig: an A-frame trestle at each end and the rope between, along x.
const ROPE = { len: 11, h: 2.6 };
function makeRopeRig() {
  const g = new THREE.Group();
  const wood = mat('#8a5a34');
  for (const sx of [-1, 1]) {
    for (const lean of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, ROPE.h + 0.5, 8), wood);
      leg.position.set(sx * ROPE.len / 2, (ROPE.h + 0.3) / 2, 0);
      leg.rotation.x = lean * 0.32;
      g.add(leg);
    }
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), mat('#e6dccb'));
    stake.position.set(sx * (ROPE.len / 2 + 1.1), ROPE.h / 2, 0);
    stake.rotation.z = sx * 0.85; // guy rope down to the ground
    g.add(stake);
  }
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, ROPE.len, 6), mat('#b89a6a'));
  line.rotation.z = Math.PI / 2;
  line.position.y = ROPE.h;
  g.add(line);
  return g;
}

function performer(scene, look, activity, mask) {
  const ch = createCharacter({ ...randomLook(), ...look });
  if (mask) ch.setMascot(mask);
  ch.activity(activity);
  scene.add(ch.root);
  return ch;
}

// Twenty fan dancers, black hair, each in her own chima colour; the
// jeogori (tops) take turns. Inner ring of 8, outer ring of 12.
const TOPS = ['hanbok-pink', 'hanbok-yellow', 'hanbok-mint'];
const FAN_LOOKS = Object.keys(DANCER_CHIMAS).map((skirt, i) => ({ model: TOPS[i % 3], skirt, tee: null, hair: 'black', dye: 'black' }));
const RINGS = [{ n: 8, r: 3.2, dir: 1 }, { n: 12, r: 6.4, dir: -1 }];

// Gate guards (수문장) in front of Gwanghwamun: a red robe, a black
// brimmed hat with a red tassel and a spear. Tap to hear a line.
const GUARD_LINES = [
  ['어서 오시오! 여기는 광화문이오.', 'eoseo osio! yeogineun gwanghwamunieyo.', 'Welcome! This is Gwanghwamun.'],
  ['근정전 앞마당에서 부채춤 공연이 한창이오.', 'geunjeongjeon apmadangeseo buchaechum gongyeoni hanchangio.', 'The fan dance is on in front of Geunjeongjeon.'],
  ['흥례문을 지나면 스탬프대가 있소. 꼭 찍고 가시오!', 'heungnyemuneul jinamyeon seutaempeudaega isso.', 'Past Heungnyemun there is a stamp stand. Do get one!'],
  ['광장에서는 탈춤과 사자춤이 벌어지고 있소.', 'gwangjangeseoneun talchumgwa sajachumi beoreojigo isso.', 'There is a mask dance and a lion dance on the square.'],
  ['수상한 자는 들이지 않소. 그대는 괜찮소!', 'susanghan janeun deuriji anso. geudaeneun gwaenchanso!', 'No suspicious folk allowed. You are fine!'],
  ['한복을 입으면 궁궐이 더 잘 어울린다오.', 'hanbogeul ibeumyeon gunggwori deo jal eoullindao.', 'The palace suits you even better in hanbok.'],
];
// A gat (갓): the black horsehair hat with a wide brim.
function gatHat() {
  const g = new THREE.Group();
  const black = mat('#1d1b22');
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.025, 22), black);
  brim.position.y = 0.3;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.32, 16), black);
  crown.position.y = 0.47;
  g.add(brim, crown);
  return g;
}
function guardHat() {
  const g = new THREE.Group();
  const black = mat('#1d1b22');
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.035, 20), black);
  brim.position.y = 0.3;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.26, 16), black);
  crown.position.y = 0.44;
  g.add(brim, crown, ball(0.07, '#d23a3a', 0, 0.6, 0), ball(0.1, '#d23a3a', 0, 0.53, 0, 1.2, 0.5, 1.2));
  return g;
}
function guardRobe() {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.3, 0.46, 14), mat('#c8463c'));
  robe.position.y = 0.38;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.24, 0.05, 14), mat('#1d1b22'));
  belt.position.y = 0.46;
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.26, 0.2, 14), mat('#2f3c66'));
  vest.position.y = 0.55;
  g.add(robe, belt, vest);
  return g;
}

// The king's ikseongwan (익선관): a round black cap with two little wings
// standing up at the back; the gold dragon roundel (흉배) on his chest.
function ikseongwan() {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#1d1b22'));
  cap.position.y = 0.1;
  g.add(cap, ball(0.47, '#1d1b22', 0, 0.12, -0.08, 1, 0.35, 1));
  for (const s of [-1, 1]) g.add(ball(0.11, '#1d1b22', 0.15 * s, 0.6, -0.26, 0.8, 1.25, 0.45));
  return g;
}
function roundel() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), mat('#e2b443'));
  disc.position.set(0, 0.5, 0.26);
  const dragon = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), mat('#c23a33'));
  dragon.position.set(0, 0.5, 0.262);
  g.add(disc, dragon);
  return g;
}
// The eunuch's samo (사모): a black cap with two flat wings out to the sides.
function samo() {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#1d1b22'));
  cap.position.y = 0.1;
  g.add(cap);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.13, 0.02), mat('#1d1b22'));
    wing.position.set(0.55 * s, 0.38, -0.2);
    g.add(wing);
  }
  return g;
}
// The red royal parasol (일산) the eunuch holds up over the king ahead.
function parasol() {
  const g = new THREE.Group();
  const lean = 0.5;
  const pole = new THREE.Group();
  pole.position.set(0.22, 0.35, 0.15);
  pole.rotation.x = lean;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6), mat('#6b3a1f'));
  stick.position.y = 1.15;
  const top = new THREE.Group();
  top.position.y = 2.3;
  top.rotation.x = -lean;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.3, 16, 1, true), mat('#c23a33'));
  canopy.material.side = THREE.DoubleSide;
  const fringe = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.22, 16, 1, true), mat('#e2b443'));
  fringe.material.side = THREE.DoubleSide;
  fringe.position.y = -0.24;
  top.add(canopy, fringe);
  pole.add(stick, top);
  g.add(pole);
  return g;
}
// The rope ring round the fan dance: short red posts and a rope between.
function ropeRing(r) {
  const geos = { post: [], rope: [] }, n = 20;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2;
    geos.post.push(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 8).translate(Math.sin(a) * r, 0.45, Math.cos(a) * r));
    const mx = (Math.sin(a) + Math.sin(b)) / 2 * r, mz = (Math.cos(a) + Math.cos(b)) / 2 * r, len = 2 * r * Math.sin(Math.PI / n);
    geos.rope.push(new THREE.CylinderGeometry(0.025, 0.025, len, 5).rotateZ(Math.PI / 2).rotateY((a + b) / 2).translate(mx, 0.78, mz));
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeGeometries(geos.post), mat('#8a2f2a')), new THREE.Mesh(mergeGeometries(geos.rope), mat('#d9b46a')));
  return g;
}

export class PalaceShow {
  // fan: [x, z] centre of the fan dance; mask: [x, z] centre of the mask dance.
  // fan: [x, z] centre of the fan dance; mask: [x, z] centre of the mask
  // dance; guards: [[x, z, ry], ...] gate guards; layer: name tags.
  // rope: [x, z] middle of the tightrope (runs along x).
  // procession: [x, z] the palace district's offset (ROYAL_ROUTE is in its metres).
  constructor(scene, { fan, mask, rope, guards = [], procession = null, layer = null }) {
    this.layer = layer;
    if (fan) {
      const ring = ropeRing(FAN_KEEP);
      ring.position.set(fan[0], 0, fan[1]);
      scene.add(ring);
    }
    if (procession && layer) this.royal = this.makeProcession(scene, procession);
    if (rope) {
      const rig = makeRopeRig();
      rig.position.set(rope[0], 0, rope[1]);
      scene.add(rig);
      // the master: white robe (durumagi), a black gat, a fan
      const walker = performer(scene, { model: 'hanbok-durumagi-white', tee: null, hair: 'black', dye: 'black' }, 'rope');
      walker.addProp('head', gatHat());
      this.rope = { x: rope[0], z: rope[1], rig, walker };
    }
    this.fan = fan && {
      x: fan[0], z: fan[1],
      dancers: FAN_LOOKS.map((l) => performer(scene, l, 'fan')),
    };
    this.mask = mask && {
      x: mask[0], z: mask[1],
      dancers: [performer(scene, { model: 'hanbok-baji', tee: null }, 'tal', makeTalMask('#c8323a')), performer(scene, { model: 'hanbok-durumagi', tee: null }, 'tal', makeTalMask('#f2ede0'))],
      lion: makeLion(),
    };
    if (this.mask) scene.add(this.mask.lion);
    this.guards = layer ? guards.map(([x, z, ry]) => {
      const o = makeNpc(layer, '💂 수문장', { ...randomLook(), model: 'basic', pants: 'black', hair: 'black', dye: 'black', tee: null });
      o.ch.addProp('head', guardHat());
      o.ch.addProp('body', guardRobe());
      o.ch.setHeld('spear');
      o.ch.root.position.set(x, 0, z);
      o.ch.root.rotation.y = ry;
      o.home = { x, z, ry };
      scene.add(o.ch.root);
      return o;
    }) : [];
    this.t = 0;
  }
  makeProcession(scene, [ox, oz]) {
    const stops = ROYAL_ROUTE.stops.map(([x, z]) => [x + ox, z + oz]);
    const lady = () => performer(scene, { model: 'hanbok-gungnyeo', skirt: 'chima-navy', tee: null, hair: 'black', dye: 'black', hairStyle: 'bun' }, null);
    const people = ROYAL_ORDER.map((o) => {
      let ch, npc = null;
      if (o.who === 'king') {
        npc = makeNpc(this.layer, '👑 임금님', { ...randomLook(), model: 'hanbok-gonryongpo', tee: null, hair: 'black', dye: 'black', hairStyle: 'short' });
        ch = npc.ch;
        ch.addProp('head', ikseongwan());
        ch.addProp('body', roundel());
        scene.add(ch.root);
      } else if (o.who === 'eunuch') {
        ch = performer(scene, { model: 'hanbok-dallyeong', tee: null, hair: 'black', dye: 'black', hairStyle: 'short' }, null);
        ch.addProp('head', samo());
        ch.addProp('body', parasol());
      } else ch = lady();
      return { ...o, ch, npc };
    });
    const [sx, sz] = stops[0];
    return { stops, people, at: 0, prev: -1, to: null, pause: 3, x: sx, z: sz, dir: [0, -1], trail: [[sx, sz], [sx, sz + 8]], waveT: 6 + Math.random() * 6 };
  }
  // Where the procession is now (for the debug hook and tests).
  royalSpot() { return this.royal && { x: this.royal.x, z: this.royal.z, stopped: this.royal.pause > 0 }; }
  // A point `back` metres behind the front, along the path it walked.
  trailAt(back) {
    const tr = this.royal.trail;
    let left = back;
    for (let i = tr.length - 1; i > 0; i--) {
      const [ax, az] = tr[i], [bx, bz] = tr[i - 1], d = Math.hypot(bx - ax, bz - az);
      if (d >= left) { const t = d ? left / d : 0; return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: ax - bx, dz: az - bz }; }
      left -= d;
    }
    const [x, z] = tr[0], [x1, z1] = tr[1] || tr[0];
    return { x, z, dx: x1 - x, dz: z1 - z };
  }
  updateRoyal(dt, me, camera, w, h, placeLabels) {
    const R = this.royal;
    let moving = false;
    if (R.pause > 0) {
      const was = R.pause;
      R.pause -= dt;
      // Arriving: the king waves to whoever is watching and the ladies and
      // the eunuch bow; then all stand still for the photos.
      if (was > ROYAL_PAUSE - 0.05 && R.pause <= ROYAL_PAUSE - 0.05) {
        for (const p of R.people) p.ch.play(p.who === 'king' ? 'wave' : 'bow');
      }
      if (R.pause <= 0) { R.to = nextStop(ROYAL_ROUTE, R.at, R.prev); R.prev = R.at; }
    } else {
      const [tx, tz] = R.stops[R.to], dx = tx - R.x, dz = tz - R.z, d = Math.hypot(dx, dz), step = ROYAL_SPEED * dt;
      if (d <= step) {
        R.x = tx; R.z = tz; R.at = R.to; R.pause = ROYAL_PAUSE + 0.01;
      } else { R.x += (dx / d) * step; R.z += (dz / d) * step; moving = true; }
      const last = R.trail[R.trail.length - 1];
      if (Math.hypot(R.x - last[0], R.z - last[1]) > 0.3) { R.trail.push([R.x, R.z]); if (R.trail.length > 80) R.trail.shift(); }
      // Now and then on the way, the king waves.
      if ((R.waveT -= dt) <= 0) { R.waveT = 8 + Math.random() * 8; R.people.find((p) => p.who === 'king').ch.wave(); }
    }
    const on = Math.hypot(me.x - R.x, me.z - R.z) < NEAR;
    for (const p of R.people) {
      p.ch.root.visible = on;
      if (!on) { if (p.npc) { p.npc.tag.style.display = 'none'; } continue; }
      const t = this.trailAt(p.back), len = Math.hypot(t.dx, t.dz) || 1, fx = t.dx / len, fz = t.dz / len;
      p.ch.root.position.set(t.x + fz * p.side, 0, t.z - fx * p.side);
      if (moving) p.ch.root.rotation.y = Math.atan2(fx, fz);
      p.ch.animate(dt, moving ? 0.32 : 0);
      if (p.npc) placeLabels?.(p.npc, camera, w, h);
    }
  }
  // The gate guard you're next to, if any.
  nearGuard(x, z) {
    return this.guards.find((o) => Math.hypot(x - o.home.x, z - o.home.z) < 2.8) || null;
  }
  greet(o, x, z) {
    o.ch.root.rotation.y = Math.atan2(x - o.home.x, z - o.home.z);
    o.talkT = 5;
    o.ch.play('bow');
    say(o, this.layer, GUARD_LINES[Math.floor(Math.random() * GUARD_LINES.length)]);
  }
  // Where the performers are (for the debug hook / camera).
  spots() { return { fan: this.fan && [this.fan.x, this.fan.z], mask: this.mask && [this.mask.x, this.mask.z] }; }
  update(dt, me, camera, w, h, placeLabels) {
    this.t += dt;
    const t = this.t;
    if (this.royal) this.updateRoyal(dt, me, camera, w, h, placeLabels);
    for (const o of this.guards) {
      const on = Math.hypot(me.x - o.home.x, me.z - o.home.z) < NEAR;
      o.ch.root.visible = on;
      if (!on) { o.tag.style.display = 'none'; if (o.bubble) o.bubble.style.display = 'none'; continue; }
      if (o.talkT > 0 && (o.talkT -= dt) <= 0) o.ch.root.rotation.y = o.home.ry; // back to attention
      o.ch.animate(dt, 0);
      placeLabels?.(o, camera, w, h);
    }
    if (this.rope) {
      const { x, z, walker } = this.rope;
      const on = Math.hypot(me.x - x, me.z - z) < NEAR;
      walker.root.visible = on;
      if (on) {
        // Across and back along the rope, turning at each end.
        const span = ROPE.len / 2 - 0.8, per = 14, c = (t % (per * 2)) / per; // 0..2
        const k = c < 1 ? c : 2 - c, u = k * k * (3 - 2 * k);
        walker.root.position.set(x - span + u * span * 2, ROPE.h - 0.02, z);
        walker.root.rotation.y = c < 1 ? Math.PI / 2 : -Math.PI / 2;
        walker.animate(dt, 0);
      }
    }
    if (this.fan) {
      const on = Math.hypot(me.x - this.fan.x, me.z - this.fan.z) < NEAR;
      // Two rings turning opposite ways, opening wide and closing in, every
      // dancer facing out.
      const breathe = Math.sin(t * 0.25);
      let k = 0;
      for (const ring of RINGS) {
        const r = ring.r + 0.8 * breathe, spin = ring.dir * t * 0.12;
        for (let i = 0; i < ring.n; i++) {
          const ch = this.fan.dancers[k++];
          if (!ch) continue;
          ch.root.visible = on;
          if (!on) continue;
          const a = spin + (i / ring.n) * Math.PI * 2;
          ch.root.position.set(this.fan.x + Math.sin(a) * r, 0, this.fan.z + Math.cos(a) * r);
          ch.root.rotation.y = a;
          ch.animate(dt, 0);
        }
      }
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
  hideLabels() {
    for (const o of this.guards) for (const el of [o.tag, o.bubble]) if (el) el.style.display = 'none';
    for (const p of this.royal?.people || []) if (p.npc) for (const el of [p.npc.tag, p.npc.bubble]) if (el) el.style.display = 'none';
  }
}
