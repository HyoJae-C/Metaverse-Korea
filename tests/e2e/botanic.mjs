// End-to-end check: Seoul Botanic Park. The greenhouse loads near its place,
// you walk in through the main doorway (no room: it is on the street), stand
// by a pot stand, look at the plant, buy it, and find it in your bag as a
// piece for your home. The rare stands are at the far end of the main walk.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/botanic.mjs http://localhost:4173/ [screenshot dir]   (DAY=1: daytime pictures)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R)));
const [ox, oz] = read('region.json').districts.find((d) => d.id === 'magok').offset;
const l = read('districts/magok.json').landmarks.find((q) => q.type === 'botanic');
const gx = l.x + ox, gz = l.z + oz, main = l.doors.find((d) => d.main);
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'botanic');
if (process.env.DAY) await ctx.addInitScript(() => {
  const CYC = 180 * 60000, now = Date.now(), off = Math.floor(now / CYC) * CYC + 55 * 60000 - now, RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2ebot' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const wait = (ms) => page.waitForTimeout(ms);
const label = () => page.evaluate(() => document.getElementById('action-btn')?.textContent || '');

// Outside the main door.
const out = (r, da = 0) => [gx + Math.cos(main.a + da) * r, gz + Math.sin(main.a + da) * r];
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), out(l.r + 14));
await page.waitForFunction(() => !!__mk.botanic?.group, null, { timeout: 30000 });
assert(true, 'the greenhouse loaded near');
await wait(2500);
await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.16, dist: 15 }), Math.atan2(Math.cos(main.a), Math.sin(main.a)));
await wait(1500);
await shot('1-main-door');
console.log('outside render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())));
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), out(l.r + 46, -0.5));
await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.5, dist: 46 }), Math.atan2(Math.cos(main.a - 0.5), Math.sin(main.a - 0.5)));
await wait(1500);
await shot('2-from-the-lake-side');

// In through the doorway on foot: nothing in the way, and still on the street.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), out(l.r + 3));
await page.evaluate((ry) => __mk.face(ry), Math.atan2(-Math.cos(main.a), -Math.sin(main.a)));
await wait(500);
await page.keyboard.down('w'); await wait(4500); await page.keyboard.up('w');
const walked = await page.evaluate(() => { const q = __mk.outside(); return [q.x, q.z]; });
assert(Math.hypot(walked[0] - gx, walked[1] - gz) < l.r - 4, `walked in through the door (${walked.map((v) => v.toFixed(1))}, ${(Math.hypot(walked[0] - gx, walked[1] - gz)).toFixed(1)} m from the middle)`);
assert(await page.evaluate(() => __mk.room().mode === 'street'), 'inside the greenhouse is still the street');
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), out(l.r - 6));
await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.2, dist: 7 }), Math.atan2(Math.cos(main.a), Math.sin(main.a)));
await wait(1500);
await shot('3-inside-from-the-door');
console.log('inside render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())));

// A pot stand: look, buy, and it is in the bag.
const stands = await page.evaluate(() => __mk.botanic.site.products.map((p) => ({ id: p.product.id, item: p.product.furniture, rare: p.rare, price: p.product.price, x: p.pos.x, z: p.pos.z, at: p.at })));
assert(stands.length === 10 && stands.filter((s) => s.rare).length === 5, 'ten pot stands, five of them rare');
const first = stands.find((s) => s.item === 'plant-monstera');
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [first.x, first.z]);
await page.waitForFunction(() => (document.getElementById('action-btn')?.textContent || '').includes('👀'), null, { timeout: 10000 });
console.log('action:', await label());
await page.evaluate((s) => __mk.cam({ yaw: Math.atan2(s.x - s.at[0], s.z - s.at[1]), pitch: 0.25, dist: 5 }), first);
await wait(1200);
await shot('4-everyday-stand');
await page.click('#action-btn');
await page.waitForSelector('#product-panel:not([hidden])', { timeout: 10000 });
await wait(600);
await shot('5-buy-sheet');
// Buy it: the "Spend ₩…?" sheet, then it is in the bag as a piece for the home.
const buy = await page.evaluate(() => [...document.querySelectorAll('#product-panel button')].filter((b) => !b.hidden && b.offsetParent && /18,000/.test(b.textContent)).map((b) => b.id)[0]);
await page.click('#' + buy);
await page.click('.spend-ask:not([hidden]) .primary', { timeout: 5000 }).catch(() => {});
await page.waitForFunction(() => __mk.owns('plant-monstera'), null, { timeout: 8000 }).catch(() => {});
assert(await page.evaluate(() => __mk.owns('plant-monstera')), 'bought the monstera: it is in the bag');
const rare = stands.find((s) => s.item === 'plant-baobab');
assert(Math.hypot(rare.x - first.x, rare.z - first.z) > 18, 'the rare stands are across the greenhouse from the door');
if (!(await page.isHidden('#product-panel'))) await page.keyboard.press('Escape');
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [rare.x, rare.z]);
await page.evaluate((s) => __mk.cam({ yaw: Math.atan2(s.x - s.at[0], s.z - s.at[1]) + 0.5, pitch: 0.3, dist: 9 }), rare);
await wait(1500);
await shot('6-rare-stands');
// From the pond, looking round.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [gx + 4.2, gz]);
await page.evaluate(() => __mk.cam({ yaw: 2.2, pitch: 0.12, dist: 5 }));
await wait(1200);
await shot('7-by-the-pond');
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [gx, gz + 80]);
await page.evaluate(() => __mk.cam({ yaw: 0, pitch: 0.75, dist: 90 }));
await wait(2000);
await shot('8-park-from-above');
assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(process.exitCode ? 'FAILED' : 'OK');
