// Bike share: stations on the street where you can rent a bike and ride.
// Fictional service (no real bike-share brand). Stations come from the
// region's bikes.json; each is snapped to the nearest street.
import * as THREE from 'three';
import { latLonToLocal } from './storefronts.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const FRAME = '#3fb59a', DARK = '#2b2f36';

// A small bike, wheels on the ground, front towards +z.
export function makeBike(color = FRAME) {
  const g = new THREE.Group();
  const wheelGeo = new THREE.TorusGeometry(0.27, 0.045, 6, 18).rotateY(Math.PI / 2);
  for (const z of [-0.48, 0.48]) {
    const w = new THREE.Mesh(wheelGeo, mat(DARK));
    w.position.set(0, 0.3, z);
    g.add(w);
  }
  const bar = (sx, sy, sz, x, y, z, rx = 0, c = color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
  };
  bar(0.06, 0.06, 0.8, 0, 0.5, 0); // top tube
  bar(0.06, 0.45, 0.06, 0, 0.42, -0.2, 0.25); // seat tube
  bar(0.06, 0.55, 0.06, 0, 0.55, 0.45, -0.25); // fork
  bar(0.2, 0.06, 0.28, 0, 0.64, -0.24, 0, DARK); // seat
  bar(0.55, 0.05, 0.05, 0, 0.86, 0.5, 0, DARK); // handlebar
  bar(0.3, 0.16, 0.22, 0, 0.72, 0.62, 0, '#ffffff'); // basket
  return g;
}

// A tandem: the front seat is where a normal bike's seat is (so the driver
// sits the same way), and a second seat 0.8 m behind for the passenger.
export const TANDEM_GAP = 0.8;
export function makeTandem(color = '#e0604d') {
  const g = new THREE.Group();
  const wheelGeo = new THREE.TorusGeometry(0.27, 0.045, 6, 18).rotateY(Math.PI / 2);
  for (const z of [-0.48 - TANDEM_GAP, 0.48]) {
    const w = new THREE.Mesh(wheelGeo, mat(DARK));
    w.position.set(0, 0.3, z);
    g.add(w);
  }
  const bar = (sx, sy, sz, x, y, z, rx = 0, c = color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
  };
  bar(0.06, 0.06, 0.8 + TANDEM_GAP, 0, 0.5, -TANDEM_GAP / 2); // long top tube
  for (const z of [-0.2, -0.2 - TANDEM_GAP]) bar(0.06, 0.45, 0.06, 0, 0.42, z, 0.25); // seat tubes
  bar(0.06, 0.55, 0.06, 0, 0.55, 0.45, -0.25); // fork
  for (const z of [-0.24, -0.24 - TANDEM_GAP]) bar(0.2, 0.06, 0.28, 0, 0.64, z, 0, DARK); // seats
  bar(0.55, 0.05, 0.05, 0, 0.86, 0.5, 0, DARK); // handlebar
  bar(0.45, 0.05, 0.05, 0, 0.8, -0.3, 0, DARK); // back rider's handle
  return g;
}

// An open-top 6-seater (driver, front passenger, two rows of two in the
// back). The driver sits on the left (Korea drives on the right), so the
// body sits to the driver's right (-x when facing +z).
export function makeCar(color = '#ffcf4a') {
  const g = new THREE.Group();
  const box = (sx, sy, sz, x, y, z, c = color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
    m.position.set(x, y, z);
    g.add(m);
  };
  const cx = -0.42, cz = -0.5, len = 4.8;
  box(1.8, 0.5, len, cx, 0.45, cz); // body
  box(1.82, 0.12, 1.0, cx, 0.76, cz + len / 2 - 0.5); // bonnet top
  box(1.7, 0.35, 0.08, cx, 1.05, 0.62, '#bfe3f5'); // windscreen
  box(1.6, 0.08, 0.08, cx, 1.24, 0.62, DARK);
  for (const [sx, sz] of SEATS.car.concat([[0, 0]])) {
    box(0.5, 0.18, 0.5, sx, 0.55, sz - 0.15, '#7a4a2e'); // seat
    box(0.5, 0.4, 0.08, sx, 0.8, sz - 0.42, '#7a4a2e'); // back rest
  }
  box(0.3, 0.3, 0.05, 0, 0.85, 0.42, DARK); // steering wheel
  for (const lx of [-0.6, 0.6]) box(0.3, 0.12, 0.05, cx + lx, 0.55, cz + len / 2 + 0.01, '#fff6c9'); // lights
  box(1.8, 0.1, 0.05, cx, 0.42, cz - len / 2 - 0.01, '#e0604d'); // tail lights
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 16).rotateZ(Math.PI / 2);
  for (const wx of [0.47, -1.31]) for (const wz of [cz + len / 2 - 0.8, cz - len / 2 + 0.8]) {
    const w = new THREE.Mesh(wheelGeo, mat(DARK));
    w.position.set(wx, 0.34, wz);
    g.add(w);
  }
  return g;
}

// Passenger seats relative to the driver ([x, z], driver facing +z).
export const SEATS = {
  2: [[0, -TANDEM_GAP]], // tandem back seat
  4: [[-0.84, 0], [0, -1.15], [-0.84, -1.15], [0, -2.15], [-0.84, -2.15]], // car: 1 front + 4 back
};
SEATS.car = SEATS[4];

// Where seat n of the driver's vehicle is in the world.
export function seatPosition(front, kind, seat) {
  const [ox, oz] = SEATS[kind]?.[seat] || SEATS[2][0];
  const s = Math.sin(front.rotation.y), c = Math.cos(front.rotation.y);
  return [front.position.x + ox * c + oz * s, front.position.z - ox * s + oz * c];
}

export class BikeStations {
  constructor(scene, stations, center, roadGraph, findFree) {
    this.items = [];
    for (const st of stations) {
      const [ax, az] = latLonToLocal(center, st.anchor.lat, st.anchor.lon);
      const n = roadGraph.nodes[roadGraph.nearest(ax, az)] || [ax, az];
      const [x, z] = findFree(n[0], n[1]);
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = Math.atan2(ax - x, az - z) || 0;
      scene.add(group);
      // Rack with three parked bikes and a sign post.
      const rack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.5), mat('#9aa3ad'));
      rack.position.y = 0.04;
      group.add(rack);
      for (let i = -1; i <= 1; i++) {
        const b = makeBike();
        b.rotation.y = Math.PI / 2;
        b.position.set(i * 0.8, 0, 0);
        b.scale.setScalar(0.9);
        group.add(b);
      }
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.1), mat(DARK));
      post.position.set(1.6, 1.1, 0);
      group.add(post);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.08), new THREE.MeshBasicMaterial({ map: signTexture() }));
      sign.position.set(1.6, 2.3, 0);
      group.add(sign);
      this.items.push({ station: st, group, x, z });
    }
  }

  nearby(x, z) {
    return this.items.find((it) => Math.hypot(it.x - x, it.z - z) < 2.6) || null;
  }
}

let tex = null;
function signTexture() {
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = FRAME;
  g.fillRect(0, 0, 128, 128);
  g.font = '64px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('🚲', 64, 58);
  g.fillStyle = '#fff';
  g.font = '800 22px system-ui, sans-serif';
  g.fillText('자전거', 64, 108);
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
