// Pet café animals: low-poly cats and dogs that wander, sit, nap, play and
// come over to say hi. Local only (each visitor sees their own animals).
import * as THREE from 'three';
import { getLanguage } from './i18n.js';
import { matCache } from './three-kit.js';

const mat = matCache();
const sphere = (r, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h);

function part(g, geo, color, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}

// A chibi animal; front is +z. Returns { root, body, head, tail, legs }.
export function makeAnimal(kind, color, accent, scale = 1) {
  if (kind === 'raccoon') return makeRaccoon(color, accent);
  if (kind === 'hamster' || kind === 'guineapig' || kind === 'chinchilla') return makeRodent(kind, color, accent, scale);
  if (kind === 'monkey') return makeMonkey(color, accent, scale);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(scale);
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
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.28 * scale, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false }));
  blob.position.y = 0.01;
  root.add(blob);
  return { root, body, head, tail, legs };
}

// Raccoon: grey with a black eye mask, round ears and a ringed tail.
function makeRaccoon(color, accent) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  part(body, sphere(0.2), color, 0, 0.25, 0, 1.05, 0.9, 1.3);
  const head = new THREE.Group();
  head.position.set(0, 0.44, 0.22);
  body.add(head);
  part(head, sphere(0.16), color, 0, 0, 0, 1.2, 0.95, 1);
  part(head, sphere(0.1, 10, 8), accent, 0, -0.04, 0.1, 1.3, 0.8, 0.9); // white face
  part(head, sphere(0.06, 10, 8), '#2b2627', 0, -0.03, 0.2, 0.9, 0.7, 0.9); // pointed snout
  for (const s of [-1, 1]) {
    part(head, sphere(0.06, 8, 6), color, 0.11 * s, 0.13, -0.02, 1, 1, 0.6); // round ears
    part(head, sphere(0.055, 8, 6), '#2b2627', 0.07 * s, 0.01, 0.12, 1.5, 0.8, 0.6); // mask
    part(head, sphere(0.022, 6, 6), '#ffffff', 0.07 * s, 0.02, 0.155); // eyes
  }
  part(head, sphere(0.02, 6, 6), '#111111', 0, -0.01, 0.255); // nose
  const legs = [];
  for (const [x, z] of [[-0.1, 0.15], [0.1, 0.15], [-0.1, -0.15], [0.1, -0.15]]) {
    legs.push(part(body, new THREE.CylinderGeometry(0.04, 0.045, 0.17, 6), '#3a3436', x, 0.085, z));
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.3, -0.25);
  body.add(tail);
  for (let i = 0; i < 5; i++) { // ringed bushy tail
    const seg = part(tail, sphere(0.065, 8, 6), i % 2 ? '#3a3436' : accent === '#ffffff' ? '#b9b4b0' : accent,
      0, 0.02 + i * 0.05, -0.03 - i * 0.045, 1, 0.9, 1);
    seg.scale.setScalar(1 - i * 0.06);
  }
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false }));
  blob.position.y = 0.01;
  root.add(blob);
  return { root, body, head, tail, legs };
}

// Small round pets: hamster, guinea pig and chinchilla. Tiny legs, a round
// body; chinchillas get big round ears and a fluffy tail.
function makeRodent(kind, color, accent, scale = 1) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(scale);
  root.add(body);
  const pig = kind === 'guineapig', chin = kind === 'chinchilla';
  part(body, sphere(0.2), color, 0, 0.17, 0, 1, 0.82, pig ? 1.45 : 1.15);
  part(body, sphere(0.15), accent, 0, 0.13, 0.08, 0.95, 0.7, 1); // pale tummy
  const head = new THREE.Group();
  head.position.set(0, 0.25, pig ? 0.25 : 0.19);
  body.add(head);
  part(head, sphere(0.13), color, 0, 0, 0, 1.05, 0.95, 1);
  if (!pig) for (const s of [-1, 1]) part(head, sphere(0.06, 8, 6), accent, 0.07 * s, -0.04, 0.07, 1, 0.8, 0.8); // cheek pouches
  for (const s of [-1, 1]) {
    const er = chin ? 0.075 : 0.04;
    const ear = part(head, sphere(er, 8, 6), chin ? '#d8c9c9' : color, 0.08 * s, 0.11, -0.02, 1, 1, 0.45);
    ear.rotation.z = 0.3 * s;
    part(head, sphere(0.022, 6, 6), '#1e1a1c', 0.06 * s, 0.03, 0.105); // eyes
  }
  part(head, sphere(0.018, 6, 6), '#e48a9a', 0, -0.01, 0.13); // nose
  const legs = [];
  for (const [x, z] of [[-0.09, 0.1], [0.09, 0.1], [-0.09, -0.1], [0.09, -0.1]]) {
    legs.push(part(body, new THREE.CylinderGeometry(0.03, 0.035, 0.07, 6), '#f1c9c4', x, 0.035, z));
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.18, pig ? -0.27 : -0.22);
  body.add(tail);
  if (chin) {
    const t = part(tail, sphere(0.07, 8, 6), color, 0, 0.08, -0.05, 0.8, 1.6, 0.8); // fluffy tail
    t.rotation.x = -0.6;
  } else if (!pig) part(tail, sphere(0.025, 6, 6), color, 0, 0, 0); // tiny stub
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.22 * scale, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false }));
  blob.position.y = 0.01;
  root.add(blob);
  return { root, body, head, tail, legs };
}

