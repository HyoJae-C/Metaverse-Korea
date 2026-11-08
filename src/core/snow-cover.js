// Snow that settles on the street when it snows, and melts after.
// No extra geometry: the ground, roads, lawns, roofs and tree tops are
// whitened in their own shader, only where they face the sky, in soft
// patches that join up as the snow gets deeper. One shared number (0-1)
// says how deep it is, so it costs nothing per frame.
//
// The depth comes from the shared weather clock (core/weather.js), so
// everyone sees the same white street at the same moment.

// Snow shows its first patches in under a minute and covers everything in
// SETTLE_MS; once it stops it takes MELT_MS to be gone.
export const SETTLE_MS = 4 * 60 * 1000;
export const MELT_MS = 6 * 60 * 1000;

// How deep the snow is (0 bare - 1 white) at nowMs, from the weather of this
// slot and the one before. slotMs/rolled come from weather.js (passed in to
// keep this file free of three.js-less imports in tests).
export function snowDepth(nowMs, slotMs, rolled) {
  const start = Math.floor(nowMs / slotMs) * slotMs;
  const t = nowMs - start;
  const before = rolled(start - 1) === 'snow' ? 1 : 0; // a 30-minute slot is longer than settling or melting
  return rolled(nowMs) === 'snow'
    ? Math.min(1, before + t / SETTLE_MS)
    : Math.max(0, before - t / MELT_MS);
}

// The one uniform every snowy material reads.
export const snowUniform = { value: 0 };

// Make a material take snow. strength: how white it gets when fully covered
// (roads a bit less: tyres and feet keep tracks open).
export function addSnowCover(material, strength = 0.95) {
  if (!material || material.userData.snowCover) return material;
  material.userData.snowCover = true;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey?.bind(material);
  const s = strength.toFixed(2);
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uSnow = snowUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying float vSnowUp;
        varying vec2 vSnowXZ;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        // world-space "up-ness" from the view-space normal (instancing included)
        vSnowUp = (vec4(transformedNormal, 0.0) * viewMatrix).y;
        vec4 snowWp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          snowWp = instanceMatrix * snowWp;
        #endif
        vSnowXZ = (modelMatrix * snowWp).xz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uSnow;
        varying float vSnowUp;
        varying vec2 vSnowXZ;
        float snowHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float snowNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(snowHash(i), snowHash(i + vec2(1.0, 0.0)), f.x),
                     mix(snowHash(i + vec2(0.0, 1.0)), snowHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (uSnow > 0.001) {
          float up = smoothstep(0.45, 0.85, gl_FrontFacing ? vSnowUp : -vSnowUp);
          float n = 0.65 * snowNoise(vSnowXZ * 0.18) + 0.35 * snowNoise(vSnowXZ * 0.9);
          float fine = snowNoise(vSnowXZ * 2.5);
          // even fully covered, a hint of what's underneath shows through in places
          float cover = smoothstep(0.0, 0.22, uSnow * 1.3 - n) * up * ${s} * (0.82 + 0.18 * fine);
          vec3 snowCol = vec3(0.8, 0.84, 0.9) * (0.95 + 0.05 * fine);
          diffuseColor.rgb = mix(diffuseColor.rgb, snowCol, cover);
        }`);
  };
  material.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|snow' + s;
  material.needsUpdate = true;
  return material;
}

// Give snow to everything already standing in the street scene (the ground,
// paving, roofs, landmarks, shop fronts...). Called once the street is built,
// before people arrive; anything marked userData.noSnow (characters, pets)
// and its children is left alone, and so are skinned models, particles and
// lines. Indoors the shared depth is set to 0 (main.js), so a material that
// is also used inside a shop never shows snow there.
const SNOWY = new Set(['MeshLambertMaterial', 'MeshPhongMaterial', 'MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshToonMaterial']); // (unlit Basic has no normals to tell up from side)
export function coverScene(root) {
  let n = 0;
  const walk = (o) => {
    if (o.userData?.noSnow || o.name === 'precip' || o.name === 'water') return;
    if (o.isMesh && !o.isSkinnedMesh) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m && SNOWY.has(m.type) && !m.transparent && !m.userData.snowCover) { addSnowCover(m, o.name === 'roads' ? 0.8 : 0.95); n++; }
      }
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  return n;
}
