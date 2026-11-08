// What a flying operator looks like (game/sky-flight.js), on our own screen
// and on everyone else's (core/players.js): the costume pieces (Seoulman's
// cape and emblem, the flight suit's armour, the huge wings), the flames,
// the flying pose and lean, and someone being carried.
import * as THREE from 'three';

// The costumes. model: the clothes (data/characters/kaykit2.js, sky-*),
// look: other look changes while worn; swapAt: when the clothes change
// (seconds into the transformation); ready: when it is over; fx: the emoji
// around the character while transforming (core/scent-fx.js).
export const COSTUMES = {
  seoulman: {
    model: 'sky-seoulman', look: { hairStyle: 'slick', dye: 'black', head: null, face: null, back: null, skirt: null, tee: null },
    swapAt: 0.45, ready: 1.5, flame: null, fx: { e: ['✨', '💚', '💙', '❤️'], m: 'rise', c: '#9fe0ff' },
  },
  suit: {
    model: 'sky-armor', look: { head: null, back: null, skirt: null, tee: null },
    swapAt: 1.35, ready: 2.1, flame: [0xfff2b0, 0xff8a2a], fx: { e: ['⚡', '🔩', '💠'], m: 'orbit', c: '#7ff7e0' },
  },
  wings: {
    model: null, look: { back: null },
    swapAt: 0, ready: 1.7, flame: null, fx: { e: ['🪶', '🤍', '✨'], m: 'fall', c: '#fff4d6' },
  },
};

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
const easeOutBack = (u) => { const c = 1.7; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };
const smooth = (u) => u * u * (3 - 2 * u);
const clamp01 = (u) => Math.min(1, Math.max(0, u));

// ---------- Costume pieces ----------
// A piece: { obj, at: 'body' | 'head' | a bone name, from: where it flies in
// from (offset), delay, dur }. 'body' and 'head' are the character's
// accessory spaces (chibi units, 0 at the feet / the head's middle); on a
// bone the piece is in metres along the bone (+y down the limb).
function piece(obj, at, from, delay = 0, dur = 0.45) {
  obj.userData.skyPiece = at;
  return { obj, at, from: new THREE.Vector3(...from), home: obj.position.clone(), delay, dur, holder: null };
}

function seoulmanPieces() {
  // The cape: hangs from the shoulders, wider at the hem.
  const cape = new THREE.Group();
  cape.position.set(0, 0.64, -0.17);
  const g = new THREE.PlaneGeometry(0.5, 0.7, 1, 6);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i); // 0.35 (top) .. -0.35 (hem)
    const k = (0.35 - y) / 0.7;
    pos.setX(i, pos.getX(i) * (0.8 + k * 0.55));
    pos.setY(i, y - 0.35);
    pos.setZ(i, -k * k * 0.06);
  }
  g.computeVertexNormals();
  const cloth = new THREE.Mesh(g, lambert(0xd8322f, { side: THREE.DoubleSide }));
  cape.add(cloth);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 8).rotateZ(Math.PI / 2), lambert(0xb8262a));
  cape.add(collar);
  cape.userData.cape = true;
  // The chest emblem: a red and blue circle in a white ring (Seoul's own).
  const emblem = new THREE.Group();
  emblem.position.set(0, 0.5, 0.2);
  const ring = new THREE.Mesh(new THREE.CircleGeometry(0.085, 24), glow(0xffffff));
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.068, 24, 0, Math.PI), glow(0xe0302f));
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.068, 24, Math.PI, Math.PI), glow(0x2f5fd6));
  top.position.z = bottom.position.z = 0.002;
  emblem.add(ring, top, bottom);
  return [
    piece(cape, 'body', [0, 1.6, -1.2], 0.55, 0.5),
    piece(emblem, 'body', [0, 0, 1.4], 0.8, 0.35),
  ];
}