// A little monkey: round head with a pale face, round ears, long curled tail.
function makeMonkey(color, accent, scale = 1) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(scale);
  root.add(body);
  part(body, sphere(0.17), color, 0, 0.32, 0, 1, 1.15, 0.95);
  part(body, sphere(0.12), accent, 0, 0.3, 0.07, 0.9, 1, 0.8); // tummy
  const head = new THREE.Group();
  head.position.set(0, 0.6, 0.04);
  body.add(head);
  part(head, sphere(0.17), color, 0, 0, 0);
  part(head, sphere(0.12, 10, 8), accent, 0, -0.03, 0.08, 1.2, 1, 0.8); // face
  for (const s of [-1, 1]) {
    part(head, sphere(0.06, 8, 6), accent, 0.17 * s, 0.02, 0, 0.6, 1, 1); // ears
    part(head, sphere(0.024, 6, 6), '#1e1a1c', 0.055 * s, 0.03, 0.17); // eyes
  }
  part(head, sphere(0.05, 8, 6), accent, 0, -0.07, 0.15, 1.3, 0.8, 0.8); // muzzle
  const legs = [];
  for (const [x, z, y, len] of [[-0.09, 0.03, 0.1, 0.2], [0.09, 0.03, 0.1, 0.2], [-0.2, 0.05, 0.3, 0.26], [0.2, 0.05, 0.3, 0.26]]) {
    legs.push(part(body, new THREE.CylinderGeometry(0.035, 0.04, len, 6), color, x, y, z)); // legs, then arms
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.22, -0.15);
  body.add(tail);
  for (let i = 0; i < 6; i++) { // a tail that curls up at the end
    const a = i * 0.45;
    part(tail, sphere(0.03, 6, 6), color, 0, 0.02 + Math.sin(a) * 0.12 + i * 0.03, -0.04 - Math.cos(a) * 0.06 - i * 0.03);
  }
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.25 * scale, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false }));
  blob.position.y = 0.01;
  root.add(blob);
  return { root, body, head, tail, legs };
}

export const BREEDS = {
  hamsters: [
    { kind: 'hamster', name: '햄찌', rom: 'Haemjji', color: '#f0b46a', accent: '#fff6ea', scale: 0.85 }, // golden
    { kind: 'hamster', name: '쿠키', rom: 'Cookie', color: '#c99a6b', accent: '#fff3e6', scale: 0.80 },
    { kind: 'hamster', name: '눈송이', rom: 'Nunsongi', color: '#f8f6f2', accent: '#ffffff', scale: 0.80 }, // winter white
    { kind: 'hamster', name: '참깨', rom: 'Chamkkae', color: '#9a9590', accent: '#f3efe9', scale: 0.80 }, // grey dwarf
    { kind: 'hamster', name: '호떡', rom: 'Hotteok', color: '#d9884a', accent: '#fff1de', scale: 0.90 },
    { kind: 'hamster', name: '모찌', rom: 'Mochi', color: '#f3d9c4', accent: '#ffffff', scale: 0.85 },
  ],
  cats: [
    { kind: 'cat', name: '나비', rom: 'Nabi', color: '#f2b36b', accent: '#fff4e6' }, // orange tabby
    { kind: 'cat', name: '까망이', rom: 'Kkamang', color: '#3b3436', accent: '#fff4e6' },
    { kind: 'cat', name: '구름', rom: 'Gureum', color: '#f4f1ec', accent: '#c9c2bb' },
    { kind: 'cat', name: '치즈', rom: 'Cheese', color: '#ffd36e', accent: '#ffffff' },
    { kind: 'cat', name: '회색이', rom: 'Hoesaek', color: '#9a9aa3', accent: '#e6e6ea' },
    { kind: 'cat', name: '모카', rom: 'Mocha', color: '#a87a5a', accent: '#f2e2cf' },
  ],
  // Gogo Cat Café in Hongdae: its own six cats, Mochi first.
  gogocats: [
    { kind: 'cat', name: '모찌', rom: 'Mochi', color: '#fbf7f2', accent: '#f6c9cf' }, // white, pink nose
    { kind: 'cat', name: '고등어', rom: 'Godeungeo', color: '#7d8088', accent: '#e9e6e1' }, // mackerel tabby
    { kind: 'cat', name: '삼색이', rom: 'Samsaek', color: '#e7a35e', accent: '#2f2a2b' }, // calico
    { kind: 'cat', name: '호두', rom: 'Hodu', color: '#8a5f3f', accent: '#f1e1cc' },
    { kind: 'cat', name: '별이', rom: 'Byeori', color: '#2c2a33', accent: '#f4f1ec' }, // tuxedo
    { kind: 'cat', name: '단추', rom: 'Danchu', color: '#d8c3a5', accent: '#ffffff' },
  ],
  dogs: [
    { kind: 'dog', name: '초코', rom: 'Choco', color: '#8a5a3a', accent: '#c98b4f' },
    { kind: 'dog', name: '보리', rom: 'Bori', color: '#e8c58f', accent: '#b8864f' },
    { kind: 'dog', name: '콩이', rom: 'Kongi', color: '#ffffff', accent: '#e9d9c4' },
  ],
  // Big dogs: golden retriever, samoyed, husky, bernese, labrador, jindo.
  bigdogs: [
    { kind: 'dog', name: '골디', rom: 'Goldie', color: '#e2a85a', accent: '#c98a3e', scale: 1.7 },
    { kind: 'dog', name: '설이', rom: 'Seori', color: '#f7f5f0', accent: '#e8e2d6', scale: 1.65 },
    { kind: 'dog', name: '하늘', rom: 'Haneul', color: '#7d8590', accent: '#f2f2f2', scale: 1.7 },
    { kind: 'dog', name: '버니', rom: 'Bernie', color: '#2b2627', accent: '#c47a45', scale: 1.8 },
    { kind: 'dog', name: '라떼', rom: 'Latte', color: '#d9b77e', accent: '#b8955c', scale: 1.6 },
    { kind: 'dog', name: '진돌', rom: 'Jindol', color: '#e9c48a', accent: '#fff6e6', scale: 1.6 },
  ],
  // Mungnyang Retriever Café in Seongsu: two retrievers, a bit bigger than the
  // small dogs (a Maltese is 0.85) but smaller than the Big Paws dogs, who
  // love to play together.
  retrievers: [
    { kind: 'dog', name: '해피', rom: 'Happy', color: '#e2a85a', accent: '#c98a3e', scale: 1.25, playful: true }, // golden retriever
    { kind: 'dog', name: '두부', rom: 'Dubu', color: '#f1dcb0', accent: '#d9bd86', scale: 1.2, playful: true }, // cream golden
  ],
  raccoons: [
    { kind: 'raccoon', name: '너구리', rom: 'Neoguri', color: '#8f8a88', accent: '#ffffff' },
    { kind: 'raccoon', name: '라쿠', rom: 'Raku', color: '#7a7471', accent: '#f4efe9' },
    { kind: 'raccoon', name: '보송이', rom: 'Bosong', color: '#9d9794', accent: '#ffffff' },
    { kind: 'raccoon', name: '꼬리', rom: 'Kkori', color: '#857f7c', accent: '#efe9e2' },
    { kind: 'raccoon', name: '밤톨', rom: 'Bamtol', color: '#8a7f78', accent: '#f7f1ea' },
  ],
};

