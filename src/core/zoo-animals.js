// Zoo animals for Children's Grand Park (core/zoo.js): low-poly and chibi,
// like the café pets (core/pets.js), but sized against the player (about
// 1.4 m tall). Front is +z. Each returns
//   { root, body, head, tail, legs, wings?, fan? }
// so the zoo can walk, sit and nod them all the same way.
import * as THREE from 'three';
import { matCache } from './three-kit.js';

const mat = matCache();
const sphere = (r, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h);
const cyl = (r1, r2, h, n = 7) => new THREE.CylinderGeometry(r1, r2, h, n);

function part(g, geo, color, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}
function shadow(root, r) {
  const blob = new THREE.Mesh(new THREE.CircleGeometry(r, 14).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15, depthWrite: false }));
  blob.position.y = 0.01;
  root.add(blob);
}
function eyes(head, x, y, z, r = 0.025) {
  for (const s of [-1, 1]) part(head, sphere(r, 6, 6), '#231d20', x * s, y, z);
}
function start() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  root.userData.noSnow = true;
  return { root, body };
}

// Rabbit: a round body, long ears, a cotton tail; hops instead of walking.
function rabbit(c) {
  const { root, body } = start();
  part(body, sphere(0.15), c.color, 0, 0.15, 0, 1, 0.9, 1.25);
  const head = new THREE.Group();
  head.position.set(0, 0.27, 0.15);
  body.add(head);
  part(head, sphere(0.1), c.color, 0, 0, 0, 1, 0.95, 1);
  for (const s of [-1, 1]) {
    const ear = part(head, sphere(0.04, 8, 6), c.color, 0.045 * s, 0.13, -0.02, 0.6, 2.3, 0.45);
    ear.rotation.z = -0.15 * s;
    part(head, sphere(0.025, 6, 6), c.accent, 0.045 * s, 0.13, 0.0, 0.35, 1.7, 0.2); // pink inside
  }
  eyes(head, 0.05, 0.02, 0.08, 0.018);
  part(head, sphere(0.015, 6, 6), '#e39aa6', 0, -0.02, 0.1); // nose
  const legs = [];
  for (const [x, z] of [[-0.06, 0.12], [0.06, 0.12], [-0.08, -0.08], [0.08, -0.08]]) legs.push(part(body, sphere(0.04, 6, 6), c.color, x, 0.03, z, 1, 0.7, 1.5));
  const tail = new THREE.Group();
  tail.position.set(0, 0.17, -0.19);
  body.add(tail);
  part(tail, sphere(0.045, 8, 6), '#ffffff', 0, 0, 0);
  shadow(root, 0.2);
  return { root, body, head, tail, legs, hop: true };
}

// Guinea pig: much bigger than a hamster, a long loaf with no tail, little
// petal ears, a blunt nose and two-colour patches.
function guineapig(c) {
  const { root, body } = start();
  part(body, sphere(0.16), c.color, 0, 0.14, 0, 1.05, 0.82, 1.7);
  part(body, sphere(0.12), c.accent, 0.05, 0.17, -0.1, 1, 0.75, 1.3); // patch
  part(body, sphere(0.1), c.accent, -0.06, 0.16, 0.12, 0.9, 0.7, 1); // second patch
  const head = new THREE.Group();
  head.position.set(0, 0.17, 0.27);
  body.add(head);
  part(head, sphere(0.12), c.color, 0, 0, 0, 1.05, 0.9, 1.05);
  part(head, sphere(0.07), c.accent, 0, -0.02, 0.07, 1.2, 0.9, 0.9); // blaze down the face
  for (const s of [-1, 1]) part(head, sphere(0.04, 8, 6), '#e8b4a6', 0.09 * s, 0.08, -0.02, 1, 0.5, 0.8); // petal ears
  eyes(head, 0.07, 0.03, 0.08, 0.02);
  part(head, sphere(0.018, 6, 6), '#8a5a52', 0, -0.03, 0.13); // nose
  const legs = [];
  for (const [x, z] of [[-0.08, 0.17], [0.08, 0.17], [-0.08, -0.17], [0.08, -0.17]]) legs.push(part(body, cyl(0.025, 0.03, 0.06, 6), c.color, x, 0.03, z));
  shadow(root, 0.3);
  return { root, body, head, tail: new THREE.Group(), legs };
}

