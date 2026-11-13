// Naksan (낙산) and the Seoul City Wall over it, from Heunginjimun to
// Hyehwamun: the hill's ground, the wall with its parapet, the two paths
// along it (outside at its foot, inside along the top), lamps, woods,
// Hyehwamun at 43.75%, and people out walking. The numbers come from
// scripts/build-naksan.mjs (dongmyo.json meta.ridge; the wall's blockers,
// the paths and the houses are ordinary map items, there from the start).
// The height is core/ridge-ground.js, which main.js uses from the start, so
// walking up works before this module arrives. game/naksan-near.js loads
// this with import() the first time you come near.
import * as THREE from 'three';
import { StreetNpcs, PHRASES } from '../core/npcs.js';
import { ridgeHeightSide, ridgeNear, ridgeBox } from '../core/ridge-ground.js';
import { stoneTexture, smallGate, MERLON, WALL_STONE as STONE } from './city-wall-parts.js';
import { addSnowCover } from '../core/snow-cover.js';

const CELL = 5; // m: the ground grid
const FINE = 4; // cells on the wall are cut into FINE x FINE (1.25 m), so none ramps up its face
const SINK = 0.15; // the grid is drawn this much lower (you walk on the true height)
const HIDE = 700; // m: past this from the hill, it is not drawn
const NAMES = ['하늘', '도윤', '수아', '지호', '예린', '준서'];

