// End-to-end check: ginkgo trees on the street (game/ginkgo.js). Shaking one
// brings leaves down and sometimes a nut into the bag; stepping on a fallen
// nut makes you smell (worn like a perfume, so others see it).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/ginkgo.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 } })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Ginkgo');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  // The ginkgo nearest the start, and a spot beside its trunk.
  const tree = await page.evaluate(() => {
    const g = window.__mk.ginkgo();
    return g.trees.slice().sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]))[0];
  });
  if (!tree) throw new Error('no ginkgo trees on the street');
  console.log('ginkgos:', await page.evaluate(() => window.__mk.ginkgo().trees.length), 'nearest at', tree.map((v) => v.toFixed(1)).join(', '));
  await mk('place', tree[0] + 1.2, tree[1]);
  await wait(1500);
  const act = await page.evaluate(() => { const p = window.__mk.sky().me.root.position; return window.__mk.ginkgo().act(p)?.key || null; });
  if (!act?.startsWith('ginkgo:')) throw new Error('no shake action by the trunk: ' + act);
  // Shake until a nut comes (40% a shake; each tree cools down, so shake it directly).
  let got = null;
  for (let k = 0; k < 40 && got !== 'nut'; k++) got = await page.evaluate((i) => window.__mk.ginkgo().shake(i), (await page.evaluate(() => window.__mk.ginkgo().near))[0] ?? 0);
  if (got !== 'nut') throw new Error('no nut after 40 shakes: ' + got);
  const nuts = await page.evaluate(() => window.__mk.bagKinds().filter((k) => k === 'ginkgo').length);
  if (nuts !== 1) throw new Error('nuts should share one bag slot: ' + nuts);
  console.log('shake: a nut in the bag, one slot');
  if (shotDir) { await mk('cam', { pitch: 0.55, dist: 12 }); await wait(400); await page.screenshot({ path: `${shotDir}/ginkgo-shake.png` }); }
  // Step on a nut.
  if (await mk('scentNow') === 'ginkgo-stink') throw new Error('smelling before stepping on anything');
  await page.evaluate(() => { const p = window.__mk.sky().me.root.position; window.__mk.ginkgo().dropAt(p.x + 0.1, p.z); });
  await wait(600);
  if (await mk('scentNow') !== 'ginkgo-stink') throw new Error('stepping on a nut did not make me smell');
  console.log('step: smelling of ginkgo');
  if (shotDir) { await wait(300); await page.screenshot({ path: `${shotDir}/ginkgo-stink.png` }); }
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
} catch (e) {
  console.error('FAIL', e.message);
} finally {
  await browser.close();
}
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
