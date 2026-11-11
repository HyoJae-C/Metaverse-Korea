// Stamp stands for the stamp tour: a small wooden podium with an ink pad and
// a rubber stamp on top, and a board showing that place's stamp. A stand at
// a shop goes beside its door (far enough that "enter" doesn't take over).
import * as THREE from 'three';
import { STAMP_NEAR } from './stamp-book.js';
import { stampSvg } from '../ui/stamp-art.js';
import { droneShowAt } from './drone-show.js';

// Stands that are only up at certain times (stamps.js onlyDuring).
export const STAND_TIMES = { droneShow: (now = Date.now()) => !!droneShowAt(now)?.on };
const standUp = (it) => !it.stamp.onlyDuring || !!STAND_TIMES[it.stamp.onlyDuring]?.();

const SIDE = 3.8; // metres along the shop front from the door

// Is the stand at (x, z), facing ry, clear: the stand itself and the spot
// in front where you use it (blocked(x, z, r): a wall there).
export function standClear(x, z, ry, blocked) {
  return !blocked(x, z, 0.5) && !blocked(x + Math.sin(ry) * 0.9, z + Math.cos(ry) * 0.9, 0.4);
}

// Where each stamp's stand goes: [{ stamp, x, z, ry }].
// A stand by a shop goes on its side of the door (place.side, default the
// right); if a wall is there (a building moved, or the front has steps and
// wings like the War History Museum), the other side, then a little out
// from the front (onto the forecourt), then further along it.
export function standSpots(stamps, getFront, blocked = null) {
  const out = [];
  for (const s of stamps) {
    if (s.place?.room) continue; // inside a room: see roomSpots
    if (s.place?.ride) continue; // pressed aboard a ride (Seoul Dal), no stand
    if (s.place?.store) {
      const f = getFront(s.place.store);
      if (!f) continue;
      const ry = f.group.rotation.y, ax = Math.cos(ry), az = -Math.sin(ry); // along the front
      const fx = Math.sin(ry), fz = Math.cos(ry); // out from the front
      const side = s.place.side ?? 1;
      const tries = [[SIDE * side, 0], [-SIDE * side, 0], [SIDE * side, 1.5], [-SIDE * side, 1.5], [SIDE * side, 3], [-SIDE * side, 3], [(SIDE + 1.5) * side, 0], [-(SIDE + 1.5) * side, 0]];
      const at = ([a, o]) => ({ stamp: s, x: f.door.x + ax * a + fx * o, z: f.door.z + az * a + fz * o, ry });
      out.push((blocked && tries.map(at).find((p) => standClear(p.x, p.z, ry, blocked))) || at(tries[0]));
    } else if (Array.isArray(s.place?.at)) out.push({ stamp: s, x: s.place.at[0], z: s.place.at[1], ry: s.place.ry || 0, y: s.place.y || 0 });
  }
  return out;
}

// Stands inside a shop's room (place.room): [{ stamp, x, z, ry }].
export function roomSpots(stamps, storeId) {
  return stamps.filter((s) => s.place?.room && s.place.store === storeId && Array.isArray(s.place.at))
    .map((s) => ({ stamp: s, x: s.place.at[0], z: s.place.at[1], ry: s.place.ry || 0 }));
}

const wood = new THREE.MeshLambertMaterial({ color: '#8a5a34' });
const dark = new THREE.MeshLambertMaterial({ color: '#4a3020' });
const paper = new THREE.MeshLambertMaterial({ color: '#f4efe4' });

function boardTexture(stamp) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f4efe4'; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => { g.drawImage(img, 14, 14, 228, 228); tex.needsUpdate = true; };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stampSvg(stamp, 0, { ink: false }));
  return tex;
}

function makeStand(stamp) {
  const g = new THREE.Group();
  const ink = new THREE.MeshLambertMaterial({ color: stamp.color });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 0.55), wood);
  box.position.y = 0.475; box.castShadow = true; g.add(box);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.65), dark);
  top.position.y = 0.98; g.add(top);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.2), ink);
  pad.position.set(-0.18, 1.03, 0.08); g.add(pad);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), ink);
  base.position.set(0.2, 1.04, 0.08); g.add(base);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.14, 12), wood);
  knob.position.set(0.2, 1.13, 0.08); g.add(knob);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), wood);
  ball.position.set(0.2, 1.22, 0.08); g.add(ball);
  // the board behind: the stamp you'll get, on a little roof-topped sign
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), dark);
  post.position.set(0, 1.55, -0.24); g.add(post);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.86, 0.05), ink);
  frame.position.set(0, 2.05, -0.2); g.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), new THREE.MeshBasicMaterial({ map: boardTexture(stamp) }));
  face.position.set(0, 2.05, -0.17); g.add(face);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), paper);
  back.position.set(0, 2.05, -0.23); back.rotation.y = Math.PI; g.add(back);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.07, 0.24), dark);
  roof.position.set(0, 2.52, -0.2); g.add(roof);
  return g;
}

function place(scene, s, y) {
  const m = makeStand(s.stamp);
  m.position.set(s.x, y, s.z);
  m.rotation.y = s.ry;
  scene.add(m);
  // you use it from the front
  return { ...s, mesh: m, ux: s.x + Math.sin(s.ry) * 0.9, uz: s.z + Math.cos(s.ry) * 0.9 };
}

export class StampStands {
  constructor(scene, stamps, getFront, blocked = null) {
    this.stamps = stamps;
    this.items = standSpots(stamps, getFront, blocked).map((s) => place(scene, s, s.y || 0));
    this.rooms = new Map(); // store id → stands in its room
    this.showTimed();
  }
  // Put up the stands that belong inside a room (once, when it is built).
  // floorAt(x, z): the room's floor height (the Namsan summit is up a hill).
  addRoom(storeId, scene, floorAt) {
    if (this.rooms.has(storeId)) return;
    this.rooms.set(storeId, roomSpots(this.stamps, storeId).map((s) => place(scene, s, floorAt ? floorAt(s.x, s.z) : 0)));
  }
  // A room let go (game/room-cache.js): its stands are placed again when it is rebuilt.
  dropRoom(storeId) { this.rooms.delete(storeId); }
  // The stand in reach: on the street (storeId null) or in that room.
  nearest(x, z, storeId = null) {
    const items = storeId ? this.rooms.get(storeId) || [] : this.items;
    let best = null, bd = STAMP_NEAR;
    for (const it of items) {
      if (!standUp(it)) continue;
      const d = Math.hypot(x - it.ux, z - it.uz);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }
  // Show or hide the stands that are only up at certain times (each frame
  // in that room is fine: a few checks).
  // On the street (no storeId) what's inside the stand is shown or hidden,
  // so far-off culling can keep the stand itself.
  showTimed(storeId = null) {
    if (storeId) { for (const it of this.rooms.get(storeId) || []) if (it.stamp.onlyDuring) it.mesh.visible = standUp(it); return; }
    for (const it of this.items) {
      if (!it.stamp.onlyDuring) continue;
      const up = standUp(it);
      if (up === it.up) continue;
      it.up = up;
      for (const c of it.mesh.children) c.visible = up;
    }
  }
  // A little press-down bounce on the stand's rubber stamp.
  press(it) {
    if (!it.mesh) return; // (a ride's stamp: no stand)
    const kids = it.mesh.children.slice(4, 7);
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 450);
      const dy = -Math.sin(k * Math.PI) * 0.06;
      kids[0].position.y = 1.04 + dy; kids[1].position.y = 1.13 + dy; kids[2].position.y = 1.22 + dy;
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }
}
