// The sun low in the sky at sunset (and sunrise): a sky dome that fades from
// the haze colour at the horizon to the colour overhead, clouds, a glow and
// the sun's disc where it goes down, a path of light on the river under it
// (on the water's own material), and the sun's light swung round to come
// from there.
//
// Each sunset has one of four looks (Yozi 2026-11-11, from photos), the same
// for everyone that day: SUNSETS below, chosen by sunsetLook().
//
// The sun goes down due west, a little south: from Mangwon Han River Park
// that is behind Seongsan Bridge's arches (the real view, Yozi 2026-11-11).
// It comes up in the east, mirrored. The rest of the day the sky is the
// plain colour weather.js paints, and the light comes from high in the
// south-east as before.
//
// weather.js owns it: update(hour, overcast, sky) each frame; `offset` is
// where the sun light stands from the player; `light` is the sun's colour.
import * as THREE from 'three';
import { cycleNumber } from './show-clock.js';

// West, 10° south of it (game x east, z south): the line from the park's
// sunset steps to Seongsan Bridge.
const WEST = new THREE.Vector3(-Math.cos(0.18), 0, Math.sin(0.18));
const DAY_OFFSET = new THREE.Vector3(60, 120, 40); // the light the rest of the day
const RISE = 6, SET = 18; // (show-clock.js SKY_SUN)

// The four sunsets. haze: the horizon (far things fade into it); mid: a
// little above it; top: overhead; glow: round the sun and on the water.
// Clouds: cover 0-1, stretch (long streaks > 1), ripple (rows of little
// clouds), lit / dark sides. rays: beams from the sun; disc: its size and
// sun its colour;
// glint: how bright its path on the river; light: the sun's light.
export const SUNSETS = [
  { // over the city: deep blue overhead, pink-purple clouds, an orange band low down
    id: 'city', haze: 0xffa24a, mid: 0xb4628e, top: 0x26357a, glow: 0xff7a2e,
    cover: 0.62, stretch: 4.5, ripple: 0, lit: 0xff9a70, dark: 0x3a2c5c, rays: 0, disc: 1, sun: 0xfff2c6, glint: 0.9,
    water: 0xd9867e, light: 0xff8a4a,
  },
  { // golden, with big clouds lit from behind and beams of light
    id: 'golden', haze: 0xffc865, mid: 0xffb057, top: 0x6f98d6, glow: 0xffd27a,
    cover: 0.62, stretch: 1.4, ripple: 0, lit: 0xffe0a0, dark: 0xb0684a, rays: 0.8, disc: 1.2, sun: 0xfffbe6, glint: 1.1,
    water: 0xe8b07a, light: 0xffb45a,
  },
  { // pink: rows of pink and lavender clouds over the whole sky
    id: 'pink', haze: 0xff5f6e, mid: 0xf06fa0, top: 0x6a5cb0, glow: 0xff7a8e,
    cover: 0.85, stretch: 2.2, ripple: 1, lit: 0xffa6d2, dark: 0x7a52aa, rays: 0, disc: 1, sun: 0xffe8d0, glint: 0.8,
    water: 0xd98aa6, light: 0xff8a8a,
  },
  { // the red sun: a clear orange sky, a big sun and its path on the water
    id: 'red', haze: 0xe8481c, mid: 0xf2701e, top: 0xf2a03a, glow: 0xff5a14,
    cover: 0, stretch: 1, ripple: 0, lit: 0xffffff, dark: 0xffffff, rays: 0, disc: 1.7, sun: 0xffe08a, glint: 1.6,
    water: 0xe0703a, light: 0xff7a3a,
  },
];

// Which sunset a game day has: the four in a shuffled order every four days,
// the same for everyone, never the same two days running. ?sunset=0..3
// picks one (for screenshots).
const roll = (n) => { // (murmur3's finaliser)
  let h = (n * 0x9e3779b1) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};
const order = (b) => { // the four days of block b
  const p = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = roll(b * 4 + i) % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
};
let pinned;
export function sunsetLook(now = Date.now()) {
  if (pinned === undefined) {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('sunset') : null;
    pinned = q != null && SUNSETS[+q] ? +q : null;
  }
  if (pinned != null) return pinned;
  const n = cycleNumber(now), b = Math.floor(n / 4), p = order(b);
  if (p[0] === order(b - 1)[3]) [p[0], p[1]] = [p[1], p[0]]; // (not the last block's last day again)
  return p[n - b * 4];
}

