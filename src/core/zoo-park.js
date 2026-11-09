// Children's Grand Park's zoo as a room of its own: you walk in through the
// entrance building's door at the end of the gate plaza (stores.json
// "cgp-zoo", workshop "zoo") and the zoo grounds take over the screen, like
// Another Land. Loaded on the first visit (main.js), with the zoo's animals.
// The layout is scripts/build-grand-park.mjs (src/data/zoo-grounds.json), in
// the street district's metres: the winding paths round the flower plaza,
// the pens and their animals (core/zoo.js), the woods round the edge, the
// flowers, the cart station, and the Sea Animals hall, whose door leads
// into a room of its own (core/zoo-sea-hall.js). Visitors already stand at
// the pens and stroll the paths (game/zoo-visit.js, from stations.watchers).
// Same shape as buildInterior's result, plus `zoo` (the Zoo) and tick.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { matCache, canvasTex } from './three-kit.js';
import { Zoo } from './zoo.js';
import { mergeStatic } from './merge-static.js';
import { zooCartStation, zooFlowers } from './zoo-props.js';
import { ZOO_PARK_ENTRY } from './zoo-rooms.js';
import { buildCamelRide } from './zoo-camel-ride.js';
import GROUNDS from '../data/zoo-grounds.json' with { type: 'json' };

export { buildSeaHall } from './zoo-sea-hall.js';
export { GROUNDS };

const mat = matCache({ flatShading: true });
const PATH = '#eadcbf', GRASS = '#a9d98a', FAR_GRASS = '#93c977';
// Pens further than this from you are not drawn (the fog hides them first),
// and their animals rest (core/zoo.js only moves the ones nearby).
export const VIEW = 95;
// Animals further than this are not drawn: each is a few dozen small meshes,
// and from further off they'd be a few pixels anyway.
export const ANIMAL_VIEW = 38;
export const SMALL_VIEW = 22; // m: the little ones (a rabbit is as many meshes as a lion) go sooner
export const SMALL_ANIMALS = new Set(['rabbit', 'guineapig', 'goat', 'sheep', 'macaque', 'flamingo', 'pelican', 'peacock', 'vulture']);

// Where visitors stand: a step outside the side you look in from, a few
// metres apart, turned to the pen. Two at most pens, one at small ones.
export function patronSpots(pens) {
  const out = [];
  for (const p of pens) {
    if (p.closed || p.pet) continue; // (the hall is a building; the petting village has its own keeper and gate)
    const s = p.board || 'n', hw = p.w / 2, hd = p.d / 2;
    const n = p.w * p.d > 300 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? -0.25 : i ? 0.3 : -0.3;
      const [x, z, ry] = {
        n: [p.x + u * p.w, p.z - hd - 1.6, 0], s: [p.x + u * p.w, p.z + hd + 1.6, Math.PI],
        w: [p.x - hw - 1.6, p.z + u * p.d, Math.PI / 2], e: [p.x + hw + 1.6, p.z + u * p.d, -Math.PI / 2],
      }[s];
      out.push({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, ry, pen: p.id });
    }
  }
  return out;
}

// A strip `w` wide along a polyline, round at every bend (a disc at each
// point), as one geometry lying on the ground at height y.
function pathGeometry(walks, y) {
  const parts = [];
  for (const { w, p } of walks) {
    const pos = [];
    for (let i = 1; i < p.length; i++) {
      const [ax, az] = p[i - 1], [bx, bz] = p[i];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.01) continue;
      const nx = (-(bz - az) / len) * (w / 2), nz = ((bx - ax) / len) * (w / 2);
      pos.push(ax + nx, y, az + nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax + nx, y, az + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    parts.push(g);
    for (const [x, z] of p.filter((_, i) => i % 2 === 0)) parts.push(new THREE.CircleGeometry(w / 2, 12).rotateX(-Math.PI / 2).translate(x, y - 0.002, z));
  }
  for (const g of parts) if (g.index) g.copy(g.toNonIndexed());
  for (const g of parts) { for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a); }
  return mergeGeometries(parts);
}

// Round trees, instanced: trunks and crowns, a few greens.
function trees(scene, spots) {
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.26, 2, 6).translate(0, 1, 0), mat('#8a5a3b'), spots.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 0), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), spots.length);
  const greens = ['#6fb85f', '#7cc46e', '#8fcf7a', '#5fa852', '#95c97d'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z, s], i) => {
    trunk.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(s, s, s)));
    crown.setMatrixAt(i, m4.compose(v.set(x, 2.6 * s, z), q.setFromAxisAngle(up, i * 1.1), sc.set(s, s * 0.95, s)));
    crown.setColorAt(i, greens[i % greens.length]);
  });
  for (const m of [trunk, crown]) { m.computeBoundingSphere(); m.userData.noShadow = true; scene.add(m); }
}

