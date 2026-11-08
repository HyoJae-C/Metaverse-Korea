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
// A pair of eyes, each with a little white glint so they read from afar.
// (tests/zoo.test.mjs checks no eye is buried inside its head.)
function eyes(head, x, y, z, r = 0.025) {
  for (const s of [-1, 1]) {
    const e = part(head, sphere(r, 8, 6), '#231d20', x * s, y, z);
    e.userData.eye = true;
    part(head, sphere(r * 0.38, 5, 4), '#ffffff', x * s + r * 0.3 * s, y + r * 0.4, z + r * 0.7);
  }
}
// A curved tube along points (local to g): tails that stay joined on.
function tube(g, pts, r, color, r2 = r) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, 16, r, 6, false);
  if (r2 !== r) { // taper from r to r2 along the tube
    const pos = geo.attributes.position, n = 17, ring = 7;
    for (let i = 0; i < n; i++) {
      const c = curve.getPointAt(i / 16), k = (r + (r2 - r) * (i / 16)) / r;
      for (let j = 0; j < ring; j++) {
        const idx = i * ring + j;
        pos.setXYZ(idx, c.x + (pos.getX(idx) - c.x) * k, c.y + (pos.getY(idx) - c.y) * k, c.z + (pos.getZ(idx) - c.z) * k);
      }
    }
  }
  const m = new THREE.Mesh(geo, mat(color));
  g.add(m);
  return { mesh: m, end: curve.getPointAt(1) };
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
  eyes(head, 0.07, 0.03, 0.1, 0.022);
  part(head, sphere(0.018, 6, 6), '#8a5a52', 0, -0.03, 0.13); // nose
  const legs = [];
  for (const [x, z] of [[-0.08, 0.17], [0.08, 0.17], [-0.08, -0.17], [0.08, -0.17]]) legs.push(part(body, cyl(0.025, 0.03, 0.06, 6), c.color, x, 0.03, z));
  shadow(root, 0.3);
  return { root, body, head, tail: new THREE.Group(), legs };
}

// Goat and sheep share one body: four long legs, a barrel body, a neck up to
// the head. Goats get horns and a beard; sheep a thick, lumpy wool coat
// (wool on the head and the tops of the legs too) and a dark face.
function ruminant(c, sheep) {
  const { root, body } = start();
  if (sheep) {
    // Wool: lumps all over an egg shape, a few rows of them, slightly jumbled.
    part(body, sphere(0.3, 12, 10), c.color, 0, 0.6, 0, 1.05, 0.95, 1.4);
    for (let row = 0; row < 5; row++) {
      const z = -0.36 + row * 0.18, n = row === 0 || row === 4 ? 5 : 7;
      for (let k = 0; k < n; k++) {
        const a = Math.PI * (0.02 + (k / (n - 1)) * 0.96) + (row % 2) * 0.12; // over the top, side to side
        const rx = 0.3 * (row === 0 || row === 4 ? 0.75 : 1), ry = 0.27 * (row === 0 || row === 4 ? 0.75 : 1);
        part(body, sphere(0.12 + ((row * 7 + k * 3) % 4) * 0.012, 8, 6), c.color, Math.cos(a) * rx, 0.6 + Math.sin(a) * ry * 0.95 - 0.02, z);
      }
    }
    part(body, sphere(0.16, 8, 6), c.color, 0, 0.66, -0.46); // the rump
  } else {
    part(body, sphere(0.25), c.color, 0, 0.58, 0, 0.85, 0.85, 1.45);
  }
  // The neck: from the front of the body up to the head, all one piece.
  const neck = part(body, cyl(sheep ? 0.11 : 0.085, sheep ? 0.15 : 0.11, 0.34, 8), sheep ? c.color : c.color, 0, 0.74, sheep ? 0.38 : 0.31);
  neck.rotation.x = 0.55;
  if (sheep) part(body, sphere(0.15, 8, 6), c.color, 0, 0.78, 0.38); // a woolly collar
  const head = new THREE.Group();
  head.position.set(0, 0.88, sheep ? 0.5 : 0.43);
  body.add(head);
  const face = sheep ? c.accent : c.color;
  part(head, sphere(0.12), face, 0, 0, 0.03, 0.85, 0.95, 1.25);
  if (sheep) { // a wool cap on top of the head
    for (const [x, y, z] of [[0, 0.1, -0.03], [0.06, 0.08, 0.02], [-0.06, 0.08, 0.02], [0, 0.07, 0.07]]) part(head, sphere(0.07, 8, 6), c.color, x, y, z);
  }
  for (const s of [-1, 1]) {
    const ear = part(head, sphere(0.05, 8, 6), face, 0.12 * s, 0.03, -0.02, 1.4, 0.45, 0.7);
    ear.rotation.z = 0.35 * s;
    if (!sheep) {
      const horn = part(head, new THREE.ConeGeometry(0.03, 0.18, 6), '#cdbf9e', 0.05 * s, 0.14, -0.05);
      horn.rotation.x = -0.6;
    }
  }
  eyes(head, 0.065, 0.035, 0.135, 0.024);
  if (!sheep) part(head, new THREE.ConeGeometry(0.03, 0.1, 5), c.accent, 0, -0.14, 0.08).rotation.x = Math.PI; // beard
  const legs = [];
  // Legs reach up into the body so they never float apart from it.
  for (const [x, z] of [[-0.11, 0.22], [0.11, 0.22], [-0.11, -0.22], [0.11, -0.22]]) {
    legs.push(part(body, cyl(0.04, 0.035, 0.56, 6), sheep ? c.accent : c.color, x, 0.28, z));
    if (sheep) part(body, sphere(0.09, 8, 6), c.color, x, 0.42, z, 1, 1.1, 1); // wool on the top of the leg
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.66, sheep ? -0.5 : -0.36);
  body.add(tail);
  part(tail, sphere(sheep ? 0.08 : 0.05, 6, 6), c.color, 0, 0.02, -0.02, 0.8, 1.3, 0.8);
  shadow(root, sheep ? 0.5 : 0.42);
  return { root, body, head, tail, legs };
}

