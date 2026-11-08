// The Yeouido fireworks themselves (the schedule and the program are in
// fireworks-show.js). Downloaded only when you come near Yeouido around show
// time, like the drone show's drones.
//
// All the sparks are one THREE.Points: a fixed pool of "slots", one burst
// each, reused in turn. When a burst starts, its slot's sparks get their
// burst point, direction, colour and start time once; after that the
// graphics card moves them (drag, gravity, fading), so each frame only one
// number changes (the show clock) and the whole sky is one draw call.
// Phones get fewer slots and fewer sparks per burst.
import * as THREE from 'three';
import { program, atUV, BARGES, U, RISE, LIFE, RADIUS, ORIGIN } from './fireworks-show.js';

const DRAG = 1.7; // how quickly sparks slow down
const GRAVITY = 6; // m/s² (gentle: the sparks hang in the air)

const VERT = /* glsl */`
  uniform float uTime, uScale;
  attribute vec3 aCenter, aDir, aCol;
  attribute vec4 aInfo; // t0, life, gravity, lead (1: this spark draws the climbing shell)
  varying vec3 vCol;
  varying float vA;
  void main() {
    float age = uTime - aInfo.x;
    vec3 p = aCenter;
    vA = 0.0;
    float size = 2.2;
    if (age > -${RISE.toFixed(2)} && age < 0.0) {
      // the shell climbing from its barge: only the lead spark, warm white
      float k = (age + ${RISE.toFixed(2)}) / ${RISE.toFixed(2)};
      p = vec3(aCenter.x, mix(1.5, aCenter.y, 1.0 - (1.0 - k) * (1.0 - k)), aCenter.z);
      vA = aInfo.w * 0.9;
      vCol = vec3(1.0, 0.85, 0.6);
      size = 1.6;
    } else if (age >= 0.0 && age < aInfo.y) {
      float spread = (1.0 - exp(-age * ${DRAG.toFixed(1)})) / ${DRAG.toFixed(1)};
      p = aCenter + aDir * spread - vec3(0.0, 0.5 * ${GRAVITY.toFixed(1)} * aInfo.z * age * age, 0.0);
      float f = 1.0 - age / aInfo.y;
      vA = f * sqrt(f) * (0.75 + 0.25 * sin(age * 31.0 + aDir.x * 7.0)); // fading, with a little twinkle
      vCol = mix(vec3(1.0, 0.95, 0.85), aCol, min(1.0, age * 4.0)); // white-hot for a moment, then its colour
      size = 2.6 + (age < 0.15 ? 2.5 : 0.0);
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = vA > 0.0 ? max(1.0, size * uScale / -mv.z) : 0.0;
  }`;
const FRAG = /* glsl */`
  uniform float uBright;
  varying vec3 vCol;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vA * uBright;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vCol * a, 1.0);
  }`;

// Unit directions for a kind of burst. Flat shapes are drawn in the plane
// that faces the lawn: across it along the river (h) and up (y).
function directions(kind, n, rand) {
  const out = [];
  const flat = (x, y) => out.push([x, y, (rand() - 0.5) * 0.12]);
  if (kind === 'ring') for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; flat(Math.cos(a), Math.sin(a)); }
  else if (kind === 'heart') for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    flat((16 * Math.sin(a) ** 3) / 17, (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17);
  } else if (kind === 'star') for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, s = (a * 5) / (Math.PI * 2), f = s - Math.floor(s);
    const r = 0.45 + 0.55 * Math.abs(1 - 2 * f);
    flat(Math.sin(a) * r, Math.cos(a) * r);
  } else if (kind === 'smile') for (let i = 0; i < n; i++) {
    const k = i / n;
    if (k < 0.55) { const a = (k / 0.55) * Math.PI * 2; flat(Math.cos(a), Math.sin(a)); } // the face
    else if (k < 0.85) { const a = Math.PI * (1.15 + ((k - 0.55) / 0.3) * 0.7); flat(Math.cos(a) * 0.6, Math.sin(a) * 0.6); } // the smile
    else { const e = k < 0.925 ? -1 : 1; flat(e * 0.35 + (rand() - 0.5) * 0.06, 0.35 + (rand() - 0.5) * 0.06); } // eyes
  } else for (let i = 0; i < n; i++) { // peony, willow, small: a sphere
    const y = 1 - 2 * ((i + rand() * 0.5) / n), r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996 + rand() * 0.3;
    out.push([Math.cos(a) * r, y, Math.sin(a) * r].map((c) => c * (0.85 + rand() * 0.15)));
  }
  return out;
}

