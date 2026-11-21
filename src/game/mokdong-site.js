// What Mokdong Ice Rink and the two stadiums beside it look like from the
// street (loaded by game/mokdong-near.js when you come near). Shapes are the
// OpenStreetMap outlines at 1/4 (scripts/build-mokdong.mjs); heights and
// colours are from Yozi's aerial photo: the rink's white hall under a
// faceted white roof, the low salmon entrance building with a green band in
// front of it, and grey stands round the baseball field and the main
// stadium's pitch (you can't go into those). Merged per colour: a handful
// of draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex } from '../core/three-kit.js';

export const RINK_LOOK = { wall: 5.6, ridge: 8.4, lobby: 3, stand: 5 }; // m (the real hall is about 22 m to its eaves: 1/4)
const C = { wall: '#eef0f2', roof: '#fbfcfd', glass: '#5f7f9c', base: '#b8bec6', lobby: '#e9b9a8', band: '#4f9a6a', stand: '#aeb6c0', seat: '#2f6fb5', grass: '#6fae5c', dirt: '#c49a6c', track: '#b5533c' };

const shapeOf = (p) => new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
// A flat-topped block on an outline, from y0 up to y1 (holes: outlines cut out of it).
function slab(p, y0, y1, holes = []) {
  const s = shapeOf(p);
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = y1 > y0 ? new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false }) : new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2).translate(0, y0, 0);
  return g.index ? g.toNonIndexed() : g;
}
const centre = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
// The outline drawn in towards (or out from) its middle: k across the hall's
// axis and j along it (1: unchanged).
function scaled(p, axis, k, j = k) {
  const [cx, cz] = centre(p), ux = Math.sin(axis), uz = -Math.cos(axis); // along the hall (north)
  return p.map(([x, z]) => {
    const dx = x - cx, dz = z - cz, a = dx * ux + dz * uz, b = dx * -uz + dz * ux;
    return [cx + ux * a * j - uz * b * k, cz + uz * a * j + ux * b * k];
  });
}
// A faceted roof: from the outline at y0 up to a smaller outline at y1.
function roof(p, q, y0, y1) {
  const v = [];
  const tri = (a, b, c) => v.push(...a, ...b, ...c);
  const P = p.map(([x, z]) => [x, y0, z]), Q = q.map(([x, z]) => [x, y1, z]);
  // (wound to face up and out whichever way the outline runs)
  let area = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const flip = area < 0;
  for (let i = 0; i < p.length; i++) {
    const k = (i + 1) % p.length;
    if (flip) { tri(P[i], P[k], Q[k]); tri(P[i], Q[k], Q[i]); } else { tri(P[i], Q[k], P[k]); tri(P[i], Q[i], Q[k]); }
  }
  for (let i = 1; i < q.length - 1; i++) { if (flip) tri(Q[0], Q[i], Q[i + 1]); else tri(Q[0], Q[i + 1], Q[i]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

export function buildMokdongSite(l) {
  const group = new THREE.Group();
  group.name = 'mokdong';
  group.position.set(l.x, 0, l.z);
  const parts = new Map();
  const add = (color, g) => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); if (!parts.has(color)) parts.set(color, []); parts.get(color).push(g); };
  const K = RINK_LOOK;

  // The hall: a grey foot, white walls with a band of glass, the white roof.
  add(C.base, slab(scaled(l.hall, l.axis, 1.012), 0, 1));
  add(C.wall, slab(l.hall, 1, K.wall));
  add(C.glass, slab(scaled(l.hall, l.axis, 1.008), 2.6, 3.5));
  add(C.roof, roof(scaled(l.hall, l.axis, 1.04), scaled(l.hall, l.axis, 0.34, 0.62), K.wall, K.ridge));
  // The entrance building: salmon walls, a green band and a flat roof that sticks out.
  add(C.lobby, slab(l.lobby, 0, K.lobby));
  add(C.band, slab(scaled(l.lobby, l.axis, 1.06, 1.02), K.lobby - 0.5, K.lobby + 0.15));
  add(C.glass, slab(scaled(l.lobby, l.axis, 1.01, 0.5), 0.3, 2.2));

  // The stadiums: stands round a field.
  for (const s of l.stadiums) {
    if (s.kind === 'baseball') {
      add(C.grass, slab(s.out, 0.04, 0.04));
      add(C.dirt, slab(scaled(s.out, 0, 0.3), 0.06, 0.06));
      add(C.stand, slab(s.stands, 0, K.stand));
      add(C.seat, slab(scaled(s.stands, 0, 0.985), K.stand, K.stand + 0.12));
    } else {
      add(C.stand, slab(s.out, 0, K.stand - 0.5, [s.field]));
      add(C.track, slab(s.field, 0.04, 0.04));
      add(C.grass, slab(scaled(s.field, 0, 0.72, 0.8), 0.06, 0.06));
    }
  }
  for (const [color, geos] of parts) {
    const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
    m.matrixAutoUpdate = false;
    group.add(m);
  }

  // The name over the door (Korean and English), on the entrance building's front.
  const tex = canvasTex(1024, 256, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1024, 256);
    g.fillStyle = '#2f6fb5'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 104px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif'; g.fillText('목동아이스링크', 512, 92);
    g.font = '800 60px system-ui, sans-serif'; g.fillText('MOKDONG ICE RINK', 512, 196);
  });
  const sx = Math.sin(l.face), sz = Math.cos(l.face); // out of the front
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(l.door[0] - sx * (l.doorOut - 0.5), K.lobby + 1.15, l.door[1] - sz * (l.doorOut - 0.5));
  sign.rotation.y = l.face;
  group.add(sign);
  const back = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.1, 0.2), new THREE.MeshLambertMaterial({ color: '#2f6fb5' }));
  back.position.set(sign.position.x - sx * 0.12, sign.position.y, sign.position.z - sz * 0.12);
  back.rotation.y = l.face;
  group.add(back);
  // The doors under it.
  const doors = new THREE.Mesh(new THREE.BoxGeometry(3, 2.3, 0.16), new THREE.MeshLambertMaterial({ color: '#9fc4e4' }));
  doors.position.set(l.door[0] - sx * (l.doorOut - 0.02), 1.15, l.door[1] - sz * (l.doorOut - 0.02));
  doors.rotation.y = l.face;
  group.add(doors);
  group.updateMatrixWorld(true);
  return group;
}
