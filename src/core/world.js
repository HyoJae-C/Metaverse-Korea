// Builds the 3D street scene from a region's map.json.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const ROAD_Y = { walk: 0.06, default: 0.04 };
const RAIL_DECK_Y = 9; // Line 2 runs on a viaduct through Seongsu

// Low-poly cartoon palette.
export const COLORS = {
  sky: 0xbfe3ff,
  ground: 0xe9e2d0,
  road: 0x8d8a8f,
  roadMajor: 0x7f7c84,
  walk: 0xd8cfc0,
  park: 0x9fd486,
  grass: 0xb4dc93,
  water: 0x7cc4e8,
  plaza: 0xd9d2c4, // stone paving (Gwanghwamun Square)
  sand: 0xe6d6b2, // palace courtyards
  roof: 0xf4efe6,
  rail: 0xb8bcc4,
  railTrack: 0x8a8f99,
};

// Warm, soft pastels for walls, with a matching roof colour for each.
const WALL_TINTS = [
  0xfbe3d3, 0xfff1d0, 0xe3f0f7, 0xefe4f7, 0xe2f2dc, 0xffd9c7,
  0xdfe8f1, 0xfaf3e6, 0xf6dcd2, 0xe9d8c6, 0xd6e4ea, 0xf3e5c8,
];
const ROOF_TINTS = [
  0xe08f78, 0xb7c7a0, 0x8fb0c4, 0xc9a3c9, 0x9cc28a, 0xe8a07f,
  0xa7b5c9, 0xd9c5a3, 0xd49a8a, 0xb8a089, 0x93b3bd, 0xd8b98a,
];

export function buildWorld(map, scene, opts = {}) {
  const lowSpec = !!opts.lowSpec;
  const group = new THREE.Group();
  group.name = 'world';

  const bounds = computeBounds(map);
  let obstacles = [], treeSpots = [];
  group.add(makeGround(bounds, opts.holes));

  // Paving first, then lawns and water a hair above so they don't flicker.
  for (const [kind, y] of [['plaza', 0.012], ['sand', 0.012], ['park', 0.02], ['grass', 0.022], ['water', 0.026]]) {
    const polys = map.areas.filter((a) => a.k === kind && !a.sunk).map((a) => a.p); // sunk: below the street (a stream's water, drawn by core/stream.js)
    const mesh = makeFlatPolys(polys, COLORS[kind], y, opts.holes); // (a stairwell in a park cuts the lawn too)
    if (mesh) group.add(mesh);
  }

  const majors = new Set(['motorway', 'trunk', 'primary', 'secondary']);
  const roadSets = {
    walk: map.roads.filter((r) => r.k === 'walk'),
    minor: map.roads.filter((r) => r.k !== 'walk' && !majors.has(r.k)),
    major: map.roads.filter((r) => majors.has(r.k)),
  };
  const roadMesh = (list, color, y) => {
    const m = makeRibbons(list, color, y);
    if (m) {
      m.receiveShadow = true;
      group.add(m);
    }
  };
  roadMesh(roadSets.walk, COLORS.walk, ROAD_Y.walk);
  roadMesh(roadSets.minor, COLORS.road, ROAD_Y.default);
  roadMesh(roadSets.major, COLORS.roadMajor, ROAD_Y.default + 0.005);

  const { walls, roofs } = makeBuildings(map.buildings);
  if (walls) group.add(walls);
  if (roofs) group.add(roofs);

  const rail = makeRail(map.rail);
  if (rail) group.add(rail);

  if (opts.collision) {
    // Landmarks with a "clear" radius (a rose garden, benches, sculptures) keep the trees off.
    const clear = (map.landmarks || []).filter((l) => l.clear && Number.isFinite(l.x)).map((l) => [l.x, l.z, l.clear]);
    const trees = makeStreetTrees(map.roads, opts.collision, lowSpec ? 900 : 2500, map.areas, clear);
    if (trees) { group.add(...trees); obstacles = trees.obstacles; treeSpots = trees.spots; }
  }

  if (!lowSpec) {
    group.traverse((o) => {
      if (o.isMesh && o.name !== 'ground') o.castShadow = ['walls', 'rail', 'trees'].includes(o.name);
      if (o.isMesh) o.receiveShadow = true;
    });
  }

  scene.add(group);
  return { group, bounds, obstacles, treeSpots };
}

