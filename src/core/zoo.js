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
import { makeZooAnimal, ZOO_LOOKS, foldWings, SNAKE } from './zoo-animals.js';
import { hallMurals } from './zoo-murals.js';

const mat = matCache();
const AWAKE = 80;
export const FULL_FAN = 0.3; // how often a peacock opens its train all the way // only pens this close to the player move (metres)

// How each kind gets about: walking speed (m/s), how often it rests.
const KIND = {
  rabbit: { speed: 1.2, rest: 0.3 },
  guineapig: { speed: 0.6, rest: 0.35 },
  goat: { speed: 0.9, rest: 0.3 },
  sheep: { speed: 0.7, rest: 0.35 },
  macaque: { speed: 1.4, rest: 0.3 },
  flamingo: { speed: 0.5, rest: 0.45 },
  pelican: { speed: 0.6, rest: 0.45 },
  peacock: { speed: 0.6, rest: 0.35 },
  tiger: { speed: 1.3, rest: 0.3 },
  lion: { speed: 1.1, rest: 0.45 },
  bear: { speed: 0.9, rest: 0.3 },
  polarbear: { speed: 0.9, rest: 0.3 },
  seal: { speed: 1.4, rest: 0.25 },
  walrus: { speed: 0.6, rest: 0.4 },
  hippo: { swim: 0.2, speed: 0.6, rest: 0.4 },
  snake: { speed: 0.35, rest: 0.5 },
  elephant: { speed: 0.8, rest: 0.3 },
  giraffe: { speed: 0.9, rest: 0.3 },
  zebra: { speed: 1.6, rest: 0.3 },
  vulture: { speed: 0.5, rest: 0.5 },
  kangaroo: { speed: 1.5, rest: 0.4 },
  camel: { speed: 0.7, rest: 0.4 },
};
// Things animals do together, and on their own (core/zoo.js _social, _solo).
//   pair: walk over to a pen-mate of the same kind, then do it together.
//   solo: [act, chance] tried in turn when picking what to do next.
const SOCIAL = {
  tiger: { pair: 'tussle', p: 0.25, solo: [['pace', 0.25], ['roll', 0.12], ['stretch', 0.12]] },
  lion: { pair: 'tussle', p: 0.2, solo: [['roar', 0.15], ['roll', 0.12], ['stretch', 0.1]] },
  bear: { pair: 'wrestle', p: 0.3, solo: [['situp', 0.2], ['roll', 0.15]] },
  polarbear: { solo: [['roll', 0.2], ['situp', 0.15]] },
  goat: { pair: 'butt', p: 0.2, solo: [['rear', 0.12]] },
  sheep: { solo: [['follow', 0.45]] },
  rabbit: { pair: 'chase', p: 0.2, solo: [['binky', 0.25]] },
  guineapig: { pair: 'chase', p: 0.15, solo: [['popcorn', 0.2]] },
  seal: { pair: 'chase', p: 0.3, solo: [['bark', 0.25]] },
  walrus: { solo: [['bark', 0.2]] },
  hippo: { pair: 'nudge', p: 0.15, solo: [['yawn', 0.2]] },
  elephant: { pair: 'trunks', p: 0.2, solo: [['spray', 0.2], ['drink', 0.15]] },
  giraffe: { pair: 'necking', p: 0.2, solo: [['browse', 0.3], ['drink', 0.12]] },
  zebra: { pair: 'groom', p: 0.2, solo: [['gallop', 0.18], ['drink', 0.12], ['dust', 0.08]] },
  flamingo: { solo: [['oneleg', 0.3]] },
  kangaroo: { pair: 'chase', p: 0.2, solo: [['situp', 0.3]] }, // (up on their tails, looking round)
  camel: { pair: 'nudge', p: 0.15, solo: [['dust', 0.15], ['drink', 0.1]] },
};
// How long each act lasts (s).
const ACT_T = { tussle: 5, wrestle: 6, butt: 4, nudge: 4, trunks: 6, necking: 7, groom: 7, pace: 0, roll: 4, stretch: 2.5, roar: 3, situp: 5, rear: 2, binky: 1.6, popcorn: 1.4, bark: 3, yawn: 3, spray: 5, drink: 6, browse: 7, dust: 4, oneleg: 8 };
const BUSY = new Set(['melon', 'melonOpen', 'eat', 'snack', 'happy', 'pose', 'cheeky', 'climb', 'perch', 'jumpdown', 'flip', 'chase', 'wait']);
// A resting snake's coil: bead i's spot (snake-local), beads evenly spaced
// along a spiral that widens by about a body's width each turn.
const COIL = (() => {
  const out = [];
  let th = 0;
  for (let i = 0; i < SNAKE.n; i++) {
    const rad = 0.07 + (0.15 * th) / (Math.PI * 2);
    out.push([Math.sin(-th) * rad, Math.cos(-th) * rad - 0.05]);
    th += (SNAKE.gap * 1.25) / rad;
  }
  return out;
})();
// How deep a swimmer sinks in its pond (metres), so only its back shows.
const SINK = { polarbear: 0.6, seal: 0.3, walrus: 0.5, hippo: 0.8 };
const RADIUS = { elephant: 2, giraffe: 1.1, zebra: 0.85, rabbit: 0.2, guineapig: 0.3, goat: 0.45, sheep: 0.45, macaque: 0.3, flamingo: 0.3, pelican: 0.4, peacock: 0.35, tiger: 1.1, lion: 1.1, bear: 1.1, polarbear: 1.2, seal: 0.6, walrus: 1, hippo: 1.3, snake: 0.3, vulture: 0.5, kangaroo: 0.5, camel: 1 };

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
  if (kind === 'glass' || kind === 'house' || kind === 'tank') return glassFence(g, pen, kind);
  if (kind === 'hall') return hallWalls(g, pen);
  const H = kind === 'low' ? 1 : kind === 'mesh' ? 3 : pen.tall || 5; // (the vultures' aviary is taller, to fly in)
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
  const H = kind === 'glass' ? 1.3 : kind === 'tank' ? 3.2 : 3.2;
  const glass = new THREE.MeshLambertMaterial({ color: '#bfe6f2', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const hw = pen.w / 2, hd = pen.d / 2, front = pen.front || pen.board || 'n'; // (the glass side: its board's, or pen.front when it has none)
  const sides = { n: [-hw, -hd, hw, -hd], s: [-hw, hd, hw, hd], w: [-hw, -hd, -hw, hd], e: [hw, -hd, hw, hd] };
  for (const [k, [x1, z1, x2, z2]] of Object.entries(sides)) {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const see = kind === 'glass' || k === front; // a tank or house: glass only at the front
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

// Hall: a building you go into: tall walls with a door (pen.gate), a
// coloured band round the top, a roof. A closed one (pen.closed, the Sea
// Animals) is only the outside: its door is a storefront and its inside an
// interior map (core/zoo-sea-hall.js). An open one is a room inside:
// sea-blue walls with fish painted on, a high ceiling with lights. Those
// inner faces only show from inside, so while you are in, the zoo hides the
// outside shell and the camera behind you looks through the wall at your
// back while the room stays round you.
let seaTex = null;
export function seaWall() {
  return (seaTex ||= canvasTex(256, 256, (c, w, h) => {
    const gr = c.createLinearGradient?.(0, 0, 0, h);
    if (gr?.addColorStop) { gr.addColorStop(0, '#9fd8ef'); gr.addColorStop(1, '#2d6e9c'); c.fillStyle = gr; } else c.fillStyle = '#5aa0c8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    for (const [x, y, k] of [[50, 70, 1], [170, 110, 0.7], [90, 170, 0.9], [200, 200, 0.6]]) { // fish
      c.beginPath(); c.ellipse?.(x, y, 22 * k, 10 * k, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(x - 20 * k, y); c.lineTo(x - 34 * k, y - 10 * k); c.lineTo(x - 34 * k, y + 10 * k); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 12; i++) { c.beginPath(); c.arc?.((i * 47) % w, (i * 83) % h, 3 + (i % 3), 0, Math.PI * 2); c.fill(); } // bubbles
  }));
}
function hallWalls(g, pen) {
  const H = 7.5;
  const shell = new THREE.Group(); // everything that hides while you're inside
  shell.name = 'hall-shell';
  g.add(shell);
  for (const [x1, z1, x2, z2] of fenceLines(pen)) {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(z2 - z1, x2 - x1);
    if (len < 0.2) continue;
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, H, 0.3), mat('#e3eef2'));
    wall.position.set(mx, H / 2, mz); wall.rotation.y = -ang;
    const band = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, 0.6, 0.34), mat('#3f86b8'));
    band.position.set(mx, H - 0.5, mz); band.rotation.y = -ang;
    const wave = new THREE.Mesh(new THREE.BoxGeometry(len + 0.02, 0.12, 0.34), mat('#ffffff'));
    wave.position.set(mx, H - 0.95, mz); wave.rotation.y = -ang;
    shell.add(wall, band, wave);
    const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.32), mat('#3f86b8'));
    base.position.set(mx, 0.25, mz); base.rotation.y = -ang;
    g.add(base);
    if (pen.closed) continue; // (a closed hall's inside is a room of its own: no room side here)
    // The room side: a painted face looking in (seen only from inside).
    const nl = Math.hypot(mx, mz) || 1, ix = -mx / nl, iz = -mz / nl;
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(len, H), new THREE.MeshLambertMaterial({ map: seaWall() }));
    inner.position.set(mx + ix * 0.17, H / 2, mz + iz * 0.17);
    inner.rotation.y = Math.atan2(ix, iz);
    inner.name = 'hall-inner';
    g.add(inner);
  }
  if (pen.closed) { // a closed hall (its door is a storefront, inside an interior map): just the roof, never lifted
    const slab = new THREE.Mesh(new THREE.BoxGeometry(pen.w + 0.8, 0.3, pen.d + 0.8), mat('#5d8fb0'));
    slab.position.y = H + 0.15;
    shell.add(slab);
    shell.add(...hallMurals(pen, H)); // pictures on its outside (core/zoo-murals.js)
    return null;
  }
  // The ceiling, high up, seen from below, with rows of lights.
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(pen.w, pen.d).rotateX(Math.PI / 2), mat('#1f4f75'));
  ceil.position.y = H - 0.02;
  g.add(ceil);
  for (let x = -pen.w / 2 + 3; x < pen.w / 2 - 1; x += 6) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, pen.d - 4), new THREE.MeshBasicMaterial({ color: '#eaf7ff' }));
    lamp.position.set(x, H - 0.08, 0);
    g.add(lamp);
  }
  if (pen.gate) { // a lintel over the door
    const hw = pen.w / 2, hd = pen.d / 2, gw = pen.gate.w || 4, c = pen.gate.at || 0;
    const at = { n: [c, -hd, 0], s: [c, hd, 0], w: [-hw, c, Math.PI / 2], e: [hw, c, Math.PI / 2] }[pen.gate.side];
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(gw + 0.2, H - 3, 0.32), mat('#e3eef2'));
    lintel.position.set(at[0], 3 + (H - 3) / 2, at[1]); lintel.rotation.y = at[2];
    shell.add(lintel);
    // ...and its room side, over the door
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(gw + 0.2, H - 3), new THREE.MeshLambertMaterial({ map: seaWall() }));
    const nl = Math.hypot(at[0], at[1]) || 1;
    inner.position.set(at[0] - (at[0] / nl) * 0.17, 3 + (H - 3) / 2, at[1] - (at[1] / nl) * 0.17);
    inner.rotation.y = Math.atan2(-at[0] / nl, -at[1] / nl);
    g.add(inner);
  }
  const roof = shell;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(pen.w + 0.8, 0.3, pen.d + 0.8), mat('#5d8fb0'));
  slab.position.y = H + 0.15;
  roof.add(slab);
  return roof;
}