const ARMOR = 0x3a4658, ARMOR_DARK = 0x262e3b, LIGHT = 0x5ff5d8;
function suitPieces() {
  const out = [];
  const metal = lambert(ARMOR), dark = lambert(ARMOR_DARK), light = glow(LIGHT);
  // Helmet: a rounded shell with a light-bar visor (head units).
  const helmet = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.37, 22, 16), metal);
  shell.scale.set(1.08, 0.98, 1.04);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.08), light);
  visor.position.set(0, 0.0, 0.33);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.1), dark);
  brow.position.set(0, 0.08, 0.32);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.42), dark);
  fin.position.set(0, 0.34, -0.02);
  helmet.add(shell, visor, brow, fin);
  out.push(piece(helmet, 'head', [0, 2.4, 0.4], 0.95, 0.4));
  // Chest plate with a hexagon light, and two thrusters on the back.
  const chest = new THREE.Group();
  chest.position.set(0, 0.5, 0.15);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.1), metal);
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 6).rotateX(Math.PI / 2), light);
  hex.position.z = 0.055;
  chest.add(plate, hex);
  out.push(piece(chest, 'body', [0, 0.3, 2.2], 0.15));
  const pack = new THREE.Group();
  pack.position.set(0, 0.5, -0.2);
  for (const s of [-1, 1]) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.26, 10), dark);
    can.position.x = s * 0.09;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10), light);
    nozzle.position.set(s * 0.09, -0.14, 0);
    pack.add(can, nozzle);
  }
  out.push(piece(pack, 'body', [0, 0.4, -2.2], 0.3));
  // Limbs: shoulder pads, forearm guards, thigh plates and boots.
  const limb = (bone, r, len, y, from, delay) => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, len, 12), metal);
    m.position.y = y;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.02, 12), light);
    band.position.y = y + len * 0.3;
    g.add(m, band);
    out.push(piece(g, bone, from, delay));
  };
  for (const [s, side] of [[-1, 'l'], [1, 'r']]) {
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), metal);
    pad.scale.set(1, 0.8, 1);
    pad.position.y = 0.02;
    out.push(piece(pad, 'upperarm' + side, [s * 2, 0.5, 0], 0.4));
    limb('lowerarm' + side, 0.07, 0.16, 0.1, [s * 2.2, -0.3, 0.6], 0.5);
    limb('upperleg' + side, 0.1, 0.18, 0.11, [s * 1.8, -1.2, 0.5], 0.62);
    limb('lowerleg' + side, 0.085, 0.2, 0.12, [s * 1.6, -1.8, -0.4], 0.75);
  }
  return out;
}

// One huge wing (+x: the right one), feathers fanned along it.
function makeWing(side) {
  const wing = new THREE.Group();
  wing.position.set(side * 0.08, 0.56, -0.2);
  const feather = new THREE.CircleGeometry(0.5, 14);
  const colors = [0xffffff, 0xfdf8ef, 0xf6ecd8, 0xefdcb8];
  const inner = new THREE.Group(); // the arm of the wing
  inner.rotation.z = side * 0.35; // swept up a little
  wing.add(inner);
  // Primaries along the arm (longest at the tip), then a row of coverts.
  for (let i = 0; i < 10; i++) {
    const k = i / 9;
    const m = new THREE.Mesh(feather, lambert(colors[Math.min(3, Math.floor(k * 4))], { side: THREE.DoubleSide }));
    const len = 0.9 + k * 1.1;
    m.scale.set(0.24, len, 1);
    m.position.set(side * (0.25 + k * 1.95), -len * 0.42, -0.02 * i);
    m.rotation.z = side * (0.15 + k * 0.55);
    inner.add(m);
  }
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    const m = new THREE.Mesh(feather, lambert(0xffffff, { side: THREE.DoubleSide }));
    m.scale.set(0.3, 0.55, 1);
    m.position.set(side * (0.2 + k * 1.5), 0.02 - k * 0.1, 0.03);
    m.rotation.z = side * (0.4 + k * 0.4);
    inner.add(m);
  }
  const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 2.0, 4, 8).rotateZ(Math.PI / 2), lambert(0xffffff));
  bone.position.set(side * 1.05, 0.08, 0.04);
  inner.add(bone);
  wing.userData.side = side;
  return wing;
}

