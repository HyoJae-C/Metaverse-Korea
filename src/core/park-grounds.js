// Another Land's grounds (themepark.js builds the rides on top): the paved
// paths with their curbs, Main Street from the gate to the round central
// plaza and its cake fountain, a low candy fence round each ride's yard with
// a named gate, the park's own fence, lamps, flower beds, bunting, benches,
// and a candy wood outside the fence so the park doesn't end in bare grass.
// Everything that repeats is instanced; the rest is plain still meshes that
// themepark.js merges (merge-static.js), so the whole lot is a few draw calls.
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { PLAZA, RIDES, RIDE_GATES, RIDE_NAME, RIDE_EMOJI } from './park-rides.js';

const mat = matCache({ flatShading: true });
const PAVE = '#f4e4c6', CURB = '#d9a77c', PLAZA_PINK = '#f9cdd8';
const ICING = '#fffaf3', PINK = '#ff8fb8', HOT = '#ff5f9e', MINT = '#8fe3c7', LEMON = '#ffe27a', LILAC = '#c9a8ff';

// The paths (room metres, [x0, z0, x1, z1]): Main Street, the gate square,
// the avenues west (to the coaster) and east (to the bumper cars), and the
// short spurs from the central plaza to each ride's gate.
export const PATHS = [
  [-10, 7, 10, 13.6], // gate square
  [-2.5, 3, 2.5, 13.6], // Main Street
  [-28.6, 2.6, -2, 6.2], // west avenue, to the coaster's platform
  [2, 2.6, 12.6, 6.2], // east avenue
  [11, 2.6, 14.2, 9.6], // to the bumper cars' gate
  [-9.6, -3.5, -4, -0.5], // plaza → carousel
  [-6.6, -7.2, -2.4, -3], // plaza → pirate ship
  [-1.6, -34, 1.6, -5], // north, under the coaster
  [4, -3.5, 14.4, -0.5], // plaza → drop tower
  [7.4, -6.6, 10.6, -1], // → Ferris wheel
  [-23.2, -7.6, -19.8, 2.8], // → balloon shooting
  [-15.6, 6, -12.4, 7.9], // the haunted house's door
];
// Each ride's yard fence: a ring (r, gap facing the gate) or a box.
export const YARDS = {
  carousel: { ring: RIDES.carousel.r + 1.6, gap: 0 },
  drop: { ring: 3.6, gap: Math.PI },
  viking: { box: [RIDES.viking.x - 7.5, RIDES.viking.z - 2.8, RIDES.viking.x + 7.5, RIDES.viking.z + 2.8], gap: [RIDES.viking.x + 3.4, RIDES.viking.x + 5.8] },
  wheel: { box: [RIDES.wheel.x - 4.5, RIDES.wheel.z - 3, RIDES.wheel.x + 4.5, RIDES.wheel.z + 2.7], gap: [RIDES.wheel.x - 3.2, RIDES.wheel.x - 0.8] },
};

