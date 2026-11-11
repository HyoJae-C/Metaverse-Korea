// The sun low in the sky at sunset (and sunrise): a sky dome that fades from
// the haze colour at the horizon to deep blue overhead, a glow and the sun's
// disc where it goes down, a path of light on the river under it (on the water's own material), and the
// sun's light swung round to come from there.
//
// The sun goes down due west, a little south: from Mangwon Han River Park
// that is behind Seongsan Bridge's arches (the real view, Yozi 2026-11-11).
// It comes up in the east, mirrored. The rest of the day the sky is the
// plain colour weather.js paints, and the light comes from high in the
// south-east as before.
//
// weather.js owns it: update(hour, overcast, sky) each frame; `offset` is
// where the sun light stands from the player.
import * as THREE from 'three';

// West, 10° south of it (game x east, z south): the line from the park's
// sunset steps to Seongsan Bridge.
const WEST = new THREE.Vector3(-Math.cos(0.18), 0, Math.sin(0.18));
const DAY_OFFSET = new THREE.Vector3(60, 120, 40); // the light the rest of the day
const RISE = 6, SET = 18;
const HAZE = new THREE.Color(0xf4b49a); // the horizon at sunset // (show-clock.js SKY_SUN)

// How much of the sunset look is on (0-1) at a game hour, and the sun's
// height (degrees) and side (-1 rising in the east, 1 setting in the west).
export function sunsetAt(hour) {
  const set = hour > 12;
  const h = set ? SET - hour : hour - RISE; // hours before sunset (after sunrise)
  const elev = h * 9; // 9° an hour: 13° at 16:30, the sun on the horizon at 18:00
  // on from an hour and a half before sunset, gone 40 minutes after
  const k = h > 1.5 ? 0 : h < -0.7 ? 0 : h > 1 ? (1.5 - h) / 0.5 : h < -0.3 ? (h + 0.7) / 0.4 : 1;
  return { k, elev, side: set ? 1 : -1 };
}

const VERT = `varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;
const FRAG = `uniform vec3 uSun; uniform vec3 uHaze; uniform vec3 uTop; uniform vec3 uGlow; uniform float uMix;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y, c = dot(d, uSun);
  vec3 col = mix(uHaze, uTop, smoothstep(0.02, 0.55, h));
  float band = max(dot(normalize(d.xz), normalize(uSun.xz)), 0.0) * (1.0 - smoothstep(0.0, 0.35, h));
  col = mix(col, uGlow, band * band * 0.75); // the band along the horizon under the sun
  col += uGlow * pow(max(c, 0.0), 24.0) * 0.7; // the glow round it
  float disc = smoothstep(0.99955, 0.9997, c) * smoothstep(-0.004, 0.004, h);
  col = mix(col, vec3(1.0, 0.95, 0.78), disc);
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
    gl_FragColor.rgb += uGlow * path * (0.25 + 0.75 * smoothstep(0.3, 1.5, rip)) * uMix * 0.9;
  }
`;

export function createSunsetSky(scene) {
  const uni = {
    uSun: { value: new THREE.Vector3(0, 1, 0) }, uHaze: { value: new THREE.Color() },
    uTop: { value: new THREE.Color(0x4b5b9e) }, uGlow: { value: new THREE.Color(0xffb35c) },
    uMix: { value: 0 }, uTime: { value: 0 },
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
  const warmWater = new THREE.Color(0xd9a3a6);
  const findWater = () => {
    water = scene.getObjectByName('world')?.getObjectByName('water') || false;
    if (!water) return;
    waterColor = water.material.color.clone();
    water.material.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, { uSun: uni.uSun, uGlow: uni.uGlow, uMix: uni.uMix, uTime: uni.uTime });
      sh.vertexShader = 'varying vec3 vSunPos;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vSunPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform vec3 uSun; uniform vec3 uGlow; uniform float uMix; uniform float uTime;\nvarying vec3 vSunPos;\n'
        + sh.fragmentShader.replace('#include <fog_fragment>', GLINT + '#include <fog_fragment>');
    };
    water.material.needsUpdate = true;
  };
  const dir = new THREE.Vector3();
  const offset = DAY_OFFSET.clone();
  let mix = 0;
  return {
    offset, dome,
    get mix() { return mix; },
    // hour: the game's hour; overcast 0-1; sky: weather's sky colour now
    // (the haze at the horizon, so far-off things fade into it); dt: s.
    update(hour, overcast, sky, dt = 0) {
      if (water === null) findWater();
      const { k, elev, side } = sunsetAt(hour);
      mix = k * (1 - overcast);
      const e = THREE.MathUtils.degToRad(Math.max(elev, -4));
      dir.set(WEST.x * side * Math.cos(e), Math.sin(e), WEST.z * Math.cos(e)).normalize();
      uni.uSun.value.copy(dir);
      sky.lerp(HAZE, mix * 0.6); // (the haze warms too: far-off things fade into it)
      uni.uHaze.value.copy(sky);
      uni.uMix.value = mix;
      uni.uTime.value = (uni.uTime.value + dt) % 1000;
      dome.visible = mix > 0.01;
      if (water) water.material.color.copy(waterColor).lerp(warmWater, mix * 0.45);
      // The light: from the low sun (not lower than 14°, so shadows stay on
      // the screen), blended in with the sunset.
      const ly = Math.max(Math.sin(e), 0.25);
      offset.set(dir.x * 130, ly * 130, dir.z * 130).lerp(DAY_OFFSET, 1 - k);
    },
  };
}
