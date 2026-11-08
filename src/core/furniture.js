// Furniture for decorating your home: a small catalogue of low-poly pieces.
// Each piece has a footprint (w × d metres, before rotation) used for
// collision, and chairs and sofas have a seat you can sit on.
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';

const mat = matCache();

const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);

const glows = {};
const glow = (c) => (glows[c] ||= new THREE.MeshBasicMaterial({ color: c }));
function part(g, geo, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}
function neonText(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#1b1a24'; x.fillRect(0, 0, 256, 96);
  x.font = 'bold 56px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = color; x.shadowBlur = 18; x.fillStyle = '#ffffff';
  x.fillText(text, 128, 52); x.fillText(text, 128, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t });
}
// [id, emoji, footprint [w, d], name, build]
const LAMPS = [
  ['lamp-hanji', '🏮', [0.6, 0.6], { en: 'Round hanji lamp', ko: '둥근 한지 조명', ja: '丸い韓紙ランプ', zh: '圆形韩纸灯' }, (g) => {
    for (const a of [0, 2.1, 4.2]) part(g, new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5), '#8a5a3a', Math.cos(a) * 0.16, 0.18, Math.sin(a) * 0.16).rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    part(g, new THREE.SphereGeometry(0.32, 16, 12), glow('#fff1cf'), 0, 0.68, 0);
    for (const y of [0.52, 0.68, 0.84]) part(g, new THREE.TorusGeometry(Math.sqrt(0.32 ** 2 - (y - 0.68) ** 2) + 0.005, 0.008, 4, 24).rotateX(Math.PI / 2), '#b58a5a', 0, y, 0);
  }],
  ['lamp-corong', '🏮', [0.5, 0.5], { en: 'Cheongsachorong lantern stand', ko: '청사초롱 스탠드', ja: '青紗提灯スタンド', zh: '青纱灯笼立灯' }, (g) => {
    part(g, new THREE.CylinderGeometry(0.18, 0.2, 0.05, 12), '#5a3a20', 0, 0.025, 0);
    part(g, new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6), '#5a3a20', 0, 0.8, 0);
    part(g, new THREE.BoxGeometry(0.4, 0.03, 0.03), '#5a3a20', 0.18, 1.58, 0);
    part(g, new THREE.CylinderGeometry(0.15, 0.15, 0.32, 12), glow('#ff5a4a'), 0.34, 1.2, 0);
    for (const y of [1.39, 1.01]) part(g, new THREE.CylinderGeometry(0.155, 0.155, 0.07, 12), glow('#4a7ad8'), 0.34, y, 0);
    part(g, new THREE.ConeGeometry(0.1, 0.1, 8), '#d9a93a', 0.34, 1.47, 0);
  }],
  ['lamp-lotus', '🪷', [0.5, 0.5], { en: 'Lotus lamp', ko: '연꽃 조명', ja: '蓮の花ランプ', zh: '莲花灯' }, (g) => {
    const petal = new THREE.SphereGeometry(0.12, 8, 6).scale(0.5, 1, 0.2).translate(0, 0.12, 0);
    for (const [k, r, tilt, c] of [[8, 0.12, 0.8, '#ff8fb8'], [6, 0.06, 0.35, '#ffc2d8']]) for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2, m = part(g, petal, glow(c), Math.cos(a) * r, 0.05, Math.sin(a) * r);
      m.rotation.set(0, -a + Math.PI / 2, 0); m.rotateX(tilt);
    }
    part(g, new THREE.CylinderGeometry(0.06, 0.05, 0.08, 10), glow('#ffd24a'), 0, 0.12, 0);
    part(g, new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), '#5fae5a', 0, 0.02, 0);
  }],
  ['lamp-moon', '🌕', [0.5, 0.5], { en: 'Moon lamp', ko: '달 조명', ja: '月のランプ', zh: '月亮灯' }, (g) => {
    part(g, new THREE.CylinderGeometry(0.16, 0.18, 0.08, 16), '#a0703a', 0, 0.04, 0);
    part(g, new THREE.SphereGeometry(0.26, 20, 14), glow('#fff3b8'), 0, 0.34, 0);
    for (const [x, y, z, r] of [[0.1, 0.42, 0.2, 0.05], [-0.12, 0.3, 0.2, 0.04], [0.02, 0.24, 0.24, 0.03]]) part(g, new THREE.SphereGeometry(r, 8, 6), glow('#efd98a'), x, y, z);
  }],
  ['lamp-mushroom', '🍄', [0.4, 0.4], { en: 'Mushroom table lamp', ko: '버섯 무드등', ja: 'きのこのテーブルランプ', zh: '蘑菇台灯' }, (g) => {
    part(g, new THREE.CylinderGeometry(0.06, 0.09, 0.3, 12), '#f4ead8', 0, 0.15, 0);
    part(g, new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glow('#ff7a6b'), 0, 0.28, 0);
    for (const [x, z] of [[0.08, 0.1], [-0.1, 0.04], [0.02, -0.12], [0.12, -0.04]]) part(g, new THREE.SphereGeometry(0.025, 6, 4), glow('#ffffff'), x, 0.28 + Math.sqrt(Math.max(0, 0.04 - x * x - z * z)), z);
  }],
  ['lamp-star', '⭐', [0.4, 0.4], { en: 'Star night light', ko: '별 수면등', ja: '星のナイトライト', zh: '星星小夜灯' }, (g) => {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.1 : 0.24; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    part(g, new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }), glow('#ffe066'), 0, 0.3, -0.04);
    part(g, new THREE.BoxGeometry(0.3, 0.06, 0.18), '#f4ead8', 0, 0.03, 0);
  }],
  ['lamp-neon-heart', '💗', [0.6, 0.3], { en: 'Neon heart sign', ko: '네온 하트 사인', ja: 'ネオンハートサイン', zh: '霓虹爱心灯牌' }, (g) => {
    part(g, new THREE.BoxGeometry(0.5, 0.04, 0.2), '#2b2b31', 0, 0.02, 0);
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.2); heart.bezierCurveTo(-0.32, 0.02, -0.18, 0.26, 0, 0.1); heart.bezierCurveTo(0.18, 0.26, 0.32, 0.02, 0, -0.2);
    const pts = heart.getPoints(40).map((p) => new THREE.Vector3(p.x, p.y, 0));
    part(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 60, 0.02, 6, true), glow('#ff4fa3'), 0, 0.36, 0);
    part(g, new THREE.BoxGeometry(0.6, 0.55, 0.02), new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.25 }), 0, 0.33, -0.03);
  }],
  ['lamp-neon-hi', '💬', [0.7, 0.25], { en: 'Neon “안녕” sign', ko: '네온 “안녕” 사인', ja: 'ネオン「アンニョン」サイン', zh: '霓虹“안녕”灯牌' }, (g) => {
    part(g, new THREE.BoxGeometry(0.7, 0.04, 0.2), '#2b2b31', 0, 0.02, 0);
    part(g, new THREE.BoxGeometry(0.68, 0.26, 0.03), neonText('안녕', '#4fe3ff'), 0, 0.2, 0);
  }],
  ['lamp-tube', '🌈', [0.35, 0.35], { en: 'Rainbow LED tube lamp', ko: '무지개 LED 튜브등', ja: '虹色LEDチューブライト', zh: '彩虹LED灯管' }, (g) => {
    part(g, new THREE.CylinderGeometry(0.12, 0.14, 0.05, 12), '#2b2b31', 0, 0.025, 0);
    const cols = ['#ff5a5f', '#ff9f40', '#ffd93d', '#6bcb77', '#4d96ff', '#b983ff'];
    cols.forEach((c, i) => part(g, new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), glow(c), 0, 0.16 + i * 0.22, 0));
  }],
  ['lamp-desk', '💡', [0.4, 0.4], { en: 'Retro desk lamp', ko: '레트로 책상 스탠드', ja: 'レトロなデスクランプ', zh: '复古台灯' }, (g) => {
    part(g, new THREE.CylinderGeometry(0.13, 0.15, 0.04, 14), '#2f6f6a', 0, 0.02, 0);
    part(g, new THREE.CylinderGeometry(0.015, 0.015, 0.36, 6), '#2f6f6a', 0.05, 0.2, 0).rotation.z = -0.3;
    part(g, new THREE.CylinderGeometry(0.015, 0.015, 0.32, 6), '#2f6f6a', 0.02, 0.48, 0).rotation.z = 0.6;
    const head = part(g, new THREE.ConeGeometry(0.1, 0.14, 14, 1, true), new THREE.MeshLambertMaterial({ color: '#2f6f6a', side: THREE.DoubleSide }), -0.12, 0.58, 0);
    head.rotation.z = 2.4;
    part(g, new THREE.SphereGeometry(0.045, 8, 6), glow('#fff2c4'), -0.15, 0.55, 0);
  }],
  ['lamp-arc', '🛋️', [0.6, 0.6], { en: 'Brass arc floor lamp', ko: '황동 아크 플로어 램프', ja: '真鍮のアーチ型フロアランプ', zh: '黄铜弧形落地灯' }, (g) => {
    part(g, new THREE.CylinderGeometry(0.18, 0.2, 0.06, 16), '#3a3a3a', 0, 0.03, 0);
    const arc = new THREE.CatmullRomCurve3([[0, 0.05], [0, 1.1], [0.12, 1.55], [0.45, 1.72], [0.72, 1.6]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
    part(g, new THREE.TubeGeometry(arc, 32, 0.018, 6), '#c9a227');
    part(g, new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#c9a227', side: THREE.DoubleSide }), 0.74, 1.45, 0);
    part(g, new THREE.SphereGeometry(0.07, 8, 6), glow('#fff2c4'), 0.74, 1.44, 0);
  }],
  ['lamp-lava', '🫧', [0.35, 0.35], { en: 'Lava lamp', ko: '라바 램프', ja: 'ラバランプ', zh: '熔岩灯' }, (g) => {
    part(g, new THREE.CylinderGeometry(0.06, 0.12, 0.16, 12), '#c0c4ca', 0, 0.08, 0);
    part(g, new THREE.CylinderGeometry(0.07, 0.1, 0.38, 14), new THREE.MeshBasicMaterial({ color: '#b983ff', transparent: true, opacity: 0.75 }), 0, 0.35, 0);
    for (const [y, r] of [[0.26, 0.05], [0.4, 0.035], [0.48, 0.03]]) part(g, new THREE.SphereGeometry(r, 8, 6), glow('#ff7a3d'), 0.01, y, 0);
    part(g, new THREE.CylinderGeometry(0.03, 0.06, 0.08, 12), '#c0c4ca', 0, 0.58, 0);
  }],
  ['lamp-string', '✨', [0.9, 0.3], { en: 'Fairy light arch', ko: '전구 줄조명 아치', ja: '電球ガーランドのアーチ', zh: '串灯拱门' }, (g) => {
    for (const x of [-0.42, 0.42]) part(g, new THREE.CylinderGeometry(0.015, 0.015, 1.1, 5), '#8a5a3a', x, 0.55, 0);
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI, x = -Math.cos(a) * 0.42, y = 1.1 + Math.sin(a) * 0.22;
      part(g, new THREE.SphereGeometry(0.03, 6, 4), glow(['#fff2c4', '#ffd2a8', '#fff9e0'][i % 3]), x, y, 0);
    }
    part(g, new THREE.BoxGeometry(0.9, 0.04, 0.2), '#8a5a3a', 0, 0.02, 0);
  }],
  ['lamp-bulb', '💡', [0.4, 0.4], { en: 'Big Edison bulb lamp', ko: '대형 에디슨 전구 램프', ja: '大きなエジソン電球ランプ', zh: '大号爱迪生灯泡灯' }, (g) => {
    part(g, new THREE.CylinderGeometry(0.1, 0.12, 0.08, 12), '#5a3a20', 0, 0.04, 0);
    part(g, new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12), '#c9a227', 0, 0.13, 0);
    part(g, new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0.6 }), 0, 0.34, 0);
    part(g, new THREE.TorusGeometry(0.05, 0.008, 4, 12), glow('#ff9a3d'), 0, 0.34, 0);
  }],
  ['lamp-candle', '🕯️', [0.35, 0.35], { en: 'Candle lantern', ko: '캔들 랜턴', ja: 'キャンドルランタン', zh: '烛台灯笼' }, (g) => {
    part(g, new THREE.BoxGeometry(0.26, 0.04, 0.26), '#2b2b31', 0, 0.02, 0);
    for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) part(g, new THREE.BoxGeometry(0.02, 0.34, 0.02), '#2b2b31', x, 0.21, z);
    part(g, new THREE.BoxGeometry(0.24, 0.32, 0.24), new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0.35 }), 0, 0.21, 0);
    part(g, new THREE.ConeGeometry(0.18, 0.1, 4).rotateY(Math.PI / 4), '#2b2b31', 0, 0.43, 0);
    part(g, new THREE.CylinderGeometry(0.04, 0.04, 0.1, 10), '#fff6e6', 0, 0.09, 0);
    part(g, new THREE.SphereGeometry(0.025, 6, 4).scale(1, 1.6, 1), glow('#ffb347'), 0, 0.17, 0);
  }],
];
export const LAMP_IDS = LAMPS.map((l) => [l[0], l[1], l[3]]);

