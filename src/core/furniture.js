// Furniture for decorating your home: a small catalogue of low-poly pieces.
// Each piece has a footprint (w × d metres, before rotation) used for
// collision, and chairs and sofas have a seat you can sit on.
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';
import { SHOP_FURNITURE } from './furniture-shop.js';

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
// The shop pieces' seat field (furniture-shop.js) as FURNITURE fields.
const SEAT_KIND = { true: { seat: true }, 2: { seat: 2 }, floor: { seat: 2, floor: true }, bed: { lie: 2 } };
export const SHOP_FURNITURE_IDS = SHOP_FURNITURE.map((f) => [f[0], f[1], f[4]]);

export const FURNITURE = [
  // The free basics every home starts with are worn hand-me-downs: faded,
  // stained, patched and a little crooked, so the furniture shops on
  // Euljiro have something to replace (Yozi 2026-11-16). Ids stay the same,
  // so rooms already decorated keep their pieces.
  { id: 'bed', emoji: '🛏️', size: [1.6, 2.1], lie: 2, name: { en: 'Old bed', ko: '낡은 침대', ja: '古いベッド', zh: '旧床' },
    build(g) {
      box(g, 1.6, 0.35, 2.1, 0, 0.18, 0, '#a99278');
      box(g, 1.5, 0.15, 2.0, 0, 0.42, 0, '#e8e2d4'); // yellowed mattress
      box(g, 1.5, 0.05, 1.3, 0, 0.5, 0.33, '#9fb0b8'); // faded blanket
      box(g, 0.32, 0.055, 0.3, 0.42, 0.5, 0.55, '#c9a46a'); // a patch sewn on
      box(g, 0.6, 0.1, 0.35, -0.3, 0.55, -0.75, '#e6dcc6'); // flat pillow
      box(g, 1.6, 0.8, 0.1, 0, 0.4, -1.03, '#8a6e52'); // headboard
      box(g, 0.5, 0.04, 0.11, 0.5, 0.62, -1.03, '#6e5640').rotation.z = 0.2; // a cracked board
    } },
  { id: 'sofa', emoji: '🛋️', size: [1.8, 0.8], seat: 2, name: { en: 'Old sofa', ko: '낡은 소파', ja: '古いソファ', zh: '旧沙发' },
    build(g) {
      box(g, 1.8, 0.36, 0.8, 0, 0.18, 0, '#b3877a');
      box(g, 1.8, 0.5, 0.2, 0, 0.55, -0.3, '#b3877a');
      for (const s of [-1, 1]) box(g, 0.18, 0.5, 0.8, 0.81 * s, 0.33, 0, '#9e766a');
      box(g, 0.5, 0.03, 0.45, -0.4, 0.37, 0.05, '#8c9c7a'); // a mismatched patch
      box(g, 0.08, 0.06, 0.08, 0.5, 0.39, 0.1, '#e8dcc0'); // stuffing poking out
      box(g, 0.3, 0.012, 0.22, 0.35, 0.367, -0.05, '#8f6a5e'); // a stain
    } },
  { id: 'chair', emoji: '🪑', size: [0.5, 0.5], seat: true, name: { en: 'Creaky chair', ko: '삐걱이는 의자', ja: 'きしむ椅子', zh: '吱呀作响的椅子' },
    build(g) {
      box(g, 0.45, 0.06, 0.45, 0, 0.35, 0, '#c4a37e');
      box(g, 0.45, 0.5, 0.06, 0, 0.62, -0.2, '#c4a37e').rotation.z = 0.05; // leans a little
      for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) box(g, 0.05, 0.33, 0.05, x, 0.16, z, '#7a5a40');
      box(g, 0.07, 0.08, 0.07, 0.18, 0.12, 0.18, '#d8c8a0'); // taped-up leg
    } },
  { id: 'table', emoji: '🍽️', size: [1.2, 0.8], name: { en: 'Wobbly table', ko: '흔들리는 테이블', ja: 'ぐらつくテーブル', zh: '摇晃的桌子' },
    build(g) {
      box(g, 1.2, 0.06, 0.8, 0, 0.62, 0, '#a8866a');
      for (const x of [-0.52, 0.52]) for (const z of [-0.32, 0.32]) box(g, 0.07, 0.6, 0.07, x, 0.3, z, '#7a5a40');
      box(g, 0.12, 0.04, 0.1, 0.52, 0.02, 0.32, '#e8e0cc'); // folded paper under one leg
      for (const [x, z] of [[-0.3, 0.1], [0.2, -0.15]]) box(g, 0.16, 0.004, 0.16, x, 0.652, z, '#8f6f55'); // cup rings
    } },
  { id: 'desk', emoji: '💻', size: [1.2, 0.6], name: { en: 'Old desk', ko: '낡은 책상', ja: '古い机', zh: '旧书桌' },
    build(g) {
      box(g, 1.2, 0.06, 0.6, 0, 0.68, 0, '#ddd6c6');
      for (const s of [-1, 1]) box(g, 0.06, 0.66, 0.58, 0.56 * s, 0.33, 0, '#c4bcaa');
      box(g, 0.45, 0.03, 0.3, 0, 0.72, 0.05, '#4a4f5a'); // an old laptop
      box(g, 0.45, 0.3, 0.02, 0, 0.87, -0.1, '#4a4f5a');
      box(g, 0.22, 0.004, 0.1, -0.38, 0.712, 0.12, '#7aa0c8'); // stickers
      box(g, 0.12, 0.004, 0.12, -0.42, 0.712, -0.08, '#e8a0a0');
    } },
  { id: 'shelf', emoji: '📚', size: [1.0, 0.35], name: { en: 'Old bookshelf', ko: '낡은 책장', ja: '古い本棚', zh: '旧书架' },
    build(g) {
      box(g, 1.0, 1.6, 0.35, 0, 0.8, 0, '#8a6e52');
      const colors = ['#b87a6e', '#7d93a8', '#c9b07a', '#8aa08e', '#998aa8'];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
        if ((i + r * 2) % 5 === 4) continue; // a few gaps
        const b = box(g, 0.1, 0.32, 0.25, -0.33 + i * 0.13, 0.3 + r * 0.5, 0.06, colors[(i + r) % colors.length]);
        if ((i + r) % 4 === 3) b.rotation.z = 0.25; // a book leaning over
      }
    } },
  { id: 'tv', emoji: '📺', size: [1.2, 0.45], name: { en: 'Old TV', ko: '낡은 TV', ja: '古いテレビ', zh: '旧电视' },
    build(g) {
      box(g, 1.2, 0.45, 0.45, 0, 0.23, 0, '#ddd6c6');
      box(g, 1.1, 0.62, 0.05, 0, 0.82, -0.05, '#2b2c30');
      box(g, 1.02, 0.54, 0.01, 0, 0.82, -0.02, '#56606e'); // a dim screen
      box(g, 0.5, 0.012, 0.004, 0.18, 0.95, -0.013, '#8a929e').rotation.z = -0.5; // a crack
    } },
  { id: 'lamp', emoji: '💡', size: [0.4, 0.4], name: { en: 'Old floor lamp', ko: '낡은 스탠드', ja: '古いフロアランプ', zh: '旧落地灯' },
    build(g) {
      box(g, 0.35, 0.04, 0.35, 0, 0.02, 0, '#4a3f35');
      box(g, 0.04, 1.4, 0.04, 0, 0.72, 0, '#4a3f35');
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 14),
        new THREE.MeshBasicMaterial({ color: '#e8d6a8' })); // a yellowed shade
      shade.position.set(0.03, 1.5, 0);
      shade.rotation.z = -0.18; // sits crooked
      g.add(shade);
    } },
  { id: 'plant', emoji: '🪴', size: [0.5, 0.5], name: { en: 'Droopy plant', ko: '시든 화분', ja: 'しおれた鉢植え', zh: '蔫了的盆栽' },
    build(g) {
      box(g, 0.4, 0.4, 0.4, 0, 0.2, 0, '#a8866a');
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), mat('#a8b86a'));
      leaf.position.set(0.06, 0.74, 0);
      leaf.scale.set(1, 0.75, 1); // drooping
      g.add(leaf);
      box(g, 0.08, 0.02, 0.06, 0.24, 0.41, 0.12, '#b89a5a'); // a fallen leaf
    } },
  { id: 'rug', emoji: '🟫', size: [2.0, 1.4], walkable: true, name: { en: 'Worn rug', ko: '닳은 러그', ja: 'すり切れたラグ', zh: '磨旧的地毯' },
    build(g) {
      box(g, 2.0, 0.02, 1.4, 0, 0.012, 0, '#cdb89e');
      box(g, 1.7, 0.022, 1.1, 0, 0.014, 0, '#b89a78');
      box(g, 0.5, 0.024, 0.35, 0.35, 0.015, 0.1, '#c8b49a'); // a bare patch
    } },
  // Lamps from the lighting shops on Cheonggyecheon-ro (stores.json
  // "furniture"): only once you've bought one. Shades glow (unlit material).
  ...LAMPS.map(([id, emoji, size, name, build]) => ({ id, emoji, item: id, size, name, build })),
  // The Euljiro furniture shops (core/furniture-shop.js): only once bought.
  ...SHOP_FURNITURE.map(([id, emoji, size, seat, name, make]) => ({ id, emoji, item: id, size, ...SEAT_KIND[seat], name,
    build(g) { make(g, (geo, m, x, y, z) => part(g, geo, m, x, y, z), (...a) => box(g, ...a), glow); } })),
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

