// Landmark models placed on hand-made districts (map "landmarks"): palace
// gates and halls with tiled roofs, a pavilion on a pond, statues, walls,
// street arches and Namsan with its tower.
// Low-poly and stylised, not to scale. Collision comes from the map's
// "blockers", so these are only visual.
import * as THREE from 'three';
import { buildAnotherLand } from './anotherland.js';
import { cableCarLandmark } from './cablecar.js';
import { PARK_BUILD, avenue } from './park-art.js';
import { sign } from './park-signs.js';
import { BANK, bankHeight, GROUND_TEXT, MIC, CASE } from './busking-layout.js';
import { buildSkatepark } from './skatepark-model.js';
import { peaceGate, loneTree } from './olympic-park.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const C = {
  stone: '#cfc4ae', stoneDark: '#b3a78f', wood: '#a23a2c', green: '#2f8f6b', roof: '#3d4450',
  roofEdge: '#2b3038', white: '#f3eee4', gold: '#d4a73a', bronze: '#55574f', door: '#3a2a22', plinth: '#8f8a80',
};

function box(g, sx, sy, sz, x, y, z, c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// A hipped tile roof (팔작지붕 feel): long slopes front and back up to a
// ridge along x, short triangles at the ends, eaves that lift a little at
// the four corners, and a ridge beam on top.
const roofGeo = new Map();
function hipRoofGeometry(w, d, h) {
  const key = [w, d, h].join();
  if (roofGeo.has(key)) return roofGeo.get(key);
  const hw = w / 2, hd = d / 2, r = Math.max(0, hw - hd * 0.9), lift = h * 0.18;
  // eave corners (lifted), eave mid points, ridge ends
  const P = {
    a: [-hw, lift, hd], b: [hw, lift, hd], c: [hw, lift, -hd], dd: [-hw, lift, -hd],
    m1: [0, 0, hd], m2: [0, 0, -hd], m3: [hw * 0.98, 0, 0], m4: [-hw * 0.98, 0, 0],
    r1: [-r, h, 0], r2: [r, h, 0],
  };
  const tris = [
    // front slope: a - m1 - b up to the ridge (a little sag in the middle of the eave)
    ['a', 'm1', 'r1'], ['m1', 'r2', 'r1'], ['m1', 'b', 'r2'],
    // back slope
    ['c', 'm2', 'r2'], ['m2', 'r1', 'r2'], ['m2', 'dd', 'r1'],
    // ends
    ['b', 'm3', 'r2'], ['m3', 'c', 'r2'], ['dd', 'm4', 'r1'], ['m4', 'a', 'r1'],
    // underside
    ['a', 'b', 'm1'], ['b', 'c', 'm3'], ['c', 'dd', 'm2'], ['dd', 'a', 'm4'], ['a', 'c', 'b'], ['a', 'dd', 'c'],
  ];
  const pos = [];
  for (const t of tris) for (const k of t) pos.push(...P[k]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  roofGeo.set(key, geo);
  return geo;
}
function roof(g, w, d, h, y, z = 0) {
  const r = new THREE.Mesh(hipRoofGeometry(w, d, h), new THREE.MeshLambertMaterial({ color: C.roof, flatShading: true, side: THREE.DoubleSide }));
  r.position.set(0, y, z);
  g.add(r);
  const ridgeLen = Math.max(1, w - d * 0.9);
  box(g, ridgeLen + 0.6, h * 0.14, h * 0.14, 0, y + h + h * 0.03, z, C.roofEdge); // ridge beam
  for (const sx of [-1, 1]) box(g, h * 0.18, h * 0.3, h * 0.14, sx * (ridgeLen / 2 + 0.2), y + h + h * 0.1, z, C.roofEdge); // ridge ends
  box(g, w * 0.92, h * 0.06, d * 0.04, 0, y + h * 0.02, z + d / 2 - d * 0.02, C.roofEdge); // eave edge, front
  box(g, w * 0.92, h * 0.06, d * 0.04, 0, y + h * 0.02, z - d / 2 + d * 0.02, C.roofEdge); // and back
}

// A wooden hall: red columns, a green painted band (단청), a roof.
function hall(g, w, d, h, y, z = 0, cols = 7) {
  box(g, w, h, d, 0, y + h / 2, z, C.white); // walls (paper doors)
  for (let i = 0; i < cols; i++) {
    const x = -w / 2 + (i * w) / (cols - 1);
    for (const sz of [-1, 1]) box(g, 0.6, h, 0.6, x, y + h / 2, z + sz * (d / 2 + 0.2), C.wood);
  }
  box(g, w + 1, h * 0.18, d + 1, 0, y + h * 0.95, z, C.green);
  roof(g, w * 1.35, d * 1.6, h * 0.9, y + h);
}

const BUILD = {
  anotherland: (g) => buildAnotherLand(g), // the theme park on Seokchon Lake's island (animated)
  skatepark: (g) => buildSkatepark(g), // the skate park on Olympic Park's Peace Plaza (layout: skatepark.js)
  peacegate: (g) => peaceGate(g), // Olympic Park (core/olympic-park.js)
  lonetree: (g) => loneTree(g),
  gwanghwamun(g) {
    // Stone base with three open arches you can walk through: a wide one in
    // the middle and a smaller one either side.
    for (const sx of [-1, 1]) {
      box(g, 17, 9, 16, sx * 21.5, 4.5, 0, C.stone); // outer block
      box(g, 4, 9, 16, sx * 7, 4.5, 0, C.stone); // pier between the arches
      box(g, 4, 4, 16, sx * 11, 7, 0, C.stone); // over the side arch
      box(g, 4.6, 0.5, 16.2, sx * 11, 5.1, 0, C.stoneDark); // its arch band
    }
    box(g, 10, 3, 16, 0, 7.5, 0, C.stone); // lintel over the middle arch
    box(g, 10.6, 0.5, 16.2, 0, 6.1, 0, C.stoneDark);
    box(g, 61, 0.6, 17, 0, 9.3, 0, C.stoneDark);
    // Two-storey wooden gate tower
    hall(g, 34, 9, 5, 9.6, 0, 6);
    hall(g, 28, 7, 4, 17.5, 0, 5);
    // Name board 광화문
    const sign = signBoard('光化門', 6, 1.8);
    sign.position.set(0, 16.2, 5.6);
    g.add(sign);
  },
  gate(g, l) {
    // A one-storey gate (e.g. Heungnyemun): white walls either side, an open
    // passage in the middle under the hall.
    const w = l.w || 24;
    box(g, w + 4, 0.3, 10, 0, 0.15, 0, C.stone);
    for (const sx of [-1, 1]) {
      box(g, w / 2 - 4, 5, 6, sx * (w / 4 + 2), 2.8, 0, C.white);
      for (const sz of [-1, 1]) box(g, 0.7, 5, 0.7, sx * 4, 2.8, sz * 3, C.wood); // door posts
    }
    box(g, 8.6, 0.8, 6.4, 0, 5.0, 0, C.wood); // beam over the passage
    hall(g, w, 6, 2.4, 5.3, 0, 7);
  },
  hall(g) {
    // Two-tier stone platform (월대), the throne hall on top, double roof.
    box(g, 52, 1.4, 34, 0, 0.7, 0, C.stone);
    box(g, 44, 1.4, 28, 0, 2.1, 0, C.stoneDark);
    box(g, 6, 2.8, 4, 0, 1.4, 18, C.stone); // front steps
    hall(g, 30, 14, 8, 2.8, 0, 7);
    hall(g, 24, 10, 5, 12.5, 0, 5);
    const sign = signBoard('勤政殿', 4.2, 1.4);
    sign.position.set(0, 14.6, 7.2);
    g.add(sign);
  },
  pavilion(g) {
    // Stone pillars standing in the pond, a raised floor, a big roof.
    box(g, 34, 1.2, 26, 0, 0.3, 0, C.stone); // island
    for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) box(g, 0.9, 5, 0.9, -13 + i * 5.2, 3.5, -9 + k * 6, C.stoneDark);
    box(g, 30, 0.8, 22, 0, 6.4, 0, C.wood);
    hall(g, 26, 18, 5, 6.8, 0, 6);
    for (const sx of [-1, 1]) box(g, 2, 0.6, 16, sx * 5, 0.3, 20, C.stone); // little bridges to the shore
  },
  statue(g, l) {
    if (l.kind === 'king') sejong(g);
    else admiralYi(g);
    // An information stone in front, facing the square.
    const info = STATUE_INFO[l.kind];
    if (info) {
      const stone = new THREE.Group();
      box(stone, 3.2, 2.2, 0.4, 0, 1.5, 0, C.stoneDark);
      box(stone, 3.6, 0.4, 0.8, 0, 0.2, 0, C.plinth);
      const face = plaque(info, 2.9, 1.9);
      face.position.set(0, 1.5, 0.21);
      stone.add(face);
      stone.position.set(l.kind === 'king' ? 5.5 : -5.5, 0, l.kind === 'king' ? 6.5 : 11);
      stone.rotation.y = l.kind === 'king' ? -0.35 : 0.35;
      g.add(stone);
    }
  },
  guard(g) {
    // A gate guard (수문장) in a red robe with a black hat and a flag.
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 1.4, 10), mat('#c8463c'));
    robe.position.y = 0.7;
    g.add(robe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat('#f2c9a5'));
    head.position.y = 1.65;
    g.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 14), mat('#1d1b22'));
    hat.position.y = 1.85;
    g.add(hat);
    box(g, 0.06, 2.6, 0.06, 0.55, 1.3, 0, C.door);
    box(g, 0.6, 0.5, 0.04, 0.85, 2.3, 0, '#ffd166');
  },
  arch(g, l) {
    // A street gate: two pillars and a lit sign across the street
    // (e.g. Itaewon's world food street). l.w: width, l.title / l.sub.
    const w = l.w || 12, H = 6.5, c = l.color || '#c0392b';
    for (const sx of [-1, 1]) {
      box(g, 0.7, H, 0.7, sx * w / 2, H / 2, 0, c);
      box(g, 1.1, 0.4, 1.1, sx * w / 2, 0.2, 0, C.plinth);
    }
    box(g, w + 1.4, 1.9, 0.5, 0, H + 0.6, 0, '#1d1b22');
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 192;
    const x = cv.getContext('2d');
    x.fillStyle = '#1d1b22'; x.fillRect(0, 0, 1024, 192);
    x.fillStyle = '#ffd36e'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '900 78px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    x.fillText(l.title || '', 512, 70);
    x.fillStyle = '#ffffff';
    x.font = '700 46px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    x.fillText(l.sub || '', 512, 146);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    for (const side of [1, -1]) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.2, (w + 1.2) * 0.1875), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(0, H + 0.6, side * 0.26);
      if (side < 0) sign.rotation.y = Math.PI;
      g.add(sign);
    }
    // Strings of little lights from the beam down to the pillars.
    for (let i = 0; i <= 10; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: ['#ffd36e', '#ff6b6b', '#6bd3ff'][i % 3] }));
      bulb.position.set(-w / 2 + (w * i) / 10, H - 0.45 - Math.sin((Math.PI * i) / 10) * 0.6, 0.3);
      g.add(bulb);
    }
  },
  arcade(g, l) {
    // A traditional market's roof (아케이드): a see-through barrel roof
    // along z over the alley, on thin posts in the gaps between the stalls,
    // with strings of round lamps under it. l.len: length, l.w: width,
    // l.h: height of the eaves, l.gap: post spacing.
    const len = l.len || 60, w = l.w || 12, h = l.h || 6, gap = l.gap || 12;
    for (let z = -len / 2; z <= len / 2 + 0.01; z += gap) {
      for (const sx of [-1, 1]) box(g, 0.18, h, 0.18, sx * (w / 2 - 0.9), h / 2, z, '#4a5560');
      box(g, w - 1.4, 0.16, 0.18, 0, h, z, '#4a5560'); // cross beam
    }
    for (const sx of [-1, 1]) box(g, 0.16, 0.16, len, sx * (w / 2 - 0.9), h, 0, '#4a5560'); // side rails
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(w / 2, w / 2, len, 20, 1, true, -Math.PI / 2, Math.PI),
      new THREE.MeshLambertMaterial({ color: '#cfe6dc', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
    );
    roof.rotation.x = Math.PI / 2;
    roof.scale.set(1, 1, 0.35); // a low curve
    roof.position.y = h;
    roof.userData.noShadow = true;
    g.add(roof);
    box(g, 0.2, 0.2, len, 0, h + w / 2 * 0.35, 0, '#4a5560'); // ridge
    const lamp = new THREE.SphereGeometry(0.22, 8, 6);
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ffe3a3' });
    for (let z = -len / 2 + gap / 2; z < len / 2; z += gap / 2) {
      const b = new THREE.Mesh(lamp, lampMat);
      b.position.set(0, h - 0.5, z);
      g.add(b);
    }
  },
  tracks(g, l) {
    // A stretch of old railway left in a park's grass (Gyeongui Line Forest
    // Park): two rails on wooden sleepers along z, flush with the ground so
    // you can walk over them. l.len: length. Sleepers are one InstancedMesh.
    const len = l.len || 100, gap = 0.9, n = Math.floor(len / gap);
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.08, 0.24), mat('#7a5a3a'), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) sleepers.setMatrixAt(i, m4.makeTranslation(0, 0.04, -len / 2 + gap / 2 + i * gap));
    g.add(sleepers);
    for (const sx of [-0.72, 0.72]) box(g, 0.08, 0.1, len, sx, 0.11, 0, '#8a8f99');
  },
  busking: (g) => buskingStage(g),
  cablecar: (g, l) => cableCarLandmark(g, l), // Namsan Sky Cable, seen from Itaewon
  sign, // wooden information boards (core/park-signs.js)
  ...PARK_BUILD, // Seoul Forest: rose garden, benches, plaza, ice cream sculptures (core/park-art.js)
  mountain(g, l) {
    // Bugaksan behind the palace (or Namsan behind Itaewon, l.scale).
    const m = new THREE.Mesh(new THREE.ConeGeometry(230, 110, 9, 2), mat('#7fae6b'));
    m.scale.set(1.4, 1, 0.7);
    if (l?.scale) m.scale.multiplyScalar(l.scale);
    m.position.y = 50 * (l?.scale || 1);
    g.add(m);
  },
  namsan(g, l) {
    // Namsan above Itaewon: a round wooded hill (l.rx, l.rz, l.h) with a
    // look-out tower on top. Scenery: the map's blockers keep you off it.
    const rx = l.rx || 170, rz = l.rz || 110, h = l.h || 70;
    const geo = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { // a little unevenness, not a dome
      const y = pos.getY(i);
      if (y > 0.02 && y < 0.98) pos.setY(i, y * (1 + 0.08 * Math.sin(i * 12.9898) * Math.sin(i * 4.1414)));
    }
    geo.computeVertexNormals();
    const hill = new THREE.Mesh(geo, mat('#86b56f'));
    hill.scale.set(rx, h, rz);
    g.add(hill);
    // Trees on the slopes (one instanced mesh), none on the summit.
    const tree = new THREE.ConeGeometry(4, 11, 6);
    tree.translate(0, 5, 0);
    const trees = new THREE.InstancedMesh(tree, mat('#4f8a4a'), 160);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    let n = 0, seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    while (n < 160) {
      const a = rnd() * Math.PI * 2, r = 0.2 + Math.sqrt(rnd()) * 0.75;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = h * Math.sqrt(Math.max(0, 1 - r * r)) - 1.5;
      const s = 0.7 + rnd() * 0.7;
      trees.setMatrixAt(n++, m4.compose(new THREE.Vector3(x * rx, y, z * rz), q, sc.set(s, s, s)));
    }
    g.add(trees);
    const tower = new THREE.Group();
    namsanTower(tower);
    tower.position.y = h - 1;
    tower.scale.setScalar(l.tower || 0.75);
    g.add(tower);
  },
};

