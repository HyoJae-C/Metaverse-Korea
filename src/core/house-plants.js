// Pot plants for your home, from the greenhouse shop in Seoul Botanic Park
// (stores.json "seoul-botanic-greenhouse", game/botanic-near.js): only once
// you've bought one, then placed with Decorate. Five everyday ones sold by
// the greenhouse door and five rare ones sold deep inside, next to where
// the same plant grows (Yozi 2026-11-21: unusual or pretty plants to put at
// home; the rare ones in the greenhouse). One colour each (the item rule).
// [id, emoji, footprint [w, d], rare, name, build(g, part, box)]
import * as THREE from 'three';

const geos = {};
const G = (k, make) => (geos[k] ||= make());
const ball = (r = 1) => G('b' + r, () => new THREE.IcosahedronGeometry(r, 1));
const cyl = (a, b, h, n = 10) => G(`c${a},${b},${h},${n}`, () => new THREE.CylinderGeometry(a, b, h, n));
const cone = (r, h, n = 8) => G(`k${r},${h},${n}`, () => new THREE.ConeGeometry(r, h, n));
const POT = '#c97b52', SOIL = '#5a4334', WHITE = '#f1ece2', STEM = '#6f8a4a', BARK = '#8a6a4c';

// A round pot (r wide at the rim, h tall) with soil in it.
function pot(part, r, h, c = POT) {
  part(cyl(r, r * 0.72, h, 12), c, 0, h / 2, 0);
  part(cyl(r * 1.08, r * 1.08, h * 0.16, 12), c, 0, h * 0.94, 0);
  part(cyl(r * 0.9, r * 0.9, 0.02, 12), SOIL, 0, h + 0.005, 0);
}
// A leaf: a flattened ball at the end of a stalk leaning out by `lean`, turned `a` round the pot.
function leaf(part, c, a, lean, len, y0, w = 0.16, l = 0.24) {
  const x = Math.sin(a) * Math.sin(lean) * len, z = Math.cos(a) * Math.sin(lean) * len, y = y0 + Math.cos(lean) * len;
  const st = part(cyl(0.012, 0.016, len, 5), STEM, x / 2, y0 + (y - y0) / 2, z / 2);
  st.rotation.set(lean * Math.cos(a), 0, -lean * Math.sin(a));
  const m = part(ball(1), c, x, y, z);
  m.scale.set(w, 0.02, l);
  m.rotation.set(0.5, a, 0, 'YXZ');
  return m;
}

