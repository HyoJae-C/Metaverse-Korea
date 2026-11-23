// The croc, the bulldog, the barrel pirate and the block tower as little 3D toys inside the board games panel
// (ui/board-games-ui.js). Looks matter for these two (Yozi 2026-11-23): you
// press a tooth and it sinks; the wrong one and the jaw snaps shut and the
// whole toy jumps. You hand the sleeping bulldog a bone and it lands in his
// bowl; the wrong one and he is up, eyes wide, barking.
//
// A small renderer of its own on a canvas in the panel (the room keeps
// drawing behind it), made when a game starts and let go when it ends.
// Loaded only when one of these two games is played. Shapes are our own,
// built from balls and boxes in the game's chunky style.
//
// createToyView(kind, { spots, onPick(i) }) → { el, sync({ pressed, bang,
//   canPick }), dispose() }; null if the browser gives no WebGL.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const lam = (color) => new THREE.MeshLambertMaterial({ color });
const ease = (t) => 1 - (1 - t) ** 3;

function crocToy(spots) {
  const root = new THREE.Group();
  const GREEN = lam('#58a765'), DARK = lam('#3f8550'), PINK = lam('#f39aa6'), WHITE = '#fffdf4';
  const add = (parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  };
  const box = new THREE.BoxGeometry(1, 1, 1), ball = new THREE.SphereGeometry(1, 20, 14), disc = new THREE.CylinderGeometry(1, 1, 1, 28);
  // The lower jaw: a long plate with a round snout, pink inside.
  add(root, box, GREEN, 0, 0.14, 0.1, 1.7, 0.28, 2.0);
  add(root, disc, GREEN, 0, 0.14, 1.1, 0.85, 0.28, 0.85);
  add(root, box, PINK, 0, 0.29, 0.1, 1.2, 0.02, 1.9);
  add(root, disc, PINK, 0, 0.29, 1.1, 0.6, 0.02, 0.6);
  add(root, ball, lam('#e8667a'), 0, 0.3, 0.45, 0.42, 0.07, 0.75); // tongue
  // The neck and two front feet, so it sits like a toy.
  add(root, box, DARK, 0, 0.3, -1.15, 1.9, 0.6, 0.6);
  for (const s of [-1, 1]) add(root, ball, DARK, s * 1.0, 0.1, -0.7, 0.3, 0.12, 0.38);
  // The teeth: four down each side, five round the snout.
  const at = [];
  for (let i = 0; i < 4; i++) at.push([-0.72, 0.9 - i * 0.42]);
  for (let i = 0; i < 5; i++) { const a = (-64 + i * 32) * Math.PI / 180; at.push([Math.sin(a) * 0.72, 1.1 + Math.cos(a) * 0.72]); }
  for (let i = 0; i < 4; i++) at.push([0.72, 0.9 - (3 - i) * 0.42]);
  const order = [3, 2, 1, 0, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // left back → round the front → right back
  const toothGeo = new THREE.CapsuleGeometry(0.135, 0.1, 4, 10); // (big: easy to see and to tap on a phone)
  const teeth = [];
  for (let i = 0; i < spots; i++) {
    const [x, z] = at[order[i % at.length]];
    const m = add(root, toothGeo, new THREE.MeshLambertMaterial({ color: WHITE }), x, 0.42, z);
    m.userData.spot = i;
    m.userData.y0 = 0.42;
    teeth.push(m);
  }
  // The upper jaw, hinged at the back; eyes on top.
  const upper = new THREE.Group();
  upper.position.set(0, 0.5, -0.9);
  root.add(upper);
  add(upper, box, GREEN, 0, 0.16, 1.0, 1.7, 0.32, 2.0);
  add(upper, disc, GREEN, 0, 0.16, 2.0, 0.85, 0.32, 0.85);
  add(upper, box, PINK, 0, -0.01, 1.0, 1.2, 0.02, 1.9);
  for (const s of [-1, 1]) {
    add(upper, ball, GREEN, s * 0.45, 0.42, 0.25, 0.3, 0.3, 0.3);
    add(upper, ball, lam('#ffffff'), s * 0.45, 0.47, 0.38, 0.22, 0.22, 0.22);
    add(upper, ball, DARK, s * 0.22, 0.34, 2.55, 0.07, 0.05, 0.07); // nostril
  }
  const pupils = [-1, 1].map((s) => add(upper, ball, lam('#1d1b22'), s * 0.45, 0.5, 0.56, 0.1, 0.1, 0.07));
  // A row of small upper teeth, for show.
  const fangs = [];
  for (let i = 0; i < 9; i++) { const a = (-80 + i * 20) * Math.PI / 180; fangs.push(new THREE.ConeGeometry(0.07, 0.16, 6).rotateX(Math.PI).translate(Math.sin(a) * 0.72, -0.08, 2.0 + Math.cos(a) * 0.72)); }
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) fangs.push(new THREE.ConeGeometry(0.07, 0.16, 6).rotateX(Math.PI).translate(s * 0.72, -0.08, 0.5 + i * 0.4));
  upper.add(new THREE.Mesh(mergeGeometries(fangs), lam(WHITE)));
  const OPEN = -0.62;
  upper.rotation.x = OPEN;
  let bangAt = -1;
  return {
    root, picks: teeth, cam: [1.7, 3.5, 4.3], look: [0, 0.5, 0.55],
    press(i, now) { teeth[i].userData.at = now; },
    bang(now) { bangAt = now; },
    update(now, pressed) {
      for (const m of teeth) {
        const down = pressed.has(m.userData.spot);
        const k = down ? Math.min(1, (now - (m.userData.at ?? -1e9)) / 140) : 0;
        m.position.y = m.userData.y0 - 0.17 * ease(k);
        m.material.color.set(down ? '#d9d2c0' : m.userData.hot ? '#ffe9a8' : WHITE);
      }
      if (bangAt < 0 || now < bangAt) { upper.rotation.x = OPEN + Math.sin(now / 700) * 0.02; root.position.set(0, 0, 0); return; }
      const t = now - bangAt;
      // Snap shut in a tenth of a second, bounce, then shake.
      const k = Math.min(1, t / 100);
      upper.rotation.x = OPEN * (1 - k * k) + (t > 100 && t < 260 ? -0.12 * Math.sin((t - 100) / 160 * Math.PI) : 0);
      const shake = t < 700 ? (1 - t / 700) * 0.12 : 0;
      root.position.set(Math.sin(t / 18) * shake, t > 100 && t < 420 ? Math.sin((t - 100) / 320 * Math.PI) * 0.35 : 0, 0);
      for (const p of pupils) p.scale.setScalar(t < 1500 ? 0.05 : 0.1);
    },
  };
}

