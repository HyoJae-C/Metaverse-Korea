// Seoul Children's Grand Park (Gwangjin-gu), stylised and not to scale:
//   cgpgate: the main gate on the plaza by Neungdong-ro: two round pillars in
//            bright stripes under a rainbow arch with balloons on top.
//   zooentrance: the zoo's entrance building at the end of the gate plaza:
//            the zoo is a room you walk into (core/zoo-park.js), and this is
//            its door (the storefront "cgp-zoo" on its west face).
//   zoofence: the zoo's green railing round the wood behind the entrance
//            (polyline l.p).
// Collision comes from the map's blockers (the pillars: CGP_GATE_PILLARS;
// the entrance is a custom building), so this is only visual.
import * as THREE from 'three';
import { matCache, canvasTex } from './three-kit.js';

const mat = matCache();

// Pillar centres from the gate's centre (x across the path) and their radius:
// shared with the map's blockers (districts/grand-park.json).
export const CGP_GATE_PILLARS = { at: [[-7, 0], [7, 0]], r: 0.8 };

const STRIPES = ['#f2c94c', '#ef6f6c', '#56b4e9', '#7bc96f'];
const ARCH = ['#ef6f6c', '#f2a65a', '#f2c94c', '#7bc96f', '#56b4e9', '#8e7cc3'];

export function cgpGate(g) {
  const H = 6.5; // pillar height
  for (const [x, z] of CGP_GATE_PILLARS.at) {
    for (let i = 0; i < 6; i++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(CGP_GATE_PILLARS.r, CGP_GATE_PILLARS.r, H / 6, 16), mat(STRIPES[i % STRIPES.length]));
      band.position.set(x, H / 12 + (i * H) / 6, z);
      g.add(band);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 10), mat('#ffffff'));
    cap.position.set(x, H + 0.6, z);
    g.add(cap);
  }
  // The rainbow: thin half-rings, one per colour, from pillar top to pillar top.
  const R = CGP_GATE_PILLARS.at[1][0];
  ARCH.forEach((c, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.1 - i * 0.28, 0.16, 6, 28, Math.PI), mat(c));
    ring.position.y = H + 0.6;
    g.add(ring);
  });
  // Balloons over the arch, tied with thin strings.
  const balloons = [[-3.5, 4.6, '#ef6f6c'], [-1.2, 5.6, '#56b4e9'], [1.3, 5.4, '#f2c94c'], [3.6, 4.4, '#7bc96f']];
  for (const [x, dy, c] of balloons) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), mat(c));
    b.scale.y = 1.2;
    b.position.set(x, H + dy + 1.4, 0);
    g.add(b);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), mat('#ffffff'));
    s.position.set(x, H + dy + 0.4, 0);
    g.add(s);
  }
}

// The zoo's entrance building (l: w × d × h, centred; its door faces -x,
// the plaza): cream walls under a green roof with a deep overhang, ticket
// windows either side of the door, and the zoo's name on a board up top.
let entranceTex = null;
export function zooEntrance(g, l) {
  const { w = 6, d = 20, h = 6 } = l;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat('#fbf3e2'));
  wall.position.y = h / 2;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, 0.5, d + 1.6), mat('#3f9b5a'));
  roof.position.set(-0.6, h + 0.25, 0);
  const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.5, d + 0.1), mat('#56b4e9'));
  band.position.y = 0.25;
  g.add(wall, roof, band);
  for (const s of [-1, 1]) { // ticket windows and the arch's pillars
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), mat('#7fb3d5'));
    win.position.set(-w / 2 - 0.02, 1.7, s * 6.5);
    win.rotation.y = -Math.PI / 2;
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 2.4), mat('#e2d4b8'));
    ledge.position.set(-w / 2 - 0.2, 1.05, s * 6.5);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, h, 12), mat(STRIPES[s < 0 ? 1 : 2]));
    pillar.position.set(-w / 2 - 0.9, h / 2, s * 3.4);
    g.add(win, ledge, pillar);
  }
  entranceTex ||= canvasTex(1024, 192, (c, W, H) => {
    c.fillStyle = '#3f9b5a'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#fffaf0'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 84px sans-serif'; c.fillText('동물원', W / 2 - 170, H / 2 + 4);
    c.font = 'bold 64px sans-serif'; c.fillText('ZOO', W / 2 + 190, H / 2 + 4);
    c.font = '72px sans-serif'; c.fillText('🦁', W / 2 + 10, H / 2 + 4);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshLambertMaterial({ map: entranceTex }));
  board.position.set(-w / 2 - 1.85, h + 1.4, 0);
  board.rotation.y = -Math.PI / 2;
  g.add(board);
}

// The zoo's railing (l.p, map coords): green posts and two rails, about
// waist high, with a hedge behind it.
export function zooFence(g, l) {
  const H = 1.3, GAP = 2.5;
  const posts = [], rails = [];
  for (let i = 1; i < l.p.length; i++) {
    const [x0, z0] = l.p[i - 1], [x1, z1] = l.p[i];
    const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    for (let k = 0; k <= Math.round(len / GAP); k++) {
      const u = k / Math.round(len / GAP);
      posts.push([x0 + (x1 - x0) * u, z0 + (z1 - z0) * u]);
    }
    rails.push([(x0 + x1) / 2, (z0 + z1) / 2, len, ang]);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, H, 0.12).translate(0, H / 2, 0), mat('#2f7d46'), posts.length);
  posts.forEach(([x, z], i) => pm.setMatrixAt(i, m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, 1, 1))));
  const rm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, 0.06), mat('#2f7d46'), rails.length * 2);
  const hm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.9, 0.8).translate(0, 0.45, 0), mat('#4f9a45'), rails.length);
  rails.forEach(([x, z, len, ang], i) => {
    q.setFromAxisAngle(up, -ang);
    for (const [k, y] of [[0, 0.5], [1, 1.15]]) rm.setMatrixAt(i * 2 + k, m4.compose(v.set(x, y, z), q, sc.set(len, 1, 1)));
    hm.setMatrixAt(i, m4.compose(v.set(x, 0, z), q, sc.set(len, 1, 1)));
  });
  for (const m of [pm, rm, hm]) { m.computeBoundingSphere(); g.add(m); }
}
