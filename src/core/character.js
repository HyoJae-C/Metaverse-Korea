// Characters for the local player, other players and NPCs. The body is a 3D
// model from the active model pack (src/data/characters). Nothing shows
// until the model is on (a quick swap from a stand-in looked like a bug). The
// chibi built below from simple rounded shapes is never shown: its head and
// body only measure where hats, glasses and bags go before they move onto
// the model's bones.
import * as THREE from 'three';
import { makeTandem, makeCar, makeLimo, makeMoto, makeHelmet, makeZooCart } from './bikes.js';
import { attachModel } from './model-pack.js';
import { makeRide, makeSkate1, SKATE_LIFT, RIDE_CLEAR } from './rides.js';
import { rideCode } from './bike-garage.js';
import { makeHeld, makeUmbrella } from './held.js';
import { makeHeadphones } from './headphones.js';

import { PALETTES, PATCHES, sanitizeLook, accessory, shapeOf } from '../data/appearance.js';
import { skirtById } from '../data/skirts.js';
import { TEE_PRINTS, drawTeePrint } from './tee-prints.js';
import { makeEars, makePaw } from './animal-wear.js';

const geoCache = {};
const geo = (key, make) => (geoCache[key] ||= make());
const matCache = {};
const mat = (hex) => (matCache[hex] ||= new THREE.MeshLambertMaterial({ color: hex }));