function boneGeo() {
  const parts = [new THREE.CylinderGeometry(0.055, 0.055, 0.34, 8).rotateZ(Math.PI / 2)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(new THREE.SphereGeometry(0.085, 10, 8).translate(sx * 0.19, 0, sz * 0.06));
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
}

function dogToy(spots) {
  const root = new THREE.Group();
  const TAN = lam('#dba56a'), CREAM = lam('#f6e3c5'), BROWN = lam('#7a4a2b'), INK = lam('#2b2230');
  const ball = new THREE.SphereGeometry(1, 22, 16), box = new THREE.BoxGeometry(1, 1, 1);
  const add = (parent, geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  };
  // His mat and his bowl.
  add(root, new THREE.CylinderGeometry(1, 1, 1, 36), lam('#c9524a'), 0, 0.02, 0, 1.9, 0.04, 1.5);
  const bowl = new THREE.Group();
  bowl.position.set(0, 0, 1.35);
  root.add(bowl);
  add(bowl, new THREE.CylinderGeometry(0.5, 0.4, 0.2, 24), lam('#4a7bd0'), 0, 0.1, 0);
  add(bowl, new THREE.CylinderGeometry(0.42, 0.42, 0.02, 24), lam('#2f5aa8'), 0, 0.2, 0);
  // The bulldog, lying down with his chin on his paws.
  const body = add(root, ball, TAN, 0, 0.5, -0.75, 1.15, 0.62, 0.85);
  add(root, ball, TAN, -0.75, 0.25, -1.1, 0.34, 0.22, 0.45); // back legs tucked
  add(root, ball, TAN, 0.75, 0.25, -1.1, 0.34, 0.22, 0.45);
  for (const s of [-1, 1]) add(root, ball, CREAM, s * 0.42, 0.13, 0.42, 0.2, 0.13, 0.3); // front paws
  add(root, new THREE.TorusGeometry(0.5, 0.07, 8, 24).rotateX(Math.PI / 2.4), lam('#d43d3d'), 0, 0.5, -0.22); // collar
  const head = new THREE.Group();
  head.position.set(0, 0.52, 0.0);
  root.add(head);
  add(head, ball, TAN, 0, 0.1, 0, 0.62, 0.54, 0.56);
  add(head, ball, CREAM, 0, -0.08, 0.36, 0.42, 0.3, 0.34); // muzzle
  for (const s of [-1, 1]) {
    add(head, ball, CREAM, s * 0.3, -0.2, 0.34, 0.24, 0.22, 0.24); // jowls
    const ear = add(head, ball, BROWN, s * 0.52, 0.42, -0.05, 0.2, 0.26, 0.1);
    ear.rotation.z = -s * 0.7;
  }
  add(head, ball, INK, 0, 0.02, 0.68, 0.11, 0.08, 0.08); // nose
  add(head, ball, BROWN, 0.3, 0.2, 0.3, 0.24, 0.22, 0.2); // a patch over one eye
  const jaw = add(head, ball, lam('#b8433f'), 0, -0.22, 0.4, 0.26, 0.05, 0.22); // his mouth, shut
  const shut = [-1, 1].map((s) => add(head, box, INK, s * 0.26, 0.2, 0.5, 0.2, 0.035, 0.04));
  const open = [];
  for (const s of [-1, 1]) {
    open.push(add(head, ball, lam('#ffffff'), s * 0.26, 0.22, 0.46, 0.15, 0.15, 0.1));
    open.push(add(head, ball, INK, s * 0.26, 0.22, 0.55, 0.07, 0.07, 0.04));
    const brow = add(head, box, INK, s * 0.26, 0.4, 0.5, 0.26, 0.05, 0.05);
    brow.rotation.z = s * 0.5;
    open.push(brow);
  }
  for (const m of open) m.visible = false;
  // The bones, laid out in two rows in front.
  const geo = boneGeo();
  const bones = [];
  const perRow = Math.ceil(spots / 2);
  for (let i = 0; i < spots; i++) {
    const row = Math.floor(i / perRow), col = i % perRow;
    const x = (col - (perRow - 1) / 2) * 0.64, z = 2.2 + row * 0.5;
    const m = add(root, geo, new THREE.MeshLambertMaterial({ color: '#fffdf4' }), x, 0.1, z);
    m.rotation.y = ((i * 37) % 9 - 4) * 0.08;
    m.userData = { spot: i, from: [x, 0.1, z], to: [((i * 53) % 7 - 3) * 0.08, 0.26 + (i % 4) * 0.035, 1.35 + ((i * 29) % 5 - 2) * 0.07] };
    bones.push(m);
  }
  let bangAt = -1;
  return {
    root, picks: bones, cam: [0, 4.3, 6.8], look: [0, 0.3, 1.15],
    press(i, now) { bones[i].userData.at = now; },
    bang(now) { bangAt = now; },
    update(now, pressed) {
      for (const m of bones) {
        const u = m.userData;
        if (!pressed.has(u.spot)) { m.position.set(...u.from); m.material.color.set(u.hot ? '#ffe9a8' : '#fffdf4'); continue; }
        const k = ease(Math.min(1, (now - (u.at ?? -1e9)) / 380));
        m.position.set(u.from[0] + (u.to[0] - u.from[0]) * k, u.from[1] + (u.to[1] - u.from[1]) * k + Math.sin(k * Math.PI) * 0.7, u.from[2] + (u.to[2] - u.from[2]) * k);
        m.rotation.x = k * Math.PI * 2;
        m.material.color.set('#fffdf4');
      }
      if (bangAt < 0 || now < bangAt) {
        // Asleep: slow breathing.
        const b = Math.sin(now / 900);
        body.scale.y = 0.62 + b * 0.03;
        head.position.y = 0.52 + b * 0.012;
        return;
      }
      const t = now - bangAt;
      for (const m of open) m.visible = true;
      for (const m of shut) m.visible = false;
      // Up in a flash, then three barks.
      const up = ease(Math.min(1, t / 120));
      const bark = t < 1500 ? Math.max(0, Math.sin(t / 250 * Math.PI)) : 0.15;
      head.position.set(0, 0.52 + up * 0.5 + bark * 0.08, up * 0.45 + bark * 0.22);
      head.rotation.x = -up * 0.25;
      jaw.position.y = -0.22 - bark * 0.2;
      jaw.scale.y = 0.05 + bark * 0.16;
      body.scale.y = 0.62 + up * 0.12;
      const shake = t < 900 ? (1 - t / 900) * 0.1 : 0;
      root.position.x = Math.sin(t / 16) * shake;
    },
  };
}

// The block tower: ten layers of three wooden blocks, seen from a corner so
// one end of every block shows. A block taken slides out towards you and
// hops on top; when the tower goes, every block tumbles.
function towerToy(spots) {
  const root = new THREE.Group();
  const LEN = 1.5, W = 0.5, H = 0.3, LAYERS = spots / 3;
  const WOOD = ['#e9c58c', '#dcb276', '#f0d3a0'];
  const geo = new THREE.BoxGeometry(LEN, H * 0.94, W * 0.94);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.1, 40), lam('#b98a5a'));
  table.position.y = -0.05;
  root.add(table);
  const stack = new THREE.Group(); // (the blocks sway together)
  root.add(stack);
  // Where a block sits: layer, place across (0..2); odd layers are turned.
  const seat = (layer, k) => ({ x: layer % 2 ? (k - 1) * W : 0, y: (layer + 0.5) * H, z: layer % 2 ? 0 : (k - 1) * W, turn: layer % 2 ? Math.PI / 2 : 0 });
  const blocks = [];
  for (let i = 0; i < spots; i++) {
    const layer = Math.floor(i / 3), k = i % 3, s = seat(layer, k);
    const tone = WOOD[(i * 7 + layer) % 3];
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: tone }));
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.turn;
    Object.assign(m.userData, { spot: i, tone, home: s, out: layer % 2 ? [0, 0, 1] : [1, 0, 0] });
    // Taps aim at the end that faces the camera.
    m.userData.pick = new THREE.Vector3(s.x + m.userData.out[0] * LEN / 2, s.y, s.z + m.userData.out[2] * LEN / 2);
    stack.add(m);
    blocks.push(m);
  }
  let taken = 0, bangAt = -1, sway = 0;
  return {
    root, picks: blocks, cam: [6.3, 5.5, 6.3], look: [0, 2.3, 0],
    // The block goes on top a little askew, more so the more the tower
    // wobbles (looks only: what falls is decided by the rules).
    press(i, now, wobble = 0) {
      const m = blocks[i];
      const top = seat(LAYERS + Math.floor(taken / 3), taken % 3);
      const r = (k) => { const v = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; }; // (-1..1, the same on every screen)
      const off = 0.015 + wobble * 0.45;
      top.x += r(1) * off; top.z += r(2) * off; top.turn += r(3) * (0.03 + wobble * 1.1);
      m.userData.at = now;
      m.userData.top = top;
      sway = wobble;
      taken++;
    },
    bang(now) {
      bangAt = now;
      for (const m of blocks) {
        const a = Math.atan2(m.position.z, m.position.x) + (Math.sin(m.userData.spot * 12.9898) * 43758.5453 % 1) * 2;
        m.userData.fall = { vx: Math.cos(a) * (0.6 + (m.userData.spot % 5) * 0.25), vz: Math.sin(a) * (0.6 + (m.userData.spot % 3) * 0.3), spin: 2 + (m.userData.spot % 4), rest: H / 2 + (m.userData.spot % 3) * H * 0.9 };
      }
    },
    update(now, pressed) {
      const fell = bangAt >= 0 && now >= bangAt;
      stack.rotation.z = fell ? 0 : Math.sin(now / 520) * (0.004 + sway * 0.16);
      stack.rotation.x = fell ? 0 : Math.cos(now / 610) * (0.003 + sway * 0.12);
      for (const m of blocks) {
        const u = m.userData, h = u.home;
        m.material.color.set(u.hot && !pressed.has(u.spot) ? '#ffe08a' : u.tone);
        if (pressed.has(u.spot) && u.top) {
          // Slide out, then an arc up to its place on top.
          const t = now - (u.at ?? -1e9);
          const a = ease(Math.min(1, t / 320)), b = ease(Math.min(1, Math.max(0, (t - 320) / 420)));
          const ox = h.x + u.out[0] * LEN * 1.05 * a, oz = h.z + u.out[2] * LEN * 1.05 * a;
          m.position.set(ox + (u.top.x - ox) * b, h.y + (u.top.y - h.y) * b + Math.sin(b * Math.PI) * 0.5, oz + (u.top.z - oz) * b);
          m.rotation.y = h.turn + (u.top.turn - h.turn) * b;
          if (b >= 1) u.rest = u.top;
        }
        if (!fell) continue;
        const t = (now - bangAt) / 1000, f = u.fall, from = u.rest ?? (pressed.has(u.spot) ? null : h);
        if (!from) continue; // (the block that did it is still in the hand)
        const drop = from.y - 3.2 * t * t, down = drop <= f.rest;
        const tl = down ? Math.sqrt(Math.max(0, from.y - f.rest) / 3.2) : t; // (it stops where it lands)
        m.position.set(from.x + f.vx * tl, down ? f.rest : drop, from.z + f.vz * tl);
        m.rotation.set(down ? 0 : f.spin * tl, from.turn + f.spin * 0.6 * tl, down ? 0 : f.spin * 0.7 * tl);
      }
    },
  };
}

