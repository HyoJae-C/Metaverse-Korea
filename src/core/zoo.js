// The zoo in Children's Grand Park: pens with fences and animals that live
// in them. Each pen is a "zoopen" landmark in the map (districts/
// grand-park.json, written by scripts/build-grand-park.mjs):
//
//   { "type": "zoopen", "id": "monkeys", "x": 510, "z": -126, "w": 60, "d": 56,
//     "fence": "mesh" | "low" | "aviary", "ground": "dirt" | "grass",
//     "gate": { "side": "n", "at": 0, "w": 4 },     (a gap you can walk through)
//     "pond": [x, z, r], "props": [["log", x, z], ...],
//     "groups": [{ "kind": "macaque", "n": 8, "box": [x0, z0, x1, z1] }],
//     "pet": true, "name": { "ko": …, "en": … } }
//
// Pen-local metres are from the pen's centre. The fence's collision comes
// from the map's blockers (the build script writes both from one layout).
// Animals are local to each visitor, like the café pets.
import * as THREE from 'three';
import { matCache, canvasTex } from './three-kit.js';
import { makeZooAnimal, ZOO_LOOKS } from './zoo-animals.js';

const mat = matCache();
const AWAKE = 80; // only pens this close to the player move (metres)

// How each kind gets about: walking speed (m/s), how often it rests.
const KIND = {
  rabbit: { speed: 1.2, rest: 0.5 },
  guineapig: { speed: 0.6, rest: 0.55 },
  goat: { speed: 0.9, rest: 0.45 },
  sheep: { speed: 0.7, rest: 0.6 },
  macaque: { speed: 1.4, rest: 0.4 },
  flamingo: { speed: 0.5, rest: 0.6 },
  pelican: { speed: 0.6, rest: 0.6 },
  peacock: { speed: 0.6, rest: 0.45 },
};
const RADIUS = { rabbit: 0.2, guineapig: 0.3, goat: 0.45, sheep: 0.45, macaque: 0.3, flamingo: 0.3, pelican: 0.4, peacock: 0.35 };

// A small name board on two posts at the front of a pen.
function nameBoard(name) {
  const g = new THREE.Group();
  const tex = canvasTex(512, 160, (c, w, h) => {
    c.fillStyle = '#5b3b26'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f7ead2'; c.fillRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#4a3020'; c.textAlign = 'center';
    c.font = 'bold 56px sans-serif'; c.fillText(name.ko || '', w / 2, 72);
    c.font = '36px sans-serif'; c.fillText(name.en || '', w / 2, 126);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshLambertMaterial({ map: tex }));
  board.position.y = 1.5;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.85, 0.06), mat('#5b3b26'));
  back.position.set(0, 1.5, -0.04);
  g.add(back, board);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), mat('#5b3b26'));
    post.position.set(s * 1.05, 0.75, -0.04);
    g.add(post);
  }
  return g;
}

// The fence lines round a pen: [x1, z1, x2, z2] pieces, leaving the gate open.
export function fenceLines(pen) {
  const hw = pen.w / 2, hd = pen.d / 2;
  const sides = { n: [-hw, -hd, hw, -hd], s: [-hw, hd, hw, hd], w: [-hw, -hd, -hw, hd], e: [hw, -hd, hw, hd] };
  const out = [];
  for (const [k, [x1, z1, x2, z2]] of Object.entries(sides)) {
    const g = pen.gate?.side === k ? pen.gate : null;
    if (!g) { out.push([x1, z1, x2, z2]); continue; }
    const along = x1 === x2 ? 'z' : 'x', half = (g.w || 4) / 2, c = g.at || 0;
    if (along === 'x') { out.push([x1, z1, c - half, z2], [c + half, z1, x2, z2]); } else { out.push([x1, z1, x2, c - half], [x1, c + half, x2, z2]); }
  }
  return out;
}

