// Textures the GPU has not drawn for a while are let go.
//
// Walking around Seoul uploads every district's textures (signs, people's
// faces, ground) to the GPU, and far districts are only hidden, so the GPU
// kept them all: after a tour a phone held hundreds of MB it wasn't
// drawing, and phones drop the page past their limit. Every material
// stamps the time when it is drawn; now and then textures whose materials
// have not been drawn for IDLE_MS are freed (three.js uploads them again by
// itself if they come back into view: a short hitch, not a missing picture).
// Textures still used by a material drawn recently are kept.
import { Material } from 'three';

export const IDLE_MS = 60_000;
export const SWEEP_MS = 15_000;

let clock = 0; // seconds-ish stamp, moved on by the sweep timer

/** Stamp materials when drawn (Material.prototype.onBeforeRender is empty in three.js). */
export function stampDraws() {
  Material.prototype.onBeforeRender = function () { this.__drawn = clock; };
}

function texturesOf(m, out) {
  for (const v of Object.values(m)) if (v?.isTexture) out.add(v);
  for (const u of Object.values(m.uniforms || {})) if (u?.value?.isTexture) out.add(u.value);
}
// Ones that can't simply be uploaded again: render targets, video.
const keepable = (t) => t.isRenderTargetTexture || t.isVideoTexture || t.userData?.keep;

/** One pass over roots (scenes): frees idle textures; returns how many. */
export function sweep(roots, now, idle = IDLE_MS) {
  const live = new Set(), idleTex = new Set(), mats = new Set();
  for (const r of roots) r?.traverse?.((o) => { for (const m of [o.material].flat()) if (m) mats.add(m); });
  for (const m of mats) {
    if (m.__drawn == null) continue; // never drawn: nothing on the GPU
    texturesOf(m, now - m.__drawn < idle ? live : idleTex);
  }
  let n = 0;
  for (const t of idleTex) {
    if (live.has(t) || keepable(t) || t.__freed) continue;
    t.dispose();
    t.__freed = true;
    n++;
  }
  // Drawn again since being freed: it is back on the GPU.
  for (const t of live) t.__freed = false;
  return n;
}

/** roots(): the scenes to look after. Returns stop(). */
export function createGpuJanitor({ roots, every = SWEEP_MS, idle = IDLE_MS }) {
  stampDraws();
  const t0 = performance.now();
  const tick = setInterval(() => { clock = performance.now() - t0; }, 1000);
  const timer = setInterval(() => {
    clock = performance.now() - t0;
    if (document.hidden) return;
    try { sweep(roots(), clock, idle); } catch (e) { console.warn('gpu janitor', e); }
  }, every);
  return { stop: () => { clearInterval(tick); clearInterval(timer); }, sweepNow: () => sweep(roots(), clock, idle) };
}
