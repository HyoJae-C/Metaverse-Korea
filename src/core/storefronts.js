// Storefronts on the street: sign, awning, door and an entrance marker,
// attached to the building facade nearest each store's anchor point.
import * as THREE from 'three';
import { placeOf } from './districts.js';
import { localName } from './i18n.js';
import { SIGN_SHAPES, signShape, signGeometry, signTexture } from './sign-shapes.js';

const SIGN_W = 6.4;

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
    // A raised building (a station deck over the street) has no shop floor.
    if (b.m) continue;
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
      if (d <= 40) cands.push({ d, px, pz, dx: dx / len, dz: dz / len, poly: p });
    }
  }
  cands.sort((a, b) => a.d - b.d);
  for (const c of cands) {
    // Prefer the normal pointing towards the anchor (the street side).
    let nx = -c.dz, nz = c.dx;
    if ((x - c.px) * nx + (z - c.pz) * nz < 0) { nx = -nx; nz = -nz; }
    for (const s of [1, -1]) {
      const fx = c.px + nx * s * 3, fz = c.pz + nz * s * 3;
      // Never face into the building itself (some buildings, e.g. ones with
      // a raised ground floor, are not in the collision map).
      if (pointInPoly(c.px + nx * s * 0.5, c.pz + nz * s * 0.5, c.poly)) continue;
      if (!isBlocked || (!isBlocked(fx, fz) && !isBlocked(c.px + nx * s * 1.7, c.pz + nz * s * 1.7))) {
        return { x: c.px, z: c.pz, nx: nx * s, nz: nz * s };
      }
    }
  }
  return null;
}

function pointInPoly(x, z, p) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// Floating label above a shop: an icon and the name, always facing the
// camera so the shop is easy to spot from any angle or distance.
const ICONS = { club: '🎧', bar: '🍸', cafe: '☕', fashion: '👕', beauty: '💄', lifestyle: '🕯️', popup: '✨', workshop: '🧢', home: '🏠', restaurant: '🍢', library: '📚', school: '🏫', play: '🎮', info: 'ℹ️' };
function badgeTexture(icon, text, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  const font = (s) => `800 ${s}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
  let size = 52;
  g.font = font(size);
  while (g.measureText(text).width > 360 && size > 24) g.font = font((size -= 4));
  const w = Math.min(500, g.measureText(text).width + 130);
  const x0 = (512 - w) / 2;
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath(); g.roundRect(x0 + 4, 14, w - 4, 104, 52); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.roundRect(x0, 8, w - 4, 104, 52); g.fill();
  g.fillStyle = bg;
  g.beginPath(); g.arc(x0 + 54, 60, 40, 0, Math.PI * 2); g.fill();
  g.font = '44px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(icon, x0 + 54, 62);
  g.font = font(size);
  g.textAlign = 'left';
  g.fillStyle = '#4a3f35';
  g.fillText(text, x0 + 104, 62);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
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
      const [ax, az] = placeOf(store, center, latLonToLocal);
      const f = nearestFacade(map.buildings, ax, az, isBlocked);
      if (!f) {
        console.warn('No facade found for', store.id);
        continue;
      }
      const group = new THREE.Group();
      group.position.set(f.x, 0, f.z);
      group.rotation.y = Math.atan2(f.nx, f.nz); // +z faces the street
      scene.add(group);

      const home = store.category === 'home';
      const shape = signShape(store);
      const dim = SIGN_SHAPES[shape];
      const signMat = new THREE.MeshBasicMaterial({ map: signTexture(store.signLocal || store.name.ko, store.colors.sign, '#ffffff', store.signLocal ? store.name.ko : '', shape) });
      const sign = new THREE.Mesh(signGeometry(shape), [signMat, mat(store.colors.sign)]);
      if (dim.blade) { // sticks out from the wall beside the door, seen from along the street
        sign.position.set(2.95, 3.4 + dim.h / 2, 0.8);
        sign.rotation.y = Math.PI / 2;
      } else sign.position.set(0, 3.3 + dim.h / 2, 0.2);
      group.add(sign);
      if (home) { // a smaller nameplate over a residential entrance
        sign.scale.set(0.6, 0.6, 1);
        sign.position.y = 3.2;
      }
      const signTop = home ? 0 : sign.position.y + dim.h / 2;

      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(5.4, 0.08, 1.6),
        new THREE.MeshLambertMaterial({ map: awningTexture(store.colors.awning) }),
      );
      awning.position.set(0, 3.0, 0.8);
      awning.rotation.x = 0.28;
      if (home) { awning.scale.set(0.5, 1, 0.8); awning.position.y = 2.7; }
      group.add(awning);

      // Shop front: glass panes either side of a door.
      const frame = mat('#fffaf0');
      const glass = new THREE.MeshLambertMaterial({ color: 0xbfe0ee, transparent: true, opacity: 0.85 });
      const front = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, 0.12), frame);
      front.position.set(0, 1.3, 0.06);
      group.add(front);
      if (home) front.scale.set(0.5, 1.05, 1);
      if (!home) for (const sx of [-1.75, 1.75]) {
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
      // Floating badge above the entrance (sprites always face the camera).
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture(store.icon || ICONS[store.category] || '🛍️', store.name.ko, store.colors.sign), depthWrite: false, depthTest: false, transparent: true }));
      badge.scale.set(6, 1.5, 1);
      badge.position.set(0, home ? 5.2 : Math.max(6.4, signTop + 1), 2.0);
      badge.renderOrder = 3;
      group.add(badge);

      this.items.push({ store, group, sign, signMat, shape, ring, badge, door: door3 });
    }
  }

  setTranslated(on, lang) {
    this.translated = on;
    for (const it of this.items) {
      const text = on ? localName(it.store.name, lang) : it.store.name.ko;
      const local = it.store.signLocal;
      it.signMat.map.dispose();
      it.signMat.map = on || !local ? signTexture(text, it.store.colors.sign, '#ffffff', '', it.shape) : signTexture(local, it.store.colors.sign, '#ffffff', it.store.name.ko, it.shape);
      it.signMat.needsUpdate = true;
      it.badge.material.map.dispose();
      it.badge.material.map = badgeTexture(it.store.icon || ICONS[it.store.category] || '🛍️', text, it.store.colors.sign);
    }
  }

  // Returns the store whose entrance the player is standing at, if any.
  nearby(x, z, t) {
    let hit = null;
    for (const it of this.items) {
      const s = 1 + Math.sin(t * 3) * 0.08;
      it.ring.scale.set(s, 1, s);
      // Badges show through walls, so fade them out with distance.
      const d = Math.hypot(it.door.x - x, it.door.z - z);
      it.badge.visible = d < 140;
      it.badge.material.opacity = d < 90 ? 1 : 1 - (d - 90) / 50;
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