// game: { scene, labels, roadGraph, roads (the joined map's), buildings
// (the joined map's), offset (the district's), ridge (its meta.ridge),
// groundY (world x, z -> height), randomLook }
export function createNaksan(game) {
  const { ridge: r, offset: [ox, oz] } = game;
  const group = new THREE.Group();
  group.name = 'naksan';
  const side = (x, z) => (ridgeNear(r, x - ox, z - oz).d >= 0 ? 1 : -1);
  const hs = (x, z, s) => ridgeHeightSide(r, x - ox, z - oz, s); // world (x, z)
  const h = game.groundY;
  const [bx0, bz0, bx1, bz1] = ridgeBox(r, [ox, oz]);
  const line = r.line.map(([x, z, y, step]) => [x + ox, z + oz, y, step]);

  { // The ground: a grid over the hill, only where it is above the plain.
    const pos = [];
    const cell = (x0, z0, c) => {
      const s = side(x0 + c / 2, z0 + c / 2);
      const q = [[x0, z0], [x0 + c, z0], [x0 + c, z0 + c], [x0, z0 + c]].map(([x, z]) => [x, hs(x, z, s), z]);
      if (Math.max(q[0][1], q[1][1], q[2][1], q[3][1]) < SINK) return;
      for (const k of [0, 3, 2, 0, 2, 1]) pos.push(q[k][0], q[k][1] - SINK, q[k][2]);
    };
    for (let z = bz0; z < bz1; z += CELL) for (let x = bx0; x < bx1; x += CELL) {
      const near = ridgeNear(r, x + CELL / 2 - ox, z + CELL / 2 - oz);
      if (Math.abs(near.d) < CELL * 0.75 && near.step > 0.1) { // (where the outer foot is lower: the wall's face)
        const c = CELL / FINE;
        for (let j = 0; j < FINE; j++) for (let i = 0; i < FINE; i++) cell(x + i * c, z + j * c, c);
      } else cell(x, z, CELL);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color: 0xa8cf8c })));
    ground.name = 'ground-naksan';
    ground.receiveShadow = true;
    group.add(ground);
  }

  { // The paths on the slope: ribbons following the ground, a little above it.
    const out = [];
    const STEP = 2;
    for (const rd of game.roads) {
      if (!rd.nk) continue;
      for (let i = 1; i < rd.p.length; i++) {
        const [x1, z1] = rd.p[i - 1], [x2, z2] = rd.p[i], len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 0.01) continue;
        const px = (-(z2 - z1) / len) * rd.w / 2, pz = ((x2 - x1) / len) * rd.w / 2;
        const n = Math.max(1, Math.ceil(len / STEP)), e = Math.min(rd.w / 2, 2) / len;
        for (let k = 0; k < n; k++) {
          const t0 = k / n - (k === 0 ? e : 0), t1 = (k + 1) / n + (k === n - 1 ? e : 0);
          const at = (t, s) => { const x = x1 + (x2 - x1) * t + px * s, z = z1 + (z2 - z1) * t + pz * s; return [x, h(x, z) + 0.05, z]; };
          const a = at(t0, 1), b = at(t0, -1), c2 = at(t1, -1), d = at(t1, 1);
          out.push(...a, ...d, ...b, ...b, ...d, ...c2);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color: 0xc9a98a, side: THREE.DoubleSide }), 0.8)); // brick-red paving, as on the real trail
    m.name = 'paths-naksan';
    m.receiveShadow = true;
    group.add(m);
  }

  // A stretch through Hyehwamun is left out (the gate stands there; its arch is open),
  // as its blocker is (scripts/build-naksan.mjs).
  const inGate = (ax, az, bx, bz) => {
    const { x: gx, z: gz, ry: gr, W: gw, D: gd } = r.gate, c = Math.cos(gr), sn = Math.sin(gr);
    return [0, 0.25, 0.5, 0.75, 1].some((t) => {
      const dx = ax + (bx - ax) * t - gx - ox, dz = az + (bz - az) * t - gz - oz;
      return Math.abs(dx * c - dz * sn) < gw / 2 + 0.6 && Math.abs(dx * sn + dz * c) < gd / 2 + 0.6;
    });
  };
  const merlons = []; // [x, z, y, ry]
  { // The wall: a stone body from below the outer foot to just under the
    // parapet's height inside, and the parapet's blocks on its outer edge.
    const pos = [], uv = [], idx = [];
    const T = r.thick, top = r.parapet - MERLON.h; // the body's top above the inside ground
    const quad = (a, b, c, d, ua, ub, va, vb) => {
      const s = pos.length / 3;
      pos.push(...a, ...b, ...c, ...d);
      uv.push(ua, va, ub, va, ub, vb, ua, vb);
      idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    };
    let u = 0;
    for (const [i0, i1] of r.walls) {
      for (let i = i0 + 1; i <= i1; i++) {
        const [x1, z1, h1, s1] = line[i - 1], [x2, z2, h2, s2] = line[i];
        const len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 0.01 || inGate(x1, z1, x2, z2)) continue;
        const ux = (x2 - x1) / len, uz = (z2 - z1) / len, e = 0.25;
        // inside is the left of the line for ins 1 (x east, z south): (uz, -ux)
        const nx = uz * r.ins * T / 2, nz = -ux * r.ins * T / 2;
        const A = [x1 - ux * e, z1 - uz * e], B = [x2 + ux * e, z2 + uz * e];
        const y0a = h1 - s1 - 0.6, y0b = h2 - s2 - 0.6, y1a = h1 + top, y1b = h2 + top;
        const iA = [A[0] + nx, A[1] + nz], iB = [B[0] + nx, B[1] + nz], oA = [A[0] - nx, A[1] - nz], oB = [B[0] - nx, B[1] - nz];
        const U = 1 / 2.4, V = 1 / 1.2; // texture: blocks 0.6 m long, a course every 0.3 m
        quad([...oA.slice(0, 1), y0a, oA[1]], [oB[0], y0b, oB[1]], [oB[0], y1b, oB[1]], [oA[0], y1a, oA[1]], u * U, (u + len) * U, y0a * V, y1a * V); // outer face
        quad([iB[0], y0b, iB[1]], [iA[0], y0a, iA[1]], [iA[0], y1a, iA[1]], [iB[0], y1b, iB[1]], (u + len) * U, u * U, y0a * V, y1a * V); // inner face
        quad([oA[0], y1a, oA[1]], [oB[0], y1b, oB[1]], [iB[0], y1b, iB[1]], [iA[0], y1a, iA[1]], u * U, (u + len) * U, 0, T * V); // top
        u += len;
        // The parapet's blocks along this stretch, on the outer half.
        const mo = T / 2 - MERLON.t / 2;
        for (let s = 0.6; s < len; s += MERLON.len + MERLON.gap) {
          const t = Math.min(1, (s + MERLON.len / 2) / len);
          merlons.push([x1 + ux * (s + MERLON.len / 2) - (nx / (T / 2)) * mo, z1 + uz * (s + MERLON.len / 2) - (nz / (T / 2)) * mo, h1 + (h2 - h1) * t + top, Math.atan2(-uz, ux)]);
        }
      }
      // The stretch's ends: a face across the wall.
      for (const [k, dir] of [[i0, -1], [i1, 1]]) {
        const [x, z, y, st] = line[k], o = line[k + (dir < 0 ? 1 : -1)] || line[k];
        const len = Math.hypot(o[0] - x, o[1] - z) || 1, ux = (x - o[0]) / len, uz = (z - o[1]) / len;
        const nx = uz * T / 2, nz = -ux * T / 2, ex = x + ux * 0.25, ez = z + uz * 0.25;
        quad([ex - nx, y - st - 0.6, ez - nz], [ex + nx, y - st - 0.6, ez + nz], [ex + nx, y + top, ez + nz], [ex - nx, y + top, ez - nz], 0, T / 2.4, (y - st - 0.6) / 1.2, (y + top) / 1.2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = stoneTexture();
    const mat = new THREE.MeshLambertMaterial({ color: tex ? 0xffffff : STONE, map: tex, side: THREE.DoubleSide });
    const wall = new THREE.Mesh(geo, mat);
    wall.name = 'wall-naksan';
    wall.castShadow = wall.receiveShadow = true;
    group.add(wall);
    // The parapet: one instanced block (and its flat coping) for all of them.
    const block = new THREE.BoxGeometry(MERLON.len, MERLON.h, MERLON.t).translate(0, MERLON.h / 2, 0);
    const blocks = new THREE.InstancedMesh(block, new THREE.MeshLambertMaterial({ color: STONE, map: tex }), merlons.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    merlons.forEach(([x, z, y, ry], i) => {
      m4.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, ry), one);
      blocks.setMatrixAt(i, m4);
    });
    blocks.castShadow = true;
    group.add(blocks);
  }

  { // Hyehwamun (혜화문), 43.75%: a granite base with one round-topped arch
    // you walk through, and a small pavilion with a hipped roof.
    const { x, z, ry } = r.gate;
    const g = smallGate(r.gate, 'hyehwamun');
    g.position.set(x + ox, h(x + ox, z + oz), z + oz);
    g.rotation.y = ry;
    group.add(g);
  }

  const paths = game.roads.filter((rd) => rd.nk);
  const segDist = (x, z, rd) => {
    let best = Infinity;
    for (let i = 1; i < rd.p.length; i++) {
      const [ax, az] = rd.p[i - 1], [bx, bz] = rd.p[i], dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return best;
  };
  const nearPath = (x, z, m) => paths.some((rd) => segDist(x, z, rd) < m);

  { // Lamps along the outside path, every 14 m, on its outer side.
    const spots = [];
    const outer = paths[0];
    if (outer) {
      let carry = 0;
      for (let i = 1; i < outer.p.length; i++) {
        const [ax, az] = outer.p[i - 1], [bx, bz] = outer.p[i], len = Math.hypot(bx - ax, bz - az);
        if (len < 0.01) continue;
        const ux = (bx - ax) / len, uz = (bz - az) / len;
        for (let s = carry; s < len; s += 14) {
          const x = ax + ux * s - uz * r.ins * 1.6, zz = az + uz * s + ux * r.ins * 1.6; // to the outside of the path
          spots.push([x, zz, h(x, zz)]);
        }
        carry = (carry - len) % 14; if (carry < 0) carry += 14;
      }
    }
    const post = new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6).translate(0, 1.3, 0);
    const head = new THREE.BoxGeometry(0.32, 0.4, 0.32).translate(0, 2.75, 0);
    const posts = new THREE.InstancedMesh(post, new THREE.MeshLambertMaterial({ color: '#2b2b2e' }), spots.length);
    const heads = new THREE.InstancedMesh(head, new THREE.MeshBasicMaterial({ color: '#ffe2a6' }), spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach(([x, z, y], i) => { m4.makeTranslation(x, y, z); posts.setMatrixAt(i, m4); heads.setMatrixAt(i, m4); });
    group.add(posts, heads);
  }

  { // Woods on the hill, thickest along the wall; none on the paths, the
    // wall or in the houses.
    const houses = (game.buildings || []).filter((b) => b.nk);
    const inHouse = (x, z) => houses.some((b) => { const p = b.p; let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; });
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const spots = [];
    for (let k = 0; k < 9000 && spots.length < 340; k++) {
      const x = bx0 + rnd() * (bx1 - bx0), z = bz0 + rnd() * (bz1 - bz0);
      const y = h(x, z);
      if (y < 1.2) continue;
      const d = Math.abs(ridgeNear(r, x - ox, z - oz).d);
      if (d < 3 || d > 45 + rnd() * 20 || (d > 18 && rnd() < 0.55)) continue;
      if (Math.hypot(x - r.gate.x - ox, z - r.gate.z - oz) < 12) continue; // (Hyehwamun in view)
      if (nearPath(x, z, 2.6) || inHouse(x, z) || inHouse(x + 2, z) || inHouse(x - 2, z)) continue;
      spots.push([x, z, y, 0.75 + rnd() * 0.6]);
    }
    const trunk = new THREE.CylinderGeometry(0.14, 0.2, 2.2, 4, 1, true).translate(0, 1.1, 0);
    const crown = new THREE.IcosahedronGeometry(1.7, 0).translate(0, 3.1, 0);
    const trunks = new THREE.InstancedMesh(trunk, new THREE.MeshLambertMaterial({ color: '#6b5440' }), spots.length);
    const crowns = new THREE.InstancedMesh(crown, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), spots.length);
    const greens = ['#5f9a4a', '#6fae55', '#4f8a43', '#7bb463'].map((c) => new THREE.Color(c));
    const m4 = new THREE.Matrix4(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), q = new THREE.Quaternion();
    spots.forEach(([x, z, y, sc], i) => {
      m4.compose(p3.set(x, y - 0.1, z), q, s3.set(sc, sc, sc));
      trunks.setMatrixAt(i, m4);
      crowns.setMatrixAt(i, m4);
      crowns.setColorAt(i, greens[i % greens.length]);
    });
    group.add(trunks, crowns); // (no shadows: 340 trees would double their triangles)
  }
  game.scene.add(group);

  // People out walking the trail, both sides of the wall.
  const homes = [];
  for (const rd of paths) for (const t of [0.2, 0.5, 0.8]) { const p = rd.p[Math.floor(t * (rd.p.length - 1))]; homes.push({ id: 'naksan', x: p[0], z: p[1] }); }
  const npcs = new StreetNpcs(game.scene, game.labels, game.roadGraph, homes, 1, {
    keepIn: (x, z) => nearPath(x, z, 3),
    phrases: PHRASES.street,
    groundY: h,
    who: (i) => ({ name: NAMES[i % NAMES.length], look: game.randomLook() }),
  });

  const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, half = Math.hypot(bx1 - bx0, bz1 - bz0) / 2;
  return {
    group,
    npcs,
    update(p, dt, camera, w, hh) {
      const show = Math.hypot(p.x - cx, p.z - cz) < half + HIDE;
      if (group.visible !== show) group.visible = show;
      if (show) npcs.update(dt, camera, w, hh);
    },
    nearest: (x, z) => npcs.nearest(x, z),
  };
}