function buildFence(g, pen) {
  const kind = pen.fence || 'low';
  const H = kind === 'low' ? 1 : kind === 'mesh' ? 3 : 5;
  const postC = kind === 'low' ? '#a0764c' : '#4d5a4f';
  const net = kind === 'low' ? null : new THREE.MeshBasicMaterial({ color: '#2f3b33', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  for (const [x1, z1, x2, z2] of fenceLines(pen)) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.2) continue;
    const ang = Math.atan2(z2 - z1, x2 - x1);
    const n = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, H, 0.14), mat(postC));
      p.position.set(x1 + ((x2 - x1) * i) / n, H / 2, z1 + ((z2 - z1) * i) / n);
      g.add(p);
    }
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const rails = kind === 'low' ? [0.45, 0.85] : [0.15, H - 0.1];
    for (const y of rails) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), mat(postC));
      r.position.set(mx, y, mz);
      r.rotation.y = -ang;
      g.add(r);
    }
    if (net) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, H), net);
      m.position.set(mx, H / 2, mz);
      m.rotation.y = -ang;
      m.renderOrder = 2;
      g.add(m);
    }
  }
  if (kind === 'aviary') { // the roof frame over the walk-round aviary
    const hw = pen.w / 2, hd = pen.d / 2;
    for (let x = -hw; x <= hw + 0.01; x += pen.w / 6) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, pen.d), mat(postC));
      b.position.set(x, H, 0);
      g.add(b);
    }
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(pen.w, pen.d).rotateX(-Math.PI / 2), net);
    roof.position.y = H;
    g.add(roof);
    void hd;
  }
}

function buildProps(g, pen) {
  for (const [kind, x, z, ry = 0] of pen.props || []) {
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    p.rotation.y = ry;
    if (kind === 'log') { // a climbing frame: poles, two platforms and a rope
      for (const [px, pz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 4, 7), mat('#8a6040'));
        pole.position.set(px, 2, pz);
        p.add(pole);
      }
      for (const y of [1.6, 3.2]) {
        const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 3.4), mat('#a77a50'));
        deck.position.y = y;
        p.add(deck);
      }
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 6, 5), mat('#d8c39a'));
      rope.position.set(4, 2, 0); rope.rotation.z = 0.7;
      p.add(rope);
    } else if (kind === 'barn') { // a little red barn
      const body = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 4), mat('#c4483d'));
      body.position.y = 1.3;
      for (const s of [-1, 1]) { // a gabled roof: two slopes meeting on a ridge along x
        const slope = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.18, 2.6), mat('#f2efe8'));
        slope.position.set(0, 3.15, s * 1.0);
        slope.rotation.x = s * 0.6;
        p.add(slope);
      }
      const gable = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 4.9, 3), mat('#c4483d'));
      gable.rotation.z = Math.PI / 2; gable.position.y = 2.95; gable.scale.set(1, 1, 1.45);
      p.add(gable);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.05), mat('#f2efe8'));
      door.position.set(0, 0.9, 2.02);
      p.add(body, door);
    } else if (kind === 'hay') {
      const bale = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.7), mat('#e3c46a'));
      bale.position.y = 0.3;
      p.add(bale);
    } else if (kind === 'hutch') { // a low wooden house for small animals
      const box = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1.2), mat('#c9a06e'));
      box.position.y = 0.4;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 1.5), mat('#7a5a3c'));
      roof.position.y = 0.85; roof.rotation.x = 0.15;
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), mat('#3b2a1e'));
      hole.position.set(0, 0.35, 0.61);
      p.add(box, roof, hole);
    } else if (kind === 'rock') {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), mat('#9a9690'));
      r.position.y = 0.5; r.scale.set(1.4, 0.7, 1);
      p.add(r);
    } else if (kind === 'tree') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 7), mat('#7a5434'));
      trunk.position.y = 1.5;
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 1), new THREE.MeshLambertMaterial({ color: '#5fa04e', flatShading: true }));
      crown.position.y = 4;
      p.add(trunk, crown);
    } else continue;
    g.add(p);
  }
}

export class Zoo {
  constructor(scene, pens) {
    this.pens = pens.map((pen) => this._build(scene, pen));
    this.radius = 0.5;
  }

