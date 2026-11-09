// Another Land (어나더랜드), the candy-house theme park: an outdoor "room"
// entered through its gate east of Seongsu (the outside is anotherland.js),
// with a carousel, a Ferris wheel, a swinging pirate ship, a drop tower,
// bumper cars (game/bumper.js), a swing ride, teacups, a park train, a log
// flume and a mirror maze (park-new-rides.js) spread round the central plaza along winding
// paths (park-grounds.js), food trucks (park-food.js), a balloon clown
// (game/balloon-clown.js), and the Cotton Candy Express roller coaster
// (coaster.js) in the land the park grew into, north and west. Each ride has a
// boarding spot; on a ride the player is carried by seatAt(). Same shape as
// buildInterior's result, plus tick(dt) to animate the rides.
import * as THREE from 'three';
import { HAUNT, HAUNT_SPOT, buildHauntedFacade } from './haunted.js';
import { matCache } from './three-kit.js';
import { buildBumperRink } from './bumper-rink.js';
import { buildCoaster } from './coaster-model.js';
import { GATE as COASTER_GATE, trackPoints } from './coaster.js';

const mat = matCache({ flatShading: true });

// The rides as numbers: park-rides.js (kept apart so main.js needn't load
// this file, which comes on the first visit).
export { RIDE_PRICE, RIDE_PASS, RIDE_SECONDS, RIDES, dropY, rideUntil, seatAt } from './park-rides.js';
import { RIDE_GATES } from './park-rides.js';
import { buildGrounds } from './park-grounds.js';
import { buildCarousel, buildDrop, buildViking, buildWheel } from './park-ride-models.js';
import { mergeStatic } from './merge-static.js';
import { buildFoodTrucks } from './park-food.js';
import { buildSwing, buildTeacups, buildTrain, buildFlume, buildMirrorMaze } from './park-new-rides.js';