// ---------- Flames ----------
function makeFlame([core, outer]) {
  const g = new THREE.Group();
  const a = new THREE.Mesh(new THREE.ConeGeometry(0.075, 1, 10, 1, true).translate(0, -0.5, 0).rotateX(Math.PI),
    new THREE.MeshBasicMaterial({ color: outer, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  const b = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.55, 8, 1, true).translate(0, -0.275, 0).rotateX(Math.PI),
    new THREE.MeshBasicMaterial({ color: core, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(a, b);
  g.renderOrder = 6;
  return g;
}
// Which bone a flame sits on, and the bone above it (for its direction).
const FLAME_BONES = [['handl', 'lowerarml'], ['handr', 'lowerarmr'], ['footl', 'lowerlegl'], ['footr', 'lowerlegr']];

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);


export const OFF_DUR = 0.7; // taking the costume off (s)
export const SKY_SPEED = 14; // m/s across (hf = 1)

// ---------- Carrying someone ----------
// Poses: 'arms2' one under each arm (two people), 'arm1' one under an arm,
// 'princess' held in both arms. Slots: under the right arm (0), the left (1).
export const CARRY_POSES = ['arms2', 'arm1', 'princess'];
export const carrySeats = (pose) => (pose === 'arms2' ? 2 : CARRY_POSES.includes(pose) ? 1 : 0);
// Where the carried person's middle sits, in the flyer's body frame
// (x: the flyer's left, y up from the feet, z forward), and how they lie.
const CARRY_AT = {
  arm: [[-0.42, 0.46, 0.02], [0.42, 0.46, 0.02]], // tucked under an arm, face down, head forward
  princess: [0, 0.6, 0.34], // across the arms in front, face up
};
const qPose = new THREE.Quaternion(), qTmp = new THREE.Quaternion(), eTmp = new THREE.Euler(0, 0, 0, 'YXZ');
const vMid = new THREE.Vector3();
const POSE_Q = {
  arm: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0, 'YXZ')),
  princess: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.25, 0, Math.PI / 2, 'YXZ')),
};
const CARRIED_MOVES = {
  arm: () => ({ armL: [-2.9, -0.1, 0], armR: [-2.9, 0.1, 0], foreL: [0, 0, 0], foreR: [0, 0, 0], legL: [0.05, 0, 0], legR: [0.05, 0, 0] }), // arms forward like flying
  princess: () => ({ armR: [-2.2, 0.3, 0], foreR: [-0.9, 0, 0], armL: [-0.3, -0.2, 0], foreL: [-0.6, 0, 0], legL: [-1.25, 0, 0], legR: [-1.15, 0, 0], kneeL: [1.2, 0, 0], kneeR: [1.1, 0, 0] }),
};
// Put a carried character in the flyer's arms (flyer: their character,
// already posed this frame). Works for us being carried and for others.
export function placeCarried(flyer, pose, slot, ch) {
  const rig = flyer.root.children[0]; // (core/character.js: the rig is the root's first child)
  if (!rig) return;
  flyer.root.updateMatrixWorld(true);
  const kind = pose === 'princess' ? 'princess' : 'arm';
  const at = kind === 'princess' ? CARRY_AT.princess : CARRY_AT.arm[slot ? 1 : 0];
  rig.localToWorld(vMid.set(at[0], at[1], at[2]));
  // Their rig turns like the flyer's, then lies in the pose.
  qPose.copy(rig.quaternion).multiply(POSE_Q[kind]);
  eTmp.setFromQuaternion(qPose, 'YXZ');
  ch.root.rotation.y = flyer.root.rotation.y;
  ch.setTrick({ flip: eTmp.x, spin: eTmp.y, roll: eTmp.z }, 0);
  // setTrick keeps the body's middle (0.5 m up) over the root: put the
  // root so that middle lands in the arms.
  ch.root.position.set(vMid.x, vMid.y - 0.5, vMid.z);
  if (ch.__carryPose !== kind) { ch.__carryPose = kind; ch.setMoves(CARRIED_MOVES[kind]); }
  void qTmp;
}
export function releaseCarried(ch) {
  if (!ch.__carryPose) return;
  ch.__carryPose = null;
  ch.setMoves(null);
  ch.setTrick(null, 0);
}

// The flying state as it travels to other players ("fl"): kind, then the
// carry pose: 'suit', 'wings.princess'.
export const encodeFlight = (kind, carry) => (COSTUMES[kind] ? kind + (CARRY_POSES.includes(carry) ? '.' + carry : '') : undefined);
export function parseFlight(s) {
  const [kind, carry] = String(s ?? '').slice(0, 24).split('.');
  return COSTUMES[kind] ? { kind, carry: CARRY_POSES.includes(carry) ? carry : null } : null;
}
// Being carried ("cr"): '<flyer id>.<pose>.<slot>'.
export const encodeCarried = (flyer, pose, slot) => `${flyer}.${pose}.${slot ? 1 : 0}`;
export function parseCarried(s) {
  const m = /^([\w-]{1,64})\.(arms2|arm1|princess)\.([01])$/.exec(String(s ?? ''));
  return m ? { flyer: m[1], pose: m[2], slot: Number(m[3]) } : null;
}

