// Storefronts on the street: sign, awning, door and an entrance marker,
// attached to the building facade nearest each store's anchor point.
import * as THREE from 'three';
import { localName } from './i18n.js';

const SIGN_W = 6.4, SIGN_H = 1.2;

export function latLonToLocal(center, lat, lon) {
  const R = 6378137;
  const mLat = (Math.PI / 180) * R;
  const mLon = mLat * Math.cos((center.lat * Math.PI) / 180);
  return [(lon - center.lon) * mLon, -(lat - center.lat) * mLat];
}

// Nearest building edge (≥ 5 m long) to (x, z) that faces open ground:
// facade point and outward normal. `isBlocked(x, z)` tells whether a point
// is inside a building; it rules out walls that face a neighbouring building
// (the door would be unreachable).
function nearestFacade(buildings, x, z, isBlocked) {
  const cands = [];
  for (const b of buildings) {
    const p = b.p;
    for (let i = 0; i < p.length; i++) {
      const [x1, z1] = p[i];
      const [x2, z2] = p[(i + 1) % p.length];
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 5) continue;
      // Keep the sign inside the edge.
      const margin = Math.min(len / 2, SIGN_W / 2 + 0.4);
      let t = ((x - x1) * dx + (z - z1) * dz) / (len * len);
      t = Math.max(margin / len, Math.min(1 - margin / len, t));
      const px = x1 + dx * t, pz = z1 + dz * t;
      const d = Math.hypot(px - x, pz - z);
      if (d <= 40) cands.push({ d, px, pz, dx: dx / len, dz: dz / len });
    }
  }
  cands.sort((a, b) => a.d - b.d);
  for (const c of cands) {
    // Prefer the normal pointing towards the anchor (the street side).
    let nx = -c.dz, nz = c.dx;
    if ((x - c.px) * nx + (z - c.pz) * nz < 0) { nx = -nx; nz = -nz; }
    for (const s of [1, -1]) {
      const fx = c.px + nx * s * 3, fz = c.pz + nz * s * 3;
      if (!isBlocked || (!isBlocked(fx, fz) && !isBlocked(c.px + nx * s * 1.7, c.pz + nz * s * 1.7))) {
        return { x: c.px, z: c.pz, nx: nx * s, nz: nz * s };
      }
    }
  }
  return null;
}

function signTexture(text, bg, fg = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 120;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  const r = 28;
  g.beginPath();
  g.roundRect(4, 4, c.width - 8, c.height - 8, r);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.65)';
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(14, 14, c.width - 28, c.height - 28, r - 10);
  g.stroke();
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 64;
  const font = (s) => `800 ${s}px "Apple SD Gothic Neo", "Noto Sans KR", "Hiragino Sans", "PingFang SC", system-ui, sans-serif`;
  g.font = font(size);
  while (g.measureText(text).width > c.width - 70 && size > 26) g.font = font((size -= 4));
  g.fillText(text, c.width / 2, c.height / 2 + 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function awningTexture(color) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 16;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#fffaf0' : color;
    g.fillRect(i * 16, 0, 16, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Storefronts {
  constructor(scene, stores, map, center, collision = null) {
    this.items = [];
    this.translated = false;
    const isBlocked = collision ? (x, z) => collision.blocked(x, z, 0.6) : null;
    for (const store of stores) {
      const [ax, az] = latLonToLocal(center, store.anchor.lat, store.anchor.lon);
      const f = nearestFacade(map.buildings, ax, az, isBlocked);
      if (!f) {
        console.warn('No facade found for', store.id);
        continue;
      }
      const group = new THREE.Group();
      group.position.set(f.x, 0, f.z);
      group.rotation.y = Math.atan2(f.nx, f.nz); // +z faces the street
      scene.add(group);

      const signMat = new THREE.MeshBasicMaterial({ map: signTexture(store.name.ko, store.colors.sign) });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(SIGN_W, SIGN_H, 0.25), [
        mat(store.colors.sign), mat(store.colors.sign), mat(store.colors.sign),
        mat(store.colors.sign), signMat, mat(store.colors.sign),
      ]);
      sign.position.set(0, 3.9, 0.2);
      group.add(sign);

      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(5.4, 0.08, 1.6),
        new THREE.MeshLambertMaterial({ map: awningTexture(store.colors.awning) }),
      );
      awning.position.set(0, 3.0, 0.8);
      awning.rotation.x = 0.28;
      group.add(awning);

      // Shop front: glass panes either side of a door.
      const frame = mat('#fffaf0');
      const glass = new THREE.MeshLambertMaterial({ color: 0xbfe0ee, transparent: true, opacity: 0.85 });
      const front = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 0.12), frame);
      front.position.set(0, 1.3, 0.06);
      group.add(front);
      for (const sx of [-1.75, 1.75]) {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 0.05), glass);
        pane.position.set(sx, 1.35, 0.14);
        group.add(pane);
      }
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.3, 0.06), mat(store.colors.sign));
      door.position.set(0, 1.15, 0.15);
      group.add(door);
      const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.04), glass);
      doorGlass.position.set(0, 1.35, 0.2);
      group.add(doorGlass);

      // Entrance marker: a soft glowing ring on the pavement.
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.75, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }),
      );
      ring.position.set(0, 0.09, 1.7);
      group.add(ring);

      const door3 = new THREE.Vector3(0, 0, 1.7).applyMatrix4(group.matrixWorld.compose(
        group.position, group.quaternion, group.scale,
      ));
      this.items.push({ store, group, sign, signMat, ring, door: door3 });
    }
  }

  setTranslated(on, lang) {
    this.translated = on;
    for (const it of this.items) {
      const text = on ? localName(it.store.name, lang) : it.store.name.ko;
      it.signMat.map.dispose();
      it.signMat.map = signTexture(text, it.store.colors.sign);
      it.signMat.needsUpdate = true;
    }
  }

  // Returns the store whose entrance the player is standing at, if any.
  nearby(x, z, t) {
    let hit = null;
    for (const it of this.items) {
      const s = 1 + Math.sin(t * 3) * 0.08;
      it.ring.scale.set(s, 1, s);
      if (Math.hypot(it.door.x - x, it.door.z - z) < 2.2) hit = it;
    }
    return hit;
  }

  get(id) {
    return this.items.find((i) => i.store.id === id);
  }
}

const mats = {};
function mat(color) {
  return (mats[color] ||= new THREE.MeshLambertMaterial({ color }));
}
