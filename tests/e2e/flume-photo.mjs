// End-to-end check: the Jelly Flume's free ride photo (game/ride-photo.js).
// Ride the flume: partway down the big drop the camera by the pool takes a
// photo; off the ride the print shows, the photo is in the bag; at home it
// goes in a frame from the Decorate catalogue.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/flume-photo.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2eph' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const pr = () => page.evaluate(() => __mk.parkRide());

await page.evaluate(() => { __mk.coins(40000); __mk.enter('another-land'); });
await page.waitForTimeout(3000);
await page.evaluate(() => { __mk.place(54.5, -14.3); __mk.cam({ yaw: Math.PI, pitch: 0.3, dist: 9 }); });
await page.waitForTimeout(800);
let p = await pr();
for (let i = 0; i < 140 && !(p.phase.flume.phase === 'load' && p.phase.flume.left > 3); i++) { await page.waitForTimeout(500); p = await pr(); }
await page.evaluate(() => __mk.act());
await page.waitForTimeout(500);
assert((await pr()).ride?.kind === 'flume', 'on the flume');
let card = false;
const t0 = Date.now();
while (Date.now() - t0 < 75000) {
  p = await pr();
  if (!p.ride) { card = await page.isVisible('.ride-photo-card'); break; }
  await page.waitForTimeout(250);
}
const photos = await page.evaluate(() => __mk.photos());
assert(photos.length === 1, `one photo kept (${photos.length})`);
assert(card, 'the print shows at the exit');
await shot('flume-photo-card');
if (S && photos[0]) writeFileSync(`${S}/flume-photo.jpg`, Buffer.from(photos[0].src.split(',')[1], 'base64'));
assert(photos[0]?.src.length < 60000, `small enough for the save (${photos[0]?.src.length} chars)`);
console.log('receipt op (null without the server wallet):', photos[0]?.op);
const kinds = await page.evaluate(() => __mk.bagKinds());
assert(kinds.includes('photo'), `in the bag: ${kinds}`);

// At home: the Decorate catalogue has it; place it.
await page.evaluate(() => document.querySelector('.ride-photo-card .sheet-x')?.click());
await page.evaluate(() => __mk.enter('forest-lane-apt'));
await page.waitForTimeout(3000);
await page.evaluate(() => document.querySelector('#decor-btn').click()); // (a pinned notice can sit over it)
await page.waitForTimeout(300);
assert(await page.evaluate(() => !!document.querySelector('.decor-photo:not([hidden])')), 'the photo is in the Decorate catalogue');
await page.evaluate(() => document.querySelector('.decor-photo')?.click());
await page.waitForTimeout(600);
await page.evaluate(() => { document.querySelector('#piece-close')?.click(); document.querySelector('#decor-close')?.click(); });
await page.waitForTimeout(400);
const frame = await page.evaluate(() => JSON.parse(localStorage.getItem('mk.home.forest-lane-apt') || '[]').find((i) => i.id.startsWith('ph:')));
assert(!!frame, 'the frame is in the room');
// Stand to one side of it and look at its front.
if (frame) await page.evaluate((f) => { const c = Math.cos(f.ry), s = Math.sin(f.ry); __mk.place(f.x + c * 0.7, f.z - s * 0.7); __mk.cam({ yaw: f.ry + 0.3, pitch: 0.25, dist: 2 }); }, frame);
await page.waitForTimeout(800);
await shot('flume-photo-home');
// The bag: the photo's slot shows the picture, and so does its card.
await page.keyboard.press('b');
await page.waitForTimeout(500);
await page.evaluate(() => [...document.querySelectorAll('.bag-slot')].find((b) => b.querySelector('.bag-thumb'))?.click());
await page.waitForTimeout(400);
assert(await page.isVisible('.bag-photo'), 'the bag shows the photo');
await shot('flume-photo-bag');
assert(!errors.length, `no page errors: ${errors.join(' | ')}`);
await browser.close();