// Goat and sheep share one body: four long legs, a barrel body, a head on a
// short neck. Goats get horns and a beard; sheep a fluffy wool coat and a
// dark face.
function ruminant(c, sheep) {
  const { root, body } = start();
  if (sheep) {
    for (const [x, y, z, r] of [[0, 0.55, 0, 0.27], [0, 0.6, 0.18, 0.22], [0, 0.6, -0.18, 0.22], [0.12, 0.5, 0, 0.2], [-0.12, 0.5, 0, 0.2], [0, 0.72, 0, 0.2]]) part(body, sphere(r, 10, 8), c.color, x, y, z);
  } else {
    part(body, sphere(0.25), c.color, 0, 0.55, 0, 0.85, 0.85, 1.45);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.8, 0.36);
  body.add(head);
  const face = sheep ? c.accent : c.color;
  part(head, sphere(0.12), face, 0, 0, 0.03, 0.85, 0.95, 1.25);
  if (sheep) part(head, sphere(0.1, 10, 8), c.color, 0, 0.09, -0.02, 1.1, 0.7, 1); // wool on top
  for (const s of [-1, 1]) {
    const ear = part(head, sphere(0.05, 8, 6), face, 0.12 * s, 0.03, -0.02, 1.4, 0.45, 0.7);
    ear.rotation.z = 0.35 * s;
    if (!sheep) {
      const horn = part(head, new THREE.ConeGeometry(0.03, 0.18, 6), '#cdbf9e', 0.05 * s, 0.14, -0.05);
      horn.rotation.x = -0.6;
    }
  }
  eyes(head, 0.07, 0.03, 0.1, 0.02);
  if (!sheep) part(head, new THREE.ConeGeometry(0.03, 0.1, 5), c.accent, 0, -0.14, 0.08).rotation.x = Math.PI; // beard
  const legs = [];
  for (const [x, z] of [[-0.1, 0.22], [0.1, 0.22], [-0.1, -0.22], [0.1, -0.22]]) legs.push(part(body, cyl(0.04, 0.035, 0.42, 6), sheep ? c.accent : c.color, x, 0.21, z));
  const tail = new THREE.Group();
  tail.position.set(0, 0.62, -0.36);
  body.add(tail);
  part(tail, sphere(0.05, 6, 6), c.color, 0, 0.02, -0.02, 0.8, 1.3, 0.8);
  shadow(root, 0.42);
  return { root, body, head, tail, legs };
}

// Pig-tailed macaque: olive-brown fur, a pale pink face, and a short tail
// carried in a curl like a pig's.
function macaque(c) {
  const { root, body } = start();
  part(body, sphere(0.2), c.color, 0, 0.38, 0, 1, 1.15, 0.95);
  part(body, sphere(0.14), c.accent, 0, 0.35, 0.08, 0.9, 1, 0.8);
  const head = new THREE.Group();
  head.position.set(0, 0.72, 0.04);
  body.add(head);
  part(head, sphere(0.18), c.color, 0, 0, 0);
  part(head, sphere(0.06, 8, 6), '#5b4a37', 0, 0.12, 0.06, 1.4, 0.5, 1); // the dark cap on top
  part(head, sphere(0.12, 10, 8), '#d9a58c', 0, -0.03, 0.09, 1.15, 1, 0.8); // face
  for (const s of [-1, 1]) part(head, sphere(0.05, 8, 6), '#d9a58c', 0.17 * s, 0.02, 0, 0.6, 1, 1); // ears
  eyes(head, 0.055, 0.03, 0.18);
  part(head, sphere(0.06, 8, 6), '#e2b49e', 0, -0.08, 0.16, 1.2, 0.8, 0.9); // muzzle
  const legs = [];
  for (const [x, z, y, len] of [[-0.1, 0.03, 0.12, 0.24], [0.1, 0.03, 0.12, 0.24], [-0.23, 0.06, 0.36, 0.3], [0.23, 0.06, 0.36, 0.3]]) legs.push(part(body, cyl(0.04, 0.045, len, 6), c.color, x, y, z));
  const tail = new THREE.Group();
  tail.position.set(0, 0.3, -0.18);
  body.add(tail);
  for (let i = 0; i < 4; i++) { // short, curled over the back
    const a = i * 0.9;
    part(tail, sphere(0.03, 6, 6), c.color, 0, 0.03 + Math.sin(a) * 0.06, -0.03 - Math.cos(a) * 0.05);
  }
  body.scale.setScalar(1.3); // a grown macaque, a bit bigger than the café's little monkeys
  shadow(root, 0.36);
  return { root, body, head, tail, legs, climbs: true };
}

