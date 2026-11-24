// End-to-end check: Gangnam Station. The crossroads with its big screens, the
// station's stairs down from exit 10, the moved shops open (a clinic, the
// appliance mart, a furniture showroom), and the walk up Gangnam-daero.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/gangnam.mjs http://localhost:4173/ [screenshot dir]   (NIGHT=1: night pictures)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R)));
const region = read('region.json'), stores = read('stores.json').stores;
const [ox, oz] = region.districts.find((d) => d.id === 'gangnam').offset;
const at = (id) => stores.find((s) => s.id === id).at;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'gangnam');
// The 3-hour day: 55 min in is midday, 150 min in is night.
await ctx.addInitScript((min) => {
  const CYC = 180 * 60000, now = Date.now(), off = Math.floor(now / CYC) * CYC + min * 60000 - now, RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
}, process.env.NIGHT ? 150 : 55);
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2egn' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const wait = (ms) => page.waitForTimeout(ms);
// Look (and walk with W) along (dx, dz): the camera sits behind.
const look = (dx, dz, o = {}) => page.evaluate(([yaw, o]) => __mk.cam({ yaw, ...o }), [Math.atan2(-dx, -dz), o]);
const NORTH = [-0.35, -0.94]; // up Gangnam-daero
const here = () => page.evaluate(() => { const q = __mk.outside(); return [q.x, q.z]; });

// The crossroads, looking north up Gangnam-daero.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [ox + 9, oz + 30]);
await wait(4000);
await look(...NORTH, { pitch: 0.2, dist: 16 });
await wait(2500);
await shot('1-crossroads-looking-north');
const p0 = await here();
assert(Math.hypot(p0[0] - ox - 9, p0[1] - oz - 30) < 3, `standing by the crossroads, not in closed land (${p0.map((v) => v.toFixed(1))})`);
console.log('crossroads render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())));
await look(...NORTH, { pitch: 0.75, dist: 70 });
await wait(2000);
await shot('2-crossroads-from-above');

// Walk across the crossroads and on up the avenue's pavement: nothing in the way.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [ox + 13, oz + 20]);
await look(...NORTH, { pitch: 0.3, dist: 9 });
await wait(400);
await page.keyboard.down('w'); await wait(9000); await page.keyboard.up('w');
const p1 = await here();
assert(p1[1] < oz + 20 - 9, `walked north across Teheran-ro, nothing in the way (${p1.map((v) => v.toFixed(1))})`);

// The shops that moved are open here.
for (const [id, name] of [['bitna-clinic', '3-clinics'], ['teheran-appliances', '4-appliance-mart'], ['saebyeok-living', '5-furniture-street']]) {
  const [x, z] = at(id);
  await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [x, z]);
  await wait(2500);
  await look(...(id === 'saebyeok-living' ? [0.93, -0.36] : NORTH), { pitch: 0.25, dist: 18 });
  await wait(1500);
  await shot(name);
  await page.evaluate((id) => __mk.enter(id), id);
  await page.waitForFunction(() => __mk.room().mode === 'store', null, { timeout: 30000 });
  assert(true, `${id}: you can go in`);
  await wait(1500);
  if (id === 'bitna-clinic') await shot('3b-clinic-inside');
  await page.evaluate(() => __mk.leave?.());
  await page.waitForFunction(() => __mk.room().mode === 'street', null, { timeout: 15000 }).catch(() => assert(false, `${id}: back on the street`));
}

// Down the stairs of exit 10 into Gangnam Station.
const ex = region.subway.stations.find((s) => s.id === 'gangnam-station').exits[0];
await page.evaluate(([x, z, ry]) => __mk.goto(x - Math.sin(ry) * 3.2, z - Math.cos(ry) * 3.2, 0), [ex.at[0], ex.at[1], ex.ry]);
await wait(1500);
await look(Math.sin(ex.ry), Math.cos(ex.ry), { pitch: 0.3, dist: 10 });
await wait(800);
await shot('6-exit-10');
await page.keyboard.down('w'); await wait(7000); await page.keyboard.up('w');
await wait(2500);
const room = await page.evaluate(() => __mk.room());
assert(room.mode !== 'street', `the stairs lead down into the station (${JSON.stringify(room).slice(0, 120)})`);
await shot('7-station-hall');
assert(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
