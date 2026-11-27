// End-to-end check: the Gangnam skin clinic's 물광 care (game/derm.js,
// core/glow.js). Lie on a treatment bed, pay (the in-game "쓸까요?" box), the
// LED lamp glows over the face for a few seconds, and you get up with a shine
// that lasts 7 days: in the look (so others see it) and drawn on the face.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/derm.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'derm');
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2edm' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn').catch(() => {});
await page.fill('#nickname', 'Tester').catch(() => {});
await page.click('#start-btn', { timeout: 90000 }).catch(() => {});
await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
const wait = (ms) => page.waitForTimeout(ms);
const label = () => page.evaluate(() => document.getElementById('action-btn')?.textContent || '');
await page.evaluate(() => __mk.enter('yunseul-derm'));
await wait(2500);
if (S) { await page.evaluate(() => { __mk.goto(2, 2, Math.PI); __mk.cam?.({ yaw: 0.5, pitch: 0.35, dist: 7 }); }); await wait(800); await page.screenshot({ path: `${S}/1-derm-room.png` }); }

// The first bed: lie down, then the care button.
await page.evaluate(() => __mk.goto(-4.25, -3.7, Math.PI));
await wait(700);
await page.click('#action-btn');
await wait(1500);
assert((await label()).includes('✨'), `lying on the bed: "${await label()}"`);
assert((await label()).includes('50,000'), 'the price is on the button');
await page.click('#action-btn');
await page.waitForSelector('.spend-ask .primary', { timeout: 5000 });
await page.click('.spend-ask .primary');
await wait(1800);
if (S) await page.screenshot({ path: `${S}/2-led-care.png` });
await wait(3500);
const look = await page.evaluate(() => __mk.look());
const days = (look.glow - Date.now()) / 86400000;
assert(days > 6.9 && days <= 7, `the shine lasts 7 days (${days.toFixed(3)})`);
assert((await label()).includes('7'), `the button now says the days left: "${await label()}"`);
await page.click('#action-btn');
await wait(500);
assert(!(await page.isVisible('.spend-ask')), 'no second payment while it shines');
if (S) {
  await page.keyboard.down('s'); await wait(400); await page.keyboard.up('s'); // (moving gets up)
  await page.evaluate(() => { __mk.goto(-1, 0, 0); });
  await wait(600);
  for (const [k, yaw] of [['a', 0], ['b', Math.PI]]) {
    await page.evaluate((y) => __mk.cam?.({ yaw: y, pitch: 0.05, dist: 1.4 }), yaw);
    await wait(1000);
    await page.screenshot({ path: `${S}/3${k}-glass-skin.png` });
  }
}
assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
