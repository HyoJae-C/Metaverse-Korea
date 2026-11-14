// The Yeouido fireworks themselves (the schedule and the program are in
// fireworks-show.js). Downloaded only when you come near Yeouido around show
// time, like the drone show's drones.
//
// All the sparks are one THREE.Points: a fixed pool of "slots", one burst
// each, reused in turn. When a burst starts, its slot's sparks get their
// burst point, direction, colour and start time once; after that the
// graphics card moves them (drag, gravity, fading), so each frame only one
// number changes (the show clock) and the whole sky is one draw call.
// Phones get fewer slots and fewer stars per burst. Each star is a short
// trail of points (TRAIL), and the lead one draws the climbing shell.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { program, atUV, BARGES, U, RISE, LIFE, RADIUS, ORIGIN, COLORS } from './fireworks-show.js';

const DRAG = 1.7; // how quickly sparks slow down
const GRAVITY = 6; // m/s² (gentle: the sparks hang in the air)

// Each star is drawn as a few points on the same path, each a moment
// behind the one before and fainter: a short streak that trails it, so a
// burst leaves lines of light instead of dots, and the climbing shell a
// tail (Yozi: "터지기전 방향, 터진후의 잔상효과 같은게 불꽃놀이의 재미도
// 핵심"). TRAIL: [seconds behind, brightness] for each point of a star.
const TRAIL = [[0, 1], [0.07, 0.6], [0.15, 0.36], [0.25, 0.2]];
const VERT = /* glsl */`
  uniform float uTime, uScale;
  attribute vec3 aCenter, aDir, aCol, aCol2; // aCol2: the colour its stars turn into
  attribute vec4 aInfo; // t0 (already a little later for a trailing point), life, gravity, lead (1: this star draws the climbing shell)
  attribute float aW; // its brightness in the star's trail (1 at the head)
  varying vec3 vCol;
  varying float vA;
  void main() {
    float age = uTime - aInfo.x;
    vec3 p = aCenter;
    vA = 0.0;
    float size = 2.2;
    if (age > -${RISE.toFixed(2)} && age < 0.0) {
      // the shell climbing from its barge, wobbling a little, with a
      // sparkling gold tail: only the lead star
      float k = (age + ${RISE.toFixed(2)}) / ${RISE.toFixed(2)};
      float w = sin(k * 9.0 + aCenter.x) * 0.6 * (1.0 - k);
      float tail = (1.0 - aW) * 9.0 * (1.0 - k * 0.6); // the tail hangs a few metres below the shell
      p = vec3(aCenter.x + w, max(1.5, mix(1.5, aCenter.y, 1.0 - (1.0 - k) * (1.0 - k)) - tail), aCenter.z + w * 0.5);
      vA = aInfo.w * aW * (0.8 + 0.2 * sin(age * 50.0 + aW * 9.0));
      vCol = mix(vec3(1.0, 0.55, 0.2), vec3(1.0, 0.95, 0.8), aW);
      size = 2.0 + aW * 1.6;
    } else if (age >= 0.0 && age < aInfo.y) {
      float spread = (1.0 - exp(-age * ${DRAG.toFixed(1)})) / ${DRAG.toFixed(1)};
      p = aCenter + aDir * spread - vec3(0.0, 0.5 * ${GRAVITY.toFixed(1)} * aInfo.z * age * age, 0.0);
      float f = 1.0 - age / aInfo.y;
      // fading slowly, and at the end glittering out rather than just going
      float glitter = f < 0.4 ? 0.35 + 0.65 * step(0.0, sin(age * 37.0 + aDir.x * 13.0 + aDir.y * 7.0)) : 0.8 + 0.2 * sin(age * 31.0 + aDir.x * 7.0);
      vA = pow(f, 0.9) * glitter * aW;
      vec3 c = mix(aCol, aCol2, smoothstep(0.2, 0.65, age / aInfo.y)); // its colour, turning into the second
      vCol = mix(vec3(1.0, 0.95, 0.85), c, min(1.0, age * 4.0)); // white-hot for a moment, then its colour
      size = (2.4 + (age < 0.15 ? 2.5 : 0.0)) * (0.55 + 0.45 * aW);
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
  } else if (kind === 'double') for (let i = 0; i < n; i++) { // a ring inside a ring
    const a = (i / n) * Math.PI * 4, r = i < n / 2 ? 1 : 0.55;
    flat(Math.cos(a) * r, Math.sin(a) * r);
  } else if (kind === 'spiral') for (let i = 0; i < n; i++) { // three arms curling out
    const k = (i % Math.ceil(n / 3)) / Math.ceil(n / 3), a = k * Math.PI * 2.2 + (i % 3) * ((Math.PI * 2) / 3), r = 0.15 + 0.85 * k;
    flat(Math.cos(a) * r, Math.sin(a) * r);
  } else if (kind === 'palm') for (let i = 0; i < n; i++) { // eight thick fronds, mostly up and out
    const arm = i % 8, a = (arm / 8) * Math.PI * 2 + 0.2, len = 0.45 + 0.55 * rand(), up = 0.35;
    out.push([Math.cos(a) * len + (rand() - 0.5) * 0.08, (Math.sin(a) * 0.75 + up) * len, (rand() - 0.5) * 0.2]);
  } else for (let i = 0; i < n; i++) { // peony, willow, kamuro, small, rainbow: a sphere
    const y = 1 - 2 * ((i + rand() * 0.5) / n), r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996 + rand() * 0.3;
    out.push([Math.cos(a) * r, y, Math.sin(a) * r].map((c) => c * (0.85 + rand() * 0.15)));
  }
  return out;
}

// A row of high-rises along the far bank, facing the lawn: one merged mesh
// for the towers and one instanced mesh for their lit windows (2 draw calls).
// Its outline follows the drone show's "Modu Tower" skyline picture,
// mirrored left to right, so the heights go up and down a lot instead of a
// flat row of small blocks (Yozi: "드론쇼빌딩이미지를 참고해서 만들고
// 좌우반전", "너무작은빌딩만잇거든"): tall towers either side of the
// middle, mid-rises and low ones between, then a looser row out to the ends.
// Drone picture: [x, width, height] in its units; here 1 unit = 20 m along
// the river and 16 m up (the tallest about 110 m), x flipped.
const DRONE_SKYLINE = [[-13, 3.4, 4.6], [-9.4, 3, 6.4], [-6.3, 2.6, 3.8], [5.6, 2.8, 4.4], [8.6, 3.2, 6.8], [12, 2.8, 3.6]];
function makeSkyline() {
  const group = new THREE.Group();
  group.name = 'fireworks-skyline';
  const [x0, z0] = atUV(0, -285);
  group.position.set(x0, 0, z0);
  group.rotation.y = -Math.atan2(U[1], U[0]); // local x along the river, local z towards the lawn
  const towers = [], lit = [], shade = new THREE.Color();
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const tower = (u, w, h, back) => {
    const box = new THREE.BoxGeometry(w, h, 12).translate(u, h / 2, -back).toNonIndexed();
    shade.set(['#3c4a78', '#46558a', '#34406a', '#52639a'][Math.floor(rand() * 4)]);
    const cols = new Float32Array(box.attributes.position.count * 3);
    for (let i = 0; i < cols.length; i += 3) cols.set([shade.r, shade.g, shade.b], i);
    box.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    box.deleteAttribute('normal'); box.deleteAttribute('uv');
    towers.push(box);
    const front = 6 - back, across = Math.max(2, Math.round(w / 5));
    for (let y = 3; y < h - 2; y += 3.2) for (let c = 0; c < across; c++) if (rand() < 0.6) lit.push([u - w / 2 + (c + 0.5) * (w / across), y, front + 0.1, rand() < 0.3]);
  };
  // the middle: the drone picture, mirrored, with mid-rises in the gap
  // where its tower stood
  const MID = 13;
  for (const [x, w, h] of DRONE_SKYLINE) tower(MID - x * 20, w * 20 * 0.5, h * 16, 4 + rand() * 6);
  for (const [x, w, h] of [[-3.6, 16, 30], [-1.2, 20, 52], [1.4, 18, 38], [3.4, 14, 24], [-15.6, 16, 34], [15.4, 18, 40], [-18, 20, 58], [18.2, 16, 28]]) tower(MID + x * 20, w, h, 14 + rand() * 10);
  // out to the ends: a looser row, now and then a tall one
  for (const side of [-1, 1]) {
    for (let d = 400 + rand() * 20; d < 600; d += 22 + rand() * 14) {
      const tall = rand() < 0.25, h = tall ? 50 + rand() * 30 : 14 + rand() * 26;
      tower(MID + side * d, 12 + rand() * 12, h, rand() * 30);
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(towers), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.8, 2.2),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, fog: false, depthWrite: false }), lit.length);
  const m4 = new THREE.Matrix4(), warm = new THREE.Color('#ffe28a'), cool = new THREE.Color('#9fb8e0');
  lit.forEach(([x, y, z, blue], k) => { windows.setMatrixAt(k, m4.makeTranslation(x, y, z)); windows.setColorAt(k, blue ? cool : warm); });
  for (const o of [mesh, windows]) { o.frustumCulled = false; o.userData.noShadow = true; group.add(o); }
  group.userData.windows = windows;
  group.visible = false;
  return group;
}

export function createFireworksSky(scene, { phone = false } = {}) {
  const SLOTS = phone ? 80 : 128, STARS = phone ? 26 : 44, PER = STARS * TRAIL.length, N = SLOTS * PER;
  const g = new THREE.BufferGeometry();
  const attr = (k, size) => { const a = new THREE.BufferAttribute(new Float32Array(N * size), size); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, a); return a; };
  const position = attr('position', 3); // (unused by the shader, but three.js wants it)
  const center = attr('aCenter', 3), dir = attr('aDir', 3), col = attr('aCol', 3), col2 = attr('aCol2', 3), info = attr('aInfo', 4), weight = attr('aW', 1);
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
    const life = LIFE[b.kind] * (hangs ? 1 : b.scale) * (b.kind === 'small' || b.kind === 'fan' ? 1 : 1.2); // (a little longer, to glitter out)
    busyUntil[s] = b.t + life * 1.15 + TRAIL.at(-1)[0];
    const [bu, bv] = BARGES[b.barge];
    const [x, z] = atUV(bu + b.du, bv);
    const n = b.kind === 'small' ? Math.round(STARS * 0.6) : STARS;
    let seed = b.seed;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const dirs = directions(b.kind, n, rand);
    const speed = RADIUS[b.kind] * b.scale * DRAG;
    c1.set(b.color); c2.set(b.color2);
    for (let k = 0; k < STARS; k++) {
      const d = dirs[k];
      // start and end colours: rainbow one each, pistil a heart of the
      // second, the rest start in the first and turn into the second
      // (a quarter in the second from the start)
      const c = !d ? c1 : b.kind === 'rainbow' ? c2.set(COLORS[k % COLORS.length]) : b.kind === 'pistil' ? (k % 3 === 0 ? c2 : c1) : k % 4 === 0 ? c2 : c1;
      const e = b.kind === 'rainbow' || b.kind === 'pistil' ? c : c2;
      const starLife = life * (0.85 + rand() * 0.3);
      TRAIL.forEach(([lag, w], j) => {
        const i = s * PER + k * TRAIL.length + j;
        center.array.set([x, b.h, z], i * 3);
        weight.array[i] = w;
        if (!d) { info.array.set([-1e6, 0, 0, 0], i * 4); return; }
        // (h, y, n): h along the river, y up, n towards the lawn
        const [h, y, nn] = d;
        dir.array.set([(h * U[0] + nn * -U[1]) * speed, y * speed, (h * U[1] + nn * U[0]) * speed], i * 3);
        col.array.set([c.r, c.g, c.b], i * 3);
        col2.array.set([e.r, e.g, e.b], i * 3);
        info.array.set([b.t + lag, starLife, hangs ? 1.6 : b.kind === 'dahlia' ? 1.3 : 1, k === 0 ? 1 : 0], i * 4);
      });
    }
    for (const [a, size] of [[center, 3], [dir, 3], [col, 3], [col2, 3], [info, 4], [weight, 1]]) { a.addUpdateRange(s * PER * size, PER * size); a.needsUpdate = true; }
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
