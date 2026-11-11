// Brick courses drawn on a plain coloured material (Myeongdong Cathedral and
// the walls of its hill): staggered rows with light mortar between, each
// brick a shade lighter or darker, in the mesh's own metres, so it needs no
// UVs or texture file and still works after mergeStatic. Walls get rows
// across their face; tops (normal up) are left plain. The lines fade out
// where a brick gets smaller than a few pixels, so far walls don't shimmer.
// w, h: one brick with its mortar (metres); mortar: the joint's width.
export function addBrickPattern(material, { w = 0.5, h = 0.2, mortar = 0.035, joint = '0.80, 0.76, 0.70' } = {}) {
  if (!material || material.userData.bricks) return material;
  material.userData.bricks = true;
  const prev = material.onBeforeCompile;
  const prevKey = material.customProgramCacheKey?.bind(material);
  const f = (v) => v.toFixed(3);
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBrickP;
        varying vec3 vBrickN;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vBrickP = transformed;
        vBrickN = objectNormal;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vBrickP;
        varying vec3 vBrickN;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec3 N = normalize(vBrickN);
          if (abs(N.y) < 0.6) {
            vec2 t = normalize(vec2(-N.z, N.x) + vec2(1e-5, 0.0));
            float u = dot(vBrickP.xz, t) / ${f(w)}, v = vBrickP.y / ${f(h)};
            float row = floor(v);
            u += 0.5 * mod(row, 2.0);
            vec2 cell = vec2(fract(u), fract(v));
            vec2 fw = max(fwidth(vec2(u, v)), vec2(1e-4));
            vec2 mw = vec2(${f(mortar / w)}, ${f(mortar / h)});
            vec2 line = 1.0 - smoothstep(mw, mw + fw, cell) + smoothstep(1.0 - fw, vec2(1.0), cell);
            float fade = 1.0 - smoothstep(0.22, 0.5, max(fw.x, fw.y));
            float shade = 0.92 + 0.16 * fract(sin(dot(vec2(floor(u), row), vec2(12.9898, 78.233))) * 43758.5453);
            diffuseColor.rgb *= mix(1.0, shade, fade);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${joint}), clamp(max(line.x, line.y), 0.0, 1.0) * fade * 0.85);
          }
        }`);
  };
  material.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|bricks${w},${h},${mortar}`;
  material.needsUpdate = true;
  return material;
}