export const FURNITURE = [
  { id: 'bed', emoji: '🛏️', size: [1.6, 2.1], name: { en: 'Bed', ko: '침대', ja: 'ベッド', zh: '床' },
    build(g) {
      box(g, 1.6, 0.35, 2.1, 0, 0.18, 0, '#c9a27a');
      box(g, 1.5, 0.15, 2.0, 0, 0.42, 0, '#ffffff');
      box(g, 1.5, 0.05, 1.3, 0, 0.5, 0.33, '#9cc8e8'); // blanket
      box(g, 0.6, 0.12, 0.35, -0.35, 0.56, -0.75, '#fff6e6');
      box(g, 0.6, 0.12, 0.35, 0.35, 0.56, -0.75, '#fff6e6');
      box(g, 1.6, 0.8, 0.1, 0, 0.4, -1.03, '#a07850'); // headboard
    } },
  { id: 'sofa', emoji: '🛋️', size: [1.8, 0.8], seat: true, name: { en: 'Sofa', ko: '소파', ja: 'ソファ', zh: '沙发' },
    build(g) {
      box(g, 1.8, 0.38, 0.8, 0, 0.19, 0, '#e58f7a');
      box(g, 1.8, 0.5, 0.2, 0, 0.55, -0.3, '#e58f7a');
      for (const s of [-1, 1]) box(g, 0.18, 0.5, 0.8, 0.81 * s, 0.33, 0, '#d97a65');
    } },
  { id: 'chair', emoji: '🪑', size: [0.5, 0.5], seat: true, name: { en: 'Chair', ko: '의자', ja: '椅子', zh: '椅子' },
    build(g) {
      box(g, 0.45, 0.06, 0.45, 0, 0.35, 0, '#e9b97a');
      box(g, 0.45, 0.5, 0.06, 0, 0.62, -0.2, '#e9b97a');
      for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) box(g, 0.05, 0.33, 0.05, x, 0.16, z, '#8a5a3a');
    } },
  { id: 'table', emoji: '🍽️', size: [1.2, 0.8], name: { en: 'Table', ko: '테이블', ja: 'テーブル', zh: '桌子' },
    build(g) {
      box(g, 1.2, 0.06, 0.8, 0, 0.62, 0, '#c98b4f');
      for (const x of [-0.52, 0.52]) for (const z of [-0.32, 0.32]) box(g, 0.07, 0.6, 0.07, x, 0.3, z, '#8a5a3a');
    } },
  { id: 'desk', emoji: '💻', size: [1.2, 0.6], name: { en: 'Desk', ko: '책상', ja: '机', zh: '书桌' },
    build(g) {
      box(g, 1.2, 0.06, 0.6, 0, 0.68, 0, '#f2efe8');
      for (const s of [-1, 1]) box(g, 0.06, 0.66, 0.58, 0.56 * s, 0.33, 0, '#d9d4c8');
      box(g, 0.45, 0.03, 0.3, 0, 0.72, 0.05, '#4a4f5a'); // laptop
      box(g, 0.45, 0.3, 0.02, 0, 0.87, -0.1, '#4a4f5a');
    } },
  { id: 'shelf', emoji: '📚', size: [1.0, 0.35], name: { en: 'Bookshelf', ko: '책장', ja: '本棚', zh: '书架' },
    build(g) {
      box(g, 1.0, 1.6, 0.35, 0, 0.8, 0, '#a07850');
      const colors = ['#e0604d', '#4f8fc0', '#f2c14e', '#6bb38a', '#9b7ad1'];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
        box(g, 0.1, 0.32, 0.25, -0.33 + i * 0.13, 0.3 + r * 0.5, 0.06, colors[(i + r) % colors.length]);
      }
    } },
  { id: 'tv', emoji: '📺', size: [1.2, 0.45], name: { en: 'TV stand', ko: 'TV', ja: 'テレビ', zh: '电视' },
    build(g) {
      box(g, 1.2, 0.45, 0.45, 0, 0.23, 0, '#f2efe8');
      box(g, 1.1, 0.62, 0.05, 0, 0.82, -0.05, '#22252b');
      box(g, 1.02, 0.54, 0.01, 0, 0.82, -0.02, '#3d5a80');
    } },
  { id: 'lamp', emoji: '💡', size: [0.4, 0.4], name: { en: 'Floor lamp', ko: '스탠드', ja: 'ランプ', zh: '落地灯' },
    build(g) {
      box(g, 0.35, 0.04, 0.35, 0, 0.02, 0, '#4a3f35');
      box(g, 0.04, 1.4, 0.04, 0, 0.72, 0, '#4a3f35');
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 14),
        new THREE.MeshBasicMaterial({ color: '#ffe9b8' }));
      shade.position.y = 1.5;
      g.add(shade);
    } },
  { id: 'plant', emoji: '🪴', size: [0.5, 0.5], name: { en: 'Plant', ko: '화분', ja: '観葉植物', zh: '盆栽' },
    build(g) {
      box(g, 0.4, 0.4, 0.4, 0, 0.2, 0, '#c98b4f');
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), mat('#8fcf7a'));
      leaf.position.y = 0.85;
      g.add(leaf);
    } },
  { id: 'rug', emoji: '🟫', size: [2.0, 1.4], walkable: true, name: { en: 'Rug', ko: '러그', ja: 'ラグ', zh: '地毯' },
    build(g) {
      box(g, 2.0, 0.02, 1.4, 0, 0.012, 0, '#e6c9a8');
      box(g, 1.7, 0.022, 1.1, 0, 0.014, 0, '#d9a066');
    } },
  // Lamps from the lighting shops on Cheonggyecheon-ro (stores.json
  // "furniture"): only once you've bought one. Shades glow (unlit material).
  ...LAMPS.map(([id, emoji, size, name, build]) => ({ id, emoji, item: id, size, name, build })),
  // Claw machine plushies (core/claw-game.js): only once you own the item.
  ...[
    ['plush-simurugi', '😑', '#fbf7f2', '#bfe6dc', { en: 'Simurugi plush', ko: '시무룩이 인형', ja: 'シムルギのぬいぐるみ', zh: '闷闷鬼玩偶' }],
    ['plush-mongle', '☁️', '#ffffff', '#9fd0f2', { en: 'Mongle plush', ko: '몽글이 인형', ja: 'モングルのぬいぐるみ', zh: '云朵羊玩偶' }],
    ['plush-bear', '🧸', '#c98b4f', '#f3d9b8', { en: 'Teddy bear', ko: '곰돌이 인형', ja: 'くまのぬいぐるみ', zh: '泰迪熊' }],
    ['plush-mandu', '🥟', '#fff6e6', '#e8cfa8', { en: 'Mandu plush', ko: '만두 인형', ja: 'マンドゥのぬいぐるみ', zh: '饺子玩偶' }],
  ].map(([id, emoji, body, accent, name]) => ({
    id, emoji, item: id, size: [0.5, 0.5], name,
    build(g) {
      const ball = (r, x, y, z, c) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(c));
        m.position.set(x, y, z);
        g.add(m);
        return m;
      };
      ball(0.22, 0, 0.22, 0, body).scale.set(1, 0.9, 0.9); // body
      ball(0.18, 0, 0.52, 0.02, body); // head
      for (const s of [-1, 1]) {
        ball(0.06, 0.13 * s, 0.68, 0, accent); // ears
        ball(0.07, 0.17 * s, 0.25, 0.12, body); // paws
        ball(0.025, 0.06 * s, 0.54, 0.17, '#2b2630'); // eyes
        ball(0.03, 0.1 * s, 0.49, 0.15, '#ffb0a8'); // cheeks
      }
    },
  })),
  // The balloon booth's gold medal prize: a little teddy bear with a red bow.
  { id: 'plush-bear-small', emoji: '🧸', item: 'plush-bear-small', size: [0.32, 0.32],
    name: { en: 'Small teddy bear', ko: '작은 곰인형', ja: '小さなくまのぬいぐるみ', zh: '小泰迪熊' },
    build(g) {
      const ball = (r, x, y, z, c) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(c));
        m.position.set(x, y, z);
        g.add(m);
        return m;
      };
      const body = '#c98b4f', accent = '#f3d9b8';
      ball(0.13, 0, 0.13, 0, body).scale.set(1, 0.9, 0.9); // body
      ball(0.11, 0, 0.31, 0.01, body); // head
      ball(0.045, 0, 0.29, 0.1, accent); // muzzle
      ball(0.03, 0, 0.21, 0.1, '#e2457a').scale.set(1.8, 0.8, 0.6); // bow
      for (const s of [-1, 1]) {
        ball(0.037, 0.08 * s, 0.41, 0, body); // ears
        ball(0.02, 0.08 * s, 0.41, 0.02, accent); // inner ears
        ball(0.042, 0.1 * s, 0.15, 0.07, body); // paws
        ball(0.016, 0.04 * s, 0.33, 0.1, '#2b2630'); // eyes
      }
    } },
];

export const furnitureById = (id) => FURNITURE.find((f) => f.id === id);

export function buildFurniture(id) {
  const def = furnitureById(id);
  const g = new THREE.Group();
  def?.build(g);
  return g;
}

// Collision polygon for a placed piece, or null for walkable ones (rugs).
export function furnitureCollider(item) {
  const def = furnitureById(item.id);
  if (!def || def.walkable) return null;
  const [w, d] = def.size;
  const c = Math.cos(item.ry), s = Math.sin(item.ry);
  const p = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
    .map(([x, z]) => [item.x + x * c + z * s, item.z - x * s + z * c]);
  return { p };
}
