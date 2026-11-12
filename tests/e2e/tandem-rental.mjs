// End-to-end check: Seoul Forest's tandem rental. Walk to the booth, rent,
// ride east into the park's edge (it stops you before Seongsu), get off (the
// bike goes back and the meter is paid), and a rental left open when the
// page closed is settled on the next load.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/tandem-rental.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const BOOTH = { x: -276, z: 24 }; // the tandemrental landmark (map.json)
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: S ? 2 : 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const room = 'e2etandem' + Math.random().toString(36).slice(2, 8);
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + room);
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.snow(0));
await page.evaluate(() => { const w = __mk.wallet; if (w.coins < 20000) w.add(20000 - w.coins, null); });
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [BOOTH.x, BOOTH.z + 12]);
await page.waitForTimeout(2500); // (the booth loads near the forest)
await page.evaluate(([x, z]) => __mk.place(x, z), [BOOTH.x, BOOTH.z + 2.4]);
await page.waitForTimeout(600);
const a = await page.evaluate(() => __mk.action());
const c = await page.evaluate(() => __mk.choices());
console.log('action', a, c);
const label = (c || []).find((l) => l.includes('tandem')) || a;
assert(label?.includes('Rent a tandem'), 'the rent button at the counter');
if (S) { await page.evaluate(() => __mk.cam({ dist: 11, pitch: 0.3, yaw: 0.6 })); await page.waitForTimeout(1200); await page.screenshot({ path: S + '/booth.png' }); }
const before = await page.evaluate(() => __mk.wallet.coins);
if (a === label) await page.evaluate(() => __mk.act()); else await page.evaluate((i) => __mk.pick(i), c.indexOf(label));
await page.waitForTimeout(500);
assert(await page.evaluate(() => __mk.riding()) === 2, 'on the tandem');
assert(await page.isVisible('#tandem-chip'), 'the meter shows');
assert(before - await page.evaluate(() => __mk.wallet.coins) === 3000, 'base fare paid');
// Ride south for 6 s (yaw 180°: forward is +z) towards the river: stopped
// at the park's edge (z 184.5 here, core/tandem-rental.js), not on the
// riverside path.
await page.evaluate(() => { __mk.place(-300, 150); __mk.cam({ yaw: Math.PI }); });
await page.keyboard.down('KeyW');
await page.waitForTimeout(6000);
await page.keyboard.up('KeyW');
const at = await page.evaluate(() => __mk.pose());
console.log('after riding south', at);
assert(at[2] > 175 && at[2] <= 184.6, 'rode to the edge and stopped there: ' + at[2]);
if (S) { await page.evaluate(() => __mk.cam({ dist: 9, pitch: 0.35, yaw: 0 })); await page.waitForTimeout(1000); await page.screenshot({ path: S + '/riding.png' }); }
// Get off: the bike goes back.
await page.evaluate(() => document.getElementById('bike-btn').click());
await page.waitForTimeout(800);
assert(await page.evaluate(() => __mk.riding()) === 0, 'off');
assert(!(await page.isVisible('#tandem-chip')), 'meter gone');
assert(await page.evaluate(() => localStorage.getItem('mktandem.rent')) === null, 'nothing left to settle');
// A rental left open (the page closed after 45 minutes): settled on reload.
await page.evaluate(() => localStorage.setItem('mktandem.rent', JSON.stringify({ start: Date.now() - 50 * 60000, seen: Date.now() - 5 * 60000 })));
const coins0 = await page.evaluate(() => __mk.wallet.coins);
await page.reload();
await page.click('#next-btn').catch(() => {});
await page.fill('#nickname', 'Tester').catch(() => {});
await page.click('#start-btn', { timeout: 90000 }).catch(() => {});
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
await page.waitForTimeout(3000);
const coins1 = await page.evaluate(() => __mk.wallet.coins);
console.log('settled', coins0, coins1);
assert(coins0 - coins1 === 15 * 100, 'left-open rental settled: 45 min, 15 past the base time');
assert(await page.evaluate(() => localStorage.getItem('mktandem.rent')) === null, 'and cleared');
console.log('errors', errors);
assert(!errors.length, 'no page errors');
await browser.close();