// Birds: one body on two legs, a neck and a bill. Flamingos are tall and pink
// on thin legs, pelicans white with a big pouched bill, peacocks blue with a
// long train that fans out now and then.
function bird(c, kind) {
  const { root, body } = start();
  const flam = kind === 'flamingo', pel = kind === 'pelican', pea = kind === 'peacock';
  const legH = flam ? 0.75 : pel ? 0.3 : 0.32;
  const bodyR = flam ? 0.2 : pel ? 0.27 : 0.18;
  part(body, sphere(bodyR), c.color, 0, legH + bodyR * 0.8, 0, 0.9, 0.85, 1.35);
  const wings = [];
  for (const s of [-1, 1]) wings.push(part(body, sphere(bodyR * 0.75, 8, 6), c.accent, bodyR * 0.75 * s, legH + bodyR * 0.85, -0.03, 0.35, 0.8, 1.3));
  const neckH = flam ? 0.55 : pel ? 0.28 : 0.3;
  const neck = part(body, cyl(0.04, 0.06, neckH, 6), c.color, 0, legH + bodyR * 1.3 + neckH / 2, bodyR * 0.9);
  neck.rotation.x = flam ? 0.15 : 0.3;
  const head = new THREE.Group();
  head.position.set(0, legH + bodyR * 1.3 + neckH, bodyR * 0.9 + (flam ? 0.08 : 0.12));
  body.add(head);
  part(head, sphere(flam ? 0.07 : pel ? 0.09 : 0.07, 10, 8), c.color, 0, 0, 0);
  eyes(head, 0.05, 0.02, 0.04, 0.012);
  if (flam) {
    const bill = part(head, new THREE.ConeGeometry(0.03, 0.14, 6), '#2b2629', 0, -0.05, 0.08);
    bill.rotation.x = 2.1; // bent down at the tip
  } else if (pel) {
    part(head, new THREE.BoxGeometry(0.06, 0.03, 0.34), '#f1b54a', 0, -0.01, 0.2);
    part(head, sphere(0.07, 8, 6), '#f4c66a', 0, -0.07, 0.18, 0.7, 0.8, 2); // the pouch
  } else {
    part(head, new THREE.ConeGeometry(0.02, 0.07, 5), '#4a4a3e', 0, -0.01, 0.07).rotation.x = Math.PI / 2;
    for (let i = -1; i <= 1; i++) part(head, sphere(0.015, 6, 6), '#2a59c9', i * 0.025, 0.12, -0.01); // crest
    for (let i = -1; i <= 1; i++) part(head, cyl(0.004, 0.004, 0.08, 3), '#2a3a6a', i * 0.025, 0.08, -0.01);
  }
  const legs = [];
  for (const s of [-1, 1]) legs.push(part(body, cyl(0.015, 0.015, legH, 5), flam ? '#e99aa6' : pel ? '#e6b55a' : '#8b8577', 0.07 * s, legH / 2, 0));
  const tail = new THREE.Group();
  tail.position.set(0, legH + bodyR * 0.8, -bodyR * 1.2);
  body.add(tail);
  let fan = null;
  if (pea) {
    // The train: long feathers lying flat behind (fan closed) that lift up
    // into a round fan (zoo.js turns `fan` from 0 to 1).
    fan = [];
    const eyeMat = mat('#2a59c9'), green = mat('#2f8f5b');
    for (let i = 0; i < 13; i++) {
      const a = (i / 12 - 0.5) * Math.PI * 0.95;
      const f = new THREE.Group();
      f.rotation.z = a;
      const feather = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.02).translate(0, 0.6, 0), green);
      const spot = new THREE.Mesh(sphere(0.06, 8, 6), eyeMat);
      spot.position.y = 1.08;
      spot.scale.z = 0.4;
      f.add(feather, spot);
      tail.add(f);
      fan.push(f);
    }
  } else {
    part(tail, new THREE.ConeGeometry(bodyR * 0.5, bodyR * 0.9, 6), c.accent, 0, 0, 0).rotation.x = -Math.PI / 2;
  }
  shadow(root, bodyR * 1.4);
  return { root, body, head, tail, legs, wings, fan, bird: true };
}

