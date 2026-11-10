// Another Land's island in Seokchon Lake, open to the street (stores.json
// "open", drawn over the street like a Han River park): the Cotton Candy
// Express exactly as it was (track, speed, station, attendant) with its candy
// wood round it; the Rainbow Wheel by the bridge, the Lollipop Drop beside
// the helix, the Sugar Swing in the coaster's north-west loop and the
// Macaron Gyro Swing south of the middle, each in its fenced yard with a gate
// off the island's walks (park-yards.js); a candy castle over the way in
// where the bridge lands (park-candy-house.js); and a round candy hall in the
// middle with the stairs down to the rest of the park under the island (the
// "another-land" room, store.below; park-hall.js). The room is in the
// coaster's own metres; the island's shore (store.open.lawn, the
// same metres) is its edge, with a gap where Another Land Bridge lands
// (store.open.bridge).
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { buildCoaster } from './coaster-model.js';
import { GATE as COASTER_GATE } from './coaster.js';
import { inPoly } from './geom.js';
import { bakeColors, mergeStatic } from './merge-static.js';
import { ISLAND_RIDES, RIDES, RIDE_GATES } from './park-rides.js';
import { buildDrop, buildWheel } from './park-ride-models.js';
import { buildSwing } from './park-new-rides.js';
import { buildGyro } from './park-gyro.js';
import { inYard, yardKit } from './park-yards.js';
import { HOUSE, buildCandyHouse } from './park-candy-house.js';
import { HALL, buildHall } from './park-hall.js';

const mat = matCache({ flatShading: true });

// The ticket booth and its guide (game/park-tickets.js) east of the walk
// from the bridge to the candy castle, so the first thing you meet on the
// island is someone to ask about tickets. The booth's window faces the walk
// (west); the guide stands by the walk, facing the bridge.
export const TICKET_BOOTH = { x: -23.6, z: -53.1 };
export const TICKET_GUIDE = { x: -27.3, z: -53.6, ry: -1.8 };
function buildTicketBooth(scene, block) {
  const { x, z } = TICKET_BOOTH;
  const box = (sx, sy, sz, px, py, pz, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c)); m.position.set(px, py, pz); scene.add(m); return m; };
  box(1.7, 0.22, 1.9, x, 0.11, z, '#e2a64a'); // plinth
  box(1.5, 2.2, 1.7, x, 1.21, z, '#ffd36e');
  box(0.06, 0.8, 1.0, x - 0.76, 1.4, z, '#5b3a2a'); // the window
  box(0.35, 0.08, 1.2, x - 0.9, 0.96, z, '#fffaf3'); // its counter
  for (let i = 0; i < 4; i++) { const a = box(0.7, 0.08, 0.46, x - 1.05, 2.1, z - 0.69 + i * 0.46, i % 2 ? '#fffaf3' : '#ff5a5f'); a.rotation.z = -0.35; } // awning
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.1, 4), mat('#ff7a8a'));
  roof.position.set(x, 2.85, z); roof.rotation.y = Math.PI / 4; scene.add(roof);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat('#ff3b55'));
  ball.position.set(x, 3.5, z); scene.add(ball);
  // A big ticket on a post by the walk: pink with a white stub.
  box(0.1, 1.6, 0.1, x - 1.6, 0.8, z + 1.25, '#fffaf3');
  box(0.08, 0.6, 1.0, x - 1.6, 1.85, z + 1.25, '#ff5f9e');
  box(0.09, 0.6, 0.28, x - 1.6, 1.85, z + 1.62, '#fffaf3');
  block(x, z, 1.7, 1.9);
  block(x - 1.6, z + 1.25, 0.3, 0.3);
}

