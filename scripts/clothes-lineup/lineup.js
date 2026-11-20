import * as THREE from 'three';
import { createCharacter } from '../../src/core/character.js';
import { parseRide } from '../../src/core/bike-garage.js';
const q = new URLSearchParams(location.search);
const ids = (q.get('m') || 'basic,rogue,hooded,knight,suit-navy,coat-camel,varsity-navy,cardigan-brown').split(',');
const yaw = +(q.get('yaw') || 0.45);
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color(0xe9e4da);
s.add(new THREE.HemisphereLight(0xffffff, 0xb8ad98, 1.6));
const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(2, 4, 3); s.add(d);
const n = ids.length, sp = +(q.get('sp') || 1.25);
// fy/fh: a close-up band (bottom y and height, metres), e.g. fy=0&fh=0.5 for shoes.
const fy = +(q.get('fy') ?? -0.05), fh = +(q.get('fh') ?? 1.5), P = +(q.get('px') || 300);
const W = n * P, H = Math.round(fh * P / sp); // square pixels: P per character
r.setSize(W, H);
const cam = new THREE.OrthographicCamera(-n * sp / 2, n * sp / 2, fy + fh, fy, 0.1, 50);
cam.position.set(0, 0, 10); cam.lookAt(0, 0, 0);
const chars = ids.map((id, i) => {
  const [model, shirt = 'cream', pants = 'denim', shoes = null, hairStyle = null, hair = 'espresso', back = null, head = null, face = null] = id.split(':');
  const c = createCharacter({ model, shirt, pants, shoes: shoes || null, hairStyle: hairStyle || null, hair, skin: 'fair', back: back || null, head: head || null, face: face || null });
  // bike=sleigh (or a rideCode, e.g. bike.0.-.-.sleigh): everyone on that ride.
  const bk = q.get('bike');
  if (bk) c.setBike(1, bk.includes('.') ? parseRide(bk) : { type: 'bike', tier: 0, color: '#c8102e', pattern: null, body: bk === 'plain' ? null : bk });
  c.root.position.x = (i - (n - 1) / 2) * sp; c.root.rotation.y = yaw;
  s.add(c.root); return c;
});
let t = 0; const clock = new THREE.Clock();
function loop() { const dt = Math.min(clock.getDelta(), 0.05); t += dt; for (const c of chars) c.animate?.(dt, 0); r.render(s, cam); requestAnimationFrame(loop); }
loop();
window.__ready = () => true;