// A seeded random, so every visitor's woods are the same.
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function buildZooPark(store, ROOM, EXIT) {
  const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfe9f7');
  scene.fog = new THREE.Fog('#cfe9f7', 70, 170);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fcf8a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.2);
  sun.position.set(10, 20, 8);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
  const colliders = GROUNDS.blockers.map((b) => ({ p: b.p }));
  const seats = [];

  // The ground: the zoo's lawn, and fields past its edge so it never ends in sky.
  const far = new THREE.Mesh(new THREE.PlaneGeometry(520, 520).rotateX(-Math.PI / 2), mat(FAR_GRASS));
  far.position.set(cx, -0.02, cz);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0).rotateX(-Math.PI / 2), mat(GRASS));
  lawn.position.set(cx, 0, cz);
  const paths = new THREE.Mesh(pathGeometry(GROUNDS.walks, 0.02), mat(PATH));
  for (const m of [far, lawn, paths]) { m.receiveShadow = true; scene.add(m); }

  // Trees: the zoo's woods (scripts/build-grand-park.mjs ZOO_WOODS), kept
  // off the paths, and a ring of wood outside the edge.
  const rnd = seeded(73);
  const onPath = (x, z, m) => GROUNDS.walks.some(({ w, p }) => p.some(([px, pz]) => Math.hypot(px - x, pz - z) < w / 2 + m));
  const spots = [];
  for (const wd of GROUNDS.woods) {
    const xs = wd.map((q) => q[0]), zs = wd.map((q) => q[1]);
    for (let x = Math.min(...xs) + 2; x < Math.max(...xs) - 1; x += 4.5) {
      for (let z = Math.min(...zs) + 2; z < Math.max(...zs) - 1; z += 4.5) {
        const px = x + (rnd() - 0.5) * 2.5, pz = z + (rnd() - 0.5) * 2.5, s = 0.8 + rnd() * 0.6;
        if (!onPath(px, pz, 1.6 * s)) spots.push([px, pz, s]);
      }
    }
  }
  for (let a = 0; a < Math.PI * 2; a += 0.035) { // the wood outside the zoo's edge, two rows deep
    for (const k of [0, 1]) {
      const r = 1.06 + k * 0.09 + rnd() * 0.04;
      const px = cx + Math.cos(a) * ((X1 - X0) / 2) * r, pz = cz + Math.sin(a) * ((Z1 - Z0) / 2) * r;
      const qx = Math.max(X0 - 18, Math.min(X1 + 18, px)), qz = Math.max(Z0 - 18, Math.min(Z1 + 18, pz));
      if (qx > X0 - 1.5 && qx < X1 + 1.5 && qz > Z0 - 1.5 && qz < Z1 + 1.5) continue;
      spots.push([qx, qz, 1 + rnd() * 0.7]);
    }
  }
  trees(scene, spots);

  // The zoo's own fence round its edge (you can't walk past it anyway: the
  // room's box), a gap where the way out is.
  const fence = [];
  const rail = (ax, az, bx, bz) => fence.push(new THREE.BoxGeometry(Math.hypot(bx - ax, bz - az), 0.08, 0.06).rotateY(-Math.atan2(bz - az, bx - ax)).translate((ax + bx) / 2, 0, (az + bz) / 2));
  for (const [ax, az, bx, bz] of [[X0, Z0, X1, Z0], [X1, Z0, X1, Z1], [X1, Z1, X0, Z1], [X0, Z1, X0, EXIT.z + 4], [X0, EXIT.z - 4, X0, Z0]]) {
    for (const y of [0.5, 1.15]) { rail(ax, az, bx, bz); fence[fence.length - 1].translate(0, y, 0); }
    const n = Math.round(Math.hypot(bx - ax, bz - az) / 2.5);
    for (let i = 0; i <= n; i++) fence.push(new THREE.BoxGeometry(0.12, 1.3, 0.12).translate(ax + ((bx - ax) * i) / n, 0.65, az + ((bz - az) * i) / n));
  }
  scene.add(new THREE.Mesh(mergeGeometries(fence.map((g) => g.toNonIndexed())), mat('#2f7d46')));

  // The way out: the back of the entrance building, a door and an "Exit"
  // sign over it, at the room's west edge.
  const back = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 20), mat('#fbf3e2'));
  back.position.set(X0 - 1.5, 3, EXIT.z);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, 21.6), mat('#3f9b5a'));
  roof.position.set(X0 - 1, 6.25, EXIT.z);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3), mat('#5d4a3a'));
  door.position.set(X0 + 0.02, 1.5, EXIT.z);
  door.rotation.y = Math.PI / 2;
  const exitTex = canvasTex(512, 160, (c, W, H) => {
    c.fillStyle = '#2f7d46'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fffaf0'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 64px sans-serif'; c.fillText('나가는 곳 · EXIT', W / 2, H / 2, W - 30);
  });
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.25), new THREE.MeshLambertMaterial({ map: exitTex }));
  exitSign.position.set(X0 + 0.03, 3.8, EXIT.z);
  exitSign.rotation.y = Math.PI / 2;
  scene.add(back, roof, door, exitSign);

  // The pens and their animals (core/zoo.js). The game sets zoo.onNotice.
  const zoo = new Zoo(scene, GROUNDS.pens);
  for (const P of zoo.pens) mergeStatic(P.g, [...P.animals.map((a) => a.root), P.roof]); // (fences, props, boards: a few meshes a pen)

  // The flower plaza, beds and borders, and the cart station (core/zoo-props.js).
  const fl = new THREE.Group();
  fl.position.set(GROUNDS.flowers.x, 0, GROUNDS.flowers.z);
  zooFlowers(fl, GROUNDS.flowers);
  scene.add(fl);
  const carts = new THREE.Group();
  carts.position.set(GROUNDS.carts.x, 0, GROUNDS.carts.z);
  zooCartStation(carts, GROUNDS.carts);
  scene.add(carts);

  // The Sea Animals hall's door on the north path (its walls are its pen's).
  const sd = GROUNDS.seaDoor;
  const hallDoor = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), mat('#2b4d6a'));
  hallDoor.position.set(sd.x, 1.6, sd.z - 0.06);
  hallDoor.rotation.y = Math.PI;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.8), mat('#bfe6f2'));
  glass.position.set(sd.x, 1.4, sd.z - 0.08);
  glass.rotation.y = Math.PI;
  scene.add(hallDoor, glass);

  // Benches round the flower plaza, facing the flowers.
  const PZ = GROUNDS.flowers, pr = PZ.plaza[0];
  const benchGeo = [];
  for (const a of [0.6, 2.5, 3.8, 5.6]) {
    const bx = PZ.x + Math.cos(a) * (pr + 1.4), bz = PZ.z + Math.sin(a) * (pr + 1.4), ry = Math.atan2(PZ.x - bx, PZ.z - bz);
    const put = (g) => benchGeo.push(g.rotateY(ry).translate(bx, 0, bz));
    put(new THREE.BoxGeometry(1.6, 0.08, 0.5).translate(0, 0.38, 0));
    put(new THREE.BoxGeometry(1.6, 0.4, 0.08).translate(0, 0.6, -0.25));
    for (const x of [-0.7, 0.7]) put(new THREE.BoxGeometry(0.08, 0.38, 0.45).translate(x, 0.19, 0));
    for (const o of [-0.4, 0.4]) {
      const sx = bx + Math.cos(ry) * o, sz = bz - Math.sin(ry) * o;
      seats.push({ x: sx, z: sz, ry, stand: [sx + Math.sin(ry) * 0.9, sz + Math.cos(ry) * 0.9] });
    }
  }
  scene.add(new THREE.Mesh(mergeGeometries(benchGeo.map((g) => (g.index ? g.toNonIndexed() : g))), mat('#c98b4f')));
  mergeStatic(scene, [...zoo.pens.map((P) => P.g), fl, carts]);
  // The camel ride's two camels and their stand (core/zoo-camel-ride.js; game/zoo-camels.js).
  const camels = GROUNDS.camels ? buildCamelRide(scene, GROUNDS.camels) : null;

  const stations = {
    watchers: patronSpots(GROUNDS.pens), // (not `patrons`: game/zoo-visit.js puts them there, to hide the far ones)
    seaDoor: [sd.out],
  };
  let time = 0;
  const tick = (dt, p) => {
    time += dt;
    const at = p ? { x: p.x, z: p.z } : { x: EXIT.x, z: EXIT.z };
    // Far pens aren't drawn: a pen is a dozen meshes and each animal a few dozen.
    for (const P of zoo.pens) {
      const d = Math.hypot(Math.max(0, Math.abs(at.x - P.pen.x) - P.pen.w / 2), Math.max(0, Math.abs(at.z - P.pen.z) - P.pen.d / 2)); // (to its fence)
      P.g.visible = d < VIEW;
      const near = d < ANIMAL_VIEW;
      if (P.near !== near) { P.near = near; if (!near) for (const a of P.animals) a.root.visible = false; }
      if (near) for (const a of P.animals) a.root.visible = Math.hypot(at.x - P.pen.x - a.root.position.x, at.z - P.pen.z - a.root.position.z) < (SMALL_ANIMALS.has(a.kind) ? SMALL_VIEW : ANIMAL_VIEW);
    }
    zoo.update(dt, at);
    camels?.tick(Date.now() / 1000, dt, at, camels.mine ?? -1);
  };
  tick(0, null);
  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, room: ROOM, exit: EXIT, entry: ZOO_PARK_ENTRY,
    stations, zoo, camels, zooPark: true, carts: GROUNDS.carts, walks: GROUNDS.walks, open: GROUNDS.open, tick, time: () => time,
  };
}
