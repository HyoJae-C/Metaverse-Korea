// The Moonlight Rainbow Fountain's water (rainbow-fountain.js has the
// schedule and the program): arcs of water from both sides of Banpo
// Bridge's upper deck, falling into the Han River, lit in changing colours,
// with a ring of spray where each lands. Two InstancedMeshes (two draw
// calls). Downloaded only near the bridge around show time.
import * as THREE from 'three';
import { jetAt } from './rainbow-fountain.js';

const DECK_Y = 8.4; // the deck's edge above the water (core/landmarks.js jamsu: top 9, 1.4 thick)
const SIDE_X = 11.1; // half the deck's width, where the nozzles are
const REACH = 13; // how far a jet at full strength throws its water from the deck
const SPAN = 112; // the length of bridge over the water that has jets

// One jet pointing along +x, from (0, 0) at the nozzle to the water at
// (REACH, -DECK_Y): it shoots out a little upwards, then falls; it widens
// into spray as it goes, and is brightest at the nozzle.
function jetGeometry(phone) {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const s = i / 10;
    pts.push(new THREE.Vector3(s * REACH, 2 * s - (2 + DECK_Y) * s * s, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const segs = phone ? 10 : 16, radial = phone ? 4 : 5;
  const geo = new THREE.TubeGeometry(curve, segs, 0.2, radial, false);
  const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    curve.getPointAt(u, c);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(1 + 2.2 * u).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
      const b = 1 - 0.35 * u;
      colors.set([b, b, b], k * 3);
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

// landmark: the bridge's "jamsu" landmark (world x, z, ry).
export function createRainbowJets(scene, landmark, { phone = false } = {}) {
  const n = phone ? 30 : 46; // jets on each side
  const group = new THREE.Group();
  group.name = 'rainbow-fountain';
  group.position.set(landmark.x, 0, landmark.z);
  group.rotation.y = landmark.ry || 0;
  const jets = new THREE.InstancedMesh(jetGeometry(phone), new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false,
  }), n * 2);
  const spray = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    color: '#ffffff', transparent: true, opacity: 0.45, depthWrite: false,
  }), n * 2);
  for (const m of [jets, spray]) {
    m.frustumCulled = false; // (the instances spread far beyond the one jet's bounds)
    m.userData.noShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(m);
  }
  jets.setColorAt(0, new THREE.Color()); // (makes instanceColor)
  scene.add(group);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  const none = new THREE.Matrix4().makeScale(0, 0, 0);
  const col = new THREE.Color(), jet = {};
  let last = -1;
  // t: seconds into the show (rainbow-fountain.js fountainAt).
  function update(t) {
    if (Math.abs(t - last) < 1 / 20) return; // (20 times a second is smooth enough)
    last = t;
    for (let side = 0; side < 2; side++) {
      const sx = side ? -1 : 1;
      for (let k = 0; k < n; k++) {
        // The two sides mirror each other, so a wave runs the same way along both.
        jetAt(t, k, n, jet);
        const i = side * n + k, z = -SPAN / 2 + (k * SPAN) / (n - 1);
        if (jet.reach < 0.04) { jets.setMatrixAt(i, none); spray.setMatrixAt(i, none); continue; }
        const r = 0.15 + 0.85 * jet.reach;
        jets.setMatrixAt(i, m4.compose(p.set(sx * SIDE_X, DECK_Y, z), side ? flip : q.identity(), s.set(r, 1, 1)));
        const w = 0.8 + 1.6 * jet.reach;
        spray.setMatrixAt(i, m4.compose(p.set(sx * (SIDE_X + REACH * r), 0.08, z), q.identity(), s.set(w, 1, w)));
        jets.setColorAt(i, col.setHSL(jet.hue, jet.sat, 0.62));
      }
    }
    jets.instanceMatrix.needsUpdate = true;
    spray.instanceMatrix.needsUpdate = true;
    jets.instanceColor.needsUpdate = true;
  }
  return { group, update, dispose: () => { scene.remove(group); for (const m of [jets, spray]) { m.geometry.dispose(); m.material.dispose(); } } };
}