// Pig-tailed macaque: chibi, with a big head. Olive-brown fur, a dark flat
// cap on the crown, a long pale pink muzzle, amber eyes under a brow, and the
// short tail held up in a curl like a pig's. Arms are their own groups
// (shoulder pivots) so the zoo can wave, scratch and grab with them.
function macaque(c) {
  const { root, body } = start();
  part(body, sphere(0.19), c.color, 0, 0.36, -0.02, 1, 1.1, 1.05);
  part(body, sphere(0.13), c.accent, 0, 0.34, 0.07, 0.9, 1, 0.8); // pale front
  const head = new THREE.Group();
  head.position.set(0, 0.74, 0.05);
  body.add(head);
  part(head, sphere(0.27, 14, 12), c.color, 0, 0, 0, 1.05, 0.95, 1); // the big head
  part(head, sphere(0.17, 12, 6), '#5a4632', 0, 0.21, -0.02, 1, 0.28, 1); // the flat dark cap of hair on the crown
  part(head, sphere(0.19, 12, 10), '#d8a08a', 0, -0.04, 0.13, 1.05, 0.95, 0.75); // bare face
  part(head, sphere(0.2, 10, 6), c.color, 0, 0.11, 0.12, 1.05, 0.3, 0.7); // brow
  part(head, sphere(0.1, 10, 8), '#e0ae98', 0, -0.11, 0.27, 1.05, 0.8, 1.15); // long muzzle
  for (const s of [-1, 1]) {
    part(head, sphere(0.022, 6, 6), '#3a2420', 0.03 * s, -0.08, 0.38); // nostrils
    part(head, sphere(0.032, 8, 6), '#c98a2a', 0.075 * s, 0.04, 0.26).userData.eye = true; // amber eyes
    part(head, sphere(0.018, 6, 6), '#1e1a1c', 0.075 * s, 0.04, 0.285).userData.eye = true; // pupils
    part(head, sphere(0.06, 8, 6), '#c8907a', 0.26 * s, 0.0, -0.01, 0.5, 1, 0.9); // ears
  }
  const mouth = part(head, new THREE.BoxGeometry(0.1, 0.012, 0.02), '#7a3a34', 0, -0.17, 0.33);
  const legs = [];
  for (const x of [-0.1, 0.1]) legs.push(part(body, cyl(0.045, 0.05, 0.3, 6), c.color, x, 0.15, 0.02));
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); // a shoulder pivot: rotation.x swings it forward, .z out to the side
    arm.position.set(0.2 * s, 0.48, 0.04);
    body.add(arm);
    part(arm, cyl(0.04, 0.045, 0.34, 6), c.color, 0, -0.17, 0);
    part(arm, sphere(0.05, 6, 6), '#b9806a', 0, -0.35, 0); // hand
    arms.push(arm);
    legs.push(arm); // (walks on all fours: the arms step like front legs)
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.3, -0.2);
  body.add(tail);
  // One thin straight tail, out and up behind.
  part(tail, cyl(0.014, 0.022, 0.3, 6), c.color, 0, 0.1, -0.11).rotation.x = -0.83;
  body.scale.setScalar(1.25);
  shadow(root, 0.38);
  return { root, body, head, tail, legs, arms, mouth, climbs: true };
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
  eyes(head, 0.05, 0.02, kind === 'pelican' ? 0.072 : 0.055, 0.014);
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
    // Two rows: long feathers behind, shorter ones in front, so the open fan
    // is a full wheel of eyes.
    for (const [n, len, w, z] of [[17, 1.25, 0.14, 0], [13, 0.85, 0.12, 0.03]]) {
      for (let i = 0; i < n; i++) {
        const f = new THREE.Group();
        f.position.z = z;
        f.userData.u = i / (n - 1) - 0.5; // -0.5..0.5 across the fan
        const feather = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.02).translate(0, len / 2, 0), green);
        const spot = new THREE.Mesh(sphere(0.065, 8, 6), eyeMat);
        spot.position.y = len - 0.11;
        spot.scale.z = 0.4;
        const ring = new THREE.Mesh(sphere(0.035, 6, 4), mat('#d8b23a'));
        ring.position.set(0, len - 0.11, 0.02);
        ring.scale.z = 0.4;
        f.add(feather, spot, ring);
        tail.add(f);
        fan.push(f);
      }
    }
  } else {
    part(tail, new THREE.ConeGeometry(bodyR * 0.5, bodyR * 0.9, 6), c.accent, 0, 0, 0).rotation.x = -Math.PI / 2;
  }
  shadow(root, bodyR * 1.4);
  return { root, body, head, tail, legs, wings, fan, bird: true };
}

