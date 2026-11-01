// Cute chibi (2-heads-tall) character built from simple rounded shapes.
// Used for the local player and for other players alike.
import * as THREE from 'three';

import { PALETTES, sanitizeLook, accessory } from '../data/appearance.js';

const geoCache = {};
const geo = (key, make) => (geoCache[key] ||= make());
const matCache = {};
const mat = (hex) => (matCache[hex] ||= new THREE.MeshLambertMaterial({ color: hex }));

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

  addAccessories(look, head, torso, body);

  root.traverse((m) => {
    if (m.isMesh && m !== blob) m.castShadow = true;
  });

  let phase = 0;
  let waveT = 0;
  return {
    root,
    head,
    // speed01: 0 idle … 1 running
    animate(dt, speed01) {
      if (speed01 > 0.01) {
        phase += dt * (8 + 6 * speed01);
        const sw = Math.sin(phase) * (0.5 + 0.4 * speed01);
        legL.rotation.x = sw;
        legR.rotation.x = -sw;
        armL.rotation.x = -sw * 0.8;
        if (waveT <= 0) armR.rotation.x = sw * 0.8;
        body.position.y = Math.abs(Math.sin(phase)) * 0.05;
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
    },
    wave() {
      waveT = 1.6;
    },
  };
}

function addAccessories(look, head, torso, body) {
  const head1 = accessory('head', look.head);
  if (head1) {
    const m = mat(head1.color);
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
