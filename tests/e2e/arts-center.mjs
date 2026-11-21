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

// Inside the Opera Theater.
await page.evaluate(() => __mk.enter('arts-opera-theater'));
await page.waitForFunction(() => __mk.stage?.(), null, { timeout: 30000 });
await page.waitForTimeout(1500);
const waitPart = (part, t = 0) => page.waitForFunction(([p, t]) => { const s = __mk.stage(); return s && s.part === p && s.t >= t; }, [part, t], { timeout: 120000 });
const view = async (o, wait = 400) => { await page.evaluate((o) => __mk.cam(o), o); await page.waitForTimeout(wait); };
const seat = await page.evaluate(() => __mk.sitNear(0, 6));
assert(seat, 'a free seat in the stalls');
await view({ yaw: 0, pitch: 0.12, dist: 5 }); // (yaw 0 looks at the stage)
assert(await page.isVisible('.ui-eye'), 'the eye button is there in the Opera Theater');
await page.click('.ui-eye');
assert(await page.evaluate(() => document.documentElement.classList.contains('ui-hidden') && getComputedStyle(document.querySelector('.top-right')).display === 'none'), 'it hides the buttons');
await page.click('.ui-eye');
assert(await page.evaluate(() => [...document.querySelectorAll('#labels > *')].every((e) => !/Conductor|Pianist/.test(e.textContent) || getComputedStyle(e).display === 'none')), 'no name tag on the conductor');
await waitPart('walkIn', 3.4);
await shot('5-conductor-bows');
await waitPart('play', 6);
await shot('6-the-show-from-a-seat');
const s1 = await page.evaluate(() => __mk.stage());
assert(s1.part === 'play' && s1.notes > 10, `the orchestra is playing (${s1.piece}, ${s1.notes} notes)`);
await view({ yaw: 0, pitch: 0.5, dist: 16 });
await shot('7-the-house');
// Each note is played once: the count over 8 seconds is the score's.
{
  const { OPERA_PROGRAM } = await import('../../src/data/opera-scores.js');
  const a = await page.evaluate(() => __mk.stage());
  await page.waitForTimeout(8000);
  const b = await page.evaluate(() => __mk.stage());
  const sc = OPERA_PROGRAM.find((p) => p.id === a.piece), beat = 60 / sc.bpm;
  const due = (t0, t1) => sc.voices.reduce((n, v) => n + v.n.filter(([x]) => x * beat >= t0 && x * beat < t1).length, 0);
  const lo = due(a.t + 0.6, b.t), hi = due(a.t, b.t + 0.6);
  assert(b.piece === a.piece && b.notes - a.notes >= lo && b.notes - a.notes <= hi, `8 s of ${a.piece}: ${b.notes - a.notes} notes played, the score has ${lo} to ${hi}`);
}
await page.keyboard.press('e');
await page.waitForTimeout(600);
await page.evaluate(() => __mk.goto(0, -4.6, 0));
await waitPart('play', 14);
await view({ yaw: 0, pitch: 0.42, dist: 3.2 }, 800);
await shot('8-the-pit-and-the-dance');
await waitPart('play', 30);
await view({ yaw: 0.5, pitch: 0.3, dist: 2.4 }, 800);
await shot('8b-the-dance');
await page.evaluate(() => __mk.goto(0, -3, 0));
await view({ yaw: Math.PI, pitch: 0.2, dist: 6 }, 800);
await shot('9-the-balconies');
console.log('room render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())));
if (!process.env.QUICK) { await waitPart('clap', 3); await page.evaluate(() => __mk.goto(0, -4.6, 0)); await view({ yaw: 0, pitch: 0.3, dist: 3 }); await shot('10-curtain-call'); }

// Inside the Concert Hall.
if (!process.env.OPERA_ONLY) {
  await page.evaluate(() => __mk.leave?.());
  await page.waitForTimeout(1200);
  await page.evaluate(() => __mk.enter('arts-concert-hall'));
  await page.waitForFunction(() => __mk.stage?.(), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  assert(await page.evaluate(() => __mk.sitNear(0, 4)), 'a free seat in the Concert Hall');
  await view({ yaw: 0, pitch: 0.2, dist: 6 });
  await waitPart('play', 5);
  await shot('11-concert-from-a-seat');
  const c1 = await page.evaluate(() => __mk.stage());
  assert(c1.part === 'play' && c1.notes > 5, `the concert is playing (${c1.piece}, ${c1.notes} notes)`);
  await page.keyboard.press('e');
  await page.waitForTimeout(600);
  await page.evaluate(() => __mk.goto(0, -3, 0));
  await view({ yaw: 0, pitch: 0.45, dist: 4 }, 800);
  await shot('12-the-orchestra');
  await view({ yaw: 0.7, pitch: 0.3, dist: 3 }, 800);
  await shot('13-the-piano-side');
  await view({ yaw: Math.PI, pitch: 0.25, dist: 7 }, 800);
  await shot('14-the-house');
  await page.evaluate(() => __mk.goto(4.55, 8, 0));
  await view({ yaw: 0, pitch: 0.6, dist: 7 }, 800);
  await shot('15-the-whole-hall');
  const behind = await page.evaluate(() => __mk.sitNear(9, -17));
  assert(behind && behind[1] < -15, 'a free seat behind the stage');
  await view({ yaw: Math.PI, pitch: 0.3, dist: 4 }, 800);
  await shot('16-from-behind-the-stage');
  console.log('concert render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())));
}
assert(!errors.length, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