// A sign board over a gate: Korean as built (with the English under it), or
// the player's language when the signs are translated.
function gateSign(names, emoji, w = 512, h = 160, color = HOT) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lang) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = ICING;
    for (let i = 0; i < w; i += 40) { g.beginPath(); g.arc(i + 20, 0, 16, 0, Math.PI); g.fill(); } // frosting drips
    g.strokeStyle = ICING; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const big = (emoji ? emoji + ' ' : '') + (lang ? names[lang] || names.en : names.ko);
    g.font = `900 ${big.length > 13 ? 46 : 60}px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
    g.lineWidth = 9; g.strokeStyle = 'rgba(120,20,60,0.55)'; g.strokeText(big, w / 2, h * 0.47, w - 40);
    g.fillStyle = ICING; g.fillText(big, w / 2, h * 0.47, w - 40);
    if (!lang) { g.font = '800 24px system-ui, sans-serif'; g.fillStyle = LEMON; g.fillText(names.en.toUpperCase(), w / 2, h * 0.82, w - 40); }
    tex.needsUpdate = true;
  };
  draw(null);
  return { tex, draw };
}

export function buildGrounds(scene, block, seats, { X0, X1, Z0, Z1 }) {
  const add = (geo, color, x, y, z) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); scene.add(m); return m; };
  const box = (sx, sy, sz, x, y, z, color) => add(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z);
  const signs = [];

  // Grass, then the paving: each path a pale slab on a slightly wider curb.
  add(new THREE.PlaneGeometry(260, 200).rotateX(-Math.PI / 2), '#a6d98a', (X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  for (const [x0, z0, x1, z1] of PATHS) {
    box(x1 - x0 + 0.5, 0.05, z1 - z0 + 0.5, (x0 + x1) / 2, 0, (z0 + z1) / 2, CURB);
    box(x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, PAVE);
  }
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

  // Instanced things, collected as we go: fence posts, lamps, flowers.
  const posts = [], lamps = [], flowers = [], beds = [], trees = [];
  const fenceRail = (ax, az, bx, bz, h = 0.9, color = PINK) => {
    const len = Math.hypot(bx - ax, bz - az);
    const r = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.09), mat(color));
    r.position.set((ax + bx) / 2, h, (az + bz) / 2);
    r.rotation.y = -Math.atan2(bz - az, bx - ax);
    scene.add(r);
    const r2 = r.clone();
    r2.position.y = h * 0.5;
    scene.add(r2);
  };
  // A fence along a line: posts every ~1.2 m and two rails; blocked.
  const fenceLine = (ax, az, bx, bz, h = 0.9, color = PINK, solid = true) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.2));
    for (let i = 0; i <= n; i++) posts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n, h]);
    fenceRail(ax, az, bx, bz, h, color);
    if (!solid) return;
    const steps = Math.max(1, Math.ceil(len / 0.5));
    for (let i = 0; i <= steps; i++) block(ax + ((bx - ax) * i) / steps, az + ((bz - az) * i) / steps, 0.5, 0.5);
  };
  // A ring fence round (x, z) with a gate gap facing angle `gap` (0 = +x).
  const fenceRing = (x, z, r, gap) => {
    const n = Math.round((Math.PI * 2 * r) / 1.3), skip = 0.75 / r * 2; // the gap is about 1.5 m wide each side
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, mid = (a0 + a1) / 2;
      const d = Math.abs(Math.atan2(Math.sin(mid - gap), Math.cos(mid - gap)));
      if (d < skip + 0.12) continue;
      fenceLine(x + Math.cos(a0) * r, z + Math.sin(a0) * r, x + Math.cos(a1) * r, z + Math.sin(a1) * r);
    }
  };
  const fenceBox = ([x0, z0, x1, z1], [g0, g1]) => {
    fenceLine(x0, z0, x1, z0);
    fenceLine(x0, z0, x0, z1);
    fenceLine(x1, z0, x1, z1);
    fenceLine(x0, z1, g0, z1);
    fenceLine(g1, z1, x1, z1);
  };
  fenceRing(RIDES.carousel.x, RIDES.carousel.z, YARDS.carousel.ring, YARDS.carousel.gap);
  fenceRing(RIDES.drop.x, RIDES.drop.z, YARDS.drop.ring, YARDS.drop.gap);
  fenceBox(YARDS.viking.box, YARDS.viking.gap);
  fenceBox(YARDS.wheel.box, YARDS.wheel.gap);

  // Each ride's gate: two striped posts and its name on a board over the way in.
  const gateArch = (kind, x, z, along) => {
    const s = gateSign(RIDE_NAME[kind], RIDE_EMOJI[kind]);
    signs.push(s);
    const dx = along ? 1 : 0, dz = along ? 0 : 1; // the posts stand apart along x (or z)
    for (const k of [-1, 1]) {
      for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 10), i % 2 ? ICING : HOT, x + dx * k * 1.25, 0.35 + i * 0.7, z + dz * k * 1.25);
      add(new THREE.SphereGeometry(0.22, 10, 8), MINT, x + dx * k * 1.25, 2.95, z + dz * k * 1.25);
      block(x + dx * k * 1.25, z + dz * k * 1.25, 0.3, 0.3);
    }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.81), new THREE.MeshBasicMaterial({ map: s.tex, side: THREE.DoubleSide }));
    board.position.set(x, 2.55, z);
    board.rotation.y = along ? 0 : Math.PI / 2;
    scene.add(board);
    box(along ? 2.7 : 0.08, 0.9, along ? 0.08 : 2.7, x - (along ? 0 : 0.06), 2.55, z - (along ? 0.06 : 0), '#b8336e');
  };
  const C = RIDES.carousel, D = RIDES.drop;
  gateArch('carousel', C.x + YARDS.carousel.ring, C.z, false);
  gateArch('drop', D.x - YARDS.drop.ring, D.z, false);
  gateArch('viking', (YARDS.viking.gap[0] + YARDS.viking.gap[1]) / 2, YARDS.viking.box[3], true);
  gateArch('wheel', (YARDS.wheel.gap[0] + YARDS.wheel.gap[1]) / 2, YARDS.wheel.box[3], true);
  // A short queue rail at each gate, so the way in reads at a glance.
  for (const [kind, g] of Object.entries(RIDE_GATES)) {
    const side = kind === 'carousel' || kind === 'drop';
    const sx = side ? Math.sign(g.x - RIDES[kind].x) : 0, sz = side ? 0 : 1;
    for (const k of [-1, 1]) {
      const ax = g.x + (side ? -sx * 0.6 : k * 1.25), az = g.z + (side ? k * 1.25 : -0.6);
      for (let i = 0; i < 3; i++) {
        const px = ax + sx * i * 0.8, pz = az + sz * i * 0.8;
        add(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8), '#d4a73a', px, 0.42, pz);
        add(new THREE.SphereGeometry(0.08, 8, 6), LEMON, px, 0.88, pz);
      }
      const r = new THREE.Mesh(new THREE.BoxGeometry(side ? 1.6 : 0.04, 0.04, side ? 0.04 : 1.6), mat(HOT));
      r.position.set(ax + sx * 0.8, 0.78, az + sz * 0.8);
      scene.add(r);
    }
  }

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
    [-14, 10, 7, 5.4], [-6, 9.5, 2.6, 2], [6, 9.5, 2.2, 1.6], [-21.5, -9.5, 5, 3.4], // haunted house, booth, churros, balloon shooting
    [19.9, 8.4, 12.4, 11.6], [0, AZ, 9, 1.6], // bumper cars (and its queue), the entrance arch
    [-11, 7, 2.4, 2.4], [8.5, 7, 2.4, 2.4], // the avenues' benches
    [-24.5, -6.5, 3.4, 2.6], // the cotton candy cart and its customer (themepark.js)
    ...Object.values(RIDE_GATES).map((g) => [g.staff.x, g.staff.z, 1.4, 1.4]), // the attendants
  ];
  const onPath = (x, z, m) => PATHS.some(([x0, z0, x1, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);
  const free = (x, z, m) => {
    if (x < -24 || x > X1 - 1.5 || z < -14 || z > Z1 - 1.2) return false;
    if (onPath(x, z, m) || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + m + 0.3) return false;
    if (Math.hypot(x - C.x, z - C.z) < YARDS.carousel.ring + m + 0.4 || Math.hypot(x - D.x, z - D.z) < YARDS.drop.ring + m + 0.4) return false;
    for (const [x0, z0, x1, z1] of [YARDS.viking.box, YARDS.wheel.box]) if (x > x0 - m - 0.4 && x < x1 + m + 0.4 && z > z0 - m - 0.4 && z < z1 + m + 0.4) return false;
    return !taken.some(([tx, tz, w, d]) => Math.abs(x - tx) < w / 2 + m && Math.abs(z - tz) < d / 2 + m);
  };
  const near = (list, x, z, d) => list.some(([a, b]) => Math.hypot(a - x, b - z) < d);
  const edges = ([x0, z0, x1, z1], off, cb) => {
    const long = x1 - x0 > z1 - z0;
    if (long) for (const z of [z0 - off, z1 + off]) for (let x = x0 + 1; x < x1; x += 0.5) cb(x, z, true);
    else for (const x of [x0 - off, x1 + off]) for (let z = z0 + 1; z < z1; z += 0.5) cb(x, z, false);
  };
  for (const p of PATHS) edges(p, 0.55, (x, z) => { if (free(x, z, 0.15) && !near(lamps, x, z, 5.5)) lamps.push([x, z]); });
  for (const p of PATHS) edges(p, 1.3, (x, z, long) => {
    const sx = long ? 2.2 : 1.1, sz = long ? 1.1 : 2.2;
    if (free(x, z, 1.15) && !near(beds, x, z, 3.6) && !near(lamps, x, z, 1.3)) bed(x, z, sx, sz);
  });
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
  bench(-11, 7, Math.PI); // on the west avenue, by the haunted house
  bench(8.5, 7, Math.PI);

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
  inst(new THREE.CylinderGeometry(0.07, 0.07, 1, 6).translate(0, 0.5, 0), mat(ICING), posts, (im, [x, z, h], i) => im.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, h + 0.08, 1))));
  inst(new THREE.OctahedronGeometry(0.12), tinted(), posts, (im, [x, z, h], i) => { im.setMatrixAt(i, m4.compose(v.set(x, h + 0.12, z), q.identity(), sc.set(1, 1, 1))); im.setColorAt(i, col.set([PINK, MINT, LEMON, LILAC][i % 4])); });
  inst(new THREE.CylinderGeometry(0.06, 0.09, 3.2, 8).translate(0, 1.6, 0), mat('#7a4a2e'), lamps, (im, [x, z], i) => im.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, 1, 1))));
  inst(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff4c4' }), lamps, (im, [x, z], i) => im.setMatrixAt(i, m4.compose(v.set(x, 3.35, z), q.identity(), sc.set(1, 1, 1))));
  inst(new THREE.ConeGeometry(0.3, 0.25, 10), mat(HOT), lamps, (im, [x, z], i) => im.setMatrixAt(i, m4.compose(v.set(x, 3.62, z), q.identity(), sc.set(1, 1, 1))));
  inst(new THREE.BoxGeometry(1, 0.35, 1).translate(0, 0.175, 0), mat('#6fbf6a'), beds, (im, [x, z, sx, sz], i) => im.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(sx, 1, sz))));
  inst(new THREE.SphereGeometry(0.13, 7, 5), tinted(), flowers, (im, [x, z], i) => { im.setMatrixAt(i, m4.compose(v.set(x, 0.42, z), q.identity(), sc.set(1, 0.8, 1))); im.setColorAt(i, col.set(['#ff5a7a', LEMON, '#ffffff', LILAC, '#ff9a5a'][i % 5])); });
  const flagGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.34, 0], 3));
  flagGeo.computeVertexNormals();
  const flagMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  inst(flagGeo, flagMat, flags, (im, [x, y, z, ry], i) => { q.setFromAxisAngle(v.set(0, 1, 0), ry); im.setMatrixAt(i, m4.compose(v.set(x, y, z), q, sc.set(1, 1, 1))); im.setColorAt(i, col.set([HOT, LEMON, MINT, '#8fd0ff', LILAC][i % 5])); });
  const pops = trees.filter((_, i) => i % 2 === 0), gums = trees.filter((_, i) => i % 2);
  inst(new THREE.CylinderGeometry(0.1, 0.1, 3, 6).translate(0, 1.5, 0), mat(ICING), pops, (im, [x, z, r], i) => im.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, 0.8 + r * 0.6, 1))));
  inst(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 16).rotateX(Math.PI / 2), tinted(), pops, (im, [x, z, r], i) => { const k = 0.8 + r * 0.6; q.setFromAxisAngle(v.set(0, 1, 0), r * 6.28); im.setMatrixAt(i, m4.compose(v.set(x, 3.9 * k, z), q, sc.set(k, k, k))); im.setColorAt(i, col.set([PINK, LILAC, MINT, LEMON][i % 4])); });
  inst(new THREE.SphereGeometry(1.3, 12, 8), tinted(), gums, (im, [x, z, r], i) => { const k = 0.8 + r * 0.8; im.setMatrixAt(i, m4.compose(v.set(x, 0.5 * k, z), q.identity(), sc.set(k, 0.8 * k, k))); im.setColorAt(i, col.set(['#ffe27a', '#ff5a5f', '#8fd0ff', '#ffad6b', '#a6e3a1'][i % 5])); });

  return { setSignLang: (lang) => signs.forEach((x) => x.draw(lang)) };
}
