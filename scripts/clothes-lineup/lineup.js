import * as THREE from 'three';
import { createCharacter } from '../../src/core/character.js';
const q = new URLSearchParams(location.search);
const ids = (q.get('m') || 'basic,rogue,hooded,knight,suit-navy,coat-camel,varsity-navy,cardigan-brown').split(',');
const yaw = +(q.get('yaw') || 0.45);
const W = ids.length * 220, H = 520;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color(0xe9e4da);
s.add(new THREE.HemisphereLight(0xffffff, 0xb8ad98, 1.6));
const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(2, 4, 3); s.add(d);
const n = ids.length, sp = 1.25;
const cam = new THREE.OrthographicCamera(-n * sp / 2, n * sp / 2, 1.45, -0.05, 0.1, 50);
cam.position.set(0, 0, 10); cam.lookAt(0, 0, 0);
const chars = ids.map((id, i) => {
  const [model, shirt = 'cream', pants = 'denim'] = id.split(':');
  const c = createCharacter({ model, shirt, pants, hair: 'espresso', skin: 'fair' });
  c.root.position.x = (i - (n - 1) / 2) * sp; c.root.rotation.y = yaw;
  s.add(c.root); return c;
});
let t = 0; const clock = new THREE.Clock();
function loop() { const dt = Math.min(clock.getDelta(), 0.05); t += dt; for (const c of chars) c.animate?.(dt, 0); r.render(s, cam); requestAnimationFrame(loop); }
loop();
window.__ready = () => true;
