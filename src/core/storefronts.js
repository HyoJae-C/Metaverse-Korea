// Storefronts on the street: sign, awning, door and an entrance marker,
// attached to the building facade nearest each store's anchor point.
import * as THREE from 'three';
import { placeOf } from './districts.js';
import { pointInPoly } from './collision.js';
import { localName } from './i18n.js';
import { SIGN_SHAPES, signShape, signGeometry, signTexture } from './sign-shapes.js';
import { hanokSignStyle, hanokSignTexture, addHanokSign } from './hanok-signs.js';
import { storeIcon } from './store-icons.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
      if (d <= 40) cands.push({ d, px, pz, dx: dx / len, dz: dz / len, poly: p, y: b.y || 0 });
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
        return { x: c.px, z: c.pz, y: c.y, nx: nx * s, nz: nz * s }; // y: the floor, up a hill
      }
    }
  }
  return null;
}


// Floating label above a shop: an icon and the name, always facing the
// camera so the shop is easy to spot from any angle or distance.
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

export const SIGN_NEAR = 170, SIGN_FAR = 200; // m
const RING_FAR = 60; // m

export class Storefronts {
  constructor(scene, stores, map, center, collision = null) {
    this.items = [];
    this.translated = false;
    const isBlocked = collision ? (x, z) => collision.blocked(x, z, 0.6) : null;
    for (const store of stores) {
      const [ax, az] = placeOf(store, center, latLonToLocal);
      // An open-air place (a Han River park laid out on the bank, store.open):
      // no shop front and no door to walk up to; you walk straight in. The
      // item stays for the map, a taxi or a guide: "at" is where they drop you.
      // (store.hanpark: one laid straight on the street, game/han-parks.js:
      // the same, but never a room.)
      // (store.below: a room under an open park, e.g. Another Land's rides
      // under its island, reached by its stairs: no front either.)
      // (store.carts: night food carts on the street, game/night-carts.js.)
      if (store.open || store.hanpark || store.below || store.carts) {
        const group = new THREE.Group();
        group.position.set(ax, 0, az);
        group.rotation.y = store.face ?? (store.open?.ry || 0) + Math.PI; // (facing away from the river, like a door onto the street; store.face: the way you face coming out)
        group.visible = false;
        scene.add(group);
        this.items.push({ store, group, open: !!store.open, outdoor: true, door: new THREE.Vector3(ax, 0, az) });
        continue;
      }
      // A landmark's own door (store.front 'landmark', e.g. Myeongdong
      // Cathedral's: the building is drawn with its door): no sign, awning or
      // glass, only the glowing ring in front of it. "at" is the ring and
      // "face" the way you face coming out.
      if (store.front === 'landmark') {
        const group = new THREE.Group();
        group.position.set(ax, store.y || 0, az); // (y: a door up on a hill, e.g. the cathedral's yard)
        group.rotation.y = store.face || 0;
        scene.add(group);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.55, 0.75, 32).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }),
        );
        ring.position.y = 0.09;
        group.add(ring);
        this.items.push({ store, group, ring, bare: true, door: new THREE.Vector3(ax, store.y || 0, az) });
        continue;
      }
      const f = nearestFacade(map.buildings, ax, az, isBlocked);
      if (!f) {
        console.warn('No facade found for', store.id);
        continue;
      }
      const group = new THREE.Group();
      group.position.set(f.x, f.y, f.z);
      group.rotation.y = Math.atan2(f.nx, f.nz); // +z faces the street
      scene.add(group);

      const home = store.category === 'home';
      // Hanok shops (Bukchon, store.front 'hanok'): the eaves are where a big
      // board would go, so they get a hanok sign under them (core/hanok-signs.js)
      // and no awning (the eaves are the awning).
      const hanok = store.front === 'hanok';
      let sign = null, signMat, shape, signTop, hanokStyle = null;
      if (hanok) {
        hanokStyle = hanokSignStyle(store);
        const made = addHanokSign(group, hanokStyle, null); // (the face is drawn when you come near: showSign)
        signMat = made.faceMat;
        signTop = made.top;
      } else {
        shape = signShape(store);
        const dim = SIGN_SHAPES[shape];
        signMat = new THREE.MeshBasicMaterial(); // (the face is drawn when you come near: showSign)
        sign = new THREE.Mesh(signGeometry(shape), [signMat, mat(store.colors.sign)]);
        if (dim.blade) { // sticks out from the wall beside the door, seen from along the street
          sign.position.set(2.95, 3.4 + dim.h / 2, 0.8);
          sign.rotation.y = Math.PI / 2;
        } else sign.position.set(0, 3.3 + dim.h / 2, 0.2);
        group.add(sign);
        if (home) { // a smaller nameplate over a residential entrance
          sign.scale.set(0.6, 0.6, 1);
          sign.position.y = 3.2;
        }
        signTop = home ? 0 : sign.position.y + dim.h / 2;

        const awning = new THREE.Mesh(
          new THREE.BoxGeometry(5.4, 0.08, 1.6),
          new THREE.MeshLambertMaterial({ map: awningTexture(store.colors.awning) }),
        );
        awning.position.set(0, 3.0, 0.8);
        awning.rotation.x = 0.28;
        if (home) { awning.scale.set(0.5, 1, 0.8); awning.position.y = 2.7; }
        group.add(awning);
      }

      // Shop front: glass panes either side of a door.
      // Hanok shops: a dark wooden frame and paper-lattice panes instead of
      // glass, and a lower door (the plaque goes above it).
      // Frame and door are baked into one mesh (a vertex colour each) and the
      // three panes into another: two draw calls a shop, not five.
      const solid = [], panes = [];
      const part = (list, sx, sy, sz, x, y, z, color, scale) => {
        const g = new THREE.BoxGeometry(sx, sy, sz);
        if (scale) g.scale(...scale);
        g.translate(x, y, z);
        if (color) tint(g, color);
        list.push(g);
      };
      part(solid, 5.2, 2.6, 0.12, 0, 1.3, 0.06, hanok ? '#6b4630' : '#fffaf0', home ? [0.5, 1.05, 1] : null);
      if (!home) for (const sx of [-1.75, 1.75]) part(panes, 1.5, 1.9, 0.05, sx, 1.35, 0.14);
      const doorH = hanok ? 2.1 : 2.3;
      part(solid, 1.4, doorH, 0.06, 0, doorH / 2, 0.15, store.colors.sign);
      part(panes, 0.9, 1.4, 0.04, 0, 1.35, 0.2);
      const front = new THREE.Mesh(mergeGeometries(solid), FRONT_MAT);
      front.name = 'front';
      group.add(front);
      const glass = new THREE.Mesh(mergeGeometries(panes), hanok ? PAPER_MAT : GLASS_MAT);
      glass.name = 'glass';
      group.add(glass);
      for (const g of [...solid, ...panes]) g.dispose();

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
      // Shops have a big sign already, so only homes (a small nameplate)
      // get one, and it hides behind buildings.
      // (Only homes ever show it, so shops don't draw one: 240 of them were
      // 60 MB of canvas memory for nothing.)
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: home ? badgeTexture(storeIcon(store), store.name.ko, store.colors.sign) : null, depthWrite: false, depthTest: true, transparent: true }));
      badge.visible = false;
      badge.userData.home = home;
      badge.scale.set(6, 1.5, 1);
      badge.position.set(0, home ? 5.2 : Math.max(6.4, signTop + 1), 2.0);
      badge.renderOrder = 3;
      group.add(badge);

      signMat.color.set(store.colors.sign); // plain board until its face is drawn
      this.items.push({ store, group, sign, signMat, shape, hanokStyle, ring, badge, door: door3 });
    }
  }

  // Sign faces are canvases (~100-500 KB each, 240 shops): drawn only within
  // SIGN_NEAR of the player and let go past SIGN_FAR. Fog starts at 140 m and
  // a board's letters can't be read that far away, so the street looks the
  // same; the board keeps its shape and colour either way.
  _signText(it) {
    const { store } = it;
    // A hidden bar (stores.json "signAs"): the board says what the front
    // pretends to be (a coin laundry), in any language.
    if (store.signAs) return this.translated ? [localName(store.signAs, this.lang), ''] : [store.signLocal || store.signAs.en, store.signAs.ko];
    if (this.translated || !store.signLocal) return [this.translated ? localName(store.name, this.lang) : store.name.ko, ''];
    return [store.signLocal, store.name.ko];
  }

  showSign(it, on) {
    const m = it.signMat;
    if (on === !!m.map) return;
    if (m.map) {
      m.map.dispose();
      m.map = null;
      m.color.set(it.store.colors.sign);
    } else {
      const [t, sub] = this._signText(it);
      m.map = it.hanokStyle ? hanokSignTexture(it.hanokStyle, t, it.store.colors.sign, sub) : signTexture(t, it.store.colors.sign, '#ffffff', sub, it.shape);
      m.color.set('#ffffff');
    }
    m.needsUpdate = true;
  }

  setTranslated(on, lang) {
    this.translated = on;
    this.lang = lang;
    for (const it of this.items) {
      if (it.outdoor || it.bare) continue;
      if (it.signMat.map) { this.showSign(it, false); this.showSign(it, true); } // (faraway ones are drawn in the new language when you get there)
      if (!it.badge.userData.home) continue;
      it.badge.material.map.dispose();
      it.badge.material.map = badgeTexture(storeIcon(it.store), on ? localName(it.store.name, lang) : it.store.name.ko, it.store.colors.sign);
    }
  }

  // Returns the store whose entrance the player is standing at, if any.
  nearby(x, z, t) {
    let hit = null, drawn = 0;
    for (const it of this.items) {
      if (it.outdoor) continue;
      const s = 1 + Math.sin(t * 3) * 0.08;
      it.ring.scale.set(s, 1, s);
      if (it.bare) { if (Math.hypot(it.door.x - x, it.door.z - z) < 2.2) hit = it; continue; } // (no sign to draw)
      // Badges show through walls, so fade them out with distance.
      const d = Math.hypot(it.door.x - x, it.door.z - z);
      it.ring.visible = d < RING_FAR; // (a faint ring on the pavement: no one sees it from further, but it was a draw call per shop)
      if (it.signMat.map ? d > SIGN_FAR : d < SIGN_NEAR && drawn++ < 6) this.showSign(it, !it.signMat.map); // (a few new faces a frame, so walking never stutters)
      it.badge.visible = it.badge.userData.home && d < 60;
      it.badge.material.opacity = d < 40 ? 1 : 1 - (d - 40) / 20;
      if (Math.hypot(it.door.x - x, it.door.z - z) < 2.2) hit = it;
    }
    return hit;
  }

  get(id) {
    return this.items.find((i) => i.store.id === id);
  }
}

// Shared by every shop front (see "Shop front" above).
const FRONT_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
const GLASS_MAT = new THREE.MeshLambertMaterial({ color: 0xbfe0ee, transparent: true, opacity: 0.85 });
const PAPER_MAT = new THREE.MeshLambertMaterial({ color: 0xf3e6c8 });
const _c = new THREE.Color();
function tint(geo, color) {
  _c.set(color);
  const n = geo.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

const mats = {};
function mat(color) {
  return (mats[color] ||= new THREE.MeshLambertMaterial({ color }));
}