const TUBE_COLORS = [0xff6b6b, 0xffd93d, 0x4fc3f7, 0xff9bb3];
const FOOT_Y = 0.08; // the foot bone's height above the sole, standing
const qHand = new THREE.Quaternion(), qRoot = new THREE.Quaternion();
export function createCharacter(rawLook) {
  const look = sanitizeLook(rawLook);
  const o = {
    shirt: PALETTES.shirt[look.shirt], pants: skirtById(look.skirt)?.color ?? PALETTES.pants[look.pants],
    hair: PALETTES.hair[look.hair], skin: PALETTES.skin[look.skin],
  };
  const root = new THREE.Group();
  root.userData.noSnow = true; // (core/snow-cover.js: no snow on people)
  root.userData.person = true; // (core/far-people.js: not drawn when far away)
  // Everything but the shadow hangs on the rig, so a trick (a spin, a flip,
  // a jump) can turn the rider and the ride together without changing
  // which way the character is heading (root's rotation).
  const rig = new THREE.Group();
  rig.rotation.order = 'YXZ'; // spin round the vertical first, then flip
  root.add(rig);
  const body = new THREE.Group(); // bobs while walking
  rig.add(body);

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
  // Hidden until the model is on.
  body.visible = false;
  blob.visible = false;

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
  let bike = null, tandem = null, car = null, limo = null, cart = null, moto = null, helmet = null, riding = false;
  let bikeCode = null; // rideCode of the ride drawn
  let skates = null; // inline skates, one under each foot
  let rideKind = true; // 'board' (skateboard), 'kick' (scooter), 'skates' or true (bike)
  const _fv = new THREE.Vector3();
  let act = null; // current body emote
  let activityName = null; // looping pose: gym, fishing, dancing
  let movesFn = null; // a scripted move (basketball shots): () => bone offsets, see setMoves
  let model = null; // set once the pack model has loaded
  let held = null; // a cup or other thing in the right hand
  let openBook = null; // the book lying open on the table while reading
  let umbrella = null; // open umbrella over the head
  let tube = null; // a swim ring (the pool)
  let phones = null; // headphones at the record café's listening bar
  const footProps = []; // waiting for the model (addFootProps)
  const attachHeld = () => {
    if (!held) return;
    if (held.userData.onHead) { // (a balloon crown: worn, not held)
      held.scale.setScalar(1);
      headAcc.add(held);
      return;
    }
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
  // A costume head (the guide's mascot) replaces the face, hair and hats.
  let mascot = null;
  const wearMascot = () => {
    if (!mascot) return;
    for (const c of head.children) if (c !== headAcc) c.visible = false;
    for (const c of headAcc.children) c.visible = c === mascot;
    if (model?.headMesh) model.headMesh.visible = false;
    if (model?.headBone) for (const c of model.headBone.children) if (!c.isBone && c !== headAcc) c.visible = false;
  };
  // A failed download is tried again a few times (while the character is
  // still in a scene); the chibi itself never shows.
  const RETRY = [2, 5, 10, 20, 40];
  const tryModel = (n = 0) => attachModel(look, { root: rig, body, headAcc, bodyAcc }).catch(() => null).then((m) => {
    if (!m) {
      if (n < RETRY.length) setTimeout(() => { if (root.parent) tryModel(n + 1); }, RETRY[n] * 1000);
      return;
    }
    model = m; blob.visible = true;
    for (const f of footProps.splice(0)) f(m);
    addGloves(look, m);
    m.setActivity(activityName); m.setMoves?.(movesFn); attachHeld(); wearMascot();
  });
  tryModel();
  return {
    root,
    head,
    // Put on a costume head (a THREE.Group in chibi head units).
    setMascot(g) { mascot?.removeFromParent(); mascot = g; headAcc.add(g); wearMascot(); },
    // A costume piece on the head or body (NPC costumes), in the chibi's units
    // like the accessories: 'head' (~0.65 m wide, centred) or 'body' (0 at the
    // feet, shoulders at ~0.66).
    addProp(where, g) { (where === 'body' ? bodyAcc : headAcc).add(g); },
    // Something on each foot (the diver's fins): make(i) builds foot i's piece
    // (0 left, 1 right) in metres, toes along +z. It goes onto the foot bones
    // once the model has loaded.
    addFootProps(make) {
      const put = (m) => m?.feet?.forEach((f, i) => { if (!f) return; const p = make(i); p.scale.multiplyScalar(1 / m.scale); f.add(p); });
      if (model) put(model); else footProps.push(put);
    },
    // Show a bike under the character. kind: 0/false none, 1/true bike,
    // 2 tandem (front seat), 3 back seat of someone else's tandem (pose only),
    // 4 open sports car (driver's seat), 5 motorbike (with a helmet),
    // 6 limousine (driver's seat), 7 the zoo cart (driver's seat). spec: for kind 1, the ride from the bike
    // shop { type, tier, color, pattern } (a plain colour string means a
    // basic bike in that colour).
    // inCar: a passenger seat in someone's car (sit upright, not leaning).
    setBike(on, spec, inCar = false) {
      const kind = on === true ? 1 : on || 0;
      if (kind === 1) {
        const r = spec && typeof spec === 'object' ? spec : { type: 'bike', tier: 0, color: spec || '#3fb59a', pattern: null };
        const code = rideCode(r);
        if (bike && code !== bikeCode) {
          bike.removeFromParent(); bike = null;
          for (const sk of skates || []) sk.removeFromParent();
          skates = null;
        }
        if (!bike) {
          bike = makeRide(r);
          bikeCode = code;
          rig.add(bike);
          rideKind = ['board', 'kick', 'skates'].includes(bike.userData.pose) ? bike.userData.pose : true;
          if (rideKind === 'skates') { skates = [makeSkate1(r), makeSkate1(r)]; for (const sk of skates) { sk.scale.setScalar(1.35); rig.add(sk); } }
        }
      }
      if (kind === 2 && !tandem) { tandem = makeTandem(); rig.add(tandem); }
      if (kind === 4 && !car) { car = makeCar(); rig.add(car); }
      if (kind === 6 && !limo) { limo = makeLimo(); rig.add(limo); }
      if (kind === 7 && !cart) { cart = makeZooCart(); rig.add(cart); }
      if (kind === 5 && !moto) { moto = makeMoto(); rig.add(moto); }
      if (kind === 5 && !helmet) { helmet = makeHelmet(); headAcc.add(helmet); }
      if (bike) bike.visible = kind === 1;
      for (const sk of skates || []) sk.visible = kind === 1;
      if (kind === 1 && (rideKind === 'board' || rideKind === 'kick')) model?.setBoardHeight?.(bike.userData.stand);
      if (tandem) tandem.visible = kind === 2;
      if (car) car.visible = kind === 4;
      if (limo) limo.visible = kind === 6;
      if (cart) cart.visible = kind === 7;
      if (moto) moto.visible = kind === 5;
      // The helmet replaces any hat while riding the motorbike.
      for (const c of headAcc.children) c.visible = kind === 5 ? c === helmet : c !== helmet;
      // Pose: leaning over handlebars on bikes; upright with arms to the
      // wheel in a car; upright and relaxed as a car passenger.
      riding = !kind ? false : kind === 4 || kind === 6 || kind === 7 ? 'car' : kind === 3 && inCar ? 'seat' : kind === 1 ? rideKind : true;
    },
    // A trick in the skate park (core/skatepark.js trickPose): spin, flip
    // and roll turn rider and ride together; rideRoll / rideSpin turn only
    // the board, bike or scooter (kickflips, tail whips); tuck crouches.
    // air: how high above the ground we are (the shadow stays down there).
    setTrick(pose, air = 0) {
      const P = pose || {};
      // Turn about the middle of the body, not the feet.
      const cy = 0.5;
      rig.rotation.set(P.flip || 0, P.spin || 0, P.roll || 0);
      const q = rig.quaternion;
      _fv.set(0, cy, 0).applyQuaternion(q);
      rig.position.set(-_fv.x, cy - _fv.y - (P.tuck || 0) * 0.08, -_fv.z);
      if (bike) {
        // The board or bike turns about its own middle (just under the
        // feet), lifted a little while it flips.
        bike.rotation.set(0, P.rideSpin || 0, P.rideRoll || 0);
        const by = bike.userData.stand || 0.4;
        _fv.set(0, by, 0).applyEuler(bike.rotation);
        const lift = P.rideRoll ? Math.abs(Math.sin(P.rideRoll / 2)) * 0.2 : (P.tuck || 0) * 0.05;
        bike.position.set(-_fv.x, by - _fv.y + lift, -_fv.z);
      }
      blob.position.y = 0.07 - Math.max(0, air);
      blob.scale.setScalar(Math.max(0.45, 1 - air * 0.25));
    },
    // speed01: 0 idle … 1 running; sit: seated pose (on a café chair)
    animate(dt, speed01, sit = false) {
      if (model) {
        if ((riding === 'board' || riding === 'kick') && bike) model.setBoardHeight?.(bike.userData.stand);
        model.update(dt, speed01, sit, riding);
        if (skates && riding === 'skates' && model.feet[0]) {
          // Each skate follows its foot (in the body's frame, facing forward).
          rig.updateWorldMatrix(true, true);
          model.feet.forEach((f, i) => {
            if (!f || !skates[i]) return;
            rig.worldToLocal(f.getWorldPosition(_fv));
            skates[i].position.set(_fv.x, Math.max(RIDE_CLEAR, _fv.y - FOOT_Y - SKATE_LIFT), _fv.z);
          });
        }
        if (held?.parent === model.hand) {
          // Keep the cup upright whatever the hand does: local = hand⁻¹ · body.
          rig.updateWorldMatrix(true, true);
          model.hand.getWorldQuaternion(qHand);
          rig.getWorldQuaternion(qRoot);
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
    // An open umbrella over the head (rainy days), or none.
    setUmbrella(on) {
      if (!!umbrella === !!on) return;
      if (on) {
        umbrella = makeUmbrella();
        umbrella.position.set(0.16, 0.62, 0.05);
        umbrella.rotation.z = -0.08;
        rig.add(umbrella);
      } else { umbrella.removeFromParent(); umbrella = null; }
    },
    // Hold something in the right hand ('coffee'), or nothing (null).
    setHeld(kind) {
      if ((held?.name || null) === (kind ? 'held:' + kind : null)) return;
      held?.removeFromParent();
      held = kind ? makeHeld(kind) : null;
      attachHeld();
    },
    // The held thing's 3D object (the fishing rig moves the rod's parts).
    get heldObject() { return held; },
    wave() {
      waveT = 1.6;
      model?.play('wave');
    },
    // A looping activity pose (gym, fishing, 'dance'), or null.
    activity(name) {
      if (name === activityName) return;
      activityName = name;
      model?.setActivity(name);
      // Reading: the book goes from the hand onto the table in front, open.
      if (held) held.visible = name !== 'read';
      if (name === 'read' && !openBook) { openBook = makeOpenBook(); openBook.position.set(0, 0.665, 0.42); rig.add(openBook); }
      if (openBook) openBook.visible = name === 'read';
      // Floating in a tube (Olympic Park Pool): a ring round the waist.
      if (name === 'tube' && !tube) {
        tube = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.15, 10, 22).rotateX(Math.PI / 2), mat(TUBE_COLORS[Math.floor(Math.random() * TUBE_COLORS.length)]));
        tube.position.set(0, 0.64, 0.12);
        rig.add(tube);
      }
      if (tube) tube.visible = name === 'tube';
      // Listening at the record café: headphones over the ears (on the head,
      // so they follow the nod).
      if (name === 'listen' && !phones) { phones = makeHeadphones(); const wrap = new THREE.Group(); wrap.add(phones); headAcc.add(wrap); } // (wrapped: setBike shows and hides headAcc's children)
      if (phones) phones.visible = name === 'listen';
    },
    get activityName() { return activityName; },
    // A scripted move: fn() returns bone offsets each frame (armL, armR,
    // foreL, foreR, spine, head, legL, legR, kneeL, kneeR, in radians, as
    // the dances use), laid over the idle or running clip. null stops it.
    // Used for basketball shots (core/basketball-game.js shotMove).
    setMoves(fn) { movesFn = fn || null; model?.setMoves?.(movesFn); },
    // Wind in the hair (the roller coaster): k 0 still .. 1 full speed.
    setWind(k) {
      if (model) { model.setWind?.(k); return; }
      hair.rotation.x = -0.25 - k * 0.3 + Math.sin(performance.now() / 25) * 0.04 * k;
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

// An open book lying flat: two pages and a cover, about 30 cm across.
function makeOpenBook() {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.012, 0.22), new THREE.MeshLambertMaterial({ color: '#7a4b8c' }));
  g.add(cover);
  const paper = new THREE.MeshLambertMaterial({ color: '#fbf6ea' });
  for (const sgn of [-1, 1]) {
    const page = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.016, 0.2), paper);
    page.position.set(sgn * 0.075, 0.012, 0);
    page.rotation.z = -sgn * 0.08; // pages rising towards the spine
    g.add(page);
  }
  return g;
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

// The engraving on a pendant tag: the Hangul large, its hanja small under
// it, polished bright, cut round in dark, on a slightly darker silver or gold
// face (a light rim and a soft glow) (data/appearance.js PENDANT_CHARMS).
const engraveMats = {};
function engraveMat(hanja, letter, color) {
  const key = hanja + letter + color;
  if (engraveMats[key]) return engraveMats[key];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const metal = new THREE.Color(color);
  const hex = (k) => '#' + metal.clone().multiplyScalar(k).getHexString();
  const shine = '#' + metal.clone().lerp(new THREE.Color(0xffffff), 0.7).getHexString();
  const face = g.createRadialGradient(46, 40, 6, 64, 64, 64);
  face.addColorStop(0, hex(0.5)); face.addColorStop(1, hex(0.26)); // (linear values: still silver or gold, a shade below the word)
  g.fillStyle = face;
  g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
  g.strokeStyle = shine; g.lineWidth = 5;
  g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = shine; g.shadowBlur = 8;
  g.fillStyle = shine;
  g.strokeStyle = hex(0.06); g.lineJoin = 'round'; // a dark cut round each stroke, so the word reads on the metal
  g.font = '800 60px "Noto Sans KR", system-ui, sans-serif';
  g.lineWidth = 6; g.strokeText(letter, 64, 54); g.fillText(letter, 64, 54);
  g.font = '700 24px "Noto Serif KR", "Noto Sans KR", serif';
  g.lineWidth = 4; g.strokeText(hanja, 64, 102); g.fillText(hanja, 64, 102);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return (engraveMats[key] = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
}

const TEE_Y = 0.47, TEE_Z = 0.2;
const printMats = {};
function printMat(id) {
  if (printMats[id]) return printMats[id];
  const tex = new THREE.CanvasTexture(drawTeePrint(id, 256));
  tex.colorSpace = THREE.SRGBColorSpace;
  return (printMats[id] = new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

// Where earrings hang on the chibi head (head-local, the face looks down +z).
const EAR_X = 0.26, EAR_Y = -0.14, EAR_Z = -0.02;
// Glasses sit this far in front of the head's centre.
const GLASS_Z = 0.27;
// A small flat charm (star, heart) or a round cherry, about 5 cm across.
function charmGeometry(kind) {
  if (kind === 'cherry') return new THREE.SphereGeometry(0.028, 10, 8);
  const sh = new THREE.Shape();
  if (kind === 'star') {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.012 : 0.03, a = Math.PI / 2 + (i * Math.PI) / 5;
      i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else { // heart
    sh.moveTo(0, -0.028);
    sh.bezierCurveTo(-0.04, 0, -0.022, 0.03, 0, 0.012);
    sh.bezierCurveTo(0.022, 0.03, 0.04, 0, 0, -0.028);
  }
  return new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false }).translate(0, 0, -0.005);
}

// A pendant's charm, about 7 cm across, facing +z: a crescent moon, a plum
// blossom (five petals), a heart, a star, a butterfly or a round tag engraved with a word (Hangul, hanja under it).
const TAG_R = 0.034;
function pendantGeometry(kind) {
  const sh = new THREE.Shape();
  if (kind === 'moon') {
    sh.absarc(0, 0, 0.036, Math.PI * 0.35, Math.PI * 1.65, false);
    sh.absarc(0.016, 0, 0.028, Math.PI * 1.55, Math.PI * 0.45, true);
  } else if (kind === 'plum') {
    for (let i = 0; i <= 60; i++) { // five round petals: r(θ) = a + b |cos(5θ/2)|
      const a = (i / 60) * Math.PI * 2 + Math.PI / 2, r = 0.02 + 0.016 * Math.abs(Math.cos((5 * (a - Math.PI / 2)) / 2));
      i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (kind === 'heart') {
    sh.moveTo(0, -0.034);
    sh.bezierCurveTo(-0.048, 0, -0.026, 0.036, 0, 0.015);
    sh.bezierCurveTo(0.026, 0.036, 0.048, 0, 0, -0.034);
  } else if (kind === 'star') {
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.015 : 0.037, a = Math.PI / 2 + (i * Math.PI) / 5;
      i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (kind === 'butterfly') { // four wings round a slim body
    const wings = [[0.018, 0.012, 0.019, 0.015, 0.5], [0.014, -0.014, 0.013, 0.01, -0.5]].flatMap(([x, y, rx, ry, rot]) => [-1, 1].map((sx) => {
      const w = new THREE.Shape();
      w.absellipse(sx * x, y, rx, ry, 0, Math.PI * 2, false, sx * rot);
      return w;
    }));
    sh.absellipse(0, 0, 0.004, 0.022, 0, Math.PI * 2, false, 0);
    return new THREE.ExtrudeGeometry([sh, ...wings], { depth: 0.012, bevelEnabled: false }).translate(0, 0, -0.006);
  } else { // a round tag; the engraving is drawn on it (engraveMat)
    sh.absarc(0, 0, TAG_R, 0, Math.PI * 2, false);
  }
  return new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }).translate(0, 0, -0.006);
}

// The hat (look.head) on a chibi head group: the hat workshop's shapes in
// the chosen colour with its patch, or a shop hat in its own colour.
function addHat(look, head) {
  const head1 = accessory('head', look.head);
  if (head1) {
    // Hat workshop hats (no shape: the plain ids) take the chosen colour and
    // patch; a shop hat keeps its own colour.
    const made = !head1.shape;
    const m = mat(made && look.hatColor ? PALETTES.hat[look.hatColor] : head1.color);
    const hat = shapeOf(head1);
    // Embroidered patch from the hat workshop, placed on the hat's front.
    const PATCH_AT = { bucket: [0, 0.3, 0.255, -0.25], cap: [0, 0.24, 0.29, -0.45], beanie: [0, 0.16, 0.325, -0.25], beret: [0.0, 0.25, 0.29, -0.6] };
    if (made && look.hatPatch && PATCH_AT[hat]) {
      const [px, py, pz, rx] = PATCH_AT[hat];
      const badge = new THREE.Mesh(geo('patch', () => new THREE.CircleGeometry(0.065, 18)), patchMat(look.hatPatch));
      badge.position.set(px, py, pz);
      badge.rotation.x = rx;
      head.add(badge);
    }
    if (hat === 'bucket') {
      const crown = new THREE.Mesh(geo('bucketCrown', () => new THREE.CylinderGeometry(0.22, 0.28, 0.16, 18)), m);
      crown.position.set(0, 0.3, -0.02);
      const brim = new THREE.Mesh(geo('bucketBrim', () => new THREE.CylinderGeometry(0.4, 0.4, 0.03, 22)), m);
      brim.position.set(0, 0.23, -0.02);
      head.add(crown, brim);
    } else if (hat === 'cap') {
      const crown = new THREE.Mesh(
        geo('capCrown', () => new THREE.SphereGeometry(0.33, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42)), m);
      crown.position.set(0, 0.05, -0.01);
      const bill = new THREE.Mesh(geo('capBill', () => new THREE.BoxGeometry(0.34, 0.025, 0.2)), m);
      bill.position.set(0, 0.17, 0.3);
      bill.rotation.x = 0.12;
      head.add(crown, bill);
    } else if (hat === 'ribbon') {
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
    } else if (hat === 'beret') {
      const top = new THREE.Mesh(geo('beret', () => new THREE.SphereGeometry(0.36, 18, 10)), m);
      top.scale.set(1, 0.32, 1);
      top.position.set(0.04, 0.26, -0.02);
      top.rotation.z = -0.18;
      const stalk = new THREE.Mesh(geo('beretStalk', () => new THREE.CylinderGeometry(0.015, 0.02, 0.06, 6)), m);
      stalk.position.set(0.02, 0.38, -0.02);
      head.add(top, stalk);
    } else if (hat === 'towel') {
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
    } else if (hat === 'ears') {
      head.add(makeEars(head1));
    } else if (hat === 'beanie') {
      const cap = new THREE.Mesh(
        geo('beanie', () => new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45)), m);
      cap.position.set(0, 0.04, -0.01);
      const pom = new THREE.Mesh(geo('pom', () => new THREE.SphereGeometry(0.07, 10, 8)), mat(0xfff8ec));
      pom.position.set(0, 0.37, -0.02);
      head.add(cap, pom);
    }
  }

}

// Gloves (look.hand) onto the model's hand bones, sized in metres.
const PAW_DROP = 0.075; // metres from the wrist bone to the mitten's middle
function addGloves(look, m) {
  const glove = accessory('hand', look.hand);
  if (!glove || !m.hands) return;
  for (const [i, h] of m.hands.entries()) {
    if (!h) continue;
    const p = makePaw(glove);
    p.scale.multiplyScalar(1 / m.scale);
    // The hand bone runs down the hand (+y to the fingers) with +z out of
    // the back of the hand: turned round so the pads are on the palm, and
    // slid down off the wrist to cover the fingers.
    p.rotation.y = Math.PI;
    p.position.y = PAW_DROP / m.scale;
    if (i === 0) p.scale.x *= -1; // (the left hand: mirrored)
    p.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    h.add(p);
  }
}

// Just the hat, on its own, sized for a chibi head (radius about 0.33) and
// centred where that head's centre would be: a snowman wears one
// (game/snowman.js). Empty when look.head isn't a hat.
export function hatModel(look) {
  const g = new THREE.Group();
  addHat(sanitizeLook(look), g);
  return g;
}

function addAccessories(look, head, torso, body) {
  // T-shirt print on the chest.
  if (TEE_PRINTS[look.tee]) {
    const print = new THREE.Mesh(geo('teePrint', () => new THREE.PlaneGeometry(0.36, 0.36)), printMat(look.tee));
    print.position.set(0, TEE_Y, TEE_Z);
    body.add(print);
  }
  addHat(look, head);

  const face = accessory('face', look.face);
  if (face) {
    const frame = mat(face.color);
    const sun = shapeOf(face) === 'sunglasses';
    const lens = sun && face.lens != null
      ? new THREE.MeshLambertMaterial({ color: face.lens, transparent: true, opacity: face.tint ?? 0.85 })
      : sun ? frame
        : new THREE.MeshLambertMaterial({ color: 0xdff1f8, transparent: true, opacity: 0.35 });
    const ring = geo('lensRing', () => new THREE.TorusGeometry(0.075, 0.012, 6, 16));
    const disc = geo('lensDisc', () => new THREE.CircleGeometry(0.072, 16));
    for (const sgn of [-1, 1]) {
      const r = new THREE.Mesh(ring, frame);
      r.position.set(0.11 * sgn, -0.02, GLASS_Z + 0.002);
      const d = new THREE.Mesh(disc, lens);
      d.position.set(0.11 * sgn, -0.02, GLASS_Z);
      head.add(r, d);
    }
    const bridge = new THREE.Mesh(geo('bridge', () => new THREE.BoxGeometry(0.07, 0.014, 0.014)), frame);
    bridge.position.set(0, -0.01, GLASS_Z + 0.007);
    head.add(bridge);
  }

  // Earrings: one on each ear, hanging just below the lobe.
  const ear = accessory('ear', look.ear);
  if (ear) {
    const m = mat(ear.color);
    const kind = shapeOf(ear);
    for (const sgn of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(EAR_X * sgn, EAR_Y, EAR_Z);
      g.rotation.y = sgn * Math.PI / 2; // face outwards
      const stud = new THREE.Mesh(geo('earStud', () => new THREE.SphereGeometry(0.022, 8, 6)), m);
      g.add(stud);
      if (kind === 'hoops') {
        const hoop = new THREE.Mesh(geo('earHoop', () => new THREE.TorusGeometry(0.045, 0.009, 6, 18)), m);
        hoop.position.y = -0.045;
        g.add(hoop);
      } else if (kind === 'star' || kind === 'heart' || kind === 'cherry') {
        const drop = new THREE.Mesh(geo('earDrop', () => new THREE.CylinderGeometry(0.004, 0.004, 0.05, 4)), mat(kind === 'cherry' ? 0x3f7a3a : 0xe8b84a));
        drop.position.y = -0.03;
        const charm = new THREE.Mesh(geo('earCharm:' + kind, () => charmGeometry(kind)), m);
        charm.position.y = -0.07;
        g.add(drop, charm);
      } else stud.scale.setScalar(1.25); // pearl studs
      head.add(g);
    }
  }

  const neck = accessory('neck', look.neck);
  if (neck && shapeOf(neck) === 'pendant') {
    // A fine chain round the neck and a charm on the chest.
    const m = mat(neck.color);
    const chain = new THREE.Mesh(geo('pendantChain', () => new THREE.TorusGeometry(0.155, 0.012, 5, 24)), m);
    chain.rotation.x = Math.PI / 2 - 0.35;
    chain.position.set(0, 0.6, 0.03);
    const charm = new THREE.Mesh(geo('pendant:' + neck.charm, () => pendantGeometry(neck.charm)), m);
    charm.position.set(0, 0.5, 0.2);
    charm.rotation.x = -0.15;
    charm.scale.setScalar(neck.hanja ? 1.8 : 1.5); // an engraved tag a little bigger, to read the word
    if (neck.hanja) { // the engraved word on the tag's face
      const face = new THREE.Mesh(geo('pendantFace', () => new THREE.CircleGeometry(TAG_R, 24)), engraveMat(neck.hanja, neck.letter, neck.color));
      face.position.z = 0.0065;
      charm.add(face);
    }
    body.add(chain, charm);
  } else if (neck) {
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
    if (shapeOf(back) === 'backpack') {
      const pack = new THREE.Mesh(geo('pack', () => new THREE.CapsuleGeometry(0.14, 0.12, 4, 10)), m);
      pack.scale.set(1.1, 1, 0.7);
      pack.position.set(0, 0.45, -0.21);
      const pocket = new THREE.Mesh(geo('pocket', () => new THREE.BoxGeometry(0.16, 0.1, 0.05)), mat(0xfff8ec));
      pocket.position.set(0, 0.38, -0.3);
      body.add(pack, pocket);
    } else if (shapeOf(back) === 'tote') {
      const bag = new THREE.Mesh(geo('tote', () => new THREE.BoxGeometry(0.22, 0.24, 0.07)), m);
      bag.position.set(0.27, 0.3, -0.02);
      const strap = new THREE.Mesh(geo('strap', () => new THREE.TorusGeometry(0.2, 0.012, 4, 20, Math.PI)), m);
      strap.position.set(0.22, 0.42, 0);
      strap.rotation.set(0, Math.PI / 2, -0.35);
      body.add(bag, strap);
    }
  }
}
