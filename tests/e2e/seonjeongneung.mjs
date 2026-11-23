// End-to-end check: Seonjeongneung. Walk in through the main gate, see the
// tombs load, stand in front of Seolleung's and Jeongneung's shrine halls
// looking up at the tombs, and check you can't walk up a tomb's hill.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/seonjeongneung.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const map = JSON.parse(readFileSync(new URL('districts/seonjeongneung.json', R)));
const [ox, oz] = region.districts.find((d) => d.id === 'seonjeongneung').offset;
const W = (x, z) => [ox + x, oz + z];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'seonjeongneung');
if (process.env.DAY) await ctx.addInitScript(() => {
  const CYC = 180 * 60000, RD = Date, off = Math.floor(RD.now() / CYC) * CYC + 55 * 60000 - RD.now();
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2esjn' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const me = () => page.evaluate(() => __mk.seoulDal());

// From the street outside the main gate, in through it.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), W(4, 3));
await page.waitForTimeout(2500);
await page.evaluate(() => __mk.cam({ yaw: Math.atan2(-4, -3) + Math.PI, pitch: 0.3, dist: 12 }));
await page.waitForTimeout(1000);
await shot('1-main-gate');
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), W(-6.5, -9));
await page.waitForTimeout(6000); // (the tombs' models download when you first walk in)

const halls = map.landmarks.filter((l) => l.type === 'jeongjagak');
const tombs = map.landmarks.filter((l) => l.type === 'royaltomb');
let n = 2;
for (const [i, h] of halls.entries()) {
  // in front of the hall, on its stone path, looking up at the tomb behind it
  const fx = h.x + Math.sin(h.ry) * (h.base[1] / 2 + 6), fz = h.z + Math.cos(h.ry) * (h.base[1] / 2 + 6);
  await page.evaluate(([x, z]) => __mk.goto(x, z, 0), W(fx, fz));
  await page.waitForTimeout(2500);
  await page.evaluate((a) => __mk.cam({ yaw: a, pitch: 0.12, dist: 9 }), h.ry);
  await page.waitForTimeout(1200);
  await shot(`${n++}-${i ? 'jeongneung' : 'seolleung'}-hall`);
  const t = tombs.reduce((b, q) => (Math.hypot(q.x - h.x, q.z - h.z) < Math.hypot(b.x - h.x, b.z - h.z) ? q : b));
  // from the lawn to one side, looking past the hall up at the tomb
  const t0 = tombs.reduce((b, q) => (Math.hypot(q.x - h.x, q.z - h.z) < Math.hypot(b.x - h.x, b.z - h.z) ? q : b));
  const sx = h.x + Math.sin(h.ry) * 9 + Math.cos(h.ry) * 9 * (i ? -1 : 1), sz = h.z + Math.cos(h.ry) * 9 - Math.sin(h.ry) * 9 * (i ? -1 : 1);
  await page.evaluate(([x, z]) => __mk.goto(x, z, 0), W(sx, sz));
  await page.waitForTimeout(1500);
  await page.evaluate((a) => __mk.cam({ yaw: a + Math.PI, pitch: 0.32, dist: 14 }), Math.atan2(t0.x - sx, t0.z - sz));
  await page.waitForTimeout(1200);
  await shot(`${n++}-${i ? 'jeongneung' : 'seolleung'}-tomb`);
  // try to walk straight up the hill: stopped at the fence
  const [tx, tz] = W(t.x, t.z);
  const side = W(h.x + Math.cos(h.ry) * (h.base[0] / 2 + 3), h.z - Math.sin(h.ry) * (h.base[0] / 2 + 3)); // (beside the hall, so it's the hill that stops you)
  await page.evaluate(([x, z]) => __mk.goto(x, z, 0), side);
  await page.waitForTimeout(300);
  await page.evaluate((a) => __mk.face(a), Math.atan2(tx - side[0], tz - side[1]));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(6000); await page.keyboard.up('KeyW');
  const p1 = (await me()).at;
  const left = Math.hypot(p1[0] - tx, p1[1] - tz);
  assert(left > t.mound / 2 + 2, `can't climb ${i ? 'Jeongneung' : 'Seolleung'}'s hill (stopped ${left.toFixed(1)} m from the mound)`);
}
const info = await page.evaluate(() => __mk.renderInfo?.());
if (info) console.log('draw calls inside', info.calls, 'triangles', info.triangles);
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), W(-80, -50));
await page.waitForTimeout(2000);
await page.evaluate(() => __mk.cam({ yaw: Math.PI, pitch: 1.1, dist: 120 }));
await page.waitForTimeout(1500);
await shot(`${n++}-whole-grounds`);
assert(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
