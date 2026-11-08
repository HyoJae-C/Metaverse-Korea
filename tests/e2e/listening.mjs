// End-to-end check: the record café's listening bar. Stand at a station, put
// the headphones on, hear the song (the café music pauses), then walk away:
// the headphones come off and the café music comes back.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/listening.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 2 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2elisten' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.enter('sorimaru-lp'));
await page.waitForTimeout(2000);
const st = await page.evaluate(() => __mk.listenStations());
console.log('stations:', st);
assert(st?.length === 3 && st[0][2] && !st[1][2], 'three stations, someone already listening at the first');
await page.evaluate(([x, z]) => __mk.place(x, z), st[1]);
await page.waitForTimeout(400);
assert((await page.evaluate(() => __mk.action())) === '🎧 Listen on headphones', 'the action at a free station');
await page.evaluate(() => __mk.act());
await page.waitForSelector('#lp-panel:not([hidden]) .listen-row');
if (S) await page.screenshot({ path: S + '/listen-panel.png' });
await page.click('#lp-panel .listen-row');
await page.waitForFunction(() => __mk.listening().pos > 0.5, null, { timeout: 15000 }).catch(() => {});
const on = await page.evaluate(() => __mk.listening());
console.log('listening:', on);
assert(on.id && on.ac === 'listen' && on.pos > 0.5 && !on.music, 'the song plays, headphones on, café music paused');
assert((await page.evaluate(() => __mk.action())) === '🎧 Take off headphones', 'the action takes them off');
if (S) { await page.click('#lp-panel .sheet-x'); await page.evaluate(() => __mk.cam({ dist: 6, pitch: 0.35, yaw: Math.PI * 1.1 })); await page.waitForTimeout(600); await page.screenshot({ path: S + '/listening.png' }); }
await page.evaluate(() => __mk.place(0, 2));
await page.waitForTimeout(800);
const off = await page.evaluate(() => __mk.listening());
console.log('walked away:', off);
assert(!off.id && off.ac === null && off.music, 'walking away takes the headphones off and the café music comes back');
assert(!errors.length, 'no page errors');
console.log('errors', errors);
await browser.close();
