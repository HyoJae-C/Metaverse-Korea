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
  tiger: { speed: 1.3, rest: 0.55 },
  lion: { speed: 1.1, rest: 0.7 },
  bear: { speed: 0.9, rest: 0.55 },
  polarbear: { speed: 0.9, rest: 0.45 },
  seal: { speed: 1.4, rest: 0.35 },
  walrus: { speed: 0.6, rest: 0.6 },
  hippo: { speed: 0.6, rest: 0.6 },
  snake: { speed: 0.35, rest: 0.6 },
};
// How deep a swimmer sinks in its pond (metres), so only its back shows.
const SINK = { polarbear: 0.6, seal: 0.3, walrus: 0.5, hippo: 0.8 };
const RADIUS = { rabbit: 0.2, guineapig: 0.3, goat: 0.45, sheep: 0.45, macaque: 0.3, flamingo: 0.3, pelican: 0.4, peacock: 0.35, tiger: 0.8, lion: 0.8, bear: 0.8, polarbear: 0.9, seal: 0.6, walrus: 1, hippo: 1.3, snake: 0.3 };

// Feeding times: every pen with "feed" has one every FEED_CYCLE seconds, at
// its own offset, on the wall clock, so everyone sees the same feeding.
export const FEED_CYCLE = 600, FEED_TIME = 60, FEED_WARN = 60;
export function feedPhase(pen, now = Date.now() / 1000) {
  const t = (((now - (pen.feed?.offset || 0)) % FEED_CYCLE) + FEED_CYCLE) % FEED_CYCLE;
  if (t < FEED_TIME) return { now: true, left: FEED_TIME - t };
  return { now: false, until: FEED_CYCLE - t };
}

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
  if (kind === 'glass' || kind === 'house') return glassFence(g, pen, kind);
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

