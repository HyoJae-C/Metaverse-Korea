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
