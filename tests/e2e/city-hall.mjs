// End-to-end check: Seoul Plaza and the two City Halls. Both halls are built
// (the glass one behind the stone one), the people come onto the lawn as you
// get near, you can walk across the plaza onto the grass and say hello, and
// you cannot walk into a hall.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/city-hall.mjs http://localhost:4173/ [screenshot dir]   (DAY=1: daytime pictures)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R)));
const [ox, oz] = read('region.json').districts.find((d) => d.id === 'gyeongbokgung').offset;
const gb = read('districts/gyeongbokgung.json');
const W = ([x, z]) => [x + ox, z + oz];
const lm = (t) => gb.landmarks.find((q) => q.type === t && q.sp);
const hall = lm('cityhall'), old = lm('oldcityhall'), gate = lm('palacegate');
const lawn = W(gb.meta.cityhall.lawn.at), [lw, ld] = gb.meta.cityhall.lawn.size;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'cityhall');
if (process.env.DAY) await ctx.addInitScript(() => {
  const CYC = 180 * 60000, now = Date.now(), off = Math.floor(now / CYC) * CYC + 55 * 60000 - now, RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2ech' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const wait = (ms) => page.waitForTimeout(ms);
const at = () => page.evaluate(() => { const q = __mk.outside(); return [q.x, q.z]; });

// On the lawn's south edge, looking north at the old hall and the glass hall behind it.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [lawn[0], lawn[1] + ld / 2 + 6]);
await page.waitForFunction(() => __mk.cityHall?.loaded, null, { timeout: 30000 });
assert(true, 'the people on the lawn load as you come near');
await wait(3000);
const people = await page.evaluate(() => __mk.cityHall.people.map((o) => [o.ch.root.position.x, o.ch.root.position.z, !!o.sit]));
assert(people.length >= 6 && people.length <= 8 && people.filter((q) => q[2]).length >= 5, `${people.length} people on the plaza, most sitting on the grass`);
assert(people.every(([x, z]) => Math.hypot((x - lawn[0]) / (lw / 2), (z - lawn[1]) / (ld / 2)) < 1), 'all of them on the oval lawn');
await page.evaluate(() => __mk.cam({ yaw: 0, pitch: 0.2, dist: 16 }));
await wait(1500);
await shot('1-lawn-and-both-halls');
console.log('render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())));
await page.evaluate(() => __mk.cam({ yaw: 0, pitch: 0.75, dist: 70 }));
await wait(1500);
await shot('2-from-above');

// Walk north across the lawn: nothing in the way until the old hall's steps.
await page.evaluate((ry) => __mk.face(ry), Math.PI);
const z0 = (await at())[1];
await page.keyboard.down('w'); await wait(12000); await page.keyboard.up('w');
const p1 = await at();
assert(z0 - p1[1] > 15 && p1[1] < lawn[1], `walked onto the lawn and across its middle, nothing in the way (${(z0 - p1[1]).toFixed(1)} m north)`);
// Say hello to someone sitting there.
const who = people.find((q) => q[2]);
await page.evaluate(([x, z]) => __mk.goto(x + 1.2, z + 0.4, 0), who);
await wait(600);
const label = await page.evaluate(() => document.getElementById('action-btn')?.textContent || '');
assert(/👋/.test(label), `someone to say hello to (${label})`);
await page.evaluate(() => __mk.cam({ yaw: 2.4, pitch: 0.25, dist: 6 }));
await wait(1200);
await shot('3-people-on-the-grass');

// You cannot walk into the old hall (it is the library's outside only).
const front = Math.max(...old.outline.map((q) => q[1])) + old.z + oz;
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [old.x + ox, front + 5]);
await page.evaluate(() => __mk.cam({ yaw: 0, pitch: 0.12, dist: 9 }));
await page.keyboard.down('w'); await wait(5000); await page.keyboard.up('w');
const p2 = await at();
assert(p2[1] > front - 0.3 && p2[1] < front + 3, `walked up to the old hall and stopped at its front (${(p2[1] - front).toFixed(1)} m from it)`);
await page.evaluate(() => __mk.cam({ yaw: 0, pitch: 0.12, dist: 9 }));
await wait(1200);
await shot('4-old-hall-door');

// The glass hall from its east end (the white panels and the oval room), and Daehanmun across the road.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [hall.x + ox + 30, hall.z + oz + 14]);
await page.evaluate(() => __mk.cam({ yaw: 0.9, pitch: 0.2, dist: 24 }));
await wait(2000);
await shot('5-glass-hall-east-end');
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [gate.x + ox + 14, gate.z + oz]);
await page.evaluate(() => __mk.cam({ yaw: Math.PI / 2, pitch: 0.15, dist: 12 }));
await wait(2000);
await shot('6-daehanmun');
assert(!errors.length, 'no page errors: ' + errors.join(' | '));
await browser.close();
