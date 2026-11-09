// Another Land's gate where its bridge lands on the island: a Hansel and
// Gretel candy house, gingerbread walls under a steep chocolate roof thick
// with icing, gumdrops along its eaves, candy canes either side of an
// archway the walk goes through, and the park's name on a board over it.
// park-island.js places it (store.open.house) and bakes it with the rest of
// the island's still parts, so it costs no draw calls of its own but the sign.
import * as THREE from 'three';
import { gateSign } from './park-yards.js';

const ICING = '#fffaf3', GINGER = '#c98a4b', DARK = '#8a5530', CHOC = '#6b3f2a', PINK = '#ff8fb8', HOT = '#ff5f9e', MINT = '#8fe3c7', LEMON = '#ffe27a', LILAC = '#c9a8ff', SKY = '#8fd0ff';
const GUMS = [PINK, MINT, LEMON, LILAC, SKY];
// Its size: 8.4 m across, 4.6 m deep, walls 4.2 m high under a ridge at
// 9 m; the archway 3 m wide and 3.4 m high.
export const HOUSE = { w: 8.4, d: 4.6, wall: 4.2, ridge: 9, arch: 3, archH: 3.4 };

// at: { x, z, ry } (its front, with the archway, faces -z: the bridge).
export function buildCandyHouse(scene, block, mat, at, names) {
  const { w, d, wall, ridge, arch, archH } = HOUSE;
  const g = new THREE.Group();
  g.position.set(at.x, 0, at.z);
  g.rotation.y = at.ry || 0;
  scene.add(g);
  const part = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  const box = (sx, sy, sz, x, y, z, c) => part(new THREE.BoxGeometry(sx, sy, sz), c, x, y, z);
  const ball = (r, x, y, z, c) => part(new THREE.SphereGeometry(r, 8, 6), c, x, y, z);
  // Blocked ground, given in the house's own metres.
  const c = Math.cos(at.ry || 0), s = Math.sin(at.ry || 0), turned = Math.abs(s) > 0.7;
  const solid = (lx, lz, sx, sz) => block(at.x + lx * c + lz * s, at.z - lx * s + lz * c, turned ? sz : sx, turned ? sx : sz);

  // The walls: a gingerbread block either side of the archway and a lintel
  // over it, a chocolate plinth, icing piped up the corners and in a band.
  const side = (w - arch) / 2, sx = arch / 2 + side / 2;
  for (const k of [-1, 1]) {
    box(side, wall, d, k * sx, wall / 2, 0, GINGER);
    box(side + 0.2, 0.35, d + 0.2, k * sx, 0.17, 0, DARK);
    for (const z of [-d / 2, d / 2]) box(0.16, wall, 0.16, k * (w / 2), wall / 2, z, ICING);
    for (const z of [-d / 2 - 0.02, d / 2 + 0.02]) box(side, 0.14, 0.06, k * sx, wall - 0.5, z, ICING);
    // A window each side, front and back: lit lemon panes in an icing frame.
    for (const z of [-d / 2 - 0.04, d / 2 + 0.04]) {
      const out = Math.sign(z) * 0.02;
      box(1.3, 1.3, 0.05, k * sx, 2.2, z, LEMON);
      for (const [fw, fh, fy, fx] of [[1.5, 0.14, 2.9, 0], [1.5, 0.14, 1.5, 0], [0.14, 1.5, 2.2, -0.7], [0.14, 1.5, 2.2, 0.7], [1.3, 0.08, 2.2, 0], [0.08, 1.3, 2.2, 0]]) box(fw, fh, 0.08, k * sx + fx, fy, z + out, ICING);
      box(1.6, 0.18, 0.3, k * sx, 1.4, z + out * 6, PINK); // a sill
    }
    // Gumdrops all along the side wall's foot.
    for (let i = 0; i < 4; i++) ball(0.2, k * (w / 2 + 0.12), 0.45, -d / 2 + 0.5 + i * ((d - 1) / 3), GUMS[(i + (k > 0 ? 2 : 0)) % 5]);
    for (let i = 0; i < 3; i++) solid(k * sx, -d / 2 + d / 6 + (i * d) / 3, side, d / 3 + 0.1);
  }
  box(arch, wall - archH, d, 0, (wall + archH) / 2, 0, GINGER); // over the way through
  box(arch, 0.05, d, 0, archH - 0.02, 0, DARK); // (its ceiling)
  // The archway's rim: piped icing round it, front and back, with candies.
  for (const z of [-d / 2 - 0.05, d / 2 + 0.05]) {
    for (const k of [-1, 1]) box(0.24, archH, 0.12, k * (arch / 2 + 0.06), archH / 2, z, ICING);
    box(arch + 0.36, 0.24, 0.12, 0, archH + 0.06, z, ICING);
  }

  // The roof: two chocolate slopes from the eaves up to the ridge (along z,
  // so the gable faces the bridge), frosted, icing dripping off the eaves.
  const rise = ridge - wall, t = rise / (w / 2), half = w / 2 + 0.5, eave = wall - 0.5 * t;
  const slope = Math.hypot(half, ridge - eave), pitch = Math.atan2(ridge - eave, half);
  for (const k of [-1, 1]) {
    const r = box(slope, 0.32, d + 1, (k * half) / 2, (eave + ridge) / 2, 0, CHOC);
    r.rotation.z = -k * pitch;
    const ic = box(slope - 0.3, 0.1, d + 1.1, (k * half) / 2, (eave + ridge) / 2 + 0.2, 0, ICING);
    ic.rotation.z = -k * pitch;
    for (let i = 0; i < 7; i++) {
      const z = -(d + 1) / 2 + 0.3 + i * ((d + 0.4) / 6);
      ball(0.17, k * (half - 0.1), eave - 0.05, z, ICING); // a drip
      ball(0.19, k * (half - 0.8), eave + 0.8 * t + 0.25, z, GUMS[(i + (k > 0 ? 1 : 3)) % 5]); // a gumdrop
    }
  }
  // The gables, front and back: gingerbread triangles with piped edges, a
  // round lemon window, and a cherry at each end of the ridge.
  const tri = new THREE.Shape();
  tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rise - 0.15); tri.closePath();
  const gable = new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false });
  part(gable, GINGER, 0, wall, -d / 2);
  part(gable, GINGER, 0, wall, d / 2 - 0.3);
  const edge = Math.hypot(w / 2, rise), lean = Math.atan2(rise, w / 2);
  for (const k of [-1, 1]) {
    const zf = k * (d / 2 + 0.06);
    const win = part(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), LEMON, 0, wall + 2.4, zf);
    win.rotation.x = Math.PI / 2;
    part(new THREE.TorusGeometry(0.75, 0.1, 6, 18), ICING, 0, wall + 2.4, zf + k * 0.03);
    for (const sg of [-1, 1]) {
      const e = box(edge, 0.16, 0.12, (sg * w) / 4, wall + rise / 2, zf, ICING);
      e.rotation.z = -sg * lean;
    }
    ball(0.42, 0, ridge + 0.15, k * ((d + 1) / 2 - 0.2), HOT);
  }
  for (let i = 0; i < 5; i++) ball(0.22, 0, ridge + 0.05, -d / 2 + 0.1 + i * ((d - 0.2) / 4), GUMS[(i + 1) % 5]); // along the ridge
  // A chimney on the east slope, snow on top and a peppermint on that.
  box(0.9, 2.2, 0.9, 2.2, ridge - 1.6, 0.8, '#d24a4a');
  box(1.1, 0.3, 1.1, 2.2, ridge - 0.4, 0.8, ICING);
  part(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 14), HOT, 2.2, ridge - 0.18, 0.8);

  // Candy canes either side of the way in, and two giant lollipops at the
  // front corners.
  for (const k of [-1, 1]) {
    const x = k * (arch / 2 + 0.55), z = -d / 2 - 0.5;
    for (let i = 0; i < 6; i++) part(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 10), i % 2 ? ICING : HOT, x, 0.25 + i * 0.5, z);
    part(new THREE.TorusGeometry(0.35, 0.15, 8, 12, Math.PI), HOT, x - k * 0.35, 3, z);
    solid(x, z, 0.4, 0.4);
    const lx = k * (w / 2 + 0.9), lz = -d / 2 - 0.4;
    part(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), ICING, lx, 1.6, lz);
    const disc = part(new THREE.CylinderGeometry(0.85, 0.85, 0.22, 20), k > 0 ? MINT : PINK, lx, 3.6, lz);
    disc.rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) part(new THREE.TorusGeometry(0.2 + i * 0.22, 0.06, 4, 18), ICING, lx, 3.6, lz - 0.12);
    solid(lx, lz, 0.5, 0.5);
  }

  // The park's name over the way in, front and back.
  const sign = gateSign(names, '🍭', 512, 160, HOT);
  const boards = [-1, 1].map((k) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.12), new THREE.MeshBasicMaterial({ map: sign.tex }));
    b.position.set(0, wall + 0.55, k * (d / 2 + 0.12));
    b.rotation.y = k < 0 ? Math.PI : 0;
    g.add(b);
    return b;
  });
  return { group: g, sign, boards };
}