export function buildThemePark(store, ROOM, EXIT) {
  const { w, d } = ROOM;
  // The park's edges. The gate is at the south (z1); the coaster's land
  // reaches far to the west and north of the old square.
  const X0 = ROOM.x0 ?? -w / 2, X1 = ROOM.x1 ?? w / 2, Z0 = ROOM.z0 ?? -d / 2, Z1 = ROOM.z1 ?? d / 2;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ffe3f0');
  scene.fog = new THREE.Fog('#ffe3f0', 45, 140);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fcf8a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.2);
  sun.position.set(10, 20, 8);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const colliders = [];
  const seats = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const add = (geo, color, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (sx, sy, sz, x, y, z, color, parent) => add(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z, parent);

  // The grounds: paths, the plaza and its fountain, the yards' fences and
  // named gates, lamps, flowers, benches, the park's fence (park-grounds.js).
  const grounds = buildGrounds(scene, block, seats, { X0, X1, Z0, Z1 });

  // The Candy Carousel and the Choco Viking (park-ride-models.js).
  const carousel = buildCarousel(scene, block);
  const viking = buildViking(scene, block);

  // The Rainbow Wheel and the Lollipop Drop (park-ride-models.js).
  const wheel = buildWheel(scene, block);
  const drop = buildDrop(scene, block);

  // The Sugar Swing and the Teacup Party south of the food truck lane, the
  // Candy Train in the south-east corner, the Jelly Flume in the north-east
  // field and the Mirror Maze off the east promenade (park-new-rides.js).
  const swing = buildSwing(scene, block, mat);
  const teacups = buildTeacups(scene, block, mat);
  const train = buildTrain(scene, block, mat);
  const flume = buildFlume(scene, block, mat);
  const maze = buildMirrorMaze(scene, block, mat);

  // Ticket booth (매표소) by the entrance. Its window faces the gate
  // square (south), under a striped awning.
  const TB = { x: -6, z: Z1 - 4.5 };
  box(2.2, 2.3, 1.6, TB.x, 1.15, TB.z, '#ffd36e');
  box(2.36, 0.25, 1.76, TB.x, 0.12, TB.z, '#e2a64a'); // plinth
  box(1.2, 0.8, 0.06, TB.x, 1.35, TB.z + 0.8, '#5b3a2a'); // the window
  box(1.4, 0.08, 0.35, TB.x, 0.92, TB.z + 0.95, '#fffaf3'); // its counter
  for (let i = 0; i < 5; i++) { const a = box(0.5, 0.08, 0.7, TB.x - 1 + i * 0.5, 2.05, TB.z + 1.1, i % 2 ? '#fffaf3' : '#ff5a5f'); a.rotation.x = 0.35; }
  add(new THREE.ConeGeometry(1.5, 1.2, 4), '#ff7a8a', TB.x, 2.9, TB.z).rotation.y = Math.PI / 4;
  add(new THREE.SphereGeometry(0.2, 10, 8), '#ff3b55', TB.x, 3.6, TB.z);
  block(TB.x, TB.z, 2.3, 1.7);
  // The food trucks on the lane to the bumper cars (park-food.js): ice
  // cream, churros and hot dogs, bought like a market stall's goods.
  const food = buildFoodTrucks(scene, block, mat);

  // Balloon shooting gallery (풍선 사격): a striped booth with rows of
  // balloons, toy cork guns on the counter (the game is ui/gallery-ui.js).
  const G = { x: -20, z: -1 }; // on the coaster's avenue, facing it
  box(4.4, 2.8, 0.2, G.x, 1.4, G.z - 1, '#fff3d6'); // back wall
  for (const sx of [-2.1, 2.1]) box(0.2, 2.8, 2, G.x + sx, 1.4, G.z, '#ff7a8a'); // sides
  for (let i = 0; i < 6; i++) box(0.75, 0.3, 2.3, G.x - 1.9 + i * 0.76, 2.95, G.z + 0.1, i % 2 ? '#fffaf3' : '#ff5a5f'); // awning
  box(4.2, 1, 0.5, G.x, 0.5, G.z + 0.9, '#ffd36e'); // counter
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
    add(new THREE.SphereGeometry(0.17, 10, 8), ['#ff5a5f', '#ffd36e', '#8fd0ff', '#c9a8ff', '#8fe3c7'][(i + r * 2) % 5], G.x - 1.5 + i * 0.6, 1.2 + r * 0.55, G.z - 0.82);
  }
  for (const sx of [-0.8, 0.8]) box(0.6, 0.08, 0.1, G.x + sx, 1.05, G.z + 0.9, '#7a4a2e'); // toy guns
  block(G.x, G.z, 4.4, 2.4);
  // Haunted house (귀신의 집, core/haunted.js): left of the entrance, facing
  // into the park. Its door leads into its own interior.
  const haunt = buildHauntedFacade();
  haunt.group.position.set(HAUNT.x, 0, HAUNT.z);
  haunt.group.rotation.y = Math.PI;
  haunt.group.updateMatrix();
  haunt.group.matrixAutoUpdate = false;
  scene.add(haunt.group);
  block(HAUNT.x, HAUNT.z - 0.1, 6.2, 4.6);
  const stations = {
    gallery: [{ x: G.x, z: G.z + 2.2, ry: Math.PI }], // facing the targets
    hauntedHouse: [HAUNT_SPOT],
    booth: [{ x: -6, z: Z1 - 2.4, ry: Math.PI }], // the ticket window: the ride-all day pass
  };

  // Bumper cars (범퍼카, core/bumper-rink.js): right of the plaza.
  const bumper = buildBumperRink(scene, block);

  // The Cotton Candy Express (coaster-model.js), and its land: only when
  // the park is the big one (an old saved room size has no space for it).
  let coaster = null;
  if (X0 < -60 && Z0 < -35) {
    coaster = buildCoaster(scene, block, { lowSpec: typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || navigator.hardwareConcurrency <= 4) });
    stations.coaster = [{ x: COASTER_GATE.x, z: COASTER_GATE.z, ry: -Math.PI / 2 }];
    // The attendant stands at the gate, facing people coming from the park.
    stations.coasterStaff = [{ x: COASTER_GATE.x - 0.8, z: COASTER_GATE.z + 1.7, ry: Math.PI / 2 }];
    buildCandyLand(scene, block, seats, stations, { X0, X1, Z0, Z1 });
  }

  // Where you board each ride (in front of it).
  const rides = ['carousel', 'wheel', 'viking', 'drop', 'swing', 'teacups', 'train', 'flume'].map((kind) => ({ kind, x: RIDE_GATES[kind].x, z: RIDE_GATES[kind].z }));
  // Each ride's attendant, by its gate (the bumper cars' too), named after the ride.
  stations.rideStaff = [
    ...rides.map(({ kind }) => ({ kind, ...RIDE_GATES[kind].staff })),
    { kind: 'bumper', x: bumper.gate.x - 0.9, z: bumper.gate.z - 1.6, ry: -Math.PI / 2 },
  ];
  // Guests already here: round the fountain, at the rides' fences, on Main Street.
  stations.patrons = [
    ...(stations.patrons || []),
    { x: 3.4, z: 6.6, ry: -2.2 }, { x: -3.2, z: 0.2, ry: 0.6 }, { x: -1.4, z: 17, ry: Math.PI },
    { x: 1.6, z: 23.5, ry: Math.PI }, { x: 13.4, z: 1.6, ry: Math.PI * 0.9 }, { x: 21, z: -2.2, ry: Math.PI }, // (looking up at the wheel)
    { x: 12.2, z: 10.7, ry: Math.PI }, { x: 18.9, z: 12.2, ry: Math.PI }, { x: 25.1, z: 13.5, ry: Math.PI }, // at the food trucks
    { x: 32.6, z: 19, ry: Math.PI / 2 }, { x: 44.6, z: -1.2, ry: -2.4 }, // watching the bumper cars, the drop tower
    { x: 19.4, z: 16.4, ry: 0.4 }, { x: 31.4, z: 21.4, ry: -0.3 }, // at the swing's and the teacups' fences
    { x: 47.2, z: 19.2, ry: Math.PI / 2 }, { x: 51.6, z: -12.2, ry: Math.PI }, { x: 37.6, z: -1.8, ry: Math.PI }, // on the train's platform, at the flume, by the maze
  ];

  let time = 0;
  const tick = (dt) => {
    time += dt;
    const now = Date.now() / 1000; // (every ride runs on the shared clock: friends see the same ride)
    carousel.tick(now);
    viking.tick(now);
    wheel.tick(now);
    drop.tick(now);
    swing.tick(now);
    teacups.tick(now);
    train.tick(now);
    flume.tick(now);
    bumper.tick(dt);
    coaster?.tick(Date.now() / 1000, dt);
  };
  tick(0);
  // Everything that never moves, baked into a mesh per colour (merge-static.js).
  mergeStatic(scene, [carousel.root, viking.root, viking.swing, wheel.root, wheel.wheel, ...wheel.cabins, drop.root, drop.ring, ...swing.keep, ...teacups.keep, ...train.keep, ...flume.keep, ...maze.keep, haunt.group, ...bumper.cars.map((c) => c.g), ...(coaster?.trains.flat() || [])]);

  return {
    scene, products: food.products, vendors: food.vendors, colliders, seats, clerk: { x: -6, z: Z1 - 3.6, ry: 0 }, turntable: null, room: ROOM, exit: EXIT,
    rides, stations, tick, time: () => time, park: true, themepark: true, bumper, coaster, // (themepark: only Another Land; the Han River parks are `park: true` too)
    setSignLang: (lang) => { haunt.setSignLang(lang); coaster?.setSignLang(lang); grounds.setSignLang(lang); food.setSignLang(lang); },
  };
}