export function computeBounds(map) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  const eat = (p) => {
    for (const [x, z] of p) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  };
  map.roads.forEach((r) => eat(r.p));
  map.buildings.forEach((b) => eat(b.p));
  if (!Number.isFinite(minX)) return { minX: -300, minZ: -300, maxX: 300, maxZ: 300 };
  return { minX, minZ, maxX, maxZ };
}

// holes: polygons cut out of the ground (subway stairwells you walk down).
function makeGround(b, holes = []) {
  const pad = 400;
  const x0 = b.minX - pad, x1 = b.maxX + pad, z0 = b.minZ - pad, z1 = b.maxZ + pad;
  const shape = toShape([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]);
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: COLORS.ground }));
  mesh.name = 'ground';
  mesh.receiveShadow = true;
  return mesh;
}

// Polygon in [x,z] → THREE.Shape in (x, -z) so that rotating the shape
// geometry by -90° about X puts it back on the ground plane at +z.
function toShape(p) {
  return new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
}

function makeFlatPolys(polys, color, y, holes = []) {
  if (!polys.length) return null;
  const geos = [];
  for (const p of polys) {
    if (p.length < 3) continue;
    const shape = toShape(p);
    for (const h of holes || []) if (h.every(([x, z]) => pointInPolygon(x, z, p))) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    geos.push(g);
  }
  if (!geos.length) return null;
  const geo = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  mesh.receiveShadow = true;
  return mesh;
}

// Road polylines → flat ribbons with round joints.
function makeRibbons(roads, color, y) {
  if (!roads.length) return null;
  const pos = [];
  const idx = [];
  const JOINT_SEGS = 8;
  const pushV = (x, z) => {
    pos.push(x, y, z);
    return pos.length / 3 - 1;
  };
  for (const r of roads) {
    const hw = r.w / 2;
    const p = r.p;
    for (let i = 0; i < p.length - 1; i++) {
      const [x1, z1] = p[i];
      const [x2, z2] = p[i + 1];
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      const nx = (-dz / len) * hw, nz = (dx / len) * hw;
      const a = pushV(x1 + nx, z1 + nz);
      const b = pushV(x1 - nx, z1 - nz);
      const c = pushV(x2 - nx, z2 - nz);
      const d = pushV(x2 + nx, z2 + nz);
      idx.push(a, d, b, b, d, c);
    }
    // Round caps at each vertex fill the gaps at bends and junctions.
    for (const [x, z] of p) {
      const c = pushV(x, z);
      const first = pos.length / 3;
      for (let s = 0; s < JOINT_SEGS; s++) {
        const ang = (s / JOINT_SEGS) * Math.PI * 2;
        pushV(x + Math.cos(ang) * hw, z + Math.sin(ang) * hw);
      }
      for (let s = 0; s < JOINT_SEGS; s++) {
        idx.push(c, first + ((s + 1) % JOINT_SEGS), first + s);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: -1 }),
  );
}