// The look-out tower on Namsan: a white shaft, a round deck with windows,
// a red and white mast, and a ring of lights.
export function namsanTower(g, y0 = 0) {
  const cyl = (rt, rb, ht, y, c) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, ht, 16), mat(c));
    m.position.y = y + ht / 2;
    g.add(m);
    return m;
  };
  cyl(12, 13, 2, y0, C.stone); // terrace on the summit
  cyl(7, 8, 7, y0 + 2, C.white); // base building
  cyl(2.2, 3.4, 42, y0 + 9, '#e9e6df'); // shaft
  cyl(7.5, 6, 3, y0 + 49, C.white);
  cyl(7.2, 7.2, 5, y0 + 52, '#3f5470'); // windows
  cyl(6, 7.5, 2.5, y0 + 57, C.white);
  for (let i = 0; i < 6; i++) cyl(0.9 - i * 0.08, 1 - i * 0.08, 3.5, y0 + 59.5 + i * 3.5, i % 2 ? '#f3eee4' : '#d0463b'); // mast
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffe08a' }));
    bulb.position.set(Math.cos(a) * 7.6, y0 + 55.5, Math.sin(a) * 7.6);
    g.add(bulb);
  }
}

// The busking zone on Hongdae Walking Street (layout in core/busking-layout.js):
// a long grassy bank for the audience on the west side, the words BUSKING
// ZONE painted faintly on the street, and on the east side just a mic stand
// and an open guitar case. No stage or backdrop: the performers are the show.
function buskingStage(g) {
  // The bank: a grid that follows bankHeight, so you can walk up it.
  const B = BANK, nx = 24, nz = 60;
  const geo = new THREE.PlaneGeometry(B.front - B.back, B.z1 - B.z0, nx, nz).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (B.front + B.back) / 2, z = pos.getZ(i) + (B.z1 + B.z0) / 2;
    pos.setXYZ(i, x, bankHeight(x, z) + 0.03, z);
  }
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, mat('#8fca72')));
  // A low kerb of stones along the front edge.
  for (let z = B.z0 + B.end; z < B.z1 - B.end; z += 1.6) box(g, 0.5, 0.18, 1.3, B.front - 0.5, 0.09, z + 0.65, '#c9c3b8');
  // The words on the ground, faint, reading from the audience's side.
  const T = GROUND_TEXT;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  x.strokeStyle = '#5b4a6e'; x.lineWidth = 8; x.setLineDash([26, 18]);
  x.strokeRect(8, 8, 1008, 240);
  x.fillStyle = '#5b4a6e'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '900 104px system-ui, sans-serif'; x.fillText('BUSKING ZONE', 512, 104, 960);
  x.font = '800 64px "Noto Sans KR", system-ui, sans-serif'; x.fillText('버스킹존', 512, 196, 960);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const words = new THREE.Mesh(new THREE.PlaneGeometry(T.w, T.d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.3, depthWrite: false }));
  words.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); // flat, the tops of the letters to the east
  words.position.set(T.x, 0.1, T.z); // (above the plaza paving)
  words.userData.noShadow = true;
  g.add(words);
  // The singer's mic stand and open guitar case (tips land in it).
  box(g, 0.05, 1.5, 0.05, MIC[0], 0.75, MIC[1], '#8a8f99');
  box(g, 0.12, 0.2, 0.12, MIC[0], 1.55, MIC[1], '#2b2230');
  const caseG = new THREE.Group();
  box(caseG, 0.42, 0.1, 1.05, 0, 0.05, 0, '#1d1b22');
  box(caseG, 0.34, 0.03, 0.95, 0, 0.1, 0, '#b23a5a'); // the velvet lining
  const lid = box(caseG, 0.42, 0.06, 1.05, -0.24, 0.3, 0, '#1d1b22');
  lid.rotation.z = 1.25;
  caseG.position.set(CASE[0], 0, CASE[1]);
  g.add(caseG);
}

