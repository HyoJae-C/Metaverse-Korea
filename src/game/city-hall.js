// The people on Seoul Plaza's lawn, made when you first come near
// (game/city-hall-near.js): a few sitting on the grass in twos and threes and
// one standing to take in the two City Halls. Seven in all: each costs six
// draws and ~6,000 triangles, and the middle of town is already heavy. So the plaza already has people on it when you arrive
// (Yozi: a place should not look empty). They are on this device only, like
// the street's passers-by, and say hello when greeted.
//
// Also the civil service desk by the old hall's door: a clerk at a small
// counter, where you change or decorate your name as at an information
// centre (Yozi 2026-11-24: the centres are like neighbourhood offices, City
// Hall does it too). The clerk's button opens the same name panel.
//
// Cheap on purpose: the sitters hold one pose (animated only while you are
// within sight), nothing here has a light or a texture of its own.
import * as THREE from 'three';
import { makeNpc, say, placeLabels, PHRASES } from '../core/npcs.js';

const HIDE = 80; // m from the lawn's middle: past this nobody here is drawn
const NAMES = ['Sora', 'Jun', 'Mina', 'Taeho', 'Yeji', 'Hyun', 'Dami', 'Seojun', 'Nari', 'Kai', 'Bora', 'Eunwoo'];
const SAY = [
  ['잔디밭에 앉았다 가세요!', 'jandibate anjatda gaseyo!', 'Come and sit on the grass for a while!'],
  ['뒤에 돌 건물이 옛 시청이에요.', 'dwie dol geonmuri yet sicheongieyo', 'The stone building behind is the old City Hall.'],
  ['유리 건물이 지금 시청이에요.', 'yuri geonmuri jigeum sicheongieyo', 'The glass building is today\'s City Hall.'],
  ['돗자리 있으면 여기 펴도 돼요.', 'dotjari isseumyeon yeogi pyeodo dwaeyo', 'If you have a picnic mat, you can spread it here.'],
  ...PHRASES.street.slice(0, 3),
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const SIT_Y = -0.38; // a seated pose is for a chair: down onto the grass

// Where they are, in the lawn's own frame: x across (-1 west … 1 east), z along (-1 north … 1 south).
// g: a group sits in a ring facing its middle; solo sitters face the halls (north).
const SPOTS = [
  { g: [-0.42, -0.35], n: 3, r: 0.9 },
  { g: [0.38, -0.1], n: 2, r: 0.75 },
  { at: [-0.15, 0.5], sit: true },
  { at: [0.02, 0.05], stand: true }, // standing in the middle, looking up at the halls
];

// game: { scene, labels, lawn, centre, randomLook }
export function createCityHall(game) {
  const [cx, cz] = game.centre;
  const xs = game.lawn.map((q) => q[0]), zs = game.lawn.map((q) => q[1]);
  const hw = (Math.max(...xs) - Math.min(...xs)) / 2, hd = (Math.max(...zs) - Math.min(...zs)) / 2;
  const people = [];
  let k = 0;
  const add = (x, z, ry, sit) => {
    const o = makeNpc(game.labels, NAMES[k++ % NAMES.length], game.randomLook?.());
    o.sit = sit; o.home = ry; o.owner = api;
    o.ch.root.position.set(x, sit ? SIT_Y : 0, z);
    o.ch.root.rotation.y = ry;
    if (sit) o.labelY = 1.15;
    game.scene.add(o.ch.root);
    people.push(o);
  };
  const staff = []; // the desk's clerk: not one of the people on the grass
  const api = {
    people, staff,
    nearest(x, z, max = 2.4) {
      let best = null, bd = max;
      for (const o of [...staff, ...people]) { const d = Math.hypot(o.ch.root.position.x - x, o.ch.root.position.z - z); if (d < bd) { bd = d; best = o; } }
      return best;
    },
    greet(o, x, z) {
      if (o.act) { o.ch.wave(); return; }
      o.talkT = 5;
      if (!o.sit) o.ch.root.rotation.y = Math.atan2(x - o.ch.root.position.x, z - o.ch.root.position.z);
      o.ch.wave();
      say(o, game.labels, pick(SAY));
    },
    update(p, dt, camera, w, h) {
      const show = Math.hypot(p.x - cx, p.z - cz) < HIDE;
      for (const o of [...staff, ...people]) {
        const r = o.ch.root;
        if (r.visible !== show) { r.visible = show; if (!show) { o.tag.style.display = 'none'; if (o.bubble) o.bubble.style.display = 'none'; } }
        if (!show) continue;
        if (o.talkT > 0) { o.talkT -= dt; if (o.talkT <= 0 && !o.sit) r.rotation.y = o.home; }
        o.ch.animate(dt, 0, o.sit);
        placeLabels(o, camera, w, h);
      }
    },
  };
  for (const s of SPOTS) {
    if (s.g) {
      const gx = cx + s.g[0] * hw, gz = cz + s.g[1] * hd;
      for (let i = 0; i < s.n; i++) {
        const a = (i / s.n) * Math.PI * 2 + s.g[0] * 3;
        add(gx + Math.sin(a) * s.r, gz + Math.cos(a) * s.r, a + Math.PI, true); // facing the middle of the ring
      }
    } else add(cx + s.at[0] * hw, cz + s.at[1] * hd, Math.PI, !!s.sit); // facing north: the halls
  }
  // The desk: against the old hall's front wall, east of the steps; the clerk stands before it, facing the plaza.
  if (game.desk) {
    const [dx, dz] = game.desk;
    const g = new THREE.Group();
    const part = (w, h, d, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); g.add(m); };
    part(2.2, 1.0, 0.5, 0, 0.5, 0, '#8a6a48'); // the counter
    part(2.3, 0.08, 0.6, 0, 1.04, 0, '#e8dcc0');
    part(0.08, 1.5, 0.08, -1.0, 1.75, -0.1, '#5b4630'); part(0.08, 1.5, 0.08, 1.0, 1.75, -0.1, '#5b4630');
    part(2.3, 0.5, 0.1, 0, 2.5, -0.1, '#2f6fb5'); // its blue board
    g.position.set(dx, 0, dz);
    game.scene.add(g);
    const o = makeNpc(game.labels, game.text?.('cityhall.clerk') || 'City Hall desk', game.randomLook?.());
    o.owner = api; o.home = 0;
    o.act = () => ({ key: 'cityhall-desk', label: '🏷️ ' + (game.text?.('cityhall.desk') || 'Name desk'), run: () => { o.ch.wave(); game.openNames?.(); } });
    o.ch.root.position.set(dx, 0, dz + 0.9);
    game.scene.add(o.ch.root);
    staff.push(o);
    api.desk = g;
  }
  return api;
}