// Glass: a low wall of glass panes in a dark frame (the sea animals' pool).
// House: a small building, glass at the front (pen.board side), walls and a
// roof elsewhere (the snake house).
function glassFence(g, pen, kind) {
  const H = kind === 'glass' ? 1.3 : 3.2;
  const glass = new THREE.MeshLambertMaterial({ color: '#bfe6f2', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const hw = pen.w / 2, hd = pen.d / 2, front = pen.board || 'n';
  const sides = { n: [-hw, -hd, hw, -hd], s: [-hw, hd, hw, hd], w: [-hw, -hd, -hw, hd], e: [hw, -hd, hw, hd] };
  for (const [k, [x1, z1, x2, z2]] of Object.entries(sides)) {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const see = kind === 'glass' || k === front;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, H, see ? 0.04 : 0.3), see ? glass : mat('#e9dfcf'));
    wall.position.set(mx, H / 2, mz);
    wall.rotation.y = -ang;
    if (see) wall.renderOrder = 2;
    g.add(wall);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.1, 0.12), mat('#3d4650'));
    rail.position.set(mx, H, mz);
    rail.rotation.y = -ang;
    g.add(rail);
  }
  if (kind === 'house') {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(pen.w + 0.8, 0.25, pen.d + 0.8), mat('#6f7f5a'));
    roof.position.y = H + 0.12;
    g.add(roof);
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
  // onNotice({ kind: 'soon' | 'now', pen }): a feeding is coming up or starting
  // near the player (the game shows a toast).
  constructor(scene, pens, onNotice = null) {
    this.onNotice = onNotice;
    this.pens = pens.map((pen) => this._build(scene, pen));
    this.radius = 0.5;
    this.still = { x: 0, z: 0, t: 0 };
    this.melon = null; // the watermelon in the air: { P, a, t, from, mesh }
    this.bits = []; // watermelon pieces flying after the crunch
    this.scene = scene;
  }

  _build(scene, pen) {
    const g = new THREE.Group();
    g.name = 'zoopen:' + pen.id;
    g.position.set(pen.x, 0, pen.z);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(pen.w, pen.d).rotateX(-Math.PI / 2), mat(pen.ground === 'dirt' ? '#d8c08f' : pen.ground === 'stone' ? '#cfd3d6' : '#86c46a'));
    ground.position.y = 0.03;
    ground.receiveShadow = true;
    g.add(ground);
    if (pen.pond) {
      const [px, pz, pr] = pen.pond;
      const water = new THREE.Mesh(new THREE.CircleGeometry(pr, 32).rotateX(-Math.PI / 2), mat('#5aaed6'));
      water.position.set(px, 0.05, pz);
      g.add(water);
    }
    buildFence(g, pen);
    buildProps(g, pen);
    if (pen.name) {
      const b = nameBoard(pen.name);
      const s = pen.board || 'n';
      const hw = pen.w / 2, hd = pen.d / 2;
      const at = { n: [0, -hd - 1.2, Math.PI], s: [0, hd + 1.2, 0], w: [-hw - 1.2, 0, -Math.PI / 2], e: [hw + 1.2, 0, Math.PI / 2] }[s];
      const shift = pen.gate?.side === s ? (pen.gate.at || 0) + (pen.gate.w || 4) / 2 + 2 : pen.boardAt || 0;
      if (s === 'n' || s === 's') b.position.set(at[0] + shift, 0, at[1]); else b.position.set(at[0], 0, at[1] + shift);
      b.rotation.y = at[2];
      g.add(b);
    }
    let food = null;
    if (pen.feed) { // the keeper's food, put out at feeding time
      food = new THREE.Group();
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.2, 14), mat('#7a6a5a'));
      tray.position.y = 0.1;
      food.add(tray);
      const c = pen.feed.food === 'fish' ? '#b9c6cf' : pen.feed.food === 'greens' ? '#6fbf4a' : '#c0504d';
      for (let i = 0; i < 7; i++) {
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), mat(c));
        m.position.set(Math.cos(i) * 0.45, 0.3, Math.sin(i * 1.7) * 0.45);
        food.add(m);
      }
      food.position.set(pen.feed.at[0], 0, pen.feed.at[1]);
      food.visible = false;
      g.add(food);
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
        animals.push({ ...a, kind: grp.kind, box, pen, state: 'idle', t: Math.random() * 3, phase: Math.random() * 6, fanT: 0, fanned: 0, sink: 0 });
      }
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = !(o.material?.transparent); });
    scene.add(g);
    return { pen, g, animals, food, feeding: false, warned: 0, pose: 0 };
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
        if (d < bd) { bd = d; best = a; }
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

  // The watermelon spot (pen.melon, pen-local) you are standing at, if the
  // hippo is free to take one.
  melonSpot(x, z) {
    if (this.melon) return null;
    for (const P of this.pens) {
      if (!P.pen.melon) continue;
      const [mx, mz] = P.pen.melon;
      if (Math.hypot(x - P.pen.x - mx, z - P.pen.z - mz) < 2.6) return P;
    }
    return null;
  }

  // Toss a watermelon: the nearest hippo comes to the front, opens wide, and
  // crunches it in one bite.
  feedMelon(P, x, z) {
    const hip = P.animals.filter((a) => a.kind === 'hippo').sort((a, b) => a.root.position.distanceTo(new THREE.Vector3(P.pen.melon[0], 0, P.pen.melon[1])) - b.root.position.distanceTo(new THREE.Vector3(P.pen.melon[0], 0, P.pen.melon[1])))[0];
    if (!hip) return false;
    const [mx, mz] = P.pen.melon, inward = P.pen.melonIn || [0, 1];
    hip.state = 'melon'; hip.t = 30; hip.target = [mx + inward[0] * 3.2, mz + inward[1] * 3.2];
    hip.face = Math.atan2(-inward[0], -inward[1]);
    const mesh = new THREE.Group();
    const rind = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), mat('#3f8f3a'));
    rind.scale.set(1, 0.9, 1.2);
    mesh.add(rind);
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 4, 14), mat('#2c6b2a')); s.rotation.y = (i * Math.PI) / 4; s.scale.z = 1.2; mesh.add(s); }
    mesh.visible = false;
    this.scene.add(mesh);
    this.melon = { P, a: hip, t: 0, from: [x, z], mesh, thrown: false };
    return true;
  }

  _pick(a, lx, lz, playerNear) {
    const k = KIND[a.kind];
    const r = Math.random();
    const [x0, z0, x1, z1] = a.box;
    const pond = a.pen.pond;
    if (playerNear && a.pen.pet && r < 0.25) { // come over to say hi
      a.state = 'walk'; a.target = [lx + (Math.random() - 0.5) * 1.6, lz + (Math.random() - 0.5) * 1.6]; a.t = 6;
    } else if (a.swims && pond && r < 0.55) { // a swim round the pond
      const ang = Math.random() * Math.PI * 2, rr = Math.random() * pond[2] * 0.8;
      a.state = 'walk'; a.target = [pond[0] + Math.cos(ang) * rr, pond[1] + Math.sin(ang) * rr]; a.t = 12;
    } else if (r < 1 - k.rest) {
      a.state = 'walk'; a.target = [x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0)]; a.t = 8;
    } else if (r < 1 - k.rest / 2) {
      a.state = a.bird ? 'preen' : 'graze'; a.t = 3 + Math.random() * 4;
    } else {
      a.state = 'sit'; a.t = 3 + Math.random() * 5;
    }
  }

  update(dt, player) {
    const now = Date.now() / 1000;
    // Standing still? (a photo pause waits for that)
    if (Math.hypot(player.x - this.still.x, player.z - this.still.z) > 0.3) { this.still = { x: player.x, z: player.z, t: 0 }; } else this.still.t += dt;
    for (const P of this.pens) {
      const lx = player.x - P.pen.x, lz = player.z - P.pen.z;
      const dist = Math.hypot(lx, lz);
      if (dist > AWAKE + Math.max(P.pen.w, P.pen.d) / 2) { P.feeding = false; continue; }
      if (P.pen.feed) this._feeding(P, now, dist);
      this._photo(P, lx, lz, dt);
      for (const a of P.animals) this._step(a, dt, lx, lz);
    }
    this._melon(dt);
  }

  // Feeding: a minute before, a notice; then the food goes out at the front
  // and the animals come and eat.
  _feeding(P, now, dist) {
    const f = feedPhase(P.pen, now);
    const id = Math.floor((now - (P.pen.feed.offset || 0)) / FEED_CYCLE);
    if (!f.now && f.until <= FEED_WARN && dist < 60 && P.warned !== id + 1) { P.warned = id + 1; this.onNotice?.({ kind: 'soon', pen: P.pen }); }
    if (f.now && !P.feeding) {
      P.feeding = true;
      if (dist < 60 && P.warned !== -(id + 1)) { P.warned = -(id + 1); this.onNotice?.({ kind: 'now', pen: P.pen }); }
      const [fx, fz] = P.pen.feed.at;
      P.animals.forEach((a, i) => {
        if (a.state === 'melon') return;
        const ang = (i / P.animals.length) * Math.PI * 2;
        a.state = 'walk'; a.feed = true; a.t = 20;
        a.target = [fx + Math.cos(ang) * (1.4 + (RADIUS[a.kind] || 0.4)), fz + Math.sin(ang) * (1.4 + (RADIUS[a.kind] || 0.4))];
      });
    }
    if (!f.now && P.feeding) { P.feeding = false; for (const a of P.animals) a.feed = false; }
    if (P.food) P.food.visible = P.feeding;
  }

  // A photo pause: stand still at the fence for 2 s and one animal comes
  // over and looks at you for a few seconds (then not again for 25 s).
  _photo(P, lx, lz, dt) {
    P.pose = Math.max(0, P.pose - dt);
    if (P.pen.pet || P.pose > 0 || P.feeding || this.still.t < 2) return;
    const hw = P.pen.w / 2, hd = P.pen.d / 2;
    const out = Math.max(Math.abs(lx) - hw, Math.abs(lz) - hd);
    if (out < 0 || out > 4) return;
    const ix = Math.max(-hw + 1.5, Math.min(hw - 1.5, lx)), iz = Math.max(-hd + 1.5, Math.min(hd - 1.5, lz));
    const a = P.animals.filter((q) => q.state !== 'melon' && !q.slithers).sort((p, q) => Math.hypot(p.root.position.x - ix, p.root.position.z - iz) - Math.hypot(q.root.position.x - ix, q.root.position.z - iz))[0];
    if (!a) return;
    a.state = 'walk'; a.t = 8; a.posing = true;
    a.target = [ix - Math.sign(lx - ix || 0) * (RADIUS[a.kind] || 0.5), iz - Math.sign(lz - iz || 0) * (RADIUS[a.kind] || 0.5)];
    a.face = Math.atan2(lx - a.target[0], lz - a.target[1]);
    P.pose = 25;
  }

  _melon(dt) {
    for (const b of this.bits) { b.t += dt; b.m.position.addScaledVector(b.v, dt); b.v.y -= 9 * dt; if (b.t > 1.2) { this.scene.remove(b.m); b.dead = true; } }
    this.bits = this.bits.filter((b) => !b.dead);
    const M = this.melon;
    if (!M) return;
    const a = M.a, P = M.P;
    const arrived = Math.hypot(a.root.position.x - a.target[0], a.root.position.z - a.target[1]) < 0.4;
    M.t += dt;
    if (!M.thrown && (arrived || M.t > 12)) { M.thrown = true; M.t = 0; a.state = 'melonOpen'; a.t = 30; }
    if (!M.thrown) return;
    // Open wide, then the melon flies in an arc from you to the mouth.
    const open = Math.min(1, M.t / 0.8);
    if (a.jaw) a.jaw.rotation.x = open * 0.9 * (M.t < 2.1 ? 1 : 0);
    const mouth = new THREE.Vector3(0, 1.0, 1.6).applyEuler(a.root.rotation).add(a.root.position).add(new THREE.Vector3(P.pen.x, 0, P.pen.z));
    if (M.t > 0.8 && M.t < 2.1) {
      const u = (M.t - 0.8) / 1.3;
      M.mesh.visible = true;
      M.mesh.position.set(M.from[0] + (mouth.x - M.from[0]) * u, 1.2 + (mouth.y - 1.2) * u + Math.sin(u * Math.PI) * 2.2, M.from[1] + (mouth.z - M.from[1]) * u);
      M.mesh.rotation.x += dt * 6;
    }
    if (M.t >= 2.1 && M.mesh.visible) { // crunch
      M.mesh.visible = false;
      this.scene.remove(M.mesh);
      for (let i = 0; i < 14; i++) {
        const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.09, 0), mat(i % 3 ? '#e2445c' : '#3f8f3a'));
        m.position.copy(mouth);
        this.scene.add(m);
        this.bits.push({ m, t: 0, v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3) });
      }
      this.onNotice?.({ kind: 'crunch', pen: P.pen });
    }
    if (M.t > 2.1 && M.t < 4) a.head.rotation.x = Math.sin(M.t * 14) * 0.08; // chewing
    if (M.t > 4.5) { a.state = 'happy'; a.t = 2; a.face = a.root.rotation.y; this.melon = null; }
  }

  _step(a, dt, lx, lz) {
    a.t -= dt;
    a.phase += dt;
    const r = a.root, k = KIND[a.kind];
    const near = Math.hypot(lx - r.position.x, lz - r.position.z) < 7;
    let moving = false, hop = 0, low = 0;
    if ((a.state === 'walk' || a.state === 'melon') && a.target) {
      const [x0, z0, x1, z1] = a.box;
      const tx = Math.min(x1, Math.max(x0, a.target[0])), tz = Math.min(z1, Math.max(z0, a.target[1]));
      const dx = tx - r.position.x, dz = tz - r.position.z, d = Math.hypot(dx, dz);
      if (d < 0.3 || a.t <= 0) {
        if (a.state === 'melon') { turn(r, a.face, dt); } else if (a.feed) { a.state = 'eat'; a.t = 60; } else if (a.posing) { a.state = 'pose'; a.t = 4; a.posing = false; } else a.t = 0;
      } else {
        const sp = k.speed * (a.feed || a.state === 'melon' ? 1.5 : 1) * (a.sink > 0.1 ? 0.8 : 1) * dt;
        r.position.x += (dx / d) * Math.min(sp, d);
        r.position.z += (dz / d) * Math.min(sp, d);
        turn(r, Math.atan2(dx, dz), dt);
        moving = true;
        if (a.hop) hop = Math.abs(Math.sin(a.phase * 8)) * 0.12;
        if (a.shuffles && a.sink < 0.1) hop = Math.abs(Math.sin(a.phase * 6)) * 0.06;
      }
    } else if (a.state === 'happy') {
      turn(r, a.face, dt);
      hop = Math.abs(Math.sin(a.phase * 11)) * (a.kind === 'hippo' ? 0.05 : 0.12);
    } else if (a.state === 'pose') {
      turn(r, a.face, dt);
    } else if (a.state === 'eat') {
      if (!a.feed) a.t = 0;
    } else if (a.state === 'melonOpen') {
      turn(r, a.face, dt);
    } else if (a.state === 'sit') {
      low = a.bird || a.slithers ? 0 : 0.05;
    }
    if (a.t <= 0 && !a.state.startsWith('melon')) this._pick(a, lx, lz, near);
    // In the pond: sink so only the back shows.
    const pond = a.pen.pond;
    const inPond = a.swims && pond && Math.hypot(r.position.x - pond[0], r.position.z - pond[1]) < pond[2] - 0.3;
    a.sink += ((inPond ? SINK[a.kind] || 0.3 : 0) - a.sink) * Math.min(1, dt * 2);
    const step = moving && !a.hop && !a.shuffles ? Math.sin(a.phase * (a.bird ? 8 : 12)) * 0.45 : 0;
    a.legs.forEach((l, i) => { l.rotation.x = (i % 2 === (i < 2 ? 0 : 1) ? step : -step); });
    a.body.position.y += (hop - low - a.sink - a.body.position.y) * Math.min(1, dt * 12);
    // Grazing or eating: head down; preening: a bird turns its head back;
    // posing: head up, looking at you.
    const headDown = a.state === 'graze' || a.state === 'eat' ? 0.7 : a.state === 'pose' ? -0.15 : 0;
    if (a.state !== 'melonOpen') a.head.rotation.x += (headDown + (a.state === 'eat' ? Math.sin(a.phase * 8) * 0.1 : Math.sin(a.phase * 1.3) * 0.06) - a.head.rotation.x) * Math.min(1, dt * 4);
    a.head.rotation.y = a.state === 'preen' ? Math.sin(a.phase * 0.8) * 1.2 : a.state === 'pose' ? 0 : Math.sin(a.phase * 0.5) * 0.15;
    if (a.jaw && a.state !== 'melonOpen') a.jaw.rotation.x += (0 - a.jaw.rotation.x) * Math.min(1, dt * 8);
    if (a.tail) a.tail.rotation.y = a.fan ? 0 : Math.sin(a.phase * 4) * 0.3;
    if (a.wings && a.state === 'preen') a.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.abs(Math.sin(a.phase * 3)) * 0.4; });
    if (a.fan) this._fan(a, dt, near);
    if (a.slithers) { // S curves down the body, faster while moving
      const amp = moving ? 0.14 : 0.05, sp = moving ? 7 : 1.5;
      a.segs.forEach((s, i) => { s.position.x = Math.sin(a.phase * sp - i * 0.7) * amp * Math.min(1, i / 3); });
      a.tongue.visible = Math.sin(a.phase * 5) > 0.6;
    }
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