// Window texture: one tile = one bay (3 m wide) × one storey (3.2 m tall).
function makeWindowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#f1ece4'; // frame
  g.fillRect(17, 17, 30, 28);
  g.fillStyle = '#b5d8e8'; // glass
  g.fillRect(20, 20, 24, 22);
  g.fillStyle = '#d9eef6'; // reflection
  g.fillRect(20, 20, 24, 6);
  g.fillStyle = '#efe6d8'; // sill
  g.fillRect(15, 45, 34, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeBuildings(buildings) {
  const wPos = [], wUv = [], wCol = [], wIdx = [];
  const rPos = [], rIdx = [], rCol = [];
  const roofCol = new THREE.Color();
  const col = new THREE.Color();
  const BAY = 3, STOREY = 3.2;

  buildings.forEach((b, bi) => {
    let p = b.p;
    if (p.length < 3) return;
    if (b.custom) return; // drawn by its landmark (e.g. Olympic Park Pool); still a wall and a shop front
    // Ensure counter-clockwise (in x,-z) so wall normals face outward.
    if (signedArea(p) < 0) p = [...p].reverse();
    const base = b.m || 0;
    const top = b.h;
    const tint = (bi * 7 + p.length) % WALL_TINTS.length;
    col.setHex(WALL_TINTS[tint]);
    roofCol.setHex(ROOF_TINTS[tint]);
    if (b.wall) col.set(b.wall); // (a landmark building in its own stone, e.g. the War Memorial)
    if (b.roof) roofCol.set(b.roof);

    let u = 0;
    for (let i = 0; i < p.length; i++) {
      const [x1, z1] = p[i];
      const [x2, z2] = p[(i + 1) % p.length];
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.01) continue;
      const v0 = base / STOREY, v1 = top / STOREY;
      const u0 = u / BAY, u1 = (u + len) / BAY;
      const s = wPos.length / 3;
      wPos.push(x1, base, z1, x2, base, z2, x2, top, z2, x1, top, z1);
      wUv.push(u0, v0, u1, v0, u1, v1, u0, v1);
      for (let k = 0; k < 4; k++) wCol.push(col.r, col.g, col.b);
      wIdx.push(s, s + 1, s + 2, s, s + 2, s + 3);
      u += len;
    }

    const contour = p.map(([x, z]) => new THREE.Vector2(x, -z));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const s = rPos.length / 3;
    for (const [x, z] of p) {
      rPos.push(x, top, z);
      rCol.push(roofCol.r, roofCol.g, roofCol.b);
    }
    for (const [a, bb, c] of tris) rIdx.push(s + a, s + c, s + bb);
  });

  let walls = null, roofs = null;
  if (wPos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(wPos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(wUv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(wCol, 3));
    g.setIndex(wIdx);
    g.computeVertexNormals();
    walls = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: makeWindowTexture(), vertexColors: true }));
    walls.name = 'walls';
  }
  if (rPos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(rCol, 3));
    g.setIndex(rIdx);
    g.computeVertexNormals();
    roofs = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    roofs.name = 'roofs';
  }
  return { walls, roofs };
}

// Signed area in (x, -z) space; positive = counter-clockwise.
export function signedArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i];
    const [x2, z2] = p[(i + 1) % p.length];
    a += x1 * -z2 - x2 * -z1;
  }
  return a / 2;
}

// Elevated rail: a deck on pillars. Ground-level rail: just the track bed.
function makeRail(rails) {
  if (!rails.length) return null;
  const geos = [];
  const deckW = 9;
  for (const r of rails) {
    const y = r.e ? RAIL_DECK_Y : 0.08;
    let sinceLastPillar = Infinity;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i];
      const [x2, z2] = r.p[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.01) continue;
      const deck = new THREE.BoxGeometry(len + 0.5, r.e ? 1.2 : 0.15, r.e ? deckW : 4);
      deck.rotateY(-Math.atan2(z2 - z1, x2 - x1));
      deck.translate((x1 + x2) / 2, y, (z1 + z2) / 2);
      geos.push(deck);
      if (r.e) {
        // Pillars roughly every 30 m.
        let d = 30 - Math.min(sinceLastPillar, 30);
        while (d <= len) {
          const t = d / len;
          const px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t;
          const pillar = new THREE.CylinderGeometry(0.9, 1.1, RAIL_DECK_Y, 8);
          pillar.translate(px, RAIL_DECK_Y / 2 - 0.6, pz);
          geos.push(pillar);
          d += 30;
        }
        sinceLastPillar = len - (d - 30);
      }
    }
  }
  if (!geos.length) return null;
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const geo = mergeGeometries(nonIndexed.map((g) => {
    g.deleteAttribute('uv');
    return g;
  }));
  geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: COLORS.rail }));
  mesh.name = 'rail';
  return mesh;
}

