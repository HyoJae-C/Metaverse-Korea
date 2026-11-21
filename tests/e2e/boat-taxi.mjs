// End-to-end check: the Han River Boat Taxi. On Yeouido's pier, buy a ticket
// to Apgujeong, wait for the timetable's boat (the clock is moved on so it
// comes in a few seconds), get on by yourself, ride, step off on its pier.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/boat-taxi.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { timetable, nextBoat } from '../../src/core/boat-taxi.js';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const data = JSON.parse(readFileSync(new URL('../../public/regions/another-seoul/boat-taxi.json', import.meta.url)));
const pier = (id) => data.piers.find((p) => p.id === id);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2eboat' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };

await page.evaluate(() => __mk.coins(10000));
const y = pier('yeouido');
await page.evaluate(([x, z]) => __mk.place(x, z), y.board);
await page.waitForTimeout(3000); // (the boats download near the pier)
await page.evaluate(([x, z]) => __mk.place(x, z), y.board);
await page.waitForTimeout(500);
const label = await page.evaluate(() => __mk.action());
assert(/Han River Boat Taxi/.test(label || ''), `the button on the pier: ${label}`);
await page.evaluate(() => __mk.cam({ yaw: 2.2, pitch: 0.35, dist: 14 }));
await page.waitForTimeout(800);
await shot('1-yeouido-pier');
await page.evaluate(() => __mk.act());
await page.waitForTimeout(300);
const names = await page.$$eval('.boat-taxi-panel .visit-list button', (bs) => bs.map((b) => b.textContent));
console.log('list:', names);
assert(names.length === data.piers.length - 1, 'every other pier listed');
await shot('2-list');
await page.click('.boat-taxi-panel .visit-list button:has-text("Apgujeong")');
await page.waitForTimeout(400);
assert((await page.evaluate(() => __mk.coins())) === 7000, 'paid 3,000');
const ticket = await page.evaluate(() => __mk.boatTaxi.ticket);
assert(ticket && ticket.to === data.piers.indexOf(pier('apgujeong')), 'a ticket to Apgujeong');
assert(!(await page.evaluate(() => __mk.boatTaxi.busy)), 'not aboard before the boat comes');
const wl = await page.evaluate(() => __mk.action());
console.log('waiting:', wl);
assert(/Apgujeong/.test(wl || ''), 'the button says where and when');
// Bring the next eastbound boat to 4 s away (the same timetable as the game's).
const tt = timetable(data.piers), yi = data.piers.indexOf(y);
const nb = nextBoat(tt, yi, 1, Date.now() / 1000);
if (nb.wait > 4) await page.evaluate((s) => __mk.boatTaxi.skewClock(s), nb.wait - 4);
for (let i = 0; i < 30 && !(await page.evaluate(() => __mk.boatTaxi.busy)); i++) await page.waitForTimeout(1000);
assert(await page.evaluate(() => __mk.boatTaxi.busy), 'got on the boat when it came');
await page.waitForTimeout(3000);
await shot('3-aboard');
// Walk on the deck: carried along, but never off the boat.
const w0 = await page.evaluate(() => __mk.seoulDal().at);
await page.keyboard.down('KeyA'); await page.waitForTimeout(1500); await page.keyboard.up('KeyA');
await page.keyboard.down('KeyS'); await page.waitForTimeout(1500); await page.keyboard.up('KeyS');
assert(await page.evaluate(() => __mk.boatTaxi.busy), 'still aboard after walking round');
const w1 = await page.evaluate(() => __mk.seoulDal().at);
console.log('walked', w0, '->', w1);
await page.waitForTimeout(22000);
await page.evaluate(() => __mk.cam({ yaw: 0.9, pitch: 0.45, dist: 22 }));
await page.waitForTimeout(1500);
await shot('4-on-the-river');
for (let i = 0; i < 400 && (await page.evaluate(() => __mk.boatTaxi.busy)); i++) await page.waitForTimeout(1000);
assert(!(await page.evaluate(() => __mk.boatTaxi.busy)), 'arrived');
assert(!(await page.evaluate(() => __mk.boatTaxi.ticket)), 'the ticket is used');
const a = pier('apgujeong');
const at = await page.evaluate(() => __mk.seoulDal().at);
console.log('arrived at', at, 'pier', a.board);
assert(Math.hypot(at[0] - a.board[0], at[1] - a.board[1]) < 3, 'on Apgujeong\'s pier');
await page.evaluate(() => __mk.cam({ yaw: 2.6, pitch: 0.35, dist: 14 }));
await page.waitForTimeout(1500);
await shot('5-apgujeong');
assert(!errors.length, 'no page errors: ' + errors.join(' | '));
await browser.close();
