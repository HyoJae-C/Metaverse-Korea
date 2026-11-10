// The record café's listening bar (청음대): a standing counter along the
// right wall with headphones hung on a stand at each station, a little
// screen showing the record, and a sign and the record sleeve on the wall
// above. Returns the stations: where you stand ({ x, z, ry } facing the
// wall), and the headphones on the stand (hidden while someone wears them).
import * as THREE from 'three';
import { makeHeadphones } from './headphones.js';
import { LISTEN_TRACKS } from '../data/listening.js';

const BAR_H = 1.02, BAR_D = 0.55;

export function listeningBar(scene, store, w, d, h, box, block) {
  const wallX = w / 2 - 0.2;
  const bx = wallX - BAR_D / 2;
  const z0 = -d / 2 + 1.8, z1 = Math.min(0.6, d / 2 - 4.8); // clear of the back-wall displays and the counter by the door
  const len = z1 - z0, zc = (z0 + z1) / 2;
  const wood = '#6b4a34';
  box(BAR_D, 0.06, len, bx, BAR_H, zc, '#3b2a20'); // top
  box(BAR_D - 0.1, BAR_H - 0.03, len - 0.1, bx + 0.03, (BAR_H - 0.03) / 2, zc, wood); // body
  box(0.04, 0.05, len, bx - BAR_D / 2 + 0.02, BAR_H - 0.06, zc, '#c9a26a'); // brass edge
  block(bx, zc, BAR_D + 0.1, len);

  // Wall: a dark panel behind the bar, with the sign along the top.
  const panel = box(0.04, 1.7, len + 0.3, wallX - 0.02, BAR_H + 1.0, zc, store.colors.sign || '#2b2340');
  panel.material = panel.material.clone();
  const sign = document.createElement('canvas');
  sign.width = 1024; sign.height = 128;
  const g = sign.getContext('2d');
  g.fillStyle = '#f3ece0';
  g.font = 'bold 64px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('🎧  청음대 · LISTENING BAR', 512, 66);
  const stex = new THREE.CanvasTexture(sign);
  stex.colorSpace = THREE.SRGBColorSpace;
  const sw = Math.min(len, 3.6);
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw / 8), new THREE.MeshBasicMaterial({ map: stex, transparent: true }));
  signMesh.rotation.y = -Math.PI / 2;
  signMesh.position.set(wallX - 0.05, BAR_H + 1.6, zc);
  scene.add(signMesh);

    // Each station shows one of the songs' covers, in turn.
  const base = import.meta.env?.BASE_URL || '/';
  const coverMats = LISTEN_TRACKS.map((tr) => {
    const m = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    if (typeof document !== 'undefined') {
      new THREE.TextureLoader().load(base + tr.cover, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        m.map = tex; m.needsUpdate = true;
      });
    }
    return m;
  });

  const n = 3, gap = len / n;
  const stations = [];
  for (let i = 0; i < n; i++) {
    const z = z0 + gap * (i + 0.5);
    const coverMat = coverMats[(n - 1 - i) % coverMats.length] || new THREE.MeshBasicMaterial({ color: '#2b2340' }); // (the station nearest the door shows the first song)
    // Headphones hung on a little stand on the bar.
    const post = box(0.03, 0.4, 0.03, bx + 0.1, BAR_H + 0.2, z + 0.28, '#8d8a96');
    post.castShadow = true;
    const rack = makeHeadphones('#1f1d24', i % 2 ? '#e0517a' : '#c9a26a');
    rack.scale.setScalar(0.62);
    rack.rotation.y = Math.PI / 2;
    rack.position.set(bx + 0.1, BAR_H + 0.18, z + 0.28); // hung over the top of the post
    scene.add(rack);
    // A small screen tilted towards the listener, glowing in the sleeve's
    // colour (the cover shows on it).
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), coverMat);
    screen.position.set(bx - 0.02, BAR_H + 0.24, z - 0.12);
    screen.rotation.set(0, -Math.PI / 2, 0);
    screen.rotateX(-0.45);
    scene.add(screen);
    box(0.06, 0.4, 0.4, bx + 0.02, BAR_H + 0.22, z - 0.12, '#141418').rotation.z = -0.45; // its stand
    // The sleeve on the wall above.
    const frame = box(0.03, 0.62, 0.62, wallX - 0.04, BAR_H + 0.85, z, '#141418');
    frame.castShadow = false;
    const sleeve = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.54), coverMat);
    sleeve.rotation.y = -Math.PI / 2;
    sleeve.position.set(wallX - 0.06, BAR_H + 0.85, z);
    scene.add(sleeve);
    stations.push({ x: bx - BAR_D / 2 - 0.5, z, ry: Math.PI / 2, rack, taken: false });
  }
  return stations;
}
