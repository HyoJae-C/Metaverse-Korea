// The four home fish tanks with fish in them (core/fish-tank.js), for a look.
//   node scripts/fish-lineup/shot.mjs tanks out.png   (page: tanks.html)
import * as THREE from 'three';
import { buildFurniture } from '../../src/core/furniture.js';
import { tankById } from '../../src/core/fish-tank.js';
import { fillTank } from '../../src/core/tank-fish.js';
const FILL = [['tank-mini', ['clownfish', 'shrimp']], ['tank-s', ['clownfish', 'ricefish', 'shrimp', 'seahorse']], ['tank-m', ['carp', 'puffer', 'crucian', 'octopus', 'kelp']],
  ['tank-l', ['salmon', 'red-lionfish', 'sea-turtle', 'seabream', 'wakame']], ['tank-wall', ['orca', 'beluga', 'manta', 'shark', 'kelp', 'starfish', 'crab']]];
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace; r.setSize(1800, 800);
document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color('#efe6d6');
s.add(new THREE.HemisphereLight(0xffffff, 0xb8ad98, 1.6));
const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(2, 4, 5); s.add(d);
const cam = new THREE.PerspectiveCamera(30, 1800 / 800, 0.1, 50); cam.position.set(0, 2.2, 12.5); cam.lookAt(0, 1.2, 0);
let x = -6.8; const ticks = [];
for (const [id, list] of FILL) {
  const t = tankById(id), g = buildFurniture(id); x += t.size[0] / 2; g.position.x = x; x += t.size[0] / 2 + 0.35; s.add(g);
  ticks.push(fillTank(g, t, list));
}
const t0 = performance.now();
(function loop() { const t = (performance.now() - t0) / 1000; for (const k of ticks) k.tick(t); r.render(s, cam); requestAnimationFrame(loop); })();
