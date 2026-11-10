// Darts stuck in the bar's wall dartboards (core/interior.js "dartboards"),
// seen by everyone in the room: each thrower's last 3 darts stay in the
// board they threw at (as in real darts, you pull yours out before your
// next three), in the thrower's own flight colour (DART_COLORS in
// core/arcade.js). Old darts are taken out after a while.
import * as THREE from 'three';
import { DART_COLORS } from './arcade.js';

const KEEP = 3; // darts per thrower on a board
const STAY = 120; // s a dart stays in the board after its thrower's last throw

const barrelGeo = new THREE.CylinderGeometry(0.011, 0.007, 0.15, 8);
const tipGeo = new THREE.ConeGeometry(0.006, 0.04, 6);
const flightGeo = new THREE.PlaneGeometry(0.09, 0.06);
const barrelMat = new THREE.MeshLambertMaterial({ color: '#c9ced3' });
const flightMats = new Map();
const flightMat = (c) => {
  if (!flightMats.has(c)) flightMats.set(c, new THREE.MeshLambertMaterial({ color: DART_COLORS[c] || DART_COLORS[0], side: THREE.DoubleSide, emissive: DART_COLORS[c] || DART_COLORS[0], emissiveIntensity: 0.25 }));
  return flightMats.get(c);
};

// One dart (drawn a little larger than life so it reads across the bar),
// built along +x: the tip at the origin (in the board), the
// flights out toward the thrower.
export function dartMesh(color) {
  const g = new THREE.Group();
  const tip = new THREE.Mesh(tipGeo, barrelMat);
  tip.rotation.z = Math.PI / 2; // points -x, into the board
  tip.position.x = 0.018;
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = 0.11;
  g.add(tip, barrel);
  for (const r of [0, Math.PI / 2]) {
    const f = new THREE.Mesh(flightGeo, flightMat(color));
    f.rotation.x = r;
    f.position.x = 0.21;
    g.add(f);
  }
  return g;
}

export class DartPins {
  // boards: [{ x, y, z, ry, r }] the faces (ry turns a +z-facing circle to
  // face the room; r is the scoring radius in metres).
  constructor(scene, boards = []) {
    this.scene = scene;
    this.boards = boards;
    this.byWho = new Map(); // thrower id → { board, color, pins: [mesh], at }
  }
  // A dart from `who` at board position (x, y) (core/arcade.js: y points
  // down, r = 1 is the board's edge).
  add(who, board, color, x, y, now = performance.now() / 1000) {
    const b = this.boards[board];
    if (!b) return null;
    let e = this.byWho.get(who);
    if (e && e.board !== board) { this.clear(who); e = null; }
    if (!e) this.byWho.set(who, (e = { board, color, pins: [], at: now }));
    e.color = color; e.at = now;
    // Face axes: out of the wall, and the thrower's right.
    const nx = Math.sin(b.ry), nz = Math.cos(b.ry);
    const rx = Math.cos(b.ry), rz = -Math.sin(b.ry);
    const m = dartMesh(color);
    m.position.set(b.x + rx * x * b.r + nx * 0.004, b.y - y * b.r, b.z + rz * x * b.r + nz * 0.004);
    // Along the wall's normal, the tail a little up and to one side, as a
    // dart lands.
    m.rotation.set(0, b.ry - Math.PI / 2, 0.12 + ((x * 7919) % 1) * 0.04);
    this.scene.add(m);
    e.pins.push(m);
    while (e.pins.length > KEEP) this.scene.remove(e.pins.shift());
    return m;
  }
  clear(who) {
    const e = this.byWho.get(who);
    if (!e) return;
    for (const m of e.pins) this.scene.remove(m);
    this.byWho.delete(who);
  }
  clearAll() { for (const who of [...this.byWho.keys()]) this.clear(who); }
  // Colours of darts in the boards now, not counting `except`'s.
  colorsInUse(except) {
    const out = [];
    for (const [who, e] of this.byWho) if (who !== except) out.push(e.color);
    return out;
  }
  colorOf(who) { return this.byWho.get(who)?.color ?? null; }
  count(who) { return this.byWho.get(who)?.pins.length || 0; }
  update(now = performance.now() / 1000) {
    for (const [who, e] of this.byWho) if (now - e.at > STAY) this.clear(who);
  }
}
