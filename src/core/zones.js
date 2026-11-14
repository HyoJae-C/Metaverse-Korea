// Meeting zones: big signposts with a code players can agree to meet at
// ("see you at A-2!"), visible above the rooftops. A code is the gu's letter
// and a number (zones.json "codes").
import * as THREE from 'three';
import { placeOf } from './districts.js';
import { localName } from './i18n.js';
import { latLonToLocal } from './storefronts.js';

function letterTexture(letter, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 14;
  g.strokeStyle = '#fffaf0';
  g.stroke();
  g.fillStyle = '#fffaf0';
  // "A-1" is wider than one letter: shrink it to fit inside the ring.
  let size = 150;
  const font = (px) => `900 ${px}px system-ui, sans-serif`;
  g.font = font(size);
  while (g.measureText(letter).width > 190 && size > 60) g.font = font((size -= 6));
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(letter, 128, 128 + size * 0.08);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function boardTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 112;
  const g = c.getContext('2d');
  g.fillStyle = '#fffaf0';
  g.beginPath();
  g.roundRect(4, 4, 504, 104, 26);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = color;
  g.stroke();
  g.fillStyle = '#4a3f35';
  let size = 54;
  const font = (s) => `800 ${s}px "Apple SD Gothic Neo", "Noto Sans KR", "Hiragino Sans", "PingFang SC", system-ui, sans-serif`;
  g.font = font(size);
  while (g.measureText(text).width > 460 && size > 24) g.font = font((size -= 3));
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 60);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Snap a point to the side of the nearest road so the post stands on the pavement.
function snapToRoadside(roads, x, z) {
  let best = null;
  for (const r of roads) {
    if (r.k === 'walk') continue;
    for (let i = 0; i < r.p.length - 1; i++) {
      const [x1, z1] = r.p[i], [x2, z2] = r.p[i + 1];
      const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / l2));
      const px = x1 + dx * t, pz = z1 + dz * t;
      const d = Math.hypot(px - x, pz - z);
      if (!best || d < best.d) best = { d, px, pz, r, dx, dz };
    }
  }
  if (!best) return [x, z];
  const len = Math.hypot(best.dx, best.dz) || 1;
  let nx = -best.dz / len, nz = best.dx / len;
  if ((x - best.px) * nx + (z - best.pz) * nz < 0) { nx = -nx; nz = -nz; }
  const off = best.r.w / 2 + 1.5;
  return [best.px + nx * off, best.pz + nz * off];
}

export class Zones {
  constructor(scene, zones, map, center, collision) {
    this.items = [];
    for (const zone of zones) {
      const [ax, az] = placeOf(zone, center, latLonToLocal);
      // A zone marked "snap": false stands exactly where it says (a square);
      // the others move to the nearest roadside.
      let [x, z] = zone.snap === false ? [ax, az] : snapToRoadside(map.roads, ax, az);
      if (collision?.blocked(x, z, 0.5)) [x, z] = [ax, az];
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      scene.add(group);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 5.5, 10),
        new THREE.MeshLambertMaterial({ color: 0xfffaf0 }),
      );
      pole.position.y = 2.75;
      group.add(pole);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.7, 0.3, 16),
        new THREE.MeshLambertMaterial({ color: zone.color }),
      );
      base.position.y = 0.15;
      group.add(base);

      // Board with the zone name; billboarded each frame.
      const boardMat = new THREE.MeshBasicMaterial({ map: boardTexture(zone.name.ko, zone.color), transparent: true });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.75), boardMat);
      board.position.y = 4.4;
      group.add(board);

      // Big floating letter, high enough to see over low buildings.
      const letter = new THREE.Sprite(new THREE.SpriteMaterial({
        map: letterTexture(zone.id, zone.color), depthTest: true,
      }));
      letter.scale.set(2.6, 2.6, 1);
      letter.position.y = 7;
      group.add(letter);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6),
        new THREE.MeshBasicMaterial({ color: zone.color }),
      );
      beam.position.y = 6;
      group.add(beam);

      this.items.push({ zone, group, board, boardMat, letter, x, z });
    }
  }

  setTranslated(on, lang) {
    for (const it of this.items) {
      it.boardMat.map.dispose();
      it.boardMat.map = boardTexture(on ? localName(it.zone.name, lang) : it.zone.name.ko, it.zone.color);
      it.boardMat.needsUpdate = true;
    }
  }

  // Face boards to the camera, bob letters, return the zone the player is in.
  update(camera, px, pz, t) {
    let inside = null, bestD = Infinity;
    for (const it of this.items) {
      // The board hangs at the pole's middle, so the pole cut through its
      // name. Slide the board and the letter a little toward the camera so
      // both always sit in front of the pole and the beam.
      let dx = camera.position.x - it.x, dz = camera.position.z - it.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      it.board.position.set(dx * FRONT, 4.4, dz * FRONT);
      it.board.lookAt(camera.position.x, it.board.getWorldPosition(_v).y, camera.position.z);
      it.letter.position.set(dx * FRONT, 7 + Math.sin(t * 1.5 + it.x) * 0.15, dz * FRONT);
      const d = Math.hypot(it.x - px, it.z - pz);
      if (d < it.zone.radius && d < bestD) { bestD = d; inside = it.zone; }
    }
    return inside;
  }
}

const _v = new THREE.Vector3();
const FRONT = 0.3; // m in front of the pole (its radius is 0.15)