// A gold-on-black name board with hanja.
// The statues on Gwanghwamun Square, more detailed than the rest (they are
// public monuments): King Sejong seated on his throne with a book, and
// Admiral Yi Sun-sin standing with his sword, a turtle ship in front.
const GILT = '#c9a23a', GILT_DARK = '#a8842c', BRONZE = '#4f5a52', BRONZE_DARK = '#3a433d';
function cyl(g, rt, rb, h, x, y, z, c, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function sphere(g, r, x, y, z, c, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(c));
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  g.add(m);
  return m;
}
function sejong(g) {
  // Granite base in steps, with a band where the reliefs are.
  box(g, 9, 0.6, 11, 0, 0.3, 0, C.plinth);
  box(g, 7.6, 2.6, 9.4, 0, 1.9, 0, C.stone);
  box(g, 7.7, 0.7, 9.5, 0, 2.1, 0, C.stoneDark); // relief band
  box(g, 8, 0.3, 9.8, 0, 3.35, 0, C.plinth);
  const y0 = 3.5;
  // The throne: seat, a tall back and arm rests.
  box(g, 4.4, 1.6, 3.4, 0, y0 + 0.8, -0.4, GILT_DARK);
  box(g, 4.6, 4.2, 0.6, 0, y0 + 2.9, -2.0, GILT_DARK);
  box(g, 4.0, 0.5, 0.7, 0, y0 + 5.1, -2.0, GILT);
  for (const sx of [-1, 1]) box(g, 0.5, 1.0, 2.6, sx * 2.2, y0 + 2.0, -0.6, GILT_DARK);
  // The king in his dragon robe (곤룡포): lap, legs, body, wide sleeves.
  box(g, 3.2, 1.0, 2.4, 0, y0 + 2.0, 0.1, GILT); // lap
  box(g, 2.8, 1.8, 0.9, 0, y0 + 1.0, 1.25, GILT); // robe falling over the shins
  box(g, 3.0, 0.3, 0.9, 0, y0 + 0.15, 1.6, GILT_DARK); // shoes / hem
  box(g, 2.6, 2.6, 1.7, 0, y0 + 3.6, -0.5, GILT); // body
  cyl(g, 0.55, 0.55, 0.12, 0, y0 + 3.9, 0.36, GILT_DARK, 16).rotation.x = Math.PI / 2; // dragon roundel on the chest
  box(g, 2.7, 0.25, 1.8, 0, y0 + 2.9, -0.45, GILT_DARK); // belt
  for (const sx of [-1, 1]) {
    const arm = box(g, 0.9, 1.9, 1.1, sx * 1.65, y0 + 3.1, 0.1, GILT); // wide sleeve
    arm.rotation.x = -0.5;
    sphere(g, 0.25, sx * 0.9, y0 + 2.75, 0.95, GILT); // hand
  }
  // The open book in his left hand (훈민정음)
  const book = new THREE.Group();
  box(book, 0.8, 0.08, 1.0, -0.42, 0, 0, '#efe6cf');
  box(book, 0.8, 0.08, 1.0, 0.42, 0, 0, '#efe6cf');
  box(book, 1.7, 0.05, 1.05, 0, -0.05, 0, GILT_DARK);
  book.position.set(-0.6, y0 + 2.9, 1.1);
  book.rotation.set(-0.6, 0.2, 0.15);
  g.add(book);
  // Head: face, beard, and the winged crown (익선관).
  cyl(g, 0.38, 0.45, 0.4, 0, y0 + 5.05, -0.4, GILT); // neck / collar
  sphere(g, 0.75, 0, y0 + 5.75, -0.35, GILT, 1, 1.08, 1);
  sphere(g, 0.32, 0, y0 + 5.25, 0.15, GILT_DARK, 1, 1.3, 0.7); // beard
  for (const sx of [-1, 1]) sphere(g, 0.08, sx * 0.26, y0 + 5.9, 0.33, GILT_DARK); // eyes
  cyl(g, 0.72, 0.78, 0.55, 0, y0 + 6.45, -0.4, GILT_DARK, 18); // crown
  sphere(g, 0.55, 0, y0 + 6.75, -0.55, GILT_DARK, 1, 0.7, 0.9);
  for (const sx of [-1, 1]) { const wing = box(g, 0.75, 0.55, 0.08, sx * 0.55, y0 + 7.0, -1.05, GILT_DARK); wing.rotation.z = sx * 0.35; }
}
function admiralYi(g) {
  // A tall stone pedestal on a wide base.
  box(g, 7, 0.8, 7, 0, 0.4, 0, C.plinth);
  box(g, 5, 1.0, 5, 0, 1.3, 0, C.stoneDark);
  box(g, 3.8, 6.0, 3.8, 0, 4.8, 0, C.stone);
  box(g, 4.4, 0.6, 4.4, 0, 8.1, 0, C.stoneDark);
  const y0 = 8.4;
  // Armour: boots, a long armoured skirt, breastplate, shoulder guards, cape.
  for (const sx of [-1, 1]) box(g, 0.6, 1.2, 0.8, sx * 0.45, y0 + 0.6, 0.1, BRONZE_DARK);
  cyl(g, 1.0, 1.35, 2.2, 0, y0 + 2.2, 0, BRONZE, 10); // armoured skirt
  for (let i = 0; i < 4; i++) cyl(g, 1.02 + i * 0.09, 1.04 + i * 0.09, 0.12, 0, y0 + 3.1 - i * 0.55, 0, BRONZE_DARK, 10); // plates
  box(g, 2.2, 2.2, 1.4, 0, y0 + 4.3, 0, BRONZE); // breastplate
  box(g, 2.3, 0.3, 1.5, 0, y0 + 3.3, 0, BRONZE_DARK); // belt
  for (const sx of [-1, 1]) {
    sphere(g, 0.55, sx * 1.25, y0 + 5.15, 0, BRONZE_DARK, 1, 0.7, 1); // shoulder guard
    const arm = box(g, 0.55, 1.5, 0.6, sx * 0.85, y0 + 4.4, 0.55, BRONZE); // arms forward to the hilt
    arm.rotation.x = -0.9; arm.rotation.z = sx * 0.35;
  }
  box(g, 2.6, 4.2, 0.2, 0, y0 + 3.3, -0.8, BRONZE_DARK).rotation.x = 0.08; // cape
  // The great sword, point down in front, both hands on the hilt.
  box(g, 0.22, 3.4, 0.1, 0, y0 + 2.4, 1.05, '#7d8a80'); // blade
  box(g, 0.9, 0.18, 0.3, 0, y0 + 4.15, 1.05, BRONZE_DARK); // guard
  box(g, 0.2, 0.8, 0.2, 0, y0 + 4.6, 1.05, BRONZE_DARK); // grip
  sphere(g, 0.32, 0, y0 + 4.55, 1.0, BRONZE, 1.4, 0.8, 0.9); // hands
  // Head with a helmet, its brim and a plume on top.
  cyl(g, 0.35, 0.4, 0.4, 0, y0 + 5.55, 0, BRONZE);
  sphere(g, 0.68, 0, y0 + 6.2, 0, BRONZE, 1, 1.08, 1);
  for (const sx of [-1, 1]) sphere(g, 0.07, sx * 0.24, y0 + 6.3, 0.6, BRONZE_DARK);
  sphere(g, 0.3, 0, y0 + 5.75, 0.45, BRONZE_DARK, 1, 1.1, 0.6); // beard
  cyl(g, 0.72, 0.76, 0.55, 0, y0 + 6.75, 0, BRONZE_DARK, 16); // helmet
  cyl(g, 0.95, 0.95, 0.08, 0, y0 + 6.5, 0, BRONZE_DARK, 18); // brim
  cyl(g, 0.06, 0.06, 0.7, 0, y0 + 7.35, 0, BRONZE_DARK);
  sphere(g, 0.22, 0, y0 + 7.75, 0, '#7d3b33', 1, 1.4, 1); // plume
  // The turtle ship (거북선) in front: hull, spiked shell roof, dragon head.
  const ship = new THREE.Group();
  box(ship, 3.4, 0.9, 7.6, 0, 0.75, 0, '#6b4a2e');
  box(ship, 3.8, 0.25, 8.0, 0, 1.3, 0, '#5a3d25');
  const shell = sphere(ship, 1.9, 0, 1.4, 0, BRONZE, 1, 0.55, 2.0);
  shell.rotation.y = 0;
  for (let i = 0; i < 7; i++) for (const sx of [-1, 0, 1]) cyl(ship, 0.02, 0.07, 0.35, sx * 0.85, 2.3 - Math.abs(sx) * 0.25, -3 + i, BRONZE_DARK, 5); // spikes
  for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { const oar = box(ship, 0.08, 0.08, 1.4, sx * 2.1, 0.7, -2.5 + i, '#5a3d25'); oar.rotation.z = sx * 0.5; }
  const neck = box(ship, 0.7, 0.7, 1.2, 0, 1.8, 4.2, BRONZE);
  neck.rotation.x = -0.4;
  sphere(ship, 0.55, 0, 2.3, 4.8, BRONZE, 1, 0.9, 1.3); // dragon head
  for (const sx of [-1, 1]) sphere(ship, 0.1, sx * 0.3, 2.5, 5.25, '#d4a73a');
  box(ship, 0.4, 0.15, 0.5, 0, 2.05, 5.4, '#7d3b33'); // mouth
  box(ship, 4.6, 0.4, 9, 0, 0.2, 0, C.plinth);
  ship.position.set(0, 0, 8.5);
  g.add(ship);
}
const STATUE_INFO = {
  king: {
    title: '세종대왕 동상 · King Sejong the Great',
    ko: ['조선의 제4대 왕 (1397–1450).', '1443년 백성이 쉽게 쓰는 글자 훈민정음(한글)을', '만들었어요. 측우기·해시계 같은 과학 기구도', '이때 만들어졌어요. 손에 든 책이 훈민정음이에요.'],
    en: ['4th king of Joseon. In 1443 he created Hangeul,', 'the Korean alphabet, so everyone could read and write.'],
  },
  admiral: {
    title: '이순신 장군 동상 · Admiral Yi Sun-sin',
    ko: ['조선의 장군 (1545–1598). 임진왜란 때 바다에서', '23번 싸워 한 번도 지지 않았다고 전해져요.', '앞에 있는 배가 등에 쇠못을 박은 거북선이에요.', '광화문광장에서 남쪽 바다를 바라보고 서 있어요.'],
    en: ['Joseon admiral who led the navy in the Imjin War', '(1592–1598). In front: the armoured turtle ship.'],
  },
};
// A carved information plaque: a title, Korean lines, English lines.
function plaque(info, w, h) {
  const c = document.createElement('canvas');
  c.width = 768; c.height = 504;
  const x = c.getContext('2d');
  x.fillStyle = '#2b2a28'; x.fillRect(0, 0, 768, 504);
  x.strokeStyle = '#c9a23a'; x.lineWidth = 6; x.strokeRect(10, 10, 748, 484);
  x.fillStyle = '#e8c56a'; x.textAlign = 'center'; x.textBaseline = 'top';
  x.font = '800 40px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
  x.fillText(info.title, 384, 34);
  x.fillStyle = '#f4efe4'; x.font = '500 30px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
  info.ko.forEach((line, i) => x.fillText(line, 384, 106 + i * 44));
  x.fillStyle = '#c9c2b4'; x.font = 'italic 25px sans-serif';
  info.en.forEach((line, i) => x.fillText(line, 384, 106 + info.ko.length * 44 + 26 + i * 34));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

function signBoard(text, w, h) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 80;
  const x = c.getContext('2d');
  x.fillStyle = '#1d1b22'; x.fillRect(0, 0, 256, 80);
  x.strokeStyle = '#2f8f6b'; x.lineWidth = 6; x.strokeRect(3, 3, 250, 74);
  x.fillStyle = '#e8c56a'; x.font = '700 54px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

// A wall along a polyline: stone with a dark tiled cap.
function wall(g, l) {
  const h = l.h || 4;
  for (let i = 1; i < l.p.length; i++) {
    const [x0, z0] = l.p[i - 1], [x1, z1] = l.p[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const seg = new THREE.Group();
    box(seg, len, h, 1.4, 0, h / 2, 0, '#d9c9b0');
    box(seg, len + 0.6, 0.5, 2.2, 0, h + 0.2, 0, C.roof);
    seg.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    seg.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    g.add(seg);
  }
}

// Cherry trees in blossom along a polyline (l.p, e.g. round Seokchon Lake):
// one instanced mesh for the trunks and one for the pink crowns.
function blossoms(g, l) {
  const spots = [];
  for (let i = 1; i < l.p.length; i++) {
    const [x0, z0] = l.p[i - 1], [x1, z1] = l.p[i];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / (l.gap || 9)));
    for (let k = 0; k < n; k++) spots.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  const trunk = new THREE.CylinderGeometry(0.25, 0.35, 2.6, 6).translate(0, 1.3, 0);
  const crown = new THREE.IcosahedronGeometry(2.3, 0).translate(0, 3.8, 0);
  const trunks = new THREE.InstancedMesh(trunk, mat('#7a5240'), spots.length);
  const crowns = new THREE.InstancedMesh(crown, mat('#ffc4dc'), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const pinks = ['#ffc4dc', '#ffd6e6', '#ffb3d1', '#fff0f5'].map((c) => new THREE.Color(c));
  spots.forEach(([x, z], i) => {
    const s = 0.85 + ((i * 37) % 10) / 30;
    m4.compose(v.set(x, 0, z), q.setFromAxisAngle(v.clone().set(0, 1, 0), i * 1.3), sc.set(s, s, s));
    trunks.setMatrixAt(i, m4);
    crowns.setMatrixAt(i, m4);
    crowns.setColorAt(i, pinks[i % pinks.length]);
  });
  crowns.material = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true });
  g.add(trunks, crowns);
}

export function buildLandmarks(list = [], scene) {
  const root = new THREE.Group();
  root.name = 'landmarks';
  const ticks = [];
  for (const l of list) {
    const g = new THREE.Group();
    if (l.type === 'wall') wall(g, l);
    else if (l.type === 'blossoms') blossoms(g, l);
    else if (l.type === 'avenue') avenue(g, l); // (trees at map positions, like blossoms)
    else if (BUILD[l.type]) {
      const tick = BUILD[l.type](g, l);
      if (typeof tick === 'function') ticks.push(tick);
      g.position.set(l.x, l.y || 0, l.z); // (l.y: standing up on something, e.g. a hill's deck)
      g.rotation.y = l.ry || 0;
    } else continue;
    root.add(g);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
  scene.add(root);
  // Moving parts (Ferris wheel, coaster…): call with the time in seconds.
  root.userData.tick = (t) => { for (const f of ticks) f(t); };
  return root;
}