// ---------- The costume on one character ----------
// update() each frame with the flight's state: { phase: 'on' | 'fly' |
// 'off', t (s into the phase), off (pieces flying away now), hf (0 hover ..
// 1 fast), climb (-1..1), roll, y, fist (Seoulman's raised fist 0..1),
// carry (a carry pose or null), flames (show them) }.
export class SkyCostume {
  constructor(kind) {
    this.kind = kind;
    this.C = COSTUMES[kind];
    this.pieces = kind === 'seoulman' ? seoulmanPieces() : kind === 'suit' ? suitPieces() : [];
    this.wings = [];
    if (kind === 'wings') {
      for (const s of [-1, 1]) {
        const w = makeWing(s);
        this.wings.push(w);
        this.pieces.push(piece(w, 'body', [0, 0, 0], 0, 0.01));
      }
    }
    this.flames = this.C.flame ? FLAME_BONES.map(() => makeFlame(this.C.flame)) : [];
    for (const f of this.flames) f.visible = false;
    this.ch = null;
    this.flapT = 0;
    this.s = { phase: 'on', t: 0, hf: 0, climb: 0, roll: 0, y: 0, fist: 0, carry: null };
    this.pose = () => this._pose();
  }

  _mount(pc) {
    const ch = this.ch;
    pc.holder?.removeFromParent();
    pc.holder = null;
    const holder = new THREE.Group();
    if (pc.at === 'body' || pc.at === 'head') ch.addProp(pc.at, holder);
    else {
      const bone = ch.root.getObjectByName(pc.at);
      if (!bone) return false; // the model is still loading: try again next frame
      ch.root.updateMatrixWorld(true);
      holder.scale.setScalar(ch.root.getWorldScale(v1).x / bone.getWorldScale(v2).x); // metres, whatever the bone's scale
      bone.add(holder);
    }
    holder.add(pc.obj);
    pc.holder = holder;
    return true;
  }

  bind(ch) {
    this.ch = ch;
    for (const pc of this.pieces) this._mount(pc);
    for (const f of this.flames) ch.root.add(f);
    ch.setMoves(this.pose);
  }

  dispose() {
    for (const pc of this.pieces) pc.holder?.removeFromParent();
    for (const f of this.flames) f.removeFromParent();
    if (this.ch) { this.ch.setMoves(null); this.ch.setTrick(null, 0); }
    this.pieces = []; this.wings = []; this.flames = [];
    this.ch = null;
  }

  // Bone offsets laid over the idle clip (model-pack.js setMoves).
  _pose() {
    const { hf, fist, carry, kind } = { ...this.s, kind: this.kind };
    const h = 1 - hf;
    let out;
    if (kind === 'wings') {
      out = { armL: [0.15, -0.3, 0], armR: [0.15, 0.3, 0], foreL: [-0.2, 0, 0], foreR: [-0.2, 0, 0], legL: [0.15 * hf, 0, 0], legR: [0.25 * hf, 0, 0], kneeL: [0.35 - 0.25 * hf, 0, 0], kneeR: [0.2, 0, 0] };
    } else if (kind === 'seoulman' && fist > 0.01 && !carry) {
      // The flying hero: the right fist punched forward over the head, the
      // left arm along the body, legs straight. Down again on landing.
      const f = fist, n = 1 - fist;
      const mix = (a, b) => a.map((v, i) => v * n + b[i] * f);
      out = {
        armR: mix([0.1 * h + 0.6 * hf, 0.35 * h + 0.12 * hf, 0], [-2.95, 0.12, 0]), foreR: mix([-0.25 * h, 0, 0], [0, 0, 0]),
        armL: mix([0.1 * h + 0.6 * hf, -0.35 * h - 0.12 * hf, 0], [0.45, -0.12, 0]), foreL: mix([-0.25 * h, 0, 0], [0, 0, 0]),
        legL: [0.08 * hf, 0, 0], legR: [0.08 * hf + 0.1 * h, 0, 0], kneeL: [0.2 * h, 0, 0], kneeR: [0.45 * h, 0, 0],
        head: [-0.5 * hf, 0, 0],
      };
    } else {
      // Hovering: arms a little out, knees bent; flying: arms stretched back
      // along the body, legs straight together.
      out = {
        armL: [0.1 * h + 0.6 * hf, -0.35 * h - 0.12 * hf, 0], armR: [0.1 * h + 0.6 * hf, 0.35 * h + 0.12 * hf, 0],
        foreL: [-0.25 * h, 0, 0], foreR: [-0.25 * h, 0, 0],
        legL: [-0.1 * h + 0.08 * hf, 0, 0], legR: [0.05 * h + 0.08 * hf, 0, 0],
        kneeL: [0.35 * h, 0, 0], kneeR: [0.15 * h, 0, 0],
        head: [-0.5 * hf, 0, 0], // looking ahead while lying flat
      };
    }
    // Arms round whoever we carry.
    const hug = { armL: [0.1, -0.75, 0], foreL: [-0.9, 0, 0] }, hugR = { armR: [0.1, 0.75, 0], foreR: [-0.9, 0, 0] };
    if (carry === 'arms2') Object.assign(out, hug, hugR);
    else if (carry === 'arm1') Object.assign(out, hug);
    else if (carry === 'princess') Object.assign(out, { armL: [-1.15, -0.25, 0], armR: [-1.15, 0.25, 0], foreL: [-0.55, 0, 0], foreR: [-0.55, 0, 0] });
    return out;
  }

