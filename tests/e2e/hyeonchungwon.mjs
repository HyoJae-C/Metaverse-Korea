// End-to-end check: Seoul National Cemetery. Come in by the main gate (the
// note shows), cross the lawn to Hyeonchungmun, walk through it and up the
// terrace's stairs, lay a flower before the Memorial Tower, then walk a road
// up between the burial plots at the ground's height.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/hyeonchungwon.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const hc = JSON.parse(readFileSync(new URL('districts/hyeonchungwon.json', R)));
const [ox, oz] = region.districts.find((d) => d.id === 'hyeonchungwon').offset;
const l = hc.landmarks.find((q) => q.type === 'hyeonchung');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'hyeonchungwon');
// DAY=1: the middle of a game day (cycles of 3 h from 0:00 UTC: core/show-clock.js).
// DAY=150: that minute of the cycle instead (150: night).
if (process.env.DAY) await ctx.addInitScript((min) => {
  const CYC = 180 * 60000, RD = Date, off = Math.floor(RD.now() / CYC) * CYC + min * 60000 - RD.now();
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
}, +process.env.DAY > 1 ? +process.env.DAY : 55);
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2ehc' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const P = (q) => [ox + l.x + q[0], oz + l.z + q[1]];
const go = async (q, wait = 1200) => { await page.evaluate(([x, z]) => __mk.goto(x, z, 0), P(q)); await page.waitForTimeout(wait); };
const cam = async (o, wait = 1200) => { await page.evaluate((c) => __mk.cam(c), o); await page.waitForTimeout(wait); };
const me = () => page.evaluate(() => { const p = __mk.seoulDal(); return { x: p.at[0], y: p.y, z: p.at[1] }; });
const front = l.gate.ry, fx = Math.sin(front), fz = Math.cos(front);

