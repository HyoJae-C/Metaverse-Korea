// End-to-end check: a dog out on a walk never poops where you can't clean it
// up: not on a Han River Boat Taxi (the boat sails off and leaves it on the
// water) and not in Seoul Dal's gondola (it stays in the air when the balloon
// comes down). The dog waits out of sight while you ride, as on a bike.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/pet-on-rides.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { timetable, nextBoat } from '../../src/core/boat-taxi.js';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
let failed = false;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); failed = true; } };
const data = JSON.parse(readFileSync(new URL('../../public/regions/another-seoul/boat-taxi.json', import.meta.url)));
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2epet' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Walker');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await mk('coins', 100000);
await mk('givePet', 'pet-shiba');

// The boat taxi from Yeouido.
const pier = (id) => data.piers.find((p) => p.id === id);
const y = pier('yeouido');
await mk('place', ...y.board); await wait(3000); await mk('place', ...y.board); await wait(500);
await mk('act'); await wait(300);
await page.click('.boat-taxi-panel .visit-list button:has-text("Apgujeong")');
await page.click('.spend-ask:not([hidden]) .primary', { timeout: 5000 }); await wait(400); // ("Spend ₩3,000?")
const tt = timetable(data.piers), yi = data.piers.indexOf(y);
const nb = nextBoat(tt, yi, 1, Date.now() / 1000);
if (nb.wait > 4) await page.evaluate((s) => __mk.boatTaxi.skewClock(s), nb.wait - 4);
for (let i = 0; i < 30 && !(await page.evaluate(() => __mk.boatTaxi.busy)); i++) await wait(1000);
assert(await page.evaluate(() => __mk.boatTaxi.busy), 'aboard the boat');
for (let k = 0; k < 8; k++) {
  await mk('petPoop');
  await page.keyboard.down(k % 2 ? 'KeyA' : 'KeyD'); await wait(1500); await page.keyboard.up(k % 2 ? 'KeyA' : 'KeyD');
}
const boatPet = await mk('pet');
console.log('boat: me', JSON.stringify((await mk('seoulDal')).at), 'pet', JSON.stringify(boatPet), 'poops', JSON.stringify(await mk('poops')));
await shot('boat');
assert(!(await mk('poops')).length, 'no poop on the boat');
assert(!boatPet.visible, 'the dog waits out of sight on the boat');
for (let i = 0; i < 400 && (await page.evaluate(() => __mk.boatTaxi.busy)); i++) await wait(1000);
assert((await mk('pet')).visible, 'the dog is back by you on the pier');

// Seoul Dal: boarding starts every 180 s (core/seoul-dal.js).
const T0 = Math.ceil(Date.UTC(2026, 10, 9, 3, 0, 0) / 180000) * 180000;
const at = async (t) => { await page.clock.setFixedTime(T0 + t * 1000); await page.clock.resume(); };
const GATE = [-2895.9, 479.9];
await at(2);
await mk('place', ...GATE); await mk('face', 2.3387 + Math.PI);
for (let i = 0; i < 200 && !(await mk('action'))?.includes('🎈'); i++) await wait(150);
await wait(4000);
await mk('pick', 0);
assert((await mk('seoulDal')).busy, 'aboard Seoul Dal');
for (let k = 0; k < 6; k++) { // the dog's poop clock comes due over and over on the way up
  await at(20 + k * 15); await mk('petPoop');
  await page.keyboard.down('KeyD'); await wait(1200); await page.keyboard.up('KeyD');
}
const dalPet = await mk('pet');
console.log('Seoul Dal: y', (await mk('seoulDal')).y, 'pet', JSON.stringify(dalPet), 'poops', JSON.stringify(await mk('poops')));
await shot('dal-up');
assert(!(await mk('poops')).some((po) => Math.hypot(po.x - GATE[0], po.z - GATE[1]) < 20), 'no poop in the gondola'); // (one from the walk off the boat is on Apgujeong's pier)
assert(!dalPet.visible, 'the dog waits on the ground while you fly');
await at(181); await wait(2500);
assert(!(await mk('seoulDal')).busy, 'off Seoul Dal');
assert((await mk('pet')).visible, 'the dog is back by you after the flight');

assert(!errors.length, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(failed ? 'pet on rides FAILED' : 'pet on rides ok');
process.exit(failed ? 1 : 0);