function buildProps(g, pen) {
  for (const [kind, x, z, ry = 0, h = 4] of pen.props || []) {
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
    } else if (kind === 'perch') { // a dead tree for the big birds: a bare trunk h high, a flat top and two stubby branches
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, h, 7), mat('#8d7a66'));
      trunk.position.y = h / 2;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.3, 0.16, 8), mat('#7a6856'));
      top.position.y = h - 0.02;
      p.add(trunk, top);
      for (const [y, a] of [[h * 0.55, 0.9], [h * 0.75, -2.2]]) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.3, 5), mat('#8d7a66'));
        b.position.set(Math.cos(a) * 0.5, y, Math.sin(a) * 0.5);
        b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        p.add(b);
      }
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

// The animal-food counter at the barn door: a little table with cups of
// pellets and carrots, and a sign.
function foodStand(g, [x, z]) {
  const s = new THREE.Group();
  s.position.set(x, 0, z - 0.6);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.6), mat('#a77a50'));
  top.position.y = 0.85;
  s.add(top);
  for (const [px, pz] of [[-0.7, -0.25], [0.7, -0.25], [-0.7, 0.25], [0.7, 0.25]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), mat('#7a5a3c'));
    leg.position.set(px, 0.42, pz);
    s.add(leg);
  }
  for (let i = 0; i < 4; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.14, 8), mat('#f2efe8'));
    cup.position.set(-0.5 + i * 0.33, 0.96, 0);
    const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.16, 5), mat('#ef8a2c'));
    carrot.position.set(-0.5 + i * 0.33, 1.08, 0);
    s.add(cup, carrot);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), new THREE.MeshLambertMaterial({ map: canvasTex(256, 86, (c, w, h) => {
    c.fillStyle = '#fff6df'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c4483d'; c.textAlign = 'center';
    c.font = 'bold 34px sans-serif'; c.fillText('🥕 먹이 · Food', w / 2, 40);
    c.font = '26px sans-serif'; c.fillText('🪙 1,000', w / 2, 74);
  }) }));
  sign.position.set(0, 1.45, -0.05);
  // faces south, where you stand to buy (in front of the barn door)
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), mat('#7a5a3c'));
  post.position.set(0, 1.15, 0);
  s.add(sign, post);
  g.add(s);
  return s;
}

// How many handfuls a cup of animal food holds.
export const FOOD_CUP = 5;

