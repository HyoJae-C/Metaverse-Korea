// Inside the Music Hall: the Concert Hall (콘서트홀), a made-up hall in the
// real one's look (Yozi's photo, 2026-11-21): warm wood everywhere, the
// orchestra on an open wooden stage with no curtain, seats all round it:
// the stalls in front, terraces along both sides, a balcony at the back and
// the choir seats behind the stage. Zigzag wooden panels run round the
// stage's wall and a canopy of reflectors and lamps hangs over it. A grand
// piano stands at the front of the stage for the piano pieces.
//
// The stage is at the far end (-z); you walk in at the back (+z) and sit in
// the stalls. The people already seated are one instanced crowd
// (core/opera-hall.js: addCrowd). The concert is core/stage-show.js with the
// classical programme (data/concert-scores.js, loaded when you walk in).
import * as THREE from 'three';
import { Batch } from './cathedral-hall.js';
import { addSeats, addCrowd, hash } from './opera-hall.js';

export const ROOM_CONCERT = { w: 36, d: 46, h: 15 };

// Where things are (room metres). Exported for the show and the tests.
export const CONCERT_LAYOUT = {
  mode: 'concert',
  stage: { front: -4.2, back: -15, y: 0.8, half: 9.5 }, // the platform: its front edge (z), back, height, half its width
  risers: [{ z: -11.9, y: 0.25 }, { z: -13.2, y: 0.5 }], // behind this z the platform is this much higher (winds; brass and drums)
  podium: { x: 0, z: -6.3, y: 0.8 + 0.25 }, // the conductor, at the front, facing the orchestra
  wing: [8.7, -5.4], // where the conductor and the pianist wait and walk in from (on the stage)
  piano: { x: -7.3, z: -5.5, bench: [-8.75, -5.5] }, // the grand piano; the pianist faces +x
  rows: { z0: -2, gap: 1.5, n: 12, pitch: 0.72 }, // the stalls
  blocks: [[-12.4, -5.2], [-3.9, 3.9], [5.2, 12.4]],
  terrace: { x: 13.6, y: 1.8, z0: -15, z1: 15.5 }, // the side terraces: from this |x| to the wall, their floor, from/to (z)
  choir: { z: -15.4, y: 2.4, rows: 3 }, // the seats behind the stage: their front wall (z), first floor, rows
  back: { z: 17.2, tiers: [3.2, 6.6] }, // the balcony over the door
};

export const C = {
  wood: '#b0703f', woodLight: '#c98a52', woodDark: '#7d4a28', woodDeep: '#5a331b', stage: '#d9a468', stageEdge: '#a8733f',
  floor: '#6d4630', aisle: '#8a3b34', seat: '#4f5d6b', seatDark: '#333e49', black: '#17151a', light: '#fff0c4', stand: '#1d1b20', piano: '#101014', keys: '#f4efe2', brass: '#c9a14a',
};

