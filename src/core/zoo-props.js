// The zoo's props inside its room (core/zoo-park.js): the cart station and
// the flowers. Loaded with the zoo, on the first visit.
import * as THREE from 'three';
import { matCache, canvasTex } from './three-kit.js';
import { makeZooCart } from './bikes.js';
import { mergeStatic } from './merge-static.js';

const mat = matCache();

// The zoo cart station (l: x, z, ry; carts face along local -z… see l.carts:
// [x, z] spots from the station): carts parked in a row and a sign. Where
// you rent one is game/zoo-carts.js; parked carts are one merged piece.
export function zooCartStation(g, l) {
  for (const [x, z] of l.carts || []) {
    const c = makeZooCart();
    c.position.set(x - 0.45, 0, z - 0.35); // (turned round: its middle is 0.45 m right of and 0.35 m behind its driver's seat)
    c.rotation.y = Math.PI; // nose to the main path (north)
    g.add(c);
  }
  const tex = canvasTex(512, 200, (c, w, h) => {
    c.fillStyle = '#3f9b5a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fffaf0'; c.fillRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#2d5e3a'; c.textAlign = 'center';
    c.font = 'bold 64px sans-serif'; c.fillText('동물원 카트', w / 2, 92);
    c.font = '42px sans-serif'; c.fillText('Zoo Cart · 4 seats · Free', w / 2, 152, w - 40);
  });
  const sign = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.94), new THREE.MeshLambertMaterial({ map: tex }));
  board.position.y = 2.1;
  board.rotation.y = -Math.PI / 2; // facing the loop path (west)
  board.position.x = -0.04;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.04, 2.5), mat('#3f9b5a'));
  back.position.set(0.0, 2.1, 0);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.12), mat('#3f9b5a'));
  post.position.set(0.02, 1.05, 0);
  sign.add(back, board, post);
  sign.position.set(l.sign?.[0] ?? -3, 0, l.sign?.[1] ?? -4);
  g.add(sign);
  mergeStatic(g);
}

// The zoo's flowers (l.beds: [x, z, r] round beds; l.borders: [x1, z1, x2,
// z2] strips along the pens' fences; l.plaza: [r, bed r], at the group's
// origin). Low, so nothing here blocks you. A handful of instanced meshes:
// bed rims, beds, hedges and the flower heads.
const PALETTES = [
  ['#ff6f91', '#ffd1dc', '#ffffff'], // pink and white
  ['#ffd23f', '#ff9a3c', '#fff3b0'], // yellow and orange
  ['#9b7bea', '#c9a8ff', '#6fa8ff'], // purple and blue
  ['#ef4f4f', '#ffffff', '#ff9a9a'], // red and white
];
export function zooFlowers(g, l) {
  const [pr, pb] = l.plaza || [0, 0];
  const beds = (l.beds || []).slice();
  const heads = []; // [x, y, z, colour]
  const golden = Math.PI * (3 - Math.sqrt(5));
  const plant = (x, z, r, y, pal, per = 2.2) => {
    const n = Math.max(5, Math.round(Math.PI * r * r * per));
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt((i + 0.5) / n) * (r - 0.18), a = i * golden;
      heads.push([x + Math.cos(a) * d, y + ((i * 7) % 5) * 0.02, z + Math.sin(a) * d, pal[i % pal.length]]);
    }
  };
  if (pr) { // the plaza: paving a hair above the paths, a stone rim, flowers in rings
    const pave = new THREE.Mesh(new THREE.CircleGeometry(pr, 40).rotateX(-Math.PI / 2), mat('#d8cfc0'));
    pave.position.y = 0.075;
    pave.receiveShadow = true;
    g.add(pave);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(pb + 0.3, pb + 0.3, 0.4, 32), mat('#d9cfbf'));
    rim.position.y = 0.2;
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(pb, pb, 0.46, 32), mat('#4f9a45'));
    soil.position.y = 0.23;
    g.add(rim, soil);
    const rings = ['#ffd23f', '#ff6f91', '#ffffff', '#9b7bea'];
    for (let k = 0; k < 4; k++) { // rings of colour from the middle out
      const r0 = (k / 4) * (pb - 0.2), r1 = ((k + 1) / 4) * (pb - 0.2);
      const n = Math.round(Math.PI * (r1 * r1 - r0 * r0) * 4);
      for (let i = 0; i < n; i++) {
        const a = i * golden, d = Math.sqrt(r0 * r0 + ((i + 0.5) / n) * (r1 * r1 - r0 * r0));
        heads.push([Math.cos(a) * d, 0.6 + (k === 0 ? 0.12 : 0), Math.sin(a) * d, rings[k]]);
      }
    }
  }
  // Round beds: a stone rim, a leafy top, flowers.
  const rims = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.14, 18).translate(0, 0.07, 0), mat('#d9cfbf'), Math.max(1, beds.length));
  const tops = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.2, 18).translate(0, 0.1, 0), mat('#4f9a45'), Math.max(1, beds.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  beds.forEach(([x, z, r], i) => {
    rims.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(r + 0.15, 1, r + 0.15)));
    tops.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(r, 1, r)));
    plant(x, z, r, 0.32, PALETTES[i % PALETTES.length]);
  });
  rims.count = tops.count = beds.length;
  // Borders: a low hedge along the fence with flowers on top, two rows.
  const borders = l.borders || [];
  const hedges = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 0.7).translate(0, 0.15, 0), mat('#4f9a45'), Math.max(1, borders.length));
  borders.forEach(([x1, z1, x2, z2], i) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ux = (x2 - x1) / len, uz = (z2 - z1) / len;
    q.setFromAxisAngle(v.set(0, 1, 0), -Math.atan2(uz, ux));
    hedges.setMatrixAt(i, m4.compose(v.set((x1 + x2) / 2, 0, (z1 + z2) / 2), q, sc.set(len, 1, 1)));
    const pal = PALETTES[(i + 1) % PALETTES.length];
    for (let d = 0.2, k = 0; d < len - 0.1; d += 0.55, k++) {
      for (const s of [-0.17, 0.17]) heads.push([x1 + ux * d - uz * s, 0.36 + (k % 3) * 0.02, z1 + uz * d + ux * s, pal[(k + (s > 0 ? 1 : 0)) % pal.length]]);
    }
  });
  hedges.count = borders.length;
  const flowers = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.15, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), Math.max(1, heads.length));
  heads.forEach(([x, y, z, c], i) => {
    flowers.setMatrixAt(i, m4.compose(v.set(x, y, z), q.setFromAxisAngle(v.clone().set(0, 1, 0), i * 0.7), sc.set(1, 0.7, 1)));
    flowers.setColorAt(i, col.set(c));
  });
  flowers.count = heads.length;
  for (const m of [rims, tops, hedges, flowers]) { m.computeBoundingSphere(); m.userData.noShadow = true; g.add(m); }
}
