// Inside Seoul Forest's culture center and the forest galleries: a white
// gallery room with frames on the side and front walls, a poster and an info
// desk at the back, and benches in the middle. What hangs in the frames
// comes from src/data/exhibitions.js; with nothing booked yet, each frame
// shows a soft "coming soon" card.
import * as THREE from 'three';
import { EXHIBITIONS, COMING_SOON } from '../data/exhibitions.js';
import { COUNTER_H } from './counter-face.js';

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const PASTELS = ['#f6e3e8', '#e3eef6', '#e8f3e1', '#f6efdc', '#ece4f6', '#f3e6dc'];

function tex(cw, ch, draw) {
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  draw(c.getContext('2d'), cw, ch);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function card(work, i) {
  return tex(256, 320, (g, w, h) => {
    g.fillStyle = PASTELS[i % PASTELS.length]; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#7a6f66';
    g.font = `800 30px ${FONT}`;
    g.fillText(work ? work.title?.ko || '' : COMING_SOON.card.ko, w / 2, h / 2 - 18, w - 30);
    g.font = `500 20px ${FONT}`;
    g.fillText(work ? work.by?.ko || work.title?.en || '' : COMING_SOON.card.en, w / 2, h / 2 + 22, w - 30);
  });
}

// scene, room {w, d, h}, helpers { box, block, mat } from interior.js.
export function buildCulture(scene, room, { box, block }, store) {
  const { w, d } = room;
  const show = EXHIBITIONS[store.id] || { works: [] };
  // Frames: 3 on each side wall, 2 on the front wall either side of the door.
  const slots = [];
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) slots.push({ x: s * (w / 2 - 0.06), z: k * (d / 4), ry: -s * Math.PI / 2 });
  for (const s of [-1, 1]) slots.push({ x: s * (w / 4 + 0.6), z: d / 2 - 0.06, ry: Math.PI });
  const loader = new THREE.TextureLoader();
  slots.forEach((sl, i) => {
    const work = show.works[i] || null;
    const g = new THREE.Group();
    g.position.set(sl.x, 1.75, sl.z);
    g.rotation.y = sl.ry;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.7, 0.06), new THREE.MeshLambertMaterial({ color: '#3a3330' }));
    g.add(frame);
    const m = new THREE.MeshBasicMaterial({ map: card(work, i) });
    if (work?.image) loader.load(BASE + work.image, (t) => { t.colorSpace = THREE.SRGBColorSpace; m.map.dispose(); m.map = t; m.needsUpdate = true; });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), m);
    pic.position.z = 0.035;
    g.add(pic);
    const spot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.3), new THREE.MeshLambertMaterial({ color: '#2b2b2b' })); // a little spotlight above
    spot.position.set(0, 1.15, 0.2);
    g.add(spot);
    scene.add(g);
  });
  // Back wall: the show's poster on the left, the info desk on the right.
  const title = show.title || COMING_SOON.title;
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshBasicMaterial({ map: tex(512, 256, (g, cw, ch) => {
    g.fillStyle = store.colors.sign; g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `800 44px ${FONT}`; g.fillText(title.ko, cw / 2, ch / 2 - 30, cw - 40);
    g.font = `500 28px ${FONT}`; g.fillText(title.en, cw / 2, ch / 2 + 32, cw - 40);
  }) }));
  poster.position.set(-w / 4, 1.45, -d / 2 + 0.03);
  scene.add(poster);
  const dx = w / 4, dz = -d / 2 + 1.7;
  box(2.2, COUNTER_H - 0.03, 0.7, dx, (COUNTER_H - 0.03) / 2, dz, '#f2efe8'); // (COUNTER_H: the guide's face shows, core/counter-face.js)
  box(2.3, 0.05, 0.8, dx, COUNTER_H, dz, store.colors.sign);
  block(dx, dz, 2.3, 0.8);
  const clerk = { x: dx, z: dz - 0.75, ry: 0 };
  // Benches in the middle, back to back, facing the side walls.
  const seats = [];
  for (const s of [-1, 1]) {
    const x = s * 0.8;
    box(0.6, 0.08, 2.4, x, 0.4, 0.4, '#a9805a');
    for (const k of [-1, 1]) box(0.5, 0.4, 0.1, x, 0.2, 0.4 + k * 1.05, '#6b4f36');
    block(x, 0.4, 0.6, 2.4);
    for (const o of [-0.6, 0.6]) seats.push({ x, z: 0.4 + o, ry: s * Math.PI / 2, stand: [x + s, 0.4 + o] });
  }
  // A potted plant in each back corner: it is Seoul Forest after all.
  for (const s of [-1, 1]) {
    const px = s * (w / 2 - 0.8), pz = -d / 2 + 0.8;
    box(0.6, 0.55, 0.6, px, 0.28, pz, '#c9b49a');
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshLambertMaterial({ color: '#5f8a4e' }));
    leaves.position.set(px, 1.1, pz);
    scene.add(leaves);
    block(px, pz, 0.7, 0.7);
  }
  return { seats, clerk };
}