// Where people sit or lie on a placed piece ({ id, x, z, ry }): seats in the
// shape interiors use (main.js sitDown). Long sofas and benches seat two side
// by side, a bed lies two (Yozi 2026-11-16), floor cushions sit on the floor.
export function furnitureSeats(it) {
  const f = furnitureById(it.id);
  const n = f?.lie || f?.seat;
  if (!n) return [];
  const [w, d] = f.size, c = Math.cos(it.ry), s = Math.sin(it.ry);
  const at = (lx, lz) => [it.x + lx * c + lz * s, it.z - lx * s + lz * c]; // the piece's own x (right) and z (front)
  const xs = n === 2 ? [-w / 4, w / 4] : [0];
  // Head on the pillow at the back. A bed often stands against a wall, so
  // both places are offered from either side or the foot (reach), and you
  // get up at the foot, never on the wall side.
  if (f.lie) return xs.map((lx) => {
    const [x, z] = at(lx, 0.15);
    return { x, z, ry: it.ry, lie: true, bed: true, reach: 0.6, stand: at(lx, d / 2 + 0.55) };
  });
  return xs.map((lx) => {
    const [x, z] = at(lx, 0.05);
    return { x, z, ry: it.ry, stand: at(lx, d / 2 + 0.55), ...(f.floor ? { y: 0.08, mat: true, cushion: true } : {}) };
  });
}

