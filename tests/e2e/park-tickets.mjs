// End-to-end check: Another Land's ticket guide by the booth where the
// bridge lands on the island. Walk up: their list explains the tickets and
// sells them; buy "any 5 rides", and the drop tower takes a ride off it
// instead of coins.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/park-tickets.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2etix' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };

await page.evaluate(() => { __mk.coins(30000); __mk.enter('another-land-island'); });
await page.waitForTimeout(3500);
// From the bridge: the booth and the guide are the first thing on the island.
await page.evaluate(() => { __mk.place(-30.5, -53.8); __mk.cam({ yaw: Math.PI * 0.62, pitch: 0.3, dist: 9 }); });
await page.waitForTimeout(1500);
await shot('guide-from-bridge');
await page.evaluate(() => { __mk.place(-26.2, -53.9); __mk.cam({ yaw: Math.PI * 0.5, pitch: 0.28, dist: 6 }); });
await page.waitForTimeout(1200);
const list = await page.evaluate(() => __mk.choices());
assert(list && list.length >= 5 && /Which ticket/.test(list[0]), `the guide's list: ${list}`);
assert(list.some((l) => /Any 5 rides · 🪙 16,000/.test(l)) && list.some((l) => /5 different rides/.test(l)) && list.some((l) => /Big 3/.test(l)) && list.some((l) => /Ride-all/.test(l)), `every ticket on sale: ${list}`);
const tag = await page.evaluate(() => [...document.querySelectorAll('.nametag')].some((e) => e.offsetParent && /Ticket guide/.test(e.textContent)));
assert(tag, 'the guide\'s name tag shows');
await page.evaluate(() => __mk.act());
await page.waitForTimeout(400);
await shot('guide-list');
const any = list.findIndex((l) => /Any 5 rides/.test(l));
await page.evaluate((i) => __mk.pick(i), any);
await page.waitForTimeout(800);
await shot('bought');
assert(await page.evaluate(() => __mk.coins()) === 30000 - 16000, 'paid 16,000');
const after = await page.evaluate(() => __mk.choices());
assert(after.some((l) => /Any 5 rides: 5 left ✓/.test(l)), `held: ${after}`);

// The drop tower: its button shows the ticket, and the ride is free.
await page.evaluate(() => { __mk.place(-17.9, -28.5); __mk.cam({ yaw: 0, pitch: 0.35, dist: 9 }); });
await page.waitForTimeout(600);
let p = await page.evaluate(() => __mk.parkRide());
for (let i = 0; i < 90 && !(p.phase.drop.phase === 'load' && p.phase.drop.left > 3); i++) { await page.waitForTimeout(500); p = await page.evaluate(() => __mk.parkRide()); }
const lbl = await page.evaluate(() => __mk.action());
assert(/🎟️/.test(lbl || ''), `the drop's fare is the ticket: ${lbl}`);
await page.evaluate(() => __mk.act());
await page.waitForTimeout(500);
p = await page.evaluate(() => __mk.parkRide());
assert(p.ride?.kind === 'drop', 'on the drop');
assert(await page.evaluate(() => __mk.coins()) === 14000, 'no coins for the ride');
const left = await page.evaluate(() => JSON.parse(localStorage.getItem('mk.ridetix')).any5.used);
assert(left.length === 1 && left[0] === 'drop', `one ride used: ${left}`);
assert(!errors.length, 'page errors: ' + errors.join(' | '));
await browser.close();
console.log(process.exitCode ? 'park-tickets: FAILED' : 'park-tickets: ok');
