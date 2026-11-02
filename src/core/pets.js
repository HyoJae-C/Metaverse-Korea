// Pet café animals: low-poly cats and dogs that wander, sit, nap, play and
// come over to say hi. Local only (each visitor sees their own animals).
import * as THREE from 'three';
import { getLanguage } from './i18n.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const sphere = (r, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h);

function part(g, geo, color, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}

// A chibi animal; front is +z. Returns { root, body, head, tail, legs }.
function makeAnimal(kind, color, accent) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const dog = kind === 'dog';
  part(body, sphere(0.2), color, 0, 0.26, 0, 1, 0.85, dog ? 1.45 : 1.3);
  const head = new THREE.Group();
  head.position.set(0, 0.45, dog ? 0.27 : 0.22);
  body.add(head);
  part(head, sphere(0.17), color, 0, 0, 0, 1.1, 1, 1);
  for (const s of [-1, 1]) {
    if (dog) part(head, sphere(0.07, 8, 6), accent, 0.15 * s, -0.02, -0.02, 0.6, 1.4, 0.9); // floppy ears
    else part(head, new THREE.ConeGeometry(0.065, 0.13, 4), color, 0.1 * s, 0.15, 0, 1, 1, 0.7); // pointy ears
    part(head, sphere(0.025, 6, 6), '#2b2230', 0.065 * s, 0.03, 0.15); // eyes
  }
  part(head, sphere(dog ? 0.07 : 0.05, 8, 6), dog ? accent : '#fff6ee', 0, -0.05, 0.15, 1.2, 0.8, 0.9); // muzzle
  part(head, sphere(0.022, 6, 6), '#3a2a22', 0, -0.02, 0.21); // nose
  const legs = [];
  for (const [x, z] of [[-0.1, 0.16], [0.1, 0.16], [-0.1, -0.16], [0.1, -0.16]]) {
    const leg = part(body, new THREE.CylinderGeometry(0.04, 0.045, 0.18, 6), color, x, 0.09, z * (dog ? 1.15 : 1));
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.32, dog ? -0.28 : -0.24);
  body.add(tail);
  const t = part(tail, new THREE.CylinderGeometry(0.03, dog ? 0.04 : 0.025, dog ? 0.2 : 0.32, 6), dog ? color : accent, 0, 0.1, -0.03);
  t.rotation.x = -0.5;
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false }));
  blob.position.y = 0.01;
  root.add(blob);
  return { root, body, head, tail, legs };
}

const BREEDS = {
  cats: [
    { kind: 'cat', name: '나비', rom: 'Nabi', color: '#f2b36b', accent: '#fff4e6' }, // orange tabby
    { kind: 'cat', name: '까망이', rom: 'Kkamang', color: '#3b3436', accent: '#fff4e6' },
    { kind: 'cat', name: '구름', rom: 'Gureum', color: '#f4f1ec', accent: '#c9c2bb' },
    { kind: 'cat', name: '치즈', rom: 'Cheese', color: '#ffd36e', accent: '#ffffff' },
    { kind: 'cat', name: '회색이', rom: 'Hoesaek', color: '#9a9aa3', accent: '#e6e6ea' },
    { kind: 'cat', name: '모카', rom: 'Mocha', color: '#a87a5a', accent: '#f2e2cf' },
  ],
  dogs: [
    { kind: 'dog', name: '초코', rom: 'Choco', color: '#8a5a3a', accent: '#c98b4f' },
    { kind: 'dog', name: '보리', rom: 'Bori', color: '#e8c58f', accent: '#b8864f' },
    { kind: 'dog', name: '콩이', rom: 'Kongi', color: '#ffffff', accent: '#e9d9c4' },
  ],
};

export class Pets {
  // room: { w, d }; blocked(x, z, r) from the room's collision map.
  constructor(scene, room, blocked, kind = 'cats', count = 6) {
    this.room = room;
    this.blocked = blocked;
    this.list = (BREEDS[kind] || BREEDS.cats).slice(0, count).map((b) => {
      const a = makeAnimal(b.kind, b.color, b.accent);
      const [x, z] = this._freeSpot();
      a.root.position.set(x, 0, z);
      a.root.rotation.y = Math.random() * Math.PI * 2;
      scene.add(a.root);
      return { ...a, ...b, state: 'idle', t: Math.random() * 2, target: null, phase: Math.random() * 6 };
    });
  }

