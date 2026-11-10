// End-to-end check: Namsangol's folk games yard. Walk in through the gate,
// stand by each game, open its panel, then walk away: the panel closes.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/folk-yard.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { FOLK_GAMES } from '../../src/core/folk-props.js';
import { propToWorld } from '../../src/data/folk-yard.js';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const YARD = { x: -1057 - 311, z: -594 + 183 }; // euljiro offset (region.json) + the yard in the district
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: S ? 2 : 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2efolk' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.evaluate(() => __mk.snow(0)); // no snow: "Make a snowball" would take the button
// In through the gate.
await page.evaluate(([x, z]) => __mk.goto(x, z, 0), [YARD.x, YARD.z - 20]);
await page.waitForTimeout(1500);
await page.evaluate(([x, z]) => __mk.place(x, z), [YARD.x, YARD.z - 6]);
await page.waitForTimeout(800);
if (S) { await page.evaluate(() => __mk.cam({ dist: 16, pitch: 0.55, yaw: Math.PI })); await page.waitForTimeout(1200); await page.screenshot({ path: S + '/yard.png' }); }
const LABELS = { yut: '🎲 Play yutnori', tuho: '🏺 Play tuho', jegi: '🪶 Kick the jegi', neol: '🪵 Jump on the seesaw' };
for (const g of FOLK_GAMES) {
  const [x, z] = propToWorld(YARD, g.id, g.stand);
  await page.evaluate(([x, z]) => __mk.place(x, z), [x, z]);
  await page.waitForTimeout(500);
  const a = await page.evaluate(() => __mk.action());
  const c = await page.evaluate(() => __mk.choices());
  console.log(g.id, a, c);
  assert(a === LABELS[g.id] || (c || []).includes(LABELS[g.id]), g.id + ': the action by the game');
  if (a === LABELS[g.id]) await page.evaluate(() => __mk.act());
  else await page.evaluate((i) => __mk.pick(i), c.indexOf(LABELS[g.id]));
  await page.waitForSelector(`#${g.id}-panel:not([hidden])`, { timeout: 5000 }).catch(() => {});
  assert(await page.isVisible(`#${g.id}-panel`), g.id + ': the panel opens');
  if (S) await page.screenshot({ path: `${S}/${g.id}-panel.png` });
  await page.evaluate(([x, z]) => __mk.place(x, z), [YARD.x, YARD.z - 6]);
  await page.waitForTimeout(500);
  assert(!(await page.isVisible(`#${g.id}-panel`)), g.id + ': walking away closes it');
}
assert(!errors.length, 'no page errors');
console.log('errors', errors);
await browser.close();