// Lamps can be switched off (Yozi 2026-11-16): their glowing parts dim.
export const isLamp = (id) => id === 'lamp' || id.startsWith('lamp-');
const dimmed = new Map();
const dim = (m) => {
  if (!dimmed.has(m)) { const d = m.clone(); d.color.multiplyScalar(0.32); dimmed.set(m, d); }
  return dimmed.get(m);
};
export function buildFurniture(id, { off = false } = {}) {
  const def = furnitureById(id);
  const g = new THREE.Group();
  def?.build(g);
  if (off && isLamp(id)) g.traverse((o) => { if (o.isMesh && o.material?.isMeshBasicMaterial) o.material = dim(o.material); });
  return g;
}

// Small things can stand on a table, desk or chest (Yozi 2026-11-16): the
// tops (height in metres) and the pieces small enough to go on them.
export const TOPS = { table: 0.65, desk: 0.71, 'f-wood-table': 0.755, 'f-tea-table': 0.32, 'f-bandaji': 0.7 };
const SMALL = new Set(['lamp-lotus', 'lamp-moon', 'lamp-mushroom', 'lamp-star', 'lamp-neon-heart', 'lamp-neon-hi', 'lamp-desk', 'lamp-lava', 'lamp-bulb', 'lamp-candle',
  'plush-simurugi', 'plush-mongle', 'plush-bear', 'plush-mandu', 'plush-bear-small', 'f-radio', 'f-gyeongdae']);
