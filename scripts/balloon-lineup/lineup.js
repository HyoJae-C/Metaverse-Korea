// Held-balloon lineup (before/after checks of how balloons read on a character).
// ?b=sword,dog&spd=0 — each balloon from behind-above (the game camera), the
// side and the front.
import * as THREE from 'three';
import { createCharacter } from '../../src/core/character.js';
const q = new URLSearchParams(location.search);
const kinds = (q.get('b') || 'sword,dog').split(',');
const spd = +(q.get('spd') || 0);
const views = [['behind', Math.PI, 0.5], ['back-right', Math.PI * 0.75, 0.35], ['side', -Math.PI / 2, 0.15], ['front', 0.35, 0.15]];
const P = 340, W = views.length * P, H = kinds.length * P;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace; r.setSize(W, H); r.setScissorTest(true);
document.body.appendChild(r.domElement);
const scenes = [];
for (const [row, kind] of kinds.entries()) for (const [col, [, yaw, pitch]] of views.entries()) {
  const s = new THREE.Scene(); s.background = new THREE.Color(0xe9e4da);
  s.add(new THREE.HemisphereLight(0xffffff, 0xb8ad98, 1.6));
  const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(2, 4, 3); s.add(d);
  const c = createCharacter({ model: 'basic', shirt: 'cream', pants: 'denim', hair: 'espresso', skin: 'fair' });
  c.setHeld('balloon:' + kind); c.root.rotation.y = yaw; s.add(c.root);
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  cam.position.set(0, 0.9 + 3.2 * Math.sin(pitch), 3.2 * Math.cos(pitch)); cam.lookAt(0, 0.85, 0);
  scenes.push({ s, c, cam, x: col * P, y: (kinds.length - 1 - row) * P });
}
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  for (const v of scenes) { v.c.animate(dt, spd); r.setViewport(v.x, v.y, P, P); r.setScissor(v.x, v.y, P, P); r.render(v.s, v.cam); }
  requestAnimationFrame(loop);
}
loop();