export class Pets {
  // room: { w, d }; blocked(x, z, r) from the room's collision map.
  // extra: more animals to add, such as pets waiting to be adopted
  // ({ kind, name, rom, color, accent, scale, adopt: item id }).
  constructor(scene, room, blocked, kind = 'cats', count = 6, extra = []) {
    this.room = room;
    this.blocked = blocked;
    this.scene = scene;
    const breeds = [...(BREEDS[kind] || BREEDS.cats).slice(0, count), ...extra];
    this.radius = 0.35 * Math.max(...breeds.map((b) => b.scale || 1));
    this.list = breeds.map((b) => {
      const a = makeAnimal(b.kind, b.color, b.accent, b.scale);
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
      if (!this.blocked(x, z, this.radius)) return [x, z];
    }
    return [0, 0];
  }

  // Korean name in Korean, romanized (with the Hangul) elsewhere: a tiny Korean lesson.
  static label(p) { return getLanguage() === 'ko' ? p.name : `${p.rom} (${p.name})`; }

  nearest(x, z, max = 1.6 + this.radius) {
    let best = null, bd = max;
    for (const p of this.list) {
      const d = Math.hypot(p.root.position.x - x, p.root.position.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // An adopted animal leaves the café (it now follows its new family).
  remove(p) {
    this.list = this.list.filter((q) => q !== p);
    this.scene.remove(p.root);
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
    const buddy = p.playful && this.list.find((q) => q !== p && q.playful);
    if (buddy && r >= 0.55 && r < 0.9) { // playful dogs run to each other and play (instead of sitting or napping)
      if (Math.hypot(buddy.root.position.x - p.root.position.x, buddy.root.position.z - p.root.position.z) < 1.6) {
        p.state = 'play'; p.t = 2 + Math.random() * 2;
      } else {
        p.state = 'walk'; p.target = [buddy.root.position.x + (Math.random() - 0.5), buddy.root.position.z + (Math.random() - 0.5)]; p.t = 5;
      }
    } else if (near && r < 0.2) { // come over to the visitor
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
          const sp = (p.kind === 'dog' ? 1.3 : p.kind === 'raccoon' ? 1.1 : p.kind === 'hamster' ? 0.7 : 0.9) * dt;
          const nx = r.position.x + (dx / d) * sp, nz = r.position.z + (dz / d) * sp;
          if (this.blocked(nx, nz, this.radius * 0.85)) p.t = 0; // bumped into furniture: do something else
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

export function turn(r, ry, dt) {
  let d = ry - r.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  r.rotation.y += d * Math.min(1, dt * 6);
}