export const isSmall = (id) => SMALL.has(id);
// The piece's place in a surface's own frame (x right, z front).
const localTo = (o, x, z) => { const c = Math.cos(o.ry), s = Math.sin(o.ry), dx = x - o.x, dz = z - o.z; return [dx * c - dz * s, dx * s + dz * c]; };
// What a small piece at its x, z would stand on: { on, y } for the highest
// top under its middle, or null (the floor).
export function topUnder(item, items) {
  if (!SMALL.has(item.id)) return null;
  let best = null;
  for (const o of items) {
    if (o === item || o.y || !(o.id in TOPS)) continue;
    const [w, d] = furnitureById(o.id).size, [lx, lz] = localTo(o, item.x, item.z);
    if (Math.abs(lx) <= w / 2 - 0.08 && Math.abs(lz) <= d / 2 - 0.06 && (!best || TOPS[o.id] > best.y)) best = { on: o, y: TOPS[o.id] };
  }
  return best;
}
// The small pieces standing on a surface, in its own frame (they go with it
// when it's carried or turned).
export function ridersOf(surface, items) {
  return items.filter((i) => i.y && topUnder(i, [surface])?.on === surface).map((it) => { const [lx, lz] = localTo(surface, it.x, it.z); return { it, lx, lz, dry: it.ry - surface.ry }; });
}
export function placeRiders(surface, riders) {
  const c = Math.cos(surface.ry), s = Math.sin(surface.ry);
  for (const r of riders) {
    r.it.x = surface.x + r.lx * c + r.lz * s;
    r.it.z = surface.z - r.lx * s + r.lz * c;
    r.it.ry = surface.ry + r.dry;
  }
}

// The footprint of a placed piece (null for walkable ones: rugs).
function piecePoly(item) {
  const def = furnitureById(item.id);
  if (!def || def.walkable) return null;
  const [w, d] = def.size;
  const c = Math.cos(item.ry), s = Math.sin(item.ry);
  return { p: [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => [item.x + x * c + z * s, item.z - x * s + z * c]) };
}
// Collision polygon for a placed piece, or null for walkable ones (rugs) and
// things standing on a table (the table blocks you already).
export function furnitureCollider(item) {
  if (item.y) return null;
  const def = furnitureById(item.id);
  if (!def || def.walkable) return null;
  const [w, d] = def.size;
  const c = Math.cos(item.ry), s = Math.sin(item.ry);
  const p = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
    .map(([x, z]) => [item.x + x * c + z * s, item.z - x * s + z * c]);
  return { p };
}

// Do two convex polygons overlap? (separating axis test; touching edges don't count)
function polysOverlap(a, b) {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length];
      const nx = z1 - z2, nz = x2 - x1;
      const proj = (p) => p.map(([x, z]) => x * nx + z * nz);
      const pa = proj(a), pb = proj(b);
      if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) return false;
    }
  }
  return true;
}

// Is this piece blocked: by another solid piece, or by someone standing at
// `who` ({ x, z }, about 0.6 m wide)? Rugs never block and are never blocked.
// Room kept round a player when a piece is placed, carried or turned.
export const WHO_R = 0.45;
export function pieceBlocked(item, others, who = null) {
  const me = piecePoly(item), lvl = item.y || 0;
  if (!me) return false;
  // Pieces only bump into pieces at the same height: the floor, or the same top.
  if (others.some((o) => o !== item && o.id !== item.id && (o.y || 0) === lvl && piecePoly(o) && polysOverlap(me.p, piecePoly(o).p))) return true;
  if (who && !lvl) {
    const r = WHO_R; // (a little more than a player's radius, 0.35: a piece set down against you mustn't overlap you)
    if (polysOverlap(me.p, [[who.x - r, who.z - r], [who.x + r, who.z - r], [who.x + r, who.z + r], [who.x - r, who.z + r]])) return true;
  }
  return false;
}

// A first home isn't an empty floor: the room starts with a few basics
// (a bed in the back corner, a sofa facing the TV on a rug, a plant, a lamp
// and a little table). Positions are for a room w × d (metres, door at +z),
// kept clear of the door. Only used the very first time a home is opened.
export function starterLayout(w, d) {
  const L = -w / 2, R = w / 2, B = -d / 2;
  return [
    { id: 'rug', x: 0, z: B + 2.6, ry: 0 },
    { id: 'tv', x: 0, z: B + 0.45, ry: 0 },
    { id: 'sofa', x: 0, z: B + 3.6, ry: Math.PI },
    { id: 'bed', x: L + 1.2, z: B + 1.25, ry: 0 },
    { id: 'lamp', x: L + 2.45, z: B + 0.4, ry: 0 },
    { id: 'plant', x: R - 0.5, z: B + 0.5, ry: 0 },
    { id: 'table', x: R - 1.4, z: B + 3.2, ry: 0 },
    { id: 'chair', x: R - 1.4, z: B + 4.0, ry: Math.PI },
  ];
}