// How much of the sunset look is on (0-1) at a game hour, and the sun's
// height (degrees) and side (-1 rising in the east, 1 setting in the west).
export function sunsetAt(hour) {
  const set = hour > 12;
  const h = set ? SET - hour : hour - RISE; // hours before sunset (after sunrise)
  const elev = h * 9; // 9° an hour: 13° at 16:30, the sun on the horizon at 18:00
  // on from an hour and a half before sunset, gone 40 minutes after
  const k = h > 1.5 ? 0 : h < -0.7 ? 0 : h > 1.3 ? (1.5 - h) / 0.2 : h < -0.3 ? (h + 0.7) / 0.4 : 1; // (full about 2 real minutes into the sunset)
  return { k, elev, side: set ? 1 : -1 };
}

const VERT = `varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;
const FRAG = `uniform vec3 uSun; uniform vec3 uHaze; uniform vec3 uMid; uniform vec3 uTop; uniform vec3 uGlow; uniform float uMix;
uniform float uCover; uniform float uStretch; uniform float uRipple; uniform vec3 uLit; uniform vec3 uDark;
uniform float uRays; uniform float uDisc; uniform vec3 uDiscCol;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y, c = dot(d, uSun);
  vec3 col = mix(uHaze, uMid, smoothstep(0.0, 0.16, h));
  col = mix(col, uTop, smoothstep(0.12, 0.6, h));
  float band = max(dot(normalize(d.xz), normalize(uSun.xz)), 0.0) * (1.0 - smoothstep(0.0, 0.3, h));
  col = mix(col, uGlow, band * band * 0.8); // the band along the horizon under the sun
  // Clouds: a flat layer overhead, long along the horizon when stretched.
  float cl = 0.0;
  if (uCover > 0.0 && h > 0.0) {
    vec2 p = d.xz / (h + 0.06);
    vec2 s = normalize(uSun.xz), t = vec2(-s.y, s.x);
    vec2 q = vec2(dot(p, t) / uStretch, dot(p, s)) * 2.6 + vec2(5.3, 2.1);
    float n = fbm(q);
    n = mix(n, n * (0.55 + 0.45 * sin(q.y * 9.0 + noise(q * 2.0) * 5.0)), uRipple);
    float thr = mix(0.78, 0.36, uCover);
    cl = smoothstep(thr, thr + 0.12, n) * smoothstep(0.0, 0.05, h) * (1.0 - smoothstep(0.75, 0.98, h));
    float lit = clamp(pow(max(c, 0.0), 4.0) * 0.5 + (1.0 - smoothstep(thr, thr + 0.22, n)) * 0.6, 0.0, 1.0); // thin edges and the side by the sun lit
    col = mix(col, mix(uDark, uLit, lit), cl * 0.95);
  }
  col += uGlow * pow(max(c, 0.0), 16.0) * (1.0 - cl * 0.6); // the glow round it
  if (uRays > 0.0) { // beams fanning out from the sun
    vec3 r = normalize(cross(uSun, vec3(0.0, 1.0, 0.0))), u = cross(r, uSun);
    float ang = atan(dot(d, u), dot(d, r));
    float beam = pow(0.5 + 0.5 * sin(ang * 23.0 + sin(ang * 7.0) * 2.0), 5.0);
    col += uGlow * beam * pow(max(c, 0.0), 5.0) * (0.35 + cl * 0.4) * uRays * smoothstep(-0.02, 0.05, h);
  }
  float edge = 1.0 - 0.0003 * uDisc * uDisc;
  float disc = smoothstep(edge - 0.00015 * uDisc, edge, c) * smoothstep(-0.004, 0.004, h) * (1.0 - cl * 0.85);
  col = mix(col, uDiscCol, disc);
  gl_FragColor = vec4(col, uMix);
  #include <colorspace_fragment>
}`;
// The path of light on the river: added to the water's own material
// (onBeforeCompile), brightest on the line from you to the sun, rippling.
const GLINT = `
  {
    vec2 to = vSunPos.xz - cameraPosition.xz;
    float dist = max(length(to), 0.001);
    vec2 s2 = normalize(uSun.xz);
    float a = dot(to / dist, s2);
    float side = length(to / dist - s2 * a) * dist; // metres off the line
    float w = 3.0 + dist * 0.1;
    float path = exp(-side * side / (w * w)) * smoothstep(0.0, 0.3, a) * smoothstep(5.0, 25.0, dist);
    float rip = sin(vSunPos.x * 1.7 + uTime * 1.3) * sin(vSunPos.z * 2.3 - uTime * 1.1) + sin((vSunPos.x + vSunPos.z) * 0.9 + uTime * 0.7);
    gl_FragColor.rgb += uGlow * path * (0.25 + 0.75 * smoothstep(0.3, 1.5, rip)) * uMix * uGlint;
  }
