// End-to-end check: Gimpo Airport. The terminals, runways and planes load
// near the domestic terminal; you walk up the stair beside its front door
// onto the roof deck (standing at the roof's height), see the parked MODU
// AIR planes, and a plane is on the runway at takeoff time.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/gimpo.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
import { gimpoFlights, EVERY } from '../../src/core/gimpo-flights.js';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const d = region.districts.find((q) => q.id === 'gimpo');
const l0 = JSON.parse(readFileSync(new URL(d.map, R))).landmarks.find((q) => q.type === 'gimpoairport');
const l = { ...l0, x: l0.x + d.offset[0], z: l0.z + d.offset[1] };
// A takeoff in daylight: the clock is set to 75 s into it (taxiing out).
const fl = gimpoFlights(l);
let k = Math.floor(Date.now() / EVERY); while (!(k % 2 === 0 && fl.slot(k))) k++;
const AT = fl.slot(k).start + (Number(process.env.INTO) || 75) * 1000;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'gimpo');
await ctx.addInitScript((at) => {
  const off = at - Date.now(), RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
}, AT);
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2egimpo' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const wait = (ms) => page.waitForTimeout(ms);
const W = (u, v) => [l.x + u * l.u[0] + v * l.v[0], l.z + u * l.u[1] + v * l.v[1]];
const yawU = Math.atan2(l.u[0], l.u[1]), yawV = Math.atan2(l.v[0], l.v[1]);

// The forecourt, looking at the terminal's front.
const [fx, fz] = W(-20, 40);
await page.evaluate(([x, z, r]) => __mk.goto(x, z, r), [fx, fz, yawV + Math.PI]);
await wait(5000);
assert(await page.evaluate(() => !!__mk.gimpo?.group), 'the airport loaded near');
await page.evaluate((y) => __mk.cam({ yaw: y, pitch: 0.18, dist: 30 }), yawV);
await wait(1500);
await shot('1-front');

// The international terminal's front: its kerb, the glass wall and the door canopy.
if (l.intlDoor) {
  const [ix, iz] = W(l.intlDoor.u - 9, (l.intlDoor.v0 + l.intlDoor.v1) / 2);
  await page.evaluate(([x, z, r]) => __mk.goto(x, z, r), [ix, iz, yawU]);
  await wait(1500);
  assert(await page.evaluate(() => __mk.seoulDal().y) < 0.3, 'standing on the international kerb');
  await page.evaluate((y) => __mk.cam({ yaw: y + 0.35, pitch: 0.16, dist: 28 }), yawU + Math.PI);
  await wait(1500);
  await shot('4-intl-front');
  await page.evaluate((y) => __mk.cam({ yaw: y - 0.9, pitch: 0.35, dist: 28 }), yawU + Math.PI);
  await wait(1200);
  await shot('5-intl-planes');
  if (S) { // (a picture only: from the apron, the parked planes at its airside)
    const [ax, az] = W(300, 110);
    await page.evaluate(([x, z, r]) => __mk.goto(x, z, r), [ax, az, yawU + Math.PI]);
    await page.evaluate((y) => __mk.cam({ yaw: y, pitch: 0.3, dist: 28 }), yawU);
    await wait(1500);
    await shot('6-intl-airside');
  }
  await page.evaluate(([x, z, r]) => __mk.goto(x, z, r), [fx, fz, yawV + Math.PI]); // (back as it was: walking goes the camera's way)
  await page.evaluate((y) => __mk.cam({ yaw: y, pitch: 0.18, dist: 30 }), yawV);
  await wait(500);
}

// Up the stair: its foot, then walk along +u.
const st = l.deck.stair;
const [sx, sz] = W(st[0] - 1.5, (st[1] + st[3]) / 2);
await page.evaluate(([x, z, r]) => __mk.goto(x, z, r), [sx, sz, yawU]);
await wait(800);
await page.keyboard.down('KeyW');
await wait(9000);
await page.keyboard.up('KeyW');
const y1 = await page.evaluate(() => __mk.seoulDal().y);
assert(y1 > l.deck.y - 0.3, `walked up the stair onto the roof (y ${y1})`);

// The balcony, looking out at the apron and the runways.
const b = l.deck.balcony;
const [bx, bz] = W(b[0] + 1.5, b[1] + 1.5); // (the west end: the stands beside it, the runways ahead)
await page.evaluate(([x, z, r]) => __mk.goto(x, z, r), [bx, bz, yawV + Math.PI]);
await wait(1500);
const y2 = await page.evaluate(() => __mk.seoulDal().y);
assert(y2 > l.deck.y - 0.3, `on the balcony at the roof's height (y ${y2})`);
await page.evaluate((y) => __mk.cam({ yaw: y, pitch: 0.3, dist: 28 }), yawV);
await wait(1500);
await shot('2-deck');
await page.evaluate((y) => __mk.cam({ yaw: y - 0.5, pitch: 0.2, dist: 28 }), yawV);
await wait(1200);
await shot('3-deck-wide');
console.log('deck render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())));
// Walking off the balcony's edge is not possible (the airfield).
await page.keyboard.down('KeyW');
await wait(2500);
await page.keyboard.up('KeyW');
const y3 = await page.evaluate(() => __mk.seoulDal().y);
assert(y3 > l.deck.y - 0.3, `the railing holds (y ${y3})`);

assert(!errors.length, 'no page errors ' + errors.join(' | '));
await browser.close();
