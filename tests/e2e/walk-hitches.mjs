// Measuring tool (not in CI): walk a route at walking speed, record every
// frame's gap and where you were, plus a CPU profile, to find the stops you
// feel while walking (Yozi 2026-11-25: "강남역에서 나와 걸으면 버벅").
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/walk-hitches.mjs http://localhost:4173/ out.json "x,z x,z ..." [m/s]
//   (PHONE=1: a phone-sized screen; THROTTLE=4: a 4x slower CPU while walking.)
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const url = process.argv[2], out = process.argv[3];
const route = process.argv[4].trim().split(/\s+/).map((s) => s.split(',').map(Number));
const speed = +(process.argv[5] || 5);
const phone = process.env.PHONE === '1';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 760 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept());
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(url + '?debug&room=walk' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn'); await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
for (let i = 0; i < 2; i++) { await page.evaluate(([x, z]) => __mk.place(x, z), route[0]); await page.waitForTimeout(6000); }
const cdp = await ctx.newCDPSession(page);
if (process.env.THROTTLE) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE });
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
await cdp.send('Profiler.start');
const fr = await page.evaluate(([route, speed]) => new Promise((done) => {
  const fr = []; let last = performance.now(), seg = 0, s = 0;
  const step = (t) => {
    const dt = Math.min(0.1, (t - last) / 1000);
    fr.push([Math.round(t), Math.round(t - last)]); last = t;
    let move = speed * dt;
    while (move > 0 && seg < route.length - 1) {
      const [ax, az] = route[seg], [bx, bz] = route[seg + 1], L = Math.hypot(bx - ax, bz - az);
      if (s + move < L) { s += move; move = 0; } else { move -= L - s; s = 0; seg++; }
    }
    if (seg >= route.length - 1) { done(fr); return; }
    const [ax, az] = route[seg], [bx, bz] = route[seg + 1], L = Math.hypot(bx - ax, bz - az) || 1;
    const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L;
    __mk.place(x, z); __mk.cam({ yaw: Math.atan2(-(bx - ax), -(bz - az)) });
    fr[fr.length - 1].push(Math.round(x), Math.round(z));
    if (fr.length % 60 === 1) { const g = __mk.graphics(), ri = __mk.renderInfo(); fr[fr.length - 1].push(g.level, g.ratio, g.fps, ri.calls, Math.round(ri.frameTris / 1000)); }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}), [route, speed]);
const { profile } = await cdp.send('Profiler.stop');
writeFileSync(out, JSON.stringify({ fr, profile }));
const gaps = fr.map((f) => f[1]).sort((a, b) => a - b);
const big = fr.filter((f) => f[1] > 150);
console.log('frames', fr.length, 'median', gaps[gaps.length >> 1], 'p95', gaps[Math.floor(gaps.length * 0.95)], 'max', gaps[gaps.length - 1], '>150ms', big.length);
console.log(big.map((f) => `${f[1]}ms@${f[2]},${f[3]}`).join(' '));
await browser.close();
