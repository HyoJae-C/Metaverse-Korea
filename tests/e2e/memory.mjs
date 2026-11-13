// Memory budget: on a phone-sized screen, how much 2D canvas memory and GPU
// texture memory the game holds once the start square is up. iPhone Safari
// closes the page when canvases pass its limit (a Hong Kong player saw an
// empty city, then "A problem repeatedly occurred"), so CI fails when a
// change pushes either number past its budget, and prints what is biggest.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/memory.mjs http://localhost:4173/
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';

export const BUDGET = { canvasMB: 250, textureMB: 100 }; // (Safari's canvas limit is around 384 MB on many iPhones; keep well under it)

const url = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({
  executablePath: process.env.E2E_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--expose-gc'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await useFakeRealtime(ctx, 'memory'); // (no realtime messages from the live project's quota)
await ctx.addInitScript(() => {
  // 繁體中文: the language with the most glyphs to draw (the friend's).
  try { localStorage.setItem('mk.lang', 'zht'); } catch { /* ignore */ }
  // Every 2D canvas (held weakly, so ones the game let go of drop out) and
  // where it was made.
  const canvases = (window.__memCanvases = []);
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    if (kind === '2d' && !this.__memSeen) {
      this.__memSeen = true;
      const at = (new Error().stack || '').split('\n').slice(2, 4).map((s) => s.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '').replace(/\?[^:)]*/, '')).join(' < ');
      canvases.push({ ref: new WeakRef(this), at });
    }
    return getContext.call(this, kind, ...rest);
  };
  // GPU textures: bytes per texture object (mipmaps add a third), minus
  // deleted ones.
  const tex = (window.__memTextures = new Map());
  const P = WebGL2RenderingContext.prototype;
  const bound = new WeakMap(); // gl -> texture bound to TEXTURE_2D
  const bind = P.bindTexture;
  P.bindTexture = function (target, t) { if (target === this.TEXTURE_2D) bound.set(this, t); return bind.call(this, target, t); };
  const set = (gl, w, h, mip) => { const t = bound.get(gl); if (t && w && h) tex.set(t, w * h * 4 * (mip ? 4 / 3 : 1)); };
  const storage = P.texStorage2D;
  P.texStorage2D = function (target, levels, fmt, w, h) { if (target === this.TEXTURE_2D) set(this, w, h, levels > 1); return storage.apply(this, arguments); };
  const image = P.texImage2D;
  P.texImage2D = function (target, level, ...a) {
    if (target === this.TEXTURE_2D && level === 0) {
      const src = a[a.length - 1];
      const [w, h] = a.length >= 7 ? [a[1], a[2]] : [src?.width, src?.height];
      set(this, w, h, false);
    }
    return image.call(this, target, level, ...a);
  };
  const del = P.deleteTexture;
  P.deleteTexture = function (t) { tex.delete(t); return del.call(this, t); };
});

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=mem' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.waitForTimeout(15000); // passers-by, posters and models arrive over the first seconds

const r = await page.evaluate(() => {
  window.gc?.();
  const live = window.__memCanvases.map((c) => ({ c: c.ref.deref(), at: c.at })).filter((c) => c.c);
  const by = new Map();
  let canvas = 0;
  for (const { c, at } of live) {
    const b = c.width * c.height * 4;
    canvas += b;
    const e = by.get(at) || { n: 0, b: 0, size: `${c.width}x${c.height}` };
    e.n++; e.b += b; by.set(at, e);
  }
  let texture = 0;
  for (const b of window.__memTextures.values()) texture += b;
  const top = [...by].sort((a, b) => b[1].b - a[1].b).slice(0, 12)
    .map(([at, e]) => `${(e.b / 1e6).toFixed(1).padStart(6)} MB  ${String(e.n).padStart(4)} × ${e.size.padEnd(10)} ${at}`);
  return { canvasMB: canvas / 1e6, textureMB: texture / 1e6, canvases: live.length, textures: window.__memTextures.size, top };
});
await browser.close();

console.log(`2D canvases: ${r.canvasMB.toFixed(0)} MB in ${r.canvases} (budget ${BUDGET.canvasMB} MB)`);
console.log(`GPU textures: ${r.textureMB.toFixed(0)} MB in ${r.textures} (budget ${BUDGET.textureMB} MB)`);
console.log('Biggest canvas makers:\n' + r.top.join('\n'));
if (errors.length) console.log('Page errors:\n' + errors.join('\n'));
const over = [];
if (r.canvasMB > BUDGET.canvasMB) over.push(`2D canvases ${r.canvasMB.toFixed(0)} MB > ${BUDGET.canvasMB} MB`);
if (r.textureMB > BUDGET.textureMB) over.push(`GPU textures ${r.textureMB.toFixed(0)} MB > ${BUDGET.textureMB} MB`);
if (over.length) {
  console.error('\nMemory budget exceeded (iPhone Safari closes the page past its canvas limit): ' + over.join('; ')
    + '\nShrink or share the biggest textures above, or build them only near the player.');
  process.exit(1);
}
console.log('Memory budget OK');
