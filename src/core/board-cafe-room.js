// The board game café's room (stores.json workshop 'boardcafe'): a tall
// shelf of game boxes along the back wall, a counter by the door, and four
// tables with a game laid out on each (a go-style board with stones, a bell
// with fruit cards, a croc, a barrel). People already sit and play at two of
// them, so the room is never empty.
//
// stations.boardgames: where you stand to open the board games panel
// (game/board-games.js); one by each free chair. Comes with the room builder
// (core/interior.js), not in the first download. One mesh a colour.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SEAT_H = 0.42; // (same chair height as core/interior.js)
const TABLE_H = 0.72;
const BOX_COLORS = ['#e8574a', '#f2b43c', '#4f9a5c', '#3f7fd0', '#8b5cc7', '#f08aa8', '#2fa7a0', '#f2e3c4'];

export const BOARD_CAFE_TABLES = [[-3.6, -0.8], [2.4, -0.8], [-3.6, 2.4], [2.4, 2.4]]; // (an aisle up the middle from the door) // room metres

export function decorateBoardCafe(store, { scene, block, stations, seats, w, d }) {
  const parts = new Map();
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler(), v4 = new THREE.Vector3(), s4 = new THREE.Vector3();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 14);
  const ball = new THREE.SphereGeometry(1, 10, 6);
  const put = (color, geo, x, y, z, sx, sy, sz, ry = 0) => {
    m4.compose(v4.set(x, y, z), q4.setFromEuler(e4.set(0, ry, 0)), s4.set(sx, sy, sz));
    const g = geo.clone().applyMatrix4(m4);
    const o = g.index ? g.toNonIndexed() : g; // (merged per colour below)
    for (const k of Object.keys(o.attributes)) if (k !== 'position' && k !== 'normal') o.deleteAttribute(k);
    if (!parts.has(color)) parts.set(color, []);
    parts.get(color).push(o);
  };
  const back = -d / 2;

  // The game shelf: five shelves of coloured boxes along the back wall.
  const shelfW = Math.min(w - 2, 10);
  put('#7a5232', cube, 0, 1.3, back + 0.25, shelfW, 2.6, 0.04); // its back board
  for (let r = 0; r < 5; r++) {
    const y = 0.15 + r * 0.5;
    put('#9a6a42', cube, 0, y, back + 0.27, shelfW, 0.04, 0.42);
    let x = -shelfW / 2 + 0.1;
    let k = r * 3;
    while (x < shelfW / 2 - 0.4) {
      const bw = 0.26 + ((k * 7) % 5) * 0.04, bh = 0.2 + ((k * 3) % 4) * 0.05; // (game boxes: wide and squat, not books)
      put(BOX_COLORS[k % BOX_COLORS.length], cube, x + bw / 2, y + 0.02 + bh / 2, back + 0.3, bw, bh, 0.32);
      x += bw + 0.02;
      k++;
    }
  }
  block(0, back + 0.27, shelfW, 0.5);

  // The counter by the door, right side.
  const cx = w / 2 - 1.4, cz = d / 2 - 2.6;
  put('#5a3a28', cube, cx, 0.5, cz, 1.8, 1, 0.6);
  put('#f2e3c4', cube, cx, 1.02, cz, 1.9, 0.04, 0.7);
  for (let i = 0; i < 4; i++) put(BOX_COLORS[i], cube, cx - 0.6 + i * 0.3, 1.16, cz, 0.24, 0.24, 0.3);
  block(cx, cz, 1.9, 0.7);

  // Four tables, four chairs each; a game on every table.
  stations.boardgames = [];
  const patrons = (stations.patrons ||= []);
  BOARD_CAFE_TABLES.forEach(([tx, tz], t) => {
    put('#c89a62', cube, tx, TABLE_H, tz, 1.3, 0.05, 1.0);
    put('#5a3a28', cube, tx, TABLE_H / 2, tz, 0.12, TABLE_H, 0.12);
    block(tx, tz, 1.4, 1.1);
    // The game on it.
    if (t === 0) { // go-style board with stones
      put('#e8c27a', cube, tx, TABLE_H + 0.05, tz, 0.5, 0.06, 0.5);
      for (let i = 0; i < 9; i++) put(i % 2 ? '#fbfaf6' : '#1d1b22', ball, tx - 0.16 + (i % 3) * 0.12, TABLE_H + 0.09, tz - 0.12 + Math.floor(i / 3) * 0.12, 0.025, 0.012, 0.025);
    } else if (t === 1) { // the bell and fruit cards
      put('#f2c230', ball, tx, TABLE_H + 0.06, tz, 0.08, 0.06, 0.08);
      put('#c99412', cyl, tx, TABLE_H + 0.03, tz, 0.09, 0.02, 0.09);
      for (let i = 0; i < 4; i++) put('#ffffff', cube, tx + Math.cos(i * 1.57) * 0.3, TABLE_H + 0.03, tz + Math.sin(i * 1.57) * 0.25, 0.12, 0.01, 0.16, i * 1.57);
    } else if (t === 2) { // the croc: a green body, a pale jaw
      // (boxed up at a corner: the middle is where a game people play is set out, game/board-table.js)
      put('#4f9a5c', cube, tx + 0.42, TABLE_H + 0.07, tz - 0.36, 0.2, 0.07, 0.14);
      put('#fffdf4', cube, tx + 0.42, TABLE_H + 0.105, tz - 0.36, 0.2, 0.02, 0.14);
    } else { // the barrel with swords
      put('#8a5a33', cube, tx + 0.42, TABLE_H + 0.07, tz - 0.36, 0.2, 0.07, 0.14);
      put('#f2e3c4', cube, tx + 0.42, TABLE_H + 0.105, tz - 0.36, 0.2, 0.02, 0.14);
    }
    for (const [sx, sz, ry] of [[-0.95, 0, Math.PI / 2], [0.95, 0, -Math.PI / 2], [0, -0.8, 0], [0, 0.8, Math.PI]]) {
      const x = tx + sx, z = tz + sz;
      put(store.colors.sign, cube, x, SEAT_H - 0.03, z, 0.42, 0.06, 0.42);
      put('#5a3a28', cube, x, SEAT_H / 2 - 0.03, z, 0.06, SEAT_H, 0.06);
      const seat = { x, z, ry, stand: [x + Math.sin(ry) * -0.6, z + Math.cos(ry) * -0.6] };
      seats.push(seat);
      // People already playing at the first two tables.
      if (t < 2 && (sx !== 0 || (t === 0 && sz > 0))) patrons.push({ x, z, ry, sit: true });
      else stations.boardgames.push({ x: seat.stand[0], z: seat.stand[1], ry });
    }
  });

  for (const [color, list] of parts) {
    const mesh = new THREE.Mesh(mergeGeometries(list), new THREE.MeshLambertMaterial({ color }));
    scene.add(mesh);
  }
}