// Tiger stripes: one canvas wrapped round the body (the sphere's pole runs
// nose to tail, so each stripe is a ring across the back), the belly left
// cream. Drawn once and shared.
let stripeTex = null;
function tigerStripes() {
  if (stripeTex) return stripeTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8862f'; g.fillRect(0, 0, 256, 128);
  // u 0..1 runs round the body: the belly is about u 0.1-0.4 (cream), the
  // spine u 0.75. v runs nose (top) to tail (bottom).
  g.fillStyle = '#f8efe2'; g.fillRect(256 * 0.08, 0, 256 * 0.34, 128);
  g.fillStyle = '#2a2226';
  for (let i = 0; i < 9; i++) {
    const v = 22 + i * 11;
    for (const side of [1, -1]) { // from the spine down each side, tapering
      g.beginPath();
      const u0 = 256 * 0.75, u1 = 256 * (0.75 + side * 0.3);
      g.moveTo(u0, v - 3);
      g.quadraticCurveTo((u0 + u1) / 2, v - 4 + side * 2, u1, v + 2);
      g.quadraticCurveTo((u0 + u1) / 2, v + 2, u0, v + 3);
      g.fill();
    }
  }
  // wrap the left edge (u < 0.75 - 0.3 wraps to the right side)
  stripeTex = new THREE.CanvasTexture(c);
  stripeTex.colorSpace = THREE.SRGBColorSpace;
  stripeTex.wrapS = THREE.RepeatWrapping;
  return stripeTex;
}

