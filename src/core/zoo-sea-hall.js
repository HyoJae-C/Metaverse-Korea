// The zoo's Sea Animals hall (Children's Grand Park) as a room of its own:
// you walk in through its door in the zoo (core/zoo-park.js; the store is
// zoo-rooms.js SEA_STORE, workshop "zoo-sea") and the room takes over the
// screen, like Modu Land's haunted house.
// Sea-blue walls with fish painted on, a high ceiling with strip lights, and
// three tanks along the back behind glass: seals, a walrus and a polar bear.
// The tanks and their animals are zoo pens (core/zoo.js), in room metres:
// door at +z, tanks towards -z, their glass fronts facing you ("s").
import * as THREE from 'three';
import { matCache, canvasTex } from './three-kit.js';
import { Zoo, seaWall } from './zoo.js';
import { SEA_ROOM } from './zoo-rooms.js';

const mat = matCache();
export { SEA_ROOM };
const L = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const TANK = { z: -5.5, w: 7.6, d: 12 }; // centre z and size of each tank (back at -HD + 0.5)

export const SEA_TANKS = [
  {
    id: 'seals', x: -8.6, z: TANK.z, w: TANK.w, d: TANK.d, fence: 'tank', ground: 'stone', board: false, front: 's',
    name: L('물개', 'Seals', 'アザラシ', '海豹'),
    pond: [0, -1.5, 3.2], props: [['rock', 2, 3.5]],
    groups: [{ kind: 'seal', n: 3 }],
    feed: { at: [-1.5, 4], offset: 360, food: 'fish' },
  },
  {
    id: 'walrus', x: 0, z: TANK.z, w: TANK.w, d: TANK.d, fence: 'tank', ground: 'stone', board: false, front: 's',
    name: L('바다코끼리', 'Walrus', 'セイウチ', '海象'),
    pond: [0, -2, 3.2], props: [['rock', -2, 4]],
    groups: [{ kind: 'walrus', n: 1 }],
  },
  {
    id: 'polarbear', x: 8.6, z: TANK.z, w: TANK.w, d: TANK.d, fence: 'tank', ground: 'stone', board: false, front: 's',
    name: L('북극곰', 'Polar Bear', 'ホッキョクグマ', '北极熊'),
    pond: [0, -2.5, 3], props: [['rock', 2, 4]],
    groups: [{ kind: 'polarbear', n: 1 }],
  },
];

// A wall-mounted sign, w × h metres, facing +z: Korean over English.
function sign(w, h, ko, en) {
  const tex = canvasTex(1024, Math.round((1024 * h) / w), (c, W, H) => {
    c.fillStyle = '#0f4f7a'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${Math.round(H * 0.42)}px sans-serif`; c.fillText(ko, W / 2, H * 0.36, W - 40);
    c.font = `600 ${Math.round(H * 0.26)}px sans-serif`; c.fillText(en, W / 2, H * 0.76, W - 40);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

export function buildSeaHall(store, ROOM = SEA_ROOM, EXIT = { x: 0, z: ROOM.d / 2 - 0.9 }) {
  const { w, d, h } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d3552');
  scene.add(new THREE.HemisphereLight(0xeaf7ff, 0x5d7f99, 1.7));
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const g = new THREE.Group();
  scene.add(g);
  const put = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; g.add(o); return o; };

  // Floor, walls facing in (single-sided, so the camera behind you sees through), ceiling.
  put(new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat('#d9e3e8')), 0, 0, 0);
  const wall = new THREE.MeshLambertMaterial({ map: seaWall() });
  for (const [len, x, z, ry] of [[w, 0, -d / 2, 0], [d, -w / 2, 0, Math.PI / 2], [d, w / 2, 0, -Math.PI / 2], [w, 0, d / 2, Math.PI]]) {
    put(new THREE.Mesh(new THREE.PlaneGeometry(len, h), wall), x, h / 2, z, ry);
    const band = put(new THREE.Mesh(new THREE.PlaneGeometry(len, 0.5), mat('#3f86b8')), x, 0.25, z, ry); // a blue skirting band
    band.position.addScaledVector(new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)), 0.01);
  }
  put(new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), mat('#1f4f75')), 0, h, 0);
  for (let x = -w / 2 + 3; x < w / 2 - 1; x += 5) put(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, d - 4), new THREE.MeshBasicMaterial({ color: '#eaf7ff' })), x, h - 0.06, 0);
  // The door back out, and the hall's name over the tanks.
  put(new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3), mat('#2b4d6a')), EXIT.x, 1.5, d / 2 - 0.02, Math.PI);
  put(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), mat('#bfe6f2')), EXIT.x, 1.3, d / 2 - 0.04, Math.PI);
  put(sign(9, 1.5, '바다동물관', 'Sea Animals'), 0, 6.4, -d / 2 + 0.05);
  // Each tank's name on the wall over it (a board in front would hide the glass).
  for (const t of SEA_TANKS) put(sign(4.2, 1.1, t.name.ko, t.name.en), t.x, 4.6, -d / 2 + 0.05);
  // Benches down the middle of the walkway, to sit and watch.
  for (const x of [-5, 5]) {
    put(new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.7), mat('#a77a50')), x, 0.42, 5.5);
    for (const s of [-1, 1]) put(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.6), mat('#6b4a33')), x + s * 1.3, 0.21, 5.5);
  }

  // The tanks and their animals (core/zoo.js): you can't walk into them.
  const zoo = new Zoo(scene, SEA_TANKS);
  const colliders = SEA_TANKS.map((t) => {
    const [x0, z0, x1, z1] = [t.x - t.w / 2, t.z - t.d / 2, t.x + t.w / 2, t.z + t.d / 2];
    return { p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] };
  });
  for (const x of [-5, 5]) colliders.push({ p: [[x - 1.5, 5.2], [x + 1.5, 5.2], [x + 1.5, 5.8], [x - 1.5, 5.8]] });
  const seats = [];
  for (const x of [-5, 5]) for (const dx of [-0.8, 0.8]) seats.push({ x: x + dx, z: 5.5, ry: Math.PI, stand: [x + dx, 4.6] }); // (facing the tanks)
  return {
    scene, products: [], colliders, seats, clerk: null, room: ROOM, exit: EXIT, stations: {}, zooHall: zoo,
    tick(dt, p) { zoo.update(dt, p ? { x: p.x, z: p.z } : { x: 0, z: EXIT.z }); },
  };
}
