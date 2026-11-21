import * as THREE from 'three';
import { createCharacter } from '../../src/core/character.js';
import { createHaechi, HAECHI_INFO } from './haechi.js';
const q = new URLSearchParams(location.search);
const kinds = (q.get('k') || 'stone,gold,dancheong').split(',');
const yaw = +(q.get('yaw') ?? 0.6), withChar = q.get('c') !== '0';
const W = +(q.get('w') || 2400), H = +(q.get('h') || 900);
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace; r.setSize(W, H);
r.shadowMap.enabled = true;
document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color(0xe9e4da);
s.add(new THREE.HemisphereLight(0xffffff, 0xb8ad98, 1.5));
const d = new THREE.DirectionalLight(0xffffff, 1.7); d.position.set(3, 6, 5); d.castShadow = true;
d.shadow.camera.left = -8; d.shadow.camera.right = 8; d.shadow.camera.top = 4; d.shadow.camera.bottom = -2; d.shadow.mapSize.set(2048, 2048);
s.add(d);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
const sp = +(q.get('sp') || 3.0), n = kinds.length;
const cam = new THREE.PerspectiveCamera(+(q.get('fov') || 22), W / H, 0.1, 100);
const dist = +(q.get('dist') || 14);
cam.position.set(0, 2.2 + +(q.get('up') || 0), dist); cam.lookAt(0, 0.85, 0);
const labels = document.createElement('div');
labels.style.cssText = 'position:absolute;left:0;top:0;width:' + W + 'px;font:600 30px sans-serif;color:#3a342c';
document.body.appendChild(labels);
kinds.forEach((k, i) => {
  const x = (i - (n - 1) / 2) * sp;
  const h = createHaechi(k);
  h.position.x = x + (withChar ? 0.45 : 0); h.rotation.y = yaw; s.add(h);
  if (withChar) {
    const c = createCharacter({ model: 'basic', shirt: 'cream', pants: 'denim', hair: 'espresso', skin: 'fair' });
    c.root.position.set(x - 0.75, 0, 0.3); c.root.rotation.y = 0.35; s.add(c.root);
    c.__a = true; window.__c = (window.__c || []).concat(c);
  }
  if (q.get('lab') !== '0') {
    const box = new THREE.Box3().setFromObject(h), top = box.max.y;
    const v = new THREE.Vector3(x, 0, 0).project(cam);
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;top:24px;left:${(v.x + 1) / 2 * W - 300}px;width:600px;text-align:center`;
    el.innerHTML = `${HAECHI_INFO[k]}<br><span style="font-weight:400;font-size:24px">높이 ${top.toFixed(2)} m · 캐릭터 1.2 m</span>`;
    labels.appendChild(el);
  }
});
const clock = new THREE.Clock();
function loop() { const dt = Math.min(clock.getDelta(), 0.05); for (const c of window.__c || []) c.animate?.(dt, 0); r.render(s, cam); requestAnimationFrame(loop); }
loop();