`;

export function createSunsetSky(scene) {
  const uni = {
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uHaze: { value: new THREE.Color() },
    uMid: { value: new THREE.Color() }, uTop: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
    uMix: { value: 0 }, uTime: { value: 0 },
    uCover: { value: 0 }, uStretch: { value: 1 }, uRipple: { value: 0 },
    uLit: { value: new THREE.Color() }, uDark: { value: new THREE.Color() },
    uRays: { value: 0 }, uDisc: { value: 1 }, uDiscCol: { value: new THREE.Color() }, uGlint: { value: 0.9 },
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
    uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide,
    transparent: true, depthWrite: false, fog: false,
  }));
  dome.name = 'sunset-sky';
  dome.frustumCulled = false;
  dome.renderOrder = -10; // (first: everything else draws over it)
  dome.onBeforeRender = (r, s, cam) => { dome.position.copy(cam.position); };
  dome.visible = false;
  scene.add(dome);

  // The river's mesh marks where it is drawn, for the light on it.
  let water = null, waterColor = null;
  const warmWater = new THREE.Color();
  const findWater = () => {
    water = scene.getObjectByName('world')?.getObjectByName('water') || false;
    if (!water) return;
    waterColor = water.material.color.clone();
    water.material.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uSun: uni.uSun, uGlow: uni.uGlow, uMix: uni.uMix, uTime: uni.uTime, uGlint: uni.uGlint });
      sh.vertexShader = 'varying vec3 vSunPos;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vSunPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform vec3 uSun; uniform vec3 uGlow; uniform float uMix; uniform float uTime; uniform float uGlint;\nvarying vec3 vSunPos;\n'
        + sh.fragmentShader.replace('#include <fog_fragment>', GLINT + '#include <fog_fragment>');
    };
    water.material.needsUpdate = true;
  };
  // The day's look into the uniforms (only when it changes).
  const haze = new THREE.Color(), light = new THREE.Color(0xff8a4a);
  let look = -1;
  const setLook = (i) => {
    look = i;
    const L = SUNSETS[i];
    haze.set(L.haze);
    for (const [u, k] of [['uMid', 'mid'], ['uTop', 'top'], ['uGlow', 'glow'], ['uLit', 'lit'], ['uDark', 'dark'], ['uDiscCol', 'sun']]) uni[u].value.set(L[k]);
    uni.uCover.value = L.cover; uni.uStretch.value = L.stretch; uni.uRipple.value = L.ripple;
    uni.uRays.value = L.rays; uni.uDisc.value = L.disc; uni.uGlint.value = L.glint;
    warmWater.set(L.water); light.set(L.light);
  };
  const dir = new THREE.Vector3();
  const offset = DAY_OFFSET.clone();
  let mix = 0, lookAt = 0;
  return {
    offset, dome, light,
    get mix() { return mix; },
    get look() { return SUNSETS[look]?.id; },
    // hour: the game's hour; overcast 0-1; sky: weather's sky colour now
    // (the haze at the horizon, so far-off things fade into it); dt: s.
    update(hour, overcast, sky, dt = 0) {
      if (water === null) findWater();
      const now = Date.now();
      if (look < 0 || now - lookAt > 10e3) { lookAt = now; const i = sunsetLook(now); if (i !== look) setLook(i); }
      const { k, elev, side } = sunsetAt(hour);
      mix = k * (1 - overcast);
      const e = THREE.MathUtils.degToRad(Math.max(elev, -4));
      dir.set(WEST.x * side * Math.cos(e), Math.sin(e), WEST.z * Math.cos(e)).normalize();
      uni.uSun.value.copy(dir);
      sky.lerp(haze, mix * 0.8); // (the haze warms too: far-off things fade into it)
      uni.uHaze.value.copy(sky);
      uni.uMix.value = mix;
      uni.uTime.value = (uni.uTime.value + dt) % 1000;
      dome.visible = mix > 0.01;
      if (water) water.material.color.copy(waterColor).lerp(warmWater, mix * 0.6);
      // The light: from the low sun (not lower than 14°, so shadows stay on
      // the screen), blended in with the sunset.
      const ly = Math.max(Math.sin(e), 0.25);
      offset.set(dir.x * 130, ly * 130, dir.z * 130).lerp(DAY_OFFSET, 1 - k);
    },
  };
}
