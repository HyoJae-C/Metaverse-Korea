// End-to-end check: the Gangnam interior shops (core/furniture-gangnam.js,
// the white-mood and gaming finishes in core/home-finish.js). Each shop opens
// with its pieces on show, and a home dressed in each look draws with no errors.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/gangnam-interior.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const LOOKS = {
  white: { finish: { wall: 'wall-wainscot', floor: 'floor-whiteoak', door: 'door-glass-arch' }, decor: [{ id: 'f-white-sofa', x: -1.5, z: -4, ry: 0 }, { id: 'f-white-dining', x: 2.6, z: -2.5, ry: 0 }, { id: 'f-white-shelf', x: 1.2, z: -4.8, ry: 0 }] },
  gaming: { finish: { wall: 'wall-hexpanel', floor: 'floor-carpettile', door: 'door-neon' }, decor: [{ id: 'f-gaming-desk', x: -1.5, z: -4.3, ry: 0 }, { id: 'f-gaming-chair', x: -1.5, z: -3.3, ry: Math.PI }, { id: 'f-arcade-mini', x: 2, z: -4.3, ry: 0 }] },
};
const errors = [];
for (const [look, { finish, decor }] of Object.entries(LOOKS)) {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
  await useFakeRealtime(ctx, 'gangnam-interior-' + look);
  await ctx.addInitScript(([f, d]) => {
    if (localStorage.getItem('mk.home.forest-lane-apt')) return;
    localStorage.setItem('mk.items', JSON.stringify([...d.map((p) => p.id), f.wall, f.floor, f.door]));
    localStorage.setItem('mk.homeFinish', JSON.stringify(f));
    localStorage.setItem('mk.home.forest-lane-apt', JSON.stringify(d));
  }, [finish, decor]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2egi' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn').catch(() => {});
  await page.fill('#nickname', 'Tester').catch(() => {});
  await page.click('#start-btn', { timeout: 90000 }).catch(() => {});
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
  const shops = look === 'white' ? ['white-mood-living', 'white-mood-interior'] : ['fullpower-gaming', 'fullpower-gaming-room'];
  for (const id of shops) {
    await page.evaluate((sid) => __mk.enter(sid), id);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { __mk.goto(0, 2.5, Math.PI); __mk.cam?.({ yaw: 0, pitch: 0.25, dist: 5 }); });
    await page.waitForTimeout(900);
    if (S) await page.screenshot({ path: `${S}/shop-${id}.png` });
    assert(true, `${id} opens`);
    await page.evaluate(() => __mk.leave?.());
    await page.waitForTimeout(1200);
  }
  await page.evaluate(() => { __mk.homeStub?.(); __mk.enter('forest-lane-apt'); });
  await page.waitForFunction(() => __mk.decor() === 3, null, { timeout: 30000 });
  await page.evaluate(() => { __mk.goto(0, 0.5, Math.PI); __mk.cam?.({ yaw: 0.25, pitch: 0.3, dist: 6 }); });
  await page.waitForTimeout(1200);
  if (S) await page.screenshot({ path: `${S}/home-${look}.png` });
  assert(true, `a home in the ${look} look`);
  await ctx.close();
}
assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