// The pirate in his barrel: three rings of slots round a wooden barrel that
// turns slowly, so every slot comes past. A sword slides into the slot you
// pick; the wrong one and the pirate shoots out of the top, spinning.
function pirateToy(spots, figure) {
  const root = new THREE.Group();
  const WOOD = lam('#b9793f'), DARK = lam('#7a4a2b'), IRON = lam('#55504e'), SKIN = lam('#f2c79a'), RED = lam('#d43d3d'), INK = lam('#2b2230');
  const ball = new THREE.SphereGeometry(1, 22, 16), box = new THREE.BoxGeometry(1, 1, 1);
  const add = (parent, geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    parent.add(m);
    return m;
  };
  const R = 0.95, TALL = 2.0, ROWS = 3, PER = Math.ceil(spots / ROWS);
  add(root, new THREE.CylinderGeometry(2.1, 2.1, 0.08, 40), lam('#3f6fb5'), 0, -0.04, 0); // a sea-blue mat
  const barrel = new THREE.Group();
  root.add(barrel);
  // A barrel with a belly: wide in the middle, narrower at both ends.
  const profile = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; profile.push(new THREE.Vector2(R * (0.84 + 0.16 * Math.sin(t * Math.PI)), t * TALL)); }
  barrel.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 28), WOOD));
  add(barrel, new THREE.CylinderGeometry(R * 0.84, R * 0.84, 0.04, 28), DARK, 0, TALL - 0.02, 0);
  for (const y of [0.22, TALL - 0.22]) add(barrel, new THREE.TorusGeometry(R * 0.9, 0.05, 8, 32).rotateX(Math.PI / 2), IRON, 0, y, 0);
  const slots = [], swords = [];
  const HILT = ['#e8402a', '#2f7de1', '#27a35a', '#f0a81c', '#8d6ad0', '#e06aa0'];
  for (let i = 0; i < spots; i++) {
    const row = Math.floor(i / PER), a = ((i % PER) + row * 0.5) / PER * Math.PI * 2;
    const y = 0.55 + row * 0.45, r = R * (0.84 + 0.16 * Math.sin((y / TALL) * Math.PI));
    const hold = new THREE.Group(); // (looks outwards from the barrel's middle)
    hold.position.set(0, y, 0);
    hold.rotation.y = a;
    barrel.add(hold);
    const slot = add(hold, box, new THREE.MeshLambertMaterial({ color: '#3a2415' }), 0, 0, r + 0.005, 0.2, 0.07, 0.03);
    slot.userData.spot = i;
    slots.push(slot);
    const sword = new THREE.Group();
    add(sword, box, lam('#dfe6ee'), 0, 0, 0.1, 0.11, 0.025, 0.9); // blade
    add(sword, box, lam('#e2b84a'), 0, 0, 0.58, 0.3, 0.06, 0.06); // guard
    add(sword, box, lam(HILT[i % HILT.length]), 0, 0, 0.72, 0.08, 0.08, 0.24); // grip
    sword.visible = false;
    hold.add(sword);
    sword.userData = { r };
    swords.push(sword);
  }
  // The pirate, peeking out of the top.
  const man = new THREE.Group();
  root.add(man);
  add(man, ball, lam('#2f5aa8'), 0, -0.25, 0, 0.5, 0.45, 0.4); // striped shirt, mostly in the barrel
  add(man, ball, SKIN, 0, 0.3, 0, 0.42);
  add(man, new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), RED, 0, 0.36, 0, 0.44); // bandana
  add(man, ball, RED, 0.4, 0.42, -0.1, 0.12); // its knot
  add(man, ball, INK, -0.16, 0.34, 0.37, 0.1, 0.1, 0.05); // eye patch
  add(man, box, INK, 0, 0.42, 0.36, 0.72, 0.03, 0.03).rotation.z = 0.25; // its strap
  const eye = add(man, ball, INK, 0.16, 0.34, 0.38, 0.055);
  add(man, ball, lam('#b8433f'), 0, 0.14, 0.38, 0.14, 0.04, 0.05); // a grin
  const mouth = add(man, ball, INK, 0, 0.12, 0.38, 0.12, 0.13, 0.05); // his mouth, wide open
  mouth.visible = false;
  if (figure) {
    // The host sits in the barrel instead (a game character, 1.2 m tall,
    // head about 0.6): the pirate's head makes way, the bandana stays.
    const keep = new Set(man.children.slice(2, 4));
    for (const c of man.children) c.visible = keep.has(c);
    man.children[2].position.y = 0.52; man.children[3].position.y = 0.58;
    figure.scale.setScalar(1.3);
    figure.position.y = -0.87;
    man.add(figure);
  }
  const REST = TALL + 0.05;
  let bangAt = -1;
  const camDir = new THREE.Vector2(0, 1);
  return {
    root, picks: slots, cam: [0, 4.0, 7.4], look: [0, 1.55, 0],
    // Only slots on the side facing you can be picked; `at` gets the slot's place in the world.
    pickPoint(m, at) { m.getWorldPosition(at); const l = Math.hypot(at.x, at.z) || 1; return (at.x * camDir.x + at.z * camDir.y) / l > 0.2; },
    press(i, now) { swords[i].userData.at = now; swords[i].visible = true; },
    bang(now) { bangAt = now; },
    update(now, pressed) {
      const popped = bangAt >= 0 && now >= bangAt;
      if (!popped) barrel.rotation.y = now / 2600; // (one turn in about 16 s)
      slots.forEach((m, i) => {
        m.material.color.set(pressed.has(i) ? '#1d120a' : m.userData.hot ? '#ffd36b' : '#3a2415');
        m.scale.set(m.userData.hot && !pressed.has(i) ? 0.3 : 0.2, m.userData.hot && !pressed.has(i) ? 0.12 : 0.07, 0.03);
        const sw = swords[i];
        if (!sw.visible) return;
        const k = ease(Math.min(1, (now - (sw.userData.at ?? -1e9)) / 260));
        sw.position.z = sw.userData.r + 0.9 - 0.75 * k;
      });
      if (!popped) { man.position.set(0, REST + Math.sin(now / 500) * 0.03, 0); man.rotation.set(0, Math.sin(now / 900) * 0.5, 0); return; }
      // Up he goes, spinning; then he lands back and wobbles.
      const t = (now - bangAt) / 1000, up = t < 1.1;
      const h = up ? 1.5 * Math.sin((t / 1.1) * Math.PI) : 0;
      man.position.set(0, REST + h + (up ? 0 : Math.exp(-(t - 1.1) * 3) * Math.abs(Math.sin((t - 1.1) * 9)) * 0.25), 0);
      man.rotation.set(0, up ? t * 14 : 0, up ? Math.sin(t * 12) * 0.3 : 0);
      eye.scale.setScalar(0.09);
      mouth.visible = !figure;
      root.position.x = t < 0.5 ? Math.sin(t * 60) * 0.06 * (1 - t / 0.5) : 0;
    },
  };
}