// Decorative round street trees along the edges of vehicle roads, and a
// loose grove in parks marked "trees" (e.g. Seoul Forest): round trees big
// and small, tall pointed ones, and bushes in between. These are scenery,
// not map data: placed where nothing else is in the way (clear: [x, z, r]
// circles kept free, e.g. a rose garden).
function makeStreetTrees(roads, collision, max, areas = [], clear = []) {
  const spots = []; // [x, z, scale] round trees
  const pines = []; // [x, z, scale] pointed trees (parks)
  const bushes = []; // [x, z, scale] (parks)
  const hash = (x, z) => { const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return h - Math.floor(h); };
  const isClear = (x, z, r) => clear.every(([cx, cz, cr]) => (x - cx) ** 2 + (z - cz) ** 2 > (cr + r) ** 2);
  // Wooded parks: a jittered grid, ~12 m apart, off the paths.
  const PARK = 12;
  // Round crowns in the parks: mostly green, some ginkgo yellow.
  const parkGreens = [0x8fcf7a, 0x7cc46e, 0xa3d98a, 0x95c97d, 0x6fb85f].map((h) => new THREE.Color(h));
  const yellows = [0xf2c94c, 0xe8b730, 0xf5d76e].map((h) => new THREE.Color(h));
  const crownColor = (h) => (h < 0.22 ? yellows[Math.floor(h * 100) % yellows.length] : parkGreens[Math.floor(h * 1000) % parkGreens.length]);
  for (const a of areas) {
    if (!a.trees) continue;
    const xs = a.p.map((q) => q[0]), zs = a.p.map((q) => q[1]);
    // The edge of the wood: two rows of big trees just inside its outline.
    for (const [inset, gap] of [[3.5, 6.5], [9, 8]]) {
      for (let i = 0; i < a.p.length; i++) {
        const [x1, z1] = a.p[i], [x2, z2] = a.p[(i + 1) % a.p.length];
        const len = Math.hypot(x2 - x1, z2 - z1);
        if (len < 1) continue;
        const ux = (x2 - x1) / len, uz = (z2 - z1) / len;
        for (let d = gap / 2; d < len; d += gap) {
          for (const side of [1, -1]) { // (inside is whichever side is in the polygon)
            const h = hash(x1 + d, z1 + inset), h2 = hash(z1 + d * 1.3, x1 + inset);
            const px = x1 + ux * d - uz * inset * side + (h - 0.5) * 2, pz = z1 + uz * d + ux * inset * side + (h2 - 0.5) * 2;
            if (!pointInPolygon(px, pz, a.p) || edgeDist(px, pz, a.p) < inset - 2.5) continue;
            const pine = h2 < 0.3, s = pine ? 2.2 + h * 1.0 : 2.3 + h * 1.1;
            if (isClear(px, pz, 0.9 * s) && !collision.blocked(px, pz, 1.2) && !onAnyRoad(roads, px, pz, 2)) (pine ? pines : spots).push([px, pz, s, pine ? null : crownColor(h2)]);
          }
        }
      }
    }
    for (let x = Math.min(...xs) + PARK / 2; x < Math.max(...xs); x += PARK) {
      for (let z = Math.min(...zs) + PARK / 2; z < Math.max(...zs); z += PARK) {
        if (spots.length + pines.length >= max / 2) break;
        const h = hash(x, z), h2 = hash(z, x);
        if (edgeDist(x, z, a.p) < 12) continue; // (the edge rows are there)
        const jx = (h - 0.5) * PARK * 0.7, jz = (((h * 7) % 1 + 1) % 1 - 0.5) * PARK * 0.7;
        const px = x + jx, pz = z + jz;
        // Sizes from a young tree to a big old one; about one in four pointed.
        const pine = h2 < 0.26, s = pine ? 1.3 + ((h2 * 13) % 1) * 1.2 : 1.1 + ((h2 * 17) % 1) ** 1.3 * 1.8;
        const r = 0.9 * s;
        if (pointInPolygon(px, pz, a.p) && isClear(px, pz, r) && !collision.blocked(px, pz, r) && !onAnyRoad(roads, px, pz, r - 0.6)) {
          (pine ? pines : spots).push([px, pz, s, pine ? null : crownColor(hash(px, pz))]);
        }
        // A bush or two between the trees.
        for (let k = 0; k < 2; k++) {
          const bx = x + ((h * (31 + k * 17)) % 1 - 0.5) * PARK, bz = z + ((h2 * (23 + k * 11)) % 1 - 0.5) * PARK;
          const bs = 0.5 + ((h * (5 + k)) % 1) * 0.6;
          if (pointInPolygon(bx, bz, a.p) && isClear(bx, bz, bs) && !collision.blocked(bx, bz, bs) && !onAnyRoad(roads, bx, bz)) bushes.push([bx, bz, bs]);
        }
      }
    }
  }
  const parkRound = spots.length; // (street trees come after the park's)
  const SPACING = 14;
  for (const r of roads) {
    if (r.k === 'walk' || r.k === 'service' || r.w < 6) continue;
    const off = r.w / 2 + 1.2;
    let carry = SPACING / 2;
    for (let i = 0; i < r.p.length - 1 && spots.length < max; i++) {
      const [x1, z1] = r.p[i];
      const [x2, z2] = r.p[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.01) continue;
      const ux = (x2 - x1) / len, uz = (z2 - z1) / len;
      let d = carry;
      for (; d < len; d += SPACING) {
        for (const side of [1, -1]) {
          const x = x1 + ux * d - uz * off * side;
          const z = z1 + uz * d + ux * off * side;
          if (!collision.blocked(x, z, 1.4) && !onAnyRoad(roads, x, z) && isClear(x, z, 1.4)) spots.push([x, z, 0.85 + ((spots.length * 37) % 10) / 25]);
        }
      }
      carry = d - len;
    }
  }
  if (!spots.length && !pines.length) return null;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const greens = [0x8fcf7a, 0x7cc46e, 0xa3d98a, 0x95c97d].map((h) => new THREE.Color(h));
  const out = [];
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0xa47a55 });
  const tint = new THREE.MeshLambertMaterial({ color: 0xffffff });
  // instanced(list, geometry, material, colours?)
  const instanced = (list, geo, material, colors, yScale = 1) => {
    const mesh = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach(([x, z, s], i) => {
      q.setFromAxisAngle(up, i * 1.7);
      m.compose(pos.set(x, 0, z), q, sc.set(s, s * yScale, s));
      mesh.setMatrixAt(i, m);
      if (colors) mesh.setColorAt(i, list[i][3] || colors[i % colors.length]);
    });
    mesh.name = 'trees';
    mesh.castShadow = true;
    out.push(mesh);
  };
  if (spots.length) {
    instanced(spots, new THREE.CylinderGeometry(0.16, 0.22, 1.6, 6).translate(0, 0.8, 0), trunkMat);
    instanced(spots, new THREE.IcosahedronGeometry(1.25, 1).translate(0, 2.5, 0), tint, greens);
  }
  if (pines.length) {
    const pine = mergeGeometries([
      new THREE.ConeGeometry(1.35, 2.2, 7).translate(0, 2.1, 0),
      new THREE.ConeGeometry(1.0, 1.9, 7).translate(0, 3.2, 0),
      new THREE.ConeGeometry(0.62, 1.4, 7).translate(0, 4.2, 0),
    ].map((g) => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
    instanced(pines, new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6).translate(0, 0.6, 0), trunkMat);
    instanced(pines, pine, tint, [0x5f9e5a, 0x6fae62, 0x4f8f4f].map((h) => new THREE.Color(h)), 1.1);
  }
  if (bushes.length) instanced(bushes, new THREE.IcosahedronGeometry(0.8, 1).translate(0, 0.5, 0), tint, [0x7fbf68, 0x6db35c, 0x93c97a].map((h) => new THREE.Color(h)), 0.8);
  // What stands on the park lawns, for things put down on the grass (picnic
  // mats): [x, z, r] trunks and bushes.
  out.spots = spots.map(([x, z]) => [x, z]); // every leafy tree, for posters
  out.obstacles = [...spots.slice(0, parkRound).map(([x, z, s]) => [x, z, 0.35 * s]), ...pines.map(([x, z, s]) => [x, z, 0.5 * s]), ...bushes.map(([x, z, s]) => [x, z, 0.75 * s])];
  return out;
}

// Distance from (x, z) to the nearest side of polygon p.
function edgeDist(x, z, p) {
  let best = Infinity;
  for (let i = 0; i < p.length; i++) {
    const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length];
    const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2));
    best = Math.min(best, Math.hypot(x1 + t * dx - x, z1 + t * dz - z));
  }
  return best;
}

function pointInPolygon(x, z, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

export function onAnyRoad(roads, x, z, pad = 0.3) {
  for (const r of roads) {
    const hw = r.w / 2 + Math.max(0.3, pad, r.clear || 0); // clear: an avenue's own trees line it, keep the others back
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i];
      const [x2, z2] = r.p[i + 1];
      if (Math.min(x1, x2) - hw > x || Math.max(x1, x2) + hw < x) continue;
      if (Math.min(z1, z2) - hw > z || Math.max(z1, z2) + hw < z) continue;
      const dx = x2 - x1, dz = z2 - z1;
      const l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2));
      if ((x1 + t * dx - x) ** 2 + (z1 + t * dz - z) ** 2 < hw * hw) return true;
    }
  }
  return false;
}
