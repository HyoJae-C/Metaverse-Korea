// Characters for the local player, other players and NPCs. The body is a 3D
// model from the active model pack (src/data/characters); a chibi built from
// simple rounded shapes shows while the model loads, or if it fails to load.
import * as THREE from 'three';
import { makeBike, makeTandem, makeCar } from './bikes.js';
import { attachModel } from './model-pack.js';
import { makeHeld } from './held.js';

import { PALETTES, PATCHES, sanitizeLook, accessory } from '../data/appearance.js';
import { TEE_PRINTS, drawTeePrint } from './tee-prints.js';

const geoCache = {};
const geo = (key, make) => (geoCache[key] ||= make());
const matCache = {};
const mat = (hex) => (matCache[hex] ||= new THREE.MeshLambertMaterial({ color: hex }));

const qHand = new THREE.Quaternion(), qRoot = new THREE.Quaternion();
export function createCharacter(rawLook) {
  const look = sanitizeLook(rawLook);
  const o = {
    shirt: PALETTES.shirt[look.shirt], pants: PALETTES.pants[look.pants],
    hair: PALETTES.hair[look.hair], skin: PALETTES.skin[look.skin],
  };
  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs while walking
  root.add(body);

  // Total height ≈ 1.2 m: head ≈ 0.6, body+legs ≈ 0.6 (2 heads tall).
  const torso = new THREE.Mesh(geo('torso', () => new THREE.CapsuleGeometry(0.2, 0.16, 6, 12)), mat(o.shirt));
  torso.position.y = 0.42;
  torso.scale.set(1, 1, 0.85);
  body.add(torso);

  const head = new THREE.Group();
  head.position.y = 0.86;
  body.add(head);
  const skull = new THREE.Mesh(geo('head', () => new THREE.SphereGeometry(0.31, 20, 16)), mat(o.skin));
  skull.scale.set(1.05, 0.95, 1);
  head.add(skull);

  const hair = new THREE.Mesh(
    geo('hair', () => new THREE.SphereGeometry(0.325, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    mat(o.hair),
  );
  hair.rotation.x = -0.25;
  hair.position.set(0, 0.02, -0.02);
  hair.scale.set(1.05, 0.95, 1);
  head.add(hair);

  // Face (faces +z).
  const eyeGeo = geo('eye', () => new THREE.SphereGeometry(0.045, 10, 8));
  const shineGeo = geo('shine', () => new THREE.SphereGeometry(0.014, 6, 4));
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, mat(0x2b2230));
    eye.position.set(0.11 * s, -0.02, 0.27);
    eye.scale.set(0.9, 1.25, 0.6);
    head.add(eye);
    const shine = new THREE.Mesh(shineGeo, mat(0xffffff));
    shine.position.set(0.11 * s + 0.015, 0.0, 0.3);
    head.add(shine);
    const cheek = new THREE.Mesh(geo('cheek', () => new THREE.CircleGeometry(0.045, 12)), mat(0xffb0a8));
    cheek.position.set(0.19 * s, -0.09, 0.255);
    cheek.rotation.y = 0.5 * s;
    head.add(cheek);
  }

  const limb = (g, color, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(g, mat(color));
    m.position.y = -0.1;
    pivot.add(m);
    body.add(pivot);
    return pivot;
  };
  const armGeo = geo('arm', () => new THREE.CapsuleGeometry(0.06, 0.12, 4, 8));
  const legGeo = geo('leg', () => new THREE.CapsuleGeometry(0.075, 0.1, 4, 8));
  const armL = limb(armGeo, o.shirt, -0.25, 0.52);
  const armR = limb(armGeo, o.shirt, 0.25, 0.52);
  const legL = limb(legGeo, o.pants, -0.1, 0.24);
  const legR = limb(legGeo, o.pants, 0.1, 0.24);
  for (const l of [legL, legR]) l.children[0].position.y = -0.1;

  // Soft round shadow blob (cheap and works without shadow maps).
  const blob = new THREE.Mesh(
    geo('blob', () => new THREE.CircleGeometry(0.32, 16).rotateX(-Math.PI / 2)),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  blob.position.y = 0.07;
  root.add(blob);

  // Accessories go in their own groups so they can move onto the model's bones.
  const headAcc = new THREE.Group(), bodyAcc = new THREE.Group();
  head.add(headAcc);
  body.add(bodyAcc);
  addAccessories(look, headAcc, torso, bodyAcc);

  root.traverse((m) => {
    if (m.isMesh && m !== blob) m.castShadow = true;
  });

  let phase = 0;
  let waveT = 0;
  let bike = null, tandem = null, car = null, riding = false;
  let act = null; // current body emote
  let model = null; // set once the pack model has loaded
  let held = null; // a cup or other thing in the right hand
  const attachHeld = () => {
    if (!held) return;
    if (model?.hand) {
      held.scale.setScalar(1.8 / model.scale); // inside the scaled model; 1.8x life size so it reads on chibi hands
      held.position.set(0, 0, 0);
      held.rotation.set(0, 0, 0);
      model.hand.add(held);
    } else {
      held.scale.setScalar(1.8);
      held.position.set(0, -0.24, 0.04);
      armR.add(held);
    }
  };
  attachModel(look, { root, body, headAcc, bodyAcc }).then((m) => { model = m; attachHeld(); });
  return {
    root,
    head,
    // Show a bike under the character. kind: 0/false none, 1/true bike,
    // 2 tandem (front seat), 3 back seat of someone else's tandem (pose only),
    // 4 car (driver's seat).
    setBike(on) {
      const kind = on === true ? 1 : on || 0;
      if (kind === 1 && !bike) { bike = makeBike(); root.add(bike); }
      if (kind === 2 && !tandem) { tandem = makeTandem(); root.add(tandem); }
      if (kind === 4 && !car) { car = makeCar(); root.add(car); }
      if (bike) bike.visible = kind === 1;
      if (tandem) tandem.visible = kind === 2;
      if (car) car.visible = kind === 4;
      riding = kind > 0;
    },
    // speed01: 0 idle … 1 running; sit: seated pose (on a café chair)
    animate(dt, speed01, sit = false) {
      if (model) {
        model.update(dt, speed01, sit, riding);
        if (held?.parent === model.hand) {
          // Keep the cup upright whatever the hand does: local = hand⁻¹ · body.
          root.updateWorldMatrix(false, true);
          model.hand.getWorldQuaternion(qHand);
          root.getWorldQuaternion(qRoot);
          held.quaternion.copy(qHand.invert().multiply(qRoot));
        }
        return;
      }
      if (!riding) body.position.z = 0;
      if (riding) {
        // Pedalling: legs turn with speed, hands on the handlebar.
        phase += dt * 9 * speed01;
        const k = Math.min(1, dt * 10);
        legL.rotation.x = -1.1 + Math.sin(phase) * 0.5;
        legR.rotation.x = -1.1 - Math.sin(phase) * 0.5;
        armL.rotation.x += (-1.1 - armL.rotation.x) * k;
        if (waveT <= 0) armR.rotation.x += (-1.1 - armR.rotation.x) * k;
        body.position.y += (0.42 - body.position.y) * k;
        body.position.z = -0.22;
      } else if (sit) {
        phase = 0;
        const k = Math.min(1, dt * 10);
        for (const l of [legL, legR]) l.rotation.x += (-1.45 - l.rotation.x) * k;
        armL.rotation.x += (-0.5 - armL.rotation.x) * k;
        if (waveT <= 0) armR.rotation.x += (-0.5 - armR.rotation.x) * k;
        body.position.y += (0.2 + Math.sin(performance.now() / 700) * 0.006 - body.position.y) * k;
      } else if (speed01 > 0.01) {
        // Long, bouncy strides: a slower step rate with a wider leg swing.
        phase += dt * (7.5 + 5.5 * speed01);
        const sw = Math.sin(phase) * (0.65 + 0.4 * speed01);
        legL.rotation.x = sw;
        legR.rotation.x = -sw;
        armL.rotation.x = -sw * 0.8;
        if (waveT <= 0) armR.rotation.x = sw * 0.8;
        body.position.y = Math.abs(Math.sin(phase)) * (0.05 + 0.04 * speed01);
      } else {
        phase = 0;
        for (const l of [legL, legR, armL]) l.rotation.x *= 0.8;
        if (waveT <= 0) armR.rotation.x *= 0.8;
        body.position.y = Math.sin(performance.now() / 600) * 0.012;
      }
      if (waveT > 0) {
        waveT -= dt;
        armR.rotation.x = 0;
        armR.rotation.z = 2.6 + Math.sin(waveT * 14) * 0.35;
        if (waveT <= 0) armR.rotation.z = 0;
      }
      if (act) {
        act.t += dt;
        const t = act.t, e = Math.sin(Math.PI * Math.min(1, t / act.dur)); // ease in and out
        const pose = POSES[act.name];
        if (t >= act.dur || (speed01 > 0.3 && !riding)) {
          act = null;
          armL.rotation.z = armR.rotation.z = 0;
          head.rotation.set(0, 0, 0);
          body.rotation.set(0, 0, 0);
        } else pose({ t, e, armL, armR, head, body });
      }
    },
    // Hold something in the right hand ('coffee'), or nothing (null).
    setHeld(kind) {
      if ((held?.name || null) === (kind ? 'held:' + kind : null)) return;
      held?.removeFromParent();
      held = kind ? makeHeld(kind) : null;
      attachHeld();
    },
    wave() {
      waveT = 1.6;
      model?.play('wave');
    },
    // Body emotes: bow, laugh, angry, shrug, cheer, clap, cry.
    play(name) {
      model?.play(name);
      if (name === 'wave') { waveT = 1.6; return; }
      if (!POSES[name]) return;
      act = { name, t: 0, dur: name === 'cry' ? 2.2 : 1.7 };
    },
  };
}

// Body emote poses: each sets limb angles for time t (s) with e = 0..1..0.
// Right arm: +z raises it outward; left arm: -z.
const POSES = {
  bow({ e, armL, armR, body }) { // 인사: a polite Korean bow
    body.rotation.x = 0.5 * e;
    armL.rotation.x = armR.rotation.x = 0.1;
  },
  laugh({ t, e, armL, armR, head, body }) {
    armL.rotation.x = armR.rotation.x = -0.7 * e;
    armL.rotation.z = -0.25 * e; armR.rotation.z = 0.25 * e;
    head.rotation.x = -0.3 * e;
    body.position.y += Math.abs(Math.sin(t * 18)) * 0.035 * e;
  },
  angry({ t, e, armL, armR, body }) {
    armL.rotation.x = armR.rotation.x = 0.35;
    armL.rotation.z = -0.6 * e; armR.rotation.z = 0.6 * e; // fists on hips
    body.rotation.z = Math.sin(t * 28) * 0.07 * e;
    body.position.y += Math.abs(Math.sin(t * 9)) * 0.04 * e; // stomp
  },
  shrug({ e, armL, armR, head, body }) { // 몰라요
    armL.rotation.x = armR.rotation.x = -0.5 * e;
    armL.rotation.z = -1.1 * e; armR.rotation.z = 1.1 * e;
    head.rotation.z = 0.28 * e;
    body.position.y += 0.03 * e;
  },
  cheer({ t, e, armL, armR, body }) {
    armL.rotation.x = armR.rotation.x = 0;
    armL.rotation.z = -(2.5 + Math.sin(t * 16) * 0.2) * e;
    armR.rotation.z = (2.5 + Math.sin(t * 16) * 0.2) * e;
    body.position.y += Math.abs(Math.sin(t * 9)) * 0.14 * e;
  },
  clap({ t, e, armL, armR }) {
    armL.rotation.x = armR.rotation.x = -1.3 * e;
    const c = (0.15 + Math.abs(Math.sin(t * 14)) * 0.35) * e;
    armL.rotation.z = c; armR.rotation.z = -c;
  },
  cry({ t, e, armL, armR, head, body }) {
    armL.rotation.x = armR.rotation.x = -2.3 * e; // hands to the eyes
    armL.rotation.z = 0.35 * e; armR.rotation.z = -0.35 * e;
    head.rotation.x = 0.3 * e;
    body.rotation.z = Math.sin(t * 20) * 0.03 * e;
  },
};

const patchMats = {};
function patchMat(id) {
  if (patchMats[id]) return patchMats[id];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fffaf0';
  g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e0604d'; g.lineWidth = 4; g.setLineDash([5, 4]);
  g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#e0604d';
  g.font = '800 34px "Noto Sans KR", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(PATCHES[id], 32, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (patchMats[id] = new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

const TEE_Y = 0.47, TEE_Z = 0.2;
const printMats = {};
function printMat(id) {
  if (printMats[id]) return printMats[id];
  const tex = new THREE.CanvasTexture(drawTeePrint(id, 256));
  tex.colorSpace = THREE.SRGBColorSpace;
  return (printMats[id] = new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

function addAccessories(look, head, torso, body) {
  // T-shirt print on the chest.
  if (TEE_PRINTS[look.tee]) {
    const print = new THREE.Mesh(geo('teePrint', () => new THREE.PlaneGeometry(0.36, 0.36)), printMat(look.tee));
    print.position.set(0, TEE_Y, TEE_Z);
    body.add(print);
  }
  const head1 = accessory('head', look.head);
  if (head1) {
    const m = mat(look.hatColor ? PALETTES.hat[look.hatColor] : head1.color);
    // Embroidered patch from the hat workshop, placed on the hat's front.
    const PATCH_AT = { bucket: [0, 0.3, 0.255, -0.25], cap: [0, 0.24, 0.29, -0.45], beanie: [0, 0.16, 0.325, -0.25], beret: [0.0, 0.25, 0.29, -0.6] };
    if (look.hatPatch && PATCH_AT[head1.id]) {
      const [px, py, pz, rx] = PATCH_AT[head1.id];
      const badge = new THREE.Mesh(geo('patch', () => new THREE.CircleGeometry(0.065, 18)), patchMat(look.hatPatch));
      badge.position.set(px, py, pz);
      badge.rotation.x = rx;
      head.add(badge);
    }
    if (head1.id === 'bucket') {
      const crown = new THREE.Mesh(geo('bucketCrown', () => new THREE.CylinderGeometry(0.22, 0.28, 0.16, 18)), m);
      crown.position.set(0, 0.3, -0.02);
      const brim = new THREE.Mesh(geo('bucketBrim', () => new THREE.CylinderGeometry(0.4, 0.4, 0.03, 22)), m);
      brim.position.set(0, 0.23, -0.02);
      head.add(crown, brim);
    } else if (head1.id === 'cap') {
      const crown = new THREE.Mesh(
        geo('capCrown', () => new THREE.SphereGeometry(0.33, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42)), m);
      crown.position.set(0, 0.05, -0.01);
      const bill = new THREE.Mesh(geo('capBill', () => new THREE.BoxGeometry(0.34, 0.025, 0.2)), m);
      bill.position.set(0, 0.17, 0.3);
      bill.rotation.x = 0.12;
      head.add(crown, bill);
    } else if (head1.id === 'ribbon') {
      const lobe = geo('ribbonLobe', () => new THREE.SphereGeometry(0.075, 10, 8));
      for (const sgn of [-1, 1]) {
        const l = new THREE.Mesh(lobe, m);
        l.scale.set(1.3, 0.9, 0.6);
        l.position.set(0.17 + 0.07 * sgn, 0.25, 0.06);
        head.add(l);
      }
      const knot = new THREE.Mesh(geo('ribbonKnot', () => new THREE.SphereGeometry(0.04, 8, 6)), m);
      knot.position.set(0.17, 0.25, 0.09);
      head.add(knot);
    } else if (head1.id === 'beret') {
      const top = new THREE.Mesh(geo('beret', () => new THREE.SphereGeometry(0.36, 18, 10)), m);
      top.scale.set(1, 0.32, 1);
      top.position.set(0.04, 0.26, -0.02);
      top.rotation.z = -0.18;
      const stalk = new THREE.Mesh(geo('beretStalk', () => new THREE.CylinderGeometry(0.015, 0.02, 0.06, 6)), m);
      stalk.position.set(0.02, 0.38, -0.02);
      head.add(top, stalk);
    } else if (head1.id === 'towel') {
      // 양머리: a towel band round the head with a rolled "sheep ear" each side.
      const cap = new THREE.Mesh(
        geo('towelCap', () => new THREE.SphereGeometry(0.35, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42)), m);
      cap.position.set(0, 0.04, -0.01);
      head.add(cap);
      for (const sgn of [-1, 1]) {
        const roll = new THREE.Mesh(geo('towelRoll', () => new THREE.CylinderGeometry(0.1, 0.1, 0.16, 14)), m);
        roll.rotation.z = Math.PI / 2;
        roll.position.set(sgn * 0.3, 0.24, -0.02);
        head.add(roll);
        const swirl = new THREE.Mesh(geo('towelSwirl', () => new THREE.CircleGeometry(0.07, 14)), mat(0xffffff));
        swirl.rotation.y = sgn * Math.PI / 2;
        swirl.position.set(sgn * 0.385, 0.24, -0.02);
        head.add(swirl);
      }
    } else if (head1.id === 'beanie') {
      const cap = new THREE.Mesh(
        geo('beanie', () => new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45)), m);
      cap.position.set(0, 0.04, -0.01);
      const pom = new THREE.Mesh(geo('pom', () => new THREE.SphereGeometry(0.07, 10, 8)), mat(0xfff8ec));
      pom.position.set(0, 0.37, -0.02);
      head.add(cap, pom);
    }
  }

  const face = accessory('face', look.face);
  if (face) {
    const frame = mat(face.color);
    const lens = face.id === 'sunglasses' ? frame
      : new THREE.MeshLambertMaterial({ color: 0xdff1f8, transparent: true, opacity: 0.35 });
    const ring = geo('lensRing', () => new THREE.TorusGeometry(0.075, 0.012, 6, 16));
    const disc = geo('lensDisc', () => new THREE.CircleGeometry(0.072, 16));
    for (const sgn of [-1, 1]) {
      const r = new THREE.Mesh(ring, frame);
      r.position.set(0.11 * sgn, -0.02, 0.305);
      const d = new THREE.Mesh(disc, lens);
      d.position.set(0.11 * sgn, -0.02, 0.303);
      head.add(r, d);
    }
    const bridge = new THREE.Mesh(geo('bridge', () => new THREE.BoxGeometry(0.07, 0.014, 0.014)), frame);
    bridge.position.set(0, -0.01, 0.31);
    head.add(bridge);
  }

  const neck = accessory('neck', look.neck);
  if (neck) {
    const m = mat(neck.color);
    const wrap = new THREE.Mesh(geo('scarf', () => new THREE.TorusGeometry(0.17, 0.06, 8, 18)), m);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.y = 0.6;
    const tail = new THREE.Mesh(geo('scarfTail', () => new THREE.BoxGeometry(0.09, 0.2, 0.05)), m);
    tail.position.set(0.08, 0.5, 0.2);
    tail.rotation.z = 0.15;
    body.add(wrap, tail);
  }

  const back = accessory('back', look.back);
  if (back) {
    const m = mat(back.color);
    if (back.id === 'backpack') {
      const pack = new THREE.Mesh(geo('pack', () => new THREE.CapsuleGeometry(0.14, 0.12, 4, 10)), m);
      pack.scale.set(1.1, 1, 0.7);
      pack.position.set(0, 0.45, -0.21);
      const pocket = new THREE.Mesh(geo('pocket', () => new THREE.BoxGeometry(0.16, 0.1, 0.05)), mat(0xfff8ec));
      pocket.position.set(0, 0.38, -0.3);
      body.add(pack, pocket);
    } else if (back.id === 'tote') {
      const bag = new THREE.Mesh(geo('tote', () => new THREE.BoxGeometry(0.22, 0.24, 0.07)), m);
      bag.position.set(0.27, 0.3, -0.02);
      const strap = new THREE.Mesh(geo('strap', () => new THREE.TorusGeometry(0.2, 0.012, 4, 20, Math.PI)), m);
      strap.position.set(0.22, 0.42, 0);
      strap.rotation.set(0, Math.PI / 2, -0.35);
      body.add(bag, strap);
    }
  }
}