// Big cats: tiger (orange with black stripes) and lion (tawny; the male with
// a big mane). A long low body on four strong legs and a long tail.
function bigcat(c, kind) {
  const { root, body } = start();
  const tiger = kind === 'tiger', male = c.mane;
  part(body, sphere(0.36), c.color, 0, 0.72, 0, 0.85, 0.8, 1.75);
  part(body, sphere(0.28), c.accent, 0, 0.6, 0.1, 0.75, 0.6, 1.4); // pale belly
  if (tiger) for (let i = 0; i < 6; i++) { // stripes over the back
    const s = part(body, new THREE.TorusGeometry(0.3, 0.035, 4, 12, Math.PI), '#2a2226', 0, 0.74, -0.45 + i * 0.17, 1, 1, 1);
    s.rotation.y = Math.PI / 2;
  }
  const head = new THREE.Group();
  head.position.set(0, 0.95, 0.62);
  body.add(head);
  if (male) part(head, sphere(0.36, 12, 10), '#8a5a2e', 0, 0, -0.08, 1, 1, 0.75); // the mane
  part(head, sphere(0.24), c.color, 0, 0, 0.04, 1.05, 0.95, 1);
  part(head, sphere(0.13, 10, 8), c.accent, 0, -0.07, 0.2, 1.2, 0.8, 0.9); // muzzle
  part(head, sphere(0.04, 6, 6), '#3a2a2a', 0, -0.01, 0.31); // nose
  for (const s of [-1, 1]) {
    part(head, sphere(0.07, 8, 6), c.color, 0.17 * s, 0.18, -0.02, 1, 0.9, 0.5); // round ears
    if (tiger) part(head, new THREE.BoxGeometry(0.02, 0.1, 0.02), '#2a2226', 0.2 * s, 0.03, 0.12); // cheek stripes
  }
  eyes(head, 0.09, 0.05, 0.21, 0.03);
  const legs = [];
  for (const [x, z] of [[-0.18, 0.42], [0.18, 0.42], [-0.18, -0.42], [0.18, -0.42]]) legs.push(part(body, cyl(0.08, 0.075, 0.6, 7), c.color, x, 0.3, z));
  const tail = new THREE.Group();
  tail.position.set(0, 0.8, -0.6);
  body.add(tail);
  const tl = part(tail, cyl(0.035, 0.03, 0.8, 5), c.color, 0, -0.15, -0.32);
  tl.rotation.x = -1.0;
  part(tail, sphere(0.07, 6, 6), tiger ? '#2a2226' : '#6b4524', 0, -0.33, -0.64); // tail tip
  shadow(root, 0.75);
  return { root, body, head, tail, legs };
}

// Bears: brown or white (polar). Round and heavy, a small round head.
function bear(c, polar) {
  const { root, body } = start();
  const s = polar ? 1.15 : 1;
  part(body, sphere(0.45 * s), c.color, 0, 0.75 * s, 0, 0.9, 0.85, 1.4);
  part(body, sphere(0.3 * s), c.color, 0, 0.95 * s, -0.3 * s, 1, 0.9, 1); // the hump
  const head = new THREE.Group();
  head.position.set(0, 0.95 * s, 0.68 * s);
  body.add(head);
  part(head, sphere(0.25 * s), c.color, 0, 0, 0, 1, 0.95, polar ? 1.25 : 1);
  part(head, sphere(0.12 * s, 10, 8), c.accent, 0, -0.07, 0.22 * s, 1.1, 0.85, 1.1); // muzzle
  part(head, sphere(0.045, 6, 6), '#231d20', 0, -0.02, 0.36 * s); // nose
  for (const k of [-1, 1]) part(head, sphere(0.08 * s, 8, 6), c.color, 0.18 * s * k, 0.18 * s, -0.02, 1, 1, 0.6); // round ears
  eyes(head, 0.09 * s, 0.06, 0.2 * s, 0.03);
  const legs = [];
  for (const [x, z] of [[-0.22, 0.42], [0.22, 0.42], [-0.22, -0.42], [0.22, -0.42]]) legs.push(part(body, cyl(0.12 * s, 0.13 * s, 0.5 * s, 7), c.color, x * s, 0.25 * s, z * s));
  const tail = new THREE.Group();
  tail.position.set(0, 0.8 * s, -0.62 * s);
  body.add(tail);
  part(tail, sphere(0.07, 6, 6), c.color, 0, 0, 0);
  shadow(root, 0.8 * s);
  return { root, body, head, tail, legs, swims: polar };
}

