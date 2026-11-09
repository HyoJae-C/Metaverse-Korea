// Another Land's grounds (themepark.js builds the rides on top): the paved
// paths with their curbs, Main Street from the gate to the round central
// plaza and its cake fountain, a low candy fence round each ride's yard with
// a named gate, the park's own fence, lamps, flower beds, bunting, benches,
// and a candy wood outside the fence so the park doesn't end in bare grass.
// Everything that repeats is instanced; the rest is plain still meshes that
// themepark.js merges (merge-static.js), so the whole lot is a few draw calls.
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { PLAZA, RIDES, RIDE_GATES, UNDER_RIDES, FOOD_TRUCKS, CLOWN, MAZE, TRAIN_TRACK, FLUME_TRACK, FLUME_POOL, trackDist } from './park-rides.js';
import { YARDS, gateSign, inYard, yardKit } from './park-yards.js';
import { RINK as RINK_AT } from './bumper-cars.js';

const mat = matCache({ flatShading: true });
const PAVE = '#f4e4c6', CURB = '#d9a77c', PLAZA_PINK = '#f9cdd8';
const ICING = '#fffaf3', PINK = '#ff8fb8', HOT = '#ff5f9e', MINT = '#8fe3c7', LEMON = '#ffe27a', LILAC = '#c9a8ff';

// The paths (room metres): each a strip `w` wide along its points, paved
// with rounded joints so the bends read as one winding walk, theme-park
// style. Main Street from the gate square up to the central plaza; the
// coaster's avenue west, with spurs to the carousel, the pirate ship and the
// haunted house's lane; the long east promenade; the food truck lane
// south-east to the bumper cars, joined back to the promenade, with a spur
// south to the teacups and on round the bumper cars to the train's station;
// off the promenade, the
// mirror maze and the walk up to the log flume; and the walk north under
// the coaster's helix.
export const PATHS = [
  { w: 6.6, pts: [[-10, 30.3], [10, 30.3]] }, // gate square
  { w: 5, pts: [[0, 33.6], [0, 9]] }, // Main Street
  { w: 3.6, pts: [[-5, 4.2], [-13, 3.4], [-21, 4], [-28.6, 4.4]] }, // west avenue, to the coaster's platform
  { w: 2.8, pts: [[-6.4, 5.4], [-6.8, 10.6], [-8.2, 12], [-10.6, 12]] }, // → carousel
  { w: 3, pts: [[-9.2, 3.6], [-8.8, -1.6], [-8.4, -6.4]] }, // → pirate ship
  { w: 3, pts: [[-2.4, 19.6], [-8.6, 19], [-15, 20.4]] }, // → haunted house
  { w: 3.2, pts: [[0, -1.5], [0, -34]] }, // north, under the coaster
  { w: 3.6, pts: [[5.6, 2.6], [13, 0.4], [22, -1.4], [31, -0.6], [40, 0.2], [44, -3.4]] }, // the east promenade
  { w: 3.4, pts: [[4.6, 7.2], [11, 11.6], [19, 13.6], [27, 15.4], [33.6, 16]] }, // food truck lane → bumper cars
  { w: 3, pts: [[31, -0.6], [29.6, 7], [28.4, 15]] }, // promenade ↔ food truck lane
  { w: 2.8, pts: [[29.3, 15.6], [29.5, 23.3]] }, // → teacups
  { w: 2.6, pts: [[29.5, 21.6], [33.15, 22.8], [36.5, 24.4], [42, 24.6], [45.9, 24.2]] }, // round the bumper cars → the train
  { w: 2.8, pts: [[MAZE.door[0], -0.4], [MAZE.door[0], MAZE.door[1] + 0.2]] }, // → mirror maze
  { w: 2.4, pts: [[MAZE.exit[0] - 0.2, MAZE.exit[1]], [42.4, MAZE.exit[1] + 0.4], [43.4, -6]] }, // out of the maze, back to the flume walk
  { w: 3, pts: [[43, -2.6], [44, -9], [50, -11.8], [54.5, -12.6]] }, // promenade → log flume
];
// Where a path's paving is: within half its width of one of its stretches.
export function pathDist(path, x, z) {
  let best = Infinity;
  for (let i = 1; i < path.pts.length; i++) {
    const [ax, az] = path.pts[i - 1], [bx, bz] = path.pts[i], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = L2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)) : 0;
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
export const onPath = (x, z, m = 0) => PATHS.some((p) => pathDist(p, x, z) < p.w / 2 + m);
// The room's rides with a fenced yard (the train and the flume board from
// their platforms).
const UNDER_YARDS = UNDER_RIDES.filter((k) => YARDS[k]);