// The main gate on Hyeonchung-ro.
const g = l.mainGate;
await go([g.at[0] + Math.sin(g.ry) * 5, g.at[1] + Math.cos(g.ry) * 5], 6000); // (the grounds download near)
assert(await page.evaluate(() => !!__mk.hyeonchungwon?.group), 'the grounds loaded near');
await cam({ yaw: g.ry, pitch: 0.2, dist: 12 }, 1500);
await shot('1-main-gate');
// The fountain.
await go([l.fountain.at[0] + 9, l.fountain.at[1] - 6]);
await cam({ yaw: Math.atan2(9, -6), pitch: 0.2, dist: 9 });
await shot('2-fountain');
await cam({ yaw: Math.atan2(9, -6), pitch: 0.05, dist: 5 });
await shot('2b-fountain-close');
// The lawn, looking at Hyeonchungmun.
await go([fx * 34, fz * 34]);
assert(Math.abs((await me()).y) < 0.05, 'the lawn is level');
await cam({ yaw: front, pitch: 0.12, dist: 10 });
await shot('3-gate-from-lawn');
await go([fx * 12, fz * 12]);
await cam({ yaw: front, pitch: 0.1, dist: 7 });
await shot('4-gate-close');
await cam({ yaw: front, pitch: -0.3, dist: 7 });
await shot('4c-gate-look-up');
await cam({ yaw: front, pitch: 0.1, dist: 7 });
await go([fx * 9 + fz * 9, fz * 9 - fx * 9]);
await cam({ yaw: front + 0.75, pitch: 0.05, dist: 6 });
await shot('4b-gate-side');
// Through the gate: walk from the forecourt to the corridor behind it.
await go([fx * 9, fz * 9], 600);
await cam({ yaw: front, pitch: 0.25, dist: 7 }, 1500);
await page.keyboard.down('KeyW');
await cam({ yaw: front, pitch: 0.25, dist: 7 }, 100);
let through = await me(), u = -9;
for (let k = 0; k < 16 && u <= 2.5; k++) { // (a slow machine walks slowly: up to 16 s)
  await page.waitForTimeout(1000);
  through = await me();
  u = -((through.x - ox - l.x) * fx + (through.z - oz - l.z) * fz);
}
await page.keyboard.up('KeyW');
assert(u > 2, `walked through the gate's open hall (${u.toFixed(1)} m past its middle)`);
await shot('5-through-gate');
await go([0, 0], 800);
assert(Math.abs((await me()).y - 0.45) < 0.05, `standing on the gate's stone floor (${(await me()).y.toFixed(2)} m)`);
assert((await page.evaluate(() => __mk.hyeonchungwon.group.userData.counts.guards)) === 2, 'two honour guards at the gate');
await cam({ yaw: front, pitch: 0.12, dist: 5 }, 1200);
await shot('5b-on-gate-floor');
await go([fx * 7, fz * 7], 800);
await cam({ yaw: front, pitch: 0.02, dist: 5 }, 1200);
await shot('5c-guards');
await go([fx * 5.6 - fz * 2.2, fz * 5.6 + fx * 2.2], 800);
await cam({ yaw: front + 0.5, pitch: 0.1, dist: 2.2 }, 1200); // (close by a guard: the cap sits on the head)
await shot('5d-guard-close');
// The terrace: up the stairs, at the altar.
const [sa, sb] = l.stairs.p;
await go([(sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2], 500);
const mid = (await me()).y;
assert(mid > 0.2 && mid < l.tribute.y - 0.2, `on the terrace's stairs at ${mid.toFixed(2)} m`);
await go(l.tribute.at);
assert(Math.abs((await me()).y - l.tribute.y) < 0.05, `on the terrace at ${l.tribute.y} m`);
await cam({ yaw: front, pitch: 0.3, dist: 9 });
await shot('6-tower');
await go([l.tribute.at[0] + fx * 9, l.tribute.at[1] + fz * 9]);
await cam({ yaw: front, pitch: 0.12, dist: 9 });
await shot('6b-tower-level');
await cam({ yaw: front, pitch: -0.32, dist: 9 });
await shot('6c-tower-look-up');
await go(l.tribute.at);
await cam({ yaw: front, pitch: 0.3, dist: 9 });
const label = await page.evaluate(() => document.querySelector('#action-btn')?.textContent || '');
assert(/incense|분향/i.test(label), `the action here is the tribute ("${label}")`);
await page.keyboard.press('Space');
await page.waitForTimeout(1500);
assert(await page.evaluate(() => __mk.hyeonchungwon.group.getObjectByName('hyeonchung-incense').visible), 'incense burns at the altar');
await cam({ yaw: front + 2.4, pitch: 0.25, dist: 5 });
await shot('7-tribute');
await cam({ yaw: front, pitch: 0.12, dist: 4.5 }, 1200);
await shot('7b-verse');
await go([fx * 16, fz * 16]);
await cam({ yaw: front, pitch: -0.2, dist: 14 }, 1500);
await shot('7c-tower-sky');
assert(await page.evaluate(() => ['hyeonchung-sun', 'hyeonchung-moon'].every((n) => { const o = __mk.hyeonchungwon.group.getObjectByName(n); return o && o.visible && o.material.opacity > 0.1; })), 'the sun and the moon stand over the ridge');
await page.addStyleTag({ content: '#hud{opacity:0!important}' });
await shot('7d-sun-moon');
await cam({ yaw: front + Math.PI, pitch: 0.2, dist: 16 }, 1500);
await shot('8-tower-from-behind');
// A road between the plots, at the ground's height.
const road = l.trails.filter((t) => t.k === 'service').sort((a, b) => Math.max(...b.p.map((q) => q[2])) - Math.max(...a.p.map((q) => q[2])))[0];
let worst = 0;
for (const q of road.p.filter((_, i) => i % 3 === 0)) { await go(q, 120); worst = Math.max(worst, Math.abs((await me()).y - q[2])); }
assert(worst < 0.6, `standing on a hill road at its height (worst ${worst.toFixed(2)} m off)`);
const plot = l.plots.slice().sort((a, b) => b.p.length - a.p.length)[0];
const lane = l.trails.filter((t) => t.k === 'service' && t.p.length > 3).map((t) => ({ t, q: t.p[Math.floor(t.p.length / 2)] })).sort((a, b) => Math.hypot(a.q[0] + 60, a.q[1] + 10) - Math.hypot(b.q[0] + 60, b.q[1] + 10))[0];
await go(lane.q);
await cam({ yaw: 0.6, pitch: 0.22, dist: 9 });
await shot('9-plots');
void plot;
await go([-20, 95]);
await cam({ yaw: 2.2, pitch: 0.3, dist: 14 });
await shot('10-plots-east');
// From above.
await go([0, 10]);
await cam({ yaw: front, pitch: 0.8, dist: 90 }, 2000);
await shot('11-from-above');
await go(l.tribute.at);
await cam({ yaw: front, pitch: 1.45, dist: 85 }, 2000); // straight down on the tower: the court is the same on both sides, with trees round the terrace
await shot('11b-tower-above');
await cam({ yaw: front, pitch: 0.62, dist: 150 }, 2000);
await shot('11c-tower-front');
await cam({ yaw: front + Math.PI, pitch: 0.62, dist: 150 }, 2000);
await shot('11d-tower-behind');
await go([0, 0]);
await cam({ yaw: front, pitch: 0.62, dist: 150 }, 2000);
await shot('11e-gate-front');
const lw = l.flats.find((f) => f.k === 'lawn').p, lc = [lw.reduce((q, v) => q + v[0], 0) / lw.length, lw.reduce((q, v) => q + v[1], 0) / lw.length];
await go(lc);
await cam({ yaw: front, pitch: 0.7, dist: 150 }, 2000);
await shot('11f-lawn');
await go([-60, 60]);
await cam({ yaw: front, pitch: 1.0, dist: 260 }, 2500);
await shot('12-whole');
await go([0, 10]);
await cam({ yaw: front, pitch: 0.28, dist: 130 }, 2500);
await shot('13-ridge');
const counts = await page.evaluate(() => __mk.hyeonchungwon?.group?.userData.counts);
assert(!counts?.woodTris && counts?.belt > 60, `bare slopes behind (no treetop mesh) and ${counts?.belt} trees round the court`);
console.log('render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())), JSON.stringify(counts));
// The memorials: each stands by its way; you look at it from the way and cannot walk into it.
for (const m of l.memorials || []) {
  const d = m.size[1] / 2 + 2; // (on the way before it)
  await go([m.at[0] + Math.sin(m.ry) * d, m.at[1] + Math.cos(m.ry) * d]);
  await cam({ yaw: m.ry, pitch: 0.1, dist: 4.5 });
  await shot('14-memorial-' + m.id);
  if (S) { await cam({ yaw: m.ry, pitch: 1.25, dist: 20 }); await shot('14-memorial-' + m.id + '-above'); console.log(m.id, JSON.stringify(await me()), JSON.stringify(P([m.at[0] + Math.sin(m.ry) * d, m.at[1] + Math.cos(m.ry) * d]))); }
}
assert(!errors.length, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
