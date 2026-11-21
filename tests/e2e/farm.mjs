// End-to-end check: the weekend farm at Yongsan Family Park. Walk into the
// glasshouse, plant lettuce in every bed (one question for the lot), water
// one, let a day pass and harvest two (one fresh, one plain: a stamp in the
// farmer's journal), sell them at the stall.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/farm.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { bedSpot, farmToWorld, STALL_STAND } from '../../src/core/farm-site.js';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const [ox, oz] = JSON.parse(readFileSync(new URL('region.json', R), 'utf8')).districts.find((d) => d.id === 'itaewon').offset;
const lm = JSON.parse(readFileSync(new URL('districts/itaewon.json', R), 'utf8')).landmarks.find((l) => l.type === 'farm');
const spot = { x: lm.x + ox, z: lm.z + oz, ry: lm.ry };
const at = (lx, lz) => farmToWorld(spot, lx, lz);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: S ? 2 : 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2efarm' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.snow(0));
await page.evaluate(() => { const w = __mk.wallet; w.add(50000 - w.coins, null); });
const shot = async (name, cam) => { if (!S) return; await page.evaluate((c) => __mk.cam(c), cam); await page.waitForTimeout(1200); await page.screenshot({ path: `${S}/${name}.png` }); };
const acts = async () => [await page.evaluate(() => __mk.action()), ...((await page.evaluate(() => __mk.choices())) || [])].filter(Boolean);
const run = async (word) => {
  const a = await page.evaluate(() => __mk.action()), c = (await page.evaluate(() => __mk.choices())) || [];
  if (a?.includes(word)) await page.evaluate(() => __mk.act()); else { const i = c.findIndex((l) => l.includes(word)); assert(i >= 0, `no "${word}" in ${[a, ...c]}`); if (i >= 0) await page.evaluate((k) => __mk.pick(k), i); }
  await page.waitForTimeout(700);
};
const stand = (i) => { const [bx, bz] = bedSpot(i); return at(bx * 0.4, bz); }; // in the aisle beside bed i

