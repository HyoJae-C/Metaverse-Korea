// Measuring tool (not in CI): ride the Han River Boat Taxi end to end and
// record every frame's gap, where the boat was, and a CPU profile, to find
// the stops you feel on the way (Yozi 2026-11-25).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/boat-ride-hitches.mjs http://localhost:4173/ out.json [from] [to]
//   (PHONE=1: a phone-sized screen.) out.json: { fr: [[t, gap ms, x, z]], profile }
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { timetable, nextBoat } from '../../src/core/boat-taxi.js';
const url = process.argv[2], out = process.argv[3], from = process.argv[4] || 'magok', to = process.argv[5] || 'jamsil';
const phone = process.env.PHONE === '1';
const data = JSON.parse(readFileSync(new URL('../../public/regions/another-seoul/boat-taxi.json', import.meta.url)));
const pier = (id) => data.piers.find((p) => p.id === id);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 760 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept());
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(url + '?debug&room=hitch' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn'); await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.coins(100000));
const y = pier(from);
for (let i = 0; i < 2; i++) { await page.evaluate(([x, z]) => __mk.place(x, z), y.board); await page.waitForTimeout(6000); }
await page.evaluate(() => __mk.act()); await page.waitForTimeout(400);
await page.click(`.boat-taxi-panel .visit-list button:has-text("${to === 'jamsil' ? 'Jamsil' : to === 'magok' ? 'Magok' : to}")`);
await page.waitForTimeout(400);
if (await page.isVisible('.spend-ask .spend-ask-btns .primary')) await page.click('.spend-ask .spend-ask-btns .primary');
await page.waitForTimeout(400);
console.log('ticket', await page.evaluate(() => __mk.boatTaxi.ticket));
const tt = timetable(data.piers, undefined, data.west), yi = data.piers.indexOf(y);
const nb = nextBoat(tt, yi, data.piers.indexOf(pier(to)) > yi ? 1 : -1, Date.now() / 1000);
if (nb.wait > 3) await page.evaluate((s) => __mk.boatTaxi.skewClock(s), nb.wait - 3);
for (let i = 0; i < 40 && !(await page.evaluate(() => __mk.boatTaxi.busy)); i++) await page.waitForTimeout(500);
if (!(await page.evaluate(() => __mk.boatTaxi.busy))) { console.log('not aboard'); process.exit(1); }
const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
await page.evaluate(() => {
  window.__fr = []; let last = performance.now();
  const loop = (t) => { const p = __mk.seoulDal().at; window.__fr.push([t, t - last, Math.round(p[0]), Math.round(p[1])]); last = t; if (window.__frOn) requestAnimationFrame(loop); };
  window.__frOn = true; requestAnimationFrame(loop);
});
await cdp.send('Profiler.start');
const t0 = Date.now();
while (await page.evaluate(() => __mk.boatTaxi.busy) && Date.now() - t0 < 400000) await page.waitForTimeout(1000);
const { profile } = await cdp.send('Profiler.stop');
const fr = await page.evaluate(() => { window.__frOn = false; return { fr: window.__fr, origin: performance.timeOrigin }; });
writeFileSync(out, JSON.stringify({ fr: fr.fr, profile }));
console.log('frames', fr.fr.length, 'secs', (Date.now() - t0) / 1000);
await browser.close();