export function createToyView(kind, { spots, onPick, figure = null }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  const el = renderer.domElement;
  el.className = 'bg-toy3d';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c7b0, 1.9));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(2, 5, 4);
  scene.add(sun);
  const toy = kind === 'croc' ? crocToy(spots) : kind === 'tower' ? towerToy(spots) : kind === 'pirate' ? pirateToy(spots, figure) : dogToy(spots);
  scene.add(toy.root);
  const camera = new THREE.PerspectiveCamera(34, 4 / 3, 0.1, 50);
  camera.position.set(...toy.cam);
  camera.lookAt(...toy.look);
  const pressed = new Set();
  let canPick = false, banged = false, raf = 0, w = 0, h = 0, gone = false;
  const ndc = new THREE.Vector2(), at = new THREE.Vector3();
  const hit = (e) => {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    // A finger is wider than a tooth, most of all on a phone: no need to hit
    // it, the free piece nearest the tap on screen is the one (within a
    // thumb's width).
    let best = null, bestD = Math.max(48, r.width * 0.12);
    for (const m of toy.picks) {
      if (pressed.has(m.userData.spot)) continue;
      if (toy.pickPoint) { if (!toy.pickPoint(m, at)) continue; } else at.copy(m.userData.pick ?? m.position);
      at.project(camera);
      const d = Math.hypot((at.x - ndc.x) * r.width / 2, (at.y - ndc.y) * r.height / 2);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best;
  };
  el.addEventListener('pointermove', (e) => {
    const m = canPick ? hit(e) : null;
    for (const q of toy.picks) q.userData.hot = q === m;
    el.style.cursor = m ? 'pointer' : 'default';
  });
  el.addEventListener('pointerleave', () => { for (const q of toy.picks) q.userData.hot = false; });
  el.addEventListener('pointerdown', (e) => {
    if (!canPick) return;
    const m = hit(e);
    if (m) { e.preventDefault(); onPick(m.userData.spot); }
  });
  const frame = () => {
    if (gone) return;
    raf = requestAnimationFrame(frame);
    if (!el.isConnected) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    if (cw && ch && (cw !== w || ch !== h)) {
      w = cw; h = ch;
      renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    toy.update(performance.now(), pressed);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);
  return {
    el,
    // The game as it stands: which spots are pressed, whether the last one
    // was the bad one, and whether it is my turn.
    sync({ pressed: list, bang, canPick: can, wobble = 0, placing = false }) {
      const now = performance.now();
      for (const i of list) if (!pressed.has(i)) { pressed.add(i); toy.press(i, now, wobble); }
      if (bang && !banged) { banged = true; toy.bang(now + (kind === 'croc' ? 140 : kind === 'tower' ? (placing ? 760 : 300) : kind === 'pirate' ? 260 : 380)); } // (after the tooth sinks / the block slides out, or lands on top / the bone lands)
      canPick = can && !banged;
    },
    dispose() {
      gone = true;
      cancelAnimationFrame(raf);
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
      renderer.dispose();
      renderer.forceContextLoss?.();
      el.remove();
    },
  };
}
