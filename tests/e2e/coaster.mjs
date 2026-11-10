// End-to-end check: Another Land's roller coaster, on its island in Seokchon
// Lake. Buy the ride-all day pass at the ticket window under the island, up
// the stairs onto the island, wait at the platform for a train, get on, ride
// the lap (the camera widens in the drop), switch the view, and step off
// still on the island.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/coaster.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2ecoaster' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const co = () => page.evaluate(() => __mk.coaster());

await page.evaluate(() => { __mk.coins(30000); __mk.enter('another-land'); });
await page.waitForTimeout(2500);
// The ticket window: buy the pass.
await page.evaluate(() => __mk.place(-6, 31.6)); // (themepark.js: the booth at Z1 - 2.4)
await page.waitForTimeout(400);
const passLabel = await page.evaluate(() => __mk.action());
assert(/Ride-all day pass · 🪙 20,000/.test(passLabel || ''), `pass on sale: ${passLabel}`);
await page.evaluate(() => __mk.act());
await page.waitForTimeout(300);
assert((await co()).pass, 'pass bought');
assert((await page.evaluate(() => __mk.coins())) === 10000, 'paid 20,000');

// Back up the stairs: out of the room under the island, onto the island
// (no door: you're on its lawn, so you're in it).
await page.evaluate(() => __mk.leave());
await page.waitForTimeout(2500);
let room = await page.evaluate(() => __mk.room());
assert(room.mode === 'store' && room.id === 'another-land-island', `up on the island: ${JSON.stringify(room)}`);
assert(!(await page.evaluate(() => document.body.classList.contains('in-store'))), 'outdoors: the street\'s buttons stay');
await page.evaluate(() => { __mk.cam({ yaw: 2.4, pitch: 0.45, dist: 16 }); });
await page.waitForTimeout(600);
await shot('island');
// The stairs down again.
await page.evaluate(() => __mk.place(-24.2, -16.5)); // (at the hall's door: stores.json open.hall, 5.3 m east)
await page.waitForTimeout(400);
const dl = await page.evaluate(() => __mk.action());
assert(/^⬇️ Enter Another Land Underground/.test(dl || ''), `stairs down: ${dl}`);

// The platform.
await page.evaluate(() => { __mk.place(-27.4, 2.4); __mk.cam({ yaw: Math.PI / 2 + 0.5, pitch: 0.35, dist: 12 }); });
await page.waitForTimeout(800);
await shot('platform');
let c = await co();
console.log('at the platform:', JSON.stringify(c.boarding), await page.evaluate(() => __mk.action()));
assert(c.staff === 1, 'the ride attendant at the gate');
// Wait for a train to board.
for (let i = 0; i < 70 && !((c = await co()).boarding.train >= 0 && c.boarding.left > 2.5); i++) await page.waitForTimeout(500);
await page.waitForTimeout(400); // (the action button catches up)
const lbl = await page.evaluate(() => __mk.action());
assert(/^🎢 Ride the Cotton Candy Express · 🎫/.test(lbl || ''), `board label: ${lbl}`);
await page.evaluate(() => __mk.act());
await page.waitForTimeout(300);
c = await co();
assert(c.ride, 'on the train');
assert((await page.evaluate(() => __mk.coins())) === 10000, 'free with the pass');
const t0 = Date.now();
let wide = 0, high = 0, phases = new Set();
const shots = { lift: false, hold: false, drop: false, run: false };
while (Date.now() - t0 < 62000) {
  c = await co();
  if (!c.ride) break;
  phases.add(c.ride.phase);
  wide = Math.max(wide, c.fov);
  high = Math.max(high, c.at[1]);
  if (!shots[c.ride.phase] && c.ride.phase in shots && (c.ride.phase !== 'lift' || c.at[1] > 10)) { shots[c.ride.phase] = true; await shot('ride-' + c.ride.phase); }
  if (c.ride.phase === 'run' && c.ride.view === 'third' && Date.now() - t0 > 40000) { await page.evaluate(() => __mk.act()); await page.waitForTimeout(500); await shot('first-person'); }
  await page.waitForTimeout(250);
}
console.log('phases', [...phases].join(','), 'widest fov', wide, 'highest', high);
assert(['lift', 'hold', 'drop', 'run', 'brake'].every((p) => phases.has(p)), 'rode the whole lap');
assert(wide > 75, `the view widens in the drop (${wide})`);
assert(high > 16, 'up at the top');
c = await co();
assert(!c.ride, 'off again');
room = await page.evaluate(() => __mk.room());
assert(room.id === 'another-land-island', `still on the island: ${JSON.stringify(room)}`);
assert(Math.abs(c.at[0] + 27.6) < 0.2 && c.fov === 62, `on the platform, normal view: ${JSON.stringify(c)}`);
await shot('off');
assert(!errors.length, 'page errors: ' + errors.join(' | '));
await browser.close();
