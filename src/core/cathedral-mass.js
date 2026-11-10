// A simple Mass inside Myeongdong Cathedral (core/cathedral-hall.js): the
// priest and two altar servers walk up the middle aisle, bow at the altar,
// the priest greets everyone with open arms, reads at the lectern, lifts the
// host, gives the sign of peace and the blessing, and they walk out again.
// A quiet pause with the organ, then it begins again. Nobody says anything
// (speech bubbles are small pictures only); the organ is data/tracks.js
// 'organ'.
//
// The clock is the real time, so everyone in the cathedral sees the same
// moment of it. Loaded with the room (game/room-kit.js).
//
//   const mass = new CathedralMass(built, layer, L);
//   mass.update(dt, camera, w, h)   // each frame inside
//   mass.all                        // the people (name tags, for leaving)
import * as THREE from 'three';
import { makeNpc, placeLabels } from './npcs.js';
import { showBubble } from './players.js';
import { randomLook } from '../data/appearance.js';

export const MASS_CYCLE = 170; // seconds, the pause included

export const CATHEDRAL_TEXT = {
  priest: { en: 'Priest', ko: '신부님', ja: '神父さま', zh: '神父' },
  welcome: {
    en: '⛪ Mass is on. Sit on a pew and watch quietly. Walking only inside.',
    ko: '⛪ 미사 중이에요. 장의자에 앉아 조용히 지켜보세요. 성당 안에서는 걸어서만 다녀요.',
    ja: '⛪ ミサの最中です。長椅子に座って静かに見守りましょう。聖堂の中では歩いてね。',
    zh: '⛪ 弥撒正在进行。请坐在长椅上安静观看。教堂里请慢慢走。',
  },
  shh: {
    en: 'Shh! 🤫 No running in the cathedral, please.',
    ko: '쉿! 🤫 성당에서는 뛰지 말아 주세요.',
    ja: 'しーっ！🤫 聖堂では走らないでね。',
    zh: '嘘！🤫 教堂里请不要奔跑。',
  },
};

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

// The priest's white alb and green chasuble; the servers' black cassock
// and white surplice. Worn over a plain character (props on the body).
function vestments(priest) {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.31, 0.56, 14), mat(priest ? '#f7f4ec' : '#22202a'));
  robe.position.y = 0.34;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(priest ? 0.26 : 0.24, priest ? 0.33 : 0.3, priest ? 0.34 : 0.24, 14), mat(priest ? '#2f7a4a' : '#f7f4ec'));
  top.position.y = priest ? 0.5 : 0.55;
  if (priest) top.scale.z = 0.8;
  g.add(robe, top);
  if (priest) { // a gold cross on the chasuble's front and back
    for (const s of [-1, 1]) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.01), mat('#d8b54a'));
      v.position.set(0, 0.52, s * 0.255);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.01), mat('#d8b54a'));
      h.position.set(0, 0.58, s * 0.255);
      g.add(v, h);
    }
  }
  return g;
}

// The cross carried at the front of the procession.
function processionCross() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 6), mat('#c9a640'));
  pole.position.y = 0.85;
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), mat('#c9a640'));
  v.position.y = 1.8;
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), mat('#c9a640'));
  h.position.y = 1.85;
  g.add(pole, v, h);
  return g;
}

const smooth = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };

// A path of points: where you are after walking s metres along it, and which
// way you face.
function along(path, s) {
  s = Math.max(0, s);
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1], len = Math.hypot(bx - ax, bz - az);
    if (s <= len || i === path.length - 2) {
      const k = Math.min(1, s / len);
      return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, ry: Math.atan2(bx - ax, bz - az), end: s >= len && i === path.length - 2 };
    }
    s -= len;
  }
  return { x: path[0][0], z: path[0][1], ry: 0, end: true };
}
const WALK = 1.15; // m/s, a slow procession

// The timeline (seconds into the cycle). Each step: who does what.
const STEPS = [
  { at: 0, k: 'in' }, // walking up the aisle
  { at: 24, k: 'bow' }, // bowing to the altar, then going round it
  { at: 32, k: 'greet', say: '🙏' },
  { at: 42, k: 'toAmbo' },
  { at: 47, k: 'read', say: '📖' },
  { at: 66, k: 'toAltar' },
  { at: 71, k: 'pray', say: '🕯️' },
  { at: 86, k: 'lift', say: '✨', bell: '🔔' },
  { at: 98, k: 'peace', say: '🕊️' },
  { at: 108, k: 'bless', say: '✝️' },
  { at: 120, k: 'out' }, // walking back down the aisle
  { at: 146, k: 'gone' }, // the organ alone until it begins again
];
const stepAt = (t) => { let s = STEPS[0]; for (const x of STEPS) if (t >= x.at) s = x; return s; };

