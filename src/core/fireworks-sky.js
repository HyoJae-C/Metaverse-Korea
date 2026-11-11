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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { program, atUV, BARGES, U, RISE, LIFE, RADIUS, ORIGIN, COLORS } from './fireworks-show.js';

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
  if (kind === 'fan') for (let i = 0; i < n; i++) { // low on the barge: nine rays fanning up, like the festival's water fans
    const ray = i % 9, a = ((ray - 4) / 4) * 1.1 + (rand() - 0.5) * 0.04, len = 0.25 + 0.75 * rand();
    out.push([Math.sin(a) * len, Math.cos(a) * len * 1.2, (rand() - 0.5) * 0.06]);
  } else if (kind === 'ring') for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; flat(Math.cos(a), Math.sin(a)); }
  else if (kind === 'pistil') for (let i = 0; i < n; i++) { // a ball with a small ball of another colour inside
    const inner = i % 3 === 0, y = 1 - 2 * ((i + rand() * 0.5) / n), r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
    out.push([Math.cos(a) * r, y, Math.sin(a) * r].map((c) => c * (inner ? 0.4 : 0.9 + rand() * 0.1)));
  } else if (kind === 'dahlia') for (let i = 0; i < Math.round(n / 3); i++) { // fewer, bigger stars
    const m = Math.round(n / 3), y = 1 - 2 * ((i + 0.5) / m), r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
    out.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  } else if (kind === 'flower') for (let i = 0; i < n; i++) { // five petals
    const a = (i / n) * Math.PI * 2, r = 0.3 + 0.7 * Math.abs(Math.cos(a * 2.5));
    flat(Math.sin(a) * r, Math.cos(a) * r);
  } else if (kind === 'butterfly') for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = (Math.exp(Math.cos(a)) - 2 * Math.cos(4 * a)) / 4.7;
    flat(Math.sin(a) * r, Math.cos(a) * r);
  } else if (kind === 'double') for (let i = 0; i < n; i++) { // a ring inside a ring
    const a = (i / n) * Math.PI * 4, r = i < n / 2 ? 1 : 0.55;
    flat(Math.cos(a) * r, Math.sin(a) * r);
  } else if (kind === 'spiral') for (let i = 0; i < n; i++) { // three arms curling out
    const k = (i % Math.ceil(n / 3)) / Math.ceil(n / 3), a = k * Math.PI * 2.2 + (i % 3) * ((Math.PI * 2) / 3), r = 0.15 + 0.85 * k;
    flat(Math.cos(a) * r, Math.sin(a) * r);
  } else if (kind === 'palm') for (let i = 0; i < n; i++) { // eight thick fronds, mostly up and out
    const arm = i % 8, a = (arm / 8) * Math.PI * 2 + 0.2, len = 0.45 + 0.55 * rand(), up = 0.35;
    out.push([Math.cos(a) * len + (rand() - 0.5) * 0.08, (Math.sin(a) * 0.75 + up) * len, (rand() - 0.5) * 0.2]);
  } else if (kind === 'saturn') for (let i = 0; i < n; i++) { // a ball with a tilted ring round it
    if (i % 3 === 0) { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * 1.15, y = Math.sin(a) * 0.3; out.push([x * 0.95 - y * 0.3, y + x * 0.3, Math.sin(a) * 0.4]); }
    else { const y = 1 - 2 * ((i + rand() * 0.5) / n), r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996; out.push([Math.cos(a) * r * 0.6, y * 0.6, Math.sin(a) * r * 0.6]); }
  } else for (let i = 0; i < n; i++) { // peony, willow, kamuro, small, rainbow: a sphere
    const y = 1 - 2 * ((i + rand() * 0.5) / n), r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996 + rand() * 0.3;
    out.push([Math.cos(a) * r, y, Math.sin(a) * r].map((c) => c * (0.85 + rand() * 0.15)));
  }
  return out;
}