export class Zoo {
  // onNotice({ kind: 'soon' | 'now', pen }): a feeding is coming up or starting
  // near the player (the game shows a toast).
  constructor(scene, pens, onNotice = null) {
    this.onNotice = onNotice;
    this.onSound = null; // (a, motion): an animal starts a motion it may call with (game/zoo-sounds.js)
    this.pens = pens.map((pen) => this._build(scene, pen));
    this.radius = 0.5;
    this.still = { x: 0, z: 0, t: 0 };
    this.melon = null; // the watermelon in the air: { P, a, t, from, mesh }
    this.bits = []; // watermelon pieces flying after the crunch
    this.scene = scene;
    this.food = 0; // handfuls of animal food left in your cup (little animal village)
    this.indoors = false; // inside the Sea Animals hall (update)
  }

  // The food counter you are standing at, if any: the pen.
  shopSpot(x, z) {
    for (const P of this.pens) {
      if (!P.pen.shop) continue;
      const [sx, sz] = P.pen.shop.at;
      if (Math.hypot(x - P.pen.x - sx, z - P.pen.z - sz) < 1.8) return P;
    }
    return null;
  }

  // Bought a cup: the little animals notice and come over.
  buyFood() { this.food = FOOD_CUP; }

  // Feed one handful to an animal next to you: it eats from your hand.
  feedPet(a, x, z) {
    if (this.food <= 0) return false;
    this.food--;
    a.state = 'snack'; a.t = 2.5;
    a.face = Math.atan2(x - a.pen.x - a.root.position.x, z - a.pen.z - a.root.position.z);
    return true;
  }

  // The keeper you are next to (pen.keeper, pen-local): { P, x, z }.
  keeperSpot(x, z) {
    for (const P of this.pens) {
      if (!P.pen.keeper) continue;
      const [kx, kz] = P.pen.keeper.at;
      if (Math.hypot(x - P.pen.x - kx, z - P.pen.z - kz) < 2.6) return P;
    }
    return null;
  }