export class CathedralMass {
  constructor(built, layer, L) {
    const M = built.stations.mass;
    this.M = M;
    this.layer = layer;
    this.scene = built.scene;
    this.priest = makeNpc(layer, '⛪ ' + L(CATHEDRAL_TEXT.priest), { ...randomLook(), model: 'basic', tee: null, hair: 'black', dye: 'black', pants: 'charcoal', shirt: 'cream', skin: 'fair' });
    this.priest.ch.addProp('body', vestments(true));
    this.servers = M.servers.map(() => {
      const o = makeNpc(layer, '', { ...randomLook(), model: 'basic', tee: null, pants: 'charcoal' });
      o.tag.style.visibility = 'hidden';
      o.ch.addProp('body', vestments(false));
      return o;
    });
    this.all = [this.priest, ...this.servers];
    for (const o of this.all) this.scene.add(o.ch.root);
    this.cross = processionCross();
    this.scene.add(this.cross);
    // The host: a small white disc lifted over the priest's head.
    this.host = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), new THREE.MeshBasicMaterial({ color: '#fffdf2', side: THREE.DoubleSide }));
    this.host.visible = false;
    this.scene.add(this.host);
    // The procession's way: up the middle aisle from the door to the altar
    // rail, and the same way back.
    const door = built.exit.z - 2.4;
    this.inPath = [[0, door], [0, M.sanctuary + 0.3], [0, M.altar.z + M.altar.d / 2 + 0.55]];
    this.outPath = [[0, M.altar.z + M.altar.d / 2 + 0.55], [0, M.sanctuary + 0.3], [0, door]];
    const A = M.altar, ax = A.w / 2 + 0.45;
    this.roundPath = [[0, this.inPath[2][1]], [ax, this.inPath[2][1]], [ax, M.priest.z], [M.priest.x, M.priest.z]];
    this.step = null;
    this.pose = null;
    for (const o of this.all) o.ch.setMoves(() => o.pose || null);
  }

  // Trying to run in here: true when it's time to say "shh" again (not
  // more than every 9 seconds).
  shh() {
    const now = performance.now();
    if (now - (this.shhAt || -1e9) < 9000) return false;
    this.shhAt = now;
    return true;
  }

  // Raised floor: on the sanctuary's platform past its step.
  _y(z) { const M = this.M; return smooth((M.sanctuary + 0.15 - z) / 0.35) * M.platform; }

  _put(o, x, z, ry, walking) {
    const y = this._y(z);
    o.ch.root.position.set(x, y, z);
    o.labelY = (o === this.priest ? 2.35 : 1.55) + y; // (the priest's tag clear of his raised hands)
    o.ch.root.rotation.y = ry;
    o.walking = walking;
  }

  update(dt, camera, w, h) {
    const t = (Date.now() / 1000) % MASS_CYCLE;
    const st = stepAt(t), M = this.M;
    const [p, s1, s2] = this.all;
    const front = M.altar.z + M.altar.d / 2 + 0.55; // in front of the altar
    if (st !== this.step) {
      this.step = st;
      this.reread = false;
      if (st.say) showBubble(p, this.layer, st.say, 6000);
      if (st.bell) setTimeout(() => showBubble(s1, this.layer, st.bell, 2500), 1500);
      if (st.k === 'bow') for (const o of this.all) o.ch.play('bow');
    }
    const shown = st.k !== 'gone';
    for (const o of this.all) o.ch.root.visible = shown;
    this.cross.visible = false;
    this.host.visible = false;
    p.pose = s1.pose = s2.pose = null;
    if (st.k === 'in' || st.k === 'out') {
      // In a line, 1.3 m apart: the cross bearer first, the priest last.
      const path = st.k === 'in' ? this.inPath : this.outPath, s = (t - st.at) * WALK;
      [s1, s2, p].forEach((o, i) => {
        const at = along(path, s - i * 1.3 + (st.k === 'in' ? 0 : 2.6));
        this._put(o, at.x, at.z, at.ry, !at.end);
      });
      // The servers stand beside the priest when they arrive (not in a pile).
      if (st.k === 'in') {
        const a1 = along(path, s), a2 = along(path, s - 1.3);
        if (a1.end) this._put(s1, -0.9, front, Math.PI, false);
        if (a2.end) this._put(s2, 0.9, front, Math.PI, false);
      }
      const lead = s1.ch.root.position;
      this.cross.visible = true;
      this.cross.position.set(lead.x + Math.sin(s1.ch.root.rotation.y) * 0.3, lead.y, lead.z + Math.cos(s1.ch.root.rotation.y) * 0.3);
      s1.pose = { armR: [-1.1, 0, 0], foreR: [-0.6, 0, 0] }; // holding the cross up
      if (st.k === 'out' && t - st.at > 23) for (const o of this.all) o.ch.root.visible = false; // (out of the door)
    } else if (st.k === 'bow') {
      // Bow at the foot of the altar, then go round it to the far side; the
      // servers go to their places beside it.
      const walk = Math.max(0, t - st.at - 3) * WALK;
      const at = along(this.roundPath, walk);
      this._put(p, at.x, at.z, at.end ? 0 : at.ry, !at.end);
      if (walk > 0) { this._put(s1, M.servers[0][0], M.servers[0][1], 0, false); this._put(s2, M.servers[1][0], M.servers[1][1], 0, false); } else {
        this._put(s1, -0.9, front, Math.PI, false);
        this._put(s2, 0.9, front, Math.PI, false);
      }
    } else {
      // At their places: the servers beside the altar, the priest behind it
      // (or at the lectern, or walking between the two).
      this._put(s1, M.servers[0][0], M.servers[0][1], 0, false);
      this._put(s2, M.servers[1][0], M.servers[1][1], 0, false);
      const ambo = [M.ambo.x + 0.15, M.ambo.z - 0.6];
      if (st.k === 'toAmbo' || st.k === 'toAltar') {
        const k = smooth((t - st.at) / 4.5), [ax, az] = st.k === 'toAmbo' ? [M.priest.x, M.priest.z] : ambo, [bx, bz] = st.k === 'toAmbo' ? ambo : [M.priest.x, M.priest.z];
        this._put(p, ax + (bx - ax) * k, az + (bz - az) * k, k < 0.9 ? Math.atan2(bx - ax, bz - az) : 0, k < 0.95);
      } else if (st.k === 'read') {
        this._put(p, ambo[0], ambo[1], 0, false);
        p.pose = { armL: [-0.6, 0, 0], armR: [-0.6, 0, 0], foreL: [-0.6, 0, 0], foreR: [-0.6, 0, 0], head: [0.25, 0, 0] }; // hands on the book, looking down
        if (t - st.at > 9.5 && !this.reread) { this.reread = true; showBubble(p, this.layer, '📖', 5000); } // (a second reading)
      } else {
        this._put(p, M.priest.x, M.priest.z, 0, false);
        const k = st.k === 'gone' ? 0 : smooth((t - st.at) / 1.5) * (1 - smooth((t - st.at - (STEPS[STEPS.indexOf(st) + 1].at - st.at - 1.5)) / 1.5));
        if (st.k === 'greet' || st.k === 'pray' || st.k === 'peace') p.pose = { armL: [-0.9 * k, -0.5 * k, 0], armR: [-0.9 * k, 0.5 * k, 0], foreL: [-0.3 * k, 0, 0], foreR: [-0.3 * k, 0, 0] }; // open arms
        if (st.k === 'lift') {
          const up = smooth((t - st.at - 2) / 2) * (1 - smooth((t - st.at - 9) / 2));
          p.pose = { armL: [-0.7 - 1.9 * up, -0.15, 0], armR: [-0.7 - 1.9 * up, 0.15, 0], foreL: [-0.4 * (1 - up), 0, 0], foreR: [-0.4 * (1 - up), 0, 0] };
          this.host.visible = up > 0.05;
          const r = p.ch.root.position;
          this.host.position.set(r.x, r.y + 0.75 + 0.75 * up, r.z + 0.32 - 0.12 * up);
          for (const o of [s1, s2]) o.pose = { spine: [0.35 * up, 0, 0], head: [0.2 * up, 0, 0] }; // the servers bow their heads
        }
        if (st.k === 'bless') p.pose = { armR: [-2.4 * k, 0.2, 0], foreR: [-0.2 * k, 0, 0] }; // the right hand raised
      }
    }
    for (const o of this.all) {
      o.ch.animate(dt, o.walking ? 0.32 : 0);
      if (o === p) placeLabels(o, camera, w, h);
      else if (o.bubble) placeLabels(o, camera, w, h);
    }
  }
}