  _build(scene, pen) {
    const g = new THREE.Group();
    g.name = 'zoopen:' + pen.id;
    g.position.set(pen.x, 0, pen.z);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(pen.w, pen.d).rotateX(-Math.PI / 2), mat(pen.ground === 'dirt' ? '#d8c08f' : '#86c46a'));
    ground.position.y = 0.03;
    ground.receiveShadow = true;
    g.add(ground);
    if (pen.pond) {
      const [px, pz, pr] = pen.pond;
      const water = new THREE.Mesh(new THREE.CircleGeometry(pr, 28).rotateX(-Math.PI / 2), mat('#6fb7d9'));
      water.position.set(px, 0.05, pz);
      g.add(water);
    }
    buildFence(g, pen);
    buildProps(g, pen);
    if (pen.name) {
      const b = nameBoard(pen.name);
      const s = pen.board || 'n';
      const hw = pen.w / 2, hd = pen.d / 2;
      const at = { n: [-(pen.gate?.side === 'n' ? 4 : 0), -hd - 1.2, Math.PI], s: [0, hd + 1.2, 0], w: [-hw - 1.2, 0, -Math.PI / 2], e: [hw + 1.2, 0, Math.PI / 2] }[s];
      b.position.set(at[0] + (pen.gate?.side === s ? (pen.gate.at || 0) + (pen.gate.w || 4) / 2 + 2 : 0), 0, at[1]);
      b.rotation.y = at[2];
      g.add(b);
    }
    const animals = [];
    for (const grp of pen.groups || []) {
      const box = grp.box || [-pen.w / 2 + 1.5, -pen.d / 2 + 1.5, pen.w / 2 - 1.5, pen.d / 2 - 1.5];
      const looks = ZOO_LOOKS[grp.kind];
      for (let i = 0; i < grp.n; i++) {
        const a = makeZooAnimal(grp.kind, looks[i % looks.length]);
        const x = box[0] + Math.random() * (box[2] - box[0]), z = box[1] + Math.random() * (box[3] - box[1]);
        a.root.position.set(x, 0, z);
        a.root.rotation.y = Math.random() * Math.PI * 2;
        g.add(a.root);
        animals.push({ ...a, kind: grp.kind, box, state: 'idle', t: Math.random() * 3, phase: Math.random() * 6, fanT: 0, fanned: 0 });
      }
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = !(o.material?.transparent); });
    scene.add(g);
    return { pen, g, animals, near: 0 };
  }

  // The animal you can pet next to (x, z), in a pen you may walk into.
  nearest(x, z, max = 1.8) {
    let best = null, bd = max;
    for (const P of this.pens) {
      if (!P.pen.pet) continue;
      const lx = x - P.pen.x, lz = z - P.pen.z;
      if (Math.abs(lx) > P.pen.w / 2 + 2 || Math.abs(lz) > P.pen.d / 2 + 2) continue;
      for (const a of P.animals) {
        const d = Math.hypot(a.root.position.x - lx, a.root.position.z - lz) - (RADIUS[a.kind] || 0.3);
        if (d < bd) { bd = d; best = a; best.pen = P.pen; }
      }
    }
    return best;
  }

  // Being petted: a happy hop facing you.
  pet(a, x, z) {
    a.state = 'happy';
    a.t = 2.2;
    a.face = Math.atan2(x - a.pen.x - a.root.position.x, z - a.pen.z - a.root.position.z);
  }

  _pick(a, lx, lz, playerNear) {
    const k = KIND[a.kind];
    const r = Math.random();
    if (playerNear && a.pen?.pet !== false && this._petPen(a) && r < 0.25) { // come over to say hi
      a.state = 'walk'; a.target = [lx + (Math.random() - 0.5) * 1.6, lz + (Math.random() - 0.5) * 1.6]; a.t = 6;
    } else if (r < 1 - k.rest) {
      const [x0, z0, x1, z1] = a.box;
      a.state = 'walk'; a.target = [x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0)]; a.t = 8;
    } else if (r < 1 - k.rest / 2) {
      a.state = a.bird ? 'preen' : 'graze'; a.t = 3 + Math.random() * 4;
    } else {
      a.state = 'sit'; a.t = 3 + Math.random() * 5;
    }
  }
  _petPen(a) { return this.pens.find((P) => P.animals.includes(a))?.pen.pet; }

  update(dt, player) {
    for (const P of this.pens) {
      const lx = player.x - P.pen.x, lz = player.z - P.pen.z;
      const dist = Math.hypot(lx, lz);
      if (dist > AWAKE + Math.max(P.pen.w, P.pen.d) / 2) continue;
      for (const a of P.animals) this._step(a, dt, lx, lz);
    }
  }

  _step(a, dt, lx, lz) {
    a.t -= dt;
    a.phase += dt;
    const r = a.root, k = KIND[a.kind];
    const near = Math.hypot(lx - r.position.x, lz - r.position.z) < 7;
    let moving = false, hop = 0, low = 0;
    if (a.state === 'walk' && a.target) {
      const [x0, z0, x1, z1] = a.box;
      const tx = Math.min(x1, Math.max(x0, a.target[0])), tz = Math.min(z1, Math.max(z0, a.target[1]));
      const dx = tx - r.position.x, dz = tz - r.position.z, d = Math.hypot(dx, dz);
      if (d < 0.3 || a.t <= 0) a.t = 0;
      else {
        const sp = k.speed * dt;
        r.position.x += (dx / d) * Math.min(sp, d);
        r.position.z += (dz / d) * Math.min(sp, d);
        turn(r, Math.atan2(dx, dz), dt);
        moving = true;
        if (a.hop) hop = Math.abs(Math.sin(a.phase * 8)) * 0.12;
      }
    } else if (a.state === 'happy') {
      turn(r, a.face, dt);
      hop = Math.abs(Math.sin(a.phase * 11)) * 0.12;
    } else if (a.state === 'sit') {
      low = a.bird ? 0 : 0.05;
    }
    if (a.t <= 0) this._pick(a, lx, lz, near);
    const step = moving && !a.hop ? Math.sin(a.phase * (a.bird ? 8 : 12)) * 0.45 : 0;
    a.legs.forEach((l, i) => { l.rotation.x = (i % 2 === (i < 2 ? 0 : 1) ? step : -step); });
    a.body.position.y += (hop - low - a.body.position.y) * Math.min(1, dt * 12);
    // Grazing: head down to the grass; preening: a bird turns its head back.
    const headDown = a.state === 'graze' ? 0.7 : 0;
    a.head.rotation.x += (headDown + Math.sin(a.phase * 1.3) * 0.06 - a.head.rotation.x) * Math.min(1, dt * 4);
    a.head.rotation.y = a.state === 'preen' ? Math.sin(a.phase * 0.8) * 1.2 : Math.sin(a.phase * 0.5) * 0.15;
    if (a.tail) a.tail.rotation.y = a.fan ? 0 : Math.sin(a.phase * 4) * 0.3;
    if (a.wings && a.state === 'preen') a.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.abs(Math.sin(a.phase * 3)) * 0.4; });
    if (a.fan) this._fan(a, dt, near);
  }

  // A peacock fans its train only now and then, and only for someone who
  // stays to watch: after about 20 s with a visitor close by, for 8 s.
  _fan(a, dt, near) {
    a.watch = near ? (a.watch || 0) + dt : Math.max(0, (a.watch || 0) - dt * 2);
    if (a.fanT > 0) a.fanT -= dt;
    else if (a.watch > 20 && Math.random() < dt / 6) { a.fanT = 8; a.watch = 0; a.state = 'sit'; a.t = 9; }
    const want = a.fanT > 0 ? 1 : 0;
    a.fanned += (want - a.fanned) * Math.min(1, dt * 2.5);
    const f = a.fanned;
    a.tail.rotation.x = -Math.PI / 2 + 0.25 + f * (Math.PI / 2 - 0.5);
    a.fan.forEach((fe, i) => { fe.rotation.z = (i / (a.fan.length - 1) - 0.5) * (0.25 + f * 2.7); });
    if (f > 0.5) a.tail.rotation.y = Math.sin(a.phase * 18) * 0.02; // the shiver
  }
}

export function turn(r, ry, dt) {
  let d = ry - r.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  r.rotation.y += d * Math.min(1, dt * 5);
}
