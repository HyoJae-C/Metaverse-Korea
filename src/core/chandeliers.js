// Chandeliers (Yozi 2026-11-28): lamps that hang from the ceiling, sold at
// 샹들리에 하우스 on the Euljiro lighting street. Same format as the lamps in
// core/furniture.js: [id, emoji, footprint [w, d], name, build(g, part, glow)].
// Each is built standing on y = 0 with its ceiling plate at HANG[id]; a room
// lifts it so the plate meets its ceiling (hangY). Light for phones: the
// many small parts of each (crystals, arms, candles) are merged, so a
// chandelier is a handful of meshes. They glow like the other lamps (unlit
// material, switched off they dim) rather than casting real light.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Height from the bottom to the ceiling plate, in metres.
export const HANG = { 'lamp-chandelier': 1.1, 'lamp-iron-chandelier': 1.2, 'lamp-ring-chandelier': 1.2, 'lamp-disco-ball': 1.1 };
// The mirror ball chandelier (Yozi 2026-11-28) is the party light, switched by the switch by
// the door (game/home-lights.js), not by walking up to it like a lamp.
export const isPartyLight = (id) => id === 'lamp-disco-ball';
export const hangs = (id) => id in HANG;
// Where a hanging piece's bottom goes in a room h metres high (0 for the rest).
export const hangY = (id, h) => (hangs(id) ? Math.max(0, h - HANG[id]) : 0);

// Geometry placed (and turned) before merging.
const at = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => {
  if (rx || ry || rz) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)));
  return geo.translate(x, y, z);
};
const merged = (list) => mergeGeometries(list.map((g) => g.index ? g.toNonIndexed() : g));
// A chain of n oval links from (0, y0) up to (0, y1).
const chain = (y0, y1, x = 0, z = 0) => {
  const n = Math.max(2, Math.round((y1 - y0) / 0.05)), step = (y1 - y0) / n, out = [];
  for (let i = 0; i < n; i++) out.push(at(new THREE.TorusGeometry(0.018, 0.005, 4, 8).scale(1, 1.5, 1), x, y0 + step * (i + 0.5), z, 0, i % 2 ? Math.PI / 2 : 0, 0));
  return out;
};

// Little square mirrors, drawn once: grey and white tiles with dark gaps.
let tiles = null;
function mirrorTiles() {
  if (tiles || typeof document === 'undefined') return tiles;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#2a2a30'; x.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 32; i++) for (let j = 0; j < 16; j++) { const v = 150 + ((i * 7 + j * 13) % 5) * 25; x.fillStyle = `rgb(${v},${v},${v + 10})`; x.fillRect(i * 4 + 0.5, j * 4 + 0.5, 3, 3); }
  tiles = new THREE.CanvasTexture(c);
  tiles.colorSpace = THREE.SRGBColorSpace;
  return tiles;
}

