// Furniture for decorating your home: a small catalogue of low-poly pieces.
// Each piece has a footprint (w × d metres, before rotation) used for
// collision, and chairs and sofas have a seat you can sit on.
import * as THREE from 'three';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

function box(g, sx, sy, sz, x, y, z, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(color));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

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