// Big cats: tiger (orange with black stripes all round its body) and lion
// (tawny; the male with a big spiky mane). A long body on four sturdy legs
// whose tops sink into the body, big paws, and a long tail that grows out of
// the rump in one curved piece.
function bigcat(c, kind) {
  const { root, body } = start();
  const tiger = kind === 'tiger', male = c.mane;
  const torsoGeo = new THREE.SphereGeometry(0.36, 20, 14).rotateX(Math.PI / 2); // pole along z: stripes are rings
  const torso = new THREE.Mesh(torsoGeo, tiger ? new THREE.MeshLambertMaterial({ map: tigerStripes() }) : mat(c.color));
  torso.position.set(0, 0.66, 0);
  torso.scale.set(0.82, 0.8, 1.6);
  body.add(torso);
  if (!tiger) part(body, sphere(0.27), c.accent, 0, 0.54, 0.08, 0.72, 0.55, 1.3); // pale belly
  part(body, sphere(0.3), c.color, 0, 0.72, 0.38, 0.95, 0.95, 0.9); // chest and shoulders, up to the head
  const head = new THREE.Group();
  head.position.set(0, 0.92, 0.64);
  body.add(head);
  if (male) { // a big mane of spikes all round the face
    part(head, sphere(0.4, 12, 10), '#8a5a2e', 0, -0.02, -0.08, 1, 1, 0.75);
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 12 : 14, R = ring ? 0.36 : 0.42, len = ring ? 0.24 : 0.3;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, len, 5), mat(ring ? '#9c6632' : '#7a4a24'));
        spike.position.set(Math.cos(a) * R, Math.sin(a) * R - 0.02, -0.1 - ring * 0.06);
        spike.rotation.z = a - Math.PI / 2;
        spike.rotation.x = -0.35;
        head.add(spike);
      }
    }
  }
  part(head, sphere(0.24), c.color, 0, 0, 0.04, 1.05, 0.95, 1);
  if (tiger) for (const s of [-1, 1]) part(head, sphere(0.1, 8, 6), '#f8efe2', 0.17 * s, -0.07, 0.14, 1, 0.85, 0.8); // white cheek ruffs
  part(head, sphere(0.13, 10, 8), c.accent, 0, -0.08, 0.2, 1.2, 0.8, 0.9); // muzzle
  part(head, sphere(0.04, 6, 6), tiger ? '#c76a6a' : '#3a2a2a', 0, -0.02, 0.32, 1.2, 0.8, 1); // nose
  for (const s of [-1, 1]) {
    part(head, sphere(0.075, 8, 6), c.color, 0.17 * s, 0.19, -0.02, 1, 0.95, 0.55); // round ears
    part(head, sphere(0.04, 6, 6), tiger ? '#2a2226' : '#8a5a2e', 0.17 * s, 0.2, -0.05, 1, 0.9, 0.4); // the back of the ear
  }
  if (tiger) for (let i = -1; i <= 1; i++) { // stripes on the forehead
    const st = part(head, new THREE.BoxGeometry(0.025, 0.09, 0.02), '#2a2226', i * 0.05, 0.14, 0.23);
    st.rotation.x = -0.5; st.rotation.z = i * 0.25;
  }
  eyes(head, 0.085, 0.07, 0.24, 0.032);
  const legs = [];
  for (const [x, z] of [[-0.17, 0.4], [0.17, 0.4], [-0.17, -0.38], [0.17, -0.38]]) {
    const leg = new THREE.Group(); // a hip pivot inside the body, so the leg swings from there
    leg.position.set(x, 0.62, z);
    body.add(leg);
    part(leg, cyl(0.11, 0.09, 0.62, 8), c.color, 0, -0.31, 0);
    part(leg, sphere(0.11, 8, 6), tiger ? '#f8efe2' : c.color, 0, -0.58, 0.04, 1, 0.6, 1.3); // paw
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.72, -0.5); // inside the rump
  body.add(tail);
  const t = tube(tail, [[0, 0, 0], [0, -0.05, -0.25], [0, -0.3, -0.45], [0, -0.38, -0.65], [0, -0.3, -0.82]], 0.026, c.color, 0.018); // thin
  if (tiger) for (const u of [0.5, 0.7, 0.85]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.014, 4, 10), mat('#2a2226'));
    const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0, -0.05, -0.25], [0, -0.3, -0.45], [0, -0.38, -0.65], [0, -0.3, -0.82]].map((p) => new THREE.Vector3(...p)));
    ring.position.copy(curve.getPointAt(u));
    ring.lookAt(ring.position.clone().add(curve.getTangentAt(u)));
    tail.add(ring);
  }
  part(tail, sphere(tiger ? 0.028 : 0.06, 6, 6), tiger ? '#2a2226' : '#6b4524', t.end.x, t.end.y, t.end.z); // tail tip (a lion's tuft)
  body.scale.setScalar(1.35);
  shadow(root, 1);
  return { root, body, head, tail, legs };
}