export const CHANDELIERS = [
  // Crystal: gold arms curling out to six candle bulbs, strings of crystal
  // drops below and a big drop at the bottom. Gold and crystal.
  ['lamp-chandelier', '💎', [0.9, 0.9], { en: 'Crystal chandelier', ko: '크리스탈 샹들리에', ja: 'クリスタルのシャンデリア', zh: '水晶吊灯' }, (g, part, glow) => {
    const H = HANG['lamp-chandelier'], gold = [], candles = [], flames = [], crystals = [];
    gold.push(at(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16), 0, H - 0.02, 0)); // the ceiling plate
    gold.push(...chain(0.78, H - 0.04));
    gold.push(at(new THREE.CylinderGeometry(0.03, 0.05, 0.36, 10), 0, 0.58, 0)); // the stem
    gold.push(at(new THREE.SphereGeometry(0.075, 12, 8), 0, 0.46, 0));
    gold.push(at(new THREE.CylinderGeometry(0.2, 0.06, 0.06, 16), 0, 0.37, 0)); // the bowl the arms grow from
    gold.push(at(new THREE.TorusGeometry(0.2, 0.012, 4, 24), 0, 0.71, 0, Math.PI / 2)); // a little crown ring up top
    const N = 6, R = 0.4;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      // An S-curved arm: out from the bowl, dipping, then up to its cup.
      const arm = new THREE.CatmullRomCurve3([[0.08, 0.36], [0.22, 0.28], [0.34, 0.33], [R, 0.44]].map(([r, y]) => new THREE.Vector3(c * r, y, s * r)));
      gold.push(new THREE.TubeGeometry(arm, 10, 0.014, 5));
      gold.push(at(new THREE.CylinderGeometry(0.045, 0.025, 0.04, 10), c * R, 0.46, s * R)); // the cup
      candles.push(at(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 8), c * R, 0.53, s * R));
      flames.push(at(new THREE.SphereGeometry(0.03, 8, 6).scale(1, 1.6, 1), c * R, 0.61, s * R));
      // A swag of crystals from the crown ring down to each cup.
      for (let k = 1; k < 5; k++) {
        const t = k / 5, r = 0.2 + (R - 0.2) * t, y = 0.7 - 0.24 * t + 0.1 * (2 * t - 1) ** 2 - 0.1;
        crystals.push(at(new THREE.OctahedronGeometry(0.016), c * r, y, s * r));
      }
      // Drops hanging under the cup and between the arms.
      crystals.push(at(new THREE.OctahedronGeometry(0.03).scale(1, 1.8, 1), c * R, 0.38, s * R));
      const b = a + Math.PI / N;
      crystals.push(at(new THREE.OctahedronGeometry(0.028).scale(1, 1.8, 1), Math.cos(b) * 0.3, 0.27, Math.sin(b) * 0.3));
    }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; crystals.push(at(new THREE.OctahedronGeometry(0.022).scale(1, 1.8, 1), Math.cos(a) * 0.16, 0.24, Math.sin(a) * 0.16)); }
    crystals.push(at(new THREE.OctahedronGeometry(0.06).scale(1, 1.9, 1), 0, 0.16, 0)); // the big drop
    crystals.push(at(new THREE.OctahedronGeometry(0.035).scale(1, 1.8, 1), 0, 0.05, 0));
    part(merged(gold), '#b8933a');
    part(merged(candles), '#fbf7ee');
    part(merged(flames), glow('#ffe9a8'));
    part(merged(crystals), glow('#e6f1ff'));
  }],
  // Black iron: a wheel of eight candles hung on three chains, like an old
  // hall's. Black iron and cream candles.
  ['lamp-iron-chandelier', '🕯️', [1.0, 1.0], { en: 'Iron candle chandelier', ko: '철제 캔들 샹들리에', ja: 'アイアンのキャンドルシャンデリア', zh: '铁艺蜡烛吊灯' }, (g, part, glow) => {
    const H = HANG['lamp-iron-chandelier'], iron = [], candles = [], flames = [];
    const R = 0.45, Y = 0.18;
    iron.push(at(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 12), 0, H - 0.02, 0)); // the ceiling plate
    iron.push(...chain(0.72, H - 0.04));
    iron.push(at(new THREE.TorusGeometry(0.05, 0.012, 4, 10), 0, 0.7, 0, Math.PI / 2)); // the ring the chains meet at
    iron.push(at(new THREE.TorusGeometry(R, 0.022, 6, 36), 0, Y, 0, Math.PI / 2)); // the wheel
    iron.push(at(new THREE.TorusGeometry(R * 0.55, 0.014, 4, 28), 0, Y, 0, Math.PI / 2));
    for (let i = 0; i < 3; i++) { // three chains from the wheel up to the ring
      const a = (i / 3) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      const len = Math.hypot(R - 0.05, 0.7 - Y), rod = new THREE.CylinderGeometry(0.006, 0.006, len, 4);
      rod.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-x * (R - 0.05) / R, 0.7 - Y, -z * (R - 0.05) / R).normalize())));
      iron.push(rod.translate(x * (R + 0.05) / (2 * R), (0.7 + Y) / 2, z * (R + 0.05) / (2 * R)));
    }
    for (let i = 0; i < 8; i++) { // spokes and candles
      const a = (i / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      iron.push(at(new THREE.BoxGeometry(R, 0.012, 0.012), c * R / 2, Y, s * R / 2, 0, -a, 0));
      iron.push(at(new THREE.CylinderGeometry(0.04, 0.03, 0.025, 8), c * R, Y + 0.025, s * R)); // a drip pan
      const h = 0.1 + (i % 3) * 0.025; // burnt down a little differently
      candles.push(at(new THREE.CylinderGeometry(0.022, 0.024, h, 8), c * R, Y + 0.04 + h / 2, s * R));
      flames.push(at(new THREE.SphereGeometry(0.026, 8, 6).scale(1, 1.7, 1), c * R, Y + 0.07 + h, s * R));
    }
    iron.push(at(new THREE.SphereGeometry(0.035, 8, 6), 0, Y - 0.03, 0)); // the finial under the middle
    iron.push(at(new THREE.ConeGeometry(0.03, 0.08, 8), 0, Y - 0.08, 0, Math.PI));
    part(merged(iron), '#24221f');
    part(merged(candles), '#f3e6c8');
    part(merged(flames), glow('#ffcf7a'));
  }],
  // Modern: three brass rings of light, one under the other, held on short
  // spokes round a brass rod. Brass and white light.
  ['lamp-ring-chandelier', '⭕', [0.9, 0.9], { en: 'Ring light chandelier', ko: '링 조명 샹들리에', ja: 'リングライトのシャンデリア', zh: '环形吊灯' }, (g, part, glow) => {
    const H = HANG['lamp-ring-chandelier'], brass = [], light = [];
    brass.push(at(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 20), 0, H - 0.015, 0)); // the ceiling plate
    brass.push(at(new THREE.CylinderGeometry(0.012, 0.012, H - 0.15, 6), 0, (H + 0.15) / 2, 0)); // the rod
    brass.push(at(new THREE.SphereGeometry(0.03, 8, 6), 0, 0.14, 0));
    [[0.42, 0.16], [0.3, 0.4], [0.18, 0.64]].forEach(([r, y], k) => {
      brass.push(at(new THREE.TorusGeometry(r, 0.024, 6, 40), 0, y, 0, Math.PI / 2)); // the brass band
      light.push(at(new THREE.TorusGeometry(r, 0.014, 4, 40), 0, y - 0.022, 0, Math.PI / 2)); // the light along its underside
      for (let i = 0; i < 3; i++) { // three spokes from the rod (each ring's turned a little)
        const a = (i / 3) * Math.PI * 2 + k * 0.6;
        brass.push(at(new THREE.BoxGeometry(r, 0.01, 0.01), Math.cos(a) * r / 2, y, Math.sin(a) * r / 2, 0, -a, 0));
      }
    });
    part(merged(brass), '#c9a24a');
    part(merged(light), glow('#fff6e0'));
  }],
  // The mirror ball chandelier (Yozi 2026-11-28: a chandelier made for the
  // mirror ball, and one that turns): on a chain, a brass crown with four
  // arms of coloured bulbs, the ball hung under it. While the party lights
  // are on the whole crown, bulbs and ball turn and the ball throws spots of
  // colour round the room (game/home-lights.js). Brass and silver.
  ['lamp-disco-ball', '🪩', [0.8, 0.8], { en: 'Turning mirror ball chandelier', ko: '회전 미러볼 샹들리에', ja: '回転ミラーボールのシャンデリア', zh: '旋转镜面球吊灯' }, (g, part, glow) => {
    const H = HANG['lamp-disco-ball'], rotorBrass = [];
    part(merged([at(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 14), 0, H - 0.02, 0), ...chain(0.76, H - 0.04)]), '#b8933a'); // the plate and chain stay still
    rotorBrass.push(at(new THREE.SphereGeometry(0.035, 8, 6), 0, 0.74, 0)); // the swivel
    rotorBrass.push(at(new THREE.TorusGeometry(0.2, 0.014, 5, 28), 0, 0.68, 0, Math.PI / 2)); // the crown ring
    rotorBrass.push(at(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), 0, 0.64, 0)); // the stem down to the ball
    rotorBrass.push(at(new THREE.CylinderGeometry(0.05, 0.03, 0.05, 10), 0, 0.535, 0)); // the collar the ball hangs from
    const rotor = new THREE.Group();
    rotor.name = 'mirror-ball'; // (turned by game/home-lights.js)
    g.add(rotor);
    const add = (geo, m) => { const o = new THREE.Mesh(geo, typeof m === 'string' ? new THREE.MeshLambertMaterial({ color: m }) : m); rotor.add(o); return o; };
    const colours = ['#ff5fb4', '#4ad8ff', '#b47bff', '#ffd34a'], bulbs = colours.map(() => []);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a);
      const arm = new THREE.CatmullRomCurve3([[0, 0.66], [0.2, 0.68], [0.32, 0.64], [0.38, 0.7]].map(([r, y]) => new THREE.Vector3(c * r, y, s2 * r)));
      rotorBrass.push(new THREE.TubeGeometry(arm, 8, 0.012, 5)); // an arm curling out past the ring
      rotorBrass.push(at(new THREE.CylinderGeometry(0.03, 0.02, 0.035, 8), c * 0.38, 0.72, s2 * 0.38)); // its cup
      bulbs[i].push(at(new THREE.SphereGeometry(0.035, 8, 6), c * 0.38, 0.765, s2 * 0.38));
    }
    add(merged(rotorBrass), '#b8933a');
    bulbs.forEach((b, i) => add(merged(b), glow(colours[i])));
    const ball = add(new THREE.SphereGeometry(0.25, 16, 12), new THREE.MeshLambertMaterial({ map: mirrorTiles(), emissive: '#b8b8cc', emissiveMap: mirrorTiles() }));
    ball.position.y = 0.27;
    ball.name = 'mirror-sphere';
  }],
];
