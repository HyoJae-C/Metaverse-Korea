// End-to-end check: Dalmaji Park by Oksu Station. Walk up the entrance
// stairs from Ttukseom-ro (standing at their height all the way), see the
// park load, stand on Photo Island A and look over the Han.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/oksu.mjs http://localhost:4173/ [screenshot dir]
// SPRING=1 moves the date to April, for the forsythia in bloom.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const ok = JSON.parse(readFileSync(new URL('districts/oksu.json', R)));
const [ox, oz] = region.districts.find((d) => d.id === 'oksu').offset;
const l = ok.landmarks.find((q) => q.type === 'dalmaji');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'oksu');
// DAY=1: the middle of a game day; SPRING=1: an April day (cycles of 3 h from 0:00 UTC: core/show-clock.js).
if (process.env.DAY || process.env.SPRING) await ctx.addInitScript((spring) => {
  const CYC = 180 * 60000, RD = Date, base = spring ? RD.UTC(2027, 3, 6, 3) : RD.now();
  const off = Math.floor(base / CYC) * CYC + 55 * 60000 - RD.now();
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
}, !!process.env.SPRING);
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2eoksu' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const P = (q) => [ox + l.x + q[0], oz + l.z + q[1]];

// The entrance stairs, from the road up.
const t = l.trails.find((q) => q.id === 1548280367);
const up = t.p.slice().reverse();
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), P(up[0]));
await page.waitForTimeout(5000); // (the woods and railings download near)
assert(await page.evaluate(() => !!__mk.oksu?.group), 'the park loaded near the hill');
const toUp = Math.atan2(up[3][0] - up[0][0], up[3][1] - up[0][1]);
await page.evaluate((a) => __mk.cam({ yaw: a + Math.PI, pitch: 0.18, dist: 8 }), toUp);
await page.waitForTimeout(1500);
await shot('1-entrance-stairs');
let worst = 0;
for (let i = 1; i < up.length; i++) {
  const [x, z] = P(up[i]);
  await page.evaluate(([a, b]) => __mk.goto(a, b, 0), [x, z]);
  await page.waitForTimeout(120);
  const y = await page.evaluate(() => __mk.seoulDal().y);
  worst = Math.max(worst, Math.abs(y - up[i][2]));
}
assert(worst < 0.6, `standing on the entrance stairs at their height (worst ${worst.toFixed(2)} m off)`);

// Photo Island A, looking over the Han.
const a = l.islands.find((i) => /A$/.test(i.name)) || l.islands[0];
const c = [a.at[0] + Math.sin(a.ry) * 2, a.at[1] + Math.cos(a.ry) * 2];
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), P(c));
await page.waitForTimeout(1500);
const yI = await page.evaluate(() => __mk.seoulDal().y);
assert(Math.abs(yI - a.y) < 0.2, `on Photo Island A at ${yI} m (deck ${a.y} m)`);
await page.evaluate((r) => __mk.cam({ yaw: r + Math.PI, pitch: 0.12, dist: 6 }), a.ry);
await page.waitForTimeout(1500);
await shot('2-photo-island-han');
await page.evaluate((r) => __mk.cam({ yaw: r, pitch: 0.25, dist: 9 }), a.ry);
await page.waitForTimeout(1200);
await shot('3-deck-from-island');
// The top, by the gazebos.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), P(l.trails.reduce((b, q) => q.p.reduce((bb, p) => (p[2] > bb[2] ? p : bb), b), [0, 0, -1])));
await page.waitForTimeout(1500);
await page.evaluate(() => __mk.cam({ yaw: 2.4, pitch: 0.3, dist: 10 }));
await page.waitForTimeout(1200);
await shot('4-top');
// The whole hill from above, and from Ttukseom-ro.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), P([-30, 20]));
await page.waitForTimeout(1200);
await page.evaluate(() => __mk.cam({ yaw: Math.PI * 0.8, pitch: 0.75, dist: 70 }));
await page.waitForTimeout(1500);
await shot('5-park-from-above');
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), P([-20, 18]));
await page.waitForTimeout(1200);
await page.evaluate(() => __mk.cam({ yaw: Math.PI * 0.8, pitch: 0.1, dist: 14 }));
await page.waitForTimeout(1500);
await shot('6-hill-from-road');
const tris = await page.evaluate(() => __mk.renderInfo?.());
console.log('render', JSON.stringify(tris), JSON.stringify(await page.evaluate(() => __mk.oksu?.group?.userData)));
assert(!errors.length, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
