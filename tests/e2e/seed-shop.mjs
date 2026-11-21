// End-to-end check: the seed shop by Heunginjimun. Buy a bean-sprout seed
// (asks before taking the money), it waits in the seed pouch; at the farm
// the bed's panel offers it for free and corn (none in the pouch) not at all.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/seed-shop.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { bedSpot, farmToWorld } from '../../src/core/farm-site.js';
import { SEED_STAND } from '../../src/core/seed-shop-site.js';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R), 'utf8'));
const lm = (district, type) => { const [ox, oz] = region.districts.find((d) => d.id === district).offset; const l = JSON.parse(readFileSync(new URL(`districts/${district}.json`, R), 'utf8')).landmarks.find((q) => q.type === type); return { x: l.x + ox, z: l.z + oz, ry: l.ry }; };
const shop = lm('euljiro', 'seedshop'), farm = lm('itaewon', 'farm');
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: S ? 2 : 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2eseed' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.snow(0));
await page.evaluate(() => { const w = __mk.wallet; w.add(50000 - w.coins, null); });
const acts = async () => [await page.evaluate(() => __mk.action()), ...((await page.evaluate(() => __mk.choices())) || [])].filter(Boolean);
const run = async (word) => {
  const a = await page.evaluate(() => __mk.action()), c = (await page.evaluate(() => __mk.choices())) || [];
  if (a?.includes(word)) await page.evaluate(() => __mk.act()); else { const i = c.findIndex((l) => l.includes(word)); assert(i >= 0, `no "${word}" in ${[a, ...c]}`); if (i >= 0) await page.evaluate((k) => __mk.pick(k), i); }
  await page.waitForTimeout(700);
};

await page.evaluate(([x, z]) => __mk.goto(x, z, 0), farmToWorld(shop, 0, 4.5));
await page.waitForTimeout(3000); // (the shop loads)
if (S) { await page.evaluate((c) => __mk.cam(c), { dist: 8, pitch: 0.25, yaw: shop.ry }); await page.waitForTimeout(1200); await page.screenshot({ path: `${S}/seed-shop.png` }); }
await page.evaluate(([x, z]) => __mk.place(x, z), farmToWorld(shop, ...SEED_STAND));
await page.waitForTimeout(1200);
console.log('at the shop', await acts());
await run('Seed shop');
await page.waitForSelector('#seed-panel:not([hidden]) .farm-row button.primary:not([disabled])', { timeout: 8000 });
assert(await page.locator('#seed-panel .farm-row').count() === 7, 'seven kinds of seed: ' + await page.locator('#seed-panel .farm-row').count());
assert(!(await page.textContent('#seed-panel')).includes('Lettuce'), 'no basic seeds here');
if (S) { await page.waitForTimeout(400); await page.screenshot({ path: `${S}/seed-panel.png` }); }
const before = await page.evaluate(() => __mk.wallet.coins);
await page.click('#seed-panel .farm-row:first-child button.primary'); // one bean-sprout seed
await page.waitForTimeout(500);
assert(await page.isVisible('.spend-ask'), 'asks before taking the money');
console.log('asked:', await page.textContent('.spend-ask'));
await page.click('.spend-ask .primary');
await page.waitForTimeout(1200);
assert(before - await page.evaluate(() => __mk.wallet.coins) === 1000, 'one seed paid: ' + (before - await page.evaluate(() => __mk.wallet.coins)));
assert((await page.textContent('#seed-panel .farm-row:first-child')).includes('1 in pouch'), 'it is in the pouch: ' + await page.textContent('#seed-panel .farm-row:first-child'));
await page.evaluate(() => { document.getElementById('seed-panel').hidden = true; });

// At the farm: plant it from the pouch.
const [bx, bz] = bedSpot(0);
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), farmToWorld(farm, 0, 12));
await page.waitForTimeout(3000);
await page.evaluate(([x, z]) => __mk.place(x, z), farmToWorld(farm, bx * 0.4, bz));
await page.waitForTimeout(1500);
await run('Plant a seed');
await page.waitForSelector('#farm-panel:not([hidden]) .farm-row', { timeout: 8000 });
const rows = await page.locator('#farm-panel .farm-row').allTextContents();
console.log('farm rows:', rows.map((r) => r.slice(0, 40)));
assert(rows.length === 10, 'ten rows (the rare two are hidden): ' + rows.length);
assert(rows.find((r) => r.includes('Corn'))?.includes('Dongdaemun'), 'corn: at the seed shop');
if (S) { await page.waitForTimeout(300); await page.screenshot({ path: `${S}/farm-seeds.png` }); }
const c1 = await page.evaluate(() => __mk.wallet.coins);
await page.click('#farm-panel .farm-row:has-text("Bean sprouts") button.primary');
await page.waitForTimeout(1500);
assert(!(await page.isVisible('.spend-ask')), 'planting from the pouch asks for no money');
assert(await page.evaluate(() => __mk.wallet.coins) === c1, 'and takes none');
const st = await page.evaluate(() => JSON.parse(localStorage.getItem('mkfarm.local')));
assert(st.beds[0]?.crop === 'sprout' && !(st.seeds.sprout > 0), 'the sprout is in bed 0 and out of the pouch: ' + JSON.stringify([st.beds[0], st.seeds]));
assert(!errors.length, 'page errors: ' + errors.join(' | '));
console.log(process.exitCode ? 'FAILED' : 'seed shop e2e ok');
await browser.close();