// The land round the coaster: lollipop and gumdrop trees (instanced, so a
// whole wood is two draw calls), a jelly pond inside the coaster's loop and
// one in the north field, benches, a cotton candy cart by the station, and
// a few guests already there (stations.patrons: main.js puts people there).
function buildCandyLand(scene, block, seats, stations, { X0, X1, Z0, Z1 }) {
  const track = trackPoints().filter((_, i) => i % 6 === 0);
  const clear = (x, z, r) => track.every((p) => Math.hypot(p.x - x, p.z - z) > r);
  const busy = [[-31, 2, 6], [-28, 2, 5], [-22, 3, 3], [0, -24, 3]]; // station, its square, the paths
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const spots = [];
  for (let n = 0; spots.length < 60 && n < 1400; n++) {
    const x = X0 + 2 + rnd() * (X1 - X0 - 4), z = Z0 + 2 + rnd() * (Z1 - Z0 - 4);
    if (x > -25 && z > -15) continue; // the park round the plaza: its own garden (park-grounds.js)
    if (!clear(x, z, 3.2) || busy.some(([bx, bz, r]) => Math.hypot(x - bx, z - bz) < r + 1.5)) continue;
    if (Math.hypot(x + 21, z + 28.5) < 6 || Math.hypot(x + 42, z - 1) < 8) continue; // the ponds
    if (x > 39 && z < -11) continue; // the log flume's field
    if (spots.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 3.4)) continue;
    spots.push([x, z, rnd()]);
  }
  const pops = spots.filter((_, i) => i % 2 === 0), drops = spots.filter((_, i) => i % 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const sticks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6).translate(0, 1.5, 0), mat('#fffaf3'), pops.length);
  const heads = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 16).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ flatShading: true }), pops.length);
  const popCols = ['#ff8fb8', '#c9a8ff', '#8fe3c7', '#ffe27a'].map((c) => new THREE.Color(c));
  pops.forEach(([x, z, r], i) => {
    const k = 0.8 + r * 0.6;
    sticks.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, k, 1)));
    q.setFromAxisAngle(v.set(0, 1, 0), r * Math.PI * 2);
    heads.setMatrixAt(i, m4.compose(v.set(x, 3 * k + 0.9 * k, z), q, sc.set(k, k, k)));
    heads.setColorAt(i, popCols[i % popCols.length]);
    block(x, z, 0.4, 0.4);
  });
  const gums = new THREE.InstancedMesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshLambertMaterial({ flatShading: true }), drops.length);
  const gumCols = ['#ffe27a', '#ff5a5f', '#8fd0ff', '#ffad6b', '#a6e3a1'].map((c) => new THREE.Color(c));
  drops.forEach(([x, z, r], i) => {
    const k = 0.7 + r * 0.6;
    gums.setMatrixAt(i, m4.compose(v.set(x, 0.45 * k, z), q.identity(), sc.set(k, 0.8 * k, k)));
    gums.setColorAt(i, gumCols[i % gumCols.length]);
    block(x, z, 1.9 * k, 1.9 * k);
  });
  scene.add(sticks, heads, gums);
  // Jelly ponds: a glossy pink one in the north field, a mint one inside
  // the coaster's loop by the station.
  for (const [x, z, rx, rz, c] of [[-21, -28.5, 4.2, 3, '#ff9ec7'], [-42, 1, 6, 4.4, '#9fe8d2']]) {
    const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0.85 }));
    pond.scale.set(rx, 1, rz);
    pond.position.set(x, 0.03, z);
    scene.add(pond);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 5, 28).rotateX(Math.PI / 2), mat('#fffaf3'));
    rim.scale.set(rx, rz, 1);
    rim.position.set(x, 0.06, z);
    scene.add(rim);
    block(x, z, rx * 1.7, rz * 1.7);
  }
  // Benches facing the north pond and the station.
  const bench = (bx, bz, ry) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.5), mat('#c98b4f'));
    seat.position.y = 0.38;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.08), mat('#c98b4f'));
    back.position.set(0, 0.6, -0.25);
    g.add(seat, back);
    g.position.set(bx, 0, bz);
    g.rotation.y = ry;
    scene.add(g);
    const side = Math.abs(Math.sin(ry)) > 0.5; // (turned a quarter: long along z)
    block(bx, bz, side ? 0.6 : 1.7, side ? 1.7 : 0.6);
    for (const o of [-0.4, 0.4]) {
      const sx = bx + Math.cos(ry) * o, sz = bz - Math.sin(ry) * o;
      seats.push({ x: sx, z: sz, ry, stand: [sx + Math.sin(ry) * 0.9, sz + Math.cos(ry) * 0.9] });
    }
  };
  bench(-21, -23.6, Math.PI); // looking at the pond and the helix behind it
  bench(-24.2, 9, -Math.PI / 2); // by the station, watching the trains come in
  // Cotton candy cart by the station's way in.
  const cart = new THREE.Group();
  const cb = (sx, sy, sz, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c)); m.position.set(x, y, z); cart.add(m); };
  cb(1.5, 0.9, 0.9, 0, 0.55, 0, '#fff3d6');
  cb(1.6, 0.08, 1, 0, 1.0, 0, '#ff8fb8');
  for (const [x, c] of [[-0.45, '#ffb3d1'], [0, '#c9b3ff'], [0.45, '#a8e8ff']]) {
    const fluff = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(c));
    fluff.position.set(x, 1.45, 0);
    fluff.scale.y = 1.2;
    cart.add(fluff);
    cb(0.03, 0.4, 0.03, x, 1.2, 0, '#fffaf3');
  }
  cb(0.06, 1.4, 0.06, 0.7, 1.7, 0, '#d9dde2');
  const umb = new THREE.Mesh(new THREE.ConeGeometry(1, 0.5, 10), mat('#ff5f9e'));
  umb.position.set(0, 2.5, 0);
  cart.add(umb);
  cart.position.set(-25, 0, -6.6);
  scene.add(cart);
  block(-25, -6.6, 1.6, 1);
  // Guests already here: watching from the platform's end, at the pond,
  // and in the candy wood.
  stations.patrons = [
    { x: -26.6, z: 7.6, ry: -Math.PI / 2 },
    { x: -23.8, z: -6.4, ry: -Math.PI / 2 },
    { x: -19.6, z: -25.2, ry: Math.PI },
    { x: -22.6, z: -25, ry: Math.PI * 0.85 },
    { x: -46, z: -30, ry: 0.4 },
  ];
}
