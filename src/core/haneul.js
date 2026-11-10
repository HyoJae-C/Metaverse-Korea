// HANEUL (하늘), a fictional department store and mall on the north shore of
// Seokchon Lake (Songpa), where a big shopping complex stands by Jamsil
// Station in real life, and Another Tower beside the station, where the real
// 555 m tower stands. The names and the designs are our own.
//   haneulstore: a store block (department store or mall) with glass bands
//                and a name board on the roof, seen from Olympic-ro and the lake.
//   haneultower: Another Tower, a tapering octagonal glass tower with a spire, the landmark
//                you spot from across the river.
// Their footprints are buildings in the map with "custom": true (collision and
// the shop door), drawn here instead of the usual windowed block.
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';
import { farFree } from './far-textures.js';

const mat = matCache({ flatShading: true });
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const SKY = '#4f8fd8';

// The roof board: the brand in big letters, the kind of store under it.
function boardTexture(title, sub, accent) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 1024, 256);
  x.fillStyle = accent; x.fillRect(0, 226, 1024, 30);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = accent;
  x.font = '900 120px "Helvetica Neue", Arial, system-ui, sans-serif';
  x.fillText(title, 512, 96);
  x.fillStyle = '#3a4a5c';
  x.font = '700 48px "Helvetica Neue", Arial, system-ui, sans-serif';
  x.fillText(sub, 512, 186);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return farFree(tex);
}

// w (along x), d (along z), h: the footprint and height in the map.
export function haneulStore(g, l) {
  const w = l.w || 100, d = l.d || 34, h = l.h || 24, accent = l.accent || SKY;
  const glass = new THREE.MeshLambertMaterial({ color: l.glass || '#7fa9cc' });
  box(g, w, h, d, 0, h / 2, 0, l.wall || '#efe9de');
  // Ribbon windows: a glass band round each upper floor.
  for (let y = 6.5; y < h - 3; y += 4.5) box(g, w + 0.3, 2.4, d + 0.3, 0, y, 0, glass);
  // A canopy along the street side over the ground floor (doors stay clear below it).
  box(g, w + 0.6, 0.5, 1.6, 0, 4.6, -d / 2 - 0.6, accent);
  box(g, w + 0.6, 0.5, 1.6, 0, 4.6, d / 2 + 0.6, accent);
  box(g, w + 0.8, 1, d + 0.8, 0, h + 0.5, 0, '#d9d2c4'); // cornice
  if (l.vault) { // the mall's glass roof over its atrium
    const v = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.32, d * 0.32, w * 0.7, 20, 1, false, 0, Math.PI), glass);
    v.rotation.z = Math.PI / 2;
    v.scale.set(0.5, 1, 1);
    v.position.y = h + 1;
    g.add(v);
  }
  // The name board on the roof, both faces (Olympic-ro to the north, the lake to the south).
  const bw = Math.min(46, w * 0.55), bh = bw / 4;
  const by = h + 1 + bh / 2 + (l.vault ? d * 0.16 + 0.6 : 0.6);
  box(g, bw + 0.8, bh + 0.8, 0.6, 0, by, 0, '#ffffff');
  for (const s of [1, -1]) box(g, 0.6, by - h, 0.6, s * bw * 0.35, h + (by - h) / 2, 0, '#b8b2a6');
  const face = new THREE.MeshBasicMaterial({ map: boardTexture(l.title || 'HANEUL', l.sub || '', accent) });
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), face);
    m.position.set(0, by, s * 0.32);
    if (s < 0) m.rotation.y = Math.PI;
    g.add(m);
  }
}

// The tower: TIERS octagonal sections narrowing upwards, white rings between
// them, a lantern and a spire with a red light on top. r: base radius (the
// map's octagon, corners at sin/cos of k·45°, the same as CylinderGeometry).
// 278 m to the tip, half the real 555 m tower, and 35 m across at the base,
// the real tower's own shape at that height (Yozi: a map exception).
export const TOWER = { r: 17.5, top: 7.8, tiers: 6, tier: 40, lantern: 12, spire: 26 };
export function haneulTower(g) {
  const T = TOWER;
  const glass = new THREE.MeshLambertMaterial({ color: '#9cc3e0', flatShading: true });
  const rAt = (i) => T.r + ((T.top - T.r) * i) / T.tiers;
  for (let i = 0; i < T.tiers; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rAt(i + 1), rAt(i), T.tier, 8), glass);
    m.position.y = i * T.tier + T.tier / 2;
    g.add(m);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(rAt(i + 1) + 0.5, rAt(i + 1) + 0.5, 1.4, 8), mat('#f4f1ea'));
    ring.position.y = (i + 1) * T.tier;
    g.add(ring);
  }
  const H = T.tiers * T.tier;
  // White fins up the eight corners make it read as one tall shape from afar.
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, r0 = rAt(0), r1 = rAt(T.tiers);
    const fin = box(g, 0.9, Math.hypot(H, r0 - r1), 0.9, Math.sin(a) * (r0 + r1) / 2, H / 2, Math.cos(a) * (r0 + r1) / 2, '#f4f1ea');
    // lean it in with the taper: a turn round the horizontal axis at right angles to its corner
    fin.rotateOnWorldAxis(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), -Math.atan2(r0 - r1, H));
  }
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(T.top * 0.7, T.top, T.lantern, 8), new THREE.MeshLambertMaterial({ color: '#dff0ff', emissive: '#3b6fa8', emissiveIntensity: 0.35 }));
  lantern.position.y = H + T.lantern / 2;
  g.add(lantern);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(T.top * 0.55, T.spire, 8), mat('#e8edf2'));
  spire.position.y = H + T.lantern + T.spire / 2;
  g.add(spire);
  const light = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff4a4a' }));
  light.position.y = H + T.lantern + T.spire + 0.6;
  g.add(light);
}