// The shore as thin walls, but for the bridge's landing.
function shoreWalls(lawn, bridge, block) {
  for (let i = 0; i < lawn.length; i++) {
    const [x1, z1] = lawn[i], [x2, z2] = lawn[(i + 1) % lawn.length];
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.ceil(len / 1.5));
    for (let k = 0; k < n; k++) {
      const x = x1 + ((x2 - x1) * (k + 0.5)) / n, z = z1 + ((z2 - z1) * (k + 0.5)) / n;
      if (bridge && Math.hypot(x - bridge[0], z - bridge[1]) < 5.2) continue;
      block(x, z, 1.6, 1.6);
    }
  }
}

// The main walk ([x, z] points): from the bridge through the candy castle's
// archway, down past the hall's door to the coaster's station.
const WALK = [[-30.95, -45.6], [-23.2, -38.5], [-22, -12]];
// The walks off it to the rides' gates: from just inside the candy castle
// round the Ferris wheel to its gate, on under the airtime hill to the swing
// ride's; from the main walk east to the drop tower's and, further south, to
// the gyro swing's; and the few steps to the hall's door.
const SPURS = [
  [WALK[0], [-33.5, -39.6], [-42, -39.6]],
  [[-42, -39.6], [-48.5, -39.6], [-48.5, -29], [-50.3, -29]],
  [[-22.9, RIDES.drop.z], [RIDES.drop.x - 3.6, RIDES.drop.z]],
  [[-23.6, RIDES.gyro.z + 5.9], [RIDES.gyro.x, RIDES.gyro.z + 5.9], [RIDES.gyro.x, RIDES.gyro.z + 4.4]],
];
// Where the rides' moving parts reach past their yards (the wheel's rim and
// gondolas), kept clear of the candy wood too.
const wheelSweep = (x, z, m) => Math.abs(x - RIDES.wheel.x) < RIDES.wheel.r + 1.5 + m && Math.abs(z - RIDES.wheel.z) < 2 + m;