// Bears: brown or white (polar). Round and heavy, a small round head; thick
// legs that go well up into the body, with big paws.
function bear(c, polar) {
  const { root, body } = start();
  const s = polar ? 1.15 : 1;
  part(body, sphere(0.45 * s), c.color, 0, 0.66 * s, 0, 0.9, 0.85, 1.4);
  part(body, sphere(0.3 * s), c.color, 0, 0.86 * s, -0.3 * s, 1, 0.9, 1); // the hump
  part(body, sphere(0.34 * s), c.color, 0, 0.7 * s, 0.4 * s, 1, 1, 1); // shoulders, up to the head
  const head = new THREE.Group();
  head.position.set(0, 0.86 * s, 0.7 * s);
  body.add(head);
  part(head, sphere(0.25 * s), c.color, 0, 0, 0, 1, 0.95, polar ? 1.25 : 1);
  part(head, sphere(0.12 * s, 10, 8), c.accent, 0, -0.07, (polar ? 0.27 : 0.22) * s, 1.1, 0.85, 1.1); // muzzle
  part(head, sphere(0.045, 6, 6), '#231d20', 0, -0.03, (polar ? 0.4 : 0.35) * s); // nose
  for (const k of [-1, 1]) part(head, sphere(0.08 * s, 8, 6), c.color, 0.18 * s * k, 0.18 * s, -0.02, 1, 1, 0.6); // round ears
  eyes(head, 0.09 * s, 0.07 * s, (polar ? 0.27 : 0.23) * s, 0.032);
  const legs = [];
  for (const [x, z] of [[-0.22, 0.4], [0.22, 0.4], [-0.22, -0.4], [0.22, -0.4]]) {
    const leg = new THREE.Group();
    leg.position.set(x * s, 0.58 * s, z * s);
    body.add(leg);
    part(leg, cyl(0.14 * s, 0.13 * s, 0.58 * s, 8), c.color, 0, -0.29 * s, 0);
    part(leg, sphere(0.14 * s, 8, 6), c.color, 0, -0.54 * s, 0.05 * s, 1, 0.55, 1.25); // paw
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.73 * s, -0.6 * s);
  body.add(tail);
  part(tail, sphere(0.045 * s, 6, 6), c.color, 0, 0, -0.02); // a little stub
  body.scale.setScalar(1.35); // big: about the player's height at the shoulder
  shadow(root, 1.05 * s);
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
  eyes(head, 0.08 * s, 0.05 * s, 0.195 * s, 0.03 * s);
  if (walrus) for (const k of [-1, 1]) part(head, new THREE.ConeGeometry(0.03, 0.32, 6), '#f4ecd8', 0.06 * k, -0.25, 0.22).rotation.x = Math.PI; // tusks
  const legs = [];
  for (const [x, z, sx] of [[-0.2, 0.25, 1], [0.2, 0.25, -1]]) { // front flippers, tucked against the body
    const f = part(body, sphere(0.1 * s, 8, 6), c.accent, x * s, 0.12 * s, z * s, 1.6, 0.35, 0.9);
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
  part(body, sphere(0.72, 16, 12), c.color, 0, 0.9, 0, 1, 0.85, 1.5); // a big barrel, low enough to sit on the legs
  part(body, sphere(0.55), c.accent, 0, 0.62, 0.1, 0.95, 0.55, 1.35); // pink belly
  const head = new THREE.Group();
  head.position.set(0, 1.02, 1.08);
  body.add(head);
  part(head, sphere(0.4), c.color, 0, 0.05, 0.05, 1.05, 0.8, 1);
  part(head, sphere(0.3), c.color, 0, 0.05, 0.38, 1.25, 0.75, 1); // the big upper snout
  for (const k of [-1, 1]) {
    part(head, sphere(0.06, 6, 6), '#3a2c30', 0.14 * k, 0.17, 0.62); // nostrils on top
    part(head, sphere(0.09, 8, 6), c.color, 0.22 * k, 0.32, -0.05); // eye bumps
    part(head, sphere(0.035, 8, 6), '#231d20', 0.22 * k, 0.36, 0.02).userData.eye = true; // eyes
    part(head, sphere(0.07, 8, 6), c.color, 0.24 * k, 0.25, -0.16, 1, 0.85, 0.6); // little ears, sat on the head
  }
  const jaw = new THREE.Group(); // the lower jaw, hinged at the back of the mouth
  jaw.position.set(0, -0.12, 0.1);
  head.add(jaw);
  part(jaw, sphere(0.3), c.color, 0, -0.06, 0.3, 1.2, 0.5, 1.05);
  part(jaw, sphere(0.25), '#e7849a', 0, 0.02, 0.32, 1.05, 0.25, 0.9); // inside of the mouth
  for (const k of [-1, 1]) part(jaw, new THREE.ConeGeometry(0.04, 0.16, 6), '#f6f0de', 0.22 * k, 0.1, 0.52); // tusks
  const legs = [];
  // Short thick legs that go up into the barrel (no gap under the body).
  for (const [x, z] of [[-0.34, 0.55], [0.34, 0.55], [-0.34, -0.55], [0.34, -0.55]]) legs.push(part(body, cyl(0.19, 0.2, 0.66, 8), c.color, x, 0.33, z));
  // A short flat tail, hanging from the rump with a tuft at the tip.
  const tail = new THREE.Group();
  tail.position.set(0, 0.98, -1.02);
  body.add(tail);
  part(tail, cyl(0.014, 0.03, 0.34, 6), c.color, 0, -0.14, -0.06).rotation.x = 0.35; // thin
  part(tail, sphere(0.025, 6, 6), '#5d5462', 0, -0.31, -0.12, 1.4, 1.2, 0.8);
  shadow(root, 1.25);
  return { root, body, head, tail, legs, jaw, swims: true };
}

// Snake: a chain of beads that slithers in S curves behind its head
// (zoo.js moves the beads), with a flicking tongue.
function snake(c) {
  const { root, body } = start();
  const segs = [];
  for (let i = 0; i < 22; i++) { // beads close enough to overlap: one body
    const r = 0.09 * (1 - i / 40);
    const m = part(body, sphere(r, 8, 6), i % 3 === 1 ? c.accent : c.color, 0, r, -i * 0.06);
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

// Coat textures for a torso whose pole runs along z (like the tiger's): u
// goes round the body, v from nose (top) to tail (bottom).
const coats = {};
function coat(kind) {
  if (coats[kind]) return coats[kind];
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  if (kind === 'zebra') { // black bands all the way round, a little wavy
    g.fillStyle = '#f7f5f0'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#1f1c1e';
    for (let i = 0; i < 12; i++) {
      const v = 8 + i * 10;
      g.beginPath();
      g.moveTo(0, v);
      for (let u = 0; u <= 256; u += 16) g.lineTo(u, v + Math.sin(u / 20 + i) * 2.5);
      for (let u = 256; u >= 0; u -= 16) g.lineTo(u, v + 4.5 + Math.sin(u / 24 + i * 2) * 2);
      g.fill();
    }
  } else { // giraffe: tan patches on a cream net
    g.fillStyle = '#f3e3bf'; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#b8652a';
    for (let y = 0; y < 6; y++) for (let x = 0; x < 9; x++) {
      const cx = x * 30 + (y % 2) * 15 + 6, cy = y * 22 + 10;
      g.beginPath();
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + x; g.lineTo(cx + Math.cos(a) * (11 + ((x + k) % 3)), cy + Math.sin(a) * (8 + ((y + k) % 3))); }
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  coats[kind] = t;
  return t;
}
const coatMat = (kind) => new THREE.MeshLambertMaterial({ map: coat(kind) });
function torso(body, kind, r, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14).rotateX(Math.PI / 2), coatMat(kind));
  m.position.set(0, y, z);
  m.scale.set(sx, sy, sz);
  body.add(m);
  return m;
}
// Legs on hip pivots inside the body, so they swing from there.
function hipLegs(body, spots, y, r1, r2, hoof) {
  const legs = [];
  for (const [x, z, color] of spots) {
    const leg = new THREE.Group();
    leg.position.set(x, y, z);
    body.add(leg);
    part(leg, cyl(r1, r2, y, 8), color, 0, -y / 2, 0);
    if (hoof) part(leg, cyl(r2 * 1.05, r2 * 1.2, Math.min(0.12, y * 0.12), 8), hoof, 0, -y + Math.min(0.06, y * 0.06), 0);
    legs.push(leg);
  }
  return legs;
}
// A thin tail with a tuft: hangs from the rump.
function tuftTail(body, y, z, len, r, color, tuft) {
  const tail = new THREE.Group();
  tail.position.set(0, y, z);
  body.add(tail);
  part(tail, cyl(r * 0.6, r, len, 6), color, 0, -len / 2, -0.03).rotation.x = 0.12;
  part(tail, sphere(r * 1.8, 6, 6), tuft, 0, -len, -0.05, 1, 1.8, 1);
  return tail;
}

// Elephant: a big grey barrel on pillar legs, big flapping ears (their own
// groups), and a trunk of segments the zoo can curl, swing and raise.
// c.calf: a little one (no tusks), which follows its mother.
function elephant(c) {
  const { root, body } = start();
  part(body, sphere(1.0, 18, 14), c.color, 0, 1.65, 0, 1, 0.85, 1.25);
  part(body, sphere(0.62), c.color, 0, 2.0, 0.65, 1, 1, 1); // shoulders, up to the head
  const head = new THREE.Group();
  head.position.set(0, 2.15, 1.1);
  body.add(head);
  part(head, sphere(0.6, 14, 12), c.color, 0, 0, 0, 1, 0.95, 0.9);
  part(head, sphere(0.25), c.color, 0, -0.12, 0.42, 1.1, 1.2, 0.8); // the top of the trunk
  eyes(head, 0.33, 0.12, 0.44, 0.05);
  const ears = [];
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); // pivot at the side of the head: flaps on y
    ear.position.set(0.42 * s, 0.05, -0.12);
    head.add(ear);
    part(ear, sphere(0.5, 12, 10), c.color, 0.38 * s, -0.08, -0.05, 1, 1.15, 0.12);
    part(ear, sphere(0.4, 10, 8), c.accent, 0.38 * s, -0.1, 0.0, 1, 1.1, 0.08); // pink inside
    ear.rotation.y = 0.35 * s;
    ears.push(ear);
  }
  // The trunk: a chain, each segment a group at the end of the last.
  const trunk = [];
  let at = head, len = 0.3;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group();
    if (i === 0) seg.position.set(0, -0.22, 0.52); else seg.position.set(0, -len, 0);
    seg.rotation.x = i === 0 ? 0.25 : 0.12;
    at.add(seg);
    const r0 = 0.17 - i * 0.017;
    part(seg, cyl(r0 - 0.017, r0, len + 0.08, 8), c.color, 0, -len / 2, 0);
    trunk.push(seg);
    at = seg;
  }
  part(at, sphere(0.085, 8, 6), c.accent, 0, -len - 0.02, 0, 1, 0.6, 1); // the tip
  if (!c.calf) for (const s of [-1, 1]) {
    const tusk = part(head, new THREE.ConeGeometry(0.06, 0.45, 7), '#f4ecd8', 0.22 * s, -0.42, 0.48);
    tusk.rotation.x = 2.3;
  }
  const legs = hipLegs(body, [[-0.5, 0.6, c.color], [0.5, 0.6, c.color], [-0.5, -0.6, c.color], [0.5, -0.6, c.color]], 1.3, 0.28, 0.3, c.accent2 || '#b7aca0');
  const tail = tuftTail(body, 1.75, -1.2, 0.75, 0.04, c.color, '#4a4446');
  if (c.calf) body.scale.setScalar(0.55);
  shadow(root, c.calf ? 0.8 : 1.4);
  return { root, body, head, tail, legs, ears, trunk, calf: !!c.calf };
}

