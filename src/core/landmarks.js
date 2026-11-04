// Landmark models placed on hand-made districts (map "landmarks"): palace
// gates and halls with tiled roofs, a pavilion on a pond, statues, walls,
// street arches and Namsan with its tower.
// Low-poly and stylised, not to scale. Collision comes from the map's
// "blockers", so these are only visual.
import * as THREE from 'three';
import { buildAnotherLand } from './anotherland.js';

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

// A hipped tile roof (팔작지붕 feel): a flattened 4-sided pyramid with the
// long side along x, a little ridge on top, and upturned corner tips.
function roof(g, w, d, h, y, z = 0) {
  const r = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1), mat(C.roof));
  r.rotation.y = Math.PI / 4;
  r.scale.set(w, h, d);
  r.position.set(0, y + h / 2, z);
  g.add(r);
  box(g, w * 0.55, h * 0.18, d * 0.12, 0, y + h * 0.82, z, C.roofEdge); // ridge
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { // corner tips
    const tip = box(g, w * 0.06, h * 0.12, w * 0.06, sx * w * 0.5, y + h * 0.08, z + sz * d * 0.5, C.roofEdge);
    tip.rotation.z = -sx * 0.4;
  }
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
  gwanghwamun(g) {
    // Stone base with three arches; the middle one is the way in.
    for (const sx of [-1, 1]) box(g, 25, 9, 16, sx * 17.5, 4.5, 0, C.stone);
    box(g, 10, 3, 16, 0, 7.5, 0, C.stone); // lintel over the middle arch
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 4, 5, 0.2, sx * 11, 2.5, sz * 8.05, C.door); // side arches (closed)
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
    const w = l.w || 24;
    box(g, w + 4, 1.2, 10, 0, 0.6, 0, C.stone);
    for (const sx of [-1, 1]) box(g, w / 2 - 4, 5, 6, sx * (w / 4 + 2), 3.7, 0, C.white);
    hall(g, w, 6, 5.5, 1.2, 0, 7);
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
    box(g, 6, 3, 8, 0, 1.5, 0, C.plinth);
    if (l.kind === 'king') {
      // King Sejong, seated, in gold.
      box(g, 3.4, 2.4, 3, 0, 4.2, 0.3, C.gold); // lap / robe
      box(g, 3, 3.2, 2.2, 0, 6.2, -0.4, C.gold); // body
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), mat(C.gold));
      head.position.set(0, 8.4, -0.3);
      g.add(head);
      box(g, 1.6, 0.9, 1.6, 0, 9.3, -0.3, C.gold); // crown hat
      box(g, 1.2, 0.2, 1.6, 1.3, 5.2, 1.2, C.white); // a book
    } else {
      // Admiral Yi, standing, in bronze, holding a sword.
      box(g, 2.2, 5, 1.6, 0, 5.5, 0, C.bronze);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), mat(C.bronze));
      head.position.set(0, 8.7, 0);
      g.add(head);
      box(g, 1.3, 0.8, 1.3, 0, 9.5, 0, C.bronze);
      box(g, 0.2, 4, 0.2, 0.9, 5.5, 1, C.bronze); // sword
      box(g, 9, 1, 2, 0, 0.5, 6, C.plinth); // the turtle-ship plinth in front
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
function namsanTower(g, y0 = 0) {
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

// A gold-on-black name board with hanja.
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
    else if (BUILD[l.type]) {
      const tick = BUILD[l.type](g, l);
      if (typeof tick === 'function') ticks.push(tick);
      g.position.set(l.x, 0, l.z);
      g.rotation.y = l.ry || 0;
    } else continue;
    root.add(g);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(root);
  // Moving parts (Ferris wheel, coaster…): call with the time in seconds.
  root.userData.tick = (t) => { for (const f of ticks) f(t); };
  return root;
}