// Seal and walrus: a smooth tapering body, flippers, no legs to walk on
// (they shuffle). The walrus is much bigger, with whiskers and tusks.
function pinniped(c, walrus) {
  const { root, body } = start();
  const s = walrus ? 1.7 : 1;
  part(body, sphere(0.3 * s), c.color, 0, 0.3 * s, 0, 0.9, 0.85, 1.7);
  part(body, new THREE.ConeGeometry(0.2 * s, 0.5 * s, 8), c.color, 0, 0.22 * s, -0.6 * s).rotation.x = -Math.PI / 2;
  const head = new THREE.Group();
  head.position.set(0, 0.52 * s, 0.45 * s);
  body.add(head);
  part(head, sphere(0.2 * s), c.color, 0, 0, 0, 1, 0.95, 1.1);
  part(head, sphere(0.1 * s, 8, 6), c.accent, 0, -0.06 * s, 0.17 * s, 1.4, 0.8, 0.8); // whisker pad
  part(head, sphere(0.03 * s, 6, 6), '#231d20', 0, -0.02 * s, 0.24 * s); // nose
  eyes(head, 0.08 * s, 0.05 * s, 0.15 * s, 0.03 * s);
  if (walrus) for (const k of [-1, 1]) part(head, new THREE.ConeGeometry(0.03, 0.32, 6), '#f4ecd8', 0.06 * k, -0.25, 0.22).rotation.x = Math.PI; // tusks
  const legs = [];
  for (const [x, z, sx] of [[-0.28, 0.25, 1], [0.28, 0.25, -1]]) {
    const f = part(body, sphere(0.1 * s, 8, 6), c.accent, x * s, 0.08 * s, z * s, 1.6, 0.3, 0.9);
    f.rotation.y = 0.4 * sx;
    legs.push(f);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.12 * s, -0.85 * s);
  body.add(tail);
  for (const k of [-1, 1]) part(tail, sphere(0.1 * s, 8, 6), c.accent, 0.1 * s * k, 0, 0, 1.2, 0.3, 1.4); // rear flippers
  shadow(root, 0.55 * s);
  return { root, body, head, tail, legs, swims: true, shuffles: true };
}

// Hippo: a huge barrel on short legs, a wide head that opens very wide (the
// jaw is its own group so the watermelon feeding can open it).
function hippo(c) {
  const { root, body } = start();
  part(body, sphere(0.6), c.color, 0, 0.85, 0, 1, 0.85, 1.6);
  part(body, sphere(0.45), c.accent, 0, 0.62, 0.1, 0.95, 0.6, 1.4); // pink belly
  const head = new THREE.Group();
  head.position.set(0, 1.0, 0.95);
  body.add(head);
  part(head, sphere(0.4), c.color, 0, 0.05, 0.05, 1.05, 0.8, 1);
  part(head, sphere(0.3), c.color, 0, 0.05, 0.38, 1.25, 0.75, 1); // the big upper snout
  for (const k of [-1, 1]) {
    part(head, sphere(0.06, 6, 6), '#3a2c30', 0.14 * k, 0.17, 0.62); // nostrils on top
    part(head, sphere(0.09, 8, 6), c.color, 0.22 * k, 0.32, -0.05); // eye bumps
    part(head, sphere(0.03, 6, 6), '#231d20', 0.22 * k, 0.36, 0.02); // eyes
    part(head, sphere(0.06, 8, 6), c.color, 0.25 * k, 0.4, -0.2, 1, 0.8, 0.6); // little ears
  }
  const jaw = new THREE.Group(); // the lower jaw, hinged at the back of the mouth
  jaw.position.set(0, -0.12, 0.1);
  head.add(jaw);
  part(jaw, sphere(0.3), c.color, 0, -0.06, 0.3, 1.2, 0.5, 1.05);
  part(jaw, sphere(0.25), '#e7849a', 0, 0.02, 0.32, 1.05, 0.25, 0.9); // inside of the mouth
  for (const k of [-1, 1]) part(jaw, new THREE.ConeGeometry(0.04, 0.16, 6), '#f6f0de', 0.22 * k, 0.1, 0.52); // tusks
  const legs = [];
  for (const [x, z] of [[-0.35, 0.55], [0.35, 0.55], [-0.35, -0.55], [0.35, -0.55]]) legs.push(part(body, cyl(0.17, 0.18, 0.5, 8), c.color, x, 0.25, z));
  const tail = new THREE.Group();
  tail.position.set(0, 0.9, -0.95);
  body.add(tail);
  part(tail, cyl(0.03, 0.05, 0.25, 5), c.color, 0, -0.1, -0.03);
  shadow(root, 1.1);
  return { root, body, head, tail, legs, jaw, swims: true };
}

