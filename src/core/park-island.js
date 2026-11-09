// Another Land's island in Seokchon Lake, open to the street (stores.json
// "open", drawn over the street like a Han River park): the Cotton Candy
// Express exactly as it was (track, speed, station, attendant) with its candy
// wood round it, and the stairs down to the rest of the park under the
// island (the "another-land" room, store.below). The room is in the
// coaster's own metres; the island's shore (store.open.lawn, the same metres)
// is its edge, with a gap where Another Land Bridge lands (store.open.bridge).
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { buildCoaster } from './coaster-model.js';
import { GATE as COASTER_GATE } from './coaster.js';
import { inPoly } from './geom.js';
import { mergeStatic } from './merge-static.js';

const mat = matCache({ flatShading: true });
export const UNDER_SIGN = { ko: '어나더랜드 지하', en: 'ANOTHER LAND ▼', ja: 'アナザーランド地下', zh: '另一乐园地下', es: 'ANOTHER LAND ▼', id: 'ANOTHER LAND ▼', vi: 'ANOTHER LAND ▼', hi: 'ANOTHER LAND ▼', fr: 'ANOTHER LAND ▼', th: 'ANOTHER LAND ▼', ar: 'ANOTHER LAND ▼' };

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
  const { lawn, bridge, stairs } = store.open;
  const onIsland = (x, z, r = 0) => inPoly(x, z, lawn) && [[x + r, z], [x - r, z], [x, z + r], [x, z - r]].every(([a, b]) => inPoly(a, b, lawn));
  shoreWalls(lawn, bridge, block);

  const coaster = buildCoaster(scene, block, { lowSpec: typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || navigator.hardwareConcurrency <= 4) });
  const stations = {
    coaster: [{ x: COASTER_GATE.x, z: COASTER_GATE.z, ry: -Math.PI / 2 }],
    coasterStaff: [{ x: COASTER_GATE.x - 0.8, z: COASTER_GATE.z + 1.7, ry: Math.PI / 2 }],
  };
  // The candy wood, ponds, benches and cotton candy cart, kept on the island
  // and off the walk from the bridge to the station.
  const walk = [bridge, [stairs.x, stairs.z], [-22, -12], [COASTER_GATE.x + 1.5, COASTER_GATE.z]];
  candyLand(scene, block, seats, stations, { X0: ROOM.x0, X1: ROOM.x1, Z0: ROOM.z0, Z1: ROOM.z1 }, {
    inside: (x, z, r) => onIsland(x, z, r + 1.2),
    keep: walk.slice(1).map((b, i) => [walk[i], b]),
  });

  // A biscuit walk from the bridge to the stairs and on to the station.
  for (let i = 1; i < walk.length; i++) {
    const [x1, z1] = walk[i - 1], [x2, z2] = walk[i];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(3.2, len + 3.2).rotateX(-Math.PI / 2), mat('#ffe27a'));
    tile.position.set((x1 + x2) / 2, 0.05, (z1 + z2) / 2);
    tile.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    scene.add(tile);
  }

  // The stairs down to the rest of the park: a candy-striped pavilion over a
  // stairwell, its sign facing the walk.
  const S = stairs, g = new THREE.Group();
  const box = (sx, sy, sz, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  box(4.4, 0.2, 5.4, 0, 0.1, 0, '#e8d2b0'); // the rim
  box(3.4, 0.05, 4.4, 0, 0.21, 0.2, '#6b3f2a'); // the dark stairwell
  for (let i = 0; i < 5; i++) box(3.2, 0.06, 0.6, 0, 0.18 - i * 0.03, -1.4 + i * 0.85, '#c9a27a'); // steps going down
  for (const sx of [-1.9, 1.9]) for (const sz of [-2.4, 2.4]) box(0.3, 2.8, 0.3, sx, 1.4, sz, sz < 0 ? '#ff5a5f' : '#fffaf3');
  box(4.6, 0.35, 5.6, 0, 2.9, 0, '#ff8fb8'); // the canopy
  box(4.2, 0.3, 5.2, 0, 3.2, 0, '#fffaf3');
  const sign = signBoard();
  sign.mesh.position.set(0, 3.9, -2.2);
  g.add(sign.mesh);
  g.position.set(S.x, 0, S.z);
  g.rotation.y = S.ry;
  scene.add(g);
  // Fenced round but for the front, where the steps start.
  const c = Math.cos(S.ry), s = Math.sin(S.ry);
  const at = (x, z) => [S.x + x * c + z * s, S.z - x * s + z * c];
  for (const [x, z, w, d] of [[-2.1, 0.4, 0.3, 4.8], [2.1, 0.4, 0.3, 4.8], [0, 2.6, 4.4, 0.3]]) {
    const [bx, bz] = at(x, z);
    const turned = Math.abs(s) > 0.7;
    block(bx, bz, turned ? d : w, turned ? w : d);
  }
  const [fx, fz] = at(0, -3.4);
  stations.underground = [{ x: fx, z: fz, ry: S.ry + Math.PI }];

  const tick = (dt) => coaster.tick(Date.now() / 1000, dt);
  tick(0);
  mergeStatic(scene, [...coaster.trains.flat(), sign.mesh]);
  return {
    scene, products: [], vendors: [], colliders, seats, clerk: null, turntable: null, room: ROOM, exit: inward(bridge, [stairs.x, stairs.z]),
    rides: [], stations, tick, themepark: true, island: true, coaster, lights: { hemi, ambient, sun },
    setSignLang: (lang) => { coaster.setSignLang(lang); sign.draw(lang); },
  };
}

// A few steps in from the bridge towards `to` (enterStore puts you 1.4 m
// short of the exit, so that's on the island too).
function inward([x, z], [tx, tz]) {
  const d = Math.hypot(tx - x, tz - z) || 1;
  return { x: x + ((tx - x) / d) * 5, z: z + ((tz - z) / d) * 5 + 1.4 };
}

function signBoard() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lang) => {
    g.fillStyle = '#ff5f9e'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#fffaf3'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 54px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
    g.fillText(lang ? UNDER_SIGN[lang] || UNDER_SIGN.en : UNDER_SIGN.ko, 256, 66, 490);
    tex.needsUpdate = true;
  };
  draw(null);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: tex }));
  mesh.rotation.y = Math.PI; // (facing the walk, -z of the pavilion)
  return { mesh, draw };
}
