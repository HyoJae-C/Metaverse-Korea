// Sky view for operators: a chat code puts on a costume and the character
// flies over the city. Three costumes, each with its own transformation:
//   /서울맨 (/seoulman)    a green, blue and red hero suit with a red cape
//   /스카이슈트 (/skysuit)  armour pieces fly in and lock on, then the suit
//   /날개 (/wings)         huge feathered wings burst open and flap
// /착지 (/land), or the same code again, flies down and takes it off.
// Only operator accounts can use it: the server says who is one
// (am_operator, supabase/009_admin.sql); for anyone else the codes read like
// any unknown command.
//
// Flying: move as usual; Space or R goes up, C or F down (or the ▲ ▼
// buttons on a phone); Shift
// (or the stick pushed all the way) flies fast. The suit and Seoulman fly
// with the arms stretched back and flames from the hands and feet; the
// wings flap. Other players see the costume's clothes and hair (the look is
// sent as usual), walking on the ground under us.
import * as THREE from 'three';
import { L } from '../ui/pocha-ui.js';
import { ScentFx } from '../core/scent-fx.js';

export const SKY_TEXT = {
  on: { en: 'Sky view! Space / C or ▲ ▼ to go up and down', ko: '스카이뷰! Space / C 또는 ▲ ▼ 로 위아래 이동', ja: 'スカイビュー！Space / C か ▲ ▼ で上下に移動', zh: '天空视角！Space / C 或 ▲ ▼ 上下移动' },
  off: { en: 'Landed', ko: '착지했어요', ja: '着地しました', zh: '已着陆' },
  street: { en: 'Fly outside, on the street', ko: '밖에 나가서 날 수 있어요', ja: '外に出てから飛べます', zh: '请到街上再飞' },
  busy: { en: 'Get off first', ko: '먼저 내려 주세요', ja: '先に降りてください', zh: '请先下来' },
  none: { en: 'Not flying', ko: '지금 날고 있지 않아요', ja: '今は飛んでいません', zh: '现在没有在飞' },
};

// Chat codes (after "/"), upper or lower case.
export const SKY_CODES = {
  '서울맨': 'seoulman', seoulman: 'seoulman',
  '스카이슈트': 'suit', skysuit: 'suit',
  '날개': 'wings', wings: 'wings',
  '착지': 'off', land: 'off',
};
export const skyCode = (code) => SKY_CODES[String(code ?? '').trim().toLowerCase()] || null;

