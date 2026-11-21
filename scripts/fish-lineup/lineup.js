// Fish lineup for before/after checks of the sea-life models.
//   npx vite --port 5199 &
//   node scripts/fish-lineup/shot.mjs "m=clownfish,bluetang&view=side" out.png
import * as THREE from 'three';
import { species, SWIM_TIME } from '../../src/core/sea-life.js';
import { drawingOf } from '../../src/core/tank-species.js';
import { FISH } from '../../src/core/fishing.js';
const q = new URLSearchParams(location.search);
const ids = q.get('m') === 'all' ? FISH.map((f) => f.id) : (q.get('m') || 'clownfish,bluetang,yellowtang,sardine,yellowtail,carp,chub,salmon,butterfly,shark,manta,turtle,dolphin,orca,sunfish').split(',');
const cols = +(q.get('cols') || 5), P = +(q.get('px') || 360), yaw = +(q.get('yaw') ?? 0.5), pitch = +(q.get('pitch') ?? 0.25);
const rows = Math.ceil(ids.length / cols);
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace;
r.setSize(cols * P, rows * P * 0.7);
document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color(q.get('bg') || '#2a6f97');
s.add(new THREE.HemisphereLight(0xffffff, 0x335566, 1.6));
const d = new THREE.DirectionalLight(0xffffff, 1.8); d.position.set(2, 4, 3); s.add(d);
const cam = new THREE.OrthographicCamera(-cols / 2 * 1.2, cols / 2 * 1.2, rows * 0.7 / 2 * 1.2, -rows * 0.7 / 2 * 1.2, 0.1, 50);
cam.position.set(0, 0, 10); cam.lookAt(0, 0, 0);
ids.forEach((id, i) => {
  const sp = species(drawingOf(id));
  const m = new THREE.InstancedMesh(sp.geo, sp.mat, 1);
  m.setMatrixAt(0, new THREE.Matrix4());
  const g = new THREE.Group(); g.add(m);
  g.rotation.set(pitch, yaw, 0, 'YXZ');
  g.position.set(((i % cols) - (cols - 1) / 2) * 1.2, -(Math.floor(i / cols) - (rows - 1) / 2) * 0.84, 0);
  s.add(g);
});
const t0 = performance.now();
function loop() { SWIM_TIME.value = q.has('still') ? 0.1 : (performance.now() - t0) / 1000; r.render(s, cam); requestAnimationFrame(loop); }
loop();