  _freeSpot() {
    const { w, d } = this.room;
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * (w - 2), z = (Math.random() - 0.5) * (d - 3);
      if (!this.blocked(x, z, 0.35)) return [x, z];
    }
    return [0, 0];
  }

  // Korean name in Korean, romanized (with the Hangul) elsewhere: a tiny Korean lesson.
  static label(p) { return getLanguage() === 'ko' ? p.name : `${p.rom} (${p.name})`; }

  nearest(x, z, max = 1.6) {
    let best = null, bd = max;
    for (const p of this.list) {
      const d = Math.hypot(p.root.position.x - x, p.root.position.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // Being petted: a happy hop and a wagging tail.
  pet(p, x, z) {
    p.state = 'happy';
    p.t = 2.2;
    p.face = Math.atan2(x - p.root.position.x, z - p.root.position.z);
  }

  _pick(p, player) {
    const r = Math.random();
    const near = player && Math.hypot(player.x - p.root.position.x, player.z - p.root.position.z) < 6;
    if (near && r < 0.2) { // come over to the visitor
      p.state = 'walk';
      p.target = [player.x + (Math.random() - 0.5) * 1.2, player.z + (Math.random() - 0.5) * 1.2];
      p.t = 6;
    } else if (r < 0.55) {
      p.state = 'walk'; p.target = this._freeSpot(); p.t = 8;
    } else if (r < 0.7) {
      p.state = 'sit'; p.t = 3 + Math.random() * 4;
    } else if (r < 0.82) {
      p.state = 'nap'; p.t = 6 + Math.random() * 6;
    } else if (r < 0.92) {
      p.state = 'play'; p.t = 2 + Math.random() * 2;
    } else {
      p.state = 'idle'; p.t = 1 + Math.random() * 2;
    }
  }

  update(dt, player) {
    for (const p of this.list) {
      p.t -= dt;
      p.phase += dt;
      const r = p.root;
      let moving = false, hop = 0, low = 0, wag = 4;
      if (p.state === 'walk' && p.target) {
        const dx = p.target[0] - r.position.x, dz = p.target[1] - r.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.25 || p.t <= 0) p.t = 0;
        else {
          const sp = (p.kind === 'dog' ? 1.3 : 0.9) * dt;
          const nx = r.position.x + (dx / d) * sp, nz = r.position.z + (dz / d) * sp;
          if (this.blocked(nx, nz, 0.3)) p.t = 0; // bumped into furniture: do something else
          else { r.position.x = nx; r.position.z = nz; moving = true; }
          turn(r, Math.atan2(dx, dz), dt);
        }
      } else if (p.state === 'sit') {
        low = 0.06; wag = 2;
      } else if (p.state === 'nap') {
        low = 0.14; wag = 0;
      } else if (p.state === 'play') {
        hop = Math.abs(Math.sin(p.phase * 9)) * 0.12;
        r.rotation.y += dt * 3;
        wag = 14;
      } else if (p.state === 'happy') {
        turn(r, p.face, dt);
        hop = Math.abs(Math.sin(p.phase * 11)) * 0.15;
        wag = 18;
      }
      if (p.t <= 0) this._pick(p, player);
      // Pose
      const step = moving ? Math.sin(p.phase * 14) * 0.5 : 0;
      p.legs.forEach((l, i) => { l.rotation.x = (i % 2 === (i < 2 ? 0 : 1) ? step : -step); });
      p.body.position.y += (hop - low - p.body.position.y) * Math.min(1, dt * 12);
      p.body.rotation.x = p.state === 'sit' ? -0.25 : 0;
      p.head.rotation.x = p.state === 'nap' ? 0.4 : Math.sin(p.phase * 1.3) * 0.08;
      p.tail.rotation.y = Math.sin(p.phase * wag) * 0.5;
    }
  }
}

function turn(r, ry, dt) {
  let d = ry - r.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  r.rotation.y += d * Math.min(1, dt * 6);
}