export function buildConcertHall(store, ROOM, EXIT) {
  const { w, d, h } = ROOM, L = CONCERT_LAYOUT, S = L.stage, T = L.terrace;
  const HW = w / 2, F = d / 2, B = -d / 2;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a1a10');
  const house = new THREE.HemisphereLight(0xffe6c0, 0x6a4630, 1.5);
  scene.add(house);
  const fill = new THREE.PointLight(0xffd9a0, 30, 44);
  fill.position.set(0, h - 2, 6);
  scene.add(fill);
  const stageLight = new THREE.PointLight(0xfff2d8, 30, 30);
  stageLight.position.set(0, S.y + 7.5, (S.front + S.back) / 2 + 1);
  scene.add(stageLight);
  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const b = new Batch();
  const crowd = [], places = [], seats = [];
  const person = (x, y, z, ry) => crowd.push({ x, y, z, ry, k: hash(x * 1.3 + y, z * 2.1 + ry) });

  // --- Floor, walls, ceiling: wood, with darker strips up the walls -----------------
  b.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), C.floor, 0, 0, 0);
  for (let i = 0; i < L.blocks.length - 1; i++) { // the aisles' carpet
    const x = (L.blocks[i][1] + L.blocks[i + 1][0]) / 2;
    b.add(new THREE.PlaneGeometry(L.blocks[i + 1][0] - L.blocks[i][1], F - S.front).rotateX(-Math.PI / 2), C.aisle, x, 0.01, (F + S.front) / 2);
  }
  for (const s of [-1, 1]) {
    b.add(new THREE.PlaneGeometry(d, h), C.wood, s * HW, h / 2, 0, { ry: -s * Math.PI / 2 });
    for (let z = B + 1.5; z < F; z += 3) b.box(0.12, h, 0.5, s * (HW - 0.06), h / 2, z, C.woodDark);
  }
  b.add(new THREE.PlaneGeometry(w, h), C.wood, 0, h / 2, F, { ry: Math.PI });
  b.add(new THREE.PlaneGeometry(w, h), C.wood, 0, h / 2, B);
  for (let x = -HW + 1.5; x < HW; x += 3) { b.box(0.5, h, 0.12, x, h / 2, B + 0.06, C.woodDark); b.box(0.5, h, 0.12, x, h / 2, F - 0.06, C.woodDark); }
  b.add(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), C.woodDark, 0, h, 0);
  for (let z = B + 2; z < F; z += 4) b.box(w, 0.25, 1.6, 0, h - 0.4 - 0.5 * Math.sin(((z - B) / d) * Math.PI), z, C.wood, { rx: 0.12 }); // the ceiling's wooden waves

  // --- The stage: a pale wooden platform, two risers at the back --------------------
  const SD = S.front - S.back;
  b.box(S.half * 2, S.y, SD, 0, S.y / 2, (S.front + S.back) / 2, C.stageEdge);
  b.add(new THREE.PlaneGeometry(S.half * 2, SD).rotateX(-Math.PI / 2), C.stage, 0, S.y + 0.005, (S.front + S.back) / 2);
  L.risers.forEach((r, i) => {
    const z1 = r.z, z0 = i + 1 < L.risers.length ? L.risers[i + 1].z : S.back;
    b.box(S.half * 2 - 2, r.y, z1 - S.back, 0, S.y + r.y / 2, (z1 + S.back) / 2, C.stageEdge);
    b.add(new THREE.PlaneGeometry(S.half * 2 - 2, z1 - z0).rotateX(-Math.PI / 2), C.stage, 0, S.y + r.y + 0.005, (z1 + z0) / 2);
  });
  block(0, (S.front + B) / 2, S.half * 2 + 2.4, S.front - B); // (nobody walks onto the stage; a way round it runs along each side to the seats behind)
  // The wall round the stage: tall zigzag panels, pale on dark, like the real hall's.
  const zig = (x0, x1, y0, z, n, hgt) => {
    const step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * step;
      b.add(new THREE.ConeGeometry(step * 0.52, hgt, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.18), C.woodLight, x, y0 + hgt / 2, z);
    }
  };
  // The canopy over the stage: reflectors and a row of lamps on black bars.
  const cy = S.y + 8.6, cz = (S.front + S.back) / 2 + 1.5;
  for (let i = -3; i <= 3; i++) b.box(2.3, 0.14, 4.6, i * 2.6, cy + Math.abs(i) * 0.22, cz, C.woodLight, { rz: -i * 0.05, rx: 0.1 });
  for (const dz of [-3.2, 0.2, 3.4]) {
    b.box(S.half * 2 + 2, 0.08, 0.08, 0, cy - 0.7, cz + dz, C.black);
    for (let x = -S.half; x <= S.half; x += 1.9) { b.box(0.22, 0.26, 0.22, x, cy - 0.86, cz + dz, C.black); b.add(new THREE.SphereGeometry(0.1, 6, 4), C.light, x, cy - 1.02, cz + dz, { basic: true }); }
  }
  for (const s of [-1, 1]) for (const dz of [-3.2, 3.4]) b.box(0.04, h - cy + 0.7, 0.04, s * (S.half - 1), (h + cy - 0.7) / 2, cz + dz, C.black);

  // --- The orchestra's places on the stage --------------------------------------------
  // Strings in three arcs round the podium, violins on the left (seen from
  // the house), violas in the middle, cellos on the right, a double bass
  // behind them; woodwinds on the first riser, brass and the kettledrums on
  // the second.
  const P = L.podium, players = [];
  const riserAt = (z) => L.risers.reduce((y, r) => (z <= r.z ? r.y : y), 0);
  const sit = (x, z, k) => {
    const y = S.y + riserAt(z), ry = Math.atan2(P.x - x, P.z - z); // facing the conductor
    players.push({ x, y, z, k, ry });
    if (k !== 'bass' && k !== 'timpani') { b.box(0.34, 0.05, 0.34, x, y + 0.28, z, C.stand); b.box(0.3, 0.3, 0.04, x - Math.sin(ry) * 0.17, y + 0.43, z - Math.cos(ry) * 0.17, C.stand, { ry }); }
    const mx = x + Math.sin(ry) * 0.5, mz = z + Math.cos(ry) * 0.5;
    b.box(0.03, 0.62, 0.03, mx, y + 0.31, mz, C.stand);
    b.box(0.34, 0.24, 0.02, mx, y + 0.7, mz, C.stand, { ry, rx: -0.35 });
    b.box(0.3, 0.2, 0.01, mx - Math.sin(ry) * 0.012, y + 0.705, mz - Math.cos(ry) * 0.012, C.keys, { ry, rx: -0.35, basic: true });
  };
  [[2.5, 6], [3.8, 8], [5.1, 9]].forEach(([r, n], ring) => {
    for (let i = 0; i < n; i++) {
      const a = (-78 + (156 * i) / (n - 1)) * Math.PI / 180; // 0 = straight upstage of the podium
      const x = P.x + Math.sin(a) * r, z = P.z - Math.cos(a) * r - 0.2;
      sit(x, z, a < -0.3 ? 'violin' : a < 0.42 ? 'viola' : ring === 2 && i === n - 1 ? 'bass' : 'cello');
    }
  });
  for (const x of [-2.6, -1.3, 0, 1.3, 2.6]) sit(x, L.risers[0].z - 0.65, 'wind');
  for (const x of [1.2, 2.5, 3.8, 5.1]) sit(x, L.risers[1].z - 0.8, 'brass');
  sit(-3.6, L.risers[1].z - 0.9, 'timpani');
  // The podium, with a rail behind the conductor.
  b.box(1.1, P.y - S.y, 1.1, P.x, S.y + (P.y - S.y) / 2, P.z, C.woodDark);
  b.box(0.9, 0.04, 0.04, P.x, P.y + 0.62, P.z + 0.5, C.brass);
  for (const s of [-1, 1]) b.box(0.04, 0.62, 0.04, P.x + s * 0.43, P.y + 0.31, P.z + 0.5, C.brass);
  // The grand piano: its lid up, the keyboard on the pianist's side (-x).
  {
    const g = L.piano, y = S.y;
    b.box(1.55, 0.3, 1.45, g.x + 0.1, y + 0.62, g.z, C.piano);
    b.add(new THREE.CylinderGeometry(0.72, 0.72, 0.3, 14, 1, false, -Math.PI / 2, Math.PI), C.piano, g.x + 0.85, y + 0.62, g.z); // the curved tail
    b.box(0.3, 0.06, 1.3, g.x - 0.78, y + 0.6, g.z, C.keys, { basic: true });
    b.box(0.34, 0.1, 1.45, g.x - 0.8, y + 0.52, g.z, C.piano);
    b.box(2.1, 0.05, 1.4, g.x + 0.45, y + 1.22, g.z - 0.42, C.piano, { rx: -0.75 }); // the lid
    b.box(0.03, 0.75, 0.03, g.x + 0.6, y + 1.0, g.z + 0.3, C.piano, { rx: -0.2 });
    for (const [dx, dz] of [[-0.55, -0.6], [-0.55, 0.6], [1.25, 0]]) b.box(0.09, 0.48, 0.09, g.x + dx, y + 0.24, g.z + dz, C.piano);
    b.box(0.4, 0.07, 0.7, g.bench[0], y + 0.4, g.bench[1], C.piano); // the bench
    for (const dz of [-0.28, 0.28]) b.box(0.3, 0.4, 0.05, g.bench[0], y + 0.2, g.bench[1] + dz, C.piano);
  }

  // --- The choir seats behind the stage ---------------------------------------------------
  const CH = L.choir;
  b.box(S.half * 2 + 2, CH.y, 0.3, 0, CH.y / 2, CH.z, C.woodDark);
  zig(-S.half - 1, S.half + 1, S.y - 0.05, CH.z + 0.2, 10, CH.y - S.y + 0.9);
  b.box(S.half * 2 + 2, 0.08, 0.2, 0, CH.y + 0.92, CH.z, C.woodLight);
  for (let r = 0; r < CH.rows; r++) {
    const y = CH.y + r * 0.5, z = CH.z - 0.9 - r * 1.25;
    b.box(S.half * 2 + 2, y, 1.25, 0, y / 2, z, C.woodDeep);
    for (let x = -S.half; x <= S.half; x += 0.74) {
      places.push([x, z, y, Math.PI]);
      const side = Math.sign(x) || 1;
      if (S.half - Math.abs(x) < 2.3) seats.push({ x, y, z: z + 0.02, ry: 0, reach: 2.7, stand: [side * (S.half + 2.4), z] }); // the ends are free: sat from the way round the stage
      else if (hash(x + r, z) < 0.75) person(x, y, z, 0);
    }
  }
  zig(-HW + 1, HW - 1, CH.y + CH.rows * 0.5 + 0.3, B + 0.3, 12, 4.2); // on the far wall above them

  // --- The stalls ----------------------------------------------------------------------------
  const R = L.rows;
  for (let r = 0; r < R.n; r++) {
    const z = R.z0 + r * R.gap;
    L.blocks.forEach(([x0, x1], bi) => {
      const n = Math.floor((x1 - x0) / R.pitch), start = (x0 + x1) / 2 - ((n - 1) * R.pitch) / 2;
      block((x0 + x1) / 2, z + 0.12, x1 - x0 + 0.1, 0.5);
      for (let i = 0; i < n; i++) {
        const x = start + i * R.pitch;
        places.push([x, z]);
        const edge = i === 0 || i === n - 1, taken = !edge && hash(x * 3.1 + bi, z * 1.7) < (r < 5 ? 0.6 : 0.46);
        if (taken) person(x, 0, z, Math.PI);
        else seats.push({ x, z: z - 0.02, ry: Math.PI, stand: [x, z - 0.72] });
      }
    });
  }

  // --- The side terraces: raised blocks along both walls, facing the stage ----------------
  const TD = HW - T.x, tz = (T.z0 + T.z1) / 2, tl = T.z1 - T.z0;
  for (const s of [-1, 1]) {
    b.box(TD, T.y, tl, s * (T.x + TD / 2), T.y / 2, tz, C.woodDark);
    b.box(0.14, 0.9, tl, s * T.x, T.y + 0.45, tz, C.wood);
    b.box(0.2, 0.07, tl, s * T.x, T.y + 0.93, tz, C.woodLight);
    block(s * (T.x + TD / 2), (B + T.z1) / 2, TD + 0.3, T.z1 - B + 0.3);
    for (let row = 0; row < 2; row++) {
      const x = s * (T.x + 0.75 + row * 1.3), y = T.y + row * 0.5;
      if (row) b.box(1.3, 0.5, tl, s * (T.x + 0.75 + 1.3), T.y + 0.25, tz, C.woodDeep);
      for (let z = T.z0 + 0.6; z < T.z1 - 0.3; z += 0.74) {
        const ry = s > 0 ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5; // turned towards the stage
        places.push([x, z, y, ry + Math.PI]);
        if (hash(x * 1.7, z + row) < 0.68) person(x, y, z, ry);
      }
    }
    // a narrow upper gallery above each terrace
    const gy = 5.6;
    b.box(2.4, 0.3, tl, s * (HW - 1.2), gy - 0.15, tz, C.woodDark);
    b.box(0.14, 0.9, tl, s * (HW - 2.4), gy + 0.45, tz, C.wood);
    b.box(0.2, 0.07, tl, s * (HW - 2.4), gy + 0.93, tz, C.woodLight);
    for (let z = T.z0 + 0.8; z < T.z1 - 0.4; z += 0.8) if (hash(z * 1.9, s + 3) < 0.6) person(s * (HW - 1.7), gy + 0.02, z, s > 0 ? -Math.PI / 2 - 0.5 : Math.PI / 2 + 0.5);
    for (let z = T.z0 + 0.5; z < T.z1; z += 1.7) b.add(new THREE.SphereGeometry(0.08, 6, 4), C.light, s * (HW - 2.35), gy - 0.33, z, { basic: true });
    for (let z = T.z0 + 0.5; z < T.z1; z += 1.7) b.add(new THREE.SphereGeometry(0.08, 6, 4), C.light, s * (T.x - 0.02), T.y - 0.2, z, { basic: true });
  }

  // --- The balcony over the door, two tiers ---------------------------------------------------
  L.back.tiers.forEach((y, ti) => {
    const z0 = L.back.z + ti * 1.2, dep = F - z0;
    b.box(w, 0.3, dep, 0, y - 0.15, (z0 + F) / 2, C.woodDark);
    b.box(w, 0.9, 0.14, 0, y + 0.45, z0, C.wood);
    b.box(w, 0.07, 0.2, 0, y + 0.93, z0, C.woodLight);
    for (let x = -HW + 0.9; x < HW; x += 1.7) b.add(new THREE.SphereGeometry(0.08, 6, 4), C.light, x, y - 0.33, z0 - 0.05, { basic: true });
    for (let row = 0; row < 3; row++) {
      const z = z0 + 0.7 + row * 1.25, yy = y + row * 0.45;
      if (row) b.box(w, row * 0.45, 1.25, 0, y + (row * 0.45) / 2, z + 0.1, C.woodDeep);
      for (let x = -HW + 1; x < HW - 0.6; x += 0.74) { places.push([x, z, yy]); if (hash(x + ti * 7, z) < 0.72) person(x, yy, z, Math.PI); }
    }
  });
  // The door, under the balcony.
  b.box(2.4, 2.7, 0.1, EXIT.x, 1.35, F - 0.06, C.woodDeep);
  b.box(0.06, 2.6, 0.12, EXIT.x, 1.3, F - 0.1, C.brass);
  for (const s of [-1, 1]) b.box(0.3, 2.9, 0.3, EXIT.x + s * 1.4, 1.45, F - 0.15, C.woodLight);

  b.flush(scene);
  scene.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { o.matrixAutoUpdate = false; o.updateMatrix(); } });
  addSeats(scene, places, R.pitch, C.seat, C.seatDark);
  const people = addCrowd(scene, crowd);

  // The house lights: lights(k) 1 = up (between pieces), 0 = down (the music).
  // A concert hall stays lighter than a theater.
  const lights = (k) => { house.intensity = 0.85 + 0.65 * k; fill.intensity = 10 + 20 * k; stageLight.intensity = 36 - 8 * k; };
  lights(1);

  return {
    scene, products: [], colliders, seats, clerk: null, turntable: null, room: ROOM, exit: EXIT,
    stations: {
      stage: {
        ...L, players, curtain: () => {}, clap: people.clap, lights, crowd: crowd.length,
        load: () => import('../data/concert-scores.js').then((m) => m.CONCERT_PROGRAM),
      },
    },
    animate: people.animate,
    camBlocked: (x, z) => Math.abs(x) > HW - 0.4 || z > F - 0.5 || z < S.front + 0.6,
    concert: true,
  };
}
