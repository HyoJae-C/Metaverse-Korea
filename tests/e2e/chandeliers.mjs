// End-to-end check: chandeliers hang from the ceiling (core/chandeliers.js),
// and the switch by the door (game/home-lights.js) turns the room lights off
// and the party lights on. Screenshots to a folder if one is given.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/chandeliers.mjs [screenshot dir]
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';
const S = process.argv[2] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'chand');
await ctx.addInitScript(() => {
  if (localStorage.getItem('mk.home.forest-lane-apt')) return;
  localStorage.setItem('mk.items', JSON.stringify(['lamp-chandelier', 'lamp-iron-chandelier', 'lamp-ring-chandelier', 'lamp-disco-ball']));
  localStorage.setItem('mk.home.forest-lane-apt', JSON.stringify([
    { id: 'rug', x: 0, z: -1.2, ry: 0 }, { id: 'table', x: 0, z: -1.2, ry: 0 }, { id: 'lamp-chandelier', x: 0, z: -1.2, ry: 0 },
    { id: 'bed', x: -3, z: -2.7, ry: 0 }, { id: 'lamp-iron-chandelier', x: -3, z: -2.7, ry: 0 },
    { id: 'sofa', x: 2.8, z: -2.5, ry: 0 }, { id: 'lamp-ring-chandelier', x: 2.8, z: -1.9, ry: 0 }, { id: 'lamp-disco-ball', x: 0, z: 1.2, ry: 0, off: true }]));
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/?debug&room=e2ech' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn').catch(() => {});
await page.fill('#nickname', 'Tester').catch(() => {});
await page.click('#start-btn', { timeout: 90000 }).catch(() => {});
await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
await page.addStyleTag({ content: '#keys-help,.keys-panel,#keys{display:none!important}' });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
await page.evaluate(() => { __mk.homeStub?.(); __mk.enter('forest-lane-apt'); });
await page.waitForFunction(() => __mk.decor() >= 7, null, { timeout: 30000 });
await page.evaluate(() => { __mk.goto(0, 2.2, Math.PI); __mk.cam?.({ yaw: 0, pitch: 0.12, dist: 5.5 }); });
await page.waitForTimeout(1500);
if (S) await page.screenshot({ path: `${S}/1-home.png` });
await page.evaluate(() => { __mk.goto(-0.3, 1.6, Math.PI); __mk.cam?.({ yaw: -0.25, pitch: -0.05, dist: 3.4 }); });
await page.waitForTimeout(1200);
if (S) await page.screenshot({ path: `${S}/2-home-up.png` });
await page.evaluate(() => __mk.goto(2.1, (__mk.roomSize().d ?? __mk.roomSize()[1]) / 2 - 0.7, 0));
await page.waitForTimeout(800);
console.log('size', await page.evaluate(() => JSON.stringify(__mk.roomSize())));
console.log('lamp', await page.evaluate(async () => { __mk.goto(2.8, -1.2, 0); await new Promise((r) => setTimeout(r, 600)); return __mk.action(); }));
await page.evaluate(() => __mk.goto(2.1, (__mk.roomSize().d ?? __mk.roomSize()[1]) / 2 - 0.7, 0));
await page.waitForTimeout(800);
assert(JSON.stringify(await page.evaluate(() => __mk.choices())).includes('🪩'), 'by the door: the room lights and the party lights');
await page.evaluate(() => { const c = __mk.choices() || []; const i = c.findIndex((l) => l.includes('🌙')); __mk.pick(i < 0 ? 0 : i); });
await page.evaluate(() => { __mk.goto(0, 2.2, Math.PI); __mk.cam?.({ yaw: 0, pitch: 0.12, dist: 5.5 }); });
await page.waitForTimeout(1200);
if (S) await page.screenshot({ path: `${S}/5-lights-off.png` });
await page.evaluate(() => __mk.goto(2.1, (__mk.roomSize().d ?? __mk.roomSize()[1]) / 2 - 0.7, 0));
await page.waitForTimeout(800);
assert((await page.evaluate(() => __mk.action())).includes('💡'), 'the room lights went off');
await page.evaluate(() => { const c = __mk.choices() || []; __mk.pick(c.findIndex((l) => l.includes('🪩'))); });
await page.evaluate(() => { __mk.goto(0, 2.6, Math.PI); __mk.cam?.({ yaw: 0.2, pitch: 0.1, dist: 5.5 }); });
await page.waitForTimeout(1500);
if (S) await page.screenshot({ path: `${S}/6-party.png` });
console.log('party draw', await page.evaluate(() => JSON.stringify(__mk.renderInfo?.())));
console.log('draw', await page.evaluate(() => JSON.stringify(__mk.renderInfo?.())));
await page.evaluate(() => __mk.leave());
await page.waitForTimeout(1500);
await page.evaluate(() => __mk.enter('chandelier-house'));
await page.waitForTimeout(3000);
await page.evaluate(() => { __mk.goto(0, 2.5, Math.PI); __mk.cam?.({ yaw: 0, pitch: 0.05, dist: 4.5 }); });
await page.waitForTimeout(1500);
if (S) await page.screenshot({ path: `${S}/3-shop.png` });
await page.evaluate(() => __mk.leave());
await page.waitForTimeout(1500);
console.log('door', await page.evaluate(() => JSON.stringify(__mk.doorOf('chandelier-house'))));
await page.evaluate(() => { const [x, z, ry] = __mk.doorOf('chandelier-house'); __mk.goto(x + Math.sin(ry) * 6, z + Math.cos(ry) * 6, ry + Math.PI); __mk.cam?.({ yaw: 0.6, pitch: 0.2, dist: 14 }); });
await page.waitForTimeout(4000);
if (S) await page.screenshot({ path: `${S}/4-street.png` });
assert(JSON.parse(await page.evaluate(() => localStorage.getItem('mk.home.forest-lane-apt'))).some((i) => i.id === 'lamp-disco-ball' && !i.off), 'party on: the mirror ball is on in the saved layout');
assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