// A row of high-rises along the far bank, facing the lawn: one merged mesh
// for the towers and one instanced mesh for their lit windows (2 draw calls).
function makeSkyline() {
  const group = new THREE.Group();
  group.name = 'fireworks-skyline';
  const [x0, z0] = atUV(0, -285);
  group.position.set(x0, 0, z0);
  group.rotation.y = -Math.atan2(U[1], U[0]); // local x along the river, local z towards the lawn
  const towers = [], lit = [], shade = new THREE.Color();
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let u = -460; u < 620; u += 18 + rand() * 10) {
    const w = 10 + rand() * 9, d = 10, h = 12 + rand() * 26 + (Math.abs(u) < 150 ? rand() * 12 : 0);
    const box = new THREE.BoxGeometry(w, h, d).translate(u, h / 2, -rand() * 30).toNonIndexed();
    shade.set(['#4b5683', '#56618f', '#424c78'][Math.floor(rand() * 3)]);
    const cols = new Float32Array(box.attributes.position.count * 3);
    for (let i = 0; i < cols.length; i += 3) cols.set([shade.r, shade.g, shade.b], i);
    box.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    box.deleteAttribute('normal'); box.deleteAttribute('uv');
    towers.push(box);
    const front = box.attributes.position.array.reduce((m, v, i) => (i % 3 === 2 ? Math.max(m, v) : m), -Infinity);
    for (let y = 3; y < h - 2; y += 3.2) for (let c = 0; c < 3; c++) if (rand() < 0.62) lit.push([u + (c - 1) * w * 0.28, y, front + 0.1]);
  }
  const mesh = new THREE.Mesh(mergeGeometries(towers), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.8, 2.2),
    new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0, fog: false, depthWrite: false }), lit.length);
  const m4 = new THREE.Matrix4();
  lit.forEach(([x, y, z], k) => windows.setMatrixAt(k, m4.makeTranslation(x, y, z)));
  for (const o of [mesh, windows]) { o.frustumCulled = false; o.userData.noShadow = true; group.add(o); }
  group.userData.windows = windows;
  group.visible = false;
  return group;
}

export function createFireworksSky(scene, { phone = false } = {}) {
  const SLOTS = phone ? 80 : 128, PER = phone ? 64 : 96, N = SLOTS * PER;
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

  // The far bank's skyline (Mapo, across the main channel from the lawn),
  // lit windows and all, behind the bursts: the street has nothing that far
  // across the water, so without it the fireworks hung over an empty
  // horizon (Yozi, after the Ttukseom drone show's backdrop). Only there
  // while Yeouido's show night is on, so nobody sees it from elsewhere.
  const skyline = makeSkyline();
  points.add(skyline);

  let start = null, list = [], next = 0, slot = 0, lastT = -Infinity;
  const busyUntil = new Float32Array(SLOTS).fill(-1e6);
  const c1 = new THREE.Color(), c2 = new THREE.Color();
  // Puts burst b into a free slot (or skips it if the sky is full).
  const launch = (b) => {
    let s = -1;
    for (let k = 0; k < SLOTS; k++) { const i = (slot + k) % SLOTS; if (busyUntil[i] < b.t - RISE) { s = i; break; } }
    if (s < 0) return null;
    slot = (s + 1) % SLOTS;
    const hangs = b.kind === 'willow' || b.kind === 'kamuro'; // gold that drifts down slowly
    const life = LIFE[b.kind] * (hangs ? 1 : b.scale);
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
        const c = b.kind === 'rainbow' ? c2.set(COLORS[k % COLORS.length]) : b.kind === 'pistil' ? (k % 3 === 0 ? c2 : c1) : k % 2 && b.color2 !== b.color ? c2 : c1;
        col.array.set([c.r, c.g, c.b], i * 3);
        info.array.set([b.t, life * (0.85 + rand() * 0.3), hangs ? 1.6 : b.kind === 'dahlia' ? 1.3 : 1, k === 0 ? 1 : 0], i * 4);
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
      skyline.visible = night > 0.02;
      skyline.userData.windows.material.opacity = Math.min(1, night * 1.2);
      return fired;
    },
    dispose() {
      scene.remove(points); g.dispose(); mat.dispose();
      skyline.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    },
  };
}
