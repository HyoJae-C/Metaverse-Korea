// The croc and the bulldog as little 3D toys inside the board games panel
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

export function createToyView(kind, { spots, onPick }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  const el = renderer.domElement;
  el.className = 'bg-toy3d';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c7b0, 1.9));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(2, 5, 4);
  scene.add(sun);
  const toy = kind === 'croc' ? crocToy(spots) : dogToy(spots);
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
      at.copy(m.position).project(camera);
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
    sync({ pressed: list, bang, canPick: can }) {
      const now = performance.now();
      for (const i of list) if (!pressed.has(i)) { pressed.add(i); toy.press(i, now); }
      if (bang && !banged) { banged = true; toy.bang(now + (kind === 'croc' ? 140 : 380)); } // (after the tooth sinks / the bone lands)
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