  // Lean: upright while hovering, flat when flying fast; Seoulman spins as
  // he changes. Held in front (princess carry): never quite flat.
  tilt() {
    const { hf, climb, carry, phase, t } = this.s;
    let tilt = (this.kind === 'wings' ? 0.15 + 0.7 * hf : 0.2 + 1.2 * hf) - climb * 0.15 * (1 - hf);
    if (carry === 'princess') tilt = Math.min(tilt, 0.35);
    const spin = phase === 'on' && this.kind === 'seoulman' ? smooth(clamp01(t / 0.9)) * Math.PI * 4 : 0;
    return { flip: tilt, roll: this.s.roll, spin };
  }

  update(ch, dt, state) {
    Object.assign(this.s, state);
    if (ch !== this.ch) this.bind(ch);
    const s = this.s;
    ch.setTrick(this.tilt(), s.y);
    // Pieces flying on, or off.
    for (const pc of this.pieces) {
      if (!pc.holder && !this._mount(pc)) continue;
      if (!s.off) {
        const u = s.phase === 'on' ? clamp01((s.t - pc.delay) / pc.dur) : 1;
        const e = easeOutBack(u);
        pc.obj.visible = u > 0;
        pc.obj.position.copy(pc.home).addScaledVector(pc.from, 1 - e);
        pc.obj.rotation.y = (1 - e) * 4;
        pc.obj.scale.setScalar(1);
      } else {
        const u = clamp01(s.t / OFF_DUR);
        pc.obj.position.copy(pc.home).addScaledVector(pc.from.lengthSq() ? pc.from : v1.set(0, 1, -1), u * u);
        pc.obj.scale.setScalar(Math.max(0.001, 1 - u));
      }
      if (pc.obj.userData.cape) pc.obj.rotation.x = 0.12 + 1.1 * s.hf + 0.12 * Math.sin(performance.now() / 110) * (0.3 + s.hf);
    }
    if (this.wings.length) this._wings(dt);
    if (this.flames.length) this._flames(!!s.flames);
  }

  _wings(dt) {
    const { phase, t, hf, climb } = this.s;
    const climbing = climb > 0;
    const unfold = phase === 'on' ? smooth(clamp01((t - 0.3) / 0.5)) : this.s.off ? 1 - clamp01(t / OFF_DUR) : 1;
    const burst = phase === 'on' ? easeOutBack(clamp01((t - 0.3) / 0.5)) : unfold;
    const rate = climbing ? 3.2 : 1.6 + (1 - hf) * 0.8; // flaps a second: harder when climbing or hovering
    this.flapT += dt * rate * Math.PI * 2 * (unfold > 0.6 ? 1 : 0.2);
    const flap = Math.sin(this.flapT) * (0.55 + (climbing ? 0.2 : 0)) * unfold;
    for (const w of this.wings) {
      const side = w.userData.side;
      w.scale.setScalar(Math.max(0.05, 0.15 + 0.85 * burst));
      w.rotation.set(-0.15 * (1 - unfold), side * 1.35 * (1 - unfold), side * (0.12 + flap));
    }
  }

  _flames(on) {
    const ch = this.ch;
    ch.root.updateMatrixWorld(true);
    FLAME_BONES.forEach(([end, from], i) => {
      const f = this.flames[i];
      const a = ch.root.getObjectByName(end), b = ch.root.getObjectByName(from);
      // (a hand holding someone: no flame from it)
      const busy = (i === 0 && this.s.carry) || (i === 1 && (this.s.carry === 'arms2' || this.s.carry === 'princess'));
      f.visible = !!(on && a && b && !busy);
      if (!f.visible) return;
      if (f.parent !== ch.root) ch.root.add(f);
      ch.root.worldToLocal(a.getWorldPosition(v1));
      ch.root.worldToLocal(b.getWorldPosition(v2));
      const dir = v2.subVectors(v1, v2).normalize();
      f.position.copy(v1).addScaledVector(dir, 0.04);
      f.quaternion.setFromUnitVectors(UP, dir);
      const len = (0.3 + 0.55 * this.s.hf + 0.15 * Math.abs(this.s.climb)) * (0.85 + Math.random() * 0.3);
      f.scale.set(1 + Math.random() * 0.15, len, 1 + Math.random() * 0.15);
    });
  }
}
