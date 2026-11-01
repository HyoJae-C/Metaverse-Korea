// Cute chibi (2-heads-tall) character built from simple rounded shapes.
// Used for the local player and for other players alike.
import * as THREE from 'three';

export const OUTFITS = [
  { shirt: 0xff9b85, pants: 0x5b6c8f, hair: 0x4a3328, hat: null },
  { shirt: 0x8fd3c7, pants: 0x6b5b4e, hair: 0x2b2420, hat: 0xffd36e },
  { shirt: 0xffd36e, pants: 0x4f7a5a, hair: 0x7a4a2e, hat: null },
  { shirt: 0xb9a6f0, pants: 0x3f4a63, hair: 0x1f1b1a, hat: 0xff9bb3 },
  { shirt: 0xa6d97a, pants: 0x7a5c4a, hair: 0xc98b4f, hat: null },
  { shirt: 0x86b8f0, pants: 0x55505e, hair: 0x3a2a22, hat: 0xffffff },
  { shirt: 0xffb3c7, pants: 0x4b5d73, hair: 0x5c3b2a, hat: null },
  { shirt: 0xf6f1e7, pants: 0x34495e, hair: 0x2e2a28, hat: 0x8fd3c7 },
];

const SKIN = 0xffe0c7;
const geoCache = {};
const geo = (key, make) => (geoCache[key] ||= make());
const matCache = {};
const mat = (hex) => (matCache[hex] ||= new THREE.MeshLambertMaterial({ color: hex }));

export function createCharacter(outfitIndex = 0) {
  const o = OUTFITS[((outfitIndex % OUTFITS.length) + OUTFITS.length) % OUTFITS.length];
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
  const skull = new THREE.Mesh(geo('head', () => new THREE.SphereGeometry(0.31, 20, 16)), mat(SKIN));
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

  if (o.hat) {
    const hat = new THREE.Mesh(geo('hat', () => new THREE.CylinderGeometry(0.2, 0.26, 0.14, 16)), mat(o.hat));
    hat.position.set(0, 0.3, -0.02);
    head.add(hat);
    const brim = new THREE.Mesh(geo('brim', () => new THREE.CylinderGeometry(0.36, 0.36, 0.03, 20)), mat(o.hat));
    brim.position.set(0, 0.24, -0.02);
    head.add(brim);
  }

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