// The costumes. model: the clothes (data/characters/kaykit2.js, sky-*),
// look: other look changes while worn; swapAt: when the clothes change
// (seconds into the transformation); ready: when it is over; fx: the emoji
// around the character while transforming (core/scent-fx.js).
export const COSTUMES = {
  seoulman: {
    model: 'sky-seoulman', look: { hairStyle: 'slick', dye: 'black', head: null, face: null, back: null, skirt: null, tee: null },
    swapAt: 0.45, ready: 1.5, flame: [0xbff4ff, 0x4fb8ff], fx: { e: ['✨', '💚', '💙', '❤️'], m: 'rise', c: '#9fe0ff' },
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

const SPEED = 14, FAST = 40; // m/s across
const CLIMB = 10, FAST_CLIMB = 26; // m/s up and down
const TOP = 250; // highest (m)
const LIFT = 3; // how high the take-off goes (m)
const OFF_DUR = 0.7; // taking the costume off (s)

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

// ---------- The flight ----------
export function createSkyFlight(game) {
  let kind = null; // the costume while flying
  let phase = null; // 'on' (transforming), 'fly', 'off' (landing and taking it off)
  let t = 0; // seconds into the phase
  let pieces = [], wings = [], flames = [];
  let bound = null; // the character the pieces are on
  let savedLook = null, swapped = false, savedFog = null;
  let opOk = false;
  let climbBtn = 0, flapT = 0, fxT = 0, lastRy = 0, roll = 0;
  let landAt = null; // { x, z } where to land
  const vel = new THREE.Vector3();
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const fx = new ScentFx();
  let pad = null;

  async function isOperator() {
    if (opOk) return true;
    if (import.meta.env?.DEV) return (opOk = true); // the local dev server (npm run dev)
    const client = game.cloud?.client;
    if (!client) return false;
    try {
      const { data, error } = await client.rpc('am_operator');
      opOk = !error && data === true;
    } catch { opOk = false; }
    return opOk;
  }

  function buttons(show) {
    if (!pad && show) {
      pad = document.createElement('div');
      pad.id = 'sky-pad';
      pad.style.cssText = 'position:fixed;right:16px;top:38%;display:flex;flex-direction:column;gap:10px;z-index:30';
      for (const [label, dir] of [['▲', 1], ['▼', -1]]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.setAttribute('aria-label', dir > 0 ? 'Fly up' : 'Fly down');
        b.style.cssText = 'width:52px;height:52px;border-radius:50%;border:0;font-size:22px;background:rgba(20,30,50,.55);color:#fff;touch-action:none';
        const off = () => { if (climbBtn === dir) climbBtn = 0; };
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); climbBtn = dir; });
        b.addEventListener('pointerup', off);
        b.addEventListener('pointercancel', off);
        b.addEventListener('pointerleave', off);
        pad.append(b);
      }
      document.body.append(pad);
    }
    if (pad) pad.hidden = !show;
    if (!show) climbBtn = 0;
  }

  // Put a piece on the character (again, after the character was rebuilt).
  function mount(pc) {
    const me = game.me;
    pc.holder?.removeFromParent();
    pc.holder = null;
    const holder = new THREE.Group();
    if (pc.at === 'body' || pc.at === 'head') me.addProp(pc.at, holder);
    else {
      const bone = me.root.getObjectByName(pc.at);
      if (!bone) return false; // the model is still loading: try again next frame
      me.root.updateMatrixWorld(true);
      holder.scale.setScalar(me.root.getWorldScale(v1).x / bone.getWorldScale(v2).x); // metres, whatever the bone's scale
      bone.add(holder);
    }
    holder.add(pc.obj);
    pc.holder = holder;
    return true;
  }

  function bind() {
    bound = game.me;
    for (const pc of pieces) mount(pc);
    for (const f of flames) game.me.root.add(f);
    game.me.setMoves(pose);
  }

  function dressPieces(k) {
    pieces = k === 'seoulman' ? seoulmanPieces() : k === 'suit' ? suitPieces() : [];
    wings = [];
    if (k === 'wings') {
      for (const s of [-1, 1]) {
        const w = makeWing(s);
        wings.push(w);
        pieces.push(piece(w, 'body', [0, 0, 0], 0, 0.01));
      }
    }
    flames = COSTUMES[k].flame ? FLAME_BONES.map(() => makeFlame(COSTUMES[k].flame)) : [];
    for (const f of flames) f.visible = false;
  }

  function clearPieces() {
    for (const pc of pieces) pc.holder?.removeFromParent();
    for (const f of flames) f.removeFromParent();
    pieces = []; wings = []; flames = [];
  }

  // Put the costume's clothes on (or back to our own).
  function wear(on) {
    const C = COSTUMES[kind];
    if (on && !C.model && !Object.keys(C.look).some((k) => savedLook[k] != null)) return;
    const look = on ? { ...savedLook, ...C.look, ...(C.model ? { model: C.model } : {}) } : savedLook;
    game.setLook(look);
    swapped = on;
  }

  function puff(big) {
    const p = game.me.root.position;
    fx.attach(game.scene);
    fx.puff(p.x, p.y, p.z, COSTUMES[kind].fx, big);
  }

  function start(k) {
    kind = k; phase = 'on'; t = 0;
    savedLook ||= game.currentLook;
    swapped = false;
    dressPieces(k);
    bind();
    vel.set(0, 0, 0);
    lastRy = game.me.root.rotation.y;
    if (!savedFog && game.scene.fog) savedFog = { near: game.scene.fog.near, far: game.scene.fog.far };
    if (game.cam) game.cam.dist = Math.max(game.cam.dist, 12);
    buttons(true);
    puff(true);
    fxT = 0.25;
    game.shop.toast(L(SKY_TEXT.on));
  }

  // Back on our own feet: the costume off, the look and the fog as they were.
  function finish(quiet = false) {
    if (!kind) return;
    if (swapped) wear(false);
    clearPieces();
    game.me.setMoves(null);
    game.me.setTrick(null, 0);
    if (game.mode === 'street') game.me.root.position.y = 0;
    if (savedFog && game.scene.fog) Object.assign(game.scene.fog, savedFog);
    savedFog = null; savedLook = null;
    kind = null; phase = null; bound = null; landAt = null;
    buttons(false);
    if (!quiet) game.shop.toast(L(SKY_TEXT.off));
  }

  // A free spot to land on (not inside a building), near (x, z).
  function landingSpot(x, z) {
    if (!game.blocked?.(x, z)) return { x, z };
    for (let r = 1; r <= 40; r += 1) {
      for (let a = 0; a < 16; a++) {
        const px = x + Math.cos((a / 16) * Math.PI * 2) * r, pz = z + Math.sin((a / 16) * Math.PI * 2) * r;
        if (!game.blocked(px, pz)) return { x: px, z: pz };
      }
    }
    return { x, z };
  }

  function land() {
    const p = game.me.root.position;
    landAt = landingSpot(p.x, p.z);
    phase = 'off'; t = 0;
  }

  // The chat code: true when it was ours (and we are an operator).
  async function command(code) {
    const k = typeof code === 'string' && !COSTUMES[code] && code !== 'off' ? skyCode(code) : code;
    if (!k || !(await isOperator())) return false;
    if (k === 'off' || k === kind) {
      if (!kind) game.shop.toast(L(SKY_TEXT.none));
      else if (phase !== 'off') land();
      return true;
    }
    if (game.mode !== 'street') { game.shop.toast(L(SKY_TEXT.street)); return true; }
    if (game.busy) { game.shop.toast(L(SKY_TEXT.busy)); return true; }
    if (kind) { // another costume, up in the air: change over
      const keep = savedLook, fog = savedFog;
      if (swapped) wear(false);
      clearPieces();
      game.me.setMoves(null);
      savedLook = keep; savedFog = fog;
    }
    start(k);
    return true;
  }

  // Bone offsets laid over the idle clip (model-pack.js setMoves).
  let hf = 0; // how fast across, 0..1
  function pose() {
    if (kind === 'wings') {
      return { armL: [0.15, -0.3, 0], armR: [0.15, 0.3, 0], foreL: [-0.2, 0, 0], foreR: [-0.2, 0, 0], legL: [0.15 * hf, 0, 0], legR: [0.25 * hf, 0, 0], kneeL: [0.35 - 0.25 * hf, 0, 0], kneeR: [0.2, 0, 0] };
    }
    // Hovering: arms a little out, knees bent; flying: arms stretched back
    // along the body, legs straight together.
    const h = 1 - hf;
    return {
      armL: [0.1 * h + 0.6 * hf, -0.35 * h - 0.12 * hf, 0], armR: [0.1 * h + 0.6 * hf, 0.35 * h + 0.12 * hf, 0],
      foreL: [-0.25 * h, 0, 0], foreR: [-0.25 * h, 0, 0],
      legL: [-0.1 * h + 0.08 * hf, 0, 0], legR: [0.05 * h + 0.08 * hf, 0, 0],
      kneeL: [0.35 * h, 0, 0], kneeR: [0.15 * h, 0, 0],
      head: [-0.5 * hf, 0, 0], // looking ahead while lying flat
    };
  }

  // Pieces flying on (u from 0 to 1) or off.
  function placePieces(off) {
    for (const pc of pieces) {
      if (!pc.holder && !mount(pc)) continue;
      if (!off) {
        const u = clamp01((t - pc.delay) / pc.dur);
        const e = easeOutBack(u);
        pc.obj.visible = u > 0;
        pc.obj.position.copy(pc.home).addScaledVector(pc.from, 1 - e);
        pc.obj.rotation.y = (1 - e) * 4;
        pc.obj.scale.setScalar(1);
      } else {
        const u = clamp01(t / OFF_DUR);
        pc.obj.position.copy(pc.home).addScaledVector(pc.from.lengthSq() ? pc.from : v1.set(0, 1, -1), u * u);
        pc.obj.scale.setScalar(Math.max(0.001, 1 - u));
      }
    }
  }

  function updateWings(dt, climbing) {
    const unfold = phase === 'on' ? smooth(clamp01((t - 0.3) / 0.5)) : phase === 'off' ? 1 - clamp01(t / OFF_DUR) : 1;
    const burst = phase === 'on' ? easeOutBack(clamp01((t - 0.3) / 0.5)) : unfold;
    const rate = climbing ? 3.2 : 1.6 + (1 - hf) * 0.8; // flaps a second: harder when climbing or hovering
    flapT += dt * rate * Math.PI * 2 * (unfold > 0.6 ? 1 : 0.2);
    const flap = Math.sin(flapT) * (0.55 + (climbing ? 0.2 : 0)) * unfold;
    for (const w of wings) {
      const s = w.userData.side;
      w.scale.setScalar(Math.max(0.05, 0.15 + 0.85 * burst));
      w.rotation.set(-0.15 * (1 - unfold), s * 1.35 * (1 - unfold), s * (0.12 + flap));
    }
  }

  function updateFlames(on, dt) {
    const me = game.me;
    if (!flames.length) return;
    me.root.updateMatrixWorld(true);
    FLAME_BONES.forEach(([end, from], i) => {
      const f = flames[i];
      const a = me.root.getObjectByName(end), b = me.root.getObjectByName(from);
      f.visible = !!(on && a && b);
      if (!f.visible) return;
      if (f.parent !== me.root) me.root.add(f);
      me.root.worldToLocal(a.getWorldPosition(v1));
      me.root.worldToLocal(b.getWorldPosition(v2));
      const dir = v2.subVectors(v1, v2).normalize();
      f.position.copy(v1).addScaledVector(dir, 0.04);
      f.quaternion.setFromUnitVectors(up, dir);
      const len = (0.3 + 0.55 * hf + 0.15 * Math.abs(climbBtn)) * (0.85 + Math.random() * 0.3);
      f.scale.set(1 + Math.random() * 0.15, len, 1 + Math.random() * 0.15);
    });
    void dt;
  }

  function updateFog(y) {
    const fog = game.scene.fog;
    if (!fog || !savedFog) return;
    const k = clamp01(y / 80);
    fog.near = savedFog.near + (500 - savedFog.near) * k;
    fog.far = savedFog.far + (1700 - savedFog.far) * k;
  }

  // Each frame while flying, in place of walking. Returns the walk speed for
  // the body's clip (0: the idle clip under the flying pose).
  function fly(dt, p, mx, my, yaw, fast) {
    if (game.mode !== 'street') { finish(true); return 0; } // a warp or a door: back on foot
    if (game.me !== bound) bind(); // the character was rebuilt (a new look)
    const me = game.me;
    const C = COSTUMES[kind];
    t += dt;
    let climb = 0;
    if (phase === 'on') {
      if (!swapped && C.model && t >= C.swapAt) { wear(true); bind(); puff(true); }
      else if (!swapped && !C.model && t >= C.swapAt && Object.keys(C.look).some((k) => savedLook[k] != null)) { wear(true); bind(); }
      // Up off the ground once dressed.
      const liftFrom = C.ready - 0.6;
      if (t > liftFrom && p.y < LIFT) p.y = Math.min(LIFT, p.y + dt * 6);
      if ((fxT -= dt) <= 0 && t < C.ready) { fxT = 0.35; puff(t < 0.8); }
      if (t >= C.ready) { phase = 'fly'; t = 0; }
      vel.multiplyScalar(Math.exp(-dt * 4));
    } else if (phase === 'off') {
      // Down to the landing spot, then the costume comes off.
      const dx = landAt.x - p.x, dz = landAt.z - p.z, d = Math.hypot(dx, dz);
      if (p.y > 0.01 || d > 0.05) {
        t = 0;
        const step = Math.min(d, FAST * dt);
        if (d > 0.05) { p.x += (dx / d) * step; p.z += (dz / d) * step; }
        p.y = Math.max(0, p.y - Math.max(CLIMB, p.y * 1.5) * dt);
        hf = clamp01(step / dt / SPEED);
      } else {
        if (t < dt * 1.5) puff(true);
        hf = 0;
        if (t >= OFF_DUR) { finish(); return 0; }
      }
      vel.set(0, 0, 0);
    } else {
      const k = game.input?.keys;
      climb = climbBtn || ((k?.has('Space') || k?.has('KeyR') ? 1 : 0) - (k?.has('KeyC') || k?.has('KeyF') ? 1 : 0));
      const sp = fast ? FAST : SPEED;
      const fx0 = -Math.sin(yaw), fz0 = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      v1.set((fx0 * my + rx * mx) * sp, climb * (fast ? FAST_CLIMB : CLIMB), (fz0 * my + rz * mx) * sp);
      vel.lerp(v1, 1 - Math.exp(-dt * 3));
      p.addScaledVector(vel, dt);
      p.y = Math.min(TOP, Math.max(0, p.y));
      const b = game.bounds;
      if (b) {
        p.x = Math.min(b.maxX + 150, Math.max(b.minX - 150, p.x));
        p.z = Math.min(b.maxZ + 150, Math.max(b.minZ - 150, p.z));
      }
    }
    const across = Math.hypot(vel.x, vel.z);
    if (phase !== 'off') hf += (clamp01(across / SPEED) - hf) * Math.min(1, dt * 4);
    // Face where we fly, banking into turns.
    if (across > 0.5) {
      let d = Math.atan2(vel.x, vel.z) - me.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      me.root.rotation.y += d * Math.min(1, dt * 5);
    }
    let turn = me.root.rotation.y - lastRy;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    lastRy = me.root.rotation.y;
    roll += (THREE.MathUtils.clamp(-turn / Math.max(dt, 1e-3) * 0.25, -0.6, 0.6) * hf - roll) * Math.min(1, dt * 4);
    // The body: upright while hovering, flat when flying fast. Seoulman
    // spins round as he changes.
    const tilt = (kind === 'wings' ? 0.15 + 0.7 * hf : 0.2 + 1.2 * hf) - climb * 0.15 * (1 - hf);
    const spin = phase === 'on' && kind === 'seoulman' ? smooth(clamp01(t / 0.9)) * Math.PI * 4 : 0;
    me.setTrick({ flip: tilt, roll, spin }, p.y);
    placePieces(phase === 'off' && (p.y <= 0.01));
    if (kind === 'wings') updateWings(dt, climb > 0);
    for (const pc of pieces) if (pc.obj.userData.cape) pc.obj.rotation.x = 0.12 + 1.1 * hf + 0.12 * Math.sin(performance.now() / 110) * (0.3 + hf);
    updateFlames(phase === 'fly' || (phase === 'on' && t > C.ready - 0.6) || (phase === 'off' && p.y > 0.01), dt);
    updateFog(p.y);
    return 0;
  }

  return {
    command,
    fly,
    isOperator, // (am_operator on the server; also lets operators through the zoo's gap)
    // Sprites drift on after landing: call every frame.
    update(dt) { fx.update(dt); },
    land() { if (kind && phase !== 'off') land(); },
    stop() { finish(true); },
    get active() { return !!kind; },
    get kind() { return kind; },
  };
}