// Snake: a chain of beads that slithers in S curves behind its head
// (zoo.js moves the beads), with a flicking tongue.
function snake(c) {
  const { root, body } = start();
  const segs = [];
  for (let i = 0; i < 16; i++) {
    const r = 0.09 * (1 - i / 22);
    const m = part(body, sphere(r, 8, 6), i % 3 === 1 ? c.accent : c.color, 0, r, -i * 0.13);
    segs.push(m);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.09, 0.1);
  body.add(head);
  part(head, sphere(0.1, 10, 8), c.color, 0, 0, 0, 1, 0.7, 1.4);
  eyes(head, 0.05, 0.04, 0.08, 0.018);
  const tongue = part(head, new THREE.BoxGeometry(0.015, 0.005, 0.14), '#d6334a', 0, -0.01, 0.18);
  shadow(root, 0.3);
  return { root, body, head, tail: new THREE.Group(), legs: [], segs, tongue, slithers: true };
}

// kind -> builder; c: { color, accent }.
export function makeZooAnimal(kind, c) {
  if (kind === 'rabbit') return rabbit(c);
  if (kind === 'guineapig') return guineapig(c);
  if (kind === 'goat') return ruminant(c, false);
  if (kind === 'sheep') return ruminant(c, true);
  if (kind === 'macaque') return macaque(c);
  if (kind === 'flamingo' || kind === 'pelican' || kind === 'peacock') return bird(c, kind);
  if (kind === 'tiger' || kind === 'lion') return bigcat(c, kind);
  if (kind === 'bear' || kind === 'polarbear') return bear(c, kind === 'polarbear');
  if (kind === 'seal' || kind === 'walrus') return pinniped(c, kind === 'walrus');
  if (kind === 'hippo') return hippo(c);
  if (kind === 'snake') return snake(c);
  throw new Error('no zoo animal ' + kind);
}

// Colours per kind: each animal of a kind takes the next one.
export const ZOO_LOOKS = {
  rabbit: [{ color: '#f7f4ef', accent: '#f2b7c1' }, { color: '#b58a66', accent: '#f2b7c1' }, { color: '#4b4245', accent: '#e3a1ad' }, { color: '#d9c3a3', accent: '#f2b7c1' }],
  guineapig: [{ color: '#d98a3d', accent: '#ffffff' }, { color: '#3b3133', accent: '#f0e1cc' }, { color: '#f4efe7', accent: '#c7864a' }, { color: '#b9875c', accent: '#2f2829' }, { color: '#e9c18e', accent: '#ffffff' }],
  goat: [{ color: '#f2efe8', accent: '#d8d2c6' }, { color: '#8a6446', accent: '#3a2c22' }, { color: '#2f2a2b', accent: '#bfb6a8' }],
  sheep: [{ color: '#f6f2e6', accent: '#3a3436' }, { color: '#efe8d6', accent: '#5a4c44' }, { color: '#f8f5ee', accent: '#2c2829' }],
  macaque: [{ color: '#8f7752', accent: '#c9b28d' }, { color: '#9b8259', accent: '#cdb894' }, { color: '#85704f', accent: '#c4ad88' }],
  flamingo: [{ color: '#f39aac', accent: '#ea7f97' }, { color: '#f6aab8', accent: '#ee8aa0' }],
  pelican: [{ color: '#f6f4ef', accent: '#2c2a2d' }],
  peacock: [{ color: '#1f5fbf', accent: '#7a6a4a' }],
  tiger: [{ color: '#e8862f', accent: '#f8efe2' }, { color: '#e07a26', accent: '#f8efe2' }],
  lion: [{ color: '#d9a85e', accent: '#f1dfbf', mane: true }, { color: '#dcae68', accent: '#f1dfbf' }, { color: '#d4a25a', accent: '#efdcba' }],
  bear: [{ color: '#6b4a33', accent: '#a07a5a' }, { color: '#5e4230', accent: '#987256' }],
  polarbear: [{ color: '#f4f1e8', accent: '#e6e0d2' }],
  seal: [{ color: '#7e8a92', accent: '#a9b3b9' }, { color: '#6f7b84', accent: '#9fa9b0' }, { color: '#8a949b', accent: '#b3bcc1' }],
  walrus: [{ color: '#a77a5f', accent: '#c99d80' }],
  hippo: [{ color: '#8a7f8e', accent: '#d9a5b0' }, { color: '#7f7484', accent: '#d39daa' }],
  snake: [{ color: '#5e8a3a', accent: '#d9c45a' }],
};