export const PLANTS = [
  // --- By the greenhouse door: everyday plants ---
  ['plant-monstera', '🪴', [0.7, 0.7], false, { en: 'Monstera', ko: '몬스테라', ja: 'モンステラ', zh: '龟背竹' }, (g, part) => {
    pot(part, 0.2, 0.3, WHITE);
    for (let i = 0; i < 7; i++) leaf(part, '#2f8a4f', i * 0.9, 0.35 + (i % 3) * 0.22, 0.42 + (i % 4) * 0.12, 0.3, 0.2, 0.26);
  }],
  ['plant-cactus', '🌵', [0.45, 0.45], false, { en: 'Column cactus', ko: '기둥선인장', ja: '柱サボテン', zh: '柱形仙人掌' }, (g, part) => {
    pot(part, 0.17, 0.22);
    const c = '#4f9a5c';
    part(cyl(0.085, 0.095, 0.8, 9), c, 0, 0.62, 0);
    part(ball(0.085), c, 0, 1.02, 0);
    for (const [s, y, h] of [[-1, 0.62, 0.3], [1, 0.78, 0.22]]) {
      part(cyl(0.05, 0.05, 0.15, 7), c, s * 0.13, y, 0).rotation.z = Math.PI / 2;
      part(cyl(0.05, 0.055, h, 7), c, s * 0.2, y + h / 2, 0);
      part(ball(0.05), c, s * 0.2, y + h, 0);
    }
    part(ball(0.035), '#f2c9d8', 0.02, 1.1, 0.03); // a flower on top
  }],
  ['plant-olive', '🫒', [0.7, 0.7], false, { en: 'Olive tree', ko: '올리브나무', ja: 'オリーブの木', zh: '橄榄树' }, (g, part) => {
    pot(part, 0.22, 0.32, '#b9b2a4');
    part(cyl(0.03, 0.045, 0.75, 6), BARK, 0, 0.7, 0).rotation.z = 0.06;
    for (const [x, y, z, r] of [[0, 1.32, 0, 0.3], [-0.2, 1.16, 0.08, 0.2], [0.2, 1.2, -0.06, 0.22], [0.04, 1.52, 0.1, 0.18]]) part(ball(1), '#8fa88a', x, y, z).scale.set(r, r * 0.8, r);
  }],
  ['plant-fern', '🌿', [0.65, 0.65], false, { en: 'Boston fern', ko: '보스턴 고사리', ja: 'ボストンファーン', zh: '波士顿蕨' }, (g, part) => {
    pot(part, 0.19, 0.42, '#6b5a4c');
    for (let i = 0; i < 12; i++) leaf(part, '#5fae4a', i * 0.54, 0.75 + (i % 3) * 0.28, 0.3 + (i % 2) * 0.1, 0.42, 0.06, 0.24);
  }],
  ['plant-paradise', '🌺', [0.7, 0.7], false, { en: 'Bird of paradise', ko: '극락조화', ja: '極楽鳥花', zh: '鹤望兰' }, (g, part) => {
    pot(part, 0.21, 0.3, '#3d4a5c');
    for (let i = 0; i < 6; i++) leaf(part, '#3f8f5a', i * 1.05, 0.16 + (i % 3) * 0.1, 0.8 + (i % 2) * 0.2, 0.3, 0.13, 0.32).rotation.x = 1.25;
    for (const [a, h] of [[0.6, 1.0], [3.4, 0.85]]) { // the orange flowers, like a crane's head
      const x = Math.sin(a) * 0.1, z = Math.cos(a) * 0.1;
      part(cyl(0.012, 0.014, h, 5), STEM, x, 0.3 + h / 2, z);
      const f = part(cone(0.05, 0.26, 5), '#f08a2a', x + Math.sin(a) * 0.08, 0.34 + h, z + Math.cos(a) * 0.08);
      f.rotation.set(1.2, a, 0, 'YXZ');
    }
  }],
  // --- Deep in the greenhouse: rare plants ---
  ['plant-orchid', '🌸', [0.4, 0.4], true, { en: 'Moth orchid', ko: '호접란', ja: '胡蝶蘭', zh: '蝴蝶兰' }, (g, part) => {
    pot(part, 0.13, 0.2, WHITE);
    for (let i = 0; i < 4; i++) leaf(part, '#3f8a52', i * 1.6, 1.2, 0.16, 0.2, 0.08, 0.17);
    for (let i = 0; i <= 18; i++) { // an arching stem of flowers
      const t = i / 18, x = 0.26 * t * t, y = 0.22 + 0.62 * Math.sin(t * 1.9);
      part(ball(0.013), STEM, x, y, 0);
      if (i > 5 && i % 2 === 0) { const sd = i % 4 ? 0.05 : -0.05; const f = part(ball(1), '#f6f1f6', x + 0.02, y - 0.03, sd); f.scale.set(0.065, 0.065, 0.02); part(ball(0.016), '#d94f9a', x + 0.02, y - 0.03, sd * 1.36); }
    }
  }],
  ['plant-flytrap', '🪤', [0.4, 0.4], true, { en: 'Venus flytrap', ko: '파리지옥', ja: 'ハエトリグサ', zh: '捕蝇草' }, (g, part) => {
    pot(part, 0.15, 0.16, '#4a4a52');
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, lean = 0.5 + (i % 2) * 0.3, len = 0.2 + (i % 3) * 0.06;
      const x = Math.sin(a) * Math.sin(lean) * len, z = Math.cos(a) * Math.sin(lean) * len, y = 0.16 + Math.cos(lean) * len;
      part(cyl(0.012, 0.02, len, 5), '#7fb24a', x / 2, 0.16 + (y - 0.16) / 2, z / 2).rotation.set(lean * Math.cos(a), 0, -lean * Math.sin(a));
      for (const s of [-1, 1]) { // two jaws, a little open, red inside
        const j = part(ball(1), s > 0 ? '#8fc25a' : '#c8504a', x, y + 0.03, z);
        j.scale.set(0.07, 0.016, 0.05);
        j.rotation.set(0, a, s * 0.55, 'YXZ');
      }
    }
  }],
  ['plant-bottle', '🍶', [0.6, 0.6], true, { en: 'Bottle tree', ko: '물병나무', ja: 'ボトルツリー', zh: '瓶子树' }, (g, part) => {
    pot(part, 0.24, 0.24, '#b9b2a4');
    part(cyl(0.07, 0.19, 0.5, 10), '#9a8a70', 0, 0.49, 0); // the swollen trunk
    part(ball(1), '#9a8a70', 0, 0.36, 0).scale.set(0.2, 0.16, 0.2);
    part(cyl(0.045, 0.07, 0.3, 8), '#9a8a70', 0, 0.88, 0);
    for (let i = 0; i < 9; i++) leaf(part, '#6fa85a', i * 0.72, 0.5 + (i % 3) * 0.3, 0.3, 1.0, 0.035, 0.22);
  }],
  ['plant-dragon', '🐉', [0.75, 0.75], true, { en: 'Dragon tree', ko: '용혈수', ja: 'リュウケツジュ', zh: '龙血树' }, (g, part) => {
    pot(part, 0.24, 0.3, '#7a3f32');
    part(cyl(0.05, 0.07, 0.7, 7), BARK, 0, 0.65, 0);
    for (let i = 0; i < 4; i++) { // the trunk forks into an umbrella of spiky heads
      const a = i * 1.57 + 0.4, x = Math.sin(a) * 0.2, z = Math.cos(a) * 0.2;
      part(cyl(0.03, 0.04, 0.42, 6), BARK, x / 2, 1.14, z / 2).rotation.set(0.5 * Math.cos(a), 0, -0.5 * Math.sin(a));
      for (let k = 0; k < 8; k++) { const s = part(cone(0.022, 0.3, 4), '#4f8f6a', x, 1.42, z); s.rotation.set(0.9, k * 0.785, 0, 'YXZ'); s.translateY(0.13); }
    }
  }],
  ['plant-baobab', '🌳', [0.8, 0.8], true, { en: 'Baobab tree', ko: '바오밥나무', ja: 'バオバブの木', zh: '猴面包树' }, (g, part) => {
    pot(part, 0.3, 0.26, '#c9a56a');
    part(cyl(0.13, 0.2, 0.85, 10), '#a08a78', 0, 0.68, 0); // a fat trunk
    part(ball(1), '#a08a78', 0, 1.1, 0).scale.set(0.15, 0.1, 0.15);
    for (let i = 0; i < 6; i++) { // short bare branches, like roots in the sky, with a tuft each
      const a = i * 1.05, x = Math.sin(a) * 0.24, z = Math.cos(a) * 0.24;
      part(cyl(0.02, 0.035, 0.36, 5), '#a08a78', x / 2, 1.24, z / 2).rotation.set(0.75 * Math.cos(a), 0, -0.75 * Math.sin(a));
      part(ball(1), '#6f9a4a', x, 1.4, z).scale.set(0.12, 0.07, 0.12);
    }
  }],
];
// Theme plants: sold only in the Cactus & Succulent House in the park's forest
// school (stores.json "botanic-cactus-house"; Yozi 2026-11-21: themed plants in
// one of the park's empty buildings). Same shape as PLANTS; none of them rare.
export const THEME_PLANTS = [
  ['plant-succulents', '🌱', [0.45, 0.45], false, { en: 'Succulent bowl', ko: '다육이 모둠', ja: '多肉の寄せ植え', zh: '多肉拼盘' }, (g, part) => {
    part(cyl(0.2, 0.14, 0.12, 12), WHITE, 0, 0.06, 0); // a wide shallow bowl
    part(cyl(0.185, 0.185, 0.02, 12), '#d9c7a0', 0, 0.125, 0); // sand
    const c = '#7fb89a';
    for (const [x, z, r] of [[0, 0, 0.075], [0.1, 0.04, 0.05], [-0.09, 0.06, 0.055], [-0.03, -0.1, 0.05], [0.08, -0.08, 0.04]]) { // rosettes: rings of fat leaves
      for (let i = 0; i < 7; i++) { const a = i * 0.9, m = part(ball(1), c, x + Math.sin(a) * r * 0.6, 0.15, z + Math.cos(a) * r * 0.6); m.scale.set(r * 0.5, r * 0.28, r * 0.8); m.rotation.set(-0.5, a, 0, 'YXZ'); }
      part(ball(1), c, x, 0.165, z).scale.set(r * 0.4, r * 0.4, r * 0.4);
    }
  }],
  ['plant-aloe', '🎋', [0.5, 0.5], false, { en: 'Aloe', ko: '알로에', ja: 'アロエ', zh: '芦荟' }, (g, part) => {
    pot(part, 0.17, 0.2, '#d9c7a0');
    for (let i = 0; i < 11; i++) { // thick pointed leaves, the outer ones leaning out
      const a = i * 2.4, lean = 0.2 + (i / 11) * 0.75, len = 0.5 - (i / 11) * 0.14;
      const m = part(cone(0.045, len, 5), '#5fa57a', Math.sin(a) * Math.sin(lean) * len / 2, 0.2 + Math.cos(lean) * len / 2, Math.cos(a) * Math.sin(lean) * len / 2);
      m.rotation.set(lean, a, 0, 'YXZ');
      m.scale.set(1.5, 1, 0.6);
    }
  }],
  ['plant-barrel', '🏵️', [0.45, 0.45], false, { en: 'Golden barrel cactus', ko: '금호 선인장', ja: '金鯱サボテン', zh: '金琥仙人球' }, (g, part) => {
    pot(part, 0.2, 0.16);
    const c = '#6f9a4a';
    part(ball(1), c, 0, 0.36, 0).scale.set(0.2, 0.2, 0.2);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, m = part(ball(1), c, Math.sin(a) * 0.17, 0.36, Math.cos(a) * 0.17); m.scale.set(0.035, 0.19, 0.05); m.rotation.y = a; } // the ribs
    part(ball(1), '#f0d060', 0, 0.56, 0).scale.set(0.08, 0.025, 0.08); // the golden crown
  }],
  ['plant-prickly', '🍐', [0.6, 0.6], false, { en: 'Prickly pear', ko: '부채선인장', ja: 'ウチワサボテン', zh: '团扇仙人掌' }, (g, part) => {
    pot(part, 0.2, 0.22, '#b9b2a4');
    const c = '#5f9a62';
    const pad = (x, y, z, r, tilt, turn) => { const m = part(ball(1), c, x, y, z); m.scale.set(r, r * 1.25, r * 0.28); m.rotation.set(0, turn, tilt, 'YXZ'); return m; };
    pad(0, 0.44, 0, 0.17, 0.05, 0.3);
    pad(-0.14, 0.72, 0.02, 0.13, 0.5, 0.5);
    pad(0.13, 0.76, -0.02, 0.14, -0.4, 0.1);
    pad(0.22, 1.02, -0.03, 0.1, -0.6, 0.3);
    pad(-0.2, 0.96, 0.04, 0.09, 0.3, 0.7);
    for (const [x, y] of [[0.3, 1.14], [-0.26, 1.08], [0.02, 0.95]]) part(ball(0.035), '#e85a8a', x, y, 0); // the fruit
  }],
];
export const PLANT_IDS = [...PLANTS, ...THEME_PLANTS].map((p) => [p[0], p[1], p[4]]);
export const isRarePlant = (id) => !!PLANTS.find((p) => p[0] === id)?.[3];