// Giraffe: very long legs and neck, both spotted; little horns
// (ossicones), a short mane. The neck is its own group so the zoo can bow it
// to drink, stretch it up to the treetops, or swing it at a friend.
function giraffe(c) {
  const { root, body } = start();
  torso(body, 'giraffe', 0.55, 2.0, 0, 0.75, 0.8, 1.3);
  const neck = new THREE.Group();
  neck.position.set(0, 2.1, 0.5);
  neck.rotation.x = 0.35;
  body.add(neck);
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 1.8, 10), coatMat('giraffe'));
  nk.position.y = 0.85;
  neck.add(nk);
  part(neck, new THREE.BoxGeometry(0.05, 1.6, 0.08), '#7a4a24', 0, 0.85, -0.12).rotation.x = -0.04; // the mane
  const head = new THREE.Group();
  head.position.set(0, 1.78, 0.02);
  head.rotation.x = -0.35; // level again
  neck.add(head);
  part(head, sphere(0.17, 12, 10), c.color, 0, 0, 0.04, 0.85, 0.85, 1);
  part(head, sphere(0.13, 10, 8), c.color, 0, -0.05, 0.22, 0.8, 0.75, 1.2); // long face
  part(head, sphere(0.08, 8, 6), c.accent, 0, -0.07, 0.34, 1, 0.8, 0.9); // muzzle
  for (const s of [-1, 1]) {
    part(head, cyl(0.025, 0.03, 0.18, 6), c.color, 0.06 * s, 0.17, -0.02); // ossicones
    part(head, sphere(0.035, 6, 6), '#3a2a22', 0.06 * s, 0.27, -0.02);
    part(head, sphere(0.05, 8, 6), c.color, 0.15 * s, 0.07, -0.04, 1.4, 0.5, 0.6).rotation.z = 0.4 * s; // ears
  }
  eyes(head, 0.13, 0.05, 0.12, 0.028);
  const legs = hipLegs(body, [[-0.22, 0.42, c.color], [0.22, 0.42, c.color], [-0.22, -0.45, c.color], [0.22, -0.45, c.color]], 1.85, 0.07, 0.065, '#3a2a22');
  const tail = tuftTail(body, 2.05, -0.65, 0.8, 0.025, c.color, '#3a2a22');
  shadow(root, 0.8);
  return { root, body, head, tail, legs, neck };
}