export function createFireworksSky(scene, { phone = false } = {}) {
  const SLOTS = phone ? 30 : 60, PER = phone ? 64 : 96, N = SLOTS * PER;
  const g = new THREE.BufferGeometry();
  const attr = (k, size) => { const a = new THREE.BufferAttribute(new Float32Array(N * size), size); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, a); return a; };
  const position = attr('position', 3); // (unused by the shader, but three.js wants it)
  const center = attr('aCenter', 3), dir = attr('aDir', 3), col = attr('aCol', 3), info = attr('aInfo', 4);
  for (let i = 0; i < N; i++) info.array[i * 4] = -1e6; // every slot starts free (long over)
  void position;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 400 }, uBright: { value: 1 } },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const points = new THREE.Points(g, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  points.name = 'fireworks';
  points.userData.noShadow = true;
  scene.add(points);

  let start = null, list = [], next = 0, slot = 0, lastT = -Infinity;
  const busyUntil = new Float32Array(SLOTS).fill(-1e6);
  const c1 = new THREE.Color(), c2 = new THREE.Color();
  // Puts burst b into a free slot (or skips it if the sky is full).
  const launch = (b) => {
    let s = -1;
    for (let k = 0; k < SLOTS; k++) { const i = (slot + k) % SLOTS; if (busyUntil[i] < b.t - RISE) { s = i; break; } }
    if (s < 0) return null;
    slot = (s + 1) % SLOTS;
    const life = LIFE[b.kind] * (b.kind === 'willow' ? 1 : b.scale);
    busyUntil[s] = b.t + life;
    const [bu, bv] = BARGES[b.barge];
    const [x, z] = atUV(bu + b.du, bv);
    const n = b.kind === 'small' ? Math.round(PER * 0.6) : PER;
    let seed = b.seed;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const dirs = directions(b.kind, n, rand);
    const speed = RADIUS[b.kind] * b.scale * DRAG;
    c1.set(b.color); c2.set(b.color2);
    for (let k = 0; k < PER; k++) {
      const i = s * PER + k;
      const d = dirs[k];
      center.array.set([x, b.h, z], i * 3);
      if (d) {
        // (h, y, n): h along the river, y up, n towards the lawn
        const [h, y, nn] = d;
        dir.array.set([(h * U[0] + nn * -U[1]) * speed, y * speed, (h * U[1] + nn * U[0]) * speed], i * 3);
        const c = k % 2 && b.color2 !== b.color ? c2 : c1;
        col.array.set([c.r, c.g, c.b], i * 3);
        info.array.set([b.t, life * (0.85 + rand() * 0.3), b.kind === 'willow' ? 1.6 : 1, k === 0 ? 1 : 0], i * 4);
      } else info.array.set([-1e6, 0, 0, 0], i * 4);
    }
    for (const [a, size] of [[center, 3], [dir, 3], [col, 3], [info, 4]]) { a.addUpdateRange(s * PER * size, PER * size); a.needsUpdate = true; }
    return { x, y: b.h, z, kind: b.kind };
  };

  return {
    points,
    // Every frame: the show's start (ms) and seconds from it, how dark it is
    // (0–1), the camera, and the viewport height in pixels. Returns the
    // bursts that went off this frame ({ x, y, z, kind }), for their sound.
    update(showStart, t, night, camera, height) {
      const fired = [];
      if (showStart !== start) { start = showStart; list = showStart ? program(showStart) : []; next = 0; lastT = -Infinity; busyUntil.fill(-1e6); for (let i = 0; i < N; i++) info.array[i * 4] = -1e6; info.needsUpdate = true; }
      // Arriving mid-show (or after a pause): skip what's long over.
      if (t < lastT || t - lastT > 3) {
        next = 0;
        while (next < list.length && list[next].t + LIFE[list[next].kind] < t) next++;
      }
      lastT = t;
      while (next < list.length && list[next].t - RISE <= t) {
        const b = list[next++];
        const at = launch(b);
        if (at && b.t >= t - 0.5) fired.push({ ...at, t: b.t });
      }
      mat.uniforms.uTime.value = t;
      mat.uniforms.uScale.value = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
      // Faint in a daylight sky, bright at night; fainter far away.
      const far = Math.hypot(camera.position.x - ORIGIN[0], camera.position.z - ORIGIN[1]);
      mat.uniforms.uBright.value = (0.25 + 0.75 * night) * Math.max(0.35, Math.min(1, 1.25 - far / 800));
      points.visible = !!showStart && far < 900;
      return fired;
    },
    dispose() { scene.remove(points); g.dispose(); mat.dispose(); },
  };
}