export function buildGrounds(scene, block, seats, { X0, X1, Z0, Z1 }) {
  const add = (geo, color, x, y, z) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); scene.add(m); return m; };
  const box = (sx, sy, sz, x, y, z, color) => add(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z);
  const signs = [];

  // Grass, then the paving: each path a pale slab on a slightly wider curb.
  add(new THREE.PlaneGeometry(260, 200).rotateX(-Math.PI / 2), '#a6d98a', (X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  // (each stretch a slab on a slightly wider curb, a round pad at every
  // point so the bends are smooth; later paths sit a hair higher so
  // crossings don't flicker)
  PATHS.forEach(({ w, pts }, k) => {
    const y = k * 0.0015;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], len = Math.hypot(bx - ax, bz - az), ry = -Math.atan2(bz - az, bx - ax);
      box(len, 0.05, w + 0.5, (ax + bx) / 2, y, (az + bz) / 2, CURB).rotation.y = ry;
      box(len, 0.06, w, (ax + bx) / 2, y, (az + bz) / 2, PAVE).rotation.y = ry;
    }
    for (const [i, [x, z]] of pts.entries()) {
      if (i === 0 || i === pts.length - 1) continue; // (the ends meet another path or a gate)
      add(new THREE.CylinderGeometry(w / 2 + 0.25, w / 2 + 0.25, 0.05, 20), CURB, x, y, z);
      add(new THREE.CylinderGeometry(w / 2, w / 2, 0.06, 20), PAVE, x, y, z);
    }
  });
  // The central plaza: rings of pink and cream paving round the fountain.
  for (const [r, c, y] of [[PLAZA.r + 0.25, CURB, 0.026], [PLAZA.r, PAVE, 0.032], [PLAZA.r - 1.2, PLAZA_PINK, 0.036], [PLAZA.r - 2, PAVE, 0.04]]) add(new THREE.CylinderGeometry(r, r, 0.02, 40), c, PLAZA.x, y - 0.01, PLAZA.z);

  // The cake fountain: a round pool, three tiers of icing and a cherry,
  // with water falling off each tier.
  const F = PLAZA;
  add(new THREE.CylinderGeometry(2.3, 2.4, 0.5, 28), PINK, F.x, 0.25, F.z);
  add(new THREE.CylinderGeometry(2.45, 2.45, 0.12, 28), ICING, F.x, 0.52, F.z);
  const water = new THREE.MeshLambertMaterial({ color: '#9fdcff', transparent: true, opacity: 0.8 });
  const falling = new THREE.MeshLambertMaterial({ color: '#c8ecff', transparent: true, opacity: 0.35, depthWrite: false });
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.04, 28), water);
  pool.position.set(F.x, 0.46, F.z);
  scene.add(pool);
  for (const [r, h, y, c] of [[1.1, 0.7, 0.5, '#fff3d6'], [0.75, 0.55, 1.2, PINK], [0.45, 0.45, 1.75, ICING]]) {
    add(new THREE.CylinderGeometry(r, r, h, 20), c, F.x, y + h / 2, F.z);
    add(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.08, 20), ICING, F.x, y + h, F.z);
    const fall = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.1, r + 0.22, h + 0.1, 20, 1, true), falling);
    fall.position.set(F.x, y + h / 2, F.z);
    scene.add(fall);
  }
  add(new THREE.SphereGeometry(0.28, 12, 8), '#ff3b55', F.x, 2.45, F.z);
  block(F.x, F.z, 4.6, 4.6);

  // Instanced things, collected as we go: lamps, flowers. The yards' fences
  // and gates, and the park's fence, come from the yard kit (park-yards.js).
  const lamps = [], flowers = [], beds = [], trees = [];
  const kit = yardKit(scene, block), { fenceLine } = kit;
  for (const k of UNDER_YARDS) kit.yard(k);

  kit.gateArch('train', RIDE_GATES.train.x - 1.2, RIDE_GATES.train.z, false); // (at the platform's west edge)
  kit.gateArch('flume', RIDE_GATES.flume.x, RIDE_GATES.flume.z + 0.9, true); // (at the platform's south edge)
  kit.gateArch('maze', MAZE.door[0], MAZE.door[1] + 0.3, true);

  // The park's own fence, all round, with the way in and out at the south.
  for (const [ax, az, bx, bz] of [[X0, Z0, X1, Z0], [X0, Z0, X0, Z1], [X1, Z0, X1, Z1], [X0, Z1, -4.2, Z1], [4.2, Z1, X1, Z1]]) fenceLine(ax, az, bx, bz, 1.2, HOT);

  // The entrance arch over Main Street: two candy towers and the park's name.
  const s = gateSign({ ko: '어나더랜드', en: 'Another Land', ja: 'アナザーランド', zh: '另一乐园', es: 'Another Land', id: 'Another Land', vi: 'Another Land', hi: 'अनदर लैंड', fr: 'Another Land', th: 'แอนาเธอร์แลนด์', ar: 'أناذر لاند' }, '🍭', 768, 200);
  signs.push(s);
  const AZ = Z1 - 2.2;
  for (const k of [-1, 1]) {
    for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.55, 0.55, 1, 14), i % 2 ? ICING : '#ff5a5f', k * 3.6, 0.5 + i, AZ);
    add(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 14), ICING, k * 3.6, 5.15, AZ);
    const roof = add(new THREE.ConeGeometry(0.85, 1.4, 14), LILAC, k * 3.6, 6, AZ);
    roof.name = 'roof';
    add(new THREE.SphereGeometry(0.22, 10, 8), '#ff3b55', k * 3.6, 6.85, AZ);
    block(k * 3.6, AZ, 1.2, 1.2);
  }
  const big = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.46), new THREE.MeshBasicMaterial({ map: s.tex, side: THREE.DoubleSide }));
  big.position.set(0, 4.7, AZ);
  scene.add(big);
  box(5.9, 1.7, 0.12, 0, 4.7, AZ - 0.08, '#b8336e');
  box(6.4, 0.3, 0.6, 0, 5.7, AZ, ICING);

  const bed = (x, z, sx, sz) => {
    beds.push([x, z, sx, sz]);
    block(x, z, sx, sz);
    const n = Math.max(2, Math.round((sx * sz) / 0.35));
    for (let i = 0; i < n; i++) flowers.push([x + (((i * 0.618) % 1) - 0.5) * (sx - 0.3), z + (((i * 0.382 + 0.17) % 1) - 0.5) * (sz - 0.3)]);
  };
  // Lamps and flower beds along the paths' edges, wherever the lawn is free
  // (not on another path, a ride's yard, a stall or the coaster's land).
  const taken = [
    [-15, 24, 7.4, 5.4], [-6, Z1 - 4.5, 2.6, 2], [-20, -1, 5, 3.4], // haunted house, booth, balloon shooting
    [RINK_AT.x, RINK_AT.z + 0.3, 13.4, 11.6], [0, AZ, 9, 1.6], // bumper cars (and its queue), the entrance arch
    [-12, 6.8, 2.4, 2.4], [15, 2.6, 2.4, 2.4], [36, 2.6, 2.4, 2.4], // the avenues' benches
    [-24.5, -6.5, 3.4, 2.6], // the cotton candy cart and its customer (themepark.js)
    ...FOOD_TRUCKS.map((f) => [f.x, f.z, 5.4, 5]), // the food trucks and their queues
    [CLOWN.x, CLOWN.z, 2.6, 2.6], // the balloon clown
    [RIDES.train.x - RIDES.train.rx - 1.4, RIDES.train.z + 1.5, 3.4, 9.4], // the train's station
    [53.4, -14.2, 8, 2.6], // the flume's platform
    ...UNDER_RIDES.map((k) => RIDE_GATES[k]).map((g) => [g.staff.x, g.staff.z, 1.4, 1.4]), // the attendants
  ];
  const free = (x, z, m) => {
    if (x < -24 || x > X1 - 1.5 || z > Z1 - 1.2 || (z < -14 && x < 18) || z < Z0 + 2) return false; // (not on the coaster's land)
    if (onPath(x, z, m) || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + m + 0.3) return false;
    if (UNDER_YARDS.some((k) => inYard(k, x, z, m + 0.4))) return false;
    if (x > MAZE.x0 - m - 0.4 && x < MAZE.x1 + m + 0.4 && z > MAZE.z0 - m - 0.4 && z < MAZE.z1 + m + 0.4) return false;
    if (trackDist(TRAIN_TRACK, x, z) < 1.4 + m || trackDist(FLUME_TRACK, x, z) < 1.6 + m) return false; // (off the rails and the channel)
    if (Math.hypot(x - FLUME_POOL.x, (z - FLUME_POOL.z) / FLUME_POOL.sz) < FLUME_POOL.r + m + 0.6) return false;
    return !taken.some(([tx, tz, w, d]) => Math.abs(x - tx) < w / 2 + m && Math.abs(z - tz) < d / 2 + m);
  };
  const near = (list, x, z, d) => list.some(([a, b]) => Math.hypot(a - x, b - z) < d);
  // Walk both edges of every path, `off` out from its side.
  const edges = ({ w, pts }, off, cb) => {
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
      const long = Math.abs(ux) > Math.abs(uz);
      for (const sd of [-1, 1]) for (let d = 1; d < len; d += 0.5) cb(ax + ux * d - uz * sd * (w / 2 + off), az + uz * d + ux * sd * (w / 2 + off), long);
    }
  };
  for (const p of PATHS) edges(p, 0.55, (x, z) => { if (free(x, z, 0.15) && !near(lamps, x, z, 5.5)) lamps.push([x, z]); });
  for (const p of PATHS) edges(p, 1.3, (x, z, long) => {
    const sx = long ? 2.2 : 1.1, sz = long ? 1.1 : 2.2;
    if (free(x, z, 1.15) && !near(beds, x, z, 3.6) && !near(lamps, x, z, 1.3)) bed(x, z, sx, sz);
  });
  // Lollipop trees and gumdrop bushes on the lawns between the paths, so a
  // walk from ride to ride goes through a candy garden, not bare grass.
  let gseed = 3;
  const grnd = () => ((gseed = (gseed * 16807) % 2147483647) / 2147483647);
  const garden = [];
  for (let gx = -22; gx < X1 - 2; gx += 4.2) for (let gz = Z0 + 4; gz < Z1 - 2; gz += 4.2) {
    const x = gx + (grnd() - 0.5) * 2.6, z = gz + (grnd() - 0.5) * 2.6, r = grnd();
    if (!free(x, z, 1.9) || near(beds, x, z, 2.6) || near(lamps, x, z, 2.2)) continue;
    garden.push([x, z, r]);
    block(x, z, 1.2, 1.2);
  }
  for (const [x, z] of lamps) block(x, z, 0.3, 0.3);

  // Benches round the plaza, facing the fountain, and on the avenues.
  const bench = (bx, bz, ry) => {
    const g = new THREE.Group();
    const part = (sx, sy, sz, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c)); m.position.set(0, y, z); g.add(m); };
    part(1.6, 0.08, 0.5, 0.38, 0, '#c98b4f');
    part(1.6, 0.4, 0.08, 0.6, -0.25, '#c98b4f');
    for (const x of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.45), mat(HOT)); l.position.set(x, 0.19, 0); g.add(l); }
    g.position.set(bx, 0, bz);
    g.rotation.y = ry;
    scene.add(g);
    block(bx - Math.sin(ry) * 0.2, bz - Math.cos(ry) * 0.2, 0.8, 0.8);
    for (const o of [-0.4, 0.4]) {
      const sx = bx + Math.cos(ry) * o, sz = bz - Math.sin(ry) * o;
      seats.push({ x: sx, z: sz, ry, stand: [sx + Math.sin(ry) * 0.9, sz + Math.cos(ry) * 0.9] });
    }
  };
  for (const a of [0.95, 2.2, 4.4]) {
    const bx = PLAZA.x + Math.cos(a) * (PLAZA.r - 0.9), bz = PLAZA.z + Math.sin(a) * (PLAZA.r - 0.9);
    bench(bx, bz, Math.atan2(PLAZA.x - bx, PLAZA.z - bz));
  }
  bench(-12, 6.8, Math.PI); // on the west avenue, by the carousel
  bench(15, 2.6, Math.PI); // on the east promenade
  bench(36, 2.6, Math.PI); // further along, by the mirror maze

  // Bunting over Main Street and round the plaza: strings of little flags.
  const flags = [];
  const string = (ax, az, bx, bz, h = 3.3) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(3, Math.round(len / 0.55));
    const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, 0.02), mat(ICING));
    r.position.set((ax + bx) / 2, h - 0.12, (az + bz) / 2);
    r.rotation.y = -Math.atan2(bz - az, bx - ax);
    scene.add(r);
    for (let i = 1; i < n; i++) {
      const t = i / n, sag = Math.sin(t * Math.PI) * 0.35;
      flags.push([ax + (bx - ax) * t, h - sag, az + (bz - az) * t, -Math.atan2(bz - az, bx - ax)]);
    }
  };
  for (const [x, z] of lamps) if (x < -2 && x > -3.5 && z > 3) string(x, z, -x, z);
  // (and from Main Street's top lamps out along the avenues)
  const strung = lamps.filter(([x, z]) => Math.hypot(x - PLAZA.x, z - PLAZA.z) < 13).sort((a, b) => Math.atan2(a[1] - PLAZA.z, a[0] - PLAZA.x) - Math.atan2(b[1] - PLAZA.z, b[0] - PLAZA.x));
  for (let i = 0; i < strung.length; i++) {
    const [ax, az] = strung[i], [bx, bz] = strung[(i + 1) % strung.length];
    if (Math.hypot(bx - ax, bz - az) < 8.5) string(ax, az, bx, bz, 3.4);
  }

  // The candy wood outside the fence: lollipops and gumdrops all round.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ring = (ax, az, bx, bz, out) => {
    const len = Math.hypot(bx - ax, bz - az);
    for (let d = 1; d < len; d += 2.6 + rnd() * 1.6) {
      const t = d / len, o = 2.5 + rnd() * 7;
      trees.push([ax + (bx - ax) * t + out[0] * o, az + (bz - az) * t + out[1] * o, rnd()]);
    }
  };
  ring(X0, Z0, X1, Z0, [0, -1]);
  ring(X0, Z0, X0, Z1, [-1, 0]);
  ring(X1, Z0, X1, Z1, [1, 0]);
  ring(X0, Z1, -7, Z1, [0, 1]);
  ring(7, Z1, X1, Z1, [0, 1]);

  // Now the instanced meshes.
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const inst = (geo, material, list, set) => {
    const im = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((it, i) => set(im, it, i));
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    scene.add(im);
    return im;
  };
  const tinted = () => new THREE.MeshLambertMaterial({ flatShading: true });
  kit.done(); // (the fence posts)
  inst(new THREE.CylinderGeometry(0.06, 0.09, 3.2, 8).translate(0, 1.6, 0), mat('#7a4a2e'), lamps, (im, [x, z], i) => im.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, 1, 1))));
  inst(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff4c4' }), lamps, (im, [x, z], i) => im.setMatrixAt(i, m4.compose(v.set(x, 3.35, z), q.identity(), sc.set(1, 1, 1))));
  inst(new THREE.ConeGeometry(0.3, 0.25, 10), mat(HOT), lamps, (im, [x, z], i) => im.setMatrixAt(i, m4.compose(v.set(x, 3.62, z), q.identity(), sc.set(1, 1, 1))));
  inst(new THREE.BoxGeometry(1, 0.35, 1).translate(0, 0.175, 0), mat('#6fbf6a'), beds, (im, [x, z, sx, sz], i) => im.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(sx, 1, sz))));
  inst(new THREE.SphereGeometry(0.13, 7, 5), tinted(), flowers, (im, [x, z], i) => { im.setMatrixAt(i, m4.compose(v.set(x, 0.42, z), q.identity(), sc.set(1, 0.8, 1))); im.setColorAt(i, col.set(['#ff5a7a', LEMON, '#ffffff', LILAC, '#ff9a5a'][i % 5])); });
  const flagGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.34, 0], 3));
  flagGeo.computeVertexNormals();
  const flagMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  inst(flagGeo, flagMat, flags, (im, [x, y, z, ry], i) => { q.setFromAxisAngle(v.set(0, 1, 0), ry); im.setMatrixAt(i, m4.compose(v.set(x, y, z), q, sc.set(1, 1, 1))); im.setColorAt(i, col.set([HOT, LEMON, MINT, '#8fd0ff', LILAC][i % 5])); });
  trees.push(...garden);
  const pops = trees.filter((_, i) => i % 2 === 0), gums = trees.filter((_, i) => i % 2);
  inst(new THREE.CylinderGeometry(0.1, 0.1, 3, 6).translate(0, 1.5, 0), mat(ICING), pops, (im, [x, z, r], i) => im.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, 0.8 + r * 0.6, 1))));
  inst(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 16).rotateX(Math.PI / 2), tinted(), pops, (im, [x, z, r], i) => { const k = 0.8 + r * 0.6; q.setFromAxisAngle(v.set(0, 1, 0), r * 6.28); im.setMatrixAt(i, m4.compose(v.set(x, 3.9 * k, z), q, sc.set(k, k, k))); im.setColorAt(i, col.set([PINK, LILAC, MINT, LEMON][i % 4])); });
  inst(new THREE.SphereGeometry(1.3, 12, 8), tinted(), gums, (im, [x, z, r], i) => { const k = 0.8 + r * 0.8; im.setMatrixAt(i, m4.compose(v.set(x, 0.5 * k, z), q.identity(), sc.set(k, 0.8 * k, k))); im.setColorAt(i, col.set(['#ffe27a', '#ff5a5f', '#8fd0ff', '#ffad6b', '#a6e3a1'][i % 5])); });

  return { setSignLang: (lang) => { signs.forEach((x) => x.draw(lang)); kit.setSignLang(lang); } };
}
