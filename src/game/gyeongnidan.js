// Gyeongnidan-gil (경리단길), Itaewon's hillside street: the sloped ground
// under its houses, its streets drawn on the slope, and neighbours out on the
// lanes so it never looks empty. The roads and houses come from
// scripts/build-itaewon.mjs (real roads from OpenStreetMap); the height
// is core/hill-ground.js, which main.js uses from the start, so walking up
// the hill works before this module arrives. main.js loads this with
// import() the first time you come near.
import * as THREE from 'three';
import { COLORS } from '../core/world.js';
import { StreetNpcs, PHRASES } from '../core/npcs.js';
import { hillHeightRel } from '../core/hill-ground.js';
import { addSnowCover } from '../core/snow-cover.js';

const CELL = 3; // m: the ground mesh's grid
// The ground grid is straight between its points, so on a bend of the slope
// it could rise through a street drawn just above the true height: it is
// drawn a little lower instead (you walk on the streets, at the true height).
const SINK = 0.15;

// Where the neighbours start (metres from the foot of the street): along the
// street and up and down the lanes.
const NEIGHBOURS = [[12, -2], [45, -18], [62, -55], [100, -36], [140, -48], [150, -75]];
const NAMES = ['지민', '서연', '현우', '민서', '태윤', '유나'];

// game: { scene, labels, roadGraph, roads (the joined map's), offset (the
// district's), hill (its meta.hill), groundY (world x, z -> height),
// randomLook }
export function createGyeongnidan(game) {
  const { hill, offset: [ox, oz] } = game;
  const [ax, az] = hill.at, [wx0, wz0, wx1] = hill.win, fade = hill.fade ?? 60;
  const fx = ax + ox, fz = az + oz; // the foot of the street, world metres
  const h = (x, z) => hillHeightRel(hill, x - fx, z - fz); // world (x, z)
  const group = new THREE.Group();
  group.name = 'gyeongnidan-hill';

  { // The ground: a grid over the hill, only where it is above the plain.
    const x0 = fx + wx0, x1 = fx + wx1 + fade, z0 = fz + wz0 - fade, z1 = fz + hill.zs;
    const nx = Math.ceil((x1 - x0) / CELL), nz = Math.ceil((z1 - z0) / CELL);
    const ys = new Float32Array((nx + 1) * (nz + 1));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) ys[j * (nx + 1) + i] = h(x0 + i * CELL, z0 + j * CELL);
    const pos = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => [x0 + a * CELL, ys[b * (nx + 1) + a], z0 + b * CELL]);
      if (Math.max(q[0][1], q[1][1], q[2][1], q[3][1]) < SINK) continue; // the plain: the city's own ground
      for (const k of [0, 3, 2, 0, 2, 1]) {
        const [x, y, z] = q[k];
        pos.push(x, y - SINK, z);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color: COLORS.ground })));
    ground.name = 'ground-hill';
    ground.receiveShadow = true;
    group.add(ground);
  }

  { // The streets on the slope: ribbons following the ground, a little above it.
    const sets = { major: [], minor: [], walk: [] };
    const STEP = 2;
    for (const r of game.roads) {
      if (!r.gy) continue;
      const out = r.k === 'walk' ? sets.walk : r.main ? sets.major : sets.minor;
      // (the main street on top where lanes join it)
      const lift = r.main ? 0.06 : r.k === 'walk' ? 0.03 : 0.045;
      for (let i = 1; i < r.p.length; i++) {
        const [x1, z1] = r.p[i - 1], [x2, z2] = r.p[i], len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 0.01) continue;
        const px = (-(z2 - z1) / len) * r.w / 2, pz = ((x2 - x1) / len) * r.w / 2;
        const n = Math.max(1, Math.ceil(len / STEP));
        // (a little past each end, so the bends have no gaps)
        const e = Math.min(r.w / 2, 3) / len;
        for (let k = 0; k < n; k++) {
          const t0 = (k / n) - (k === 0 ? e : 0), t1 = ((k + 1) / n) + (k === n - 1 ? e : 0);
          const at = (t, s) => { const x = x1 + (x2 - x1) * t + px * s, z = z1 + (z2 - z1) * t + pz * s; return [x, h(x, z) + lift, z]; };
          const a = at(t0, 1), b = at(t0, -1), c2 = at(t1, -1), d = at(t1, 1);
          out.push(...a, ...d, ...b, ...b, ...d, ...c2);
        }
      }
    }
    for (const [k, color] of [['major', COLORS.roadMajor], ['minor', COLORS.road], ['walk', COLORS.walk]]) {
      if (!sets[k].length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(sets[k], 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }), 0.8)); // (like the city's roads)
      m.name = 'roads-hill';
      m.receiveShadow = true;
      group.add(m);
    }
  }
  game.scene.add(group);

  // Neighbours: people who live here, out on the street and the lanes.
  const onHill = (x, z) => x > fx + wx0 && x < fx + wx1 && z > fz + wz0 && z < fz + hill.zs + 30;
  const npcs = new StreetNpcs(game.scene, game.labels, game.roadGraph, NEIGHBOURS.map(([x, z]) => ({ id: 'gyeongnidan', x: fx + x, z: fz + z })), 1, {
    keepIn: onHill,
    phrases: PHRASES.street,
    groundY: game.groundY,
    who: (i) => ({ name: NAMES[i % NAMES.length], look: game.randomLook() }),
  });

  return {
    group,
    npcs,
    update(dt, camera, w, hgt) { npcs.update(dt, camera, w, hgt); },
    nearest: (x, z) => npcs.nearest(x, z),
  };
}
