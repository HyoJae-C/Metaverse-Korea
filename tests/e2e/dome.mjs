// End-to-end check: Modu Ballpark. Walk in mid-game (the clock is moved
// to 200 s into a game), see the free seats and the food stand, sit down,
// and check nothing throws while the game plays.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/dome.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { const real = Date.now.bind(Date); const n = real() / 1000; const off = (((200 - (n % 900)) % 900) + 900) % 900; Date.now = () => real() + off * 1000; });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2edome' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.enter('seoul-another-dome'));
await page.waitForTimeout(3000);
const seats = await page.evaluate(() => __mk.seats());
console.log('free seats:', seats);
assert(seats > 300, 'free seats behind home plate and in the cheering section');
await page.evaluate(() => __mk.place(0, 52));
await page.evaluate(() => __mk.cam({ dist: 5, pitch: 0.32, yaw: 0 }));
await page.waitForTimeout(3000);
if (S) await page.screenshot({ path: S + '/dome-field.png' });
await page.evaluate(() => __mk.place(17, 53));
await page.waitForTimeout(600);
const look = await page.evaluate(() => __mk.action());
console.log('at the stand:', look);
assert(/Look at/.test(look || ''), 'the food stand sells something');
await page.evaluate(() => __mk.sit(0));
await page.waitForTimeout(800);
assert(await page.evaluate(() => __mk.seated()), 'sat down in the stands');
await page.waitForTimeout(4000);
assert(!errors.length, 'no page errors');
console.log('errors', errors);
await browser.close();
