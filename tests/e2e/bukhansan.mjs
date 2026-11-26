// End-to-end check: Bukhansan's Baegundae course. Come out of Bukhansan Ui
// Station, see the mountain load, stand at the way's height at every stop up
// to the flag at the top, and open the painted view there.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/bukhansan.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const bk = JSON.parse(readFileSync(new URL('districts/bukhansan.json', R)));
const [ox, oz] = region.districts.find((d) => d.id === 'bukhansan').offset;
const l = bk.landmarks.find((q) => q.type === 'bukhansan');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'bukhansan');
if (process.env.DAY) await ctx.addInitScript(() => { // the middle of a game day (cycles of 3 h from 0:00 UTC: core/show-clock.js)
  const CYC = 180 * 60000, RD = Date, off = Math.floor(RD.now() / CYC) * CYC + 55 * 60000 - RD.now();
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2ebukhan' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const P = (q) => [ox + l.x + q[0], oz + l.z + q[1]];
const go = async (q, wait = 300) => { await page.evaluate(([x, z]) => __mk.goto(x, z, 0), P(q)); await page.waitForTimeout(wait); };
const yNow = () => page.evaluate(() => __mk.seoulDal().y);
const cam = (c) => page.evaluate((v) => __mk.cam(v), c);

// By the station: the road to the mountain.
await go([-10, 8], 6000); // (the mountain downloads near)
assert(await page.evaluate(() => !!__mk.bukhan?.group), 'the mountain loaded near the station');
await cam({ yaw: Math.PI / 2, pitch: 0.12, dist: 10 });
await page.waitForTimeout(1500);
await shot('1-from-the-station');

// Up the way: at its height at every point.
let worst = 0, n = 0;
for (const t of l.trails) for (let i = 0; i < t.p.length; i += 2) {
  await go(t.p[i], 60);
  worst = Math.max(worst, Math.abs((await yNow()) - t.p[i][2])); n++;
}
assert(worst < 0.6, `standing on the way at its height at ${n} points (worst ${worst.toFixed(2)} m off)`);

// The stops.
const look = async (k, name, c) => {
  const p = l.pads.find((q) => q.k === k);
  await go(p.at, 1500);
  const y = await yNow();
  assert(Math.abs(y - p.y) < 0.2, `${k}: standing at ${y.toFixed(1)} m (pad ${p.y} m)`);
  await cam(c); await page.waitForTimeout(1500); await shot(name);
};
const road = l.trails[0].p;
await go(road[Math.floor(road.length / 2)], 1500);
await cam({ yaw: Math.PI / 2, pitch: 0.15, dist: 9 }); await page.waitForTimeout(1500); await shot('2-valley-road');
await look('center', '3-visitor-center', { yaw: 1.2, pitch: 0.2, dist: 12 });
await look('haru', '4-harujae', { yaw: 0.6, pitch: 0.22, dist: 10 });
await look('hut', '5-baegun-hut', { yaw: 1.4, pitch: 0.2, dist: 11 });
await look('gate', '6-gate', { yaw: 2.4, pitch: 0.15, dist: 8 });
const steps = l.trails.find((t) => t.steps).p;
await go(steps[Math.floor(steps.length / 2)], 1200);
await cam({ yaw: 2.2, pitch: 0.1, dist: 7 }); await page.waitForTimeout(1500); await shot('7-rock-steps');
await look('peak', '8-top', { yaw: 0.4, pitch: 0.3, dist: 9 });
await cam({ yaw: 2.6, pitch: 0.55, dist: 60 }); await page.waitForTimeout(1500); await shot('9-top-from-above');

// The top's own drawing (game/bukhansan-summit.js): the far country all round, the sea of clouds, the wind.
await page.waitForFunction(() => __mk.bukhan.park?.summit?.ready, null, { timeout: 20000 });
assert(await page.evaluate(() => __mk.bukhan.park.summit.open > 0.99), 'at the top the far country, the clouds and the wind are fully shown');
for (const [i, yaw] of [0, Math.PI / 2, Math.PI, -Math.PI / 2].entries()) { await cam({ yaw, pitch: 0.12, dist: 7 }); await page.waitForTimeout(900); await shot(`9${'abcd'[i]}-top-round`); }
await cam({ yaw: 2.9, pitch: 0.3, dist: 16 }); await page.waitForTimeout(900); await shot('9e-top-wide');
console.log('render at the top', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())));
await go(l.pads.find((q) => q.k === 'gate').at, 1200);
assert(await page.evaluate(() => __mk.bukhan.park.summit.open === 0), 'at the gate it is the street as usual');
await go(l.pads.find((q) => q.k === 'peak').at, 1200);

// The view from the top.
const acts = await page.evaluate(() => __mk.bukhan.acts({ x: __mk.me()[0], z: __mk.me()[1] }).map((a) => a.key));
assert(acts.includes('bukhan-view'), 'at the flag: the view\'s button');
await page.evaluate(() => __mk.bukhan.acts({ x: __mk.me()[0], z: __mk.me()[1] })[0].run());
await page.waitForSelector('#bukhan-view', { timeout: 15000 });
await page.waitForTimeout(2500);
assert(await page.evaluate(() => __mk.bukhan.viewOpen), 'the painted view is open');
await shot('10-view-seoul');
const box = await page.locator('#bukhan-view').boundingBox();
await page.mouse.move(box.width / 2, box.height / 2); await page.mouse.down(); await page.mouse.move(box.width / 2 + 420, box.height / 2, { steps: 8 }); await page.mouse.up();
await page.waitForTimeout(600);
await shot('11-view-turned');
await page.click('#bukhan-view-close');
await page.waitForTimeout(300);
assert(!(await page.evaluate(() => __mk.bukhan.viewOpen)) && !(await page.$('#bukhan-view')), 'the view closes');
await go([-30, 12], 1500);
await cam({ yaw: Math.PI / 2, pitch: 0.5, dist: 80 }); await page.waitForTimeout(1500); await shot('12-mountain-from-town');
console.log('render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())), JSON.stringify(await page.evaluate(() => __mk.bukhan?.group?.userData)));
assert(!errors.length, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
