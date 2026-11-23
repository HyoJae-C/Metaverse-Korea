// End-to-end check: Haneul Park and the Nanji Campground. Walk up 하늘길 from
// its foot to the top (standing at the hill's height all the way), see the
// fields load on the top, and sit in a camp chair by a fire.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/nanji.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const nj = JSON.parse(readFileSync(new URL('districts/nanji.json', R)));
const [ox, oz] = region.districts.find((d) => d.id === 'nanji').offset;
const sky = nj.landmarks.find((l) => l.type === 'skypark'), camp = nj.landmarks.find((l) => l.type === 'nanjicamp');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'nanji');
// DAY=1: the clock moved to the middle of a game day (cycles of 3 h from 0:00 UTC: core/show-clock.js), for pictures.
if (process.env.DAY) await ctx.addInitScript(() => {
  const CYC = 180 * 60000, now = Date.now(), off = Math.floor(now / CYC) * CYC + 55 * 60000 - now, RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2enanji' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };

// 하늘길 (north) from its foot: step along it and check the height.
const t = sky.trails[0];
const P = (q) => [ox + sky.x + q[0], oz + sky.z + q[1]];
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), P(t.p[0]));
await page.waitForTimeout(4000); // (the fields and tents download near)
let worst = 0;
for (let i = 1; i < t.p.length; i += 2) {
  const [x, z] = P(t.p[i]);
  await page.evaluate(([a, b]) => __mk.goto(a, b, 0), [x, z]);
  await page.waitForTimeout(120);
  const y = await page.evaluate(() => __mk.seoulDal().y);
  worst = Math.max(worst, Math.abs(y - t.p[i][2]));
}
assert(worst < 0.6, `standing on 하늘길 at its height (worst ${worst.toFixed(2)} m off)`);
const loaded = await page.evaluate(() => !!__mk.nanji?.group);
assert(loaded, 'the park loaded near the hill');

// The muhly field from the top.
const mc = sky.muhly.reduce((s, q) => [s[0] + q[0] / sky.muhly.length, s[1] + q[1] / sky.muhly.length], [0, 0]);
const tc = sky.top.reduce((s, q) => [s[0] + q[0] / sky.top.length, s[1] + q[1] / sky.top.length], [0, 0]);
const stand = [tc[0] * 0.55 + mc[0] * 0.45, tc[1] * 0.55 + mc[1] * 0.45];
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), P(stand));
await page.waitForTimeout(1500);
const yTop = await page.evaluate(() => __mk.seoulDal().y);
assert(Math.abs(yTop - sky.topH) < 0.3, `on the top at ${yTop} m (top ${sky.topH} m)`);
const toMuhly = Math.atan2(mc[0] - stand[0], mc[1] - stand[1]);
await page.evaluate((a) => __mk.cam({ yaw: a + Math.PI, pitch: 0.22, dist: 9 }), toMuhly);
await page.waitForTimeout(1500);
await shot('1-pink-muhly');
await page.evaluate((a) => __mk.cam({ yaw: a, pitch: 0.18, dist: 10 }), toMuhly);
await page.waitForTimeout(1200);
await shot('2-silver-grass-turbines');
await page.evaluate((a) => __mk.cam({ yaw: a + 2.4, pitch: 0.5, dist: 40 }), toMuhly);
await page.waitForTimeout(1500);
await shot('3-top-from-above');

// The campground: sit by a fire.
const [fx, fz] = [ox + camp.x + camp.fires[0][0], oz + camp.z + camp.fires[0][1]];
await page.evaluate(([x, z]) => __mk.goto(x + 3, z + 3, 0), [fx, fz]);
await page.waitForTimeout(2500);
const sat = await page.evaluate(([x, z]) => __mk.sitNear(x, z, 'camp'), [fx, fz]);
await page.waitForTimeout(800);
assert(sat && (await page.evaluate(() => __mk.seated())), 'sat in a camp chair by the fire');
await page.evaluate(() => __mk.cam({ pitch: 0.3, dist: 7 }));
await page.waitForTimeout(1200);
await shot('4-campfire');
await page.evaluate(() => __mk.cam({ pitch: 0.55, dist: 30 }));
await page.waitForTimeout(1200);
await shot('5-campground');
await page.evaluate(() => __mk.stand());
// The hill from the riverside.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [ox + sky.x - 40, oz + sky.z + 150]);
await page.waitForTimeout(2000);
await page.evaluate(() => __mk.cam({ yaw: Math.PI * 0.85, pitch: 0.12, dist: 12 }));
await page.waitForTimeout(1500);
await shot('6-hill-from-river');
const tris = await page.evaluate(() => __mk.renderInfo?.());
console.log('render', JSON.stringify(tris));
assert(!errors.length, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
