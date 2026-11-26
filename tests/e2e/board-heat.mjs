// How hard a phone works during a board game at the café (Yozi 2026-11-27:
// "the phone got hot playing Find the Skull and Bingo"). One phone-sized
// browser walks into the café and plays against the computer; over each
// stretch we count the frames each WebGL canvas draws and the main thread's
// busy time (CDP Performance metrics).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/board-heat.mjs http://localhost:4173/
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:4173/';
const CALM = !process.env.OLD; // (OLD=1: a build from before 2026-11-27, where taps at a board game still meant 60)
const SECS = +(process.env.SECS || 8);
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await useFakeRealtime(ctx, 'Heat');
const page = await ctx.newPage();
await page.addInitScript((calm) => {
  window.__calm = calm;
  window.__tick = 0;
  const loop = () => { window.__tick++; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  // The share of time a phone would draw at 60 rather than 30 (core/graphics-quality.js:
  // a touch, or the camera moving, in the last 2 s).
  window.__want = { t: 0, t60: 0 };
  let lastActive = -1e9, prev = null, seen = new Float64Array(16);
  for (const ev of ['pointerdown', 'pointermove']) addEventListener(ev, () => { lastActive = performance.now(); }, { capture: true, passive: true });
  const watch = (now) => {
    requestAnimationFrame(watch);
    const m = window.__mk?.cameraRef?.()?.matrixWorld?.elements;
    if (m) for (let i = 0; i < 16; i++) if (Math.abs(m[i] - seen[i]) > 1e-5) { seen[i] = m[i]; lastActive = now; }
    if (prev != null) { const d = now - prev; window.__want.t += d; if (now - lastActive < 2000 && !(window.__calm && document.querySelector('#bg-panel.on'))) window.__want.t60 += d; }
    prev = now;
  };
  requestAnimationFrame(watch);
  window.__gl = new Map();
  for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
    for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const real = P[fn];
      P[fn] = function (...a) {
        const c = this.canvas;
        let s = window.__gl.get(c);
        if (!s) { s = { name: c.className || c.id || 'canvas', frames: 0, calls: 0, last: -1 }; window.__gl.set(c, s); }
        s.calls++;
        if (s.last !== window.__tick) { s.last = window.__tick; s.frames++; }
        return real.apply(this, a);
      };
    }
  }
}, CALM);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));

await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=heat' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn', { timeout: 90000 });
await page.fill('#nickname', 'Heat');
await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible', timeout: 90000 });
await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
await page.evaluate(() => { const w = document.getElementById('welcome-panel'); if (w && !w.hidden) document.getElementById('welcome-close')?.click(); });
await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
await page.evaluate(() => localStorage.setItem('mk.boardPass', JSON.stringify({ until: Date.now() + 3600000 })));
await page.evaluate(() => __mk.enter('dice-and-tea'));
await page.waitForFunction(() => __mk.room()?.id === 'dice-and-tea', null, { timeout: 30000 });
await page.evaluate(() => __mk.place(-5.15, 2.4));
await page.waitForTimeout(12000); // (past the graphics' first 10 s)

// taps: a pointer event on the page every `tap` ms (a player touching cards).
async function measure(label, tap = 0) {
  const t = tap ? await page.evaluate((ms) => setInterval(() => { const o = { bubbles: true, clientX: 200, clientY: 700, pointerType: 'touch' }; document.body.dispatchEvent(new PointerEvent('pointerdown', o)); document.body.dispatchEvent(new PointerEvent('pointerup', o)); }, ms), tap) : null;
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__want.t = 0; window.__want.t60 = 0; });
  const a = await metric();
  const g0 = await page.evaluate(() => [...window.__gl.values()].map((s) => ({ ...s })));
  await page.waitForTimeout(SECS * 1000);
  const b = await metric();
  const g1 = await page.evaluate(() => [...window.__gl.values()].map((s) => ({ ...s })));
  if (t) await page.evaluate((id) => clearInterval(id), t);
  const canv = g1.map((s, i) => { const o = g0[i] || { frames: 0, calls: 0 }; return `${s.name}: ${((s.frames - o.frames) / SECS).toFixed(1)} fps, ${Math.round((s.calls - o.calls) / Math.max(1, s.frames - o.frames))} calls/frame`; }).filter((x) => !/: 0.0 fps/.test(x));
  const want = await page.evaluate(() => window.__want.t60 / Math.max(1, window.__want.t));
  const busy = (b.TaskDuration - a.TaskDuration) / ((b.Timestamp - a.Timestamp)) * 100;
  const sizes = await page.evaluate(() => [...window.__gl.keys()].filter((c) => c.isConnected).map((c) => `${c.className || 'main'} ${c.width}x${c.height}`));
  console.log(`${label.padEnd(30)} phone at 60: ${(want * 100).toFixed(0)}% | main thread ${busy.toFixed(0)}% | ${canv.join(' | ')} | ${sizes.join(', ')}`);
}

await measure('café, standing, hands off');
await measure('café, standing, tapping', 300);

// Find the Skull (thief) at a table with three computers.
await page.evaluate(() => __mk.choices && 0);
const openPanel = async () => {
  await page.waitForFunction(() => [__mk.action(), ...(__mk.choices() || [])].some((l) => /Board games/.test(l || '')), null, { timeout: 15000 });
  await page.evaluate(() => { const i = (__mk.choices() || []).findIndex((l) => /Board games/.test(l)); if (i >= 0) __mk.pick(i); else __mk.act(); });
  await page.waitForSelector('#bg-panel.on [data-game]', { timeout: 20000 });
};
await openPanel();
await page.evaluate(() => { const u = window.__bgUi; u.begin('thief', [u.net.myId, '~', '~', '~'], u.net.myId, 5, null, 2); });
await page.waitForTimeout(3000);
console.log('thief world:', await page.evaluate(() => !!window.__bgUi.play?.world));
await measure('skull at table, hands off');
await measure('skull at table, tapping', 300);
await page.evaluate(() => document.querySelector('#bg-panel .bg-x')?.click());
await page.waitForTimeout(1500);

// Skull in the panel (no table): its own small renderer.
await openPanel();
await page.evaluate(() => { const u = window.__bgUi; u.begin('thief', [u.net.myId, '~', '~', '~'], u.net.myId, 6); });
await page.waitForSelector('#bg-panel canvas.bg-thief3d', { timeout: 15000 });
await measure('skull in panel, hands off');
await measure('skull in panel, tapping', 300);
await page.evaluate(() => document.querySelector('#bg-panel .bg-x')?.click());
await page.waitForTimeout(1500);

// Fish Book Bingo against a computer.
await openPanel();
await page.evaluate(() => { const u = window.__bgUi; u.begin('bingo', [u.net.myId, '~'], u.net.myId, 7); });
await page.waitForTimeout(3000);
await measure('bingo, hands off');
await measure('bingo, tapping', 300);
await browser.close();