  _build(scene, pen) {
    const g = new THREE.Group();
    g.name = 'zoopen:' + pen.id;
    g.position.set(pen.x, 0, pen.z);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(pen.w, pen.d).rotateX(-Math.PI / 2), mat(pen.ground === 'dirt' ? '#d8c08f' : pen.ground === 'sand' ? '#ead6a0' : pen.ground === 'stone' ? '#cfd3d6' : '#86c46a'));
    ground.position.y = pen.in ? 0.04 : 0.03; // a tank's floor sits on its hall's
    ground.receiveShadow = true;
    g.add(ground);
    if (pen.pond) {
      const [px, pz, pr] = pen.pond;
      const water = new THREE.Mesh(new THREE.CircleGeometry(pr, 32).rotateX(-Math.PI / 2), mat('#5aaed6'));
      water.position.set(px, pen.in ? 0.06 : 0.05, pz);
      g.add(water);
    }
    const roof = buildFence(g, pen) || null;
    buildProps(g, pen);
    if (pen.name && pen.board !== false) { // (board: false, a name sign on the wall instead: core/zoo-sea-hall.js)
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
      const c = pen.feed.food === 'fish' ? '#b9c6cf' : pen.feed.food === 'greens' ? '#6fbf4a' : pen.feed.food === 'fruit' ? '#f2d34a' : '#c0504d';
      for (let i = 0; i < 9; i++) {
        const m = pen.feed.food === 'fruit' // bananas: curved yellow fingers in a pile
          ? new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 5, 8, Math.PI * 0.7), mat(c))
          : new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), mat(c));
        m.position.set(Math.cos(i) * 0.45, 0.3, Math.sin(i * 1.7) * 0.45);
        m.rotation.set(i * 0.7, i * 1.3, 0);
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
        animals.push({ ...a, kind: grp.kind, box, pen, state: 'idle', t: Math.random() * 3, phase: Math.random() * 6, fanT: 0, fanned: 0, sink: 0, neck0: a.neck?.rotation.x || 0 });
      }
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = !(o.material?.transparent); });
    if (pen.fence === 'hall' || pen.in) { // indoors: no snow settles on the floor, tanks or rocks
      g.userData.noSnow = true; // (core/snow-cover.js skips it, and its colours are its own, not the street's shared ones)
      g.traverse((o) => { if (o.isMesh && !o.material.map && !Array.isArray(o.material)) o.material = o.material.clone(); });
    }
    scene.add(g);
    let stand = null;
    if (pen.shop) stand = foodStand(g, pen.shop.at);
    return { pen, g, animals, food, roof, stand, feeding: false, warned: 0, pose: 0 };
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

  _pick(a, lx, lz, playerNear, P) {
    if (a.mate) { if (a.mate.mate === a) a.mate.mate = null; a.mate = null; }
    a.body.rotation.z = a.body.rotation.z % (Math.PI * 2);
    if (a.climbs && this._monkey(a, lx, lz, P)) return;
    if (!a.feed && !(playerNear && a.pen.pet && this.food > 0) && this._social(a, P)) return;
    const k = KIND[a.kind];
    const r = Math.random();
    const [x0, z0, x1, z1] = a.box;
    const pond = a.pen.pond;
    if (playerNear && a.pen.pet && r < (this.food > 0 ? 0.7 : 0.25)) { // come over to say hi (or for the food)
      a.state = 'walk'; a.target = [lx + (Math.random() - 0.5) * 1.6, lz + (Math.random() - 0.5) * 1.6]; a.t = 6;
    } else if (a.swims && pond && r < (k.swim ?? 0.55)) { // a swim round the pond
      const ang = Math.random() * Math.PI * 2, rr = Math.random() * pond[2] * 0.8;
      a.state = 'walk'; a.target = [pond[0] + Math.cos(ang) * rr, pond[1] + Math.sin(ang) * rr]; a.t = 12;
    } else if (r < 1 - k.rest || (k.swim != null && pond && Math.hypot(a.root.position.x - pond[0], a.root.position.z - pond[1]) < pond[2])) { // (a hippo doesn't sit about in the water: out it comes)
      a.state = 'walk'; a.target = [x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0)]; a.t = 8;
      for (let i = 0; i < 6 && k.swim != null && pond && Math.hypot(a.target[0] - pond[0], a.target[1] - pond[1]) < pond[2] + 0.5; i++) {
        a.target = [x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0)]; // (a walk on land, out of the water)
      }
    } else if (r < 1 - k.rest / 2) {
      a.state = a.bird ? 'preen' : 'graze'; a.t = 3 + Math.random() * 4;
    } else {
      a.state = 'sit'; a.t = 3 + Math.random() * 5;
    }
  }

  // Monkey business: the macaques show off. Returns true when it picked one.
  //   cheeky: comes to the fence by you, bounces and waves with its tail up
  //   flip:   a backflip on the spot
  //   climb:  up a pole of the climbing frame to the top deck, sits there
  //           swinging its legs, then jumps down
  //   chase:  runs after another monkey, which runs off
  //   scratch: sits and scratches its head
  _monkey(a, lx, lz, P) {
    if (a.feed) return false;
    if (a.lift > 0.1) { // up on the frame: jump back down
      a.state = 'jumpdown'; a.t = 0.8; a.from = a.lift;
      return true;
    }
    const r = Math.random();
    const hw = a.pen.w / 2, hd = a.pen.d / 2;
    const out = Math.max(Math.abs(lx) - hw, Math.abs(lz) - hd);
    if (out > 0 && out < 8 && r < 0.3) {
      const ix = Math.max(-hw + 0.8, Math.min(hw - 0.8, lx)), iz = Math.max(-hd + 0.8, Math.min(hd - 0.8, lz));
      a.state = 'walk'; a.then = 'cheeky'; a.target = [ix + (Math.random() - 0.5) * 2, iz]; a.t = 8;
      a.face = Math.atan2(lx - ix, lz - iz);
      return true;
    }
    if (r < 0.45) { a.state = 'flip'; a.t = 0.9; a.y0 = 0; return true; }
    const logs = (a.pen.props || []).filter((q) => q[0] === 'log');
    if (r < 0.62 && logs.length) {
      const [, x, z] = logs[Math.floor(Math.random() * logs.length)];
      const sx = Math.random() < 0.5 ? -1 : 1, sz = Math.random() < 0.5 ? -1 : 1;
      a.state = 'walk'; a.then = 'climb'; a.target = [x + 1.5 * sx, z + 1.5 * sz]; a.t = 10;
      a.deck = Math.random() < 0.5 ? 1.68 : 3.28;
      return true;
    }
    if (r < 0.78 && P) {
      const other = P.animals.find((q) => q !== a && q.climbs && !q.feed && !(q.lift > 0.1) && (q.state === 'sit' || q.state === 'idle' || q.state === 'graze' || q.state === 'walk'));
      if (other) {
        const [x0, z0, x1, z1] = other.box;
        other.state = 'walk'; other.run = 2.2; other.then = null; other.t = 5;
        other.target = [x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0)];
        a.state = 'chase'; a.prey = other; a.t = 5;
        return true;
      }
    }
    if (r < 0.9) { a.state = 'scratch'; a.t = 3 + Math.random() * 2; return true; }
    return false;
  }

  // Doing something together or alone (SOCIAL). Returns true when it did.
  _social(a, P) {
    const S = SOCIAL[a.kind];
    if (!S) return false;
    const box = a.box, [x0, z0, x1, z1] = box;
    const free = (b) => b !== a && b.kind === a.kind && !b.feed && !b.mate && !b.then && !BUSY.has(b.state) && !(b.lift > 0.1);
    // The elephant calf keeps close to its mother.
    if (a.calf) {
      const mum = P.animals.find((b) => b.kind === a.kind && !b.calf);
      if (mum && Math.random() < 0.6) {
        const m = mum.root.position, side = Math.random() < 0.5 ? -1 : 1;
        a.state = 'walk'; a.target = [m.x + side * 2.2, m.z - 1 + Math.random() * 2]; a.t = 8; a.run = 1.3;
        return true;
      }
    }
    if (S.pair && Math.random() < S.p) {
      const mates = P.animals.filter(free);
      const b = mates[Math.floor(Math.random() * mates.length)];
      if (b) {
        if (S.pair === 'chase') { // off it runs, and a goes after it
          b.state = 'walk'; b.run = 2.2; b.then = null; b.t = 4;
          b.target = [x0 + Math.random() * (x1 - x0), z0 + Math.random() * (z1 - z0)];
          a.state = 'chase'; a.prey = b; a.t = 4;
          return true;
        }
        const bp = b.root.position, gap = (RADIUS[a.kind] || 0.5) * 2 + 0.2;
        const ang = Math.random() * Math.PI * 2;
        a.state = 'walk'; a.target = [bp.x + Math.sin(ang) * gap, bp.z + Math.cos(ang) * gap]; a.t = 10; a.then = S.pair; a.mate = b;
        b.state = 'wait'; b.t = 11; b.mate = a; b.then = null;
        return true;
      }
    }
    for (const [act, p] of S.solo || []) {
      if (Math.random() >= p) continue;
      if (act === 'gallop') { // the whole herd runs off together
        const tx = x0 + Math.random() * (x1 - x0), tz = z0 + Math.random() * (z1 - z0);
        for (const b of P.animals) if (b.kind === a.kind && (b === a || free(b))) {
          b.state = 'walk'; b.run = 2.6; b.then = null; b.t = 9;
          b.target = [tx + (Math.random() - 0.5) * 5, tz + (Math.random() - 0.5) * 5];
        }
        return true;
      }
      if (act === 'follow') { // sheep: tag along behind another
        const b = P.animals.filter((q) => q !== a && q.kind === a.kind)[Math.floor(Math.random() * (P.animals.length - 1))];
        if (!b) continue;
        const bp = b.root.position, ry = b.root.rotation.y;
        a.state = 'walk'; a.target = [bp.x - Math.sin(ry) * 1.1 + (Math.random() - 0.5), bp.z - Math.cos(ry) * 1.1 + (Math.random() - 0.5)]; a.t = 6;
        return true;
      }
      if (act === 'drink' || act === 'browse') { // walk to the water / a tree first
        const spot = act === 'drink' ? a.pen.pond : (a.pen.props || []).find(([k]) => k === 'tree')?.slice(1);
        if (!spot) continue;
        const ang = Math.random() * Math.PI * 2, rr = act === 'drink' ? spot[2] + (RADIUS[a.kind] || 0.5) : 2.2;
        a.state = 'walk'; a.target = [spot[0] + Math.sin(ang) * rr, spot[1] + Math.cos(ang) * rr]; a.t = 14; a.then = act;
        a.spot = [spot[0], spot[1]];
        return true;
      }
      if (act === 'pace') { // a tiger pacing up and down along the front
        const z = a.box[1] + 0.5;
        a.state = 'walk'; a.target = [Math.random() < 0.5 ? x0 + 1 : x1 - 1, z]; a.t = 12; a.then = 'pace'; a.laps = (a.laps || 0) + 1;
        if (a.laps > 4) { a.laps = 0; a.then = null; }
        return true;
      }
      this._begin(a, act);
      return true;
    }
    return false;
  }

  // Start an act once there: with a mate, both do it facing each other.
  _begin(a, act) {
    if (act === 'pace') { const [x0, , x1] = a.box; a.state = 'walk'; a.target = [a.root.position.x < (x0 + x1) / 2 ? x1 - 1 : x0 + 1, a.box[1] + 0.5]; a.t = 12; a.then = a.laps++ < 4 ? 'pace' : null; return; }
    a.state = act; a.t = (ACT_T[act] || 4) * (0.8 + Math.random() * 0.4);
    const b = a.mate;
    if (b && b.mate === a) {
      const ap = a.root.position, bp = b.root.position;
      a.face = Math.atan2(bp.x - ap.x, bp.z - ap.z);
      b.face = act === 'necking' ? a.face : act === 'groom' ? a.face + Math.PI * 0.85 : a.face + Math.PI; // side by side / head to tail / face to face
      if (act === 'necking') a.face = b.face;
      b.state = act; b.t = a.t; b.lead = false; a.lead = true;
    } else if (a.spot) {
      a.face = Math.atan2(a.spot[0] - a.root.position.x, a.spot[1] - a.root.position.z);
      a.spot = null;
    } else a.face = a.root.rotation.y;
  }

  // How an act looks, frame by frame. Returns { hop, low, rx, rz, moving }.
  _act(a, dt) {
    const r = a.root, t = a.phase, ph = a.lead === false ? Math.PI : 0;
    const out = { hop: 0, low: 0, rx: 0, rz: 0, moving: false };
    const s = a.state;
    if (s === 'wait') { const m = a.mate; if (m) turn(r, Math.atan2(m.root.position.x - r.position.x, m.root.position.z - r.position.z), dt); if (!m || m.mate !== a) a.t = Math.min(a.t, 0); return out; }
    turn(r, a.face ?? r.rotation.y, dt);
    if (s === 'tussle') { // big cats at play: up on the hind legs, batting, rolling
      out.hop = Math.max(0, Math.sin(t * 5 + ph)) * 0.35; out.rx = -Math.max(0, Math.sin(t * 5 + ph)) * 0.5; out.rz = Math.sin(t * 3 + ph) * 0.2;
      const k = Math.sin(t * 2.5 + ph) * dt * 1.2; r.position.x += Math.sin(r.rotation.y) * k; r.position.z += Math.cos(r.rotation.y) * k;
    } else if (s === 'wrestle') { // bears standing up, pushing each other, swaying
      out.rx = -0.75 + Math.sin(t * 3 + ph) * 0.15; out.hop = 0.35; out.rz = Math.sin(t * 2 + ph) * 0.15;
    } else if (s === 'butt' || s === 'rear') { // goats: rear up... and clash
      const c = Math.sin(t * 3.2 + ph); out.rx = c > 0 ? -c * 0.6 : -c * 0.25; out.hop = Math.max(0, c) * 0.25;
    } else if (s === 'nudge') { out.rz = Math.sin(t * 2 + ph) * 0.08; a.jaw && (a.jaw.rotation.x = Math.max(0, Math.sin(t * 2)) * 0.5); }
    else if (s === 'roll') { out.rz = Math.min(Math.PI * 0.85, (ACT_T.roll - Math.max(0, a.t)) * 3) * (a.t > 0.6 ? 1 : a.t / 0.6); out.low = 0.1; a.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 9 + i) * 0.6; }); }
    else if (s === 'stretch') { out.rx = 0.25; out.low = 0.12; }
    else if (s === 'roar') { out.rx = -0.12; }
    else if (s === 'situp') { out.rx = -0.95; out.hop = 0.25; }
    else if (s === 'binky' || s === 'popcorn') { const u = (t * (s === 'binky' ? 4 : 6)) % 1; out.hop = Math.sin(u * Math.PI) * (s === 'binky' ? 0.4 : 0.15); out.rz = s === 'binky' ? Math.sin(u * Math.PI * 2) * 0.5 : 0; }
    else if (s === 'bark') { out.hop = Math.abs(Math.sin(t * 6)) * 0.08; out.rx = -0.2; }
    else if (s === 'yawn') { if (a.jaw) a.jaw.rotation.x = Math.sin(Math.min(1, (ACT_T.yawn - a.t) / ACT_T.yawn) * Math.PI) * 0.95; }
    else if (s === 'dust') { out.rz = Math.sin(Math.min(1, (ACT_T.dust - a.t) / ACT_T.dust) * Math.PI) * 1.4; out.low = 0.25; }
    else if (s === 'oneleg') { if (a.legs[1]) a.legs[1].rotation.x = -2.2; }
    return out;
  }

  // Trunk, ears and necks: the parts only some animals have.
  _parts(a, dt) {
    const t = a.phase, s = a.state, k = Math.min(1, dt * 4);
    if (a.ears) { // elephant ears: a slow fan, fast when excited
      const fast = s === 'trunks' || s === 'spray' || a.run > 1;
      a.ears.forEach((e, i) => { e.rotation.y = (i ? 1 : -1) * (0.35 + Math.sin(t * (fast ? 7 : 1.6)) * (fast ? 0.45 : 0.25)); });
    }
    if (a.flaps) { // hippo ears: still, then a quick flutter: right after coming up out of the water, while it yawns or munches, and now and then
      const up = a.sink < 0.25 && (a.wasDown || 0) > 0.5;
      a.wasDown = a.sink > 0.5 ? 1 : a.sink < 0.25 ? 0 : a.wasDown || 0;
      a.flick = (a.flick || 0) - dt;
      if (up || (a.flick < -1.2 && Math.random() < dt * (s === 'yawn' || s === 'melonOpen' || s === 'happy' || s === 'eat' ? 2 : 0.4))) a.flick = 0.5 + Math.random() * 0.5;
      const f = a.flick > 0 ? Math.sin(t * 34) * 0.7 * Math.min(1, a.flick * 4) : 0;
      a.flaps.forEach((e, i) => { const sd = i ? 1 : -1; e.rotation.y = f * 1.3 * sd; e.rotation.z = -0.35 * sd + f * 0.4 * sd; }); // (a quick twist to and fro, like a hippo's)
    }
    if (a.trunk) {
      const up = s === 'spray' ? -0.42 : s === 'trunks' ? -0.3 : s === 'drink' || s === 'eat' || s === 'graze' ? 0.18 : 0.1;
      a.trunk.forEach((seg, i) => {
        const want = i === 0 ? up + 0.15 : up + (s === 'trunks' ? Math.sin(t * 3 + i) * 0.12 : 0);
        seg.rotation.x += (want - seg.rotation.x) * k;
        seg.rotation.z = Math.sin(t * 1.3 - i * 0.5) * (s === 'drink' ? 0.02 : 0.1);
      });
      if (s === 'spray') this._spray(a, t); else if (a.drops) a.drops.visible = false;
    }
    if (a.neck) {
      const tall = a.kind === 'giraffe';
      let want = a.neck0;
      if (s === 'graze' || s === 'eat') want += tall ? 0.9 : 0.8;
      else if (s === 'drink') want += tall ? 1.55 : 0.9;
      else if (s === 'browse') want -= 0.3;
      else if (s === 'groom') want += 0.5 + Math.sin(t * 6) * 0.1;
      const swing = s === 'necking' ? Math.sin(t * 1.6 + (a.lead === false ? Math.PI : 0)) * 0.4 : 0;
      if (a.neck2) { // two joints: the base bends part of the way, the top curves the rest (and sways a little)
        const bend = want - a.neck0;
        const top = s === 'browse' ? -0.45 : bend > 0 ? bend * 0.55 : Math.sin(t * 0.7) * 0.06;
        want = a.neck0 + (bend > 0 ? bend * 0.55 : bend);
        a.neck2.rotation.x += (top - a.neck2.rotation.x) * Math.min(1, dt * 2);
        a.neck2.rotation.z += (swing * 0.8 - a.neck2.rotation.z) * k;
      }
      a.neck.rotation.x += (want - a.neck.rotation.x) * Math.min(1, dt * 2);
      a.neck.rotation.z += (swing - a.neck.rotation.z) * k;
      if (tall && s === 'drink') a.legs.forEach((l, i) => { l.rotation.z = (i % 2 ? -1 : 1) * 0.25; }); else if (tall) a.legs.forEach((l) => { l.rotation.z *= 0.9; });
    }
  }

  // Water from an elephant's trunk: drops in an arc over its back.
  _spray(a, t) {
    if (!a.drops) {
      a.drops = new THREE.Group();
      for (let i = 0; i < 14; i++) a.drops.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), mat('#8fd0f0')));
      a.root.add(a.drops);
    }
    a.drops.visible = true;
    const sc = a.calf ? 0.55 : 1;
    a.drops.children.forEach((d, i) => {
      const u = (t * 0.8 + i / 14) % 1;
      d.position.set(Math.sin(i * 2.3) * 0.3 * sc, (3.4 + Math.sin(u * Math.PI) * 1.6 - u * 1.4) * sc, (1.4 - u * 3.2) * sc);
    });
  }

  update(dt, player) {
    const now = Date.now() / 1000;
    // Standing still? (a photo pause waits for that)
    if (Math.hypot(player.x - this.still.x, player.z - this.still.z) > 0.3) { this.still = { x: player.x, z: player.z, t: 0 }; } else this.still.t += dt;
    this.indoors = false; // in a hall (the Sea Animals): a room, so no rain or snow, a camera under its ceiling (main.js)
    for (const P of this.pens) {
      const lx = player.x - P.pen.x, lz = player.z - P.pen.z;
      const dist = Math.hypot(lx, lz);
      if (dist > AWAKE + Math.max(P.pen.w, P.pen.d) / 2) { P.feeding = false; continue; }
      if (P.roof) { // the hall's roof and walls lift away while you're inside
        const inside = Math.abs(lx) < P.pen.w / 2 + 0.5 && Math.abs(lz) < P.pen.d / 2 + 0.5;
        P.roof.visible = !inside;
        if (Math.abs(lx) < P.pen.w / 2 && Math.abs(lz) < P.pen.d / 2) this.indoors = true;
      }
      if (P.pen.feed) this._feeding(P, now, dist);
      this._photo(P, lx, lz, dt);
      for (const a of P.animals) { this._step(a, dt, lx, lz, P); this._heard(a); }
    }
    this._melon(dt);
  }

  // A new motion: a state, the peacock's fan opening, a vulture taking off.
  _heard(a) {
    const m = a.fan && a.fanT > 0 ? 'fan' : a.flies ? a.mode : a.state;
    if (m === a.heard) return;
    a.heard = m;
    this.onSound?.(a, m);
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
    if (P.animals.some((q) => q.flies)) { // the vultures: one on a perch opens its wings to you
      const b = P.animals.filter((q) => q.flies && !q.fl && q.mode !== 'eat').sort((p, q) => Math.hypot(p.root.position.x - lx, p.root.position.z - lz) - Math.hypot(q.root.position.x - lx, q.root.position.z - lz))[0];
      if (b) { b.mode = 'spread'; b.wait = 5; b.face = Math.atan2(lx - b.root.position.x, lz - b.root.position.z); P.pose = 25; }
      return;
    }
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

  _step(a, dt, lx, lz, P) {
    if (a.flies) return this._raptor(a, dt, lx, lz, P);
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
        if (a.state === 'melon') { turn(r, a.face, dt); } else if (a.feed) { a.state = 'eat'; a.t = 60; } else if (a.posing) { a.state = 'pose'; a.t = 4; a.posing = false; } else if (a.then === 'cheeky') { a.state = 'cheeky'; a.t = 4; a.then = null; } else if (a.then === 'climb') { a.state = 'climb'; a.t = 1.6; a.then = null; } else if (a.then) { const act = a.then; a.then = null; this._begin(a, act); } else a.t = 0;
        a.run = 0;
      } else {
        const sp = k.speed * (a.run || (a.feed || a.state === 'melon' ? 1.5 : 1)) * (a.sink > 0.1 ? 0.8 : 1) * dt;
        r.position.x += (dx / d) * Math.min(sp, d);
        r.position.z += (dz / d) * Math.min(sp, d);
        turn(r, Math.atan2(dx, dz), dt);
        moving = true;
        if (a.hop) hop = Math.abs(Math.sin(a.phase * (a.hopRate || 8))) * (a.hopH || 0.12);
        if (a.shuffles && a.sink < 0.1) hop = Math.abs(Math.sin(a.phase * 6)) * 0.06;
      }
    } else if (a.state === 'happy') {
      turn(r, a.face, dt);
      hop = Math.abs(Math.sin(a.phase * 11)) * (a.kind === 'hippo' ? 0.05 : 0.12);
    } else if (a.state === 'snack') { // eating from your hand: head down, nibbling
      turn(r, a.face, dt);
    } else if (a.state === 'pose' || a.state === 'cheeky') {
      turn(r, a.face, dt);
      if (a.state === 'cheeky') hop = Math.abs(Math.sin(a.phase * 9)) * 0.25;
    } else if (a.state === 'chase') {
      const q = a.prey, dx = q.root.position.x - r.position.x, dz = q.root.position.z - r.position.z, d = Math.hypot(dx, dz);
      if (d > 0.6) { const sp = k.speed * 2.4 * dt; r.position.x += (dx / d) * sp; r.position.z += (dz / d) * sp; turn(r, Math.atan2(dx, dz), dt); moving = true; if (a.hop) hop = Math.abs(Math.sin(a.phase * (a.hopRate || 8))) * (a.hopH || 0.12); }
    } else if (a.state === 'flip') {
      const u = 1 - Math.max(0, a.t) / 0.9; // 0..1
      hop = Math.sin(u * Math.PI) * 0.7;
      a.body.rotation.x = -u * Math.PI * 2;
      if (a.t <= 0) a.body.rotation.x = 0;
    } else if (a.state === 'climb') { // up the pole, hand over hand
      a.lift = Math.min(a.deck, (a.lift || 0) + dt * a.deck / 1.5);
      if (a.lift >= a.deck) { a.state = 'perch'; a.t = 6 + Math.random() * 6; }
    } else if (a.state === 'jumpdown') {
      const u = 1 - Math.max(0, a.t) / 0.8;
      a.lift = Math.max(0, a.from * (1 - u * u) + Math.sin(u * Math.PI) * 0.4);
      if (a.t <= 0) a.lift = 0;
    } else if (a.state === 'eat') {
      if (!a.feed) a.t = 0;
    } else if (a.state === 'melonOpen') {
      turn(r, a.face, dt);
    } else if (a.state === 'sit') {
      low = a.bird || a.slithers ? 0 : 0.05;
    }
    let rx = 0, rz = 0;
    if (a.state in ACT_T || a.state === 'wait') { const o = this._act(a, dt); hop = o.hop; low = o.low; rx = o.rx; rz = o.rz; }
    if (a.state !== 'flip') { const k2 = Math.min(1, dt * 6); a.body.rotation.x += (rx - a.body.rotation.x) * k2; a.body.rotation.z += (rz - a.body.rotation.z) * k2; }
    if (a.t <= 0 && !a.state.startsWith('melon')) this._pick(a, lx, lz, near, P);
    if (a.climbs) r.position.y = a.lift || 0;
    // In the pond: sink so only the back shows.
    const pond = a.pen.pond;
    const inPond = a.swims && pond && Math.hypot(r.position.x - pond[0], r.position.z - pond[1]) < pond[2] - 0.3;
    a.sink += ((inPond ? SINK[a.kind] || 0.3 : 0) - a.sink) * Math.min(1, dt * 2);
    const step = moving && !a.hop && !a.shuffles ? Math.sin(a.phase * (a.bird ? 8 : 12)) * 0.45 : 0;
    if (a.state !== 'roll' && a.state !== 'oneleg') a.legs.forEach((l, i) => { l.rotation.x = (i % 2 === (i < 2 ? 0 : 1) ? step : -step); });
    this._parts(a, dt);
    if (a.arms) this._arms(a);
    a.body.position.y += (hop - low - a.sink - a.body.position.y) * Math.min(1, dt * 12);
    // Grazing or eating: head down; preening: a bird turns its head back;
    // posing: head up, looking at you.
    const headDown = a.neck ? (a.state === 'browse' ? -0.4 : a.state === 'graze' || a.state === 'eat' || a.state === 'drink' ? 0.3 : 0) : a.state === 'graze' || a.state === 'eat' || a.state === 'drink' ? 0.7 : a.state === 'snack' ? 0.35 : a.state === 'pose' ? -0.15 : a.state === 'roar' || a.state === 'bark' || a.state === 'yawn' ? -0.45 : 0;
    if (a.state !== 'melonOpen') a.head.rotation.x += (headDown + (a.state === 'eat' || a.state === 'snack' ? Math.sin(a.phase * 8) * 0.1 : Math.sin(a.phase * 1.3) * 0.06) - a.head.rotation.x) * Math.min(1, dt * 4);
    a.head.rotation.y = a.state === 'preen' ? Math.sin(a.phase * 0.8) * 1.2 : a.state === 'pose' ? 0 : Math.sin(a.phase * 0.5) * 0.15;
    if (a.jaw && a.state !== 'melonOpen' && a.state !== 'yawn' && a.state !== 'nudge') a.jaw.rotation.x += (0 - a.jaw.rotation.x) * Math.min(1, dt * 8);
    if (a.tail) a.tail.rotation.y = a.fan ? 0 : Math.sin(a.phase * (a.state === 'groom' || a.state === 'tussle' ? 9 : 4)) * (a.state === 'groom' ? 0.6 : 0.3);
    if (a.wings && a.state === 'preen') a.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.abs(Math.sin(a.phase * 3)) * 0.4; });
    if (a.fan) this._fan(a, dt, near);
    if (a.slithers) this._slither(a, dt, moving);
  }

  // A snake's body follows its head: the head weaves side to side as it
  // goes, leaving a wavy track, and each bead sits on that track a little
  // further back (a.trail, pen-local points, newest first). At rest for a
  // while it curls up in a coil with its head raised, the tongue flicking
  // in short bursts.
  _slither(a, dt, moving) {
    const r = a.root, ry = r.rotation.y, gap = SNAKE.gap;
    if (!a.trail) { a.trail = [[r.position.x, r.position.z]]; a.still = 0; a.coil = 0; }
    a.still = moving ? 0 : a.still + dt;
    a.coil += ((a.still > 2 ? 1 : 0) - a.coil) * Math.min(1, dt * (moving ? 3 : 0.8));
    const weave = moving ? Math.sin(a.phase * 4.5) * 0.12 : 0; // side to side
    const hx = r.position.x + Math.sin(ry) * 0.07 + Math.cos(ry) * weave, hz = r.position.z + Math.cos(ry) * 0.07 - Math.sin(ry) * weave;
    const last = a.trail[0];
    if (Math.hypot(hx - last[0], hz - last[1]) > 0.02) { a.trail.unshift([hx, hz]); if (a.trail.length > 200) a.trail.length = 200; }
    const cos = Math.cos(ry), sin = Math.sin(ry);
    // Walk back along the track: point at distance d behind the head.
    let k = 0, acc = 0;
    const back = (d) => {
      while (k < a.trail.length - 1) {
        const [x1, z1] = a.trail[k], [x2, z2] = a.trail[k + 1], l = Math.hypot(x2 - x1, z2 - z1);
        if (acc + l >= d) { const u = (d - acc) / (l || 1); return [x1 + (x2 - x1) * u, z1 + (z2 - z1) * u]; }
        acc += l; k++;
      }
      const [x, z] = a.trail.at(-1); // (a short track: the rest lies straight behind)
      return [x - sin * (d - acc), z - cos * (d - acc)];
    };
    a.segs.forEach((s, i) => {
      const [tx, tz] = back(0.07 + i * gap);
      const dx = tx - r.position.x, dz = tz - r.position.z;
      const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos; // into the snake's own frame
      const [cx, cz] = COIL[i] || COIL.at(-1); // the coil: a spiral round its middle
      s.position.x = lx + (cx - lx) * a.coil;
      s.position.z = lz + (cz - lz) * a.coil;
      s.position.y = s.userData.r * 0.8 + (i < 4 ? (4 - i) * 0.02 * a.coil : 0);
    });
    a.head.position.y = 0.09 + a.coil * 0.12; // head up, looking round, when coiled
    a.head.position.z = 0.07 + (0.02 - 0.07) * a.coil;
    a.flickT = (a.flickT ?? 0) - dt;
    if (a.flickT < -1.5 - Math.random() * 2) a.flickT = 0.6;
    a.tongue.visible = a.flickT > 0 && Math.sin(a.phase * 30) > 0;
    a.tongue.scale.z = 0.6 + Math.abs(Math.sin(a.phase * 15)) * 0.6;
  }

  // The vultures (pen.props "perch": dead trees, [kind, x, z, ry, height]):
  // they sit on the perches looking round, now and then open their wings
  // wide, and fly to another perch the long way, a lap or so round the
  // aviary under its roof. At feeding time they come down to the food on
  // the ground. Their own timer (a.wait) and mode, as zoo.js's walking
  // states don't fit something that flies.
  _perches(P) {
    return (P.perches ||= (P.pen.props || []).filter((q) => q[0] === 'perch').map(([, x, z, , h = 4]) => ({ x, z, y: h + 0.06 })));
  }
  _freePerch(P, not) {
    const list = this._perches(P).filter((q) => q !== not && !P.animals.some((b) => b.at === q || b.fl?.to === q));
    return list[Math.floor(Math.random() * list.length)] || null;
  }
  _flyTo(a, P, to, y = to.y) {
    const r = a.root.position, pen = P.pen;
    const ex = pen.w / 2 - 2.5, ez = pen.d / 2 - 2.5, top = Math.min((pen.tall || 5) - 1.5, 7.5);
    const angA = Math.atan2(r.z / ez, r.x / ex), angB = Math.atan2(to.z / ez, to.x / ex), dir = Math.random() < 0.5 ? 1 : -1;
    let total = ((dir * (angB - angA)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (total < Math.PI) total += Math.PI * 2; // at least half a lap, often more
    const n = Math.ceil(total / (Math.PI / 3));
    const pts = [r.clone(), new THREE.Vector3(r.x, r.y + 1.2, r.z)];
    for (let k = 1; k < n; k++) {
      const ang = angA + (dir * total * k) / n;
      pts.push(new THREE.Vector3(Math.cos(ang) * ex, top - 1 + Math.sin(k * 1.7) * 0.8, Math.sin(ang) * ez));
    }
    pts.push(new THREE.Vector3(to.x, y + 1.4, to.z), new THREE.Vector3(to.x, y, to.z));
    const curve = new THREE.CatmullRomCurve3(pts);
    a.fl = { curve, t: 0, T: curve.getLength() / 4.2, to, y };
    a.at = null; a.mode = 'fly';
  }
  _raptor(a, dt, lx, lz, P) {
    a.phase += dt;
    a.wait = (a.wait ?? 2 + Math.random() * 6) - dt;
    const r = a.root;
    if (a.at === undefined) { // first time: onto a free perch
      const q = this._freePerch(P) || { x: r.position.x, z: r.position.z, y: 0 };
      a.at = q; r.position.set(q.x, q.y, q.z); a.mode = 'sit'; a.spread = 0;
    }
    let spread = 0, flap = 0, tuck = 0;
    if (a.fl) {
      const F = a.fl;
      F.t += dt;
      const u = Math.min(1, F.t / F.T);
      const p = F.curve.getPointAt(u), tg = F.curve.getTangentAt(u);
      r.position.copy(p);
      const yaw = Math.atan2(tg.x, tg.z);
      const dy = Math.atan2(Math.sin(yaw - r.rotation.y), Math.cos(yaw - r.rotation.y));
      r.rotation.y += dy * Math.min(1, dt * 6);
      a.body.rotation.z += (Math.max(-0.6, Math.min(0.6, -dy * 3)) - a.body.rotation.z) * Math.min(1, dt * 4); // bank into the turn
      a.body.rotation.x = -Math.asin(Math.max(-1, Math.min(1, tg.y))) * 0.6;
      spread = 1;
      const hard = u < 0.15 || u > 0.88; // big wingbeats taking off and landing, a glide between
      flap = hard ? Math.sin(a.phase * 13) * 0.65 : Math.sin(a.phase * 4) * 0.12;
      tuck = u > 0.92 ? 0 : 1;
      if (u >= 1) {
        a.fl = null; a.at = F.to; r.position.set(F.to.x, F.y, F.to.z);
        a.body.rotation.set(0, 0, 0);
        a.mode = a.feed && F.to.food ? 'eat' : 'sit'; a.wait = 4 + Math.random() * 8;
      }
    } else if (a.feed && !a.at?.food) { // feeding time: down to the food
      const [fx, fz] = P.pen.feed.at, i = P.animals.indexOf(a), ang = (i / P.animals.length) * Math.PI * 2;
      this._flyTo(a, P, { x: fx + Math.cos(ang) * 1.6, z: fz + Math.sin(ang) * 1.6, y: 0, food: true });
    } else if (a.at?.food && !a.feed && a.wait <= 0) { // fed: back up to a perch
      const q = this._freePerch(P);
      if (q) this._flyTo(a, P, q); else a.wait = 3;
    } else if (a.mode === 'eat') {
      turn(r, Math.atan2(P.pen.feed.at[0] - r.position.x, P.pen.feed.at[1] - r.position.z), dt);
    } else if (a.mode === 'spread') { // wings wide open, facing you: the photo
      turn(r, a.face, dt);
      spread = 1; flap = 0.15 + Math.sin(a.phase * 2) * 0.05;
      if (a.wait <= 0) { a.mode = 'sit'; a.wait = 4 + Math.random() * 6; }
    } else if (a.wait <= 0) { // sitting: what next?
      const k = Math.random();
      const q = k < 0.45 && !a.at?.food ? this._freePerch(P, a.at) : null;
      if (q) this._flyTo(a, P, q);
      else if (k < 0.65) { a.mode = 'spread'; a.wait = 3.5; a.face = r.rotation.y; }
      else { a.mode = 'sit'; a.wait = 4 + Math.random() * 8; }
    }
    a.spread = (a.spread || 0) + (spread - (a.spread || 0)) * Math.min(1, dt * (spread ? 5 : 3));
    foldWings(a, a.spread, flap * a.spread);
    a.legs.forEach((l) => { l.rotation.x += (tuck * 1.3 - l.rotation.x) * Math.min(1, dt * 6); });
    if (a.shadow) a.shadow.visible = !a.fl;
    const eat = a.mode === 'eat';
    a.head.rotation.x = eat ? 0.6 + Math.sin(a.phase * 8) * 0.15 : a.fl ? 0.2 : Math.sin(a.phase * 1.1) * 0.06;
    a.head.rotation.y = a.fl || eat ? 0 : Math.sin(a.phase * 0.7) * 0.9 * (Math.sin(a.phase * 0.23) > 0 ? 1 : 0.3);
  }

  // What a monkey's arms are up to (after the walk has swung them).
  _arms(a) {
    const [L, R] = a.arms, t = a.phase;
    L.rotation.z = 0; R.rotation.z = 0;
    if (a.state === 'cheeky') { // one arm waving over its head, the tail wagging
      R.rotation.x = Math.PI * 0.9; R.rotation.z = Math.sin(t * 10) * 0.5;
      L.rotation.x = -0.4;
      a.tail.rotation.y = Math.sin(t * 14) * 0.6;
      a.mouth.scale.y = 3;
    } else if (a.state === 'scratch') { // a hand up on its head, scratching
      R.rotation.x = Math.PI * 0.8; R.rotation.z = -0.5 + Math.sin(t * 16) * 0.15;
      L.rotation.x = 0.3;
      a.head.rotation.z = 0.25;
    } else if (a.state === 'climb') { // hand over hand up the pole
      L.rotation.x = Math.PI * 0.85 + Math.sin(t * 12) * 0.3; R.rotation.x = Math.PI * 0.85 - Math.sin(t * 12) * 0.3;
    } else if (a.state === 'perch') { // sitting up top, legs dangling and swinging
      a.legs[0].rotation.x = -1.3 + Math.sin(t * 4) * 0.4; a.legs[1].rotation.x = -1.3 - Math.sin(t * 4) * 0.4;
      L.rotation.x = 0.2; R.rotation.x = 0.2;
    } else if (a.state === 'flip' || a.state === 'jumpdown') { L.rotation.x = R.rotation.x = Math.PI; } // arms up
    else if (a.state === 'eat') { R.rotation.x = 2.2 + Math.sin(t * 6) * 0.2; } // a banana to the mouth
    if (a.state !== 'scratch') a.head.rotation.z = 0;
    if (a.state !== 'cheeky') a.mouth.scale.y = 1;
  }

  // A peacock fans its train now and then while someone is close by: mostly
  // half open, and about 3 times in 10 all the way, a full wheel that
  // shivers. Watching for a while (~20 s) makes the next show come sooner.
  _fan(a, dt, near) {
    a.watch = near ? (a.watch || 0) + dt : Math.max(0, (a.watch || 0) - dt * 2);
    if (a.fanT > 0) a.fanT -= dt;
    else if (near && Math.random() < dt / (a.watch > 20 ? 4 : 18)) {
      a.full = Math.random() < FULL_FAN;
      a.fanT = a.full ? 9 : 6; a.watch = 0; a.state = 'sit'; a.t = a.fanT + 1;
    }
    const want = a.fanT > 0 ? (a.full ? 1 : 0.45) : 0;
    a.fanned += (want - a.fanned) * Math.min(1, dt * 2.5);
    const f = a.fanned;
    a.tail.rotation.x = -Math.PI / 2 + 0.25 + Math.min(1, f * 1.6) * (Math.PI / 2 - 0.4);
    for (const fe of a.fan) fe.rotation.z = fe.userData.u * (0.25 + f * 3.4);
    if (f > 0.8) a.tail.rotation.y = Math.sin(a.phase * 18) * 0.025; // the shiver
  }
}

export function turn(r, ry, dt) {
  let d = ry - r.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  r.rotation.y += d * Math.min(1, dt * 5);
}
