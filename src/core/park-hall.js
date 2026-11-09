// The way down from Another Land's island to the rest of the park (the
// "another-land" room under it): a round candy hall in the middle of the
// island, pink walls with icing piped round them, a mint dome with gumdrops
// round its foot and a giant swirl lollipop on top, and one arched door, with
// the stairs going down inside it and the sign over it. park-island.js
// places it (store.open.hall) and bakes it with the island's still parts.
import * as THREE from 'three';

const ICING = '#fffaf3', PINK = '#ff8fb8', HOT = '#ff5f9e', MINT = '#8fe3c7', LEMON = '#ffe27a', LILAC = '#c9a8ff', SKY = '#8fd0ff', BISCUIT = '#e8d2b0', STAIR = '#6b3f2a';
const GUMS = [PINK, LEMON, LILAC, SKY, HOT];
export const UNDER_SIGN = { ko: '어나더랜드 지하', en: 'ANOTHER LAND ▼', ja: 'アナザーランド地下', zh: '另一乐园地下', es: 'ANOTHER LAND ▼', id: 'ANOTHER LAND ▼', vi: 'ANOTHER LAND ▼', hi: 'ANOTHER LAND ▼', fr: 'ANOTHER LAND ▼', th: 'ANOTHER LAND ▼', ar: 'ANOTHER LAND ▼' };
// Its size: 8 m across, walls 4.5 m high, the lollipop's top at about 11 m.
export const HALL = { r: 4, wall: 4.5, door: 2.4, doorH: 3.2 };

// at: { x, z, ry } (its door faces its +z, turned by ry). Returns the spot
// just outside the door, where you're offered the way down.
export function buildHall(scene, block, mat, at) {
  const { r, wall, door, doorH } = HALL;
  const g = new THREE.Group();
  g.position.set(at.x, 0, at.z);
  g.rotation.y = at.ry || 0;
  scene.add(g);
  const part = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  const box = (sx, sy, sz, x, y, z, c) => part(new THREE.BoxGeometry(sx, sy, sz), c, x, y, z);
  const ball = (rad, x, y, z, c) => part(new THREE.SphereGeometry(rad, 8, 6), c, x, y, z);
  const ring = (rad, tube, y, c, seg = 28) => { const m = part(new THREE.TorusGeometry(rad, tube, 5, seg), c, 0, y, 0); m.rotation.x = Math.PI / 2; return m; };

  // A biscuit step round it, then the wall: sixteen pink panels round, but
  // for the door's gap (its +z), with icing piped at the foot and the top.
  part(new THREE.CylinderGeometry(r + 0.6, r + 0.7, 0.2, 24), BISCUIT, 0, 0.1, 0);
  const n = 16, gap = Math.asin(door / 2 / r) + 0.05;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, mid = a + Math.PI / n;
    const off = Math.abs(Math.atan2(Math.sin(mid), Math.cos(mid)));
    const panelW = 2 * r * Math.sin(Math.PI / n) + 0.04;
    if (off < gap) { // over the door: just the lintel
      const p = box(panelW, wall - doorH, 0.4, Math.sin(mid) * r, (wall + doorH) / 2, Math.cos(mid) * r, PINK);
      p.rotation.y = mid;
      continue;
    }
    const p = box(panelW, wall, 0.4, Math.sin(mid) * r, wall / 2, Math.cos(mid) * r, i % 2 ? PINK : '#ffa8c8');
    p.rotation.y = mid;
    if (i % 2) { // a round lemon window in every other panel
      const w = part(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 14).rotateX(Math.PI / 2), LEMON, Math.sin(mid) * (r + 0.21), 2.6, Math.cos(mid) * (r + 0.21));
      w.rotation.y = mid;
      const f = part(new THREE.TorusGeometry(0.5, 0.07, 5, 14), ICING, Math.sin(mid) * (r + 0.24), 2.6, Math.cos(mid) * (r + 0.24));
      f.rotation.y = mid;
    }
  }
  ring(r + 0.22, 0.14, 0.35, ICING);
  ring(r + 0.22, 0.16, wall, ICING);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ball(0.13, Math.sin(a) * (r + 0.28), wall - 0.22, Math.cos(a) * (r + 0.28), ICING); } // drips

  // The dome, gumdrops round its foot, and the lollipop on top.
  const dome = part(new THREE.SphereGeometry(r + 0.15, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), MINT, 0, wall, 0);
  dome.scale.y = 0.75;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.13; ball(0.3, Math.sin(a) * (r - 0.1), wall + 0.45, Math.cos(a) * (r - 0.1), GUMS[i % 5]); }
  for (let i = 0; i < 8; i++) { // icing stripes over the dome
    const s = part(new THREE.TorusGeometry(r + 0.17, 0.06, 4, 20, Math.PI / 2), ICING, 0, wall, 0);
    s.scale.y = 0.75; s.rotation.y = (i / 8) * Math.PI * 2;
  }
  const top = wall + (r + 0.15) * 0.75;
  for (let i = 0; i < 5; i++) part(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 10), i % 2 ? ICING : HOT, 0, top + 0.3 + i * 0.6, 0);
  const pop = top + 3.6, disc = part(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 24), HOT, 0, pop, 0);
  disc.rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) for (const k of [-1, 1]) part(new THREE.TorusGeometry(0.25 + i * 0.25, 0.07, 4, 20), i % 2 ? LEMON : ICING, 0, pop, k * 0.16);

  // The door: an arch of piped icing, the stairwell going down inside it,
  // and the sign over it.
  const dz = r + 0.05;
  for (const k of [-1, 1]) {
    box(0.3, doorH, 0.5, k * (door / 2 + 0.1), doorH / 2, dz, ICING);
    for (let i = 0; i < 4; i++) ball(0.16, k * (door / 2 + 0.1), 0.5 + i * 0.8, dz + 0.28, GUMS[(i + (k > 0 ? 2 : 0)) % 5]);
  }
  box(door + 0.5, 0.3, 0.5, 0, doorH + 0.1, dz, ICING);
  box(door, doorH, 0.1, 0, doorH / 2, r - 1.6, '#3a2418'); // (the dark inside)
  for (let i = 0; i < 4; i++) box(door - 0.1, 0.06, 0.45, 0, 0.18 - i * 0.04, r - 0.2 - i * 0.4, STAIR); // the top steps
  box(door + 0.6, 0.05, 1.6, 0, 0.21, r + 0.7, BISCUIT); // a doormat of biscuit
  const sign = signBoard();
  sign.mesh.position.set(0, wall - 0.55, r + 0.5);
  g.add(sign.mesh);

  // Solid all round (an octagon of boxes), the door too: you go down by
  // the button at it.
  const c = Math.cos(at.ry || 0), s = Math.sin(at.ry || 0);
  const w = (r + 0.4) * 2, k = w * 0.7;
  block(at.x, at.z, w, k);
  block(at.x, at.z, k, w);
  const out = r + 1.3;
  return { group: g, sign, door: { x: at.x + s * out, z: at.z + c * out, ry: at.ry || 0 } };
}

function signBoard() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lang) => {
    g.fillStyle = '#ff5f9e'; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#fffaf3'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
    g.fillStyle = '#fffaf3'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 54px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
    g.fillText(lang ? UNDER_SIGN[lang] || UNDER_SIGN.en : UNDER_SIGN.ko, 256, 66, 480);
    tex.needsUpdate = true;
  };
  draw(null);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: tex }));
  return { mesh, draw };
}