await page.evaluate(([x, z]) => __mk.goto(x, z, 0), at(0, 12));
await page.waitForTimeout(3000); // (the glasshouse loads)
await shot('outside', { dist: 16, pitch: 0.35, yaw: spot.ry + Math.PI });
await page.evaluate(([x, z]) => __mk.place(x, z), stand(0));
await page.waitForTimeout(1500);
console.log('at bed 0', await acts());
await run('Plant a seed');
assert(await page.isVisible('#farm-panel'), 'the seed panel opens');
await shot('seeds', { dist: 9, pitch: 0.5, yaw: spot.ry + Math.PI });
const before = await page.evaluate(() => __mk.wallet.coins);
await page.click('#farm-panel .farm-row:first-child button.chip'); // lettuce in all twelve
await page.waitForTimeout(500);
assert(await page.isVisible('.spend-ask'), 'asks before taking the money');
console.log('asked:', await page.textContent('.spend-ask'));
await page.click('.spend-ask .primary');
await page.waitForTimeout(1500);
assert(before - await page.evaluate(() => __mk.wallet.coins) === 6000, 'twelve lettuce seeds paid: ' + (before - await page.evaluate(() => __mk.wallet.coins)));
assert(!(await page.isVisible('#farm-panel')), 'the panel closes after planting');
await page.evaluate(([x, z]) => __mk.place(x, z), stand(0)); await page.waitForTimeout(1200);
console.log('planted', await acts());
await shot('thirsty', { dist: 8, pitch: 0.6, yaw: spot.ry + Math.PI });
await run('Water');
console.log('watered', await acts());
assert(!(await acts()).some((l) => l.includes('Water')), 'once a day: no second watering');
// A day on: grown.
const later = (min) => page.evaluate((m) => { const s = JSON.parse(localStorage.getItem('mkfarm.local')); for (const b of s.beds) if (b) { b.at -= m * 60e3; if (b.wet) b.wet -= m * 60e3; } localStorage.setItem('mkfarm.local', JSON.stringify(s)); }, min);
await later(1441);
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), at(0, 60)); await page.waitForTimeout(800); // (away and back: it asks again)
await page.evaluate(([x, z]) => __mk.place(x, z), stand(0)); await page.waitForTimeout(1500);
console.log('grown', await acts());
await shot('ripe', { dist: 8, pitch: 0.6, yaw: spot.ry + Math.PI });
await run('Harvest');
assert((await page.textContent('#farmlog-btn')).includes('1/10'), "the journal counts the lettuce: " + await page.textContent('#farmlog-btn'));
await page.evaluate(([x, z]) => __mk.place(x, z), stand(1)); await page.waitForTimeout(600);
await run('Harvest');
await page.evaluate(([x, z]) => __mk.place(x, z), at(...STALL_STAND)); await page.waitForTimeout(800);
console.log('at the stall', await acts());
const c0 = await page.evaluate(() => __mk.wallet.coins);
await run('Farm stand');
await page.waitForTimeout(600);
await shot('stall', { dist: 7, pitch: 0.3, yaw: spot.ry + Math.PI });
console.log('panel:', (await page.textContent('#farm-panel')).slice(0, 300));
await page.click('#farm-panel > button.primary');
await page.waitForTimeout(1000);
assert(await page.evaluate(() => __mk.wallet.coins) - c0 === 4500 + 3500, 'one fresh and one plain lettuce sold: ' + (await page.evaluate(() => __mk.wallet.coins) - c0));
// The farmer's journal in the notebook.
await page.evaluate(() => { document.getElementById('farm-panel').hidden = true; document.getElementById('farmlog-btn').click(); });
await page.waitForSelector('#farmlog-panel:not([hidden]) .farm-log-cell.got', { timeout: 8000 });
assert(await page.locator('#farmlog-panel .farm-log-cell').count() === 10, 'ten crops in the journal');
assert(await page.locator('#farmlog-panel .farm-log-cell.got').count() === 1, 'one stamp');
if (S) { await page.waitForTimeout(400); await page.screenshot({ path: `${S}/journal.png` }); }
await page.evaluate(() => { document.getElementById('farmlog-panel').hidden = true; });
if (S) { // every crop at once, half grown and grown, for a look
  await page.evaluate(() => {
    const ids = ['lettuce', 'spinach', 'tomato', 'cucumber', 'strawberry', 'carrot', 'chili', 'corn', 'cabbage', 'ginseng', 'strawberry', 'ginseng'], days = { lettuce: 1, spinach: 1, tomato: 2, cucumber: 2, strawberry: 4, carrot: 5, chili: 7, corn: 10, cabbage: 15, ginseng: 30 };
    const s = JSON.parse(localStorage.getItem('mkfarm.local')), now = Date.now();
    s.beds = ids.map((crop, i) => ({ crop, at: now - days[crop] * 86400e3 * (i >= 10 ? 0.6 : 1.01), wet: now, n: 99 }));
    localStorage.setItem('mkfarm.local', JSON.stringify(s));
  });
  await page.evaluate(([x, z]) => __mk.goto(x, z, 0), at(0, 60)); await page.waitForTimeout(800);
  await page.evaluate(([x, z]) => __mk.place(x, z), at(0, 5)); await page.waitForTimeout(1500);
  await shot('all-crops', { dist: 9, pitch: 0.75, yaw: spot.ry + Math.PI });
  await page.evaluate(([x, z]) => __mk.place(x, z), stand(4)); await page.waitForTimeout(800);
  await shot('strawberry', { dist: 4.5, pitch: 0.7, yaw: spot.ry + Math.PI / 2 });
}
assert(!errors.length, 'page errors: ' + errors.join(' | '));
console.log(process.exitCode ? 'FAILED' : 'farm e2e ok');
await browser.close();