// buildCandyLand (themepark.js) comes in as `candyLand` so this file needn't
// import themepark.js back.
export function buildIsland(store, ROOM, EXIT, { candyLand }) {
  const scene = new THREE.Scene(); // (no background: the street is drawn behind it)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9fcf8a, 1.6);
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.2);
  sun.position.set(10, 20, 8);
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(hemi, sun, ambient);
  const colliders = [], seats = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const { lawn, bridge, house, hall } = store.open;
  const onIsland = (x, z, r = 0) => inPoly(x, z, lawn) && [[x + r, z], [x - r, z], [x, z + r], [x, z - r]].every(([a, b]) => inPoly(a, b, lawn));
  shoreWalls(lawn, bridge, block);

  const coaster = buildCoaster(scene, block, { lowSpec: typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || navigator.hardwareConcurrency <= 4) });
  const stations = {
    coaster: [{ x: COASTER_GATE.x, z: COASTER_GATE.z, ry: -Math.PI / 2 }],
    coasterStaff: [{ x: COASTER_GATE.x - 0.8, z: COASTER_GATE.z + 1.7, ry: Math.PI / 2 }],
  };
  // The candy castle over the way in and the hall with the stairs down.
  const gate = buildCandyHouse(scene, block, mat, house);
  const down = buildHall(scene, block, mat, hall);
  stations.ticketGuide = [TICKET_GUIDE];
  stations.underground = [{ x: down.door.x, z: down.door.z, ry: hall.ry }];
  const spurs = [...SPURS, [[WALK[2][0] - 0.4, down.door.z], [down.door.x, down.door.z]]];
  buildTicketBooth(scene, block);
  const built = (x, z, m) => (Math.abs(x - TICKET_BOOTH.x) < 2.6 + m && Math.abs(z - TICKET_BOOTH.z) < 2.6 + m) || (Math.abs(x - house.x) < HOUSE.w / 2 + 1.4 + m && Math.abs(z - house.z) < HOUSE.d / 2 + 1.4 + m) || Math.hypot(x - hall.x, z - hall.z) < HALL.r + 1.6 + m;

  // The candy wood, ponds, benches and cotton candy cart, kept on the island
  // and off the walk from the bridge to the station.
  const walk = [bridge, ...WALK, [COASTER_GATE.x + 1.5, COASTER_GATE.z]];
  const legs = (pts) => pts.slice(1).map((b, i) => [pts[i], b]);
  candyLand(scene, block, seats, stations, { X0: ROOM.x0, X1: ROOM.x1, Z0: ROOM.z0, Z1: ROOM.z1 }, {
    inside: (x, z, r) => onIsland(x, z, r + 1.2) && !ISLAND_RIDES.some((k) => inYard(k, x, z, r + 1)) && !wheelSweep(x, z, r) && !built(x, z, r),
    keep: [...legs(walk.slice(1)), ...spurs.flatMap(legs)],
  });

  // Biscuit walks: from the bridge through the candy castle and on to the
  // station, and off it to the rides' gates and the hall (the spurs a hair
  // higher, so the joins don't flicker).
  [walk, ...spurs].forEach((pts, k) => {
    for (const [[x1, z1], [x2, z2]] of legs(pts)) {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(k ? 2.8 : 3.2, len + (k ? 2.8 : 3.2)).rotateX(-Math.PI / 2), mat('#ffe27a'));
      tile.position.set((x1 + x2) / 2, 0.05 + k * 0.002, (z1 + z2) / 2);
      tile.rotation.y = Math.atan2(x2 - x1, z2 - z1);
      scene.add(tile);
    }
  });

  // The rides: the Rainbow Wheel and the Lollipop Drop (park-ride-models.js),
  // the Sugar Swing (park-new-rides.js) and the Macaron Gyro Swing
  // (park-gyro.js), each in its yard with a named gate and an attendant.
  const wheel = buildWheel(scene, block), drop = buildDrop(scene, block), swing = buildSwing(scene, block, mat), gyro = buildGyro(scene, block, mat);
  const yards = yardKit(scene, block);
  for (const k of ISLAND_RIDES) yards.yard(k);
  yards.done();
  const rides = ISLAND_RIDES.map((kind) => ({ kind, x: RIDE_GATES[kind].x, z: RIDE_GATES[kind].z }));
  stations.rideStaff = ISLAND_RIDES.map((kind) => ({ kind, ...RIDE_GATES[kind].staff }));
  // A few more guests: at the wheel's gate, watching the swing ride and the gyro swing.
  stations.patrons = [...(stations.patrons || []), { x: -37.6, z: -39, ry: Math.PI }, { x: -47.2, z: -34, ry: -Math.PI / 2 }, { x: -4.6, z: -5.6, ry: Math.PI }, { x: -10.6, z: -24, ry: Math.PI }];

  const tick = (dt) => {
    const now = Date.now() / 1000; // (the shared clock: everyone sees the same ride)
    coaster.tick(now, dt);
    wheel.tick(now);
    drop.tick(now);
    swing.tick(now);
    gyro.tick(now);
  };
  tick(0);
  // Everything that never moves baked into one mesh, each part keeping its
  // colour (it's drawn over the street whenever you're near), then what's
  // left (the bulbs) merged by material.
  const moving = [...coaster.trains.flat(), down.sign.mesh, ...gate.glow, wheel.root, wheel.wheel, ...wheel.cabins, drop.root, drop.ring, ...swing.keep, ...gyro.keep];
  bakeColors(scene, moving);
  mergeStatic(scene, moving);
  return {
    scene, products: [], vendors: [], colliders, seats, clerk: null, turntable: null, room: ROOM, exit: { x: WALK[0][0], z: WALK[0][1] + 1.4 }, // (enterStore puts you 1.4 m short of it: just through the candy castle)
    rides, stations, tick, themepark: true, island: true, coaster, lights: { hemi, ambient, sun },
    setSignLang: (lang) => { coaster.setSignLang(lang); down.sign.draw(lang); yards.setSignLang(lang); },
    setNight: (k) => gate.setNight(k), // (the castle gate's windows, name and bulbs light up)
  };
}
