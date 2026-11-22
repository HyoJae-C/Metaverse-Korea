// Room dividers (파티션) from Eulji Room Dividers on the Euljiro furniture
// street (Yozi 2026-11-22: split the room into corners). Bought once like the
// other shop furniture and placed with Decorate, in the same tuple shape as
// furniture-shop.js: [id, emoji, footprint [w, d], seat, name, build]. Each
// shape comes in one colour (the item rule allows at most two).
//
// A divider may never shut anyone in: game/decor.js won't let one go down
// where it would cut off floor you can't walk round to from the door
// (core/free-spot.js shutInArea), so there is always a gap to walk through.
import * as THREE from 'three';

export const PARTITIONS = [
  // Oak slats on two feet: you see through it a little, a soft line.
  ['f-part-slat', '🪵', [1.6, 0.34], false, { en: 'Oak slat divider', ko: '원목 슬랫 파티션', ja: 'オーク材のスラット間仕切り', zh: '橡木格栅隔断' }, (g, part, box) => {
    const oak = '#c99a62', dark = '#9a6e3e';
    for (const x of [-0.7, 0.7]) box(0.08, 0.05, 0.34, x, 0.025, 0, dark); // feet
    box(1.6, 0.05, 0.06, 0, 0.1, 0, dark); // bottom rail
    box(1.6, 0.05, 0.06, 0, 1.78, 0, dark); // top rail
    for (let i = 0; i < 13; i++) box(0.06, 1.66, 0.05, -0.72 + i * 0.12, 0.94, 0, oak); // slats with gaps between
  }],
  // Three rattan panels folded in a zigzag, cane weave in a wood frame.
  ['f-part-rattan', '🎋', [1.4, 0.32], false, { en: 'Rattan folding divider', ko: '라탄 3폭 파티션', ja: 'ラタンの三つ折り衝立', zh: '藤编三折屏风' }, (g, part, box) => {
    const weave = new THREE.MeshLambertMaterial({ map: caneWeave(), side: THREE.DoubleSide, transparent: true, alphaTest: 0.4 });
    const frame = '#8a5a2e';
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.44, ry = i % 2 ? -0.5 : 0.5; // (0.44 = 0.5 m across at this angle: the panels meet at the hinges)
      const p = new THREE.Group();
      p.position.set(x, 0, 0);
      p.rotation.y = ry;
      g.add(p);
      const bar = (w, h, d, px, py) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: frame })); m.position.set(px, py, 0); p.add(m); };
      for (const px of [-0.25, 0.25]) bar(0.04, 1.7, 0.04, px, 0.85); // posts
      for (const py of [0.12, 1.68]) bar(0.5, 0.04, 0.04, 0, py); // top and bottom
      const cane = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 1.52), weave);
      cane.position.set(0, 0.9, 0);
      p.add(cane);
    }
  }],
  // An open bookcase you can stand in the room: books and a plant in the cubbies, both sides.
  ['f-part-shelf', '📚', [1.2, 0.36], false, { en: 'Open bookcase divider', ko: '오픈 책장 파티션', ja: 'オープン本棚の間仕切り', zh: '开放式书架隔断' }, (g, part, box) => {
    const white = '#f2efe8';
    for (const x of [-0.59, -0.2, 0.2, 0.59]) box(0.025, 1.6, 0.36, x, 0.8, 0, white); // uprights
    for (const y of [0.04, 0.42, 0.82, 1.22, 1.6]) box(1.2, 0.025, 0.36, 0, y, 0, white); // shelves
    // A few books and things, some cubbies left open so you see through.
    const books = ['#c8504a', '#3a6ea8', '#e0b04a', '#5a8a5a', '#8a5a9a', '#2b2b31'];
    const fill = [[0, 0, 5], [2, 0, 3], [1, 1, 4], [0, 2, 3], [2, 2, 5], [1, 3, 2]]; // [column, row, how many]
    for (const [c, r, n] of fill) {
      const cx = -0.395 + c * 0.395, y = 0.055 + r * 0.395;
      for (let k = 0; k < n; k++) {
        const h = 0.24 + ((c + r + k) % 3) * 0.04;
        box(0.045, h, 0.24, cx - 0.14 + k * 0.055, y + h / 2, 0, books[(c * 2 + r + k) % books.length]);
      }
    }
    part(new THREE.CylinderGeometry(0.07, 0.055, 0.12, 12), '#d8c8b0', 0.395, 0.48 + 0.06, 0); // a little pot plant
    part(new THREE.SphereGeometry(0.11, 10, 8), '#5aa86a', 0.395, 0.66, 0);
    part(new THREE.SphereGeometry(0.06, 8, 6), '#d8c8b0', -0.395, 1.235 + 0.06, 0.05); // a vase
  }],
];

export const PARTITION_IDS = new Set(PARTITIONS.map((p) => p[0]));
export const isPartition = (id) => PARTITION_IDS.has(id);

// Cane weave: little octagon holes in honey-coloured cane, drawn once and shared.
let caneTex = null;
function caneWeave() {
  if (caneTex) return caneTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#d8b47a'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#b8904e'; g.lineWidth = 2;
  for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); }
  g.globalCompositeOperation = 'destination-out';
  for (let x = 8; x < 64; x += 16) for (let y = 8; y < 64; y += 16) { g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill(); } // the holes
  caneTex = new THREE.CanvasTexture(c);
  caneTex.colorSpace = THREE.SRGBColorSpace;
  caneTex.wrapS = caneTex.wrapT = THREE.RepeatWrapping;
  caneTex.repeat.set(2, 6);
  return caneTex;
}