// Zebra: a striped pony, a black-and-white standing mane, a dark muzzle.
function zebra(c) {
  const { root, body } = start();
  torso(body, 'zebra', 0.32, 0.95, 0, 0.8, 0.85, 1.55);
  const neck = new THREE.Group();
  neck.position.set(0, 1.0, 0.38);
  neck.rotation.x = 0.6;
  body.add(neck);
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.55, 10), coatMat('zebra'));
  nk.position.y = 0.25;
  neck.add(nk);
  for (let i = 0; i < 6; i++) part(neck, new THREE.BoxGeometry(0.04, 0.09, 0.08), i % 2 ? '#f7f5f0' : '#1f1c1e', 0, 0.06 + i * 0.085, -0.12); // the mane
  const head = new THREE.Group();
  head.position.set(0, 0.55, 0.02);
  head.rotation.x = -0.6;
  neck.add(head);
  part(head, sphere(0.12, 12, 10), c.color, 0, 0, 0, 0.85, 0.9, 1);
  part(head, sphere(0.1, 10, 8), c.color, 0, -0.06, 0.15, 0.75, 0.75, 1.3); // long face
  part(head, sphere(0.07, 8, 6), '#2a2628', 0, -0.08, 0.27, 0.95, 0.85, 0.8); // dark muzzle
  for (const y of [0.04, -0.03]) part(head, new THREE.BoxGeometry(0.17, 0.018, 0.12), '#1f1c1e', 0, y, 0.1); // face stripes
  for (const s of [-1, 1]) part(head, new THREE.ConeGeometry(0.035, 0.12, 6), c.color, 0.06 * s, 0.14, -0.03).rotation.z = -0.25 * s; // ears
  eyes(head, 0.075, 0.04, 0.09, 0.022);
  const legs = hipLegs(body, [[-0.13, 0.33, c.color], [0.13, 0.33, c.color], [-0.13, -0.33, c.color], [0.13, -0.33, c.color]], 0.9, 0.055, 0.045, '#1f1c1e');
  for (const l of legs) l.children[0].material = coatMat('zebra'); // striped legs too
  const tail = tuftTail(body, 1.0, -0.47, 0.45, 0.02, c.color, '#1f1c1e');
  shadow(root, 0.5);
  return { root, body, head, tail, legs, neck };
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
  if (kind === 'elephant') return elephant(c);
  if (kind === 'giraffe') return giraffe(c);
  if (kind === 'zebra') return zebra(c);
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
  elephant: [{ color: '#8d8a8f', accent: '#d9a5b0' }, { color: '#98949a', accent: '#e0b0ba', calf: true }],
  giraffe: [{ color: '#d9a35a', accent: '#5a4636' }, { color: '#d39a52', accent: '#5a4636' }],
  zebra: [{ color: '#f7f5f0', accent: '#1f1c1e' }, { color: '#f4f2ec', accent: '#1f1c1e' }, { color: '#f7f5f0', accent: '#1f1c1e' }],
};
