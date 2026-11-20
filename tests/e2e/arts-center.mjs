// End-to-end check: Seoul Arts Center. Stand on the plaza and look at the
// Opera House and the Music Hall, walk into the Opera Theater, sit down and
// watch the show.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/arts-center.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const ac = JSON.parse(readFileSync(new URL('districts/arts-center.json', R)));
const [ox, oz] = region.districts.find((d) => d.id === 'arts-center').offset;
const L = ac.landmarks.find((l) => l.type === 'artscenter');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'arts');
// DAY=1: the clock moved to the middle of a game day (cycles of 3 h from 0:00 UTC: core/show-clock.js), for pictures.
if (process.env.DAY) await ctx.addInitScript(() => {
  const CYC = 180 * 60000, now = Date.now(), off = Math.floor(now / CYC) * CYC + 55 * 60000 - now, RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2earts' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const W = ([x, z]) => [ox + x, oz + z];
const look = async (at, to, dist = 12, pitch = 0.16, wait = 1500) => {
  await page.evaluate(([x, z]) => __mk.goto(x, z, 0), W(at));
  await page.waitForTimeout(600);
  await page.evaluate(([yaw, pitch, dist]) => __mk.cam({ yaw, pitch, dist }), [Math.atan2(to[0] - at[0], to[1] - at[1]) + Math.PI, pitch, dist]);
  await page.waitForTimeout(wait);
};

// The Opera House from the lawn.
const O = L.opera, lawn = [O.at[0] + Math.sin(O.face) * (O.r + 9), O.at[1] + Math.cos(O.face) * (O.r + 9)];
const out = [O.at[0] + Math.sin(O.face) * (O.r + 30), O.at[1] + Math.cos(O.face) * (O.r + 30)];
await look(out, O.at, 14, 0.1, 5000);
await shot('1-opera-house');
await look(ac.doors.plaza, [L.music.door[0] - 20, L.music.door[1] - 6], 16, 0.14);
await shot('2-music-hall');
await look(ac.doors.gate, ac.doors.plaza, 30, 0.5);
await shot('3-from-the-gate');
await look(lawn, O.at, 60, 0.75);
await shot('4-from-above');
const blocked = await page.evaluate(([x, z]) => __mk.blocked?.(x, z), W(O.at));
if (blocked != null) assert(blocked, 'the Opera House is solid');
const info = await page.evaluate(() => __mk.renderInfo?.());
console.log('street render', JSON.stringify(info));
if (process.env.OUTSIDE) { assert(!errors.length, `no page errors ${errors.slice(0, 3).join(' | ')}`); await browser.close(); process.exit(); }
